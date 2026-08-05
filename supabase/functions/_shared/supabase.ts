// ============================================================
// Supabase shared client helper for Edge Functions
// ============================================================
// Usage (optionnel — préfère l'import direct via esm.sh si besoin) :
//   import { createClient } from "supabase";
// ============================================================
// Tous nos Edge Functions utilisent l'import ESM direct :
//   import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Ce fichier existe pour satisfaire l'alias "supabase" dans deno.json
// (import map) et éviter l'erreur CLI :
//   ENOENT: no such file or directory, lstat '.../_shared/supabase.ts'
// ============================================================

export { createClient } from "@supabase/supabase-js";
export type { SupabaseClient } from "@supabase/supabase-js";
