import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import {
  getDeliveryById,
  getDeliveryMessages,
  sendDeliveryMessage,
  subscribeToDeliveryMessages,
} from '@/lib/deliveryService';
import { colors, radius, spacing, typography } from '@/theme';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { DeliveryMessage } from '@/types/models';

interface Props { navigation: { goBack: () => void }; route: { params: { deliveryId: string } } }
export function DeliveryChatScreen({ navigation, route }: Props) {
  const { profile } = useAuth();
  const listRef = useRef<FlatList<DeliveryMessage>>(null);
  const [messages, setMessages] = useState<DeliveryMessage[]>([]);
  const [text, setText] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const delivery = await getDeliveryById(route.params.deliveryId);
    const admin = !!profile && (profile.role === 'admin' || profile.role === 'super_admin' || profile.roles?.some((r) => r === 'admin' || r === 'super_admin'));
    const participant = !!profile && !!delivery && [delivery.buyer_id, delivery.seller_id, delivery.driver_id].includes(profile.id);
    setAllowed(admin || participant);
    if (admin || participant) setMessages(await getDeliveryMessages(route.params.deliveryId));
    setLoading(false);
  }, [profile, route.params.deliveryId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeToDeliveryMessages(route.params.deliveryId, (message) => setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message])), [route.params.deliveryId]);

  const send = async () => {
    if (!profile || !text.trim() || sending) return;
    const content = text.trim(); setText(''); setSending(true);
    const { error } = await sendDeliveryMessage(route.params.deliveryId, profile.id, content);
    setSending(false);
    if (error) setText(content);
    else await load();
  };

  if (loading) return <SafeAreaView style={styles.container}><LoadingSpinner /></SafeAreaView>;
  return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.header}><Pressable onPress={navigation.goBack}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable><Text style={styles.title}>Chat de livraison</Text><View style={{ width: 24 }} /></View>{!allowed ? <View style={styles.center}><Text style={styles.muted}>Accès réservé aux participants.</Text></View> : <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><FlatList ref={listRef} data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} onContentSizeChange={() => listRef.current?.scrollToEnd()} ListEmptyComponent={<Text style={styles.empty}>Aucun message. Démarrez la conversation.</Text>} renderItem={({ item }) => { const mine = item.sender_id === profile?.id; return <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>{!mine && item.sender?.full_name ? <Text style={styles.sender}>{item.sender.full_name}</Text> : null}<Text style={[styles.message, mine && { color: colors.textInverse }]}>{item.content}</Text><Text style={[styles.time, mine && { color: '#FFF8' }]}>{new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text></View>; }} /><View style={styles.composer}><TextInput value={text} onChangeText={setText} placeholder="Votre message…" placeholderTextColor={colors.textMuted} style={styles.input} multiline maxLength={1000} /><Pressable style={[styles.send, (!text.trim() || sending) && { opacity: .5 }]} disabled={!text.trim() || sending} onPress={send}><Feather name="send" size={19} color={colors.textInverse} /></Pressable></View></KeyboardAvoidingView>}</SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }, title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text }, list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 }, bubble: { maxWidth: '80%', padding: spacing.md, borderRadius: radius.lg }, mine: { alignSelf: 'flex-end', backgroundColor: colors.primary }, theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface }, sender: { color: colors.primaryDeep, fontWeight: typography.weights.bold, fontSize: typography.sizes.caption }, message: { color: colors.text }, time: { color: colors.textMuted, fontSize: 10, alignSelf: 'flex-end', marginTop: 4 }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }, input: { flex: 1, maxHeight: 110, color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.md }, send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, muted: { color: colors.textMuted }, empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl } });
