import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useNotifications, getNotificationIcon, getNotificationColor } from '@/context/NotificationContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeDate } from '@/lib/format';
import type { AppNotification } from '@/types/models';

interface NotificationCenterScreenProps {
  navigation: { goBack: () => void; navigate: (screen: string, params?: any) => void };
}

export function NotificationCenterScreen({ navigation }: NotificationCenterScreenProps) {
  const { notifications, loading, refresh, markNotificationRead, markAllRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handlePress = async (notif: AppNotification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
    }
    // Navigation selon le type
    if (notif.data?.deliveryId) {
      navigation.navigate('DeliveryTracking', { deliveryId: notif.data.deliveryId as string });
    } else if (notif.data?.orderId) {
      navigation.navigate('SellerOrders');
    }
  };

  if (loading && notifications.length === 0) {
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
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={markAllRead}>
          <Text style={styles.markAll}>Tout lire</Text>
        </Pressable>
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          icon="bell-off"
          title="Aucune notification"
          message="Vous serez averti des nouveautés importantes ici"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.notifItem, !item.read && styles.notifUnread]}
              onPress={() => handlePress(item)}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: getNotificationColor(item.type as any) + '20' },
                ]}
              >
                <Feather
                  name={getNotificationIcon(item.type as any) as any}
                  size={20}
                  color={getNotificationColor(item.type as any)}
                />
              </View>
              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text style={styles.notifTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.read ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.notifTime}>
                  {formatRelativeDate(item.created_at)}
                </Text>
              </View>
            </Pressable>
          )}
        />
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
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  markAll: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  notifItem: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  notifUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: '#FFFBF5',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  notifBody: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 20,
  },
  notifTime: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
