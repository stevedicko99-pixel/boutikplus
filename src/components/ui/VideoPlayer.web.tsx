import { useRef, useState } from 'react';
import { StyleSheet, View, Pressable, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/theme';

const { width: screenWidth } = Dimensions.get('window');
const VIDEO_WIDTH = Math.min(screenWidth - 80, 300);
const VIDEO_HEIGHT = VIDEO_WIDTH * 0.75;

interface VideoPlayerProps {
  uri: string;
  thumbnail?: string | null;
  isMe?: boolean;
}

export function VideoPlayer({ uri, thumbnail, isMe = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const handlePress = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.play().catch(() => {});
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
      <video
        ref={videoRef}
        src={uri}
        poster={thumbnail ?? undefined}
        style={styles.video}
        playsInline
        muted={false}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
      />
      {showControls && (
        <View style={styles.overlay} pointerEvents="none">
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
    objectFit: 'cover',
    display: 'block',
    backgroundColor: '#000',
  } as any,
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
