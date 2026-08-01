import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadOrders, setUnreadOrders] = useState(0);
  const [loading, setLoading] = useState(true);

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
    setNotifications(notifs);
    setUnreadCount(count);
    setUnreadMessages(notifs.filter((n) => n.type === 'new_message' && !n.read).length);
    setUnreadOrders(
      notifs.filter(
        (n) =>
          (n.type === 'new_order' ||
            n.type === 'proof_uploaded' ||
            n.type === 'payment_validated' ||
            n.type === 'stock_low' ||
            n.type === 'new_review' ||
            n.type === 'delivery_requested' ||
            n.type === 'delivery_accepted' ||
            n.type === 'delivery_status' ||
            n.type === 'delivery_payment_uploaded' ||
            n.type === 'delivery_payment_validated' ||
            n.type === 'delivery_cancelled') &&
          !n.read,
      ).length,
    );
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markNotificationRead = useCallback(
    async (id: string) => {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    [],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!profile?.id) return;
    await markAllAsRead(profile.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
