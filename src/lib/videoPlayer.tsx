// Lecteur vidéo — Boutikplus
// Approche SANS dépendance lourde : sur web, HTML5 <video> natif (léger, performant,
// géré par le navigateur) ; sur natif, poster + bouton qui ouvre l'URL dans l'app
// native (TikTok/YouTube) ou le navigateur. Évite d'embarquer expo-video (~50KB)
// et reste optimal pour les appareils low-end ciblés par l'app.
//
// Pour les vidéos uploadées (type='upload') sur natif, faute de lecteur natif embarqué,
// on ouvre l'URL dans le navigateur système. Sur web, lecture HTML5 inline.

import React, { createElement } from 'react';
import { StyleSheet, View, Pressable, Platform, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/theme';
import { openExternalLink } from '@/lib/safeLinking';

export interface AppVideoPlayerProps {
  source: string; // URL de la vidéo (uploadée ou externe)
  poster?: string | null; // URL de la miniature
  style?: StyleProp<ViewStyle>;
  /** Pour les liens externes, si true on force l'ouverture externe plutôt que la lecture inline. */
  openExternal?: boolean;
}

export function AppVideoPlayer({ source, poster, style, openExternal }: AppVideoPlayerProps) {
  // Sur web : lecture HTML5 inline (sauf si openExternal forcé pour les liens TikTok/YouTube
  // qui ne peuvent pas être lus dans un <video> à cause des restrictions CORS/X-Frame).
  if (Platform.OS === 'web' && !openExternal) {
    // React.createElement('video', ...) rend une balise <video> HTML5 côté web.
    // Le cast `any` évite d'avoir à déclarer l'intrinsic JSX 'video' dans TS.
    return createElement('video', {
      src: source,
      poster: poster ?? undefined,
      controls: true,
      playsInline: true,
      preload: 'metadata',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'contain' as const,
        backgroundColor: '#000',
        borderRadius: 8,
      },
    }) as unknown as React.ReactElement;
  }

  // Sur natif (ou web avec openExternal) : poster + bouton lecture qui ouvre l'URL.
  const handlePlay = () => {
    if (Platform.OS === 'web') {
      // Sur web, ouvre dans un nouvel onglet (pour les vidéos externes TikTok/YouTube).
      try {
        window.open(source, '_blank', 'noopener,noreferrer');
      } catch {
        // ignore
      }
      return;
    }
    openExternalLink(source, { requireTrustedHost: true });
  };

  return (
    <View style={[styles.container, style]}>
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={styles.poster}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={styles.noPoster}>
          <Feather name="video" size={36} color={colors.textMuted} />
        </View>
      )}
      <Pressable style={styles.playBtn} onPress={handlePlay} hitSlop={8}>
        <Feather name="play" size={26} color={colors.textInverse} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  noPoster: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4, // décale l'icône play visuellement au centre
  },
});
