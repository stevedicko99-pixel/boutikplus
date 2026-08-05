import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = 'Copier le numéro' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animation : scale down → bounce back up
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation bounce pour l'icône de check
    if (!copied) {
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 1, friction: 3, tension: 300, useNativeDriver: true }),
      ]).start();
    }

    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(bounceAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }, 2000);
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handleCopy}
        style={({ pressed }) => [
          styles.btn,
          pressed && styles.pressed,
          copied && styles.copiedBtn,
        ]}
      >
        <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
          <Feather
            name={copied ? 'check' : 'copy'}
            size={18}
            color={copied ? colors.surface : colors.primary}
          />
        </Animated.View>
        <Text style={[styles.label, copied && styles.copiedLabel]}>
          {copied ? '✓ Copié !' : label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FFF0E0',
  },
  pressed: { opacity: 0.65 },
  copiedBtn: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  copiedLabel: {
    color: colors.surface,
  },
});
