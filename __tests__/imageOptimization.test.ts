import { getAdaptiveImageUrl, getSupabaseImageUrl } from '@/lib/imageOptimization';

const publicUrl = 'https://demo.supabase.co/storage/v1/object/public/product-images/folder/photo%20été.jpg?download=1';

describe('imageOptimization', () => {
  it('transforme une URL publique Supabase en préservant chemin encodé et query', () => {
    const result = getSupabaseImageUrl(publicUrl, 440.4, 80);
    expect(result).toContain('/storage/v1/render/image/public/product-images/folder/photo%20%C3%A9t%C3%A9.jpg');
    expect(result).toContain('download=1');
    expect(result).toContain('width=440');
    expect(result).toContain('quality=80');
    expect(result).toContain('resize=cover');
  });

  it('borne largeur et qualité', () => {
    expect(getSupabaseImageUrl(publicUrl, 9999, 2)).toContain('width=2400');
    expect(getSupabaseImageUrl(publicUrl, 9999, 2)).toContain('quality=30');
  });

  it('choisit les variantes normale, faible connexion et offline stables', () => {
    expect(getAdaptiveImageUrl(publicUrl, 'card')).toContain('width=440');
    const low = getAdaptiveImageUrl(publicUrl, 'card', { isLowConnection: true });
    const offline = getAdaptiveImageUrl(publicUrl, 'card', { isOnline: false });
    expect(low).toContain('width=240');
    expect(low).toContain('quality=60');
    expect(offline).toBe(low);
  });

  it.each([
    'data:image/png;base64,abc',
    'blob:https://example.com/id',
    'file:///photo.jpg',
    'content://photo/1',
    '/storage/v1/object/public/product-images/a.jpg',
    'ftp://demo.supabase.co/storage/v1/object/public/product-images/a.jpg',
    'https://example.com/storage/v1/object/public/product-images/a.jpg',
    'https://demo.supabase.co/photo.jpg',
  ])('ne transforme pas %s', (uri) => {
    expect(getSupabaseImageUrl(uri, 400, 80)).toBe(uri);
  });

  it.each(['payment-proofs', 'delivery-proofs', 'driver-id-cards', 'ai-source-images'])(
    'ne transforme pas le bucket sensible %s',
    (bucket) => {
      const uri = `https://demo.supabase.co/storage/v1/object/public/${bucket}/a.jpg`;
      expect(getSupabaseImageUrl(uri, 400, 80)).toBe(uri);
    },
  );

  it('est idempotent pour une URL déjà transformée', () => {
    const once = getSupabaseImageUrl(publicUrl, 400, 80);
    expect(getSupabaseImageUrl(once, 200, 50)).toBe(once);
  });
});
