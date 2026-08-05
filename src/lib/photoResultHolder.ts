// ============================================================
// Holder singleton pour transférer le résultat du PhotoStudio
// vers AddEditProductScreen.
//
// Plus robuste que navigation.navigate(params) car :
//  - Pas de race condition avec le cleanup des params
//  - Fonctionne sur web (où Alert.alert est un no-op)
//  - One-shot : consomme = lit + efface (pas de re-application)
// ============================================================

export interface PhotoStudioResult {
  /** URI locale (file:// ou blob: ou data:) de l'image éditée */
  editedUri: string;
  /** Index de l'image à remplacer (undefined = ajout nouveau) */
  editIndex?: number;
}

let lastResult: PhotoStudioResult | null = null;

export function setPhotoResult(result: PhotoStudioResult): void {
  lastResult = result;
}

/** Lit et efface le résultat (one-shot). Retourne null si aucun résultat en attente. */
export function consumePhotoResult(): PhotoStudioResult | null {
  const r = lastResult;
  lastResult = null;
  return r;
}
