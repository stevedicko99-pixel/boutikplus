import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { getReports } from '@/lib/dataService';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatRelativeDate } from '@/lib/format';

import { showAlert } from '@/lib/dialog';
interface ReportsScreenProps {
  navigation: { goBack: () => void };
}

export function ReportsScreen({ navigation }: ReportsScreenProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getReports();
    setReports(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = (report: any, action: 'resolve' | 'dismiss') => {
    showAlert(action === 'resolve' ? 'Résoudre' : 'Ignorer', action === 'resolve' ? 'Marquer ce signalement comme résolu ?' : 'Ignorer ce signalement ?', [
      { text: 'Annuler' },
      { text: 'Confirmer', onPress: () => {
        setReports((prev) => prev.filter((r) => r.id !== report.id));
        showAlert('Terminé', action === 'resolve' ? 'Signalement résolu' : 'Signalement ignoré');
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.title}>Signalements</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <LoadingSpinner />
      ) : reports.length === 0 ? (
        <EmptyState icon="check-circle" title="Aucun signalement" message="La plateforme ne comporte aucun signalement actif" />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: report }) => (
            <Card style={styles.reportCard}>
              <View style={styles.reportHead}>
                <View style={[styles.reportIcon, { backgroundColor: report.target_type === 'product' ? '#FFF0E0' : '#F3E8F9' }]}>
                  <Feather name={report.target_type === 'product' ? 'package' : 'briefcase'} size={18} color={report.target_type === 'product' ? colors.primary : colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportType}>{report.target_type === 'product' ? 'Produit' : 'Boutique'} signalé</Text>
                  <Text style={styles.reportId}>ID: {report.target_id}</Text>
                </View>
                <Badge label="En attente" color={colors.warning} bgColor="#FFF8E1" />
              </View>
              <Text style={styles.reportReason}>{report.reason}</Text>
              <Text style={styles.reportDate}>Reçu {formatRelativeDate(report.created_at)}</Text>
              <View style={styles.actionRow}>
                <Pressable style={[styles.actionBtn, styles.dismissBtn]} onPress={() => handleAction(report, 'dismiss')}>
                  <Feather name="x" size={16} color={colors.textMuted} />
                  <Text style={[styles.actionText, { color: colors.textMuted }]}>Ignorer</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, styles.resolveBtn]} onPress={() => handleAction(report, 'resolve')}>
                  <Feather name="check" size={16} color={colors.textInverse} />
                  <Text style={[styles.actionText, { color: colors.textInverse }]}>Résoudre</Text>
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  list: { padding: spacing.lg, paddingTop: 0 },
  reportCard: { marginBottom: spacing.md },
  reportHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  reportIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportType: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  reportId: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  reportReason: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.text, lineHeight: 22, marginBottom: spacing.xs },
  reportDate: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md },
  dismissBtn: { backgroundColor: colors.surfaceAlt },
  resolveBtn: { backgroundColor: colors.success },
  actionText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
});
