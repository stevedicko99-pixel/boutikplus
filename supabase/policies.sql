-- ============================================================
-- Boutikplus — Politiques Row Level Security (RLS)
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper : vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- profiles
-- ============================================================
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- categories (public)
-- ============================================================
CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);

-- ============================================================
-- shops
-- ============================================================
CREATE POLICY "shops_read_active" ON shops FOR SELECT USING (
  status = 'active' OR owner_id = auth.uid() OR is_admin()
);
CREATE POLICY "shops_insert_owner" ON shops FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "shops_update_owner" ON shops FOR UPDATE USING (
  owner_id = auth.uid() OR is_admin()
);
CREATE POLICY "shops_delete_owner" ON shops FOR DELETE USING (
  owner_id = auth.uid() OR is_admin()
);

-- ============================================================
-- products
-- ============================================================
CREATE POLICY "products_read" ON products FOR SELECT USING (
  status = 'available' OR EXISTS (
    SELECT 1 FROM shops WHERE shops.id = products.shop_id AND shops.owner_id = auth.uid()
  ) OR is_admin()
);
CREATE POLICY "products_insert_owner" ON products FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM shops WHERE shops.id = shop_id AND shops.owner_id = auth.uid()
  )
);
CREATE POLICY "products_update_owner" ON products FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM shops WHERE shops.id = products.shop_id AND shops.owner_id = auth.uid()
  ) OR is_admin()
);
CREATE POLICY "products_delete_owner" ON products FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM shops WHERE shops.id = products.shop_id AND shops.owner_id = auth.uid()
  ) OR is_admin()
);

-- ============================================================
-- product_images
-- ============================================================
CREATE POLICY "product_images_read" ON product_images FOR SELECT USING (true);
CREATE POLICY "product_images_manage_owner" ON product_images FOR ALL USING (
  EXISTS (
    SELECT 1 FROM products
    JOIN shops ON shops.id = products.shop_id
    WHERE products.id = product_images.product_id AND shops.owner_id = auth.uid()
  ) OR is_admin()
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM products
    JOIN shops ON shops.id = products.shop_id
    WHERE products.id = product_images.product_id AND shops.owner_id = auth.uid()
  ) OR is_admin()
);

-- ============================================================
-- cart_items
-- ============================================================
CREATE POLICY "cart_owner_all" ON cart_items FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- orders
-- ============================================================
CREATE POLICY "orders_read_participants" ON orders FOR SELECT USING (
  buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin()
);
CREATE POLICY "orders_insert_buyer" ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "update_order_seller_buyer" ON orders FOR UPDATE USING (
  buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin()
);

-- ============================================================
-- order_items
-- ============================================================
CREATE POLICY "order_items_read" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  ) OR is_admin()
);
CREATE POLICY "order_items_insert_buyer" ON order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id AND orders.buyer_id = auth.uid()
  )
);

-- ============================================================
-- payments
-- ============================================================
CREATE POLICY "payments_read_participants" ON payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = payments.order_id
    AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  ) OR is_admin()
);
-- L'acheteur crée le paiement (upload preuve)
CREATE POLICY "payments_insert_buyer" ON payments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id AND orders.buyer_id = auth.uid()
  )
);
-- Seul le vendeur peut valider/refuser (statut + validated_at)
CREATE POLICY "payments_update_seller" ON payments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = payments.order_id AND orders.seller_id = auth.uid()
  ) OR is_admin()
);

-- ============================================================
-- delivery_addresses
-- ============================================================
CREATE POLICY "addresses_owner_all" ON delivery_addresses FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- reviews
-- ============================================================
CREATE POLICY "reviews_read" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_self" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_self" ON reviews FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "reviews_delete_self" ON reviews FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- promotions
-- ============================================================
CREATE POLICY "promos_read_active" ON promotions FOR SELECT USING (
  status = 'active' OR EXISTS (
    SELECT 1 FROM shops WHERE shops.id = promotions.shop_id AND shops.owner_id = auth.uid()
  ) OR is_admin()
);
CREATE POLICY "promos_owner_manage" ON promotions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM shops WHERE shops.id = promotions.shop_id AND shops.owner_id = auth.uid()
  ) OR is_admin()
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM shops WHERE shops.id = promotions.shop_id AND shops.owner_id = auth.uid()
  ) OR is_admin()
);

-- ============================================================
-- conversations
-- ============================================================
CREATE POLICY "conversations_read_participants" ON conversations FOR SELECT USING (
  buyer_id = auth.uid() OR seller_id = auth.uid()
);
CREATE POLICY "conversations_insert_participant" ON conversations FOR INSERT WITH CHECK (
  buyer_id = auth.uid() OR seller_id = auth.uid()
);

-- ============================================================
-- messages
-- ============================================================
CREATE POLICY "messages_read_participants" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
  )
);
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_id
    AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
  ) AND auth.uid() = sender_id
);
CREATE POLICY "messages_update_participant" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
      AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
  )
  AND auth.uid() = sender_id
);

