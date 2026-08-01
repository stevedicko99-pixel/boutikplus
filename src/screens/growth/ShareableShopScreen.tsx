import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, typography, spacing, radius } from '@/theme';
import { friendlyMessage } from '@/lib/errorMessages';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  getShareLinks,
  createShareLink,
  trackShareEvent,
  formatPromoFCFA,
} from '@/lib/promotionService';
import { QRCodeView } from '@/components/promotion/QRCodeView';
import { openExternalLink } from '@/lib/safeLinking';
import type { ShareLink } from '@/types/models';

interface ShareableShopScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: {
    params: { shopId: string; shopName: string; shopLogo?: string };
  };
}

export function ShareableShopScreen({ navigation, route }: ShareableShopScreenProps) {
  const { profile } = useAuth();
  const { shopId, shopName } = route.params;
  const [activeLink, setActiveLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Récupère ou crée un lien de partage traçable pour cette boutique
  const ensureShareLink = useCallback(async () => {
    // Cherche d'abord un lien existant
    const existing = await getShareLinks(shopId);
    let link: ShareLink | null = existing.find((l) => l.is_active) ?? existing[0] ?? null;

    if (!link) {
      // Crée un lien principal par défaut
      const { link: created, error } = await createShareLink({
        shopId,
        ownerId: profile?.id ?? 'demo-seller',
        label: 'Lien principal',
        source: 'direct',
        medium: 'link',
        shopName,
      });
      if (error) {
        Alert.alert('Erreur', friendlyMessage(error));
        setLoading(false);
        return;
      }
      link = created;
    }

    setActiveLink(link);
    // Enregistre une vue (fire-and-forget)
    if (link) {
      trackShareEvent({
        shopId,
        shareLinkId: link.id,
        eventType: 'view',
        source: link.source,
        medium: link.medium,
      });
    }
    setLoading(false);
  }, [shopId, shopName, profile]);

  useEffect(() => {
    ensureShareLink();
  }, [ensureShareLink]);

  const shareUrl = activeLink?.target_url ?? `https://boutikplus.app/s/shop-${shopId}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = async () => {
    if (!activeLink) return;
    const text = encodeURIComponent(
      `🛍️ Découvrez ${shopName} sur Boutikplus ! Produits de qualité, paiement Mobile Money.\n\n${shareUrl}`,
    );
    const url = `https://wa.me/?text=${text}`;
    await openShareUrl(url, 'WhatsApp', activeLink, 'whatsapp', 'social');
  };

  const handleShareFacebook = async () => {
    if (!activeLink) return;
    // Facebook sharer.php — pas de SDK requis
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl,
    )}&quote=${encodeURIComponent(`Découvrez ${shopName} sur Boutikplus !`)}`;
    await openShareUrl(url, 'Facebook', activeLink, 'facebook', 'social');
  };

  const handleShareInstagram = async () => {
    if (!activeLink) return;
    // Instagram n'a pas de sharer URL direct — on copie le lien et on ouvre l'app
    await Clipboard.setStringAsync(shareUrl);
    const url = Platform.select({
      ios: 'instagram://app',
      android: 'instagram://app',
      default: 'https://www.instagram.com/',
    });
    await openShareUrl(url, 'Instagram', activeLink, 'instagram', 'social');
    Alert.alert(
      'Lien copié',
      "Collez le lien dans votre bio ou story Instagram.",
    );
  };

  const handleShareSMS = async () => {
    if (!activeLink) return;
    const body = encodeURIComponent(
      `Découvrez ${shopName} sur Boutikplus : ${shareUrl}`,
    );
    const url = `sms:?&body=${body}`;
    await openShareUrl(url, 'SMS', activeLink, 'direct', 'sms');
  };

  const handleShareTikTok = async () => {
    if (!activeLink) return;
    // TikTok n'a pas de sharer URL web — on copie le lien et on ouvre l'app
    await Clipboard.setStringAsync(shareUrl);
    const url = Platform.select({
      ios: 'snssdk1233://',
      android: 'snssdk1233://',
      default: 'https://www.tiktok.com/',
    });
    await openShareUrl(url as string, 'TikTok', activeLink, 'tiktok', 'social');
    Alert.alert(
      'Lien copié',
      "Collez le lien dans votre bio TikTok ou la description d'une vidéo.",
    );
  };

  const handleShareSnapchat = async () => {
    if (!activeLink) return;
    // Snapchat n'a pas de sharer URL web — on copie le lien et on ouvre l'app
    await Clipboard.setStringAsync(shareUrl);
    const url = Platform.select({
      ios: 'snapchat://',
      android: 'snapchat://',
      default: 'https://www.snapchat.com/',
    });
    await openShareUrl(url as string, 'Snapchat', activeLink, 'snapchat', 'social');
    Alert.alert(
      'Lien copié',
      'Collez le lien dans votre story ou bio Snapchat.',
    );
  };

  const openShareUrl = async (
    url: string,
    platformName: string,
    link: ShareLink,
    source: ShareLink['source'],
    medium: ShareLink['medium'],
  ) => {
    try {
      const ok = await openExternalLink(url);
      if (ok) {
        // Suit le clic
        await trackShareEvent({
          shopId,
          shareLinkId: link.id,
          eventType: 'click',
          source,
          medium,
        });
      } else {
        await Clipboard.setStringAsync(shareUrl);
        Alert.alert(
          `${platformName} indisponible`,
          'Le lien a été copié. Partagez-le manuellement.',
        );
      }
    } catch {
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert(
        `${platformName} indisponible`,
        'Le lien a été copié. Partagez-le manuellement.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Partager ma boutique</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Aperçu du lien + boutique */}
        <View style={styles.previewCard}>
          <View style={styles.shopHeader}>
            <View style={styles.shopAvatar}>
              <Feather name="briefcase" size={28} color={colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopName}>{shopName}</Text>
              <Text style={styles.shopLabel}>Boutique vérifiée</Text>
            </View>
            {activeLink ? (
              <View style={styles.viewsBadge}>
                <Feather name="eye" size={11} color={colors.primary} />
                <Text style={styles.viewsText}>{activeLink.views_count}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.linkContainer}>
            <Feather name="link" size={16} color={colors.primary} />
            <Text style={styles.linkText} numberOfLines={1}>
              {shareUrl}
            </Text>
          </View>
          <Button
            label={copied ? 'Copié ✓' : 'Copier le lien'}
            variant={copied ? 'secondary' : 'outline'}
            onPress={handleCopy}
            icon={
              <Feather
                name={copied ? 'check' : 'copy'}
                size={16}
                color={copied ? colors.textInverse : colors.primary}
              />
            }
          />
        </View>

        {/* QR code */}
        <View style={styles.qrCard}>
          <Text style={styles.sectionTitle}>QR code de la boutique</Text>
          <Text style={styles.sectionDesc}>
            Imprimez-le ou affichez-le en boutique : vos clients scannent pour
            ouvrir votre catalogue.
          </Text>
          <View style={styles.qrWrap}>
            <QRCodeView value={shareUrl} size={170} label="Scannez pour visiter" />
          </View>
          <Button
            label="Partager le QR code"
            variant="ghost"
            onPress={handleCopy}
            icon={<Feather name="share-2" size={16} color={colors.primary} />}
          />
        </View>

        {/* Options de partage social */}
        <Text style={styles.sectionTitle}>Partager sur</Text>
        <View style={styles.shareGrid}>
          <ShareOption
            icon="message-circle"
            label="WhatsApp"
            color="#25D366"
            bgColor="#E8F5E9"
            onPress={handleShareWhatsApp}
          />
          <ShareOption
            icon="facebook"
            label="Facebook"
            color="#1877F2"
            bgColor="#E3F2FD"
            onPress={handleShareFacebook}
          />
          <ShareOption
            icon="instagram"
            label="Instagram"
            color="#E1306C"
            bgColor="#FCE4EC"
            onPress={handleShareInstagram}
          />
          <ShareOption
            icon="video"
            label="TikTok"
            color="#000000"
            bgColor="#F1F3F5"
            onPress={handleShareTikTok}
          />
          <ShareOption
            icon="camera"
            label="Snapchat"
            color="#FFFC00"
            bgColor="#FFFDE7"
            onPress={handleShareSnapchat}
          />
          <ShareOption
            icon="message-square"
            label="SMS"
            color={colors.secondary}
            bgColor={colors.secondary + '18'}
            onPress={handleShareSMS}
          />
        </View>

        {/* Mini-récap des performances */}
        {activeLink ? (
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Feather name="bar-chart-2" size={16} color={colors.info} />
              <Text style={styles.statsTitle}>Votre lien en chiffres</Text>
            </View>
            <View style={styles.statsRow}>
              <MiniStat
                icon="eye"
                label="Vues"
                value={activeLink.views_count}
                color={colors.info}
              />
              <View style={styles.statDivider} />
              <MiniStat
                icon="mouse-pointer"
                label="Clics"
                value={activeLink.clicks_count}
                color={colors.primary}
              />
              <View style={styles.statDivider} />
              <MiniStat
                icon="check-circle"
                label="Ventes"
                value={activeLink.conversions_count}
                color={colors.success}
              />
            </View>
            {activeLink.revenue_total > 0 ? (
              <View style={styles.revenueRow}>
                <Text style={styles.revenueLabel}>Revenu généré</Text>
                <Text style={styles.revenueValue}>
                  {formatPromoFCFA(activeLink.revenue_total)}
                </Text>
              </View>
            ) : null}
            <Pressable
              style={styles.seeMoreBtn}
              onPress={() =>
                navigation.navigate('CampaignAnalytics', {
                  linkId: activeLink.id,
                })
              }
            >
              <Text style={styles.seeMoreText}>Voir le détail</Text>
              <Feather name="chevron-right" size={14} color={colors.primary} />
            </Pressable>
          </View>
        ) : null}

        {/* Avantages */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>💡 Avantages du lien partageable</Text>
          <View style={styles.benefitRow}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={styles.benefitText}>
              Catalogue consultable sans installation
            </Text>
          </View>
          <View style={styles.benefitRow}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={styles.benefitText}>
              Paiement Mobile Money directement dans le navigateur
            </Text>
          </View>
          <View style={styles.benefitRow}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={styles.benefitText}>
              Suivi des vues, clics et ventes par canal
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShareOption({
  icon,
  label,
  color,
  bgColor,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.shareOption, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      <View style={[styles.shareIcon, { backgroundColor: bgColor }]}>
        <Feather name={icon as any} size={26} color={color} />
      </View>
      <Text style={styles.shareLabel}>{label}</Text>
    </Pressable>
  );
}

function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Feather name={icon as any} size={14} color={color} />
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  shopAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  shopLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.success,
    fontWeight: typography.weights.semibold,
  },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  viewsText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  linkText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.primary,
  },
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  qrWrap: {
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  shareOption: {
    width: '47%',
    aspectRatio: 2.5,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statsTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  miniStatValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  miniStatLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  revenueLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  revenueValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  seeMoreText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  benefitsCard: {
    backgroundColor: colors.success + '10',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  benefitsTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  benefitText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    lineHeight: 20,
  },
});
