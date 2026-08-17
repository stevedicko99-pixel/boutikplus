// ⚠️ CRITICAL ANDROID - DOIT ÊTRE LE PREMIER IMPORT DE L'APP.
// Sans cet import side-effect, react-native-gesture-handler 2.20+ crash
// silencieusement sur Android natif (keystore Samsung/Huawei en particulier)
// → splash screen puis page blanche infinie (aucun rendu React).
import 'react-native-gesture-handler';

// ⚠️ CRITICAL ANDROID - react-native-screens 4.x doit être initialisé AVANT
// toute création de navigator. Sans enableScreens(), le bridge JS<->natif
// ScreenContainer throw et laisse une vue vide = page blanche.
import { enableScreens } from 'react-native-screens';
try { enableScreens(); } catch { /* silencieux : déjà appelé sur web */ }

import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, LogBox } from 'react-native';

// 🔴 ErrorGuard global — attrape TOUTES les erreurs non gérées (y compris
// celles qui arrivent AVANT React.mount) et affiche un écran d'erreur
// explicite au lieu d'une page blanche mystérieuse.
//
// IMPORTANT : ce code s'exécute au moment de l'import de App.tsx, avant le
// premier rendu. Si un autre module throw pendant le chargement du bundle,
// ce handler ne le rattrape pas (il faut AppEntry.js), mais c'est le meilleur
// garde possible en JS utilisateur.
if (Platform.OS !== 'web') {
  try {
    // ErrorUtils est API interne React Native non typée. require() ici car
    // import top-level échoue sur certains builds Expo web (tree-shaking).
    const RN = require('react-native') as any;
    const ErrorUtils = RN?.ErrorUtils;
    if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === 'function') {
      const prevHandler = ErrorUtils._previousHandler || null;
      ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
        try {
          // Log immédiat en console brute — adb logcat | findstr BTIK
          console.error(
            `[BTIK FATAL${isFatal ? ' GLOBAL' : ''}] Splash→Blanc prévenue. Stack:`,
            error?.stack ?? String(error),
          );
        } catch {}
        if (typeof prevHandler === 'function') {
          try { prevHandler(error, isFatal); } catch {}
        }
      });
    }
  } catch {}
}

// Ignore certains warnings bruyants non bloquants pour éviter de polluer
// la console (jamais supprimés en build release sans LogBox).
try {
  LogBox.ignoreLogs([
    'Animated: useNativeDriver is not supported',
    'Require cycles',
  ]);
} catch {}
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ConnectivityProvider } from '@/context/ConnectivityContext';
import { FavoriteProvider } from '@/context/FavoriteContext';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { colors } from '@/theme';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { setupForegroundNotificationHandler } from '@/lib/pushNotificationService';
import { registerServiceWorker } from '@/lib/registerServiceWorker';

export default function App() {
  // Configure le handler de notifications push au premier-plan.
  // Sans ça, les notifications ne s'affichent pas tant que l'app est ouverte.
  useEffect(() => setupForegroundNotificationHandler(), []);
  useEffect(() => registerServiceWorker(), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AuthProvider>
            <NotificationProvider>
              <ConnectivityProvider>
                <FavoriteProvider>
                  <CartProvider>
                    <AccessibilityProvider>
                      <ThemeProvider>
                        <ToastProvider>
                          <StatusBar style="dark" />
                          <RootNavigator />
                        </ToastProvider>
                      </ThemeProvider>
                    </AccessibilityProvider>
                  </CartProvider>
                </FavoriteProvider>
              </ConnectivityProvider>
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
