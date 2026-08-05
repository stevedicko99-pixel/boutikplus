// StampBadge — badge « tamponné » signature Fil de Faso.
// Évocation d'un tampon encre de wax : légère rotation, ombre offset (stamped),
// et double impression (un "ghost" décalé de 1px à 50% d'opacité) qui donne
// l'impression d'un tampon apposé à la main, imparfait et artisanal.
// Remplace le Badge générique pour les tags premium / ratios / labels forts.
import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '@/theme';

interface StampBadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md';
  rotate?: number;
  style?: any;
}

function StampBadgeComponent({
  label,
  color = colors.primaryDeep,
  textColor = colors.textInverse,
  size = 'sm',
  rotate = -1.5,
  style,
}: StampBadgeProps) {
  const padV = size === 'sm' ? 3 : spacing.xs;
  const padH = size === 'sm' ? spacing.sm : spacing.md;
  const fontSize = size === 'sm' ? typography.sizes.caption : typography.sizes.small;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: color,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: radius.sm,
          transform: [{ rotate: `${rotate}deg` }],
        },
        shadows.stamped,
        style,
      ]}
    >
      {/* Ghost de double impression (décalé, atténué) */}
      <Text
        style={[
          styles.text,
          {
            fontSize,
            color: textColor,
            position: 'absolute',
            left: padH + 1,
            top: padV - 1,
            opacity: 0.45,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text style={[styles.text, { fontSize, color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export const StampBadge = memo(StampBadgeComponent);

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    overflow: 'visible',
  },
  text: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.extrabold,
    letterSpacing: typography.letterSpacings.ultra,
    textTransform: 'uppercase',
  },
});
