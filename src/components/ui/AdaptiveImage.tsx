import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ImageStyle, type ViewStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useConnectivity } from '@/context/ConnectivityContext';
import { colors } from '@/theme';
import { getAdaptiveImageUrl, type ImageDisplayRole } from '@/lib/adaptiveImage';

interface AdaptiveImageProps {
  uri?: string | null;
  role: ImageDisplayRole;
  style: StyleProp<ImageStyle>;
  displayWidth?: number;
  contentFit?: ImageContentFit;
  transition?: number;
  recyclingKey?: string;
  accessibilityLabel?: string;
  fallback?: React.ReactNode;
}

export function AdaptiveImage({
  uri,
  role,
  style,
  displayWidth,
  contentFit = 'cover',
  transition = 150,
  recyclingKey,
  accessibilityLabel,
  fallback,
}: AdaptiveImageProps) {
  const { isOnline, isLowConnection } = useConnectivity();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const lastOnlineProfile = useRef<'low' | 'normal'>('normal');

  if (isOnline) {
    lastOnlineProfile.current = isLowConnection ? 'low' : 'normal';
  }

  const networkProfile = lastOnlineProfile.current;
  const sourceUri = useMemo(
    () => uri ? getAdaptiveImageUrl(uri, { role, networkProfile, displayWidth }) : '',
    [uri, role, networkProfile, displayWidth],
  );

  if (!sourceUri || failedUri === sourceUri) {
    return fallback ?? (
      <View style={[style as StyleProp<ViewStyle>, styles.placeholder]}>
        <Feather name={isOnline ? 'image' : 'wifi-off'} size={24} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: sourceUri }}
      style={style}
      contentFit={contentFit}
      transition={isLowConnection ? 0 : transition}
      cachePolicy="memory-disk"
      recyclingKey={`${recyclingKey ?? sourceUri}:${networkProfile}`}
      accessibilityLabel={accessibilityLabel}
      onError={() => setFailedUri(sourceUri)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
});
