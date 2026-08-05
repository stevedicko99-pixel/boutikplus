import { StyleSheet, View, Pressable, Text, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '@/theme';
import { useCart } from '@/context/CartContext';
import { useNotifications } from '@/context/NotificationContext';

interface Tab {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  screen: string;
}

const TABS: Tab[] = [
  { key: 'home', label: 'Accueil', icon: 'home', screen: 'Home' },
  { key: 'search', label: 'Recherche', icon: 'search', screen: 'Search' },
  { key: 'cart', label: 'Panier', icon: 'shopping-cart', screen: 'Cart' },
  { key: 'messages', label: 'Messages', icon: 'message-square', screen: 'ConversationList' },
  { key: 'profile', label: 'Profil', icon: 'user', screen: 'Profile' },
];

interface BottomTabBarProps {
  navigation: { navigate: (screen: string) => void };
  currentRoute: string;
}

/**
 * BottomTabBar — Style Pinduoduo (menu NON statique, flottant, animé).
 *
 * Caractéristiques Pinduoduo :
 *  - Barre flottante avec marge horizontale (pas collée aux bords)
 *  - Coins très arrondis (radius 24px)
 *  - Ombre marquée pour effet "surélevé"
 *  - Animation de tap : scale spring + feedback visuel
 *  - Onglet actif : icône en fond corail arrondi (pas juste changement de couleur)
 *  - Badges promo rouges
 */
export function BottomTabBar({ navigation, currentRoute }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { count } = useCart();
  const { unreadMessages } = useNotifications();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) + 4 },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.floatingBar}>
        {TABS.map((tab) => {
          const active = currentRoute === tab.screen;
          const showBadge =
            tab.screen === 'Cart'
              ? count > 0
              : tab.screen === 'ConversationList'
                ? unreadMessages > 0
                : false;
          const badgeValue = tab.screen === 'Cart' ? count : unreadMessages;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() => navigation.navigate(tab.screen)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              android_ripple={{ color: colors.primary + '15', radius: 28, borderless: false }}
            >
              <View style={active ? styles.activeIconWrap : styles.iconWrap}>
                <Feather
                  name={tab.icon}
                  size={22}
                  color={active ? colors.textInverse : colors.textMuted}
                />
                {showBadge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badgeValue > 9 ? '9+' : badgeValue}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Conteneur transparent — la barre flottante a ses propres marges/ombres
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  // Barre flottante Pinduoduo : coins arrondis, ombre, blanc pur
  floatingBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: {
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.10)',
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  // Wrap d'icône : inactif = transparent, actif = fond corail arrondi (style Pinduoduo)
  iconWrap: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  activeIconWrap: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: { boxShadow: `0px 2px 8px ${colors.primary}66` },
    }),
  },
  // Badge rouge Pinduoduo
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.promo,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: colors.promo,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
    }),
  },
  badgeText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textInverse,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
});
