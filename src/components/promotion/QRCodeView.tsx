import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

interface QRCodeViewProps {
  /** URL ou texte à encoder dans le QR code */
  value: string;
  /** Taille en px (carré) */
  size?: number;
  /** Libellé affiché sous le QR code */
  label?: string;
}

/**
 * Affiche un QR code généré via l'API publique api.qrserver.com.
 * V1 : évite l'ajout d'une dépendance native (react-native-qrcode-svg)
 * qui nécessiterait du linking natif. L'image est mise en cache par expo-image.
 */
export function QRCodeView({ value, size = 180, label }: QRCodeViewProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value,
  )}&margin=8&color=1A1A2E&bgcolor=FFFFFF`;

  const reload = useCallback(() => {
    setError(false);
    setLoaded(false);
  }, []);

  if (error) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Feather name="alert-circle" size={32} color={colors.danger} />
        <Text style={styles.errorText}>QR indisponible</Text>
        <Pressable onPress={reload} hitSlop={8} style={styles.retryBtn}>
          <Feather name="refresh-cw" size={14} color={colors.primary} />
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.qrContainer, { width: size, height: size }]}>
        {!loaded ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}
        <Image
          source={{ uri: qrUrl }}
          style={{ width: size, height: size }}
          contentFit="contain"
          cachePolicy="memory-disk"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      </View>
      {label ? (
        <View style={styles.labelRow}>
          <Feather name="grid" size={13} color={colors.textMuted} />
          <Text style={styles.labelText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  qrContainer: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  loadingWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
  },
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.danger,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  retryText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  labelText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
});
