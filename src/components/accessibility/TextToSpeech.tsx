import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';

interface TextToSpeechProps {
  text: string;
  style?: any;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Composant "écouter" - lit un texte à voix haute.
 * Utilise Speech API disponible sur mobile.
 * En mode démo, affiche un retour visuel.
 */
export function TextToSpeech({ text, style, size = 'md' }: TextToSpeechProps) {
  const [playing, setPlaying] = useState(false);

  const handleToggle = () => {
    setPlaying(!playing);
    // En production, utiliser Speech.speak()
    // Simulation : on toggle l'état visuel
    setTimeout(() => setPlaying(false), 2000);
  };

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
      accessibilityLabel="Écouter le texte"
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
