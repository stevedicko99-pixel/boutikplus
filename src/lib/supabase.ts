// #region debug-point D:supabase-start
(() => {
  try {
    const { Platform } = require('react-native') as typeof import('react-native');
    if (Platform.OS !== 'web' && (globalThis as any).__dbg) {
      (globalThis as any).__dbg('D', 'supabase.ts:4', 'S0: supabase module évalué');
    }
  } catch {}
})();
// #endregion
import 'react-native-url-polyfill/auto';
// #region debug-point D:polyfill-ok
(() => { try { (globalThis as any).__dbg?.('D','supabase.ts:13','S1: react-native-url-polyfill imported'); } catch {} })();
// #endregion
import { createClient } from '@supabase/supabase-js';
import { secureStoreAdapter } from '@/lib/secureStoreAdapter';
// #region debug-point D:securestoreadapter-imported
(() => { try { (globalThis as any).__dbg?.('D','supabase.ts:18','S2: secureStoreAdapter imported (keystore non testé)'); } catch {} })();
// #endregion
import type { Database } from '@/types/database';

// Récupération des variables d'environnement (Expo public env)
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// #region debug-point E:env-vars
(() => {
  try {
    const dbg = (globalThis as any).__dbg;
    if (dbg) {
      dbg('E', 'supabase.ts:30', 'S3: EXPO_PUBLIC_ env vars', {
        hasUrl: Boolean(supabaseUrl),
        hasKey: Boolean(supabaseAnonKey),
        urlLen: supabaseUrl.length,
        keyLen: supabaseAnonKey.length,
        startsHttp: supabaseUrl.startsWith('http'),
      });
    }
  } catch {}
})();
// #endregion

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'),
);

// #region debug-point D:before-create-client
(() => { try { (globalThis as any).__dbg?.('D','supabase.ts:53','S4: createClient about to run'); } catch {} })();
// #endregion
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
// #region debug-point D:client-created
(() => {
  try {
    const dbg = (globalThis as any).__dbg;
    if (dbg) {
      dbg('D', 'supabase.ts:74', 'S5: createClient returned OK (no top-level throw)', {
        supabase: typeof supabase,
        authFn: typeof supabase?.auth?.signInWithPassword,
      });
    }
  } catch (e: any) {
    try { (globalThis as any).__dbg?.('D','supabase.ts:74','S5-ERR: createClient throw', { err: e?.message }); } catch {}
  }
})();
// #endregion
