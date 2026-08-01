// Adaptateur de stockage multiplateforme pour la persistance de session Supabase.
// À l'exécution, Metro résout automatiquement secureStoreAdapter.native.ts (natif)
// ou secureStoreAdapter.web.ts (web) en priorité sur ce fichier barrel.
// Ce barrel n'existe que pour TypeScript : on pointe vers la variante web dont les
// types sont identiques (même interface { getItem, setItem, removeItem }).
export { secureStoreAdapter } from './secureStoreAdapter.web';
