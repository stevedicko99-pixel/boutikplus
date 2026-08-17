// Même test que précédemment, mais on se CONNECTE en tant qu'USER AUTHENTIFIÉ
// et on utilise ACCESS_TOKEN USER (JWT gotrue) plutôt que ANON_KEY pour les uploads.
// C'est exactement ce que fait l'app : signIn + uploadImage via supabase.auth.user()
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

const ADMIN_EMAIL = 'stevedicko98@gmail.com';
const ADMIN_PASSWORD = 'iiJ&C42dSh$3f2S#';

function make1x1Jpeg() {
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

const BUCKETS = ['shop-logos', 'shop-covers', 'product-images'];

async function main() {
  if (!SUPABASE_URL || !ANON_KEY) { console.error('❌ env missing'); process.exit(1); }

  // 1. SIGN IN — obtenir vrai JWT user
  console.log('🔐 SignIn...');
  const signinResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      gotrue_meta_security: {},
    }),
  });
  const signin = await signinResp.json();
  if (!signinResp.ok) { console.error('❌ SignIn fail:', signin); process.exit(1); }
  const USER_JWT = signin.access_token;
  const USER_ID = signin.user.id;
  console.log('   ✅ Connecté:', USER_ID, signin.user.email);

  const jpeg = make1x1Jpeg();
  console.log(`\n🖼️ Image test JPEG: ${jpeg.length} bytes`);

  // 2. Upload vers chaque bucket avec le chemin {userId}/file.jpg (ce que fait storage.ts)
  for (const bucket of BUCKETS) {
    const fileName = `authtest_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.jpg`;
    const storagePath = `${USER_ID}/${fileName}`;
    const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`;

    const form = new FormData();
    form.append('file', new Blob([jpeg], { type: 'image/jpeg' }), fileName);

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${USER_JWT}`,
      },
      body: form,
    });
    const text = await r.text();
    console.log(`\n── ${bucket}/${storagePath.slice(0, 20)}... ──`);
    console.log(`   HTTP ${r.status} | ok=${r.ok}`);
    console.log(`   ${text.slice(0, 500)}`);

    if (r.ok) {
      // Récupérer l'URL publique
      const { data: pubUrlData } = await (await fetch(
        `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`,
        { method: 'HEAD', headers: { apikey: ANON_KEY } },
      ));
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
      console.log(`   ✅ Public URL: ${publicUrl}`);
    }
  }
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
