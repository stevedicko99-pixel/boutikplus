// ============================================================
// Holder singleton pour transmettre le résultat de l'Assistant IA
// vers AddEditProductScreen.
//
// Pourquoi un singleton ?
// React Navigation ne permet pas de passer des fonctions (callbacks)
// dans les params sur web (sérialisation). Un holder en mémoire
// évite ce problème et fonctionne sur toutes les plateformes.
//
// Usage :
//   - AIProductAssistantScreen.handleApply() → setAIResult(data) + goBack()
//   - AddEditProductScreen.useFocusEffect() → consumeAIResult()
//     (consomme = lit ET efface pour éviter la re-application au prochain focus)
// ============================================================

export interface AIProductResult {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  /** @deprecated Utiliser imageUrls pour supporter le multi-images. */
  imageUrl?: string;
  /** URLs des images produit générées/uploadées par l'assistant IA. */
  imageUrls?: string[];
}

let lastResult: AIProductResult | null = null;

export function setAIResult(result: AIProductResult): void {
  lastResult = result;
}

/** Lit et efface le résultat (one-shot). Retourne null si aucun résultat en attente. */
export function consumeAIResult(): AIProductResult | null {
  const r = lastResult;
  lastResult = null;
  return r;
}
