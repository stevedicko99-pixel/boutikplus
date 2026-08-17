import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const SBP = process.env.SUPABASE_ACCESS_TOKEN;
const PID = process.env.SUPABASE_PROJECT_ID || 'pxcymtjbbdrutqpbwfdo';
if (!SBP) { console.error('missing SUPABASE_ACCESS_TOKEN'); process.exit(1); }

const mgmt = async (sql) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PID}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SBP}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const t = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(t) }; }
  catch { return { ok: res.ok, status: res.status, data: t }; }
};

const KEEP = 'Constance Bridge';
const UID = 'ca0ca983-f224-49b9-9604-f773d652260c';

async function main() {
  console.log('1) MAJ profil admin...');
  const r1 = await mgmt(`
    UPDATE profiles SET
      full_name = 'DICKO Christ Steve',
      phone = '+8615952717063',
      city = 'Ouagadougou',
      roles = ARRAY['admin','seller','buyer']::TEXT[],
      primary_role = 'admin',
      role = 'admin'
    WHERE id = '${UID}';
    SELECT id, full_name, role, primary_role, roles FROM profiles WHERE id = '${UID}';
  `);
  console.log('   ->', r1.status, JSON.stringify(r1.data).slice(0, 400));
  if (!r1.ok) process.exit(1);

  console.log('\n2) Liste boutiques...');
  const r2 = await mgmt(`SELECT id, name FROM shops ORDER BY name;`);
  console.log('   ->', r2.status);
  const shops = Array.isArray(r2.data) ? r2.data : [];
  for (const s of shops) console.log(`      - ${s.name} (${s.id})`);

  let keep = shops.find(s => (s.name || '').trim() === KEEP)
          || shops.find(s => (s.name || '').trim() === 'Constant Bridge');
  if (!keep) {
    console.log(`\n   ⚠️  Aucune "${KEEP}" trouvée. Pas de suppression.`);
  } else {
    const toDelete = shops.filter(s => s.id !== keep.id);
    console.log(`\n3) Supprime ${toDelete.length} boutiques, garde "${keep.name}"...`);
    if (toDelete.length === 0) {
      console.log('   -> rien à faire');
    } else {
      const ids = toDelete.map(s => `'${s.id}'`).join(', ');
      const r3 = await mgmt(`DELETE FROM shops WHERE id IN (${ids}); SELECT id, name FROM shops ORDER BY name;`);
      console.log('   ->', r3.status);
      const rest = Array.isArray(r3.data) ? r3.data : [];
      for (const s of rest) console.log(`      ✅ ${s.name}`);
    }
  }

  console.log('\n✅ Done.');
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
