import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

interface VideoRecorderProps { onCapture: (uri: string, duration: number) => void; onCancel: () => void; }

export function VideoRecorder({ onCapture, onCancel }: VideoRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [ready, setReady] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewRef = useRef<string | null>(null);
  const durationRef = useRef(0);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const failedRef = useRef(false);
  const mountedRef = useRef(true);

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
  const stopTracks = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; };
  const releasePreview = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreviewUri(null);
  };

  const startCamera = async () => {
    setError(null);
    setReady(false);
    stopTracks();
    recorderRef.current = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setError("L'enregistrement vidéo n'est pas pris en charge par ce navigateur.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!mountedRef.current || cancelledRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const types = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
      const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 2_500_000,
        audioBitsPerSecond: 128_000,
      });
      recorderRef.current = recorder;
      failedRef.current = false;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => {
        failedRef.current = true;
        clearTimer();
        stopTracks();
        if (mountedRef.current && !cancelledRef.current) {
          setRecording(false);
          setError("L'enregistrement vidéo a échoué.");
        }
      };
      recorder.onstop = () => {
        clearTimer();
        stopTracks();
        if (!mountedRef.current || cancelledRef.current || failedRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || chunksRef.current[0]?.type || 'video/webm' });
        if (blob.size === 0) {
          setRecording(false);
          setError("L'enregistrement vidéo est vide. Réessayez.");
          return;
        }
        const uri = URL.createObjectURL(blob);
        previewRef.current = uri;
        setPreviewUri(uri);
        setRecording(false);
      };
      if (videoRef.current) {
        videoRef.current.src = '';
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch {
      recorderRef.current = null;
      stopTracks();
      if (mountedRef.current && !cancelledRef.current) setError("Impossible d'accéder à la caméra et au microphone. Vérifiez les permissions du navigateur.");
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    cancelledRef.current = false;
    startCamera();
    return () => {
      mountedRef.current = false;
      cancelledRef.current = true;
      clearTimer();
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      stopTracks();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const begin = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'inactive') return;
    chunksRef.current = [];
    durationRef.current = 0;
    startedAtRef.current = Date.now();
    setDuration(0);
    recorder.start(1000);
    setRecording(true);
    timerRef.current = setInterval(() => {
      const value = Math.min(60, Math.floor((Date.now() - startedAtRef.current) / 1000));
      durationRef.current = value;
      setDuration(value);
      if (value >= 60 && recorder.state === 'recording') recorder.stop();
    }, 250);
  };

  const stop = () => {
    clearTimer();
    durationRef.current = Math.min(60, Math.max(1, Math.ceil((Date.now() - startedAtRef.current) / 1000)));
    setDuration(durationRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const cancel = () => {
    cancelledRef.current = true;
    clearTimer();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    stopTracks();
    releasePreview();
    onCancel();
  };

  const retake = () => {
    releasePreview();
    durationRef.current = 0;
    setDuration(0);
    cancelledRef.current = false;
    startCamera();
  };

  const send = () => {
    if (!previewRef.current) return;
    const uri = previewRef.current;
    previewRef.current = null;
    setPreviewUri(null);
    onCapture(uri, durationRef.current);
  };

  const format = (value: number) => `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {error ? <View style={styles.errorWrap}><Text style={styles.error}>{error}</Text></View> : <video ref={videoRef} src={previewUri ?? undefined} style={styles.video} playsInline muted={!previewUri} controls={!!previewUri} />}
      <View style={styles.controls}>
        <Text style={styles.duration}>{format(duration)} / 1:00</Text>
        {previewUri ? (
          <View style={styles.actions}><Pressable style={styles.secondary} onPress={cancel}><Text style={styles.secondaryText}>Annuler</Text></Pressable><Pressable style={styles.secondary} onPress={retake}><Text style={styles.secondaryText}>Reprendre</Text></Pressable><Pressable style={styles.primary} onPress={send}><Text style={styles.primaryText}>Envoyer</Text></Pressable></View>
        ) : (
          <View style={styles.actions}><Pressable style={styles.secondary} onPress={cancel}><Feather name="x" size={18} color={colors.danger} /><Text style={styles.secondaryText}>Annuler</Text></Pressable>{!error ? <Pressable style={[styles.primary, !ready && styles.disabled]} onPress={recording ? stop : begin} disabled={!ready}><Text style={styles.primaryText}>{recording ? 'Arrêter' : ready ? 'Enregistrer' : 'Préparation…'}</Text></Pressable> : null}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: spacing.md },
  video: { flex: 1, width: '100%', minHeight: 260, backgroundColor: '#111', objectFit: 'contain' },
  errorWrap: { flex: 1, minHeight: 260, justifyContent: 'center' },
  controls: { paddingTop: spacing.md, alignItems: 'center', gap: spacing.sm },
  duration: { color: colors.textInverse, fontFamily: typography.fontFamily, fontSize: typography.sizes.body },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primary: { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
  disabled: { opacity: 0.5 },
  primaryText: { color: colors.textInverse, fontFamily: typography.fontFamily, fontWeight: typography.weights.semibold },
  secondary: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  secondaryText: { color: colors.textInverse, fontFamily: typography.fontFamily },
  error: { color: colors.textInverse, textAlign: 'center', padding: spacing.xl },
});
