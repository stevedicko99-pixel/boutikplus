import { useState, useEffect, useRef, createElement } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

interface AudioPlayerProps {
  uri: string;
  duration: number;
  isMe?: boolean;
}

/**
 * Player audio cross-platform.
 *
 * - **Web** : `<audio>` HTML5 natif (expo-av ne fonctionne pas sur web).
 * - **Natif** : `Audio.Sound` avec barre de progression custom.
 */
export function AudioPlayer({ uri, duration, isMe = false }: AudioPlayerProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ---- WEB : <audio> HTML5
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, isMe && styles.containerMe]}>
        <View style={styles.webPlayer}>
          {createElement('audio', {
            src: uri,
            controls: true,
            preload: 'metadata' as const,
            style: { width: '100%', height: 36 },
          })}
        </View>
        <Text style={[styles.duration, isMe && styles.durationMe]}>
          {formatDuration(duration)}
        </Text>
      </View>
    );
  }

  // ---- NATIF : expo-av Audio.Sound
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sound]);

  const handlePlayPause = async () => {
    if (!sound) {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate,
      );
      setSound(newSound);
      setIsPlaying(true);
      startProgressTimer(duration);
    } else if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      await sound.playAsync();
      setIsPlaying(true);
      startProgressTimer(duration * (1 - progress));
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && status.didJustFinish) {
      setIsPlaying(false);
      setProgress(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const startProgressTimer = (remainingDuration: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    const intervalMs = 100;
    const incrementPerInterval = intervalMs / (remainingDuration * 1000);
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + incrementPerInterval;
        if (next >= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 1;
        }
        return next;
      });
    }, intervalMs);
  };

  const progressWidth: `${number}%` = `${Math.min(progress * 100, 100)}%`;

  return (
    <View style={[styles.container, isMe && styles.containerMe]}>
      <Pressable
        style={[styles.playBtn, isMe && styles.playBtnMe]}
        onPress={handlePlayPause}
        hitSlop={8}
      >
        <Feather
          name={isPlaying ? 'pause' : 'play'}
          size={18}
          color={isMe ? colors.textInverse : colors.primary}
        />
      </Pressable>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, isMe && styles.progressBarMe]}>
          <View
            style={[
              styles.progressFill,
              isMe && styles.progressFillMe,
              { width: progressWidth },
            ]}
          />
        </View>
        <Text style={[styles.duration, isMe && styles.durationMe]}>
          {formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.sm,
    minWidth: 200,
  },
  containerMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  webPlayer: {
    flex: 1,
    minWidth: 160,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressContainer: {
    flex: 1,
    gap: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressFillMe: {
    backgroundColor: colors.textInverse,
  },
  duration: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  durationMe: {
    color: colors.textInverse,
  },
});
