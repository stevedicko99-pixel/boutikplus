import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('accès public au catalogue', () => {
  const migration = read('supabase/migrations/20260808130000_public_catalog_read.sql');
  const promotionsMigration = read('supabase/migrations/20260808150000_public_promotions_and_review_stats.sql');

  it('isole les lectures anon sans donner accès à is_admin', () => {
    expect(migration).toMatch(/CREATE POLICY "shops_public_read"[\s\S]*FOR SELECT TO anon[\s\S]*status = 'active'/);
    expect(migration).toMatch(/CREATE POLICY "products_public_read"[\s\S]*FOR SELECT TO anon[\s\S]*status = 'available'/);
    expect(promotionsMigration).toMatch(/CREATE POLICY "promos_public_read"[\s\S]*FOR SELECT TO anon[\s\S]*status = 'active'[\s\S]*start_date <= now\(\)[\s\S]*end_date >= now\(\)[\s\S]*shops\.status = 'active'[\s\S]*products\.status = 'available'/);

    const anonPolicies = Array.from(
      `${migration}\n${promotionsMigration}`.matchAll(/CREATE POLICY "(?:shops|products|promos)_public_read"([\s\S]*?);/g),
      (match) => match[1],
    );
    expect(anonPolicies).toHaveLength(3);
    anonPolicies.forEach((policy) => expect(policy).not.toContain('is_admin'));
  });

  it('conserve les lectures propriétaire/admin dans des politiques authenticated', () => {
    expect(migration).toMatch(/CREATE POLICY "shops_authenticated_read"[\s\S]*FOR SELECT TO authenticated[\s\S]*owner_id = auth\.uid\(\)[\s\S]*public\.is_admin\(\)/);
    expect(migration).toMatch(/CREATE POLICY "products_authenticated_read"[\s\S]*FOR SELECT TO authenticated[\s\S]*shops\.owner_id = auth\.uid\(\)[\s\S]*public\.is_admin\(\)/);
    expect(promotionsMigration).toMatch(/CREATE POLICY "promos_authenticated_read"[\s\S]*FOR SELECT TO authenticated[\s\S]*shops\.owner_id = auth\.uid\(\)[\s\S]*public\.is_admin\(\)/);
    expect(`${migration}\n${promotionsMigration}`).not.toMatch(/(?:INSERT|UPDATE|DELETE|FOR ALL)\s+TO anon/);
    expect(promotionsMigration).toMatch(/CREATE POLICY "promos_owner_manage"[\s\S]*FOR ALL TO authenticated/);
  });

  it('autorise anon à exécuter uniquement les agrégats publics d’avis', () => {
    expect(promotionsMigration).toMatch(/REVOKE EXECUTE ON FUNCTION public\.get_product_review_stats\(UUID\) FROM PUBLIC/);
    expect(promotionsMigration).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_product_review_stats\(UUID\) TO anon, authenticated/);

    const rpc = read('supabase/rpc.sql');
    const statsFunction = rpc.match(/CREATE OR REPLACE FUNCTION public\.get_product_review_stats[\s\S]*?GRANT\s+EXECUTE ON FUNCTION public\.get_product_review_stats\(UUID\) TO anon, authenticated;/)?.[0];
    expect(statsFunction).toBeDefined();
    expect(statsFunction).toContain('RETURNS TABLE(total_reviews BIGINT, avg_rating NUMERIC');
    expect(statsFunction).toContain('FROM public.reviews WHERE product_id = p_product_id');
    expect(statsFunction).not.toMatch(/SELECT\s+\*/);
  });

  it('requête uniquement les statuts publics avec les relations médias', () => {
    const service = read('src/lib/dataService.ts');
    expect(service).toMatch(/from\('shops'\)[\s\S]*?\.eq\('status', 'active'\)/);
    expect(service).toMatch(/from\('products'\)[\s\S]*?shop:shops\(\*\)[\s\S]*?images:product_images\(\*\)[\s\S]*?videos:product_videos\(\*\)[\s\S]*?\.eq\('status', 'available'\)/);
  });

  it('qualifie explicitement la relation auteur des avis', () => {
    const dataService = read('src/lib/dataService.ts');
    const productReviews = read('src/lib/productReviews.ts');
    expect(dataService).toContain('user:profiles!reviews_user_id_fkey(id, full_name, avatar_url)');
    expect(productReviews).toContain('user:profiles!reviews_user_id_fkey(id, full_name, avatar_url, is_verified)');
  });

  it('utilise deux colonnes sur l’accueil mobile et une colonne dans une boutique mobile', () => {
    const helper = read('src/lib/responsiveGrid.ts');
    const home = read('src/screens/home/HomeScreen.tsx');
    const shop = read('src/screens/home/ShopDetailScreen.tsx');
    expect(helper).toContain('if (containerWidth < 600) return 2');
    expect(home).toMatch(/import \{[^}]*getProductGridLayout[^}]*\} from '@\/lib\/responsiveGrid'/);
    expect(shop).toMatch(/effectiveWidth < 600\s*\? 1/);
  });

  it('laisse le parcours public ouvert et exige la connexion à la finalisation', () => {
    const navigator = read('src/navigation/RootNavigator.tsx');
    for (const route of ['Home', 'Search', 'ShopDetail', 'ProductDetail', 'Cart', 'Checkout']) {
      expect(navigator).toContain(`'${route}'`);
    }
    expect(navigator).toMatch(/PUBLIC_ROUTES\.includes\(currentRoute\)[\s\S]*return;/);

    const checkout = read('src/screens/cart/CheckoutScreen.tsx');
    expect(checkout).toMatch(/if \(!profile\)[\s\S]*setPendingReturnTo\(\{ screen: 'Checkout' \}\)[\s\S]*navigation\.navigate\('Login', \{ returnTo: 'Checkout' \}\)/);
  });
});
