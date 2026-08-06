import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Modal, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, typography, spacing, radius } from '@/theme';
import { friendlyMessage } from '@/lib/errorMessages';
import { useAuth } from '@/context/AuthContext';
import { getShopByOwner } from '@/lib/dataService';
import {
  getShareLinks,
  createShareLink,
  deleteShareLink,
  trackShareEvent,
  formatPromoFCFA,
} from '@/lib/promotionService';
import { ShareLinkCard } from '@/components/promotion/ShareLinkCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { openExternalLink } from '@/lib/safeLinking';
import type { Shop, ShareLink, ShareLinkMedium, ShareLinkSource } from '@/types/models';

import { showAlert } from '@/lib/dialog';
interface ShareLinkManagementScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

const MEDIUM_OPTIONS: { value: ShareLinkMedium; label: string; icon: string }[] = [
  { value: 'social', label: 'Réseau social', icon: 'share-2' },
  { value: 'qr', label: 'QR code', icon: 'grid' },
  { value: 'link', label: 'Lien direct', icon: 'link' },
  { value: 'flyer', label: 'Flyer', icon: 'image' },
  { value: 'sms', label: 'SMS', icon: 'message-square' },
];

const SOURCE_BY_MEDIUM: Record<ShareLinkMedium, ShareLinkSource> = {
  social: 'whatsapp',
  qr: 'qr_code',
  link: 'direct',
  flyer: 'other',
  sms: 'direct',
};

