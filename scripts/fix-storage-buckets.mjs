// Crée/met à jour les buckets Storage Supabase via l'API SQL.
// - Lève les restrictions MIME (allowed_mime_types = NULL)
// - Augmente file_size_limit à 10MB pour shop-logos/shop-covers/product-images
// - S'assure que tous les buckets existent
//
// Usage : SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/fix-storage-buckets.mjs

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'pxcymtjbbdrutqpbwfdo';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN manquant. Définis la variable d\'env (PAT sbp_xxx).');
  process.exit(1);
}

const SQL = `
-- 1. Créer les buckets manquants
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('shop-logos', 'shop-logos', true, 10485760, NULL),
  ('shop-covers', 'shop-covers', true, 10485760, NULL),
  ('product-images', 'product-images', true, 10485760, NULL),
  ('payment-proofs', 'payment-proofs', true, 26214400, NULL),
  ('delivery-proofs', 'delivery-proofs', true, 26214400, NULL),
  ('profile-avatars', 'profile-avatars', true, 10485760, NULL),
  ('ai-source-images', 'ai-source-images', true, 10485760, NULL),
  ('driver-id-cards', 'driver-id-cards', false, 5242880, NULL),
  ('product-videos', 'product-videos', true, 26214400, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Mettre à jour les buckets existants : lever les restrictions MIME + augmenter la taille
UPDATE storage.buckets
SET
  file_size_limit = CASE
    WHEN id IN ('shop-logos', 'shop-covers', 'product-images', 'profile-avatars', 'ai-source-images') THEN 10485760
    WHEN id IN ('payment-proofs', 'delivery-proofs', 'product-videos') THEN 26214400
    ELSE 5242880
  END,
  allowed_mime_types = NULL,
  public = CASE WHEN id = 'driver-id-cards' THEN false ELSE true END
WHERE id IN ('shop-logos', 'shop-covers', 'product-images', 'payment-proofs', 'delivery-proofs', 'profile-avatars', 'ai-source-images', 'driver-id-cards', 'product-videos');

-- 3. Vérifier le résultat
SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY id;
`;

async function main() {
  console.log(`🔧 Mise à jour des buckets Storage pour le projet ${PROJECT_ID}\n`);

  const url = `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL }),
  });

  const text = await resp.text();
  if (resp.ok) {
    console.log('✅ Buckets mis à jour avec succès !');
    console.log(text.slice(0, 1000));
  } else {
    console.error(`❌ HTTP ${resp.status}:`);
    console.error(text.slice(0, 1000));
  }
}

main().catch((e) => {
  console.error('Erreur fatale:', e);
  process.exit(1);
});