-- ============================================================
-- shop_follows
-- ============================================================
CREATE POLICY "follows_read" ON shop_follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_self" ON shop_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "follows_delete_self" ON shop_follows FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- reports
-- ============================================================
CREATE POLICY "reports_insert_self" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_self" ON reports FOR SELECT USING (
  reporter_id = auth.uid() OR is_admin()
);
CREATE POLICY "reports_admin_all" ON reports FOR ALL USING (is_admin());

-- ============================================================
-- notifications
-- ============================================================
CREATE POLICY "notifications_owner_all" ON notifications FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- driver_profiles — profils livreurs
-- ============================================================
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_read_all" ON driver_profiles FOR SELECT USING (true);
CREATE POLICY "drivers_insert_self" ON driver_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "drivers_update_self" ON driver_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "drivers_delete_self" ON driver_profiles FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- delivery_requests
-- ============================================================
CREATE POLICY "deliveries_read_parties" ON delivery_requests FOR SELECT USING (
  seller_id = auth.uid() OR driver_id = auth.uid() OR
  (status = 'pending' AND EXISTS (
    SELECT 1 FROM driver_profiles WHERE driver_profiles.user_id = auth.uid()
  )) OR is_admin()
);
CREATE POLICY "deliveries_insert_seller" ON delivery_requests FOR INSERT
  WITH CHECK (seller_id = auth.uid());
CREATE POLICY "deliveries_update_parties" ON delivery_requests FOR UPDATE USING (
  seller_id = auth.uid() OR driver_id = auth.uid() OR is_admin()
);
CREATE POLICY "deliveries_delete_seller" ON delivery_requests FOR DELETE USING (
  seller_id = auth.uid() OR is_admin()
);

-- ============================================================
-- delivery_payments
-- ============================================================
CREATE POLICY "delivery_payments_read_parties" ON delivery_payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM delivery_requests
    WHERE delivery_requests.id = delivery_payments.delivery_id
    AND (delivery_requests.seller_id = auth.uid() OR delivery_requests.driver_id = auth.uid())
  ) OR is_admin()
);
CREATE POLICY "delivery_payments_insert_seller" ON delivery_payments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM delivery_requests
    WHERE delivery_requests.id = delivery_payments.delivery_id
    AND delivery_requests.seller_id = auth.uid()
  )
);
CREATE POLICY "delivery_payments_update_driver" ON delivery_payments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM delivery_requests
    WHERE delivery_requests.id = delivery_payments.delivery_id
    AND (delivery_requests.driver_id = auth.uid() OR delivery_requests.seller_id = auth.uid())
  ) OR is_admin()
);

-- ============================================================
-- delivery_reviews
-- ============================================================
CREATE POLICY "delivery_reviews_read_parties" ON delivery_reviews FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM delivery_requests
    WHERE delivery_requests.id = delivery_reviews.delivery_id
    AND (delivery_requests.seller_id = auth.uid() OR delivery_requests.driver_id = auth.uid())
  ) OR is_admin()
);
CREATE POLICY "delivery_reviews_insert_party" ON delivery_reviews FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM delivery_requests
    WHERE delivery_requests.id = delivery_reviews.delivery_id
    AND (delivery_requests.seller_id = auth.uid() OR delivery_requests.driver_id = auth.uid())
  ) AND auth.uid() = reviewer_id
);

-- ============================================================
-- share_links — liens de partage traçables
-- ============================================================
-- Le propriétaire gère ses liens ; les liens actifs sont lisibles
-- publiquement (le slug doit être accessible sans authentification
-- pour le partage sur les réseaux sociaux).
CREATE POLICY "share_links_owner_all" ON share_links
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "share_links_public_read" ON share_links
  FOR SELECT USING (is_active = true);

-- ============================================================
-- discount_codes — codes de réduction
-- ============================================================
-- Le vendeur gère ses codes ; les codes actifs sont lisibles
-- publiquement (validation côté client via la RPC validate_discount_code).
CREATE POLICY "discount_codes_owner_all" ON discount_codes
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));
CREATE POLICY "discount_codes_public_read" ON discount_codes
  FOR SELECT USING (status = 'active');

-- ============================================================
-- campaign_events — événements de campagne (vues / clics / conversions)
-- ============================================================
-- INSERT public autorisé pour le tracking anonyme (vues/clics depuis
-- le web sans authentification). SELECT/UPDATE réservés au vendeur
-- propriétaire de la boutique (analyse de campagne).
CREATE POLICY "campaign_events_public_insert" ON campaign_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "campaign_events_owner_read" ON campaign_events
  FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));
CREATE POLICY "campaign_events_owner_update" ON campaign_events
  FOR UPDATE USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- ============================================================
-- product_videos — vidéos produit (upload ou lien externe)
-- ============================================================
-- Le vendeur propriétaire du produit gère ses vidéos ;
-- le public peut lire les vidéos (affichage fiche produit).
CREATE POLICY "product_videos_owner_all" ON product_videos
  FOR ALL USING (
    product_id IN (
      SELECT id FROM products
      WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM products
      WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    )
  );
CREATE POLICY "product_videos_public_read" ON product_videos
  FOR SELECT USING (true);
