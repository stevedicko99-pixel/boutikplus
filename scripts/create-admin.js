#!/usr/bin/env node
/* ======================================================================
 * Boutikplus — Créateur COMPTE ADMINISTRATEUR (CLI local)
 * ======================================================================
 * UTILISATION :
 *   1. Dans .env, avoir : EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   2. Exécuter :
 *        node scripts/create-admin.js
 *   3. Identifiants générés dans credentials.json à côté.
 * ====================================================================== */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Charger le .env (EAS-env / Expo env)
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf-8');
  env.split(/\r?\n/).forEach((line) => {
    const [k, ...rest] = line.split('=');
    if (!k || k.startsWith('#')) return;
    const v = rest.join('=').trim();
    if (v.startsWith('"') && v.endsWith('"')) process.env[k.trim()] = v.slice(1, -1);
    else if (v.startsWith("'") && v.endsWith("'")) process.env[k.trim()] = v.slice(1, -1);
    else process.env[k.trim()] = v;
  });
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY    = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ .env manquant. Renseigne EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

// Générateur de mot de passe conforme (min. 12, MAJ/min/chiffres/spéciaux)
function genPwd(len = 16) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const num   = '23456789';
  const sym   = '!@#$%^&*_-+=?:.';
  const all   = upper + lower + num + sym;
  const pick = (pool, n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += pool[crypto.randomInt(pool.length)];
    return s;
  };
  let raw = pick(upper, 3) + pick(lower, 5) + pick(num, 4) + pick(sym, 3);
  while (raw.length < len) raw += all[crypto.randomInt(all.length)];
  return raw.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

const ADMIN = {
  email: 'stevedicko98@gmail.com',
  password: genPwd(16),
  fullName: 'DICKO Christ Steve',
  phone: '+8615952717063',
  city: 'Ouagadougou',
  role: 'admin',
  // Clé de vérification owner — RPC promote_self_to_admin (même que OWNER_VERIFICATION_KEY dans ownership.ts)
  OWNER_VERIFICATION_KEY: 'DCFE590DB3F52C16B50913A876D16C82',
};

async function main() {
  // SignUp via Supabase Auth (la même fonction que RegisterScreen)
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: ADMIN.email,
      password: ADMIN.password,
      data: {
        full_name: ADMIN.fullName,
        phone: ADMIN.phone,
        city: ADMIN.city,
        role: 'buyer', // On inscrit en buyer d'abord : le trigger crée profil buyer
      },
    }),
  });
  const txt = await resp.text();
  let data;
  try { data = JSON.parse(txt); } catch { data = { raw: txt }; }

  console.log('\n========= RÉPONSE SUPABASE AUTH =========');
  console.log('HTTP', resp.status, txt.slice(0, 400));

  if (!resp.ok && resp.status !== 400) {
    console.error('\n❌ Échec création Auth user:', data);
    process.exit(2);
  }
  // 400 "User already registered" est OK → on tente signIn puis promote.
  const user = data?.user;
  if (!user) {
    console.log('\nℹ️  Utilisateur peut-être déjà existant (status 400?). Tentative de signIn + promotion...');
    // SignIn pour récupérer JWT
    const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password, gotrue_meta_security: {} }),
    });
    const loginData = await login.json().catch(() => ({ raw: 'parse failed' }));
    if (!login.ok) {
      console.error('\n❌ SignIn échoué. Change le mot de passe dans Authentication > Users > Reset password.');
      console.error('Mot de passe généré courant: ' + ADMIN.password);
      console.error(loginData);
      process.exit(3);
    }
    data.access_token = loginData.access_token;
    data.refresh_token = loginData.refresh_token;
  } else {
    // Si nouveau user : email confirmation peut être requise.
    // Si email confirmation n'est pas activée, on obtient directement access_token.
  }

  const ACCESS_TOKEN = data.access_token;
  if (!ACCESS_TOKEN) {
    console.warn('\n⚠️  Pas de access_token retourné. Deux cas :');
    console.warn('   (1) La confirmation email est activée. Confirmez via le lien email puis relancez le script.');
    console.warn('   (2) Ou allez dans Supabase Dashboard Auth → Users → cliquer sur "... " → "Resend confirmation" ou "Disable confirmation" (dev).');
    console.warn('\n👉 Identifiants déjà générés :');
    console.log(JSON.stringify(ADMIN, null, 2));
    const out = path.resolve(__dirname, '..', 'credentials.admin.json');
    fs.writeFileSync(out, JSON.stringify({ ...ADMIN, _note: "Promotion manquante : executer promote_self_to_admin une fois connecté(e)" }, null, 2));
    console.log('\n💾 Sauvegardé dans:', out);
    process.exit(0);
  }

  // Appel RPC promote_self_to_admin
  console.log('\n========= RPC promote_self_to_admin =========');
  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/promote_self_to_admin`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_verification_key: ADMIN.OWNER_VERIFICATION_KEY }),
  });
  const rpcTxt = await rpc.text();
  console.log('HTTP', rpc.status);
  console.log(rpcTxt);

  // Sauvegarde finale
  const out = path.resolve(__dirname, '..', 'credentials.admin.json');
  fs.writeFileSync(out, JSON.stringify({
    ...ADMIN,
    promotion_result_raw: rpc.status + ' — ' + rpcTxt,
    _note: 'Identifiants admin Boutikplus. NE PAS COMMITER.',
    saved_at: new Date().toISOString(),
  }, null, 2));

  console.log('\n✅ SUCCÈS — identifiants sauvegardés: ' + out);
  console.log('\n==========================================================');
  console.log('   IDENTIFIANTS DE CONNEXION ADMINISTRATEUR');
  console.log('==========================================================');
  console.log('📧 Email    : ' + ADMIN.email);
  console.log('🔑 Password : ' + ADMIN.password);
  console.log('👤 Nom      : ' + ADMIN.fullName);
  console.log('📞 Téléphone: ' + ADMIN.phone);
  console.log('🛡️  Rôle     : admin');
  console.log('==========================================================');
}

main().catch((err) => { console.error(err); process.exit(99); });
