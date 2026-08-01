import { StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

interface ProfileScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void };
}

export function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { profile, signOut } = useAuth();

  const menuItems = [
    { icon: 'package', label: 'Mes commandes', screen: 'Orders', color: colors.primary },
    { icon: 'map-pin', label: 'Mes adresses', screen: 'Addresses', color: colors.secondary },
    { icon: 'bell', label: 'Notifications', screen: 'Settings', color: colors.warning },
    { icon: 'help-circle', label: 'Aide & support', screen: 'HelpCenter', color: colors.success },
    { icon: 'settings', label: 'Paramètres', screen: 'Settings', color: colors.textMuted },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Carte profil */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {profile?.avatar_url ? null : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile?.full_name?.[0] ?? 'B'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{profile?.full_name ?? 'Utilisateur'}</Text>
          <Text style={styles.phone}>{profile?.phone}</Text>
          <View style={styles.roleBadge}>
            <Feather name={profile?.role === 'seller' ? 'briefcase' : profile?.role === 'admin' ? 'shield' : 'shopping-bag'} size={13} color={colors.textInverse} />
            <Text style={styles.roleText}>{profile?.role === 'seller' ? 'Vendeur' : profile?.role === 'admin' ? 'Administrateur' : 'Acheteur'}</Text>
          </View>
          {profile?.city ? (
            <View style={styles.cityRow}>
              <Feather name="map-pin" size={12} color={colors.textMuted} />
              <Text style={styles.cityText}>{profile.city}</Text>
            </View>
          ) : null}
        </View>

        {/* Espace vendeur */}
        {profile?.role === 'seller' ? (
          <Pressable style={styles.sellerCard} onPress={() => navigation.navigate('SellerDashboard')}>
            <View style={styles.sellerIcon}>
              <Feather name="trending-up" size={24} color={colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerTitle}>Espace vendeur</Text>
              <Text style={styles.sellerDesc}>Gérer ma boutique, mes produits et commandes</Text>
            </View>
            <Feather name="chevron-right" size={22} color={colors.textInverse} />
          </Pressable>
        ) : (
          <Pressable
            style={styles.becomeSeller}
            onPress={() =>
              Alert.alert(
                'Devenir vendeur',
                "Pour devenir vendeur, créez votre boutique depuis l'onglet « Espace vendeur » ou contactez le support Boutikplus.",
              )
            }
          >
            <Feather name="briefcase" size={22} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.becomeSellerTitle}>Devenir vendeur</Text>
              <Text style={styles.becomeSellerDesc}>Créez votre boutique en 3 minutes</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.secondary} />
          </Pressable>
        )}

        {/* Espace livreur */}
        <Pressable style={styles.driverCard} onPress={() => navigation.navigate('DriverDashboard')}>
          <View style={styles.driverIcon}>
            <Feather name="navigation" size={22} color={colors.textInverse} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverTitle}>Espace livreur</Text>
            <Text style={styles.driverDesc}>Gagnez en livrant les commandes</Text>
          </View>
          <Feather name="chevron-right" size={22} color={colors.textInverse} />
        </Pressable>

        {/* Menu */}
        <View style={styles.menuList}>
          {menuItems.map((item, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                <Feather name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Admin */}
        {profile?.role === 'admin' ? (
          <Pressable style={styles.adminCard} onPress={() => navigation.navigate('AdminDashboard')}>
            <Feather name="shield" size={22} color={colors.textInverse} />
            <Text style={styles.adminText}>Panneau d'administration</Text>
            <Feather name="chevron-right" size={20} color={colors.textInverse} />
          </Pressable>
        ) : null}

        <Button label="Se déconnecter" variant="outline" onPress={signOut} style={{ marginTop: spacing.xl, marginBottom: spacing.xl }} />
        <Text style={styles.version}>Boutikplus v1.0.0 · Fait avec ❤️ au Faso</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  profileCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.borderLight },
  avatarWrap: { marginBottom: spacing.md },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.hero, fontWeight: typography.weights.bold, color: colors.textInverse },
  name: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text },
  phone: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingVertical: 4, paddingHorizontal: spacing.md, borderRadius: radius.pill, marginTop: spacing.sm },
  roleText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.textInverse },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  cityText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  sellerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  sellerTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.textInverse },
  sellerDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: 'rgba(255,255,255,0.85)' },
  becomeSeller: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1.5, borderColor: colors.secondary },
  becomeSellerTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.secondary },
  becomeSellerDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.secondary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  driverIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  driverTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.textInverse },
  driverDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: 'rgba(255,255,255,0.85)' },
  menuList: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.borderLight },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.text },
  adminCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.text, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  adminText: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textInverse },
  version: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, textAlign: 'center' },
});
