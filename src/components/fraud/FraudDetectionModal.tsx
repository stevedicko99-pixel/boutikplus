import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { detectPaymentFraude, type FraudDetectionResult } from '@/lib/aiService';

interface FraudDetectionModalProps {
  visible: boolean;
  imageUrl: string | null;
  expectedAmount: number;
  onClose: () => void;
  onValidate: () => void;
  onReject: () => void;
}

export function FraudDetectionModal({
  visible,
  imageUrl,
  expectedAmount,
  onClose,
  onValidate,
  onReject,
}: FraudDetectionModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FraudDetectionResult | null>(null);

  const analyze = async () => {
    if (!imageUrl) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await detectPaymentFraude(imageUrl, expectedAmount);
      setResult(res);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'analyser l\'image');
    }
    setAnalyzing(false);
  };

  const reset = () => {
    setResult(null);
    setAnalyzing(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={reset}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Feather name="shield" size={22} color={colors.secondary} />
            <Text style={styles.modalTitle}>Analyse IA de la preuve</Text>
          </View>

          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.proofImage} contentFit="contain" />
          ) : (
            <View style={styles.noImage}>
              <Feather name="alert-triangle" size={40} color={colors.textMuted} />
              <Text style={styles.noImageText}>Aucune image</Text>
            </View>
          )}

          {!result && !analyzing ? (
            <Button
              label="Analyser la preuve avec l'IA"
              onPress={analyze}
              disabled={!imageUrl}
              variant="outline"
              style={{ marginVertical: spacing.md }}
            />
          ) : null}

          {analyzing ? (
            <View style={styles.analyzing}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.analyzingText}>Analyse en cours...</Text>
              <Text style={styles.analyzingSubtext}>Vérification de l'authenticité de la preuve</Text>
            </View>
          ) : null}

          {result ? (
            <View style={styles.resultContainer}>
              <View
                style={[
                  styles.resultBadge,
                  {
                    backgroundColor: result.isSuspicious ? colors.warning + '20' : colors.success + '20',
                  },
                ]}
              >
                <Feather
                  name={result.isSuspicious ? 'alert-triangle' : 'shield'}
                  size={20}
                  color={result.isSuspicious ? colors.warning : colors.success}
                />
                <Text
                  style={[
                    styles.resultTitle,
                    { color: result.isSuspicious ? colors.warning : colors.success },
                  ]}
                >
                  {result.isSuspicious ? 'Preuve suspecte' : 'Preuve authentique'}
                </Text>
              </View>

              {result.warnings.length > 0 ? (
                <View style={styles.warningsList}>
                  <Text style={styles.warningsTitle}>⚠️ Alertes détectées :</Text>
                  {result.warnings.map((w, i) => (
                    <View key={i} style={styles.warningItem}>
                      <View style={styles.warningDot} />
                      <Text style={styles.warningText}>{w}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.suggestionsList}>
                <Text style={styles.suggestionsTitle}>💡 Suggestions :</Text>
                {result.suggestions.map((s, i) => (
                  <Text key={i} style={styles.suggestionItem}>• {s}</Text>
                ))}
              </View>

              <View style={styles.actionRow}>
                <Button
                  label="Refuser"
                  variant="outline"
                  onPress={() => {
                    reset();
                    onReject();
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  label={result.isSuspicious ? 'Valider quand même' : 'Valider'}
                  onPress={() => {
                    reset();
                    onValidate();
                  }}
                  style={{ flex: 1.5, marginLeft: spacing.sm }}
                />
              </View>
            </View>
          ) : null}

          {!analyzing && !result ? (
            <Button label="Fermer" variant="ghost" onPress={reset} style={{ marginTop: spacing.sm }} />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  proofImage: {
    width: '100%',
    height: 250,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  noImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  noImageText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  analyzing: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  analyzingText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  analyzingSubtext: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  resultContainer: {
    marginTop: spacing.md,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  resultTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  warningsList: {
    backgroundColor: colors.warning + '10',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  warningsTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  warningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    lineHeight: 20,
  },
  suggestionsList: {
    backgroundColor: colors.success + '10',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  suggestionsTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  suggestionItem: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
