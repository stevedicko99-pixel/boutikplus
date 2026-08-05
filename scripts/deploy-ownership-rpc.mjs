// ============================================================
// Déploiement automatique des fonctions RPC d'ownership sur Supabase
// Exécution : node scripts/deploy-ownership-rpc.mjs
// ============================================================
// Ce script se connecte directement au Postgres Supabase et crée :
//   - public.promote_self_to_admin(p_verification_key)
//   - public.get_ownership_status()
// Ces fonctions permettent au propriétaire légitime (DICKO Christ Steve)
// de s'auto-promouvoir en administrateur via la clé 128-bit.
// ============================================================
import pg from 'pg';

const { Client } = pg;

// Credentials lus depuis .env (ou hardcodés d'après .env)
const SUPABASE_DB_PASSWORD = 'RQVagLEXK2cjnZA8#v4U1P7f';
const PROJECT_REF = 'pxcymtjbbdrutqpbwfdo';
const REGION = 'eu-central-1';

// 3 stratégies de connexion (on essaie dans l'ordre)
const CONNECTION_STRINGS = [
  // 1. Session pooler (recommandé, IPv4 friendly)
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@aws-0-${REGION}.pooler.supabase.com:5432/postgres`,
  // 2. Transaction pooler (port 6543)
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@aws-0-${REGION}.pooler.supabase.com:6543/postgres`,
  // 3. Connexion directe (port 5432, IPv6 possible)
  `postgresql://postgres:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
];

const SQL_DEPLOY = `
-- ============================================================
-- 9. promote_self_to_admin(p_verification_key)
--    Permet au propriétaire légitime (DICKO Christ Steve) de s'auto-promouvoir
--    en administrateur via la clé de vérification 128-bit.
--    Clé : DCFE590DB3F52C16B50913A876D16C82 (même que OWNER_VERIFICATION_KEY)
--    Retourne : { success, message, new_role }
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_self_to_admin(
  p_verification_key TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_role TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_role TEXT;
  v_owner_name TEXT;
  c_LEGIT_KEY CONSTANT TEXT := 'DCFE590DB3F52C16B50913A876D16C82';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Utilisateur non authentifié'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF UPPER(TRIM(p_verification_key)) <> c_LEGIT_KEY THEN
    RETURN QUERY SELECT FALSE, 'Clé de vérification invalide'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT role::TEXT, full_name INTO v_current_role, v_owner_name
  FROM profiles WHERE id = v_user_id LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Profil introuvable'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_current_role = 'admin' THEN
    RETURN QUERY SELECT TRUE,
      ('Déjà administrateur: ' || COALESCE(v_owner_name, '#' || v_user_id::text))::TEXT,
      'admin'::TEXT;
    RETURN;
  END IF;

  UPDATE profiles
  SET role = 'admin'::user_role,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN QUERY SELECT TRUE,
    ('Promu admin: ' || COALESCE(v_owner_name, '#' || v_user_id::text))::TEXT,
    'admin'::TEXT;
END;
$$;

-- ============================================================
-- 10. get_ownership_status()
--    Mini-rapport de statut : rôle, nb d'admins, nb total d'utilisateurs.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ownership_status()
RETURNS TABLE(
  caller_id UUID,
  caller_role TEXT,
  caller_full_name TEXT,
  total_admins BIGINT,
  total_users BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    v_user_id,
    p.role::TEXT,
    p.full_name,
    (SELECT COUNT(*) FROM profiles WHERE role = 'admin')::BIGINT,
    (SELECT COUNT(*) FROM profiles)::BIGINT
  FROM profiles p WHERE p.id = v_user_id LIMIT 1;
END;
$$;

-- Revoke access au public anon, grant authenticated (sécurité additionnelle)
REVOKE EXECUTE ON FUNCTION public.promote_self_to_admin(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_self_to_admin(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_ownership_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ownership_status() TO authenticated;
`;

const SQL_VERIFY = `
SELECT
  p.proname AS function_name,
  l.lanname AS language,
  r.rolname AS owner,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN ('promote_self_to_admin', 'get_ownership_status')
ORDER BY p.proname;
`;

async function tryConnect(connStr, label) {
  const client = new Client({
    connectionString: connStr,
    connectionTimeoutMillis: 15000,
    // Désactiver SSL requête si le pooler le nécessite
    ssl: label.includes('direct') ? { rejectUnauthorized: false } : undefined,
  });
  try {
    await client.connect();
    console.log(`✅ Connexion OK via ${label}`);
    return client;
  } catch (e) {
    console.log(`❌ Échec ${label} : ${e.message.split('\n')[0]}`);
    try { await client.end(); } catch {}
    return null;
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Déploiement des fonctions RPC d\'ownership — Supabase');
  console.log('  Projet : pxcymtjbbdrutqpbwfdo (eu-central-1)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let client = null;
  let usedLabel = '';
  for (let i = 0; i < CONNECTION_STRINGS.length; i++) {
    const label = ['session-pooler', 'transaction-pooler', 'direct'][i];
    client = await tryConnect(CONNECTION_STRINGS[i], label);
    if (client) { usedLabel = label; break; }
  }

  if (!client) {
    console.error('\n🔴 Aucune connexion n\'a pu être établie.');
    console.error('   Causes possibles :');
    console.error('   - IP non autorisée (vérifie Dashboard > Authentication > Network restrictions)');
    console.error('   - Mot de passe DB modifié');
    console.error('   - Projet en pause');
    process.exit(1);
  }

  try {
    console.log('\n▶ Exécution du SQL de déploiement...');
    await client.query(SQL_DEPLOY);
    console.log('✅ Fonctions créées avec succès.\n');

    console.log('▶ Vérification des fonctions installées...');
    const res = await client.query(SQL_VERIFY);
    if (res.rows.length === 0) {
      console.error('🔴 Aucune fonction trouvée après création — vérifier les permissions.');
      process.exit(1);
    }
    console.log('┌──────────────────────────────┬──────────┬─────────┬───────────────┐');
    console.log('│ Function name                │ Language │ Owner   │ SecDef        │');
    console.log('├──────────────────────────────┼──────────┼─────────┼───────────────┤');
    for (const row of res.rows) {
      const name = row.function_name.padEnd(28);
      const lang = row.language.padEnd(8);
      const owner = row.owner.padEnd(7);
      const sd = String(row.security_definer).padEnd(13);
      console.log(`│ ${name} │ ${lang} │ ${owner} │ ${sd} │`);
    }
    console.log('└──────────────────────────────┴──────────┴─────────┴───────────────┘');

    console.log('\n▶ Test sanity : appel de get_ownership_status() sans user connecté...');
    try {
      const testRes = await client.query('SELECT * FROM public.get_ownership_status();');
      const row = testRes.rows[0];
      console.log(`   caller_id       : ${row.caller_id || '(null — attendu hors session auth)'}`);
      console.log(`   caller_role     : ${row.caller_role || '(null)'}`);
      console.log(`   caller_full_name: ${row.caller_full_name || '(null)'}`);
      console.log(`   total_admins    : ${row.total_admins}`);
      console.log(`   total_users     : ${row.total_users}`);
    } catch (e) {
      console.log(`   (attendu en direct SQL) : ${e.message.split('\n')[0]}`);
    }

    console.log('\n🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS.');
    console.log(`   Connexion utilisée : ${usedLabel}`);
    console.log('   Les 2 fonctions RPC sont prêtes à l\'emploi côté client.\n');
  } catch (e) {
    console.error('\n🔴 Erreur pendant le déploiement :', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
