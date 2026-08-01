import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';

interface PaymentProofUploadProps {
  imageUri: string | null;
  onPick: (fromCamera: boolean) => void;
  onClear: () => void;
}

export function PaymentProofUpload({
  imageUri,
  onPick,
  onClear,
}: PaymentProofUploadProps) {
  if (imageUri) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: imageUri }} style={styles.preview} />
        <Pressable style={styles.clearBtn} onPress={onClear}>
          <Feather name="x" size={18} color={colors.textInverse} />
        </Pressable>
        <Pressable style={styles.changeBtn} onPress={() => onPick(false)}>
          <Feather name="refresh-cw" size={14} color={colors.textInverse} />
          <Text style={styles.changeText}>Changer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.actions}>
      <Pressable
        style={({ pressed }) => [styles.option, pressed && { opacity: 0.8 }]}
        onPress={() => onPick(true)}
      >
        <Feather name="camera" size={26} color={colors.primary} />
        <Text style={styles.optionLabel}>Prendre une photo</Text>
        <Text style={styles.optionHint}>de la confirmation</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.option, pressed && { opacity: 0.8 }]}
        onPress={() => onPick(false)}
      >
        <Feather name="image" size={26} color={colors.secondary} />
        <Text style={styles.optionLabel}>Choisir dans</Text>
        <Text style={styles.optionHint}>la galerie</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  previewWrap: {
    position: 'relative',
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  preview: { width: '100%', height: 280, borderRadius: radius.lg },
  clearBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBtn: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  changeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  option: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF8F0',
  },
  optionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  optionHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
});
