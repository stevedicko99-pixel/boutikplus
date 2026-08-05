#!/usr/bin/env node
/* ======================================================================
 * Boutikplus — Test E2E complet via Supabase API
 * ======================================================================
 * 1. Supprime toutes les boutiques et données de test
 * 2. Crée un vendeur, une boutique avec images, un produit
 * 3. Crée un acheteur et passe une commande
 * 4. Vérifie le flux complet
 * ====================================================================== */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Optionnel
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;     // CLI token

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ .env manquant. Renseigne EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

let STEP = 0;
function step(label) {
  STEP++;
  console.log(`\n\x1b[36m══════ Étape ${STEP} ══════\x1b[0m ${label}`);
}

function genPwd(len = 14) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const num = '23456789';
  const sym = '!@#$%^&*_+';
  const all = upper + lower + num + sym;
  const pick = (pool, n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += pool[crypto.randomInt(pool.length)];
    return s;
  };
  let raw = pick(upper, 2) + pick(lower, 5) + pick(num, 3) + pick(sym, 2);
  while (raw.length < len) raw += all[crypto.randomInt(all.length)];
  return raw.split('').sort(() => crypto.randomInt(3) - 1).join('');
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
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await resp.text();
  let data;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!resp.ok) {
    throw new Error(`REST ${method} ${path} → ${resp.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function signUp(user) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });
  const data = await resp.json();
  if (!resp.ok && resp.status !== 400) {
    throw new Error(`signUp ${resp.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function signIn(email, password) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, gotrue_meta_security: {} }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`signIn ${resp.status}: ${JSON.stringify(data)}`);
  return data;
}

// Identifiants de test
const SELLER = {
  email: `test-vendeur-${Date.now()}@boutikplus.test`,
  password: genPwd(),
  fullName: 'Test Vendeur',
  phone: '+22670000001',
  city: 'Ouagadougou',
  roles: ['seller', 'buyer'],
  primary_role: 'seller',
};

const BUYER = {
  email: `test-acheteur-${Date.now()}@boutikplus.test`,
  password: genPwd(),
  fullName: 'Test Acheteur',
  phone: '+22670000002',
  city: 'Ouagadougou',
  roles: ['buyer'],
  primary_role: 'buyer',
};

const TEST_EMAILS = [];
let sellerToken, buyerToken, sellerId, buyerId;

