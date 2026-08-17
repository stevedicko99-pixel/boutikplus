import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getConversations, isDemoMode } from '@/lib/dataService';
import { DEMO_BUYER } from '@/data/demoData';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatRelativeDate } from '@/lib/format';
import type { Conversation } from '@/types/models';

interface ConversationListScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void };
}

export function ConversationListScreen({ navigation }: ConversationListScreenProps) {
  const { profile } = useAuth();
  const buyerId = profile?.id ?? (isDemoMode ? DEMO_BUYER.id : null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!buyerId) {
      setConversations([]);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    void getConversations(buyerId).then((convs) => {
      if (!active) return;
      setConversations(convs);
      setLoading(false);
    });
    return () => { active = false; };
  }, [buyerId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      {loading ? (
        <LoadingSpinner />
      ) : conversations.length === 0 ? (
        <EmptyState icon="message-square" title="Aucune conversation" message="Contactez un vendeur depuis une fiche produit pour discuter" />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const otherName = item.shop?.name ?? 'Conversation';
            return (
              <Pressable
                style={({ pressed }) => [styles.convItem, pressed && { opacity: 0.7 }]}
                onPress={() => navigation.navigate('Chat', { conversationId: item.id, shopId: item.shop_id })}
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir la conversation avec ${otherName}`}
              >
                <Image
                  source={{ uri: item.shop?.logo_url || 'https://dummyimage.com/80x80/FF6B00/FFFFFF&text=B' }}
                  style={styles.avatar}
                  contentFit="cover"
                />
                <View style={styles.convInfo}>
                  <View style={styles.convTop}>
                    <Text style={styles.convName} numberOfLines={1}>{otherName}</Text>
                    <Text style={styles.convDate}>{formatRelativeDate(item.created_at)}</Text>
                  </View>
                  <Text style={styles.convLast} numberOfLines={1}>
                    {item.last_message?.content ?? 'Appuyez pour ouvrir la conversation'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textMuted} />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  list: { padding: spacing.lg, paddingTop: 0 },
  convItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt },
  convInfo: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convName: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  convDate: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  convLast: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
});
