#!/usr/bin/env node
/* ======================================================================
 * Boutikplus — Nettoyage après test E2E
 * ======================================================================
 * Supprime toutes les données créées par les tests et les comptes de test.
 * ====================================================================== */
const fs = require('node:fs');
const path = require('node:path');

// Charger le .env
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

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ .env manquant');
  process.exit(1);
}

async function rest(method, path, { body, token, query } = {}) {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${token || ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
  const resp = await fetch(`${SUPABASE_URL}/rest/v1${path}${qs}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await resp.text();
  let data;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!resp.ok) throw new Error(`REST ${method} ${path} → ${resp.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

// Supprimer un utilisateur via l'API admin (si token disponible)
async function deleteUser(userId) {
  if (!ACCESS_TOKEN) {
    console.log(`  ⚠️  Pas de SUPABASE_ACCESS_TOKEN - utilisateur ${userId} non supprimé de auth.users`);
    return;
  }
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (resp.ok) console.log(`  ✓ Utilisateur ${userId.slice(0, 8)} supprimé`);
  else console.log(`  ⚠️  Échec suppression ${userId.slice(0, 8)}: ${resp.status}`);
}

async function main() {
  console.log('\x1b[35m╔══════════════════════════════════════════════════╗');
  console.log('║       NETTOYAGE APRÈS TESTS E2E                   ║');
  console.log('╚══════════════════════════════════════════════════╝\x1b[0m\n');

  // 1. Récupérer les profils créés par les tests
  console.log('🔍 Récupération des profils de test...');
  const allProfiles = await rest('GET', '/profiles', { query: { select: 'id,full_name' } });
  const testProfiles = allProfiles.filter(p => p.full_name?.includes('Test '));
  console.log(`  → ${testProfiles.length} profil(s) de test trouvé(s)`);

  // 2. Vider toutes les tables de données (dans le bon ordre)
  console.log('\n🗑️  Suppression de toutes les données...');

  const tablesToClean = [
    'campaign_events', 'delivery_reviews', 'delivery_payments',
    'delivery_requests', 'driver_profiles', 'messages', 'conversations',
    'reviews', 'shop_follows', 'favorites', 'cart_items', 'payments',
    'order_items', 'orders', 'delivery_addresses', 'promotions',
    'share_links', 'discount_codes', 'product_videos', 'product_images',
    'products', 'shops', 'reports', 'app_notifications',
  ];

  for (const table of tablesToClean) {
    try {
      await rest('DELETE', `/${table}`, {});
      console.log(`  ✓ ${table} vidé(s)`);
    } catch (e) {
      // Table peut ne pas exister
    }
  }

  // 3. Supprimer les profils de test
  if (testProfiles.length > 0) {
    console.log('\n🗑️  Suppression des profils de test...');
    for (const profile of testProfiles) {
      try {
        await rest('DELETE', '/profiles', { query: { id: `eq.${profile.id}` } });
        console.log(`  ✓ Profil ${profile.full_name} supprimé`);
      } catch (e) {
        console.log(`  ⚠️  ${profile.full_name}: ${e.message.slice(0, 60)}`);
      }
      await deleteUser(profile.id);
    }
  }

  // 4. Vérification finale
  console.log('\n📊 Vérification finale...');
  const shops = await rest('GET', '/shops', { query: { select: 'count' } });
  const products = await rest('GET', '/products', { query: { select: 'count' } });
  const orders = await rest('GET', '/orders', { query: { select: 'count' } });
  const categories = await rest('GET', '/categories', { query: { select: 'count' } });

  console.log(`  Boutiques: ${shops.length}`);
  console.log(`  Produits: ${products.length}`);
  console.log(`  Commandes: ${orders.length}`);
  console.log(`  Catégories: ${categories.length} (conservées)`);

  console.log('\n\x1b[32m✅ NETTOYAGE TERMINÉ !\x1b[0m');
  console.log('   La base est remise à neuf (seules les catégories sont conservées).\n');
}

main().catch((err) => {
  console.error('\n❌ ERREUR:', err.message);
  process.exit(1);
});
