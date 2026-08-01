// Studio Photo — écran de capture + édition d'image produit
// Flow : choix source (caméra/galerie) → crop natif → édition (rotate/flip/HD/ratio)
// → retour URI vers l'écran appelant via navigation.navigate(returnTo, { editedImageUri }).
// Conçu pour appareils low-end : preview unique, actions légères, pas de WebGL.

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import {
  pickWithChoice,
  applyEdits,
  DEFAULT_EDIT_OPTIONS,
  type AspectRatio,
  type EditOptions,
} from '@/lib/photoStudio';

interface PhotoStudioScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params?: {
      initialUri?: string;
      aspect?: AspectRatio;
      editIndex?: number;
      returnTo?: 'AddEditProduct' | 'CreateShop';
    };
  };
}

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: '1:1', label: 'Carré' },
  { value: '4:3', label: '4:3' },
  { value: '16:9', label: '16:9' },
  { value: 'free', label: 'Libre' },
];

export function PhotoStudioScreen({ navigation, route }: PhotoStudioScreenProps) {
  const initialUri = route?.params?.initialUri;
  const returnTo = route?.params?.returnTo ?? 'AddEditProduct';
  const editIndex = route?.params?.editIndex;

  const [sourceUri, setSourceUri] = useState<string | null>(initialUri ?? null);
  const [editOpts, setEditOpts] = useState<EditOptions>({
    ...DEFAULT_EDIT_OPTIONS,
    aspect: route?.params?.aspect ?? '1:1',
  });
  const [applying, setApplying] = useState(false);

  // Si pas d'URI initiale, on lance immédiatement le choix de source.
  const promptPick = useCallback(async () => {
    const uri = await pickWithChoice(editOpts.aspect);
    if (uri) setSourceUri(uri);
    else if (!initialUri) {
      // Annulation au premier écran : retour arrière.
      navigation.goBack();
    }
  }, [editOpts.aspect, initialUri, navigation]);

  useEffect(() => {
    if (!sourceUri) {
      promptPick();
    }
  }, [sourceUri, promptPick]);

  const handleRotateCw = () => {
    setEditOpts((o) => ({
      ...o,
      rotate: (((o.rotate + 90) % 360) as 0 | 90 | 180 | 270),
    }));
  };

  const handleRotateCcw = () => {
    setEditOpts((o) => ({
      ...o,
      rotate: (((o.rotate + 270) % 360) as 0 | 90 | 180 | 270),
    }));
  };

  const toggleFlipH = () => setEditOpts((o) => ({ ...o, flipH: !o.flipH }));
  const toggleFlipV = () => setEditOpts((o) => ({ ...o, flipV: !o.flipV }));
  const toggleHd = () => setEditOpts((o) => ({ ...o, hd: !o.hd }));

  const handlePickAgain = () => {
    setSourceUri(null); // déclenche le useEffect → promptPick
  };

  const handleDone = async () => {
    if (!sourceUri) return;
    setApplying(true);
    try {
      const result = await applyEdits(sourceUri, editOpts);
      // Passe le résultat à l'écran appelant via params de navigation.
      navigation.navigate(returnTo, {
        editedImageUri: result.uri,
        editIndex,
      });
    } catch (e) {
      Alert.alert('Erreur', "Impossible de traiter l'image. Réessayez.");
    } finally {
      setApplying(false);
    }
  };

  // Calcul de la transformation visuelle (aperçu live sans ré-encoder).
  const transformStyle: any[] = [];
  if (editOpts.rotate) {
    transformStyle.push({ rotate: `${editOpts.rotate}deg` });
  }
  if (editOpts.flipH && editOpts.flipV) {
    transformStyle.push({ scale: -1 });
  } else if (editOpts.flipH) {
    transformStyle.push({ scaleX: -1 });
  } else if (editOpts.flipV) {
    transformStyle.push({ scaleY: -1 });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Studio photo</Text>
        <View style={{ width: 24 }} />
      </View>

      {!sourceUri ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Ouverture de la caméra…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Aperçu grand */}
          <View style={styles.previewWrap}>
            <Image
              source={{ uri: sourceUri }}
              style={[styles.preview, { transform: transformStyle }]}
              contentFit="contain"
              transition={150}
            />
            <View style={styles.hdBadge}>
              <Feather
                name={editOpts.hd ? 'zap' : 'zap-off'}
                size={11}
                color={editOpts.hd ? colors.warning : colors.textMuted}
              />
              <Text
                style={[
                  styles.hdText,
                  { color: editOpts.hd ? colors.warning : colors.textMuted },
                ]}
              >
                {editOpts.hd ? 'HD' : 'Standard'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Format</Text>
          <View style={styles.aspectRow}>
            {ASPECT_OPTIONS.map((opt) => {
              const active = editOpts.aspect === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.aspectChip, active && styles.aspectChipActive]}
                  onPress={() => setEditOpts((o) => ({ ...o, aspect: opt.value }))}
                >
                  <Text
                    style={[
                      styles.aspectChipText,
                      active && styles.aspectChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Ajustements</Text>
          <View style={styles.toolGrid}>
            <ToolButton
              icon="rotate-cw"
              label="Rotation"
              onPress={handleRotateCw}
            />
            <ToolButton
              icon="rotate-ccw"
              label="Inverse"
              onPress={handleRotateCcw}
            />
            <ToolButton
              icon="corner-up-right"
              label={editOpts.flipH ? 'Miroir ✓' : 'Miroir H'}
              active={editOpts.flipH}
              onPress={toggleFlipH}
            />
            <ToolButton
              icon="corner-up-left"
              label={editOpts.flipV ? 'Retourner ✓' : 'Retourner'}
              active={editOpts.flipV}
              onPress={toggleFlipV}
            />
            <ToolButton
              icon="zap"
              label={editOpts.hd ? 'HD activé' : 'HD'}
              active={editOpts.hd}
              onPress={toggleHd}
            />
            <ToolButton
              icon="refresh-cw"
              label="Reprendre"
              onPress={handlePickAgain}
            />
          </View>

          <View style={styles.tipBox}>
            <Feather name="info" size={14} color={colors.info} />
            <Text style={styles.tipText}>
              {editOpts.hd
                ? 'HD : 1600px, qualité élevée. Idéal pour photo de couverture.'
                : 'Standard : 800px, optimisé pour le web et les connexions lentes.'}
            </Text>
          </View>

          <Button
            label="Terminer"
            onPress={handleDone}
            loading={applying}
            icon={<Feather name="check" size={18} color={colors.textInverse} />}
            style={{ marginTop: spacing.lg, marginBottom: spacing.xxxl }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ToolButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.toolBtn,
        active && styles.toolBtnActive,
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <Feather
        name={icon as any}
        size={20}
        color={active ? colors.textInverse : colors.text}
      />
      <Text
        style={[
          styles.toolLabel,
          active && styles.toolLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
  },
  previewWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  hdBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  hdText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  aspectRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  aspectChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  aspectChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  aspectChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  aspectChipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toolBtn: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toolBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toolLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  toolLabelActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info + '12',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tipText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
    lineHeight: 18,
  },
});

// Note : la prise de photo via caméra est masquée sur web (expo-image-picker
// ne supporte pas launchCameraAsync sur web). Sur natif, la permission
// NSCameraUsageDescription (iOS) / CAMERA (Android) est gérée via app.json.
