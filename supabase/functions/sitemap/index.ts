// ============================================================
// Edge Function : sitemap
// Boutikplus — Génère un sitemap.xml dynamique pour le SEO
// ============================================================
// GET /functions/v1/sitemap
// (Public — aucune authentification requise)
//
// Variables d'environnement requises (Supabase Dashboard > Edge Functions > Secrets) :
//   - APP_URL  (URL publique de l'app, ex: https://boutikplus.app)
//              Défaut : https://boutikplus.app si non défini
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

interface ShopRow {
  id: string;
  updated_at: string | null;
}

interface ProductRow {
  id: string;
  updated_at: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Méthode non autorisée</error>`,
      {
        status: 405,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          ...CORS_HEADERS,
        },
      }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = Deno.env.get("APP_URL") ?? "https://boutikplus.vercel.app";

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      buildSitemapXml(appUrl, [], []),
      {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          ...CORS_HEADERS,
        },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: shops, error: shopsErr }, { data: products, error: productsErr }] =
    await Promise.all([
      supabase
        .from("shops")
        .select("id, updated_at")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(10000)
        .returns<ShopRow[]>(),
      supabase
        .from("products")
        .select("id, updated_at")
        .eq("status", "available")
        .order("updated_at", { ascending: false })
        .limit(50000)
        .returns<ProductRow[]>(),
    ]);

  const safeShops: ShopRow[] = shopsErr || !shops ? [] : shops;
  const safeProducts: ProductRow[] = productsErr || !products ? [] : products;

  return new Response(
    buildSitemapXml(appUrl, safeShops, safeProducts),
    {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        ...CORS_HEADERS,
      },
    }
  );
});

function buildSitemapXml(
  appUrl: string,
  shops: ShopRow[],
  products: ProductRow[]
): string {
  const today = new Date().toISOString().slice(0, 10);

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  parts.push(
    `<url><loc>${escapeXml(appUrl)}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`
  );

  for (const shop of shops) {
    const lastmod = shop.updated_at
      ? shop.updated_at.slice(0, 10)
      : today;
    parts.push(
      `<url><loc>${escapeXml(appUrl)}/s/${escapeXml(shop.id)}</loc><lastmod>${escapeXml(lastmod)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    );
  }

  for (const product of products) {
    const lastmod = product.updated_at
      ? product.updated_at.slice(0, 10)
      : today;
    parts.push(
      `<url><loc>${escapeXml(appUrl)}/p/${escapeXml(product.id)}</loc><lastmod>${escapeXml(lastmod)}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    );
  }

  parts.push('</urlset>');
  return parts.join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
