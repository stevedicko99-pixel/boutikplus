export type ImageRole = 'thumbnail' | 'card' | 'avatar' | 'hero' | 'gallery';

interface ImageVariant {
  width: number;
  quality: number;
}

interface AdaptiveImageOptions {
  width?: number;
  isOnline?: boolean;
  isLowConnection?: boolean;
}

const MIN_WIDTH = 32;
const MAX_WIDTH = 2400;
const MIN_QUALITY = 30;
const MAX_QUALITY = 90;

export const IMAGE_VARIANTS: Record<ImageRole, { normal: ImageVariant; low: ImageVariant }> = {
  thumbnail: { normal: { width: 160, quality: 72 }, low: { width: 96, quality: 55 } },
  card: { normal: { width: 440, quality: 80 }, low: { width: 240, quality: 60 } },
  avatar: { normal: { width: 128, quality: 80 }, low: { width: 96, quality: 60 } },
  hero: { normal: { width: 1440, quality: 84 }, low: { width: 720, quality: 60 } },
  gallery: { normal: { width: 1080, quality: 84 }, low: { width: 540, quality: 62 } },
};

const SENSITIVE_BUCKETS = new Set([
  'payment-proofs',
  'delivery-proofs',
  'driver-id-cards',
  'ai-source-images',
]);

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function getSupabaseImageUrl(uri: string, width: number, quality: number): string {
  if (!uri || /^(data|blob|file|content):/i.test(uri)) return uri;

  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return uri;
  }

  if (!/^https?:$/.test(url.protocol) || !/(^|\.)supabase\.co$/i.test(url.hostname)) return uri;
  if (url.pathname.includes('/storage/v1/render/image/')) return uri;

  const match = url.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return uri;

  let bucket: string;
  try {
    bucket = decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return uri;
  }
  if (SENSITIVE_BUCKETS.has(bucket)) return uri;

  url.pathname = `/storage/v1/render/image/public/${match[1]}/${match[2]}`;
  url.searchParams.set('width', String(clampInteger(width, MIN_WIDTH, MAX_WIDTH)));
  url.searchParams.set('quality', String(clampInteger(quality, MIN_QUALITY, MAX_QUALITY)));
  url.searchParams.set('resize', 'cover');
  return url.toString();
}

export function getAdaptiveImageUrl(
  uri: string,
  role: ImageRole,
  { width, isOnline = true, isLowConnection = false }: AdaptiveImageOptions = {},
): string {
  const useLowVariant = !isOnline || isLowConnection;
  const variant = IMAGE_VARIANTS[role][useLowVariant ? 'low' : 'normal'];
  const requestedWidth = width == null
    ? variant.width
    : useLowVariant
      ? Math.min(width, variant.width)
      : width;
  return getSupabaseImageUrl(uri, requestedWidth, variant.quality);
}
