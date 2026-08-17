// ============================================================
// Tests unitaires — Pipeline upload Assistant IA
//
// Valide les corrections du bug critique (l'upload n'était JAMAIS
// exécuté) en mockant Supabase Storage et en vérifiant :
//  - uploadImage() appelle bien supabase.storage.upload()
//  - uploadImage() retourne null si utilisateur non authentifié
//  - uploadImage() retourne { url, path } si succès
//  - l'URL publique est bien construite
//  - le format MIME est image/jpeg
//  - le chemin est préfixé par userId (conformité RLS)
// ============================================================
import {
  isLocalMediaUri,
  UploadError,
  uploadImage,
  uploadMultipleImages,
  validateFile,
} from '@/lib/storage';

// --- Mocks Supabase ---
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    storage: {
      from: () => ({
        upload: (...args: any[]) => mockUpload(...args),
        getPublicUrl: (...args: any[]) => mockGetPublicUrl(...args),
      }),
    },
  },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file://compressed.jpg' }),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

describe('uploadImage — pipeline Supabase Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      blob: jest.fn().mockResolvedValue(new Blob(['image'])),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(5)),
    }) as jest.Mock;
  });

  it.each(['file://photo.jpg', 'content://photo/1', 'data:image/jpeg;base64,AA==', 'blob:https://app/photo'])(
    'détecte %s comme URI média locale',
    (uri) => expect(isLocalMediaUri(uri)).toBe(true),
  );

  it('ne considère pas une URL distante comme locale', () => {
    expect(isLocalMediaUri('https://cdn.example/photo.jpg')).toBe(false);
  });

  it('lève UploadError si l\'utilisateur n\'est pas authentifié (RLS)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(uploadImage('product-images', 'file://photo.jpg', 'test')).rejects.toMatchObject({
      name: 'UploadError',
      code: 'AUTH_REQUIRED',
    });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('upload vers le bucket product-images avec MIME image/jpeg', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    // Le mock reflète le path reçu (comportement réel Supabase)
    mockUpload.mockImplementation((path: string) =>
      Promise.resolve({ data: { path }, error: null }),
    );
    mockGetPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `https://supabase.co/storage/v1/object/public/product-images/${path}` },
    }));

    const result = await uploadImage('product-images', 'file://photo.jpg', 'test');

    expect(result).not.toBeNull();
    expect(result?.url).toContain('product-images');
    expect(result?.url).toContain('user-123');

    // Vérifie que upload() a bien été appelé avec le bon bucket + path + options
    expect(mockUpload).toHaveBeenCalledTimes(1);
    const [path, formData, options] = mockUpload.mock.calls[0];
    // Le path est préfixé par userId + nom généré (timestamp + random)
    expect(path).toEqual(expect.stringMatching(/^user-123\/test_\d+_[a-z0-9]+\.jpg$/));
    expect(result?.path).toBe(path);
    expect(options).toEqual(
      expect.objectContaining({
        contentType: 'image/jpeg',
        upsert: false,
      }),
    );
  });

  it('préfixe le chemin par userId (conformité RLS Storage)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'seller-abc' } } });
    mockUpload.mockResolvedValue({ data: { path: 'seller-abc/x.jpg' }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x.com/seller-abc/x.jpg' } });

    await uploadImage('product-images', 'file://p.jpg', 'img');

    const [path] = mockUpload.mock.calls[0];
    // RLS exige : (storage.foldername(name))[1] = auth.uid()::text
    expect(path.startsWith('seller-abc/')).toBe(true);
  });

  it('lève UploadError si Supabase renvoie une erreur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found', statusCode: '404' },
    });

    await expect(uploadImage('product-images', 'file://p.jpg', 'img')).rejects.toBeInstanceOf(UploadError);
  });

  it('génère un nom de fichier unique (timestamp + random)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUpload.mockImplementation((path: string) => Promise.resolve({ data: { path }, error: null }));
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x/u1/img_x.jpg' } });

    await uploadImage('product-images', 'file://p.jpg', 'prefix');
    await uploadImage('product-images', 'file://p.jpg', 'prefix');

    const path1 = mockUpload.mock.calls[0][0];
    const path2 = mockUpload.mock.calls[1][0];
    expect(path1).not.toBe(path2);
  });

  it('respecte le format produit et random6', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'seller-1' } } });
    mockUpload.mockImplementation((path: string) => Promise.resolve({ data: { path }, error: null }));
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x/image.jpg' } });

    const result = await uploadImage('product-images', 'file://p.jpg', 'prod_product-42');

    expect(result?.imageCode).toMatch(/^prod_product-42_\d+_[a-z0-9]{6}$/);
    expect(result?.path).toBe(`seller-1/${result?.imageCode}.jpg`);
    expect(result).toEqual(expect.objectContaining({ mimeType: 'image/jpeg', sizeBytes: 5 }));
  });

  it('réutilise exactement le même chemin pendant un retry transitoire', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUpload
      .mockResolvedValueOnce({ data: null, error: { message: 'network timeout' } })
      .mockImplementationOnce((path: string) => Promise.resolve({ data: { path }, error: null }));
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x/image.jpg' } });
    const progress = jest.fn();

    await uploadImage('payment-proofs', 'file://p.jpg', 'proof_order-1', progress, 20000, { maxRetries: 1 });

    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockUpload.mock.calls[0][0]).toBe(mockUpload.mock.calls[1][0]);
    expect(mockUpload.mock.calls[0][2].upsert).toBe(false);
    expect(mockUpload.mock.calls[1][2].upsert).toBe(true);
    expect(progress).toHaveBeenCalledTimes(1);
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ percent: 100 }));
  });

  it('conserve l’identité pour un retry manuel après échec', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUpload.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

    await expect(
      uploadImage('payment-proofs', 'file://p.jpg', 'proof_order-1', undefined, 20000, { maxRetries: 0 }),
    ).rejects.toMatchObject({
      uploadIdentity: {
        imageCode: expect.stringMatching(/^proof_order-1_\d+_[a-z0-9]{6}$/),
        path: expect.stringMatching(/^u1\/proof_order-1_\d+_[a-z0-9]{6}\.jpg$/),
      },
    });
  });

  it('valide les formats et la taille maximale de 10 Mo', () => {
    expect(validateFile({ type: 'image/webp', size: 10 * 1024 * 1024 })).toBeNull();
    expect(validateFile({ type: 'image/gif' })).toMatchObject({ code: 'UNSUPPORTED_TYPE' });
    expect(validateFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toMatchObject({
      code: 'FILE_TOO_LARGE',
    });
  });

  it('borne le batch à trois uploads et conserve l’ordre des résultats', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let active = 0;
    let maxActive = 0;
    mockUpload.mockImplementation(async (path: string) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return { data: { path }, error: null };
    });
    mockGetPublicUrl.mockImplementation((path: string) => ({ data: { publicUrl: `https://x/${path}` } }));

    const results = await uploadMultipleImages(
      'product-images',
      Array.from({ length: 7 }, (_, index) => `file://${index}.jpg`),
      'prod_p1',
      3,
    );

    expect(maxActive).toBe(3);
    expect(results).toHaveLength(7);
    results.forEach((result) => expect(result.url).toContain(result.path));
  });

  it('attend tous les workers avant de rejeter un batch partiellement échoué', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const completed: string[] = [];
    let uploadNumber = 0;
    mockUpload.mockImplementation(async (path: string) => {
      uploadNumber += 1;
      if (uploadNumber === 2) return { data: null, error: { message: 'permission denied' } };
      await new Promise((resolve) => setTimeout(resolve, 5));
      completed.push(path);
      return { data: { path }, error: null };
    });
    mockGetPublicUrl.mockImplementation((path: string) => ({ data: { publicUrl: `https://x/${path}` } }));

    await expect(
      uploadMultipleImages('product-images', ['file://ok.jpg', 'file://fail.jpg', 'file://last.jpg'], 'prod_p1', 3),
    ).rejects.toBeInstanceOf(UploadError);

    expect(completed).toHaveLength(2);
  });
});
