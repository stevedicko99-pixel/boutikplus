import { useState, useEffect, createContext, useContext, useCallback, useRef, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const PENDING_ACTIONS_KEY = 'boutikplus.pendingActions.v1';

interface ConnectivityContextValue {
  isOnline: boolean;
  isLowConnection: boolean;
  pendingActions: PendingAction[];
  addPendingAction: (action: PendingAction) => void;
  syncPendingActions: () => Promise<void>;
  enableLowBandwidth: () => void;
  disableLowBandwidth: () => void;
}

interface PendingAction {
  id: string;
  type: 'create_product' | 'update_product' | 'create_order' | 'send_message';
  data: any;
  created_at: string;
}

const ConnectivityContext = createContext<ConnectivityContextValue | undefined>(undefined);

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isLowConnection, setIsLowConnection] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const prevIsOnlineRef = useRef<boolean>(true);
  const [lowBandwidthOverride, setLowBandwidthOverride] = useState(false);

  const persistPendingActions = useCallback(async (actions: PendingAction[]) => {
    try {
      await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
    } catch (err) {
      console.warn('[Connectivity] Failed to persist pending actions:', err);
    }
  }, []);

  const hydratePendingActions = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_ACTIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPendingActions(parsed);
        }
      }
    } catch (err) {
      console.warn('[Connectivity] Failed to hydrate pending actions:', err);
    }
  }, []);

  const addPendingAction = useCallback((action: PendingAction) => {
    setPendingActions((prev) => {
      const next = [...prev, action];
      persistPendingActions(next);
      return next;
    });
  }, [persistPendingActions]);

  const doSync = useCallback(async (action: PendingAction): Promise<boolean> => {
    try {
      switch (action.type) {
        case 'create_product': {
          if (isSupabaseConfigured) {
            await supabase.from('products').insert(action.data);
          }
          return true;
        }
        case 'update_product': {
          if (isSupabaseConfigured && action.data?.id) {
            await supabase.from('products').update(action.data).eq('id', action.data.id);
          }
          return true;
        }
        case 'create_order': {
          if (isSupabaseConfigured) {
            await supabase.from('orders').insert(action.data);
          }
          return true;
        }
        case 'send_message': {
          if (isSupabaseConfigured) {
            await supabase.from('messages').insert(action.data);
          }
          return true;
        }
        default:
          return true;
      }
    } catch (err) {
      console.warn(`[Connectivity] Sync failed for ${action.type} (${action.id}):`, err);
      return false;
    }
  }, []);

  const syncPendingActions = useCallback(async () => {
    if (!isOnline) return;
    if (pendingActions.length === 0) return;

    let syncedCount = 0;
    let failedCount = 0;
    const remaining: PendingAction[] = [];

    for (const action of pendingActions) {
      const ok = await doSync(action);
      if (ok) {
        syncedCount++;
      } else {
        failedCount++;
        remaining.push(action);
      }
    }

    setPendingActions(remaining);
    await persistPendingActions(remaining);

    if (syncedCount > 0 || failedCount > 0) {
      Alert.alert(
        'Synchronisation terminée',
        `${syncedCount} action(s) synchronisée(s) avec succès${failedCount > 0 ? `, ${failedCount} échec(s)` : ''}.`,
      );
    }
  }, [isOnline, pendingActions, doSync, persistPendingActions]);

  const enableLowBandwidth = useCallback(() => {
    setLowBandwidthOverride(true);
    setIsLowConnection(true);
  }, []);

  const disableLowBandwidth = useCallback(() => {
    setLowBandwidthOverride(false);
  }, []);

  useEffect(() => {
    hydratePendingActions();
  }, [hydratePendingActions]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      let NetInfo: any = null;
      try {
        // @ts-ignore - package optionnel, require() dans try/catch pour fallback gracieux
        NetInfo = require('@react-native-community/netinfo');
      } catch (err) {
        if (cancelled) return;
        console.warn(
          '[Connectivity] @react-native-community/netinfo non disponible, simulation du mode en ligne. Installez le package pour activer la connectivité réelle.',
          err,
        );
        setIsOnline(true);
        setIsLowConnection(false);
        return;
      }

      try {
        unsubscribe = NetInfo.addEventListener((state: any) => {
          if (cancelled) return;

          const connected = typeof state.isConnected === 'boolean' ? state.isConnected : true;
          setIsOnline(connected);

          if (!lowBandwidthOverride) {
            let low = false;
            const details = state.details;
            if (details && typeof details === 'object') {
              const type = state.type;
              if (type === 'cellular') {
                const gen = (details as any).cellularGeneration || (details as any).generation;
                if (gen === '2g' || gen === '3g' || gen === '2G' || gen === '3G') {
                  low = true;
                }
              }
            }
            setIsLowConnection(low);
          }
        });
      } catch (listenerErr) {
        console.warn('[Connectivity] Échec de l\'abonnement NetInfo:', listenerErr);
      }

      try {
        const initial = await NetInfo.fetch();
        if (cancelled) return;
        const connected = typeof initial.isConnected === 'boolean' ? initial.isConnected : true;
        setIsOnline(connected);

        if (!lowBandwidthOverride) {
          let low = false;
          const details = initial.details;
          if (details && typeof details === 'object') {
            const type = initial.type;
            if (type === 'cellular') {
              const gen = (details as any).cellularGeneration || (details as any).generation;
              if (gen === '2g' || gen === '3g' || gen === '2G' || gen === '3G') {
                low = true;
              }
            }
          }
          setIsLowConnection(low);
        }
      } catch {
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch {
        }
      }
    };
  }, [lowBandwidthOverride]);

  useEffect(() => {
    const wasOffline = prevIsOnlineRef.current === false;
    const nowOnline = isOnline === true;
    if (wasOffline && nowOnline) {
      syncPendingActions();
    }
    prevIsOnlineRef.current = isOnline;
  }, [isOnline, syncPendingActions]);

  return (
    <ConnectivityContext.Provider
      value={{
        isOnline,
        isLowConnection,
        pendingActions,
        addPendingAction,
        syncPendingActions,
        enableLowBandwidth,
        disableLowBandwidth,
      }}
    >
      {children}
      {pendingActions.length > 0 && isOnline ? (
        <SyncBanner count={pendingActions.length} onSync={syncPendingActions} />
      ) : null}
      {isLowConnection ? <LowBandwidthBanner onDisable={disableLowBandwidth} /> : null}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) throw new Error('useConnectivity must be used within ConnectivityProvider');
  return ctx;
}

function SyncBanner({ count, onSync }: { count: number; onSync: () => void }) {
  return (
    <View style={styles.banner}>
      <Feather name="upload-cloud" size={16} color={colors.warning} />
      <Text style={styles.bannerText}>{count} action(s) hors-ligne en attente</Text>
      <Pressable onPress={onSync} style={styles.syncBtn}>
        <Text style={styles.syncBtnText}>Synchroniser</Text>
      </Pressable>
    </View>
  );
}

function LowBandwidthBanner({ onDisable }: { onDisable: () => void }) {
  return (
    <View style={[styles.banner, { backgroundColor: colors.info + '30' }]}>
      <Feather name="zap-off" size={16} color={colors.info} />
      <Text style={styles.bannerText}>Mode faible connexion activé</Text>
      <Pressable onPress={onDisable}>
        <Text style={styles.bannerAction}>Désactiver</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bannerText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  bannerAction: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.info,
    fontWeight: typography.weights.semibold,
  },
  syncBtn: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  syncBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
});
