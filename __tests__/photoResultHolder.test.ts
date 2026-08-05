// ============================================================
// Tests unitaires — photoResultHolder (singleton transfert Studio Photo)
//
// Garantit que le flux Studio Photo → AddEditProduct fonctionne :
//  - setPhotoResult stocke le résultat (URI éditée + index)
//  - consumePhotoResult lit ET efface (one-shot)
//  - un second consume retourne null (pas de re-application)
//  - l'editIndex est préservé (remplacement d'une image existante)
//  - l'editIndex undefined est préservé (ajout d'une nouvelle image)
//
// Cause racine du bug historique : navigation.navigate(returnTo, params)
// créait une race condition avec le cleanup des params. Le holder singleton
// est robuste sur web (Alert.alert no-op) et natif.
// ============================================================
import {
  setPhotoResult,
  consumePhotoResult,
  type PhotoStudioResult,
} from '@/lib/photoResultHolder';

describe('photoResultHolder — transfert du résultat Studio Photo', () => {
  afterEach(() => {
    // Nettoyage : consomme tout résidu pour isoler les tests.
    consumePhotoResult();
  });

  it('retourne null quand aucun résultat n\'a été stocké', () => {
    expect(consumePhotoResult()).toBeNull();
  });

  it('stocke puis restitue le résultat à l\'identique', () => {
    const sample: PhotoStudioResult = {
      editedUri: 'file:///cache/edited_photo_123.jpg',
      editIndex: 2,
    };

    setPhotoResult(sample);
    const consumed = consumePhotoResult();

    expect(consumed).not.toBeNull();
    expect(consumed).toEqual(sample);
  });

  it('est one-shot : un second consume retourne null (évite la re-application)', () => {
    setPhotoResult({
      editedUri: 'file:///cache/photo.jpg',
      editIndex: 0,
    });

    const first = consumePhotoResult();
    const second = consumePhotoResult();

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('préserve editIndex pour le remplacement d\'une image existante', () => {
    setPhotoResult({
      editedUri: 'file:///cache/replace.jpg',
      editIndex: 3,
    });

    const consumed = consumePhotoResult();
    expect(consumed?.editIndex).toBe(3);
  });

  it('préserve editIndex undefined pour l\'ajout d\'une nouvelle image', () => {
    setPhotoResult({
      editedUri: 'file:///cache/new.jpg',
      // editIndex volontairement omis = ajout
    });

    const consumed = consumePhotoResult();
    expect(consumed?.editIndex).toBeUndefined();
    expect(consumed?.editedUri).toBe('file:///cache/new.jpg');
  });

  it('écrase un résultat précédent si setPhotoResult est rappelé', () => {
    setPhotoResult({ editedUri: 'file:///first.jpg', editIndex: 0 });
    setPhotoResult({ editedUri: 'file:///second.jpg', editIndex: 1 });

    const consumed = consumePhotoResult();
    expect(consumed?.editedUri).toBe('file:///second.jpg');
    expect(consumed?.editIndex).toBe(1);
  });
});
