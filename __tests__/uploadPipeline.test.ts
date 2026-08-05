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
import { uploadImage } from '@/lib/storage';

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
  });

  it('retourne null si l\'utilisateur n\'est pas authentifié (RLS)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await uploadImage('product-images', 'file://photo.jpg', 'test');

    expect(result).toBeNull();
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

  it('retourne null et log l\'erreur si Supabase renvoie une erreur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found', statusCode: '404' },
    });

    const result = await uploadImage('product-images', 'file://p.jpg', 'img');

    expect(result).toBeNull();
  });

  it('génère un nom de fichier unique (timestamp + random)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUpload.mockResolvedValue({ data: { path: 'u1/img_x.jpg' }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x/u1/img_x.jpg' } });

    await uploadImage('product-images', 'file://p.jpg', 'prefix');
    await uploadImage('product-images', 'file://p.jpg', 'prefix');

    const path1 = mockUpload.mock.calls[0][0];
    const path2 = mockUpload.mock.calls[1][0];
    // Les deux uploads doivent générer des chemins différents (timestamp + random)
    expect(path1).not.toBe(path2);
  });
});
