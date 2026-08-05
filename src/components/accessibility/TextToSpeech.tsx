import { useState, useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors } from '@/theme';

interface TextToSpeechProps {
  text: string;
  style?: any;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Composant "écouter" - lit un texte à voix haute via expo-speech (TTS offline).
 * Fonctionne sans réseau, idéal pour le marché burkinabè.
 * Le texte est automatiquement lu en français (langue de l'application).
 */
export function TextToSpeech({ text, style, size = 'md' }: TextToSpeechProps) {
  const [playing, setPlaying] = useState(false);
  const stoppedRef = useRef(false);

  const handleToggle = useCallback(() => {
    if (playing) {
      Speech.stop();
      stoppedRef.current = true;
      setPlaying(false);
      return;
    }
    stoppedRef.current = false;
    setPlaying(true);
    Speech.speak(text, {
      language: 'fr-FR',
      pitch: 1.0,
      rate: 0.9,
      onDone: () => {
        if (!stoppedRef.current) setPlaying(false);
      },
      onError: () => {
        setPlaying(false);
      },
      onStopped: () => {
        setPlaying(false);
      },
    });
  }, [text, playing]);

  const sizeMap = {
    sm: { width: 32, height: 32, iconSize: 14 },
    md: { width: 40, height: 40, iconSize: 18 },
    lg: { width: 48, height: 48, iconSize: 22 },
  };

  const s = sizeMap[size];

  return (
    <Pressable
      style={[
        styles.button,
        { width: s.width, height: s.height, borderRadius: s.height / 2 },
        playing && styles.playing,
        style,
      ]}
      onPress={handleToggle}
      hitSlop={8}
      accessibilityLabel={playing ? 'Arrêter la lecture' : 'Écouter le texte'}
      accessibilityRole="button"
    >
      <Feather
        name={playing ? 'volume-2' : 'volume'}
        size={s.iconSize}
        color={playing ? colors.textInverse : colors.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  playing: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
