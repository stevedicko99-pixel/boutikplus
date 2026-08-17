import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

interface VoiceRecorderProps { onSend: (uri: string, duration: number) => void; onCancel: () => void; }

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationRef = useRef(0);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);
  const failedRef = useRef(false);
  const mountedRef = useRef(true);
  const onSendRef = useRef(onSend);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  onSendRef.current = onSend;

  const stopTracks = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; };
  const clearTimer = () => { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = null; };
  const cleanup = () => { clearTimer(); stopTracks(); recorderRef.current = null; };

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    cancelledRef.current = false;
    failedRef.current = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('unsupported');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active || cancelledRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
        const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
        recorder.onerror = () => {
          failedRef.current = true;
          cleanup();
          if (mountedRef.current && !cancelledRef.current) {
            setIsRecording(false);
            setError("L'enregistrement audio a échoué.");
          }
        };
        recorder.onstop = () => {
          cleanup();
          if (!mountedRef.current || cancelledRef.current || failedRef.current) return;
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm' });
          if (blob.size === 0) {
            setIsRecording(false);
            setError("L'enregistrement audio est vide. Réessayez.");
            return;
          }
          const uri = URL.createObjectURL(blob);
          const seconds = Math.max(1, durationRef.current);
          onSendRef.current(uri, seconds);
        };
        recorder.start();
        startedAtRef.current = Date.now();
        setIsRecording(true);
        intervalRef.current = setInterval(() => {
          const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
          durationRef.current = seconds;
          setDuration(seconds);
        }, 250);
      } catch {
        cleanup();
        if (active) setError('Impossible d’accéder au microphone. Vérifiez les permissions du navigateur.');
      }
    })();
    return () => {
      active = false;
      mountedRef.current = false;
      cancelledRef.current = true;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      clearTimer();
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      stopTracks();
    };
  }, []);

  const handleStop = () => {
    clearTimer();
    const seconds = Math.ceil((Date.now() - startedAtRef.current) / 1000);
    durationRef.current = Math.max(1, durationRef.current, seconds);
    setDuration(durationRef.current);
    setIsRecording(false);
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
  };
  const handleCancel = () => {
    cancelledRef.current = true;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    clearTimer();
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    stopTracks();
    onCancel();
  };
  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  return <View style={styles.container}>
    <View style={styles.recordingIndicator}><View style={[styles.pulse, isRecording && styles.pulseActive]} /><Text style={styles.duration}>{error || formatDuration(duration)}</Text></View>
    <View style={styles.actions}>
      <Pressable style={styles.cancelBtn} onPress={handleCancel} hitSlop={8}><Feather name="x" size={24} color={colors.danger} /><Text style={styles.cancelText}>Annuler</Text></Pressable>
      <Pressable style={[styles.sendBtn, !isRecording && styles.sendBtnDisabled]} onPress={handleStop} disabled={!isRecording} hitSlop={8}><Feather name="send" size={20} color={colors.textInverse} /><Text style={styles.sendText}>Envoyer</Text></Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({ container:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:spacing.md, backgroundColor:colors.surface, borderTopWidth:1, borderTopColor:colors.borderLight }, recordingIndicator:{ flexDirection:'row', alignItems:'center', gap:spacing.sm, flex:1 }, pulse:{ width:12,height:12,borderRadius:6,backgroundColor:colors.danger,opacity:0.3 }, pulseActive:{opacity:1}, duration:{fontFamily:typography.fontFamily,fontSize:typography.sizes.body,fontWeight:typography.weights.semibold,color:colors.text}, actions:{flexDirection:'row',alignItems:'center',gap:spacing.md}, cancelBtn:{flexDirection:'row',alignItems:'center',gap:spacing.xs,paddingVertical:spacing.sm,paddingHorizontal:spacing.md}, cancelText:{fontFamily:typography.fontFamily,fontSize:typography.sizes.small,fontWeight:typography.weights.semibold,color:colors.danger}, sendBtn:{flexDirection:'row',alignItems:'center',gap:spacing.xs,backgroundColor:colors.primary,paddingVertical:spacing.sm,paddingHorizontal:spacing.lg,borderRadius:radius.pill}, sendBtnDisabled:{backgroundColor:colors.border}, sendText:{fontFamily:typography.fontFamily,fontSize:typography.sizes.small,fontWeight:typography.weights.semibold,color:colors.textInverse} });
