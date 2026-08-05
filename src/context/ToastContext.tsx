import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing, shadows } from '@/theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  description?: string;
}

interface ToastContextValue {
  showToast: (message: string, options?: { type?: ToastType; description?: string; duration?: number }) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getToastIcon(type: ToastType): { name: string; color: string; bg: string } {
  switch (type) {
    case 'success':
      return { name: 'check-circle', color: colors.success, bg: 'rgba(0, 168, 89, 0.1)' };
    case 'error':
      return { name: 'x-circle', color: colors.danger, bg: 'rgba(220, 53, 69, 0.1)' };
    case 'warning':
      return { name: 'alert-triangle', color: '#FFC107', bg: 'rgba(255, 193, 7, 0.15)' };
    case 'info':
    default:
      return { name: 'info', color: colors.primary, bg: colors.primaryLight + '33' };
  }
}

function ToastCard({ item, onHide }: { item: ToastItem; onHide: (id: string) => void }) {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const icon = getToastIcon(item.type);

  Animated.parallel([
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }),
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }),
  ]).start();

  const handlePress = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide(item.id));
  };

  return (
    <Animated.View
      style={[
        styles.toastCard,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable onPress={handlePress} style={({ pressed }) => [styles.toastPressable, pressed && { opacity: 0.85 }]}>
        <View style={[styles.iconWrap, { backgroundColor: icon.bg }]}>
          <Feather name={icon.name as any} size={20} color={icon.color} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.toastMessage} numberOfLines={2}>{item.message}</Text>
          {item.description ? (
            <Text style={styles.toastDescription} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>
        <Feather name="x" size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: { type?: ToastType; description?: string; duration?: number }) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const type = options?.type ?? 'info';
      const description = options?.description;
      const duration = options?.duration ?? 3500;

      setToasts((prev) => [...prev, { id, message, type, description }]);

      timersRef.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timersRef.current[id];
      }, duration);
    },
    [],
  );

  const success = useCallback((message: string, description?: string) => {
    showToast(message, { type: 'success', description });
  }, [showToast]);

  const error = useCallback((message: string, description?: string) => {
    showToast(message, { type: 'error', description });
  }, [showToast]);

  const info = useCallback((message: string, description?: string) => {
    showToast(message, { type: 'info', description });
  }, [showToast]);

  const warning = useCallback((message: string, description?: string) => {
    showToast(message, { type: 'warning', description });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} item={toast} onHide={removeToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    gap: spacing.sm,
  },
  toastCard: {
    width: SCREEN_WIDTH - spacing.xl * 2,
    maxWidth: 440,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.fani,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  toastPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  toastMessage: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  toastDescription: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
});
