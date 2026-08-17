import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split(/\r?\n/).forEach((line) => {
    const [k, ...rest] = line.split('=');
    if (!k || k.startsWith('#')) return;
    const v = rest.join('=').trim();
    process.env[k.trim()] = v.replace(/^["']|["']$/g, '');
  });
}
const SBP = process.env.SUPABASE_ACCESS_TOKEN;
const PID = 'pxcymtjbbdrutqpbwfdo';
const r = await fetch(`https://api.supabase.com/v1/projects/${PID}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${SBP}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'SELECT id, name FROM categories ORDER BY id LIMIT 20;' }),
});
const d = await r.json();
console.log(JSON.stringify(d, null, 2));
