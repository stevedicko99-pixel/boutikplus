import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { chatbotReply, type ChatbotResponse } from '@/lib/aiService';
import type { Product } from '@/types/models';

interface ChatbotScreenProps {
  navigation: { goBack: () => void };
  route: { params?: { product?: Product; shopName?: string } };
}

export function ChatbotScreen({ navigation, route }: ChatbotScreenProps) {
  const { product, shopName } = route.params ?? {};
  const [messages, setMessages] = useState<{ isUser: boolean; text: string; suggestions?: string[] }[]>([
    {
      isUser: false,
      text: product
        ? `Bonjour ! Je suis l'assistant IA de ${shopName ?? 'la boutique'}. Je peux vous aider pour "${product.name}". Posez-moi une question ! 👋`
        : 'Bonjour ! Je suis votre assistant IA. Posez-moi une question sur les produits, la livraison, ou le paiement ! 👋',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setMessages((prev) => [...prev, { isUser: true, text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const reply = await chatbotReply(userMsg, product);
      setMessages((prev) => [
        ...prev,
        {
          isUser: false,
          text: reply.text,
          suggestions: reply.suggestions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { isUser: false, text: 'Désolé, je n\'ai pas pu répondre. Réessayez plus tard.' },
      ]);
    }
    setLoading(false);
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <View style={styles.aiBadge}>
            <Feather name="cpu" size={14} color={colors.textInverse} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Assistant IA</Text>
            <Text style={styles.headerStatus}>En ligne</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg, i) => (
          <View key={i} style={[styles.msgRow, msg.isUser ? styles.msgRowUser : styles.msgRowBot]}>
            <View style={[styles.bubble, msg.isUser ? styles.bubbleUser : styles.bubbleBot]}>
              <Text style={[styles.msgText, msg.isUser ? styles.msgTextUser : styles.msgTextBot]}>
                {msg.text}
              </Text>
              {!msg.isUser && msg.suggestions && msg.suggestions.length > 0 ? (
                <View style={styles.suggestionsRow}>
                  {msg.suggestions.map((s, idx) => (
                    <Pressable
                      key={idx}
                      style={styles.suggestionChip}
                      onPress={() => handleSuggestion(s)}
                    >
                      <Text style={styles.suggestionText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ))}
        {loading ? (
          <View style={styles.msgRow}>
            <View style={[styles.bubble, styles.bubbleBot]}>
              <View style={styles.typingDots}>
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, { animationDelay: '0.2s' }]} />
                <View style={[styles.typingDot, { animationDelay: '0.4s' }]} />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Posez votre question..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          onSubmitEditing={() => sendMessage(input)}
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Feather name="send" size={18} color={colors.textInverse} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerStatus: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.success,
  },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: spacing.md, gap: spacing.sm },
  msgRow: { flexDirection: 'row' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '85%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.xs,
  },
  bubbleBot: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  msgText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    lineHeight: 22,
  },
  msgTextUser: { color: colors.textInverse },
  msgTextBot: { color: colors.text },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: spacing.xxl,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
});
