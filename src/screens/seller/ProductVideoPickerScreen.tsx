// Sélecteur de vidéo produit — Boutikplus
// Permet d'ajouter une vidéo à un produit via :
//   1. Lien externe (TikTok / YouTube / Snapchat) — collé depuis le presse-papier
//   2. Upload natif (galerie, ≤ 30s / 25MB) — pour la qualité HD
// MVP : 1 vidéo par produit. Les vidéos externes s'ouvrent dans l'app native.

import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, typography, spacing, radius } from '@/theme';
import { friendlyMessage } from '@/lib/errorMessages';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  addProductVideo,
  pickVideoForUpload,
  uploadVideo,
  validateVideoAsset,
  validateExternalUrl,
  detectExternalSource,
  MAX_VIDEO_DURATION_SEC,
  MAX_VIDEO_SIZE_MB,
} from '@/lib/videoService';
import { openExternalLink } from '@/lib/safeLinking';
import type { ExternalVideoSource } from '@/types/models';

import { showAlert } from '@/lib/dialog';
interface ProductVideoPickerScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: { params?: { productId?: string; returnTo?: 'AddEditProduct' } };
}

const SOURCE_META: Record<ExternalVideoSource, { label: string; color: string; icon: string }> = {
  tiktok: { label: 'TikTok', color: '#000000', icon: 'video' },
  youtube: { label: 'YouTube', color: '#FF0000', icon: 'video' },
  snapchat: { label: 'Snapchat', color: '#FFFC00', icon: 'camera' },
  other: { label: 'Lien externe', color: colors.info, icon: 'link' },
};

export function ProductVideoPickerScreen({ navigation, route }: ProductVideoPickerScreenProps) {
  const productId = route?.params?.productId;
  const returnTo = route?.params?.returnTo ?? 'AddEditProduct';
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const detectedSource: ExternalVideoSource = url.trim() ? detectExternalSource(url) : 'other';
  const sourceMeta = SOURCE_META[detectedSource];
  const urlError = url.trim() ? validateExternalUrl(url) : null;

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text.trim());
    else showAlert('Presse-papier vide', 'Copiez d\'abord un lien vidéo.');
  };

  const handleAddExternal = async () => {
    if (!productId) {
      showAlert('Produit requis', 'Enregistrez d\'abord le produit avant d\'ajouter une vidéo.');
      return;
    }
    const err = validateExternalUrl(url);
    if (err) { showAlert('Lien invalide', err); return; }

    setSaving(true);
    const { video, error } = await addProductVideo({
      productId,
      type: 'external',
      url: url.trim(),
      source: detectExternalSource(url),
    });
    setSaving(false);
    if (error) { showAlert('Erreur', friendlyMessage(error)); return; }
    showAlert('Vidéo ajoutée ✓', `Lien ${sourceMeta.label} enregistré.`, [
      { text: 'OK', onPress: () => navigation.navigate(returnTo, { productId }) },
    ]);
    void video;
  };

  const handleUpload = async () => {
    if (!productId) {
      showAlert('Produit requis', 'Enregistrez d\'abord le produit avant d\'ajouter une vidéo.');
      return;
    }
    const asset = await pickVideoForUpload();
    if (!asset) return;

    // Validation taille/durée
    const validationError = validateVideoAsset(asset);
    if (validationError) {
      showAlert('Vidéo non valide', validationError);
      return;
    }

    setUploading(true);
    const uploaded = await uploadVideo(asset.uri, `video_${productId}`);
    setUploading(false);

    if (!uploaded) {
      showAlert('Échec', 'Impossible de téléverser la vidéo. Réessayez.');
      return;
    }

    setSaving(true);
    const { error } = await addProductVideo({
      productId,
      type: 'upload',
      url: uploaded.url,
      durationSec: asset.duration ? Math.round(asset.duration / 1000) : null,
    });
    setSaving(false);
    if (error) { showAlert('Erreur', friendlyMessage(error)); return; }
    showAlert('Vidéo ajoutée ✓', 'Votre vidéo a été téléversée.', [
      { text: 'OK', onPress: () => navigation.navigate(returnTo, { productId }) },
    ]);
  };

  if (!productId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={navigation.goBack} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Ajouter une vidéo</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Feather name="info" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Produit non enregistré</Text>
          <Text style={styles.emptyDesc}>
            Enregistrez d'abord votre produit, puis ajoutez-y une vidéo depuis
            l'écran d'édition.
          </Text>
          <Button
            label="Retour"
            onPress={navigation.goBack}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Ajouter une vidéo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Option 1 : lien externe (recommandé pour les vendeurs TikTok) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.secondary + '18' }]}>
              <Feather name="link" size={18} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Lien vidéo (recommandé)</Text>
              <Text style={styles.sectionDesc}>
                Collez le lien TikTok, YouTube ou Snapchat de votre vidéo.
              </Text>
            </View>
          </View>

          <View style={styles.urlRow}>
            <Input
              value={url}
              onChangeText={setUrl}
              placeholder="https://www.tiktok.com/@vous/video/..."
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              icon="link"
              style={{ flex: 1 }}
            />
            <Pressable style={styles.pasteBtn} onPress={handlePaste} hitSlop={8}>
              <Feather name="clipboard" size={16} color={colors.primary} />
              <Text style={styles.pasteText}>Coller</Text>
            </Pressable>
          </View>

          {url.trim() && !urlError ? (
            <View style={styles.detectedBox}>
              <Feather name={sourceMeta.icon as any} size={14} color={sourceMeta.color === '#FFFC00' ? colors.text : sourceMeta.color} />
              <Text style={styles.detectedText}>Source détectée : {sourceMeta.label}</Text>
            </View>
          ) : null}
          {urlError ? (
            <Text style={styles.errorText}>{urlError}</Text>
          ) : null}

          <Button
            label="Ajouter ce lien"
            onPress={handleAddExternal}
            loading={saving}
            disabled={!url.trim() || !!urlError}
            icon={<Feather name="check" size={18} color={colors.textInverse} />}
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* Option 2 : upload natif */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '18' }]}>
              <Feather name="upload" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Téléverser une vidéo</Text>
              <Text style={styles.sectionDesc}>
                Depuis votre galerie. Maximum {MAX_VIDEO_DURATION_SEC}s / {MAX_VIDEO_SIZE_MB}MB.
              </Text>
            </View>
          </View>

          <Button
            label="Choisir une vidéo"
            onPress={handleUpload}
            loading={uploading}
            variant="outline"
            icon={<Feather name="video" size={18} color={colors.primary} />}
          />

          <View style={styles.tipBox}>
            <Feather name="info" size={13} color={colors.info} />
            <Text style={styles.tipText}>
              Préférez un lien TikTok/YouTube : les vidéos externes s'ouvrent dans
              l'app native (meilleure qualité, moins de données).
            </Text>
          </View>
        </View>

        <Text style={styles.helpLink} onPress={() => openExternalLink('https://wa.me/22670000000')}>
          Besoin d'aide pour ajouter une vidéo ?
        </Text>
      </ScrollView>
    </SafeAreaView>
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
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxxl },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  sectionDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '12',
    marginBottom: spacing.sm,
  },
  pasteText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  detectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success + '12',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  detectedText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.success,
    fontWeight: typography.weights.semibold,
  },
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info + '12',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  tipText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
    lineHeight: 18,
  },
  helpLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.secondary,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: spacing.md,
  },
});
