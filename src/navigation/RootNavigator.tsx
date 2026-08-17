import { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef, getStateFromPath, type LinkingOptions } from '@react-navigation/native';
import { AppNavigator, AppStackParamList } from './AppNavigator';
import { useAuth } from '@/context/AuthContext';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '@/theme';
import { PUBLIC_APP_URL } from '@/constants/config';
import type { UserRole } from '@/types/models';

// Configuration du deep-linking : chaque boutique et chaque produit ont une
// URL publique partageable qui ouvre directement la page concernée, même sans
// connexion. Format : {PUBLIC_APP_URL}/s/{shopId}  et  .../p/{productId}.
// Sur mobile, le scheme natif `boutikplus://` est aussi géré (app.json).
//
// ⚠️ IMPORTANT : linking résout l'URL de manière ASYNCHRONE au premier rendu.
// Toute redirection (resetRoot) qui dépend de getCurrentRoute() DOIT attendre
// que NavigationContainer.onReady ait été appelé, sinon currentRoute=undefined
// et le resetRoot intervient PENDANT que linking pose l'état initial → crash.
const linking: LinkingOptions<AppStackParamList> = {
  prefixes: [
    PUBLIC_APP_URL,
    'https://boutikplus.vercel.app',
    'boutikplus://',
  ],
  config: {
    initialRouteName: 'Home' as keyof AppStackParamList,
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
      DeliveryTracking: 'delivery/:deliveryId',
      Terms: 'terms',
      Privacy: 'privacy',
      Wishlist: 'wishlist',
      ProfileVerification: 'verify-profile',
      CreateShop: 'create-shop',
      ShareableShop: 'share/:shopId',
    } as Partial<Record<keyof AppStackParamList, string>>,
  },
  // 🛡️ SÉCURITÉ : si un path ne correspond à AUCUN écran (ex: /home, /unknown),
  // on retourne un état qui pointe vers Home au lieu d'un état vide / undefined
  // qui ferait planter le resetRoot suivant.
  getStateFromPath: (path: string, options: any) => {
    try {
      const state = getStateFromPath(path, options);
      if (state && state.routes && state.routes.length > 0) return state;
    } catch (_err) {
      // getStateFromPath peut throw sur des paths bizarres ; on fallback
    }
    return {
      index: 0,
      routes: [{ name: 'Home' as keyof AppStackParamList }],
    };
  },
};

