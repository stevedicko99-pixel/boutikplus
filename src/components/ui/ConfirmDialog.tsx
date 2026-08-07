import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, ActivityIndicator, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useReducedMotion } from '@/lib/useReducedMotion';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
  icon?: 'trash-2' | 'alert-triangle' | 'info' | 'check-circle';
  onConfirm: () => void;
  onCancel: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * ConfirmDialog — modal de confirmation cross-platform (web + mobile).
 *
 * Sur React Native Web, `Alert.alert` avec boutons ne fonctionne pas
 * (il retombe sur window.confirm sans callback). Ce composant rend une vraie
 * boîte de dialogue animée via <Modal>, compatible partout : on peut donc
 * confirmer la suppression d'un produit sur le site Vercel ET sur l'app.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'danger',
  loading = false,
  icon = 'alert-triangle',
  onConfirm,
  onCancel,
  style,
}: Props) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.9);
    opacity.setValue(0);
    if (reducedMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 200, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, [visible, reducedMotion, scale, opacity]);

  const toneColor = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.primary;
  const toneSurface = tone === 'danger' ? colors.dangerSurface : tone === 'warning' ? colors.warningSurface : colors.infoSurface;

  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} accessibilityLabel="Fermer" />
<Animated.View
          role="alertdialog"
          aria-modal={true as any}
          style={[styles.card, { opacity, transform: [{ scale }] }, style]}
        >
          <View style={[styles.iconWrap, { backgroundColor: toneSurface }]}>
            <Feather name={icon as any} size={28} color={toneColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: toneColor }]}
              onPress={loading ? undefined : onConfirm}
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ busy: loading }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.fani,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  cancelBtn: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  cancelText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  confirmText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textInverse },
});
