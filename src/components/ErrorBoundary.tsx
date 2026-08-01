// ErrorBoundary — filet de sécurité global.
// Attrape toute erreur de rendu non gérée et affiche un écran clair à
// l'utilisateur au lieu d'un écran blanc/crash. En production, l'erreur
// est loggée (logger.error) pour diagnostic ultérieur.

import React, { Component, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? 'Erreur inconnue' };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logger.error('ErrorBoundary a attrapé une erreur', error, {
      componentStack: info.componentStack,
    });
  }

  handleReload = () => {
    // Recharge l'écran courant (sans recharger toute l'app sur native).
    // Sur web, un reload complet est plus fiable.
    this.setState({ hasError: false, errorMessage: '' });
  };

  handleHardReload = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.iconWrap}>
            <Feather name="alert-octagon" size={48} color={colors.danger} />
          </View>
          <Text style={styles.title}>Oups, un problème est survenu</Text>
          <Text style={styles.message}>
            L'application a rencontré un problème inattendu. Ce n'est pas de
            votre faute — vos données sont en sécurité.
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={this.handleReload}>
              <Feather name="refresh-cw" size={16} color={colors.textInverse} />
              <Text style={styles.primaryText}>Réessayer</Text>
            </Pressable>
            {typeof window !== 'undefined' && window.location && (
              <Pressable style={styles.secondaryBtn} onPress={this.handleHardReload}>
                <Feather name="rotate-cw" size={16} color={colors.primary} />
                <Text style={styles.secondaryText}>Recharger l'app</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.hint}>
            Si le problème persiste, fermez complètement l'application et
            rouvrez-la. Vous pouvez aussi contacter le support sur WhatsApp.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  primaryText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  secondaryText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  hint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
