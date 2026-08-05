// ============================================================
// Edge Function : removebg-proxy
// Boutikplus — Proxy serveur vers l'API Remove.bg (détourage d'images)
// ============================================================
// POST /functions/v1/removebg-proxy
// Headers: Authorization: Bearer <JWT>
// Body:
//   { image_url: string, size?: 'auto'|'preview'|'regular'|'hd', format?: 'auto'|'png'|'jpg' }
//   OU
//   { image_file_b64: string (base64 pur, sans préfixe data:), size?, format? }
//
// Sécurité :
//   - Authentification JWT requise (verify_jwt = true)
//   - La clé API Remove.bg reste côté serveur (JAMAIS exposée au client)
//
// Réponse :
//   Succès (200) : { result_data_url: string }  — image découpée en data URL base64
//   Erreur : { error: string, status?: number, details?: unknown }
//
// Variables d'environnement requises (Supabase Dashboard > Edge Functions > Secrets) :
//   - REMOVEBG_API_KEY  (clé API Remove.bg, côté serveur — JAMAIS côté client)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

type RemoveBgSize = "auto" | "preview" | "regular" | "hd";
type RemoveBgFormat = "auto" | "png" | "jpg";

interface RemoveBgRequest {
  image_url?: string;
  image_file_b64?: string;
  size?: RemoveBgSize;
  format?: RemoveBgFormat;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Méthode non autorisée" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const removeBgApiKey = Deno.env.get("REMOVEBG_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ error: "Configuration serveur manquante" }, 500);
  }
  if (!removeBgApiKey) {
    return json({ error: "IA non configurée (REMOVEBG_API_KEY serveur)" }, 503);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);

  if (userErr || !userData.user) {
    return json({ error: "Non authentifié" }, 401);
  }

  let body: RemoveBgRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corps de requête invalide (JSON attendu)" }, 400);
  }

  const { image_url, image_file_b64 } = body;
  const hasUrl = typeof image_url === "string" && image_url.trim().length > 0;
  const hasB64 = typeof image_file_b64 === "string" && image_file_b64.trim().length > 0;

  if (!hasUrl && !hasB64) {
    return json({
      error: "Paramètres manquants: image_url ou image_file_b64 requis",
    }, 400);
  }
  if (hasUrl && hasB64) {
    return json({
      error: "Paramètres incompatibles: fournir image_url OU image_file_b64, pas les deux",
    }, 400);
  }

  if (hasB64 && image_file_b64!.length > 8_000_000) {
    return json({
      error: "Image trop volumineuse (max ~6Mo en base64)",
    }, 413);
  }

  const size: RemoveBgSize =
    body.size === "preview" || body.size === "regular" || body.size === "hd"
      ? body.size
      : "auto";

  const format: RemoveBgFormat =
    body.format === "png" || body.format === "jpg" ? body.format : "auto";

  const form = new FormData();
  if (hasUrl) {
    form.append("image_url", image_url!.trim());
  } else {
    form.append("image_file_b64", image_file_b64!.trim());
  }
  form.append("size", size);
  form.append("format", format);

  try {
    const removeBgRes = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": removeBgApiKey,
      },
      body: form,
    });

    if (!removeBgRes.ok) {
      let details: unknown;
      try {
        details = await removeBgRes.json();
      } catch {
        details = await removeBgRes.text().catch(() => "(réponse non lisible)");
      }
      return json({
        error: "Remove.bg API error",
        status: removeBgRes.status,
        details,
      }, 502);
    }

    const blob = await removeBgRes.blob();
    const contentType =
      removeBgRes.headers.get("content-type") || "image/png";

    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const b64 = btoa(binary);
    const result_data_url = `data:${contentType};base64,${b64}`;

    return json({ result_data_url }, 200);
  } catch (err) {
    console.error("removebg-proxy error:", err);
    return json({
      error: "Remove.bg API error",
      status: 0,
      details: err instanceof Error ? err.message : String(err),
    }, 502);
  }
});

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}