export function RootNavigator() {
  const { profile, loading, pendingReturnTo } = useAuth();
  const navRef = useRef<NavigationContainerRef<AppStackParamList>>(null);
  // 🛡️ CRITICAL : NavigationContainer.onReady indique que linking a terminé
  // la résolution ASYNCHRONE de l'URL et que getCurrentRoute() est fiable.
  // Sans ce garde, resetRoot() se lance AVANT linking → état corrompu → crash.
  const [navReady, setNavReady] = useState(false);

  // Garde pour éviter les resetRoot intempestifs (ex: user clique "Accueil" depuis
  // SellerDashboard, navigate('Home') marche, mais le useEffect rerun avec le
  // même profile et resetRoot() immédiatement vers SellerDashboard).
  // On compare :
  //  - lastKnownAuth (null → userId : login ; userId → null : logout)
  //  - on se base SUR LA PREMIÈRE ROUTE (Login/Register) pour initialiser le dashboard
  const lastKnownAuthRef = useRef<{ uid: string | null; firstInit: boolean }>({
    uid: null,
    firstInit: true,
  });

  useEffect(() => {
    // DOUBLE GARDE : attendre Auth loading ET linking/NavigationContainer prêts
    if (loading || !navReady || !navRef.current) return;
    const currentRoute = navRef.current.getCurrentRoute()?.name;
    const isAuthenticated = Boolean(profile);
    const uid = profile?.id ?? null;
    const prev = lastKnownAuthRef.current;
    // Login (était null → maintenant connecté) OU logout (connecté → null)
    const authChanged = prev.uid !== uid;
    // Premier démarrage : placer l'user sur son dashboard selon le rôle
    const firstInit = prev.firstInit;
    lastKnownAuthRef.current = { uid, firstInit: false };

    // Une redirection Checkout est consommée par LoginScreen après le chargement du profil.
    // Ne pas réinitialiser Login vers un tableau de bord entre-temps.
    if (isAuthenticated && pendingReturnTo && currentRoute === 'Login') {
      return;
    }

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
      'About',
      'OwnershipVerification',
      'Terms',
      'Privacy',
      'Wishlist',
      'ShareableShop',
      'ProfileVerification',
    ];

    // 🛡️ CORRECTION "Partager ma boutique" : préserver les deep-links publics.
    // Quand on arrive via une URL partagée (ex: /s/{shopId} → ShopDetail, ou
    // /p/{productId} → ProductDetail), on DOIT rester sur cette page — QUE l'on
    // soit connecté ou non. Sans ce garde, au premier chargement (firstInit) un
    // vendeur connecté est redirigé vers son SellerDashboard (privé), et un
    // visiteur vers Home. Le tableau de bord vendeur reste privé : on ne le
    // partage jamais. On ne force donc aucun resetRoot ici.
    if (currentRoute && PUBLIC_ROUTES.includes(currentRoute) && currentRoute !== 'Login' && currentRoute !== 'Register') {
      return;
    }

    const routeForRole = (p: NonNullable<typeof profile>): keyof AppStackParamList => {
      const role: UserRole = (p.primary_role as UserRole) ?? p.role ?? 'buyer';
      switch (role) {
        case 'seller': return 'SellerDashboard';
        case 'driver': return 'DriverDashboard';
        case 'admin':
        case 'super_admin': return 'AdminDashboard';
        case 'buyer':
        default: return 'Home';
      }
    };

    // Helper sûr : resetRoot avec try/catch pour éviter que le nav ne casse
    const safeResetRoot = (routes: [{ name: keyof AppStackParamList; params?: any }]) => {
      try {
        if (!navRef.current) return;
        if (typeof navRef.current.resetRoot !== 'function') return;
        navRef.current.resetRoot({ index: 0, routes });
      } catch (resetErr) {
        // Si resetRoot échoue (ex: nav en transition), fallback sur navigate
        const nav: any = navRef.current;
        try {
          if (nav && typeof nav.reset === 'function') {
            nav.reset({ index: 0, routes });
          }
        } catch (_e) { /* ignorer — linking a déjà mis un état correct */ }
      }
    };

    // LOGIN (nouvel user connecté) ou PREMIER DÉMARRAGE connecté → routeur selon rôle.
    // Si l'user vient de Login/Register → forcer aussi la redirection (sinon il reste dessus).
    if (isAuthenticated && (authChanged || firstInit || currentRoute === 'Login' || currentRoute === 'Register' || !currentRoute)) {
      const route = routeForRole(profile!);
      safeResetRoot([{ name: route }]);
    } else if (!isAuthenticated && firstInit) {
      // PREMIER DÉMARRAGE SANS CONNEXION : accueil public (Home) par défaut.
      // Important : permet d'arriver sur le site sans être redirigé vers Login/CreateShop.
      safeResetRoot([{ name: 'Home' }]);
    } else if (!isAuthenticated && currentRoute && !PUBLIC_ROUTES.includes(currentRoute)) {
      safeResetRoot([{ name: 'Login' }]);
    }
    // Si l'utilisateur est CONNECTÉ et qu'il a volontairement navigué vers Home / ShopDetail /
    // Cart / Search / etc. → ON NE FAIT RIEN. Pas de resetRoot vers son dashboard !
  }, [profile, loading, pendingReturnTo, navReady]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <BrandLoader size="lg" fullPage />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={Platform.OS === 'web' ? styles.webContainer : undefined}>
        <NavigationContainer
          ref={navRef as any}
          linking={linking}
          onReady={() => setNavReady(true)}
          fallback={<View style={styles.loading}><BrandLoader size="lg" fullPage /></View>}
        >
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
