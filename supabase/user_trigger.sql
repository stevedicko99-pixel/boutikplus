-- ============================================================
-- Boutikplus — Trigger auto-création du profil à l'inscription
-- ============================================================
-- PROBLÈME : avec la confirmation email activée dans Supabase Auth,
-- supabase.auth.signUp() crée l'utilisateur SANS session. L'insertion
-- client dans `profiles` est alors bloquée par RLS (auth.uid() = NULL),
-- ce qui empêche la création de compte.
--
-- SOLUTION : un trigger AFTER INSERT sur auth.users crée le profil
-- côté serveur (SECURITY DEFINER → contourne RLS), en lisant les
-- champs full_name/phone/city/role depuis raw_user_meta_data (passés
-- via signUp options.data côté client).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, city, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '00000000'),
    NEW.raw_user_meta_data->>'city',
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer')::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
