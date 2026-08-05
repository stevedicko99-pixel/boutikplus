// Applique la migration V5 (driver_offer_price) via l'API Supabase Management.
// Envoie le SQL complet en une seule requête (PSQL accepte les statements multiples).
// Usage : SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-migration-v5.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'pxcymtjbbdrutqpbwfdo';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN manquant. Définis la variable d\'env (PAT sbp_xxx).');
  process.exit(1);
}
const SQL_PATH = path.resolve(__dirname, '..', 'supabase', 'migrations', 'V5__driver_offer_price.sql');

const sql = fs.readFileSync(SQL_PATH, 'utf8');
console.log(`📄 SQL lu : ${sql.length} caractères`);

const uri = `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`;
console.log(`🚀 Envoi du SQL complet à ${uri}\n`);

try {
  const resp = await fetch(uri, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await resp.text();
  if (resp.ok) {
    console.log('✅ Migration V5 appliquée avec succès !');
    console.log(text.slice(0, 500));
    process.exit(0);
  } else {
    console.log(`❌ HTTP ${resp.status}`);
    console.log(text.slice(0, 1500));
    process.exit(1);
  }
} catch (e) {
  console.log(`❌ ${e.message}`);
  process.exit(1);
}
