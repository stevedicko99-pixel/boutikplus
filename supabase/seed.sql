-- ============================================================
-- Boutikplus — Données de démonstration
-- À exécuter APRÈS schema.sql et policies.sql
-- ============================================================

-- Catégories
INSERT INTO categories (id, name, icon, sort_order) VALUES
  ('vetements', 'Vêtements', 'shopping-bag', 1),
  ('cosmetiques', 'Cosmétiques', 'droplet', 2),
  ('nourriture', 'Nourriture', 'coffee', 3),
  ('artisanat', 'Artisanat', 'gift', 4),
  ('accessoires', 'Accessoires', 'watch', 5),
  ('services', 'Services', 'briefcase', 6),
  ('beaute', 'Beauté', 'heart', 7),
  ('maison', 'Maison', 'home', 8)
ON CONFLICT (id) DO NOTHING;

-- Note : les profils, boutiques et produits de démonstration
-- sont normalement créés via l'application en mode démo (sans backend).
-- Ce script SQL sert de référence pour initialiser un vrai projet Supabase.

-- Exemple de boutiques (à adapter avec de vrais user IDs)
-- INSERT INTO shops (id, owner_id, name, description, category_id, city, orange_money_number, moov_money_number, status)
-- VALUES (
--   '550e8400-e29b-41d4-a716-446655440000',
--   '<votre-user-id>',
--   'Faso Fashion',
--   'Boutique de vêtements tendance pour jeunes.',
--   'vetements',
--   'Ouagadougou',
--   '70123456',
--   NULL,
--   'active'
-- );

-- Exemple de produit
-- INSERT INTO products (shop_id, name, description, price, category_id, stock, status)
-- VALUES (
--   '550e8400-e29b-41d4-a716-446655440000',
--   'Robe wax moderne',
--   'Robe en tissu wax cousue main, coupe ajustée.',
--   15000,
--   'vetements',
--   12,
--   'available'
-- );

-- Exemple de promotion
-- INSERT INTO promotions (shop_id, product_id, promo_text, end_date, visibility, status)
-- VALUES (
--   '550e8400-e29b-41d4-a716-446655440000',
--   '<product-id>',
--   'Soldes: -20% sur la robe wax cette semaine !',
--   now() + interval '14 days',
--   'home',
--   'active'
-- );

-- Villes du Burkina Faso (référence — non stockées en base, gérées côté app)
-- Ouagadougou, Bobo-Dioulasso, Koudougou, Ouahigouya, Banfora,
-- Kaya, Dédougou, Tenkodogo, Fada N'Gourma, Dori, Gaoua, Manga
