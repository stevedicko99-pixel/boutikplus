// ============================================================
// Edge Function : cleanup-expired-data
// Boutikplus — Tâche planifiée (cron) de nettoyage
// ============================================================
// POST /functions/v1/cleanup-expired-data
// verify_jwt = false (appelée par un scheduler Supabase ou cron externe)
//
// Logique :
//   1. Marque 'expired' les promotions dont end_date < now()
//   2. Marque 'expired' les codes promo dont expires_at < now()
//   3. Supprime les cart_items obsolètes (produits supprimés / out of stock > 30j)
//
// Planification recommandée (Supabase Dashboard > Database > pg_cron) :
//   SELECT cron.schedule(
//     'cleanup-expired-data',
//     '0 3 * * *',  -- tous les jours à 03:00 UTC
//     $$SELECT net.http_post(
//       url := 'https://<votre-projet>.supabase.co/functions/v1/cleanup-expired-data',
//       headers := jsonb_build_object('Content-Type', 'application/json'),
//       body := '{}'::jsonb
//     )$$
//   );
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response("Configuration manquante", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results: Record<string, unknown> = {};

  // 1. Promotions expirées via RPC
  const { data: expiredPromos, error: promoErr } = await supabase.rpc(
    "cleanup_expired_promotions",
  );
  if (promoErr) {
    results.promotions_error = promoErr.message;
  } else {
    results.promotions_expired = expiredPromos;
  }

  // 2. Codes promo expirés via RPC
  const { data: expiredCodes, error: codeErr } = await supabase.rpc(
    "cleanup_expired_discount_codes",
  );
  if (codeErr) {
    results.discount_codes_error = codeErr.message;
  } else {
    results.discount_codes_expired = expiredCodes;
  }

  // 3. Notifications lues de plus de 90 jours (nettoyage léger)
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { count: deletedNotifs } = await supabase
    .from("notifications")
    .delete({ count: "exact" })
    .eq("read", true)
    .lt("created_at", cutoff);

  results.notifications_deleted = deletedNotifs ?? 0;

  return new Response(JSON.stringify({
    status: "ok",
    run_at: new Date().toISOString(),
    ...results,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
