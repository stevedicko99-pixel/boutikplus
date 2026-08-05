// ThreadDivider — motif signature « Fil de Faso ».
// Évocation d'un point de couture : une ligne de points carrés décroissants
// dont l'opacité forme un dégradé (le centre est le plus opaque, comme un fil
// qui passe sous le tissu et rejaillit). Variantes :
//   - horizontal : séparateur de sections, footer de carte, sous-titre.
//   - vertical   : ornament de liste, anneau de focus d'input.
//
// Option `breath` : micro-respiration de l'opacité globale (2,4s) pour les
// usages hero. Par défaut statique (perf low-end Android Burkina).
import { useEffect, useRef, memo } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';

interface ThreadDividerProps {
  variant?: 'horizontal' | 'vertical';
  breath?: boolean;
  color?: string;
  dotCount?: number;
  style?: any;
}

const HORIZONTAL_SIZES = [3, 4, 5, 6, 5, 4, 3];
const HORIZONTAL_OPACITIES = [0.3, 0.5, 0.75, 1, 0.75, 0.5, 0.3];
const VERTICAL_SIZES = [4, 6, 4];
const VERTICAL_OPACITIES = [0.5, 1, 0.5];

function ThreadDividerComponent({
  variant = 'horizontal',
  breath = false,
  color = colors.stitch,
  style,
}: ThreadDividerProps) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!breath) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.55,
          duration: 1200,
          easing: Easing.bezier(0.45, 0, 0.55, 1),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.bezier(0.45, 0, 0.55, 1),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, breath]);

  const sizes = variant === 'vertical' ? VERTICAL_SIZES : HORIZONTAL_SIZES;
  const opacities = variant === 'vertical' ? VERTICAL_OPACITIES : HORIZONTAL_OPACITIES;
  const isVertical = variant === 'vertical';

  return (
    <Animated.View
      style={[
        isVertical ? styles.vertical : styles.horizontal,
        { opacity: anim },
        style,
      ]}
    >
      {sizes.map((s, i) => (
        <View
          key={i}
          style={[
            isVertical ? styles.vDot : styles.hDot,
            {
              width: s,
              height: s,
              backgroundColor: color,
              opacity: opacities[i],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

export const ThreadDivider = memo(ThreadDividerComponent);

const styles = StyleSheet.create({
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 6,
  },
  vertical: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: 6,
  },
  hDot: {
    borderRadius: 2,
  },
  vDot: {
    borderRadius: 2,
  },
});
