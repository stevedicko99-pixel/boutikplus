jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { parsePersistedCart } from '@/context/CartContext';

const line = (id: string) => ({
  product: { id, name: `Produit ${id}`, price: 1000, shop_id: 'shop-1' },
  quantity: 1,
});

describe('persistance et sélection du panier', () => {
  it('migre les anciennes données constituées uniquement du tableau d’articles', () => {
    const restored = parsePersistedCart(JSON.stringify([line('p1')]));

    expect(restored.version).toBe(2);
    expect(restored.items).toHaveLength(1);
    expect(restored.allSelected).toBe(true);
    expect(restored.selectedIds).toEqual([]);
    expect(restored.includeDelivery).toBe(true);
  });

  it('restaure les options persistées et réconcilie les identifiants sélectionnés', () => {
    const restored = parsePersistedCart(JSON.stringify({
      version: 2,
      items: [line('p1'), line('p2')],
      selectedIds: ['p2', 'supprimé', 'p2'],
      allSelected: false,
      includeDelivery: false,
    }));

    expect(restored.items.map((item) => item.product.id)).toEqual(['p1', 'p2']);
    expect(restored.selectedIds).toEqual(['p2']);
    expect(restored.allSelected).toBe(false);
    expect(restored.includeDelivery).toBe(false);
  });

  it('ignore selectedIds en mode tout sélectionné', () => {
    const restored = parsePersistedCart(JSON.stringify({
      version: 2,
      items: [line('p1')],
      selectedIds: ['p1'],
      allSelected: true,
      includeDelivery: true,
    }));

    expect(restored.selectedIds).toEqual([]);
    expect(restored.allSelected).toBe(true);
  });
});
