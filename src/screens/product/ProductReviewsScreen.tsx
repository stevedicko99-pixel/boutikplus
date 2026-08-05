import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import { formatRelativeDate } from '@/lib/format';
import {
  getProductReviewStats,
  getProductReviews,
  toggleReviewLike,
  type ProductReview,
} from '@/lib/productReviews';

interface ProductReviewsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: { params: { productId: string } };
}

interface ReviewStats {
  total_reviews: number;
  avg_rating: number;
  stars_1: number;
  stars_2: number;
  stars_3: number;
  stars_4: number;
  stars_5: number;
}

export function ProductReviewsScreen({ navigation, route }: ProductReviewsScreenProps) {
  const { productId } = route.params;
  const { profile } = useAuth();

  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsResult, reviewsResult] = await Promise.all([
        getProductReviewStats(productId),
        getProductReviews(productId, profile?.id ?? null),
      ]);
      setStats(statsResult);
      setReviews(reviewsResult);
    } catch (e) {
      console.error('loadData reviews error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productId, profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleLike = async (reviewId: string, index: number) => {
    if (!profile) {
      Alert.alert('Connexion requise', 'Connecte-toi pour aimer un avis');
      return;
    }
    const result = await toggleReviewLike(reviewId);
    if (!result) return;

    setReviews((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const delta = result.liked ? 1 : -1;
        return {
          ...r,
          liked: result.liked,
          likes_count: Math.max(0, Number(r.likes_count ?? 0) + delta),
        };
      }),
    );
  };

  const handleWriteReview = () => {
    if (!profile) {
      Alert.alert('Connexion requise', 'Connecte-toi pour rédiger un avis');
      return;
    }
    navigation.navigate('WriteProductReview', { productId });
  };

  const renderStars = (value: number, size = 14) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <MaterialCommunityIcons
          key={s}
          name={s <= Math.round(value) ? 'star' : 'star-outline'}
          size={size}
          color={s <= Math.round(value) ? colors.warning : colors.border}
        />
      ))}
    </View>
  );

  const renderStarBar = (stars: number, count: number, total: number) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
      <View key={stars} style={styles.starBarRow}>
        <Text style={styles.starBarLabel}>{stars}</Text>
        <MaterialCommunityIcons name="star" size={12} color={colors.warning} />
        <View style={styles.starBarTrack}>
          <View style={[styles.starBarFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.starBarCount}>{count}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Avis clients</Text>
          <StampBadge label="Avis" color={colors.primaryDeep} size="sm" />
        </View>
        <Pressable onPress={handleRefresh} hitSlop={10}>
          <Feather
            name="refresh-cw"
            size={20}
            color={refreshing ? colors.textMuted : colors.text}
          />
        </Pressable>
      </View>
      {/* Fil de Faso — couture signature */}
      <ThreadDivider color={colors.stitch} style={styles.titleThread} />

      {reviews.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            icon="message-square"
            title="Ce produit n'a pas encore d'avis"
            message="Sois le premier à donner ton avis !"
            action={
              <Button
                label="✍️ Rédiger un avis"
                variant="primary"
                onPress={handleWriteReview}
                style={{ marginTop: spacing.lg }}
              />
            }
          />
        </View>
      ) : (
        <>
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Card style={styles.statsCard}>
                <View style={styles.statsHeader}>
                  <View style={styles.avgWrap}>
                    <Text style={styles.avgNumber}>{stats?.avg_rating?.toFixed?.(1) ?? '0.0'}</Text>
                    <Text style={styles.avgDenom}>/5</Text>
                  </View>
                  <View>
                    {renderStars(stats?.avg_rating ?? 0, 18)}
                    <Text style={styles.totalText}>
                      {stats?.total_reviews ?? 0} avis
                    </Text>
                  </View>
                </View>
                <View style={styles.starsDistribution}>
                  {renderStarBar(5, stats?.stars_5 ?? 0, stats?.total_reviews ?? 0)}
                  {renderStarBar(4, stats?.stars_4 ?? 0, stats?.total_reviews ?? 0)}
                  {renderStarBar(3, stats?.stars_3 ?? 0, stats?.total_reviews ?? 0)}
                  {renderStarBar(2, stats?.stars_2 ?? 0, stats?.total_reviews ?? 0)}
                  {renderStarBar(1, stats?.stars_1 ?? 0, stats?.total_reviews ?? 0)}
                </View>
              </Card>
            }
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            renderItem={({ item, index }) => (
              <Card style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAuthor}>
                    {item.is_anonymous ? (
                      <View style={[styles.avatar, styles.anonAvatar]}>
                        <Feather name="user-x" size={18} color={colors.textMuted} />
                      </View>
                    ) : item.user?.avatar_url ? (
                      <Image
                        source={{ uri: item.user.avatar_url }}
                        style={styles.avatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(item.user?.full_name ?? 'A')[0]?.toUpperCase?.()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.authorRow}>
                        <Text style={styles.authorName} numberOfLines={1}>
                          {item.is_anonymous ? 'Anonyme' : item.user?.full_name ?? 'Utilisateur'}
                        </Text>
                        {!item.is_anonymous && item.user?.is_verified ? (
                          <Badge
                            label="Vérifié"
                            color={colors.success}
                            bgColor={colors.success + '18'}
                            size="sm"
                          />
                        ) : null}
                      </View>
                      <View style={styles.metaRow}>
                        {renderStars(item.rating, 12)}
                        <Text style={styles.dateText}>
                          {formatRelativeDate(item.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {item.comment ? (
                  <Text style={styles.commentText}>{item.comment}</Text>
                ) : null}

                {item.review_images && item.review_images.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imageCarousel}
                    contentContainerStyle={{ gap: spacing.sm }}
                  >
                    {item.review_images.map((img) => (
                      <Image
                        key={img.id}
                        source={{ uri: img.image_url }}
                        style={styles.reviewImage}
                        contentFit="cover"
                      />
                    ))}
                  </ScrollView>
                ) : null}

                <View style={styles.reviewActions}>
                  <Pressable
                    style={({ pressed }) => [styles.likeBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => handleToggleLike(item.id, index)}
                  >
                    <MaterialCommunityIcons
                      name={item.liked ? 'thumb-up' : 'thumb-up-outline'}
                      size={16}
                      color={item.liked ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.likeCount,
                        item.liked && { color: colors.primary },
                      ]}
                    >
                      {item.likes_count ?? 0}
                    </Text>
                  </Pressable>
                </View>

                {item.seller_reply ? (
                  <View style={styles.sellerReplyWrap}>
                    <View style={styles.replyLabelRow}>
                      <Feather name="briefcase" size={12} color={colors.secondary} />
                      <Text style={styles.replyLabel}>Réponse du vendeur</Text>
                    </View>
                    <Text style={styles.replyText}>{item.seller_reply}</Text>
                  </View>
                ) : null}
              </Card>
            )}
            ListFooterComponent={<View style={{ height: spacing.huge }} />}
          />

          <View style={styles.fabWrap}>
            <Button
              label="✍️ Rédiger un avis"
              variant="primary"
              size="md"
              onPress={handleWriteReview}
              fullWidth
            />
          </View>
        </>
      )}
    </SafeAreaView>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleThread: { alignSelf: 'center', marginBottom: spacing.sm },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  statsCard: {
    marginBottom: spacing.lg,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  avgWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avgNumber: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  avgDenom: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    color: colors.textMuted,
    marginBottom: 4,
  },
  totalText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  starsDistribution: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  starBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  starBarLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    width: 12,
  },
  starBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  starBarFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: radius.pill,
  },
  starBarCount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    minWidth: 20,
    textAlign: 'right',
  },
  reviewCard: {},
  reviewHeader: { marginBottom: spacing.sm },
  reviewAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonAvatar: {
    backgroundColor: colors.surfaceAlt,
  },
  avatarText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  authorName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    maxWidth: 160,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  dateText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  commentText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.text,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  imageCarousel: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  likeCount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },
  sellerReplyWrap: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.secondary + '10',
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  replyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  replyLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.secondary,
  },
  replyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    lineHeight: 20,
  },
  fabWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
  },
});
