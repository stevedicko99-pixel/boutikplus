// ============================================================
// Tests unitaires — createShop : persistance du logo ET de la couverture
//
// Verrouille la correction du bug : à la création d'une boutique,
// la couverture (coverUrl) était uploadée vers Supabase Storage
// mais JAMAIS persistée en base (createShop ne l'acceptait pas).
// Désormais createShop insère banner_url = coverUrl.
//
// Vérifie que le payload d'insert contient bien :
//  - logo_url  (logo)
//  - banner_url (couverture — colonne réelle Supabase)
// ============================================================
import { createShop } from '@/lib/dataService';

// --- Mocks Supabase ---
const mockInsert = jest.fn();

jest.mock('@/lib/supabase', () => ({
  // isSupabaseConfigured = true pour forcer le chemin réel (pas demo)
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({
      insert: (...args: any[]) => {
        mockInsert(...args);
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: 'shop-new-123' },
                error: null,
              }),
          }),
        };
      },
    }),
  },
}));

// cacheService : stub minimal pour éviter les effets de bord
jest.mock('@/lib/cacheService', () => ({
  getOrSetCache: jest.fn(),
  TTL: {},
  cacheKeys: {},
}));

describe('createShop — persistance logo + couverture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('insère logo_url ET banner_url quand logo + cover sont fournis', async () => {
    const logoUrl = 'https://supabase.co/storage/v1/object/public/shop-logos/u/logo.jpg';
    const coverUrl = 'https://supabase.co/storage/v1/object/public/shop-covers/u/cover.jpg';

    const { shopId, error } = await createShop({
      ownerId: 'user-123',
      name: 'Faso Fashion',
      description: 'Mode wax authentique',
      categoryId: 'fashion',
      city: 'Ouagadougou',
      logoUrl,
      coverUrl,
    });

    expect(error).toBeNull();
    expect(shopId).toBe('shop-new-123');

    // Vérifie que insert() a reçu le payload avec logo_url ET banner_url
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const payload = mockInsert.mock.calls[0][0];
    expect(payload.logo_url).toBe(logoUrl);
    // banner_url est la colonne réelle Supabase (pas cover_url)
    expect(payload.banner_url).toBe(coverUrl);
  });

  it('insère banner_url = null quand aucune couverture n\'est fournie', async () => {
    await createShop({
      ownerId: 'user-123',
      name: 'Boutique sans couverture',
      description: '',
      categoryId: 'food',
      city: 'Bobo-Dioulasso',
      logoUrl: 'https://x/logo.jpg',
      // coverUrl volontairement omis
    });

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.banner_url).toBeNull();
    expect(payload.logo_url).toBe('https://x/logo.jpg');
  });

  it('insère banner_url quand seul le cover est fourni (sans logo)', async () => {
    const coverUrl = 'https://supabase.co/storage/v1/object/public/shop-covers/u/cover.jpg';

    await createShop({
      ownerId: 'user-123',
      name: 'Boutique cover only',
      description: '',
      categoryId: 'food',
      city: 'Koudougou',
      coverUrl,
    });

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.banner_url).toBe(coverUrl);
    expect(payload.logo_url).toBeNull();
  });
});
