import { StyleSheet, View, Pressable, Text } from 'react-native';
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

export function BottomTabBar({ navigation, currentRoute }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { count } = useCart();
  const { unreadMessages } = useNotifications();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {TABS.map((tab) => {
        const active = currentRoute === tab.screen;
        const showBadge = tab.screen === 'Cart' ? count > 0 : tab.screen === 'ConversationList' ? unreadMessages > 0 : false;
        const badgeValue = tab.screen === 'Cart' ? count : unreadMessages;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.screen)}
          >
            <View style={active ? styles.activeIconWrap : styles.iconWrap}>
              <Feather name={tab.icon} size={22} color={active ? colors.textInverse : colors.textMuted} />
              {showBadge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeValue > 9 ? '9+' : badgeValue}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.xs },
  iconWrap: { width: 44, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  activeIconWrap: { width: 44, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '700', color: colors.textInverse },
  label: { fontFamily: typography.fontFamily, fontSize: 10, color: colors.textMuted, fontWeight: typography.weights.medium },
  labelActive: { color: colors.primary, fontWeight: typography.weights.bold },
});
