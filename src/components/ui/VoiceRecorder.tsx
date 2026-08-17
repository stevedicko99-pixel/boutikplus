import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

interface VoiceRecorderProps {
  onSend: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationRef = useRef(0);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    cancelledRef.current = false;
    const startRecording = async () => {
      try {
        const permission = await Audio.requestPermissionsAsync();
        if (!mountedRef.current) return;
        if (permission.status !== 'granted') {
          Alert.alert('Permission refusée', "Autorisez l'accès au microphone pour enregistrer un message vocal.");
          onCancel();
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        if (!mountedRef.current || cancelledRef.current) {
          await rec.stopAndUnloadAsync().catch(() => {});
          return;
        }
        recordingRef.current = rec;
        setRecording(rec);
        setIsRecording(true);
        startedAtRef.current = Date.now();
        intervalRef.current = setInterval(() => {
          const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
          durationRef.current = seconds;
          if (mountedRef.current) setDuration(seconds);
        }, 250);
      } catch (error) {
        if (mountedRef.current && !cancelledRef.current) {
          Alert.alert('Erreur', "Impossible de démarrer l'enregistrement.");
          onCancel();
        }
      }
    };
    startRecording();
    return () => {
      mountedRef.current = false;
      cancelledRef.current = true;
      clearTimer();
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    };
  }, [onCancel]);

  const handleStop = async () => {
    if (!recording) return;
    clearTimer();
    const exactDuration = Math.max(1, Math.ceil((Date.now() - startedAtRef.current) / 1000));
    durationRef.current = exactDuration;
    setDuration(exactDuration);
    setIsRecording(false);
    setRecording(null);
    recordingRef.current = null;
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (uri && mountedRef.current && !cancelledRef.current) onSend(uri, exactDuration);
    } catch {
      if (mountedRef.current && !cancelledRef.current) Alert.alert('Erreur', "Impossible d'arrêter l'enregistrement.");
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    clearTimer();
    setIsRecording(false);
    setRecording(null);
    const activeRecording = recordingRef.current;
    recordingRef.current = null;
    activeRecording?.stopAndUnloadAsync().catch(() => {});
    Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    onCancel();
  };

  const formatDuration = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <View style={styles.recordingIndicator}>
        <View style={[styles.pulse, isRecording && styles.pulseActive]} />
        <Text style={styles.duration}>{formatDuration(duration)}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={handleCancel} hitSlop={8}><Feather name="x" size={24} color={colors.danger} /><Text style={styles.cancelText}>Annuler</Text></Pressable>
        <Pressable style={[styles.sendBtn, !isRecording && styles.sendBtnDisabled]} onPress={handleStop} disabled={!isRecording} hitSlop={8}><Feather name="send" size={20} color={colors.textInverse} /><Text style={styles.sendText}>Envoyer</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  pulse: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger, opacity: 0.3 },
  pulseActive: { opacity: 1 },
  duration: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  cancelText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.danger },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.textInverse },
});
