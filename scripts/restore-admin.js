#!/usr/bin/env node
/* ======================================================================
 * Boutikplus — Restauration compte admin
 * ====================================================================== */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const ADMIN_EMAIL = 'stevedicko98@gmail.com';
const ADMIN_FULL_NAME = 'DICKO Christ Steve';
const ADMIN_PHONE = '+8615952717063';
const ADMIN_CITY = 'Ouagadougou';
const OWNER_VERIFICATION_KEY = 'DCFE590DB3F52C16B50913A876D16C82';

function genPwd(len = 16) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const num = '23456789';
  const sym = '!@#$%^&*_-+=?:.';
  const all = upper + lower + num + sym;
  const pick = (pool, n) => { let s = ''; for (let i = 0; i < n; i++) s += pool[crypto.randomInt(pool.length)]; return s; };
  let raw = pick(upper, 3) + pick(lower, 5) + pick(num, 4) + pick(sym, 3);
  while (raw.length < len) raw += all[crypto.randomInt(all.length)];
  return raw.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

async function main() {
  const newPwd = genPwd(16);
  console.log('🔑 Nouveau mot de passe:', newPwd);

  // 1. Lister les utilisateurs pour trouver l'admin
  console.log('\n1. Recherche de l\'utilisateur admin...');
  const listResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ACCESS_TOKEN}` },
  });
  const users = await listResp.json();
  const adminAuth = users.users?.find(u => u.email === ADMIN_EMAIL);

  if (!adminAuth) {
    console.log('   Utilisateur non trouvé. Création...');
    const signupResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: newPwd,
        email_confirm: true,
        user_metadata: { full_name: ADMIN_FULL_NAME, phone: ADMIN_PHONE, city: ADMIN_CITY, role: 'buyer' },
      }),
    });
    const signupData = await signupResp.json();
    console.log('   ✅ Utilisateur créé:', signupData.id);
    adminAuthId = signupData.id;
  } else {
    console.log('   ✅ Utilisateur trouvé:', adminAuth.id);
    adminAuthId = adminAuth.id;
    // Mettre à jour le mot de passe
    console.log('   Réinitialisation du mot de passe...');
    const updateResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${adminAuth.id}`, {
      method: 'PUT',
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPwd, email_confirm: true }),
    });
    const updateData = await updateResp.json();
    console.log('   ✅ Mot de passe réinitialisé');
  }

  // 2. Se connecter pour obtenir un access_token
  console.log('\n2. Connexion...');
  const loginResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: newPwd, gotrue_meta_security: {} }),
  });
  const loginData = await loginResp.json();
  if (!loginResp.ok) {
    console.error('❌ Échec connexion:', loginData);
    process.exit(1);
  }
  const userToken = loginData.access_token;
  const userId = loginData.user.id;
  console.log('   ✅ Connecté. ID:', userId);

  // 3. Vérifier/créer le profil
  console.log('\n3. Vérification du profil...');
  const profileResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${userToken}` },
  });
  const profiles = await profileResp.json();

  if (!profiles || profiles.length === 0) {
    console.log('   Profil manquant. Création...');
    const createProfileResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        id: userId,
        full_name: ADMIN_FULL_NAME,
        phone: ADMIN_PHONE,
        city: ADMIN_CITY,
        role: 'buyer',
      }),
    });
    const profileData = await createProfileResp.json();
    if (createProfileResp.ok) {
      console.log('   ✅ Profil créé');
    } else {
      console.log('   ⚠️  Profil auto-créé par trigger ou erreur:', JSON.stringify(profileData).slice(0, 100));
    }
  } else {
    console.log('   ✅ Profil existant:', profiles[0].full_name);
  }

  // 4. Promouvoir en admin via RPC
  console.log('\n4. Promotion au rôle admin...');
  const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/promote_self_to_admin`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_verification_key: OWNER_VERIFICATION_KEY }),
  });
  const rpcTxt = await rpcResp.text();
  console.log('   HTTP', rpcResp.status, rpcTxt.slice(0, 200));

  // 5. Vérifier le rôle
  console.log('\n5. Vérification du rôle...');
  const checkResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role,full_name`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${userToken}` },
  });
  const checkData = await checkResp.json();
  console.log('   Rôle actuel:', checkData[0]?.role);

  console.log('\n═══════════════════════════════════════');
  console.log('✅ COMPTE ADMIN RESTAURÉ');
  console.log('═══════════════════════════════════════');
  console.log('📧 Email    :', ADMIN_EMAIL);
  console.log('🔑 Password :', newPwd);
  console.log('👤 Nom      :', ADMIN_FULL_NAME);
  console.log('🛡️  Rôle     : admin');
  console.log('═══════════════════════════════════════');

  // Sauvegarder
  const out = path.resolve(__dirname, '..', 'credentials.admin.json');
  fs.writeFileSync(out, JSON.stringify({
    email: ADMIN_EMAIL,
    password: newPwd,
    fullName: ADMIN_FULL_NAME,
    phone: ADMIN_PHONE,
    city: ADMIN_CITY,
    role: 'admin',
    saved_at: new Date().toISOString(),
  }, null, 2));
  console.log('\n💾 Sauvegardé dans:', out);
}

let adminAuthId;
main().catch(err => { console.error('❌', err); process.exit(1); });
