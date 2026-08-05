import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

export default function App() {
  // Configure le handler de notifications push au premier-plan.
  // Sans ça, les notifications ne s'affichent pas tant que l'app est ouverte.
  useEffect(() => {
    setupForegroundNotificationHandler();
  }, []);

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
