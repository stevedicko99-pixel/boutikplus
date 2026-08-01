// ============================================================
// Edge Function : payment-webhook
// Boutikplus — Webhook de confirmation paiement CinetPay
// ============================================================
// POST /functions/v1/payment-webhook
// Aucun JWT requis (verify_jwt = false) car appelé par CinetPay.
//
// Sécurité (anti-falsification) :
//   On ne fait JAMAIS confiance au corps du webhook seul. Le statut du
//   paiement est re-vérifié via un appel serveur à l'API CinetPay
//   (/v2/payment/check) en utilisant la clé API côté serveur. Seul un
//   statut SUCCESS confirmé par l'API déclenche la validation de la commande.
//
// Body (de CinetPay) :
//   { transaction_id, status, amount, currency, payment_date, metadata, ... }
//
// Logique :
//   1. Extrait transaction_id du corps du webhook
//   2. Re-vérifie le statut via l'API CinetPay (status=SUCCESS requis)
//   3. Met à jour payments.status = 'validated', orders.status = 'payment_validated'
//   4. Crée une notification au vendeur ET à l'acheteur
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CinetPayWebhook {
  transaction_id?: string;
  status?: string;
  amount?: string;
  currency?: string;
  payment_date?: string;
  metadata?: string;
  [key: string]: unknown;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cinetpayApiKey = Deno.env.get("CINETPAY_API_KEY");
  const cinetpaySiteId = Deno.env.get("CINETPAY_SITE_ID");

  if (!supabaseUrl || !supabaseServiceKey || !cinetpayApiKey || !cinetpaySiteId) {
    return new Response("Configuration manquante", { status: 500 });
  }

  let payload: CinetPayWebhook;
  try {
    payload = await req.json();
  } catch {
    return new Response("JSON invalide", { status: 400 });
  }

  const transactionId = payload.transaction_id;
  if (!transactionId) {
    return new Response("transaction_id manquant", { status: 400 });
  }

  // Re-vérification du statut via l'API CinetPay (ne JAMAIS faire confiance au webhook seul)
  const verifyRes = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: cinetpayApiKey,
      site_id: cinetpaySiteId,
      transaction_id: transactionId,
    }),
  });
  const verifyData = await verifyRes.json();

  if (!verifyData.data || verifyData.data.status !== "SUCCESS") {
    console.warn("Webhook: paiement non confirmé pour", transactionId, verifyData);
    return new Response("Paiement non confirmé", { status: 200 });
  }

  // Extraction du orderId depuis les métadonnées
  let metadata: { orderId?: string; buyerId?: string };
  try {
    metadata = typeof payload.metadata === "string"
      ? JSON.parse(payload.metadata)
      : (payload.metadata ?? {});
  } catch {
    // Fallback : parse le transaction_id "BP-<orderId8>-<timestamp>"
    const match = transactionId.match(/^BP-([a-f0-9]{8})/i);
    metadata = {};
    if (match) {
      // Cherche la commande par préfixe d'ID — optionnel, on garde le fallback
    }
  }

  const orderId = metadata.orderId;
  if (!orderId) {
    console.error("Webhook: orderId introuvable dans les métadonnées", transactionId);
    return new Response("Order ID manquant", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Met à jour le paiement
  const { error: payErr } = await supabase
    .from("payments")
    .update({
      status: "validated",
      validated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId);

  if (payErr) {
    console.error("Webhook: erreur MAJ payment", payErr);
    return new Response("Erreur MAJ paiement", { status: 500 });
  }

  // 2. Met à jour la commande
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .update({ status: "payment_validated" })
    .eq("id", orderId)
    .select("seller_id, total_amount")
    .single();

  if (orderErr || !order) {
    console.error("Webhook: erreur MAJ order", orderErr);
    return new Response("Erreur MAJ commande", { status: 500 });
  }

  // 3. Notifie le vendeur
  await supabase.from("notifications").insert({
    user_id: order.seller_id,
    type: "payment_validated",
    title: "Paiement confirmé 💰",
    body: `Paiement de ${order.total_amount} FCFA confirmé pour la commande #${orderId.slice(0, 8)}`,
    data: { orderId, amount: order.total_amount },
  });

  // 4. Notifie l'acheteur
  if (metadata.buyerId) {
    await supabase.from("notifications").insert({
      user_id: metadata.buyerId,
      type: "payment_confirmed",
      title: "Paiement confirmé ✓",
      body: `Votre paiement de ${order.total_amount} FCFA a été confirmé. Le vendeur prépare votre commande.`,
      data: { orderId },
    });
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
