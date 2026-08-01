-- ============================================================
-- Boutikplus — Planification des tâches périodiques (pg_cron)
-- ============================================================
-- À exécuter APRÈS schema.sql, triggers.sql, rpc.sql.
-- Active l'extension pg_cron et planifie le nettoyage quotidien
-- des promotions / codes promo expirés et des anciennes notifications.
--
-- Fréquence : tous les jours à 03:00 UTC (heure creuse).
-- Aucune dépendance à pg_net : le nettoyage appelle directement
-- les fonctions RPC et le DELETE SQL, sans passer par HTTP.
-- ============================================================

-- 1. Activation de l'extension pg_cron (disponible sur Supabase).
--    L'extension crée le schéma `cron` et le worker associé.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. Nettoyage de tout job précédemment planifié sous le même nom
--    (idempotent : ré-exécuter ce fichier ne crée pas de doublon).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'boutikplus-cleanup-expired-data') THEN
    PERFORM cron.unschedule('boutikplus-cleanup-expired-data');
  END IF;
END $$;

-- 3. Planification du nettoyage quotidien à 03:00 UTC.
--    Les noms de schéma sont qualifiés explicitement car pg_cron utilise
--    un search_path différent de la session courante.
SELECT cron.schedule(
  'boutikplus-cleanup-expired-data',
  '0 3 * * *',
  $$
    SELECT public.cleanup_expired_promotions();
    SELECT public.cleanup_expired_discount_codes();
    DELETE FROM public.notifications
      WHERE read = true
        AND created_at < now() - interval '90 days';
  $$
);
