// ⚠️ DEBUG FIRST — DOIT ÊTRE L'IMPORT ABSOLU #1.
// Envoie un beacon HTTP SYNCHRONE (XMLHttpRequest) avant TOUT autre module.
// Si le server reçoit B0 → le bundle a démarré l'évaluation (H2 partiellement
// falsifié : le bundle n'a pas crash au chargement Metro).
// #region debug-point A:startup
import { __dbg } from '@/lib/debug-bootstrap';
// #endregion
__dbg('A', 'App.tsx:6', 'B0.2: App.tsx import hoisting complete');

import React from 'react';
// ⚠️ CRITICAL ANDROID - #3 IMPORT.
// Sans cet import side-effect, react-native-gesture-handler 2.20+ crash
// silencieusement sur Android natif.
import 'react-native-gesture-handler';
// #region debug-point A:gesture-handler-post
try { __dbg('A', 'App.tsx:16', 'B1: react-native-gesture-handler imported OK'); } catch {}
// #endregion

// ⚠️ CRITICAL ANDROID - react-native-screens 4.x doit être initialisé AVANT
// toute création de navigator. Sans enableScreens(), le bridge JS<->natif
// ScreenContainer throw et laisse une vue vide = page blanche.
import { enableScreens } from 'react-native-screens';
try {
  enableScreens();
  // #region debug-point A:enable-screens-ok
  __dbg('A', 'App.tsx:22', 'B2: enableScreens called OK');
  // #endregion
} catch (e: any) {
  // #region debug-point A:enable-screens-err
  __dbg('A', 'App.tsx:26', 'B2-err: enableScreens throw', { err: e?.message });
  // #endregion
}

import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, LogBox } from 'react-native';
// #region debug-point A:rn-imports-ok
__dbg('A', 'App.tsx:36', 'B3: basic RN imports OK (StatusBar, SafeArea, Platform, LogBox)');
// #endregion

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
// #region debug-point D:auth-imported
__dbg('D', 'App.tsx:78', 'B4.1: AuthProvider (supabase + secureStore) imported OK');
// #endregion
import { CartProvider } from '@/context/CartContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ConnectivityProvider } from '@/context/ConnectivityContext';
import { FavoriteProvider } from '@/context/FavoriteContext';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
// #region debug-point B:providers-imported
__dbg('B', 'App.tsx:90', 'B4.2: tous Providers (hors navigator) importés OK');
// #endregion
import { RootNavigator } from '@/navigation/RootNavigator';
// #region debug-point C:navigator-imported
__dbg('C', 'App.tsx:95', 'B4.3: RootNavigator importé OK (tous écrans + Chat + mediaUpload)');
// #endregion
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { colors } from '@/theme';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { setupForegroundNotificationHandler } from '@/lib/pushNotificationService';
import { registerServiceWorker } from '@/lib/registerServiceWorker';
// #region debug-point B:all-imports-done
__dbg('B', 'App.tsx:107', 'B4.4: TOUS les App.tsx imports ont été évalués');
// #endregion

export default function App() {
  // #region debug-point B:app-function-called
  try { __dbg('B', 'App.tsx:110', 'B5: fonction App() appelée (premier render React)'); } catch {}
  // #endregion

  // ⚠️ MODE HELLO WORLD DE DIAGNOSTIC
  // Retourne un composant minimal avant TOUT provider / navigator.
  // Si on voit "BTIK OK" à l'écran :
  //   → Tous les imports (gesture-handler, screens, RN, providers, navigator)
  //     ont été ÉVALUÉS SANS THROW. Le crash est dans Providers/render ENFANT.
  // Si on voit toujours PAGE BLANCHE :
  //   → Crash est PENDANT l'évaluation DES IMPORTS (hoistés), donc avant App().
  //     Cause probable: require d'un module natif (expo-av, expo-secure-store,
  //     expo-file-system, react-native-reanimated) pendant l'évaluation.
  try {
    // eslint-disable-next-line no-undef
    const RN = require('react-native') as typeof import('react-native');
    const { View, Text, StyleSheet, SafeAreaView } = RN;
    // Utilise un require() dynamique pour ne pas dépendre d'imports ES6 hoistés
    // — ce try{}catch{} à l'intérieur de App() attrape les erreurs DE RENDU.
    // #region debug-point B:hw-render
    try { __dbg?.('B', 'App.tsx:133', 'B5.1: HELLO WORLD render commence (View/Text créés via require)'); } catch {}
    // #endregion
    return (
      React.createElement(SafeAreaView, { style: { flex: 1, backgroundColor: '#FF6B00' } },
        React.createElement(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 } },
          React.createElement(Text, { style: { color: '#fff', fontSize: 40, fontWeight: '900' } }, 'BTIK ✅ OK'),
          React.createElement(Text, { style: { color: 'rgba(255,255,255,0.85)', fontSize: 18, textAlign: 'center' } }, 'Si tu lis ce message,\nTous les imports ont été chargés.\nLe crash est dans Providers/Navigator.'),
          React.createElement(Text, { style: { color: '#FFE9C9', fontSize: 14, marginTop: 24 } }, 'v1.3.4-HELLO · App() reached · B5'),
        )
      )
    );
  } catch (hwErr: any) {
    try { __dbg?.('B', 'App.tsx:149', 'B5-HW-ERR: HelloWorld render throw', { err: String(hwErr?.message || hwErr) }); } catch {}
  }

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
