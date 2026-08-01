import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Contexte de connectivité et mode hors-ligne

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

  const addPendingAction = useCallback((action: PendingAction) => {
    setPendingActions((prev) => [...prev, action]);
  }, []);

  const syncPendingActions = useCallback(async () => {
    // Simule la synchronisation
    if (pendingActions.length === 0) return;
    Alert.alert(
      'Synchronisation',
      `${pendingActions.length} action(s) en attente synchronisée(s) avec succès !`,
    );
    setPendingActions([]);
  }, [pendingActions]);

  const enableLowBandwidth = useCallback(() => setIsLowConnection(true), []);
  const disableLowBandwidth = useCallback(() => setIsLowConnection(false), []);

  // Simulation de la connectivité
  useEffect(() => {
    // En production, utiliser NetInfo.addEventListener()
    setIsOnline(true);
  }, []);

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