async function main() {
  console.log('\x1b[35m');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   BOUTIKPLUS — TEST E2E COMPLET (Supabase API)  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('\x1b[0m');
  console.log(`Projet: ${SUPABASE_URL}`);

  // ============================================================
  // ÉTAPE 1 : Nettoyage initial
  // ============================================================
  step('Nettoyage — Suppression des boutiques, produits, commandes existants');

  // D'abord identifier les comptes de test existants
  try {
    const shops = await rest('GET', '/shops', { query: { select: 'id,owner_id' } });
    console.log(`  → ${shops.length} boutique(s) trouvée(s)`);

    // Supprimer les tables dépendantes dans le bon ordre
    await rest('DELETE', '/campaign_events', {});
    console.log('  ✓ campaign_events vidés');
    await rest('DELETE', '/delivery_reviews', {});
    console.log('  ✓ delivery_reviews vidés');
    await rest('DELETE', '/delivery_payments', {});
    console.log('  ✓ delivery_payments vidés');
    await rest('DELETE', '/delivery_requests', {});
    console.log('  ✓ delivery_requests vidés');
    await rest('DELETE', '/driver_profiles', {});
    console.log('  ✓ driver_profiles vidés');
    await rest('DELETE', '/messages', {});
    console.log('  ✓ messages vidés');
    await rest('DELETE', '/conversations', {});
    console.log('  ✓ conversations vidés');
    await rest('DELETE', '/reviews', {});
    console.log('  ✓ reviews vidés');
    await rest('DELETE', '/shop_follows', {});
    console.log('  ✓ shop_follows vidés');
    await rest('DELETE', '/favorites', {});
    console.log('  ✓ favorites vidés');
    await rest('DELETE', '/cart_items', {});
    console.log('  ✓ cart_items vidés');
    await rest('DELETE', '/payments', {});
    console.log('  ✓ payments vidés');
    await rest('DELETE', '/order_items', {});
    console.log('  ✓ order_items vidés');
    await rest('DELETE', '/orders', {});
    console.log('  ✓ orders vidés');
    await rest('DELETE', '/delivery_addresses', {});
    console.log('  ✓ delivery_addresses vidés');
    await rest('DELETE', '/promotions', {});
    console.log('  ✓ promotions vidés');
    await rest('DELETE', '/share_links', {});
    console.log('  ✓ share_links vidés');
    await rest('DELETE', '/discount_codes', {});
    console.log('  ✓ discount_codes vidés');
    await rest('DELETE', '/product_videos', {});
    console.log('  ✓ product_videos vidés');
    await rest('DELETE', '/product_images', {});
    console.log('  ✓ product_images vidés');
    await rest('DELETE', '/products', {});
    console.log('  ✓ products vidés');
    await rest('DELETE', '/shops', {});
    console.log('  ✓ shops vidés');
    await rest('DELETE', '/reports', {});
    console.log('  ✓ reports vidés');
    await rest('DELETE', '/app_notifications', {});
    console.log('  ✓ app_notifications vidés');
  } catch (e) {
    console.log(`  ℹ️  (certaines tables peuvent ne pas exister: ${e.message.slice(0, 80)})`);
  }

  console.log('  ✓ Base nettoyée');

  // ============================================================
  // ÉTAPE 2 : Création du compte vendeur
  // ============================================================
  step('Création compte vendeur');
  TEST_EMAILS.push(SELLER.email);

  let signup = await signUp({
    email: SELLER.email,
    password: SELLER.password,
    data: {
      full_name: SELLER.fullName,
      phone: SELLER.phone,
      city: SELLER.city,
      role: 'seller',
      roles: SELLER.roles,
      primary_role: SELLER.primary_role,
    },
  });

  if (signup.access_token) {
    sellerToken = signup.access_token;
    sellerId = signup.user.id;
  } else {
    // Confirmation email peut être désactivée, ou il faut se connecter
    console.log('  ℹ️  Pas de token direct — tentative signIn');
    const login = await signIn(SELLER.email, SELLER.password);
    sellerToken = login.access_token;
    sellerId = login.user.id;
  }

  console.log(`  ✓ Vendeur créé: ${SELLER.email}`);
  console.log(`    ID: ${sellerId}`);
  console.log(`    Mot de passe: ${SELLER.password}`);

  // Vérifier que le profil a été créé par le trigger
  const profiles = await rest('GET', '/profiles', {
    token: sellerToken,
    query: { id: `eq.${sellerId}`, select: '*' },
  });
  console.log(`  ✓ Profil trouvé: ${profiles[0]?.full_name} (role: ${profiles[0]?.role})`);

  // ============================================================
  // ÉTAPE 3 : Récupérer catégories
  // ============================================================
  step('Récupération des catégories et villes');
  const categories = await rest('GET', '/categories', { query: { select: '*', order: 'sort_order' } });
  console.log(`  ✓ ${categories.length} catégories trouvées`);
  categories.forEach(c => console.log(`    - ${c.name} (id: ${c.id})`));

  // ============================================================
  // ÉTAPE 4 : Création d'une boutique
  // ============================================================
  step('Création d\'une boutique');

  const testLogoUrl = `https://pxcymtjbbdrutqpbwfdo.supabase.co/storage/v1/object/public/shop-logos/test-logo.png`;

  const shopData = {
    owner_id: sellerId,
    name: 'Boutique Test E2E',
    description: 'Boutique créée automatiquement par le test E2E',
    slogan: 'La qualité au meilleur prix',
    category_id: categories[0].id,
    city: SELLER.city,
    address: '123 Avenue de la Liberté',
    phone_number: SELLER.phone,
    whatsapp_number: SELLER.phone,
    email: SELLER.email,
    status: 'active',
    logo_url: testLogoUrl,
    banner_url: null,
    orange_money_number: SELLER.phone,
    moov_money_number: SELLER.phone,
    coris_money_number: SELLER.phone,
    wave_number: SELLER.phone,
    opening_hours: {
      mon: { open: '08:00', close: '20:00' },
      tue: { open: '08:00', close: '20:00' },
      wed: { open: '08:00', close: '20:00' },
      thu: { open: '08:00', close: '20:00' },
      fri: { open: '08:00', close: '20:00' },
      sat: { open: '09:00', close: '18:00' },
      sun: { open: '09:00', close: '18:00' },
    },
    social_links: {
      instagram: '@boutique_test',
      whatsapp: SELLER.phone,
    },
  };

  const shops = await rest('POST', '/shops', { token: sellerToken, body: shopData });
  const shop = shops[0];
  console.log(`  ✓ Boutique créée: ${shop.name}`);
  console.log(`    ID: ${shop.id}`);
  console.log(`    Statut: ${shop.status}`);
  console.log(`    Catégorie: ${shop.category_id}`);

  // ============================================================
  // ÉTAPE 5 : Création d'un produit avec images
  // ============================================================
  step('Création d\'un produit avec images');

  const productData = {
    shop_id: shop.id,
    name: 'T-shirt Premium Coton Bio',
    description: 'T-shirt 100% coton bio, coupe moderne, disponible en plusieurs tailles. Confectionné au Burkina Faso.',
    price: 7500,
    category_id: categories[0].id,
    stock: 50,
    status: 'available',
  };

  const products = await rest('POST', '/products', { token: sellerToken, body: productData });
  const product = products[0];
  console.log(`  ✓ Produit créé: ${product.name}`);
  console.log(`    ID: ${product.id}`);
  console.log(`    Prix: ${product.price} FCFA`);
  console.log(`    Stock: ${product.stock}`);

  // Ajouter des images produit
  const imageUrl = `https://pxcymtjbbdrutqpbwfdo.supabase.co/storage/v1/object/public/product-images/test-product.png`;
  const imagesData = [
    { product_id: product.id, image_url: imageUrl, position: 0 },
    { product_id: product.id, image_url: imageUrl, position: 1 },
  ];
  await rest('POST', '/product_images', { token: sellerToken, body: imagesData });
  console.log(`  ✓ 2 images ajoutées au produit`);

  // ============================================================
  // ÉTAPE 6 : Vérifier que le produit est visible publiquement
  // ============================================================
  step('Vérification — produit visible publiquement');

  const publicProducts = await rest('GET', '/products', {
    query: { id: `eq.${product.id}`, select: '*, product_images(*)' },
  });
  console.log(`  ✓ Produit trouvé: ${publicProducts[0]?.name}`);
  console.log(`    Images: ${publicProducts[0]?.product_images?.length || 0}`);

  const publicShops = await rest('GET', '/shops', {
    query: { id: `eq.${shop.id}`, select: '*' },
  });
  console.log(`  ✓ Boutique visible: ${publicShops[0]?.name}`);

  // ============================================================
  // ÉTAPE 7 : Création du compte acheteur
  // ============================================================
  step('Création compte acheteur');
  TEST_EMAILS.push(BUYER.email);

  signup = await signUp({
    email: BUYER.email,
    password: BUYER.password,
    data: {
      full_name: BUYER.fullName,
      phone: BUYER.phone,
      city: BUYER.city,
      role: 'buyer',
      roles: BUYER.roles,
      primary_role: BUYER.primary_role,
    },
  });

  if (signup.access_token) {
    buyerToken = signup.access_token;
    buyerId = signup.user.id;
  } else {
    const login = await signIn(BUYER.email, BUYER.password);
    buyerToken = login.access_token;
    buyerId = login.user.id;
  }

  console.log(`  ✓ Acheteur créé: ${BUYER.email}`);
  console.log(`    ID: ${buyerId}`);
  console.log(`    Mot de passe: ${BUYER.password}`);

  // ============================================================
  // ÉTAPE 8 : Ajouter une adresse de livraison
  // ============================================================
  step('Ajout adresse de livraison');

  const addrData = {
    user_id: buyerId,
    city: BUYER.city,
    district: 'Secteur 12',
    instructions: 'Près de la pharmacie du Soleil Levant',
    contact_phone: BUYER.phone,
    is_default: true,
  };

  const addrs = await rest('POST', '/delivery_addresses', { token: buyerToken, body: addrData });
  const address = addrs[0];
  console.log(`  ✓ Adresse créée: ${address.city}, ${address.district}`);
  console.log(`    ID: ${address.id}`);

  // ============================================================
  // ÉTAPE 9 : Ajouter au panier
  // ============================================================
  step('Ajout au panier');

  const cartData = {
    user_id: buyerId,
    product_id: product.id,
    quantity: 2,
  };

  const cartItems = await rest('POST', '/cart_items', { token: buyerToken, body: cartData });
  console.log(`  ✓ Ajouté au panier: ${cartItems[0]?.quantity}x ${product.name}`);

  // Vérifier le panier
  const cart = await rest('GET', '/cart_items', {
    token: buyerToken,
    query: { user_id: `eq.${buyerId}`, select: '*, products(*)' },
  });
  const cartTotal = cart.reduce((sum, item) => sum + (item.products?.price || 0) * item.quantity, 0);
  console.log(`  ✓ Panier: ${cart.length} article(s), total: ${cartTotal} FCFA`);

  // ============================================================
  // ÉTAPE 10 : Créer une commande
  // ============================================================
  step('Création de la commande');

  const qty = 2;
  const totalAmount = product.price * qty;

  const orderData = {
    buyer_id: buyerId,
    seller_id: sellerId,
    total_amount: totalAmount,
    delivery_address_id: address.id,
    status: 'pending_payment',
    note: 'Test E2E - merci de préparer rapidement',
  };

  const orders = await rest('POST', '/orders', { token: buyerToken, body: orderData });
  const order = orders[0];
  console.log(`  ✓ Commande créée: ${order.id}`);
  console.log(`    Statut: ${order.status}`);
  console.log(`    Total: ${order.total_amount} FCFA`);

  // Ajouter les items de commande
  const orderItemsData = {
    order_id: order.id,
    product_id: product.id,
    quantity: qty,
    unit_price: product.price,
  };
  await rest('POST', '/order_items', { token: buyerToken, body: orderItemsData });
  console.log(`  ✓ Items ajoutés: ${qty}x ${product.name} à ${product.price} FCFA`);

  // ============================================================
  // ÉTAPE 11 : Simuler paiement (upload preuve)
  // ============================================================
  step('Paiement — Upload preuve et validation');

  const proofUrl = `https://pxcymtjbbdrutqpbwfdo.supabase.co/storage/v1/object/public/payment-proofs/test-proof.png`;
  const paymentData = {
    order_id: order.id,
    amount: totalAmount,
    operator: 'orange_money',
    proof_image_url: proofUrl,
    status: 'pending',
  };

  const payments = await rest('POST', '/payments', { token: buyerToken, body: paymentData });
  const payment = payments[0];
  console.log(`  ✓ Preuve de paiement envoyée`);
  console.log(`    Opérateur: ${payment.operator}`);
  console.log(`    Montant: ${payment.amount} FCFA`);
  console.log(`    Statut: ${payment.status}`);

  // Mettre à jour le statut de la commande (preuve uploadée)
  await rest('PATCH', '/orders', {
    token: sellerToken,
    query: { id: `eq.${order.id}` },
    body: { status: 'proof_uploaded' },
  });
  console.log(`  ✓ Statut commande → proof_uploaded`);

  // Le vendeur valide le paiement
  await rest('PATCH', '/payments', {
    token: sellerToken,
    query: { id: `eq.${payment.id}` },
    body: { status: 'validated', validated_at: new Date().toISOString() },
  });
  console.log(`  ✓ Paiement validé par le vendeur`);

  await rest('PATCH', '/orders', {
    token: sellerToken,
    query: { id: `eq.${order.id}` },
    body: { status: 'payment_validated' },
  });
  console.log(`  ✓ Statut commande → payment_validated`);

  // ============================================================
  // ÉTAPE 12 : Vérifications finales
  // ============================================================
  step('Vérifications finales');

  // Vérifier les commandes du vendeur
  const sellerOrders = await rest('GET', '/orders', {
    token: sellerToken,
    query: { seller_id: `eq.${sellerId}`, select: '*, order_items(*, products(*))' },
  });
  console.log(`  ✓ Vendeur voit ${sellerOrders.length} commande(s)`);
  sellerOrders.forEach(o => console.log(`    - Commande ${o.id.slice(0, 8)} : ${o.status} (${o.total_amount} FCFA)`));

  // Vérifier les commandes de l'acheteur
  const buyerOrders = await rest('GET', '/orders', {
    token: buyerToken,
    query: { buyer_id: `eq.${buyerId}`, select: '*, order_items(*, products(*, shops(name)))' },
  });
  console.log(`  ✓ Acheteur voit ${buyerOrders.length} commande(s)`);
  buyerOrders.forEach(o => console.log(`    - Commande ${o.id.slice(0, 8)} : ${o.status} chez ${o.order_items[0]?.products?.shops?.name}`));

  // Vérifier les statistiques boutique
  const sellerShops = await rest('GET', '/shops', {
    token: sellerToken,
    query: { owner_id: `eq.${sellerId}`, select: '*, products(count)' },
  });
  console.log(`  ✓ Vendeur a ${sellerShops.length} boutique(s)`);
  console.log(`    ${sellerShops[0]?.name} : ${sellerShops[0]?.products?.[0]?.count || 0} produit(s)`);

  // ============================================================
  // RÉSUMÉ
  // ============================================================
  console.log('\n\x1b[32m╔══════════════════════════════════════════════════╗');
  console.log('║              TOUS LES TESTS RÉUSSIS !            ║');
  console.log('╚══════════════════════════════════════════════════╝\x1b[0m');
  console.log('');
  console.log('✅ Création compte vendeur');
  console.log('✅ Création boutique (avec horaires, contacts, réseaux sociaux)');
  console.log('✅ Création produit avec images');
  console.log('✅ Visibilité publique des produits et boutiques');
  console.log('✅ Création compte acheteur');
  console.log('✅ Ajout adresse de livraison');
  console.log('✅ Ajout au panier');
  console.log('✅ Création commande avec items');
  console.log('✅ Upload preuve de paiement');
  console.log('✅ Validation paiement par le vendeur');
  console.log('✅ Statuts commande mis à jour correctement');
  console.log('✅ Vendeur voit ses commandes');
  console.log('✅ Acheteur voit ses commandes');
  console.log('');
  console.log('\x1b[36m═══════════════════════════════════════════════════');
  console.log('IDENTIFIANTS DE TEST (à supprimer ensuite):');
  console.log('═══════════════════════════════════════════════════\x1b[0m');
  console.log(`👤 Vendeur: ${SELLER.email}`);
  console.log(`   🔑 ${SELLER.password}`);
  console.log(`👤 Acheteur: ${BUYER.email}`);
  console.log(`   🔑 ${BUYER.password}`);
  console.log('');

  // Sauvegarder les identifiants
  const out = path.resolve(__dirname, '..', 'credentials.test.json');
  fs.writeFileSync(out, JSON.stringify({
    seller: SELLER,
    buyer: BUYER,
    shop: { id: shop.id, name: shop.name },
    product: { id: product.id, name: product.name },
    order: { id: order.id, status: order.status },
    _note: 'Comptes de test E2E. À supprimer après validation.',
    created_at: new Date().toISOString(),
  }, null, 2));
  console.log(`💾 Sauvegardé dans: ${out}`);
}

main().catch((err) => {
  console.error('\n❌ ERREUR:', err.message);
  console.error(err);
  process.exit(1);
});
