import { uploadPaymentProof } from '@/lib/dataService';

const mockRpc = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => mockMaybeSingle(),
        }),
      }),
    }),
  },
}));

jest.mock('@/lib/cacheService', () => ({
  getOrSetCache: jest.fn(),
  TTL: {},
  cacheKeys: {},
}));

describe('uploadPaymentProof — idempotence et réponse réseau incertaine', () => {
  const result = {
    payment_id: 'payment-1',
    payment_status: 'pending',
    order_status: 'proof_uploaded',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('retourne la ligne structurée renvoyée par la RPC', async () => {
    mockRpc.mockResolvedValue({ data: [result], error: null });

    await expect(
      uploadPaymentProof('order-1', 12500, 'orange_money', 'https://cdn/proof.jpg'),
    ).resolves.toEqual({ data: result, error: null });

    expect(mockRpc).toHaveBeenCalledWith('submit_payment_proof', {
      p_order_id: 'order-1',
      p_amount: 12500,
      p_operator: 'orange_money',
      p_proof_image_url: 'https://cdn/proof.jpg',
    });
  });

  it('réconcilie une erreur transitoire en relisant le paiement enregistré', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'network timeout' } });
    mockMaybeSingle.mockResolvedValue({
      data: { status: 'proof_uploaded', payment: [{ id: 'payment-1', status: 'pending' }] },
      error: null,
    });

    await expect(
      uploadPaymentProof('order-1', 12500, 'orange_money', 'https://cdn/proof.jpg'),
    ).resolves.toEqual({ data: result, error: null, uncertain: true });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it('retente une seule fois avec les mêmes paramètres si la relecture est vide', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'fetch failed' } })
      .mockResolvedValueOnce({ data: [result], error: null });

    const response = await uploadPaymentProof(
      'order-1',
      12500,
      'orange_money',
      'https://cdn/proof.jpg',
    );

    expect(response).toEqual({ data: result, error: null });
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc.mock.calls[0]).toEqual(mockRpc.mock.calls[1]);
  });

  it('ne retente pas une erreur fonctionnelle', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Le montant transmis ne correspond pas au montant de la commande' },
    });

    const response = await uploadPaymentProof(
      'order-1',
      12000,
      'orange_money',
      'https://cdn/proof.jpg',
    );

    expect(response.data).toBeNull();
    expect(response.error).toContain('montant');
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });
});
