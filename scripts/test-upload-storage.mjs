// Test d'upload d'une image 1x1 pixel JPEG vers shop-logos et shop-covers.
// Émule exactement ce que fait uploadImage sur web (FormData + URI blob/data).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Créer une image JPEG minimale (1x1 pixel blanc, ~700 bytes)
function make1x1Jpeg() {
  // Entête JPEG minimal valide + bloc SOS 1x1 pixel
  const hex =
    'FFD8FFE000104A46494600010100000100010000FFDB004300080606070605080707070909080A0C14' +
    '0D0C0B0B0C1912130F141D1A1F1E1D1A1C1C20242E2720222C231C1C2837292C30313434341F27393D' +
    '38323C2E333432FFC0000B080001000101011100FFC4001F0000010501010101010100000000000000' +
    '000102030405060708090A0BFFC400B5100002010303020403050504040000017D0102030004110512' +
    '2131410613516107227114328191A1082342B1C11552D1F02433627282090A161718191A2526272829' +
    '2A3435363738393A434445464748494A535455565758595A636465666768696A737475767778797A' +
    '838485868788898A92939495969798999AA2A3A4A5A6A7A8A9AAB2B3B4B5B6B7B8B9BAC2C3C4C5C6C7' +
    'C8C9CAD2D3D4D5D6D7D8D9DAE1E2E3E4E5E6E7E8E9EAF1F2F3F4F5F6F7F8F9FAFFDA000C0301000211' +
    '0311003F00D2CF20FFD9';
  return Buffer.from(hex, 'hex');
}

const BUCKETS = ['shop-logos', 'shop-covers', 'product-images', 'profile-avatars', 'ai-source-images'];

async function upload(bucket, jpegBuf) {
  const userId = 'test-user-' + crypto.randomBytes(4).toString('hex');
  const fileName = `test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.jpg`;
  const storagePath = `${userId}/${fileName}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`;

  // 1. FormData "RN style" — { uri, name, type }
  // 2. FormData "browser style" — Blob
  // On teste avec Blob (ce que le nouveau storage.ts produit).
  const form = new FormData();
  form.append('file', new Blob([jpegBuf], { type: 'image/jpeg' }), fileName);

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: form,
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text: text.slice(0, 400) };
}

async function listBucket(bucket) {
  const url = `${SUPABASE_URL}/storage/v1/object/list/${bucket}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ limit: 1000, offset: 0 }),
  });
  const text = await r.text();
  try { return { ok: r.ok, status: r.status, data: JSON.parse(text) }; }
  catch { return { ok: r.ok, status: r.status, data: text }; }
}

async function main() {
  if (!SUPABASE_URL || !ANON_KEY) { console.error('❌ env missing'); process.exit(1); }
  const jpeg = make1x1Jpeg();
  console.log(`Image test JPEG 1x1 générée : ${jpeg.length} bytes\n`);

  for (const bucket of BUCKETS) {
    console.log(`── Bucket: ${bucket} ──`);
    const up = await upload(bucket, jpeg);
    console.log(`  upload: HTTP ${up.status} | ok=${up.ok} | ${up.text}`);
    const ls = await listBucket(bucket);
    console.log(`  list  : HTTP ${ls.status} | count=${Array.isArray(ls.data) ? ls.data.length : JSON.stringify(ls.data).slice(0, 200)}`);
    console.log('');
  }
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
