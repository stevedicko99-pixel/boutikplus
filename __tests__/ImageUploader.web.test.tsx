import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { ImageUploader } from '@/components/upload/ImageUploader';
import { pickAndCompressImage, uploadImage } from '@/lib/storage';

jest.mock('@/context/ConnectivityContext', () => ({
  useConnectivity: () => ({ isOnline: true }),
}));

jest.mock('@/lib/storage', () => ({
  pickAndCompressImage: jest.fn(),
  pickMultipleImages: jest.fn(),
  uploadImage: jest.fn(),
  deleteStorageObject: jest.fn(),
  validateFile: jest.fn().mockReturnValue(null),
  isLocalMediaUri: (uri: string) => uri.startsWith('file:'),
  UploadError: class UploadError extends Error {},
}));

jest.mock('@/lib/photoStudio', () => ({ pickWithChoice: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }));

describe('ImageUploader sur Web', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    jest.clearAllMocks();
    (pickAndCompressImage as jest.Mock).mockResolvedValue({ uri: 'file://proof.jpg' });
    (uploadImage as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('ouvre directement la galerie sans Alert intermédiaire', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText } = render(
      <ImageUploader bucket="payment-proofs" addLabel="Ajouter la preuve" />,
    );

    fireEvent.press(getByLabelText('Ajouter la preuve'));

    await waitFor(() => expect(pickAndCompressImage).toHaveBeenCalledWith(false));
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
