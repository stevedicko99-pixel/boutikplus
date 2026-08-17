import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

interface AudioPlayerProps {
  uri: string;
  duration: number;
  isMe?: boolean;
}

export function AudioPlayer({ uri, duration, isMe = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.onended = null;
        a.ontimeupdate = null;
      }
    };
  }, []);

  const ensureAudio = (): HTMLAudioElement | null => {
    if (audioRef.current) return audioRef.current;
    try {
      const a = new Audio(uri);
      a.preload = 'metadata';
      a.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
      a.ontimeupdate = () => {
        if (a.duration && !isNaN(a.duration) && a.duration > 0) {
          setProgress(Math.min(a.currentTime / a.duration, 1));
        }
      };
      audioRef.current = a;
      return a;
    } catch {
      return null;
    }
  };

  const handlePlayPause = async () => {
    const a = ensureAudio();
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      try {
        await a.play();
        setIsPlaying(true);
      } catch {
        // ignore autoplay block
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
