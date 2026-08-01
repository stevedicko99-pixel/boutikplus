// ============================================================
// Edge Function : create-checkout-session
// Boutikplus — Crée une session de paiement CinetPay pour une commande
// ============================================================
// POST /functions/v1/create-checkout-session
// Headers: Authorization: Bearer <JWT>
// Body: { orderId: string, amount: number, customerName: string, customerPhone: string }
//
// Sécurité :
//   - verify_jwt = true (l'utilisateur doit être authentifié)
//   - Vérification que l'orderId appartient bien à l'utilisateur connecté
//
// Variables d'environnement requises (Supabase Dashboard > Edge Functions > Secrets) :
//   - CINETPAY_API_KEY    (clé API CinetPay, côté serveur — JAMAIS côté client)
//   - CINETPAY_SITE_ID    (identifiant marchand CinetPay)
//   - CINETPAY_NOTIFY_URL (URL de webhook pour confirmation serveur)
//   - APP_URL             (URL de l'app pour redirect après paiement)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

interface CheckoutRequest {
  orderId: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
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
  const cinetpayApiKey = Deno.env.get("CINETPAY_API_KEY");
  const cinetpaySiteId = Deno.env.get("CINETPAY_SITE_ID");
  const notifyUrl = Deno.env.get("CINETPAY_NOTIFY_URL");
  const appUrl = Deno.env.get("APP_URL") ?? "https://boutikplus.app";

  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ error: "Configuration serveur manquante" }, 500);
  }
  if (!cinetpayApiKey || !cinetpaySiteId) {
    return json({ error: "Paiement non configuré (CinetPay)" }, 503);
  }

  // Client Supabase avec service_role pour lecture/écriture sans RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Extraction du JWT pour identifier l'utilisateur
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);

  if (userErr || !userData.user) {
    return json({ error: "Non authentifié" }, 401);
  }
  const buyerId = userData.user.id;

  let body: CheckoutRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corps de requête invalide (JSON attendu)" }, 400);
  }

  const { orderId, amount } = body;
  if (!orderId || typeof amount !== "number" || amount <= 0) {
    return json({ error: "Paramètres manquants: orderId, amount requis" }, 400);
  }

  // Vérifie que la commande appartient bien à l'acheteur
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, buyer_id, total_amount, status")
    .eq("id", orderId)
    .eq("buyer_id", buyerId)
    .single();

  if (orderErr || !order) {
    return json({ error: "Commande introuvable ou non autorisée" }, 404);
  }

  if (order.total_amount !== amount) {
    return json({
      error: `Montant incohérent: attendu ${order.total_amount}, reçu ${amount}`,
    }, 400);
  }

  // Crée la session CinetPay
  const transactionId = `BP-${orderId.slice(0, 8)}-${Date.now()}`;
  const payload = {
    apikey: cinetpayApiKey,
    site_id: cinetpaySiteId,
    transaction_id: transactionId,
    amount: String(amount),
    currency: "XOF",
    description: `Commande Boutikplus ${orderId.slice(0, 8)}`,
    return_url: `${appUrl}/payment/success?order=${orderId}`,
    cancel_url: `${appUrl}/payment/cancel?order=${orderId}`,
    notify_url: notifyUrl,
    customer_name: body.customerName ?? "Client Boutikplus",
    customer_phone: body.customerPhone ?? "",
    metadata: JSON.stringify({ orderId, buyerId }),
  };

  try {
    const cinetpayRes = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const cinetpayData = await cinetpayRes.json();

    if (!cinetpayData.status || cinetpayData.status !== "accept") {
      return json({
        error: "CinetPay a refusé la session",
        details: cinetpayData.message ?? "Erreur inconnue",
      }, 502);
    }

    return json({
      paymentUrl: cinetpayData.data.payment_url,
      transactionId,
    }, 200);
  } catch (err) {
    console.error("CinetPay checkout error:", err);
    return json({ error: "Erreur de communication avec CinetPay" }, 502);
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
