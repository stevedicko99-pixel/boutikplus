import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type NotificationTypeKey,
} from '@/lib/notifications';
import type { AppNotification } from '@/types/models';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  unreadMessages: number;
  unreadOrders: number;
  totalUnread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  setUnreadMessages: (n: number) => void;
  setUnreadOrders: (n: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const ORDER_NOTIFICATION_TYPES = new Set([
  'new_order',
  'proof_uploaded',
  'payment_validated',
  'stock_low',
  'new_review',
  'delivery_requested',
  'delivery_accepted',
  'delivery_status',
  'delivery_payment_uploaded',
  'delivery_payment_validated',
  'delivery_cancelled',
]);

function isUnreadMessage(notification: AppNotification | null) {
  return !!notification && !notification.read && notification.type === 'new_message';
}

function isUnreadOrder(notification: AppNotification | null) {
  return !!notification && !notification.read && ORDER_NOTIFICATION_TYPES.has(notification.type);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadOrders, setUnreadOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const notificationsRef = useRef<AppNotification[]>([]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const refresh = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [notifs, count] = await Promise.all([
      getUserNotifications(profile.id),
      getUnreadCount(profile.id),
    ]);
    notificationsRef.current = notifs;
    setNotifications(notifs);
    setUnreadCount(count);
    setUnreadMessages(notifs.filter(isUnreadMessage).length);
    setUnreadOrders(notifs.filter(isUnreadOrder).length);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profile?.id || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          const incoming = eventType === 'DELETE' ? null : payload.new as AppNotification;
          const payloadOld = eventType === 'INSERT' ? null : payload.old as Partial<AppNotification>;
          const id = incoming?.id ?? payloadOld?.id;
          if (!id) return;

          const current = notificationsRef.current;
          const existing = current.find((notification) => notification.id === id) ?? null;
          const previous = existing ?? (payloadOld as AppNotification | null);
          const unreadDelta = Number(isUnreadMessage(incoming)) - Number(isUnreadMessage(previous));
          const orderDelta = Number(isUnreadOrder(incoming)) - Number(isUnreadOrder(previous));
          const totalDelta = Number(!!incoming && !incoming.read) - Number(!!previous && !previous.read);

          const next = (incoming
            ? [incoming, ...current.filter((notification) => notification.id !== id)]
            : current.filter((notification) => notification.id !== id)
          )
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 50);
          notificationsRef.current = next;
          setNotifications(next);
          if (totalDelta) setUnreadCount((count) => Math.max(0, count + totalDelta));
          if (unreadDelta) setUnreadMessages((count) => Math.max(0, count + unreadDelta));
          if (orderDelta) setUnreadOrders((count) => Math.max(0, count + orderDelta));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const markNotificationRead = useCallback(
    async (id: string) => {
      const notification = notificationsRef.current.find((item) => item.id === id);
      if (notification && !notification.read) {
        const next = notificationsRef.current.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        );
        notificationsRef.current = next;
        setNotifications(next);
        setUnreadCount((count) => Math.max(0, count - 1));
        if (isUnreadMessage(notification)) setUnreadMessages((count) => Math.max(0, count - 1));
        if (isUnreadOrder(notification)) setUnreadOrders((count) => Math.max(0, count - 1));
      }
      await markAsRead(id);
    },
    [],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!profile?.id) return;
    await markAllAsRead(profile.id);
    const next = notificationsRef.current.map((notification) => ({ ...notification, read: true }));
    notificationsRef.current = next;
    setNotifications(next);
    setUnreadCount(0);
    setUnreadMessages(0);
    setUnreadOrders(0);
  }, [profile?.id]);

  const totalUnread = unreadCount;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadMessages,
        unreadOrders,
        totalUnread,
        loading,
        refresh,
        markNotificationRead,
        markAllRead: handleMarkAllRead,
        setUnreadMessages,
        setUnreadOrders,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export function getNotificationIcon(type: NotificationTypeKey): string {
  const icons: Record<string, string> = {
    new_order: 'shopping-bag',
    proof_uploaded: 'credit-card',
    payment_validated: 'check-circle',
    new_message: 'message-circle',
    stock_low: 'alert-triangle',
    abandoned_cart: 'shopping-cart',
    new_review: 'star',
    price_suggestion: 'trending-up',
    referral_bonus: 'gift',
    delivery_requested: 'package',
    delivery_accepted: 'user-check',
    delivery_status: 'navigation',
    delivery_payment_uploaded: 'credit-card',
    delivery_payment_validated: 'check-circle',
    delivery_cancelled: 'x-circle',
  };
  return icons[type] ?? 'bell';
}

export function getNotificationColor(type: NotificationTypeKey): string {
  const colors: Record<string, string> = {
    new_order: '#FF6B00',
    proof_uploaded: '#0DCAF0',
    payment_validated: '#00A859',
    new_message: '#6B2D8E',
    stock_low: '#FFC107',
    abandoned_cart: '#FF6B00',
    new_review: '#FFC107',
    price_suggestion: '#00A859',
    referral_bonus: '#FF6B00',
    delivery_requested: '#FF6B00',
    delivery_accepted: '#00A859',
    delivery_status: '#0DCAF0',
    delivery_payment_uploaded: '#0DCAF0',
    delivery_payment_validated: '#00A859',
    delivery_cancelled: '#DC3545',
  };
  return colors[type] ?? '#6C757D';
}
