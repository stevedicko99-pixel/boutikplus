// ============================================================
// Edge Function : send-push-notification
// Boutikplus — Envoie une notification push via Expo Push Notifications
// ============================================================
// POST /functions/v1/send-push-notification
// Headers: Authorization: Bearer <JWT>
// Body:
//   { userId: string, title: string, body: string, data?: Record<string, unknown> }
//
// Sécurité :
//   - verify_jwt = true
//   - Seuls les admins ou les triggers serveur peuvent appeler cette fonction
//   - Le push token est stocké dans la table profiles (champ push_token)
//
// Variables d'environnement requises :
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   - EXPO_PUSH_TOKEN (optionnel, pour l'authentification Expo si quota dépassé)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ error: "Configuration serveur manquante" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const { userId, title, body: messageBody, data } = body;

  if (!userId || !title || !messageBody) {
    return json({ error: "userId, title, body requis" }, 400);
  }

  const authorization = req.headers.get("Authorization");
  const jwt = authorization?.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Authentification requise" }, 401);

  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) return json({ error: "Session invalide" }, 401);

  const { data: caller } = await supabase
    .from("profiles")
    .select("role, primary_role, roles")
    .eq("id", authData.user.id)
    .single();
  const roles = Array.isArray(caller?.roles) ? caller.roles : [];
  const isAdmin = [caller?.role, caller?.primary_role, ...roles].some((role) =>
    role === "admin" || role === "super_admin"
  );
  if (authData.user.id !== userId && !isAdmin) {
    return json({ error: "Envoi non autorisé" }, 403);
  }

  // NOTE: Le push token Expo doit être stocké dans profiles.push_token.
  // Si la colonne n'existe pas encore, ajoutez-la via :
  //   ALTER TABLE profiles ADD COLUMN push_token TEXT;
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", userId)
    .single();

  if (profileErr || !profile) {
    return json({ error: "Utilisateur introuvable" }, 404);
  }

  const pushToken = (profile as { push_token?: string }).push_token;
  if (!pushToken || !/^Expo(nent)?PushToken\[.+\]$/.test(pushToken)) {
    // Pas de token = l'utilisateur n'a pas activé les notifications. Ce n'est pas une erreur.
    return json({ sent: false, reason: "no_push_token" }, 200);
  }

  // Envoi via Expo Push API
  const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify([{
      to: pushToken,
      title,
      body: messageBody,
      data: data ?? {},
      sound: "default",
      priority: "high",
      channelId: "default",
    }]),
  });

  const pushData = await pushRes.json();

  if (pushData.errors && pushData.errors.length > 0) {
    console.error("Expo push error:", pushData.errors);
    return json({ sent: false, error: pushData.errors[0]?.message ?? "Erreur push" }, 502);
  }

  return json({ sent: true, ticket: pushData.data?.[0] }, 200);
});

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
