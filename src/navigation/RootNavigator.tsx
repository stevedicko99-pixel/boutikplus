import { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { AppNavigator, AppStackParamList } from './AppNavigator';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/ui/SplashScreen';

// Routes consultables sans compte : la vitrine (accueil, recherche, boutiques,
// fiches produit, panier) doit rester ouverte aux visiteurs, la création de
// compte n'intervenant qu'au moment de commander ou de vendre.
const PUBLIC_ROUTES: (keyof AppStackParamList)[] = [
  'Home',
  'Search',
  'ShopDetail',
  'ProductDetail',
  'Cart',
  'Login',
  'Register',
  'HelpCenter',
  'HelpTutorial',
];

export function RootNavigator() {
  const { profile, loading } = useAuth();
  const navRef = useRef<NavigationContainerRef<AppStackParamList>>(null);

  // Protège les écrans privés (commande, messages, vendeur, admin) sans jamais
  // renvoyer un visiteur hors de la vitrine.
  useEffect(() => {
    if (loading || !navRef.current) return;
    const currentRoute = navRef.current.getCurrentRoute()?.name as
      | keyof AppStackParamList
      | undefined;
    const isAuthenticated = Boolean(profile);

    if (isAuthenticated && (currentRoute === 'Login' || currentRoute === 'Register')) {
      navRef.current.resetRoot({ index: 0, routes: [{ name: 'Home' }] });
      return;
    }
    if (!isAuthenticated && currentRoute && !PUBLIC_ROUTES.includes(currentRoute)) {
      navRef.current.resetRoot({ index: 0, routes: [{ name: 'Home' }] });
    }
  }, [profile, loading]);

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer ref={navRef as any}>
      <AppNavigator />
    </NavigationContainer>
  );
}
