// Migration : corriger les politiques RLS qui manquent OR is_admin()
// pour que l'admin puisse approuver/refuser/supprimer des boutiques.
// Également mettre à jour la fonction is_admin() pour gérer primary_role + roles[].

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error('❌ Variables Supabase manquantes.');
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

const SQL_FIX_IS_ADMIN = `
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND (
           COALESCE(p.role, '') IN ('admin', 'super_admin')
        OR COALESCE(p.primary_role, '') IN ('admin', 'super_admin')
        OR 'admin' = ANY(COALESCE(p.roles, ARRAY[]::TEXT[]))
        OR 'super_admin' = ANY(COALESCE(p.roles, ARRAY[]::TEXT[]))
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
`;

// Politiques qui manquent OR is_admin() pour deleteShop et autres actions admin
const SQL_FIX_POLICIES = `
-- shop_follows : admin doit pouvoir supprimer lors d'un deleteShop
DROP POLICY IF EXISTS follows_delete_self ON shop_follows;
CREATE POLICY follows_delete_self ON shop_follows FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- share_links
DROP POLICY IF EXISTS share_links_owner_all ON share_links;
CREATE POLICY share_links_owner_all ON share_links
  FOR ALL USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- discount_codes
DROP POLICY IF EXISTS discount_codes_owner_all ON discount_codes;
CREATE POLICY discount_codes_owner_all ON discount_codes
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

-- campaign_events
DROP POLICY IF EXISTS campaign_events_owner_read ON campaign_events;
CREATE POLICY campaign_events_owner_read ON campaign_events
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS campaign_events_owner_update ON campaign_events;
CREATE POLICY campaign_events_owner_update ON campaign_events
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

-- product_videos
DROP POLICY IF EXISTS product_videos_owner_all ON product_videos;
CREATE POLICY product_videos_owner_all ON product_videos
  FOR ALL USING (
    product_id IN (
      SELECT id FROM products
      WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    ) OR public.is_admin()
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM products
      WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    ) OR public.is_admin()
  );

-- reviews : ajouter is_admin() au DELETE (utile pour modération)
DROP POLICY IF EXISTS reviews_delete_self ON reviews;
CREATE POLICY reviews_delete_self ON reviews FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- promotions : déjà is_admin() ? On vérifie et on corrige
DROP POLICY IF EXISTS promos_owner_manage ON promotions;
CREATE POLICY promos_owner_manage ON promotions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = promotions.shop_id AND shops.owner_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = promotions.shop_id AND shops.owner_id = auth.uid())
    OR public.is_admin()
  );
`;

async function run() {
  console.log('🔧 Mise à jour fonction is_admin() et politiques RLS...');
  try {
    // Étape 1 : recréer is_admin
    const { error: e1 } = await supabase.rpc('exec_sql', { sql: SQL_FIX_IS_ADMIN }).catch(() => ({ error: 'rpc exec_sql indisponible' }));
    if (e1) {
      console.log('⚠️ RPC exec_sql indisponible, fallback via query...');
      // Fallback : essayer de passer par le query builder via une fonction
      const { error: e1b } = await supabase.from('profiles').select('id').limit(1);
      if (!e1b) console.log('✅ Connexion Supabase OK');
      // Utiliser .rpc avec un appel direct du SQL via une approche différente
      try {
        await supabase.from('_dummy').select().limit(1);
      } catch {}
    } else {
      console.log('✅ is_admin() recréée via RPC');
    }

    // Pour les environnements sans exec_sql, on applique via des requêtes préparées individuelles
    // en utilisant le SQL simple au travers de la table profiles (hack: utiliser from avec raw)
    // Meilleure approche : on renvoie le SQL à exécuter pour l'utilisateur via SQL Editor
    console.log('\n📋 SQL À EXÉCUTER DANS L\'ÉDITEUR SQL SUPABASE :\n');
    console.log(SQL_FIX_IS_ADMIN);
    console.log(SQL_FIX_POLICIES);

    console.log('\n✅ Script terminé. Copiez le SQL ci-dessus dans Supabase SQL Editor et exécutez-le.');
  } catch (e) {
    console.error('❌ Erreur:', e);
    process.exit(1);
  }
}

run();
