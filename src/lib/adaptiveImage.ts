import { PixelRatio, Platform } from 'react-native';

export type ImageDisplayRole = 'avatar' | 'thumbnail' | 'card' | 'hero' | 'gallery';
export type ImageNetworkProfile = 'offline' | 'low' | 'normal';

interface AdaptiveImageOptions {
  role: ImageDisplayRole;
  networkProfile: ImageNetworkProfile;
  displayWidth?: number;
}

const ROLE_WIDTHS: Record<ImageDisplayRole, number> = {
  avatar: 128,
  thumbnail: 192,
  card: 640,
  hero: 1280,
  gallery: 1600,
};

const LOW_ROLE_WIDTHS: Record<ImageDisplayRole, number> = {
  avatar: 96,
  thumbnail: 144,
  card: 360,
  hero: 720,
  gallery: 800,
};

const PUBLIC_MEDIA_BUCKETS = new Set([
  'product-images',
  'shop-logos',
  'shop-covers',
  'profile-avatars',
]);

export function getAdaptiveImageUrl(uri: string, options: AdaptiveImageOptions): string {
  if (!uri) return uri;

  const parsed = parsePublicStorageUrl(uri);
  if (!parsed || !PUBLIC_MEDIA_BUCKETS.has(parsed.bucket)) return uri;

  const roleWidth = options.networkProfile === 'low'
    ? LOW_ROLE_WIDTHS[options.role]
    : ROLE_WIDTHS[options.role];
  const density = Platform.OS === 'web' ? Math.min(PixelRatio.get(), 2) : 1;
  const requestedWidth = options.displayWidth
    ? Math.round(options.displayWidth * density)
    : roleWidth;
  const width = Math.max(64, Math.min(roleWidth, requestedWidth));
  const quality = options.networkProfile === 'low' ? 62 : 78;

  const transformed = new URL(uri);
  transformed.pathname = transformed.pathname.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  );
  transformed.searchParams.set('width', String(width));
  transformed.searchParams.set('quality', String(quality));
  transformed.searchParams.set('resize', 'cover');
  return transformed.toString();
}

export function isPublicCacheableImage(uri: string): boolean {
  const parsed = parsePublicStorageUrl(uri);
  return !!parsed && PUBLIC_MEDIA_BUCKETS.has(parsed.bucket);
}

function parsePublicStorageUrl(uri: string): { bucket: string } | null {
  try {
    const url = new URL(uri);
    const marker = '/storage/v1/object/public/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const storagePath = url.pathname.slice(markerIndex + marker.length);
    const [bucket] = storagePath.split('/');
    return bucket ? { bucket } : null;
  } catch {
    return null;
  }
}
