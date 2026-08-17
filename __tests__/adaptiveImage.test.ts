import { getAdaptiveImageUrl, isPublicCacheableImage } from '@/lib/adaptiveImage';

const productUrl = 'https://example.supabase.co/storage/v1/object/public/product-images/user/photo.jpg';

describe('adaptiveImage', () => {
  it('transforme une image produit publique avec une largeur et une qualité adaptées', () => {
    const result = getAdaptiveImageUrl(productUrl, { role: 'card', networkProfile: 'low' });

    expect(result).toContain('/storage/v1/render/image/public/product-images/user/photo.jpg');
    expect(result).toContain('width=360');
    expect(result).toContain('quality=62');
    expect(result).toContain('resize=cover');
  });

  it('conserve une URL transformée stable hors ligne pour retrouver l’image mise en cache', () => {
    const result = getAdaptiveImageUrl(productUrl, { role: 'card', networkProfile: 'offline' });

    expect(result).toContain('/storage/v1/render/image/public/product-images/user/photo.jpg');
    expect(result).toContain('width=640');
    expect(result).toContain('quality=78');
  });

  it('ne transforme jamais une preuve de paiement', () => {
    const sensitive = 'https://example.supabase.co/storage/v1/object/public/payment-proofs/user/proof.jpg';
    expect(getAdaptiveImageUrl(sensitive, { role: 'gallery', networkProfile: 'normal' })).toBe(sensitive);
    expect(isPublicCacheableImage(sensitive)).toBe(false);
  });

  it('identifie uniquement les buckets médias publics autorisés', () => {
    expect(isPublicCacheableImage(productUrl)).toBe(true);
    expect(isPublicCacheableImage('https://images.example.com/photo.jpg')).toBe(false);
  });
});
