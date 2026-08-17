import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, KeyboardAvoidingView, Platform, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getMessages, sendMessage, getShop, isDemoMode } from '@/lib/dataService';
import { DEMO_BUYER } from '@/data/demoData';
import { formatRelativeDate } from '@/lib/format';
import { VoiceRecorder } from '@/components/ui/VoiceRecorder';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { VideoRecorder } from '@/components/ui/VideoRecorder';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { uploadMediaFile } from '@/lib/mediaUpload';
import type { Message, Shop } from '@/types/models';

interface ChatScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: { params: { conversationId: string; shopId?: string; productId?: string } };
}

export function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { conversationId, shopId } = route.params;
  const { profile } = useAuth();
  const effectiveProfile = profile ?? (isDemoMode ? DEMO_BUYER : null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const demoBlobUrlsRef = useRef(new Set<string>());

  const loadMessages = useCallback(async () => {
    const msgs = await getMessages(conversationId);
    setMessages(msgs);
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
    if (shopId) {
      getShop(shopId).then(setShop);
    }
  }, [loadMessages, shopId]);

  useEffect(() => () => {
    if (Platform.OS === 'web') {
      demoBlobUrlsRef.current.forEach((uri) => URL.revokeObjectURL(uri));
      demoBlobUrlsRef.current.clear();
    }
  }, []);

  const handleSend = async () => {
    const sender = effectiveProfile;
    if (!input.trim() || !sender) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    const msg = await sendMessage(conversationId, sender.id, content);
    if (msg) {
      setMessages((prev) => [...prev, msg]);
      // Réponse automatique de démo
      if (isDemoMode && sender.role === 'buyer') {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `auto-${Date.now()}`,
              conversation_id: conversationId,
              sender_id: 'demo-seller',
              content: 'Merci pour votre message ! Je vous réponds au plus vite. Vous pouvez aussi commander directement depuis la fiche produit. 🙏',
              image_url: null,
              audio_url: null,
              audio_duration: null,
              video_url: null,
              video_duration: null,
              video_thumbnail: null,
              created_at: new Date().toISOString(),
              read: false,
            },
          ]);
        }, 1500);
      }
    }
    setSending(false);
  };

  const handleSendVoice = async (uri: string, duration: number) => {
    const sender = effectiveProfile;
    if (!sender) {
      if (Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
      return;
    }
    setSending(true);
    setShowVoiceRecorder(false);

    try {
      const mediaUrl = isDemoMode
        ? uri
        : (await uploadMediaFile('chat-media', conversationId, uri, 'audio')).url;
      const msg = await sendMessage(
        conversationId,
        sender.id,
        null,
        null,
        mediaUrl,
        Math.max(1, duration)
      );
      if (!msg) throw new Error('MESSAGE_SEND_FAILED');
      if (isDemoMode && Platform.OS === 'web' && uri.startsWith('blob:')) demoBlobUrlsRef.current.add(uri);
      setMessages((prev) => [...prev, msg]);
    } catch (error) {
      if (isDemoMode && Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
      console.error('Failed to send voice message:', error);
      Alert.alert('Erreur', "Impossible d'envoyer le message vocal");
    } finally {
      if (!isDemoMode && Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
      setSending(false);
    }
  };

  const handleSendVideo = async (uri: string, duration: number) => {
    const sender = effectiveProfile;
    if (!sender) {
      if (Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
      return;
    }
    setSending(true);
    setShowVideoRecorder(false);

    try {
      const mediaUrl = isDemoMode
        ? uri
        : (await uploadMediaFile('chat-media', conversationId, uri, 'video')).url;
      const msg = await sendMessage(
        conversationId,
        sender.id,
        null,
        null,
        null,
        null,
        mediaUrl,
        Math.max(1, duration)
      );
      if (!msg) throw new Error('MESSAGE_SEND_FAILED');
      if (isDemoMode && Platform.OS === 'web' && uri.startsWith('blob:')) demoBlobUrlsRef.current.add(uri);
      setMessages((prev) => [...prev, msg]);
    } catch (error) {
      if (isDemoMode && Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
      console.error('Failed to send video message:', error);
      Alert.alert('Erreur', "Impossible d'envoyer la vidéo");
    } finally {
      if (!isDemoMode && Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Image
          source={{ uri: shop?.logo_url || 'https://dummyimage.com/80x80/FF6B00/FFFFFF&text=B' }}
          style={styles.headerAvatar}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>{shop?.name ?? 'Discussion'}</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>En ligne</Text>
          </View>
        </View>
        {shop ? (
          <Pressable onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id })} accessibilityRole="button" accessibilityLabel={`Voir la boutique ${shop.name}`}>
            <Text style={styles.shopLink}>Voir boutique</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Video Recorder Overlay */}
      {showVideoRecorder ? (
        <VideoRecorder
          onCapture={handleSendVideo}
          onCancel={() => setShowVideoRecorder(false)}
        />
      ) : messages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Feather name="message-circle" size={40} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Aucun message pour l'instant</Text>
          <Text style={styles.emptySub}>
            {shop ? `Écrivez votre premier message à ${shop.name} pour discuter d'un produit.` : 'Posez votre première question au vendeur pour démarrer la discussion.'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Feather name="shopping-bag" size={16} color={colors.textInverse} />
            <Text style={styles.emptyCtaText}>Parcourir les boutiques</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item, index }) => {
            const isMe = item.sender_id === effectiveProfile?.id;
            const showDate = index === 0 || isNewDay(messages[index - 1].created_at, item.created_at);
            return (
              <View>
                {showDate ? <Text style={styles.dateSep}>{formatRelativeDate(item.created_at)}</Text> : null}
                <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.msgImage} contentFit="cover" />
                    ) : null}
                    {item.audio_url ? (
                      <AudioPlayer uri={item.audio_url} duration={item.audio_duration ?? 0} isMe={isMe} />
                    ) : null}
                    {item.video_url ? (
                      <VideoPlayer uri={item.video_url} thumbnail={item.video_thumbnail} isMe={isMe} />
                    ) : null}
                    {item.content ? (
                      <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextThem]}>{item.content}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {showVoiceRecorder ? (
          <VoiceRecorder
            onSend={handleSendVoice}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <View style={styles.inputBar}>
            {/* Attach button with menu */}
            <View style={{ position: 'relative' }}>
              <Pressable
                style={styles.attachBtn}
                hitSlop={8}
                onPress={() => setShowAttachMenu(!showAttachMenu)}
                accessibilityRole="button"
                accessibilityLabel="Joindre un média"
              >
                <Feather name="plus-circle" size={22} color={colors.textMuted} />
              </Pressable>
              
              {/* Attach menu */}
              {showAttachMenu && (
                <View style={styles.attachMenu}>
                  <Pressable
                    style={styles.attachMenuItem}
                    onPress={() => {
                      setShowAttachMenu(false);
                      setShowVideoRecorder(true);
                    }}
                  >
                    <Feather name="video" size={20} color={colors.primary} />
                    <Text style={styles.attachMenuText}>Note vidéo</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Écrivez un message..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
            />
            
            {/* Voice message button */}
            {!input.trim() && (
              <Pressable
                style={styles.voiceBtn}
                onPress={() => setShowVoiceRecorder(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Message vocal"
              >
                <Feather name="mic" size={20} color={colors.primary} />
              </Pressable>
            )}
            
            {/* Send button */}
            {input.trim() && (
              <Pressable
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!input.trim() || sending}
                accessibilityRole="button"
                accessibilityLabel="Envoyer le message"
              >
                <Feather name="send" size={18} color={colors.textInverse} />
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function isNewDay(a: string, b: string): boolean {
  return new Date(a).toDateString() !== new Date(b).toDateString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt },
  headerName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  statusText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.success },
  shopLink: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.primary, fontWeight: typography.weights.semibold },
  msgList: { padding: spacing.lg, paddingBottom: spacing.xl },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '12', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, textAlign: 'center' },
  emptySub: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill, marginTop: spacing.sm },
  emptyCtaText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textInverse },
  dateSep: { textAlign: 'center', fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginVertical: spacing.md },
  msgRow: { flexDirection: 'row', marginBottom: spacing.sm },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: radius.xs },
  bubbleThem: { backgroundColor: colors.surface, borderBottomLeftRadius: radius.xs, borderWidth: 1, borderColor: colors.borderLight },
  msgImage: { width: 200, height: 200, borderRadius: radius.md, marginBottom: spacing.xs },
  msgText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, lineHeight: 22 },
  msgTextMe: { color: colors.textInverse },
  msgTextThem: { color: colors.text },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingBottom: spacing.xxl },
  attachBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  attachMenu: { position: 'absolute', bottom: 50, left: 0, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  attachMenuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  attachMenuText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.text },
  voiceBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
});
