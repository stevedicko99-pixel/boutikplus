// ============================================================
// Edge Function : mistral-proxy
// Boutikplus — Proxy serveur vers l'API Mistral (chat completions)
// ============================================================
// POST /functions/v1/mistral-proxy
// Headers: Authorization: Bearer <JWT>
// Body: {
//   systemPrompt: string,
//   userPrompt: string,
//   maxTokens?: number (défaut 1200, max 8000),
//   temperature?: number (défaut 0.75),
//   responseFormat?: 'json_object' | 'text' (défaut 'json_object'),
//   model?: string (défaut 'mistral-tiny')
// }
//
// Sécurité :
//   - JWT requis (utilisateur Supabase authentifié)
//   - maxTokens borné à 8000 (rate-limit / sanity cap)
//   - Clé API Mistral côté serveur UNIQUEMENT (jamais exposée au client)
//
// Variables d'environnement requises (Supabase Dashboard > Edge Functions > Secrets) :
//   - MISTRAL_API_KEY    (clé API Mistral, côté serveur — JAMAIS côté client)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

interface MistralProxyRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: "json_object" | "text";
  model?: string;
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
  const mistralApiKey = Deno.env.get("MISTRAL_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ error: "Configuration serveur manquante" }, 500);
  }
  if (!mistralApiKey) {
    return json({ error: "IA non configurée (MISTRAL_API_KEY serveur)" }, 503);
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

  let body: MistralProxyRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corps de requête invalide (JSON attendu)" }, 400);
  }

  const { systemPrompt, userPrompt } = body;
  if (
    !systemPrompt ||
    !userPrompt ||
    typeof systemPrompt !== "string" ||
    typeof userPrompt !== "string"
  ) {
    return json({ error: "Paramètres manquants: systemPrompt, userPrompt requis (chaînes)" }, 400);
  }

  const maxTokens = typeof body.maxTokens === "number" ? body.maxTokens : 1200;
  const temperature = typeof body.temperature === "number" ? body.temperature : 0.75;
  const responseFormat = body.responseFormat === "text" ? "text" : "json_object";
  const model = typeof body.model === "string" && body.model.length > 0 ? body.model : "mistral-tiny";

  if (maxTokens > 8000) {
    return json({ error: "maxTokens doit être ≤ 8000" }, 400);
  }

  const mistralPayload: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat === "json_object") {
    mistralPayload.response_format = { type: "json_object" };
  }

  try {
    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mistralApiKey}`,
      },
      body: JSON.stringify(mistralPayload),
    });

    const mistralData = await mistralRes.json();

    if (!mistralRes.ok) {
      return json(
        {
          error: "Erreur de communication avec Mistral",
          details: mistralData,
        },
        502,
      );
    }

    const content = mistralData?.choices?.[0]?.message?.content ?? "";

    return json(
      {
        content,
        usage: mistralData.usage,
        model: mistralData.model ?? model,
      },
      200,
    );
  } catch (err) {
    console.error("Mistral proxy error:", err);
    return json(
      {
        error: "Erreur de communication avec Mistral",
        details: err instanceof Error ? err.message : String(err),
      },
      502,
    );
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
