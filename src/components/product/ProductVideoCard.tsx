// Carte vidéo produit — Boutikplus
// Affiche une vidéo uploadée (lecteur inline) ou externe (vignette + bouton "Ouvrir").
// Les vidéos externes (TikTok/YouTube/Snapchat) ne peuvent pas être lues inline
// (restrictions X-Frame/CORS) : on ouvre l'app native ou le navigateur.

import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { AppVideoPlayer } from '@/lib/videoPlayer';
import { openExternalLink } from '@/lib/safeLinking';
import type { ProductVideo, ExternalVideoSource } from '@/types/models';

interface ProductVideoCardProps {
  video: ProductVideo;
  onDelete?: (video: ProductVideo) => void;
  compact?: boolean;
}

const SOURCE_META: Record<ExternalVideoSource, { label: string; color: string; icon: string }> = {
  tiktok: { label: 'TikTok', color: '#000000', icon: 'video' },
  youtube: { label: 'YouTube', color: '#FF0000', icon: 'youtube' },
  snapchat: { label: 'Snapchat', color: '#FFFC00', icon: 'camera' },
  other: { label: 'Lien externe', color: colors.info, icon: 'link' },
};

export function ProductVideoCard({ video, onDelete, compact = false }: ProductVideoCardProps) {
  const isExternal = video.type === 'external';
  const source = video.source ?? 'other';
  const meta = SOURCE_META[source] ?? SOURCE_META.other;

  const handleOpenExternal = () => {
    if (Platform.OS === 'web') {
      try {
        window.open(video.url, '_blank', 'noopener,noreferrer');
      } catch {
        // ignore
      }
      return;
    }
    openExternalLink(video.url, { requireTrustedHost: true, showErrorOnBlocked: true });
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.mediaWrap}>
        {isExternal ? (
          // Vidéo externe : vignette + badge source + bouton ouvrir
          <>
            {video.thumbnail_url ? (
              <Image
                source={{ uri: video.thumbnail_url }}
                style={styles.thumbnail}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={styles.noThumb}>
                <Feather name="video" size={36} color={colors.textMuted} />
              </View>
            )}
            <View style={[styles.sourceBadge, { backgroundColor: meta.color }]}>
              <Feather name={meta.icon as any} size={10} color={colors.textInverse} />
              <Text style={styles.sourceText}>{meta.label}</Text>
            </View>
            <Pressable style={styles.openBtn} onPress={handleOpenExternal} hitSlop={8}>
              <View style={styles.openPill}>
                <Feather name="external-link" size={18} color={colors.textInverse} />
                <Text style={styles.openText}>Ouvrir</Text>
              </View>
            </Pressable>
          </>
        ) : (
          // Vidéo uploadée : lecteur inline
          <AppVideoPlayer source={video.url} poster={video.thumbnail_url} style={styles.player} />
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Feather
            name={isExternal ? 'link' : 'upload'}
            size={12}
            color={colors.textMuted}
          />
          <Text style={styles.footerText} numberOfLines={1}>
            {isExternal ? meta.label : 'Vidéo téléversée'}
            {video.duration_sec ? ` · ${video.duration_sec}s` : ''}
          </Text>
        </View>
        {onDelete ? (
          <Pressable
            style={styles.deleteBtn}
            onPress={() => onDelete(video)}
            hitSlop={8}
          >
            <Feather name="trash-2" size={13} color={colors.danger} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  cardCompact: {
    marginBottom: 0,
  },
  mediaWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  noThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  sourceText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  openBtn: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  openText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  player: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    flex: 1,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.danger + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Centrage du bouton "Ouvrir" sur la vignette — StyleSheet ne supporte pas
// l'auto-centrage absolu, on le positionne donc via le conteneur mediaWrap.
// Le bouton est centré en utilisant inset via position absolute + flex.
