import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import {
  AISuiteMeta,
  AISuiteTaglines,
} from '@/lib/aiSuite';
import { getShopByOwner, getProductsByShop, getSellerOrders } from '@/lib/dataService';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import type { Shop, ProductWithImages, Order, OrderItem, Payment } from '@/types/models';

interface AIGlobalDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

type ModuleKey = keyof typeof AISuiteMeta;

const MODULE_ROUTES: Record<ModuleKey, string> = {
  MagicListingAI: 'AIProductAssistant',
  SmartContentAI: 'SmartContent',
  LightningPushAI: 'AILightningPush',
};

const FALLBACK_ROUTES: Partial<Record<ModuleKey, string>> = {
  SmartContentAI: 'AIProductAssistant',
};

export function AIGlobalDashboardScreen({ navigation }: AIGlobalDashboardScreenProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [orders, setOrders] = useState<(Order & { items: OrderItem[]; payment?: Payment })[]>([]);
  const loadShop = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const s = await getShopByOwner(profile.id);
      setShop(s);
      if (s) {
        const [prods, ords] = await Promise.all([
          getProductsByShop(s.id),
          getSellerOrders(profile.id),
        ]);
        setProducts(prods);
        setOrders(ords as any);
      }
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      loadShop();
    }, [loadShop]),
  );

  const handleModulePress = (key: ModuleKey) => {
    const route = MODULE_ROUTES[key];
    const fallback = FALLBACK_ROUTES[key];
    navigation.navigate(route);
    if (fallback && route !== fallback) {
      setTimeout(() => {
        try {
          navigation.goBack();
          navigation.navigate(fallback);
        } catch {}
      }, 0);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <PageLoader />
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          icon="briefcase"
          title="Aucune boutique"
          message="Créez votre boutique pour accéder aux 3 modules IA premium."
          action={
            <Pressable
              style={styles.createBtn}
              onPress={() => navigation.navigate('CreateShop')}
            >
              <Feather name="plus" size={18} color={colors.textInverse} />
              <Text style={styles.createBtnText}>Créer ma boutique</Text>
            </Pressable>
          }
        />
      </SafeAreaView>
    );
  }

  const moduleKeys = Object.keys(AISuiteMeta) as ModuleKey[];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>AI Suite Premium</Text>
            <StampBadge label="Hub IA" color={colors.primaryDeep} size="sm" />
          </View>
          <Text style={styles.headerSubtitle}>3 assistants pour booster ta boutique</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>
      {/* Fil de Faso — couture signature */}
      <ThreadDivider color={colors.stitch} style={styles.titleThread} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#FF8A5C', '#FFB089', '#FFF8F2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIconRow}>
            <View style={styles.heroBadge}>
              <Feather name="cpu" size={28} color={colors.primaryDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{shop.name}</Text>
              <Text style={styles.heroCity}>{shop.city} · {products.length} produits · {orders.length} commandes</Text>
            </View>
          </View>
          <View style={styles.heroSparkBadge}>
            <Text style={styles.heroSparkText}>Premium</Text>
          </View>
        </LinearGradient>

        {moduleKeys.map((key) => {
          const meta = AISuiteMeta[key];
          const accent = meta.color;
          return (
            <Pressable
              key={key}
              style={[styles.moduleCard, { borderLeftColor: accent, borderLeftWidth: 4 }]}
              onPress={() => handleModulePress(key)}
              android_ripple={{ color: accent + '12', borderless: false }}
            >
              <View style={styles.moduleHead}>
                <View style={[styles.moduleIcon, { backgroundColor: accent + '18' }]}>
                  <Feather name={meta.icon} size={26} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moduleName}>{meta.name}</Text>
                  <Text style={styles.moduleSubtitle}>{AISuiteTaglines[key]}</Text>
                </View>
                <View style={[styles.ratioBadge, { backgroundColor: accent }]}>
                  <Text style={styles.ratioText}>{meta.short}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textMuted} />
              </View>
            </Pressable>
          );
        })}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleThread: { alignSelf: 'center', marginBottom: spacing.sm },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.extrabold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.primaryDeep,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacings.wide,
    marginTop: 2,
  },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.massive },
  heroCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: 28,
    ...shadows.hero,
  },
  heroIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.32)',
    borderWidth: 1.5,
    borderColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extrabold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
  },
  heroCity: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
    marginTop: 2,
  },
  heroSparkBadge: {
    backgroundColor: colors.primaryDeep,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    transform: [{ rotate: '-1.5deg' }],
    ...shadows.stamped,
  },
  heroSparkText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extrabold,
    color: colors.textInverse,
    letterSpacing: typography.letterSpacings.ultra,
    textTransform: 'uppercase',
  },
  moduleCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: 22,
    ...shadows.fani,
  },
  moduleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  moduleSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  ratioBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  ratioText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  createBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
});
