import { useRef, useState, createElement } from 'react';
import { StyleSheet, View, Pressable, Dimensions, Platform } from 'react-native';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

const { width: screenWidth } = Dimensions.get('window');
const VIDEO_WIDTH = Math.min(screenWidth - 80, 300);
const VIDEO_HEIGHT = VIDEO_WIDTH * 0.75;

interface VideoPlayerProps {
  uri: string;
  thumbnail?: string | null;
  isMe?: boolean;
}

/**
 * Player vidéo cross-platform.
 *
 * - **Web** : `<video>` HTML5 natif (expo-av ne fonctionne pas sur web).
 * - **Natif** : `expo-av` Video avec controls custom et poster.
 */
export function VideoPlayer({ uri, thumbnail, isMe = false }: VideoPlayerProps) {
  // ---- WEB : <video> HTML5
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {createElement('video', {
          src: uri,
          controls: true,
          poster: thumbnail ?? undefined,
          style: { width: '100%', height: '100%', objectFit: 'cover' as const },
          playsInline: true,
          preload: 'metadata' as const,
        })}
      </View>
    );
  }

  // ---- NATIF : expo-av
  const videoRef = useRef<ExpoVideo>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const handlePress = () => {
    if (isPlaying) {
      videoRef.current?.pauseAsync();
      setIsPlaying(false);
    } else {
      videoRef.current?.playAsync();
      setIsPlaying(true);
      setTimeout(() => setShowControls(false), 2000);
    }
  };

  return (
    <Pressable
      style={styles.container}
      onPress={() => {
        setShowControls(true);
        handlePress();
      }}
    >
      <ExpoVideo
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isLooping={false}
        isMuted={false}
        useNativeControls={false}
        posterSource={thumbnail ? { uri: thumbnail } : undefined}
        usePoster={!!thumbnail}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setShowControls(true);
          }
        }}
      />

      {showControls && (
        <View style={styles.overlay}>
          <View style={[styles.playButton, isMe && styles.playButtonMe]}>
            <Feather
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color={colors.textInverse}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
