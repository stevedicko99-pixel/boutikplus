// Bootstrap DEBUG — DOIT ÊTRE IMPORTÉ EN PREMIER (avant gesture-handler).
// Raison : les imports ES6 sont hoistés ; ce fichier va exécuter ses beacons
// DÈS que le bundle commence à évaluer App.tsx (premier module importé).
//
// Test de l'hypothèse H2 : savoir si le bundle evalue même App.tsx.
// Si beacon B0 arrive, on sait que le bundle a démarré.
// Si beacon B1 arrive après gesture-handler, on sait que gh n'a pas crashé.
// etc.
//
// NOTE : On utilise XMLHttpRequest SYNCHRONE (fetch est asynchrone et ne
// s'exécute que si l'event loop démarre, ce qui n'est pas garanti si le
// bridge a throw). XHR sync est le seul moyen de transporter l'information
// AVANT que le JS ne quitte le top-level.

import { Platform } from 'react-native';

// Debug Server URLs — teste dans l'ordre, s'arrête au premier qui répond.
// 1. 127.0.0.1:7777 via ADB reverse (adb reverse tcp:7777 tcp:7777) — tél. branché USB
// 2. 10.248.239.25:7777 via Wi-Fi local — même réseau Wi-Fi (non VPN)
// 3. Fallback vers ngrok/public si disponible (plus tard)
const DEBUG_SERVER_URLS = [
  'http://127.0.0.1:7777/event',
  'http://10.248.239.25:7777/event',
];
const DEBUG_SESSION_ID = 'android-white-screen';

let xhrFallback = false;
function sendBeaconSync(hypothesisId: string, location: string, msg: string, data: Record<string, any> = {}) {
  if (Platform.OS === 'web') return;
  let lastErr: any = null;
  for (const DEBUG_SERVER_URL of DEBUG_SERVER_URLS) {
    try {
      // eslint-disable-next-line no-undef
      const XHR = (globalThis as any).XMLHttpRequest;
      if (!XHR) { xhrFallback = true; return; }
      const x = new XHR();
      // sync false utilisé pour éviter que le JS freeze si le port est fermé.
      try { x.open('POST', DEBUG_SERVER_URL, /* async: */ false); x.timeout = 500; } catch { lastErr = 'open-fail'; continue; }
      try { x.setRequestHeader('Content-Type', 'application/json'); } catch {}
      const body = JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        runId: 'pre',
        hypothesisId,
        location,
        msg: `[DEBUG] ${msg}`,
        data: { ...data, platform: Platform.OS, ts: Date.now() },
        ts: Date.now(),
      });
      try { x.send(body); return; } catch (e: any) { lastErr = e?.code || e?.message || 'send-fail'; }
    } catch (e: any) { lastErr = e?.message || 'xhr-throw'; }
  }
  // Si on arrive ici, aucune URL n'a fonctionné. On log en console natif pour adb logcat.
  try { console.warn('[DBG BEACON FAILED]', { lastErr, location, msg }); } catch {}
}

// #region debug-point A:bootstrap
try {
  sendBeaconSync('A', 'debug-bootstrap.ts:33', 'B0: top-level eval started — bundle executable');
} catch {}
// #endregion

// Re-export + appeler immédiatement après chaque import critique depuis App.tsx.
// Exposé aussi sur globalThis pour que supabase.ts / secureStoreAdapter.native.ts
// (qui n'ont pas accès à cet import) puissent émettre des beacons.
export function __dbg(h: string, loc: string, msg: string, d: Record<string, any> = {}) {
  sendBeaconSync(h, loc, msg, d);
}
try { (globalThis as any).__dbg = __dbg; } catch {}

// #region debug-point A:bootstrap-ready
try {
  sendBeaconSync('A', 'debug-bootstrap.ts:49', 'B0.1: debug bootstrap ready');
} catch {}
// #endregion

export const DEBUGGING_ACTIVE = true;
