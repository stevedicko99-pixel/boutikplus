import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoriteContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import type { UserRole } from '@/types/models';

/** Helper : est-ce que l'utilisateur a déjà le rôle driver ? */
function hasRole(profile: { roles?: UserRole[]; primary_role?: UserRole; role?: UserRole } | null, role: UserRole): boolean {
  if (!profile) return false;
  if (Array.isArray(profile.roles) && profile.roles.includes(role)) return true;
  if (profile.primary_role === role) return true;
  if (profile.role === role) return true;
  return false;
}

interface ProfileScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void };
}

export function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { profile, signOut, switchPrimaryRole } = useAuth();
  const { wishlist } = useFavorites();
  const [becomingDriver, setBecomingDriver] = useState(false);
  const isDriver = hasRole(profile, 'driver');

  /**
   * Flux livreur (entrée principale relocalisée depuis la home) :
   *  - visiteur déconnecté → Register
   *  - connecté AVEC rôle driver → DriverDashboard
   *  - connecté SANS rôle driver → switchPrimaryRole('driver') puis DriverRegistration
   */
  const onPressDriver = async () => {
    if (!profile) {
      navigation.navigate('Register');
      return;
    }
    if (isDriver) {
      navigation.navigate('DriverDashboard');
      return;
    }
    setBecomingDriver(true);
    try {
      const { error } = await switchPrimaryRole('driver');
      if (error) {
        Alert.alert(
          "Presque ! 🚚",
          `On n'a pas pu t'ajouter le rôle livreur tout de suite.\nRaison : ${error}\n\nTu peux quand même commencer l'inscription livreur.`,
        );
      }
      navigation.navigate('DriverRegistration');
    } finally {
      setBecomingDriver(false);
    }
  };

  const menuItems = [
    { icon: 'package', label: 'Mes commandes', screen: 'Orders', color: colors.primary },
    { icon: 'map-pin', label: 'Mes adresses', screen: 'Addresses', color: colors.secondary },
    { icon: 'heart', label: 'Mes favoris', screen: 'Wishlist', color: colors.danger, badge: wishlist.length > 0 ? wishlist.length : undefined },
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
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile?.full_name ?? 'Utilisateur'}</Text>
            {profile?.is_verified ? (
              <View style={styles.verifiedBadgeName}>
                <Feather name="check-circle" size={14} color={colors.success} />
                <Text style={styles.verifiedBadgeNameText}>Vérifié·e</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.phone}>{profile?.phone}</Text>
          {!profile?.is_verified ? (
            <Pressable
              style={({ pressed }) => [styles.getBadgeLink, pressed && { opacity: 0.7 }]}
              onPress={() => navigation.navigate('ProfileVerification')}
            >
              <Text style={styles.getBadgeLinkText}>🔒 Obtenir le badge</Text>
            </Pressable>
          ) : null}
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
            onPress={async () => {
              // ⚠️ Conversion vendeur : si connecté, on ajoute le RÔLE 'seller'
              // au COMPTE EXISTANT (pas de nouveau compte). Puis CreateShop.
              if (!profile) {
                navigation.navigate('Register');
                return;
              }
              // Cas normal : si user a déjà 'seller' → SellerDashboard, sinon → switch + CreateShop
              if (hasRole(profile, 'seller')) {
                navigation.navigate('SellerDashboard');
                return;
              }
              // Ajout du rôle 'seller' au profil existant (via RPC switch_primary_role)
              // qui ajoute auto 'buyer' si besoin — voir AuthContext.
              try {
                const { error } = await switchPrimaryRole('seller');
                if (error) {
                  Alert.alert(
                    'Presque ! 💼',
                    `Le rôle vendeur n'a pas pu être ajouté tout de suite.\nRaison : ${error}\n\nTu peux quand même créer ta boutique.`,
                  );
                }
                navigation.navigate('CreateShop');
              } catch (e: any) {
                Alert.alert('Erreur', e?.message ?? 'Problème réseau. Réessaie.');
              }
            }}
          >
            <Feather name="briefcase" size={22} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.becomeSellerTitle}>Devenir vendeur</Text>
              <Text style={styles.becomeSellerDesc}>Créez votre boutique en 3 minutes</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.secondary} />
          </Pressable>
        )}

        {/* Espace livreur — entrée principale relocalisée depuis la home */}
        <Pressable
          style={({ pressed }) => [styles.driverCard, becomingDriver && { opacity: 0.7 }, pressed && { opacity: 0.85 }]}
          onPress={onPressDriver}
        >
          <View style={styles.driverIcon}>
            <Feather name="truck" size={22} color={colors.textInverse} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.driverTitleRow}>
              <Text style={styles.driverTitle}>{isDriver ? 'Espace livreur' : 'Devenir livreur'}</Text>
              <StampBadge label={isDriver ? 'Actif' : 'Opportunité'} color={isDriver ? colors.success : colors.warning} size="sm" />
            </View>
            <Text style={styles.driverDesc}>
              {isDriver
                ? 'Gère tes livraisons et tes revenus'
                : 'Revenus flexibles · Horaires libres · Payé chaque semaine'}
            </Text>
          </View>
          <Feather name={becomingDriver ? 'loader' : 'chevron-right'} size={22} color={colors.textInverse} />
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
              {item.badge ? (
                <Badge
                  label={String(item.badge)}
                  color={colors.textInverse}
                  bgColor={colors.danger}
                  size="sm"
                />
              ) : null}
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Compte vérifié */}
        <Pressable
          style={({ pressed }) => [styles.verificationCard, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('ProfileVerification')}
        >
          <View style={[styles.menuIcon, styles.verifIconWrap]}>
            <Feather name={'shield-check' as any} size={22} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.verifLabel}>
              {profile?.is_verified ? 'Compte vérifié' : 'Vérifier mon compte'}
            </Text>
            <Text style={[
              styles.verifSublabel,
              profile?.is_verified && { color: colors.success },
            ]}>
              {profile?.is_verified ? '✅ Badge actif' : 'Obtiens ton badge officiel'}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>

        {/* Admin */}
        {profile?.role === 'admin' ? (
          <Pressable style={styles.adminCard} onPress={() => navigation.navigate('AdminDashboard')}>
            <Feather name="shield" size={22} color={colors.textInverse} />
            <Text style={styles.adminText}>Panneau d'administration</Text>
            <Feather name="chevron-right" size={20} color={colors.textInverse} />
          </Pressable>
        ) : null}

        <Button
          label="Se déconnecter"
          variant="outline"
          onPress={async () => {
            await signOut();
            // ✅ Post-déconnexion : navigation explicite vers Login (ferme la session)
            // et reset de la navigation — évite que BackButton revienne sur Profil.
            try {
              const navAny: any = navigation;
              if (navAny && typeof navAny.reset === 'function') {
                navAny.reset({ index: 0, routes: [{ name: 'Login' }] });
              } else if (navAny && typeof navAny.navigate === 'function') {
                navAny.navigate('Login');
              }
            } catch {
              // ignore (expo-web n'a parfois pas de reset)
            }
          }}
          style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}
        />
        <Text style={styles.version}>Boutikplus v1.0.0 · Fait avec ❤️ au Faso</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  profileCard: { backgroundColor: colors.surface, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, borderTopLeftRadius: 28, borderTopRightRadius: radius.xl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: 28, borderWidth: 0, ...shadows.fani },
  avatarWrap: { marginBottom: spacing.md },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.hero, fontWeight: typography.weights.bold, color: colors.textInverse },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  name: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.ink, letterSpacing: typography.letterSpacings.tight },
  verifiedBadgeName: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success + '18', paddingVertical: 3, paddingHorizontal: spacing.sm, borderRadius: radius.pill },
  verifiedBadgeNameText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.success },
  phone: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, marginTop: 2 },
  getBadgeLink: { marginTop: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  getBadgeLinkText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.secondary, textDecorationLine: 'underline' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingVertical: 4, paddingHorizontal: spacing.md, borderRadius: radius.pill, marginTop: spacing.sm },
  roleText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.textInverse },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  cityText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  profileThread: { marginVertical: spacing.sm, alignSelf: 'center' },
  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary, padding: spacing.lg, marginBottom: spacing.lg, borderTopLeftRadius: 22, borderTopRightRadius: radius.lg, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: 22, ...shadows.fani },
  sellerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  sellerTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.textInverse },
  sellerDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: 'rgba(255,255,255,0.85)' },
  becomeSeller: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.lg, marginBottom: spacing.lg, borderTopLeftRadius: 22, borderTopRightRadius: radius.lg, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: 22, borderWidth: 1.5, borderColor: colors.stitch, ...shadows.fani },
  becomeSellerTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.secondary },
  becomeSellerDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.secondary, padding: spacing.lg, marginBottom: spacing.lg, borderTopLeftRadius: 22, borderTopRightRadius: radius.lg, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: 22, ...shadows.fani },
  driverIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  driverTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.textInverse },
  driverDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: 'rgba(255,255,255,0.85)' },
  driverTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  menuList: { backgroundColor: colors.surface, overflow: 'hidden', marginBottom: spacing.lg, borderTopLeftRadius: 22, borderTopRightRadius: radius.lg, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: 22, borderWidth: 0, ...shadows.fani },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.text },
  adminCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.text, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  adminText: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textInverse },
  verificationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.lg, borderTopLeftRadius: 22, borderTopRightRadius: radius.lg, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: 22, borderWidth: 0, ...shadows.fani },
  verifIconWrap: { backgroundColor: colors.success + '18' },
  verifLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.text, marginBottom: 2 },
  verifSublabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  version: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, textAlign: 'center' },
});
