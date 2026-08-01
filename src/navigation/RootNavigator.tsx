import { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { AppNavigator, AppStackParamList } from './AppNavigator';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme';

export function RootNavigator() {
  const { profile, loading } = useAuth();
  const navRef = useRef<NavigationContainerRef<AppStackParamList>>(null);

  // Réinitialise la navigation selon l'état d'authentification
  useEffect(() => {
    if (loading || !navRef.current) return;
    const currentRoute = navRef.current.getCurrentRoute()?.name;
    const isAuthenticated = Boolean(profile);

    // Routes accessibles SANS connexion (aide, tutoriels) — l'utilisateur
    // peut consulter l'aide même avant d'être connecté.
    const PUBLIC_ROUTES = ['Login', 'Register', 'HelpCenter', 'HelpTutorial'];

    if (isAuthenticated && (currentRoute === 'Login' || currentRoute === 'Register' || !currentRoute)) {
      navRef.current.resetRoot({ index: 0, routes: [{ name: 'Home' }] });
    } else if (!isAuthenticated && currentRoute && !PUBLIC_ROUTES.includes(currentRoute)) {
      navRef.current.resetRoot({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [profile, loading]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <LoadingSpinner size={32} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef as any}>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
});
