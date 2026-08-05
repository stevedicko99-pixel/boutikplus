import { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { AppNavigator, AppStackParamList } from './AppNavigator';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '@/theme';
import { PUBLIC_APP_URL } from '@/constants/config';
import type { UserRole } from '@/types/models';

// Configuration du deep-linking : chaque boutique et chaque produit ont une
// URL publique partageable qui ouvre directement la page concernée, même sans
// connexion. Format : {PUBLIC_APP_URL}/s/{shopId}  et  .../p/{productId}.
// Sur mobile, le scheme natif `boutikplus://` est aussi géré (app.json).
//
// ⚠️ CORRECTION : les routes publiques (Home, Search, Cart, About, etc.)
// DOIVENT être déclarées dans `screens` pour que React Navigation résolve
// l'URL au chargement. Sans ça, /search → currentRoute=undefined →
// redirect automatique vers Login (bug "deep-link public cassé").
const linking = {
  prefixes: [
    PUBLIC_APP_URL,
    'https://boutikplus.vercel.app',
    'boutikplus://',
  ],
  config: {
    // Routes publiques accessibles par URL directe (mode invité).
    // ShopDetail/ProductDetail ont des params ; les autres sont des paths simples.
    screens: {
      Home: '',
      Search: 'search',
      Cart: 'cart',
      About: 'about',
      HelpCenter: 'help',
      HelpTutorial: 'help/:tutorialId',
      Login: 'login',
      Register: 'register',
      OwnershipVerification: 'ownership',
      ShopDetail: 's/:shopId',
      ProductDetail: 'p/:productId',
    } as Partial<Record<keyof AppStackParamList, string>>,
  },
};

export function RootNavigator() {
  const { profile, loading } = useAuth();
  const navRef = useRef<NavigationContainerRef<AppStackParamList>>(null);

  // Réinitialise la navigation selon l'état d'authentification
  // et le RÔLE ACTIF de l'utilisateur (primary_role).
  // Un utilisateur peut cumuler buyer + seller + driver → c'est primary_role
  // qui détermine son tableau de bord d'accueil.
  useEffect(() => {
    if (loading || !navRef.current) return;
    const currentRoute = navRef.current.getCurrentRoute()?.name;
    const isAuthenticated = Boolean(profile);

    // Routes accessibles SANS connexion :
    // - aide/tutoriels
    // - pages boutique & produit publiques (site web indépendant partagé par URL)
    // - accueil, recherche, panier (parcours invité complet, login SEULEMENT au paiement)
    const PUBLIC_ROUTES = [
      'Login',
      'Register',
      'HelpCenter',
      'HelpTutorial',
      'ShopDetail',
      'ProductDetail',
      'Home',
      'Search',
      'Cart',
      'Checkout',
      // Ownership publique (preuves niveau 1)
      'About',
      'OwnershipVerification',
    ];

    if (isAuthenticated && (currentRoute === 'Login' || currentRoute === 'Register' || !currentRoute)) {
      const role: UserRole = (profile?.primary_role as UserRole) ?? profile?.role ?? 'buyer';
      let route: keyof AppStackParamList = 'Home';
      switch (role) {
        case 'seller':
          route = 'SellerDashboard';
          break;
        case 'driver':
          route = 'DriverDashboard';
          break;
        case 'admin':
        case 'super_admin':
          route = 'AdminDashboard';
          break;
        case 'buyer':
        default:
          route = 'Home';
      }
      navRef.current.resetRoot({ index: 0, routes: [{ name: route }] });
    } else if (!isAuthenticated && currentRoute && !PUBLIC_ROUTES.includes(currentRoute)) {
      navRef.current.resetRoot({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [profile, loading]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <PageLoader size="lg" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={Platform.OS === 'web' ? styles.webContainer : undefined}>
        <NavigationContainer ref={navRef as any} linking={linking}>
          <AppNavigator />
        </NavigationContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  // Sur desktop, on contraint la largeur pour éviter un layout trop étiré.
  // Sur mobile, le style n'est pas appliqué (Platform.OS === 'web' guard).
  webContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    backgroundColor: colors.background,
    ...Platform.select({
      web: {
        boxShadow: '0 0 40px rgba(0,0,0,0.08)',
      },
      default: {},
    }),
  },
});