export function ShareLinkManagementScreen({
  navigation,
}: ShareLinkManagementScreenProps) {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [campaign, setCampaign] = useState('');
  const [medium, setMedium] = useState<ShareLinkMedium>('social');
  const [saving, setSaving] = useState(false);

  const loadLinks = useCallback(async () => {
    const ownerId = profile?.id ?? 'demo-seller';
    const s = await getShopByOwner(ownerId);
    setShop(s);
    if (s) {
      const l = await getShareLinks(s.id);
      setLinks(l);
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLinks();
  };

  const totals = links.reduce(
    (acc, l) => ({
      views: acc.views + l.views_count,
      clicks: acc.clicks + l.clicks_count,
      conversions: acc.conversions + l.conversions_count,
      revenue: acc.revenue + l.revenue_total,
    }),
    { views: 0, clicks: 0, conversions: 0, revenue: 0 },
  );

  const handleCopy = async (link: ShareLink) => {
    await Clipboard.setStringAsync(link.target_url);
    showAlert('Copié ✓', 'Le lien a été copié dans le presse-papier.');
  };

  const handleShare = async (link: ShareLink) => {
    // Ouvre WhatsApp avec le texte pré-rempli (suivi de clic côté service)
    const text = encodeURIComponent(
      `Découvrez ma boutique sur Boutikplus ! ${link.target_url}`,
    );
    const url = `https://wa.me/?text=${text}`;
    const ok = await openExternalLink(url);
    if (ok) {
      await trackShareEvent({
        shopId: link.shop_id,
        shareLinkId: link.id,
        eventType: 'click',
        source: link.source,
        medium: link.medium,
      });
    } else {
      // Fallback : copie le lien
      await Clipboard.setStringAsync(link.target_url);
      showAlert(
        'WhatsApp indisponible',
        'Le lien a été copié. Partagez-le manuellement.',
      );
    }
  };

  const handleCreate = async () => {
    if (!shop) return;
    setSaving(true);
    const { link, error } = await createShareLink({
      shopId: shop.id,
      ownerId: profile?.id ?? 'demo-seller',
      label: label.trim() || null,
      source: SOURCE_BY_MEDIUM[medium],
      medium,
      campaign: campaign.trim() || null,
      shopName: shop.name,
    });
    setSaving(false);
    if (error) {
      showAlert('Erreur', friendlyMessage(error));
      return;
    }
    setShowForm(false);
    setLabel('');
    setCampaign('');
    setMedium('social');
    await loadLinks();
    if (link) {
      showAlert(
        'Lien créé ✓',
        'Votre lien de partage est prêt. Voulez-vous le partager maintenant ?',
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Partager',
            onPress: () =>
              navigation.navigate('ShareableShop', {
                shopId: shop.id,
                shopName: shop.name,
                shopLogo: shop.logo_url ?? undefined,
              }),
          },
        ],
      );
    }
  };

  const handleDelete = (link: ShareLink) => {
    showAlert(
      'Supprimer le lien',
      `Voulez-vous vraiment supprimer « ${link.label ?? link.slug} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteShareLink(link.id);
            await loadLinks();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Liens partagés</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Feather name="plus" size={22} color={colors.textInverse} />
        </Pressable>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : links.length === 0 ? (
        <EmptyState
          icon="share-2"
          title="Aucun lien de partage"
          message="Créez votre premier lien traçable pour promouvoir votre boutique sur WhatsApp, Facebook ou via un QR code."
          action={
            <Button
              label="Créer un lien"
              onPress={() => setShowForm(true)}
              style={{ marginTop: spacing.lg }}
            />
          }
        />
      ) : (
        <FlatList
          data={links}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.totalsCard}>
              <Text style={styles.totalsTitle}>
                Total — {links.length} lien{links.length > 1 ? 's' : ''}
              </Text>
              <View style={styles.totalsRow}>
                <TotalItem
                  icon="eye"
                  label="Vues"
                  value={`${totals.views}`}
                  color={colors.info}
                />
                <TotalItem
                  icon="mouse-pointer"
                  label="Clics"
                  value={`${totals.clicks}`}
                  color={colors.primary}
                />
                <TotalItem
                  icon="check-circle"
                  label="Ventes"
                  value={`${totals.conversions}`}
                  color={colors.success}
                />
              </View>
              <View style={styles.totalsFooter}>
                <Text style={styles.totalsFooterLabel}>Revenu total généré</Text>
                <Text style={styles.totalsFooterValue}>
                  {formatPromoFCFA(totals.revenue)}
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <ShareLinkCard
              link={item}
              onCopy={handleCopy}
              onShare={handleShare}
              onPress={() =>
                navigation.navigate('CampaignAnalytics', { linkId: item.id })
              }
            />
          )}
        />
      )}

      {/* Modal de création */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Nouveau lien de partage</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={10}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
              <Input
                label="Libellé (optionnel)"
                value={label}
                onChangeText={setLabel}
                placeholder="Ex: Campagne Ramadan"
                icon="tag"
              />
              <Input
                label="Nom de campagne (optionnel)"
                value={campaign}
                onChangeText={setCampaign}
                placeholder="Ex: Soldes été 2026"
                icon="flag"
              />
              <Text style={styles.label}>Canal de partage</Text>
              <View style={styles.mediumGrid}>
                {MEDIUM_OPTIONS.map((opt) => {
                  const selected = medium === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.mediumChip,
                        selected && styles.mediumChipActive,
                      ]}
                      onPress={() => setMedium(opt.value)}
                    >
                      <Feather
                        name={opt.icon as any}
                        size={16}
                        color={selected ? colors.textInverse : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.mediumChipText,
                          selected && styles.mediumChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.infoBox}>
                <Feather name="info" size={16} color={colors.info} />
                <Text style={styles.infoText}>
                  Un slug unique et durable sera généré automatiquement. Les
                  paramètres de suivi (UTM) sont ajoutés pour mesurer les vues,
                  clics et ventes.
                </Text>
              </View>
              <Button
                label="Créer le lien"
                onPress={handleCreate}
                loading={saving}
                style={{ marginTop: spacing.lg, marginBottom: spacing.xxl }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TotalItem({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.totalItem}>
      <View style={[styles.totalIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon as any} size={14} color={color} />
      </View>
      <Text style={styles.totalValue}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxxl },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  totalsTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  totalItem: {
    alignItems: 'center',
    gap: 4,
  },
  totalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  totalLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  totalsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  totalsFooterLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  totalsFooterValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  mediumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mediumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediumChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mediumChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
  },
  mediumChipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.info + '10',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  infoText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
