// ============================================================
// Tests unitaires — aiResultHolder (singleton transfert résultat IA)
//
// Garantit que le pipeline upload IA → AddEditProduct fonctionne :
//  - setAIResult stocke le résultat
//  - consumeAIResult lit ET efface (one-shot)
//  - un second consume retourne null (pas de re-application)
//  - le holder accepte les données avec imageUrl (upload persisté)
// ============================================================
import { setAIResult, consumeAIResult, type AIProductResult } from '@/lib/aiResultHolder';

describe('aiResultHolder — transfert du résultat Assistant IA', () => {
  afterEach(() => {
    // Nettoyage : consomme tout résidu pour isoler les tests.
    consumeAIResult();
  });

  it('retourne null quand aucun résultat n\'a été stocké', () => {
    expect(consumeAIResult()).toBeNull();
  });

  it('stocke puis restitue le résultat à l\'identique', () => {
    const sample: AIProductResult = {
      name: 'Sac en pagne wax',
      description: 'Sac à main artisanal en wax authentique du Faso.',
      categoryId: 'fashion',
      price: 12500,
      imageUrl: 'https://supabase.co/storage/v1/object/public/product-images/user123/ai_prod_123.jpg',
    };

    setAIResult(sample);
    const consumed = consumeAIResult();

    expect(consumed).not.toBeNull();
    expect(consumed).toEqual(sample);
  });

  it('est one-shot : un second consume retourne null (évite la re-application)', () => {
    setAIResult({
      name: 'Test',
      description: 'desc',
      categoryId: 'cat',
      price: 1000,
    });

    const first = consumeAIResult();
    const second = consumeAIResult();

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('préserve l\'URL image uploadée (preuve que l\'upload est bien transmis)', () => {
    const url = 'https://supabase.co/storage/v1/object/public/product-images/u/ai_prod_xyz.jpg';
    setAIResult({
      name: 'Produit',
      description: 'Description',
      categoryId: 'c',
      price: 5000,
      imageUrl: url,
    });

    const consumed = consumeAIResult();
    expect(consumed?.imageUrl).toBe(url);
  });

  it('accepte un résultat sans imageUrl (rétro-compatibilité)', () => {
    setAIResult({
      name: 'Produit sans photo',
      description: 'desc',
      categoryId: 'c',
      price: 3000,
    });

    const consumed = consumeAIResult();
    expect(consumed?.imageUrl).toBeUndefined();
  });

  it('écrase un résultat précédent si setAIResult est rappelé', () => {
    setAIResult({ name: 'Premier', description: 'd1', categoryId: 'c1', price: 100 });
    setAIResult({ name: 'Second', description: 'd2', categoryId: 'c2', price: 200 });

    const consumed = consumeAIResult();
    expect(consumed?.name).toBe('Second');
    expect(consumed?.price).toBe(200);
  });
});
