import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio, ResizeMode, Video } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

interface VideoRecorderProps {
  onCapture: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export function VideoRecorder({ onCapture, onCancel }: VideoRecorderProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState<boolean | null>(null);
  const cameraRef = useRef<CameraView>(null);
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
    Audio.getPermissionsAsync()
      .then((result) => {
        if (mountedRef.current) setAudioPermissionGranted(result.status === 'granted');
      })
      .catch(() => {
        if (mountedRef.current) setAudioPermissionGranted(false);
      });
  }, []);

  const requestMediaPermissions = async () => {
    try {
      const [cameraResult, audioResult] = await Promise.all([
        permission?.granted ? Promise.resolve(permission) : requestPermission(),
        Audio.requestPermissionsAsync(),
      ]);
      if (!mountedRef.current) return;
      setAudioPermissionGranted(audioResult.status === 'granted');
      if (!cameraResult.granted || audioResult.status !== 'granted') {
        Alert.alert('Permission refusée', 'La caméra et le microphone sont nécessaires pour enregistrer une note vidéo.');
      }
    } catch {
      if (mountedRef.current) Alert.alert('Erreur', 'Impossible de vérifier les permissions de la caméra et du microphone.');
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    cancelledRef.current = false;
    return () => {
      mountedRef.current = false;
      cancelledRef.current = true;
      clearTimer();
      cameraRef.current?.stopRecording();
    };
  }, []);

  const handleStartRecording = async () => {
    if (!cameraRef.current || isRecording || !permission?.granted || !audioPermissionGranted) return;
    cancelledRef.current = false;
    durationRef.current = 0;
    startedAtRef.current = Date.now();
    setDuration(0);
    setIsRecording(true);
    intervalRef.current = setInterval(() => {
      const seconds = Math.min(60, Math.floor((Date.now() - startedAtRef.current) / 1000));
      durationRef.current = seconds;
      if (mountedRef.current) setDuration(seconds);
    }, 250);

    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: 60 });
      clearTimer();
      const exactDuration = Math.min(60, Math.max(1, Math.ceil((Date.now() - startedAtRef.current) / 1000)));
      durationRef.current = exactDuration;
      if (!result || cancelledRef.current || !mountedRef.current) return;
      setDuration(exactDuration);
      setIsRecording(false);
      setPreviewUri(result.uri);
    } catch (error) {
      clearTimer();
      if (!cancelledRef.current && mountedRef.current) {
        setIsRecording(false);
        Alert.alert('Erreur', "Impossible d'enregistrer la vidéo. Réessayez.");
      }
    }
  };

  const handleStopRecording = () => {
    if (!isRecording) return;
    clearTimer();
    durationRef.current = Math.min(60, Math.max(1, Math.ceil((Date.now() - startedAtRef.current) / 1000)));
    setDuration(durationRef.current);
    cameraRef.current?.stopRecording();
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    clearTimer();
    if (isRecording) cameraRef.current?.stopRecording();
    onCancel();
  };

  const handleRetake = () => {
    setPreviewUri(null);
    setDuration(0);
    durationRef.current = 0;
  };

  const handleSend = () => {
    if (previewUri) onCapture(previewUri, durationRef.current);
  };

  const formatDuration = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  if (!permission?.granted || !audioPermissionGranted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Autorisez la caméra et le microphone pour enregistrer une note vidéo.</Text>
        <Pressable style={styles.permissionBtn} onPress={requestMediaPermissions}>
          <Text style={styles.permissionBtnText}>Autoriser</Text>
        </Pressable>
        <Pressable style={styles.cancelAction} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Annuler</Text>
        </Pressable>
      </View>
    );
  }

  if (previewUri) {
    return (
      <View style={styles.container}>
        <Video source={{ uri: previewUri }} style={styles.preview} resizeMode={ResizeMode.CONTAIN} useNativeControls />
        <Text style={styles.previewDuration}>{formatDuration(duration)}</Text>
        <View style={styles.previewActions}>
          <Pressable style={styles.secondaryBtn} onPress={handleCancel}><Text style={styles.secondaryText}>Annuler</Text></Pressable>
          <Pressable style={styles.secondaryBtn} onPress={handleRetake}><Text style={styles.secondaryText}>Reprendre</Text></Pressable>
          <Pressable style={styles.sendBtn} onPress={handleSend}><Feather name="send" size={18} color={colors.textInverse} /><Text style={styles.sendText}>Envoyer</Text></Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" mode="video" videoQuality="720p">
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <Pressable style={styles.closeBtn} onPress={handleCancel} hitSlop={8}><Feather name="x" size={24} color={colors.textInverse} /></Pressable>
            {isRecording ? <View style={styles.recordingIndicator}><View style={styles.recordingDot} /><Text style={styles.recordingText}>{formatDuration(duration)} / 1:00</Text></View> : null}
          </View>
          <View style={styles.bottomBar}>
            <Pressable style={[styles.recordBtn, isRecording && styles.recordBtnActive]} onPress={isRecording ? handleStopRecording : handleStartRecording} hitSlop={8}>
              <View style={[styles.recordBtnInner, isRecording && styles.recordBtnInnerActive]} />
            </Pressable>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  preview: { flex: 1, width: '100%' },
  previewDuration: { color: colors.textInverse, textAlign: 'center', fontFamily: typography.fontFamily, marginVertical: spacing.sm },
  previewActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  secondaryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  secondaryText: { color: colors.textInverse, fontFamily: typography.fontFamily },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
  sendText: { color: colors.textInverse, fontFamily: typography.fontFamily, fontWeight: typography.weights.semibold },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xxl },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 0, 0, 0.5)', alignItems: 'center', justifyContent: 'center' },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(0, 0, 0, 0.5)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  recordingText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textInverse },
  bottomBar: { alignItems: 'center', paddingBottom: spacing.xxl },
  recordBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: colors.textInverse, alignItems: 'center', justifyContent: 'center' },
  recordBtnActive: { borderColor: colors.danger },
  recordBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger },
  recordBtnInnerActive: { width: 32, height: 32, borderRadius: 4 },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.surface },
  permissionText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.text, textAlign: 'center', marginBottom: spacing.lg },
  permissionBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md },
  permissionBtnText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textInverse },
  cancelAction: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  cancelBtnText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted },
});
