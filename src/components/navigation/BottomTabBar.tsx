import { StyleSheet, View, Pressable, Text, Platform, useWindowDimensions } from 'react-native';
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
  { key: 'cart', label: 'Panier', icon: 'shopping-bag', screen: 'Cart' },
  { key: 'messages', label: 'Messages', icon: 'message-circle', screen: 'ConversationList' },
  { key: 'profile', label: 'Profil', icon: 'user', screen: 'Profile' },
];

interface BottomTabBarProps {
  navigation: { navigate: (screen: string) => void };
  currentRoute: string;
}

export function BottomTabBar({ navigation, currentRoute }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { count } = useCart();
  const { unreadMessages } = useNotifications();
  const desktop = width >= 900;

  return (
    <View style={[styles.container, desktop ? styles.containerDesktop : { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} pointerEvents="box-none">
      <View style={[styles.dock, desktop && styles.dockDesktop]} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const active = currentRoute === tab.screen;
          const badgeValue = tab.screen === 'Cart' ? count : tab.screen === 'ConversationList' ? unreadMessages : 0;
          return (
            <Pressable
              key={tab.key}
              style={({ pressed }) => [styles.tab, desktop && styles.tabDesktop, active && styles.tabActive, pressed && styles.pressed]}
              onPress={() => navigation.navigate(tab.screen)}
              accessibilityRole="tab"
              accessibilityLabel={`${tab.label}${badgeValue ? `, ${badgeValue} nouveau${badgeValue > 1 ? 'x' : ''}` : ''}`}
              accessibilityState={{ selected: active }}
            >
              <View style={styles.iconWrap}>
                <Feather name={tab.icon} size={desktop ? 19 : 21} color={active ? colors.primaryDeep : colors.textMuted} />
                {badgeValue > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badgeValue > 9 ? '9+' : badgeValue}</Text></View> : null}
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.md, paddingTop: spacing.sm, alignItems: 'center', backgroundColor: 'transparent' },
  containerDesktop: { paddingBottom: spacing.lg, paddingHorizontal: spacing.xl },
  dock: { width: '100%', maxWidth: 620, minHeight: 68, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xs, borderWidth: 1, borderColor: colors.borderLight, ...Platform.select({ ios: { shadowColor: colors.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 18 }, android: { elevation: 10 }, default: { boxShadow: '0 10px 30px rgba(31,24,40,0.12)' } as any }) },
  dockDesktop: { maxWidth: 720, minHeight: 60, borderRadius: radius.pill, paddingHorizontal: spacing.sm },
  tab: { flex: 1, minWidth: 52, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: radius.lg, borderWidth: 2, borderColor: 'transparent' },
  tabDesktop: { minHeight: 48, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.surfaceAlt },
  pressed: { opacity: 0.68 },
  focused: { borderColor: colors.stitchDeep },
  iconWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -7, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.promo, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.surface },
  badgeText: { fontFamily: typography.fontFamily, fontSize: 9, fontWeight: typography.weights.bold, color: colors.textInverse },
  label: { fontFamily: typography.fontFamily, fontSize: 10, color: colors.textMuted, fontWeight: typography.weights.medium },
  labelActive: { color: colors.primaryDeep, fontWeight: typography.weights.bold },
});
