// Données de démonstration — Boutikplus
// Utilisées quand Supabase n'est pas configuré pour permettre une démo immédiate.

import type {
  Shop,
  Product,
  ProductWithImages,
  Category,
  Order,
  OrderItem,
  Payment,
  Review,
  Promotion,
  Conversation,
  Message,
  DeliveryAddress,
  Profile,
  DriverProfile,
  DeliveryRequest,
  DeliveryPayment,
  DeliveryReview,
  ShareLink,
  DiscountCode,
  CampaignEvent,
  ProductVideo,
} from '@/types/models';

export const DEMO_CATEGORIES: Category[] = [
  { id: 'vetements', name: 'Vêtements', icon: 'shopping-bag', sort_order: 1 },
  { id: 'cosmetiques', name: 'Cosmétiques', icon: 'droplet', sort_order: 2 },
  { id: 'nourriture', name: 'Nourriture', icon: 'coffee', sort_order: 3 },
  { id: 'artisanat', name: 'Artisanat', icon: 'gift', sort_order: 4 },
  { id: 'accessoires', name: 'Accessoires', icon: 'watch', sort_order: 5 },
  { id: 'services', name: 'Services', icon: 'briefcase', sort_order: 6 },
  { id: 'beaute', name: 'Beauté', icon: 'heart', sort_order: 7 },
  { id: 'maison', name: 'Maison', icon: 'home', sort_order: 8 },
];

// Génération d'images de démonstration fiables (placeholders colorés par catégorie)
const CAT_IMG_COLORS: Record<string, string> = {
  vetements: 'FF6B00', cosmetiques: '00A859', nourriture: 'FFC107',
  artisanat: '6B2D8E', accessoires: '0DCAF0', services: 'DC3545',
  beaute: 'FF8533', maison: '8B3DAE',
};
const img = (seed: string, category = 'vetements') => {
  const color = CAT_IMG_COLORS[category] ?? 'FF6B00';
  const label = encodeURIComponent(seed.slice(0, 20));
  // dummyimage.com est fiable et supporte le texte (contrairement à placehold.co)
  return `https://dummyimage.com/800x800/${color}/FFFFFF&text=${label}`;
};

export const DEMO_SHOPS: Shop[] = [
  {
    id: 'shop-1',
    owner_id: 'demo-seller',
    name: 'Faso Fashion',
    slogan: 'La mode du Faso, portée par les jeunes.',
    description:
      "Boutique de vêtements tendance pour jeunes. Import et confection locale à Ouagadougou. Livraison rapide dans tout le Burkina. Nos pièces combinent style urbain et tissus traditionnels pour une identité fièrement africaine.",
    logo_url: 'https://dummyimage.com/200x200/FF6B00/FFFFFF&text=FF',
    banner_url: 'https://dummyimage.com/1200x400/FF6B00/FFFFFF&text=Faso+Fashion',
    category_id: 'vetements',
    city: 'Ouagadougou',
    address: 'Quartier Gounghin, Avenue Kwame Nkrumah, Ouagadougou',
    phone_number: '70123456',
    whatsapp_number: '22670123456',
    email: 'contact@fasofashion.bf',
    opening_hours: {
      mon: { open: '08:30', close: '19:00' },
      tue: { open: '08:30', close: '19:00' },
      wed: { open: '08:30', close: '19:00' },
      thu: { open: '08:30', close: '19:00' },
      fri: { open: '08:30', close: '20:00' },
      sat: { open: '09:00', close: '20:00' },
      sun: { closed: true, open: '00:00', close: '00:00' },
    },
    social_links: {
      instagram: '@faso.fashion',
      tiktok: '@fasofashion',
      facebook: 'https://facebook.com/fasofashion',
    },
    orange_money_number: '70123456',
    moov_money_number: '61987654',
    coris_money_number: null,
    wave_number: null,
    status: 'active',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'shop-2',
    owner_id: 'demo-seller',
    name: 'Karité Naturel',
    slogan: 'La nature au service de votre peau.',
    description:
      "Cosmétiques 100% naturels au beurre de karité. Savons, crèmes et baumes fabriqués à Bobo-Dioulasso à partir de matières premières locales récoltées par des coopératives de femmes.",
    logo_url: 'https://dummyimage.com/200x200/00A859/FFFFFF&text=KN',
    banner_url: 'https://dummyimage.com/1200x400/00A859/FFFFFF&text=Karit%C3%A9+Naturel',
    category_id: 'cosmetiques',
    city: 'Bobo-Dioulasso',
    address: 'Secteur 4, Rue du Marché, Bobo-Dioulasso',
    phone_number: '66778899',
    whatsapp_number: '22666778899',
    email: 'karitenaturel.bf@gmail.com',
    opening_hours: {
      mon: { open: '08:00', close: '18:00' },
      tue: { open: '08:00', close: '18:00' },
      wed: { open: '08:00', close: '18:00' },
      thu: { open: '08:00', close: '18:00' },
      fri: { open: '08:00', close: '18:00' },
      sat: { open: '09:00', close: '17:00' },
      sun: { closed: true, open: '00:00', close: '00:00' },
    },
    social_links: {
      instagram: '@karite.naturel',
      tiktok: '@karitenaturel',
    },
    orange_money_number: '66778899',
    moov_money_number: null,
    coris_money_number: null,
    wave_number: null,
    status: 'active',
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'shop-3',
    owner_id: 'demo-seller',
    name: 'Délices de Koudougou',
    slogan: 'Le goût du fait maison, à chaque fête.',
    description:
      "Pâtisseries et plats faits maison. Commandez vos gâteaux d'anniversaire, plats de fête et plateaux-repas. Tout est préparé le jour même avec des produits frais du marché de Koudougou.",
    logo_url: 'https://dummyimage.com/200x200/FFC107/FFFFFF&text=DK',
    banner_url: 'https://dummyimage.com/1200x400/FFC107/FFFFFF&text=D%C3%A9lices+de+Koudougou',
    category_id: 'nourriture',
    city: 'Koudougou',
    address: 'Centre-ville, près de la gare routière, Koudougou',
    phone_number: '70556677',
    whatsapp_number: '22670556677',
    email: 'delices.koudougou@gmail.com',
    opening_hours: {
      mon: { open: '07:00', close: '20:00' },
      tue: { open: '07:00', close: '20:00' },
      wed: { open: '07:00', close: '20:00' },
      thu: { open: '07:00', close: '20:00' },
      fri: { open: '07:00', close: '21:00' },
      sat: { open: '07:00', close: '21:00' },
      sun: { open: '09:00', close: '14:00' },
    },
    social_links: {
      instagram: '@delices.koudougou',
      facebook: 'https://facebook.com/deliceskoudougou',
    },
    orange_money_number: '70556677',
    moov_money_number: '71445566',
    coris_money_number: null,
    wave_number: null,
    status: 'active',
    created_at: '2026-02-20T10:00:00Z',
  },
  {
    id: 'shop-4',
    owner_id: 'demo-seller',
    name: 'Artisanat Faso',
    slogan: 'Le savoir-faire burkinabè, sculpté à la main.',
    description:
      "Sculptures, bijoux en bronze et objets décoratifs faits main par nos artisans de Ouagadougou. Chaque pièce raconte l'histoire et la richesse culturelle du Burkina Faso. Pièces uniques numérotées.",
    logo_url: 'https://dummyimage.com/200x200/6B2D8E/FFFFFF&text=AF',
    banner_url: 'https://dummyimage.com/1200x400/6B2D8E/FFFFFF&text=Artisanat+Faso',
    category_id: 'artisanat',
    city: 'Ouagadougou',
    address: 'Village artisanal de Ouagadougou, Bangr-Weoogo',
    phone_number: '76112233',
    whatsapp_number: '22676112233',
    email: 'artisanat.faso@gmail.com',
    opening_hours: {
      mon: { open: '09:00', close: '18:00' },
      tue: { open: '09:00', close: '18:00' },
      wed: { open: '09:00', close: '18:00' },
      thu: { open: '09:00', close: '18:00' },
      fri: { open: '09:00', close: '18:00' },
      sat: { open: '10:00', close: '19:00' },
      sun: { closed: true, open: '00:00', close: '00:00' },
    },
    social_links: {
      instagram: '@artisanat.faso',
      tiktok: '@artisanatfaso',
      facebook: 'https://facebook.com/artisanatfaso',
    },
    orange_money_number: '76112233',
    moov_money_number: '81334455',
    coris_money_number: null,
    wave_number: null,
    status: 'active',
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'shop-5',
    owner_id: 'demo-seller',
    name: 'Tech & Accés',
    slogan: 'La tech accessible à tous les budgets.',
    description:
      "Accessoires téléphones, écouteurs, coques et chargeurs à petits prix. Produits testés et garantis 3 mois. Stock renouvelé chaque semaine avec les dernières tendances.",
    logo_url: 'https://dummyimage.com/200x200/0DCAF0/FFFFFF&text=TA',
    banner_url: 'https://dummyimage.com/1200x400/0DCAF0/FFFFFF&text=Tech+%26+Acc%C3%A9s',
    category_id: 'accessoires',
    city: 'Ouahigouya',
    address: 'Marché central de Ouahigouya, allée B',
    phone_number: '70889900',
    whatsapp_number: '22670889900',
    email: 'tech.acces.bf@gmail.com',
    opening_hours: {
      mon: { open: '08:00', close: '19:30' },
      tue: { open: '08:00', close: '19:30' },
      wed: { open: '08:00', close: '19:30' },
      thu: { open: '08:00', close: '19:30' },
      fri: { open: '08:00', close: '19:30' },
      sat: { open: '08:00', close: '20:00' },
      sun: { open: '10:00', close: '16:00' },
    },
    social_links: {
      tiktok: '@techacces',
      snapchat: 'techacces',
    },
    orange_money_number: '70889900',
    moov_money_number: null,
    coris_money_number: null,
    wave_number: null,
    status: 'active',
    created_at: '2026-03-10T10:00:00Z',
  },
  {
    id: 'shop-6',
    owner_id: 'demo-seller',
    name: 'Beauté Naturelle',
    slogan: 'Révélez votre beauté, naturellement.',
    description:
      "Maquillage, soins du visage et produits capillaires. Conseil personnalisé gratuit pour trouver la routine adaptée à votre peau. Produits authentiques et conseils d'experts.",
    logo_url: 'https://dummyimage.com/200x200/FF8533/FFFFFF&text=BN',
    banner_url: 'https://dummyimage.com/1200x400/FF8533/FFFFFF&text=Beaut%C3%A9+Naturelle',
    category_id: 'beaute',
    city: 'Banfora',
    address: 'Quartier Farako, route de Bobo, Banfora',
    phone_number: '66443322',
    whatsapp_number: '22666443322',
    email: 'beaute.naturelle.bf@gmail.com',
    opening_hours: {
      mon: { open: '09:00', close: '19:00' },
      tue: { open: '09:00', close: '19:00' },
      wed: { open: '09:00', close: '19:00' },
      thu: { open: '09:00', close: '19:00' },
      fri: { open: '09:00', close: '19:00' },
      sat: { open: '09:00', close: '20:00' },
      sun: { closed: true, open: '00:00', close: '00:00' },
    },
    social_links: {
      instagram: '@beaute.naturelle.bf',
      tiktok: '@beaunaturelle',
      facebook: 'https://facebook.com/beaunaturelle',
    },
    orange_money_number: '66443322',
    moov_money_number: '71998877',
    coris_money_number: null,
    wave_number: null,
    status: 'active',
    created_at: '2026-03-15T10:00:00Z',
  },
];

// Vidéos produit de démo — mélange upload (fichier hébergé) et externe (TikTok/YouTube)
export const DEMO_PRODUCT_VIDEOS: ProductVideo[] = [
  {
    id: 'pv-1',
    product_id: 'p1',
    type: 'external',
    url: 'https://www.tiktok.com/@fasofashion/video/7234567890123456789',
    source: 'tiktok',
    thumbnail_url: 'https://dummyimage.com/600x400/000000/FFFFFF&text=Video+TikTok',
    duration_sec: null,
    position: 0,
    created_at: '2026-03-02T10:00:00Z',
  },
  {
    id: 'pv-2',
    product_id: 'p4',
    type: 'external',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    source: 'youtube',
    thumbnail_url: 'https://dummyimage.com/600x400/FF0000/FFFFFF&text=D%C3%A9monstration',
    duration_sec: null,
    position: 0,
    created_at: '2026-03-03T10:00:00Z',
  },
  {
    id: 'pv-3',
    product_id: 'p10',
    type: 'external',
    url: 'https://www.tiktok.com/@artisanatfaso/video/7234567890987654321',
    source: 'tiktok',
    thumbnail_url: 'https://dummyimage.com/600x400/6B2D8E/FFFFFF&text=Fabrication',
    duration_sec: null,
    position: 0,
    created_at: '2026-03-05T10:00:00Z',
  },
];

const makeProduct = (
  id: string,
  shopId: string,
  name: string,
  description: string,
  price: number,
  categoryId: string,
  stock: number,
  _images?: string[],
): ProductWithImages => {
  const base: Product = {
    id,
    shop_id: shopId,
    name,
    description,
    price,
    category_id: categoryId,
    stock,
    status: stock > 0 ? 'available' : 'out_of_stock',
    created_at: '2026-03-01T10:00:00Z',
    favorites_count: Math.floor(Math.random() * 80) + 5,
    views_count: 0,
  };
  const imageUrls = [
    img(`${name}`, categoryId),
    img(`${name} 2`, categoryId),
  ];
  return {
    ...base,
    images: imageUrls.map((url, i) => ({
      id: `${id}-img-${i}`,
      product_id: id,
      image_url: url,
      position: i,
    })),
    videos: DEMO_PRODUCT_VIDEOS.filter((v) => v.product_id === id),
    shop: DEMO_SHOPS.find((s) => s.id === shopId),
  };
};

export const DEMO_PRODUCTS: ProductWithImages[] = [
  makeProduct(
    'p1', 'shop-1', 'Robe wax moderne', 'Robe en tissu wax cousue main, coupe ajustée. Tailles S à XL disponibles.', 15000, 'vetements', 12,
    [img('photo-1539109136881-3be0616acf4b'), img('photo-1490481651871-ab68de25d43d')],
  ),
  makeProduct(
    'p2', 'shop-1', 'Chemise homme coton', 'Chemise en coton léger, idéale pour la chaleur. Plusieurs coloris.', 8500, 'vetements', 20,
    [img('photo-1602810318383-e386cc2a3ccf')],
  ),
  makeProduct(
    'p3', 'shop-1', 'Ensemble boubou enfant', 'Boubou traditionnel brodé pour enfant, 2 pièces. Parfait pour les fêtes.', 12000, 'vetements', 8,
    [img('photo-1622290291468-a28f7a7dc4a8')],
  ),
  makeProduct(
    'p4', 'shop-2', 'Savon noir africain', 'Savon noir naturel à base de karité. Nettoie et hydrate la peau. Lot de 3.', 3500, 'cosmetiques', 50,
    [img('photo-1600857544200-b2f666a9a2ec')],
  ),
  makeProduct(
    'p5', 'shop-2', 'Crème karité bio', 'Crème hydratante au beurre de karité pur. Pot de 250ml. Peau douce toute la journée.', 5000, 'cosmetiques', 30,
    [img('photo-1556228578-8c89e6adf883')],
  ),
  makeProduct(
    'p6', 'shop-2', 'Huile de baobab', 'Huile 100% naturelle de baobab pour cheveux et peau. Flacon de 100ml.', 4000, 'cosmetiques', 25,
    [img('photo-1608248543803-ba4f8c4ae7f5')],
  ),
  makeProduct(
    'p7', 'shop-3', 'Gâteau d\'anniversaire', 'Gâteau personnalisé, crème au beurre. Commande 48h à l\'avance. 8 à 15 personnes.', 18000, 'nourriture', 5,
    [img('photo-1578985545062-69928b1d9587')],
  ),
  makeProduct(
    'p8', 'shop-3', 'Beignets haricot (10 pcs)', 'Beignets faits maison, frais du jour. Sachet de 10 pièces.', 1500, 'nourriture', 40,
    [img('photo-1568051243858-f6c2b2b4f4a1')],
  ),
  makeProduct(
    'p9', 'shop-3', 'Riz sauce arachide', 'Plat à emporter, riz gras et sauce d\'arachide. Portion généreuse.', 2000, 'nourriture', 15,
    [img('photo-1546069901-ba9599a7e63c')],
  ),
  makeProduct(
    'p10', 'shop-4', 'Bracelet bronze artisanal', 'Bracelet en bronze martelé à la main, motif traditionnel mossi.', 6000, 'artisanat', 10,
    [img('photo-1611652022419-a9419f74343d')],
  ),
  makeProduct(
    'p11', 'shop-4', 'Masque bois sculpté', 'Masque décoratif sculpté à la main en bois massif. Pièce unique.', 22000, 'artisanat', 4,
    [img('photo-1582719188393-bb71ca45dbb9')],
  ),
  makeProduct(
    'p12', 'shop-4', 'Panier tressé', 'Panier en paille tressée à la main. Idéal pour le marché ou la déco.', 7000, 'artisanat', 18,
    [img('photo-1596722520246-5d4255b4f1dd')],
  ),
  makeProduct(
    'p13', 'shop-5', 'Écouteurs Bluetooth', 'Écouteurs sans fil, autonomie 6h, boîtier de charge. Son clair.', 12000, 'accessoires', 15,
    [img('photo-1590658268037-6bf12165a8df')],
  ),
  makeProduct(
    'p14', 'shop-5', 'Coque silicone universelle', 'Coque de protection souple, plusieurs modèles et couleurs.', 2000, 'accessoires', 60,
    [img('photo-1601593346740-925612772716')],
  ),
  makeProduct(
    'p15', 'shop-5', 'Chargeur rapide USB-C', 'Chargeur secteur 20W, câble USB-C tressé 1m. Compatible la plupart des téléphones.', 5500, 'accessoires', 25,
    [img('photo-1583863788434-e58a36330cf0')],
  ),
  makeProduct(
    'p16', 'shop-6', 'Palette maquillage pro', 'Palette 35 teintes, fards à paupières pigmentés longue tenue.', 9500, 'beaute', 12,
    [img('photo-1596462502278-27bfdc403348')],
  ),
  makeProduct(
    'p17', 'shop-6', 'Sérum vitamine C', 'Sérum éclaircissant à la vitamine C, 30ml. Unifie le teint.', 8000, 'beaute', 20,
    [img('photo-1620916566398-39f1143ab7be')],
  ),
  makeProduct(
    'p18', 'shop-6', 'Kit faux cils', 'Kit de 5 paires de faux cils réutilisables avec colle.', 3000, 'beaute', 35,
    [img('photo-1631214540242-3cd8c4b0b3b8')],
  ),
];

export const DEMO_REVIEWS: Review[] = [
  { id: 'r1', user_id: 'demo-buyer', shop_id: 'shop-1', product_id: 'p1', rating: 5, comment: 'Très bonne qualité, livraison rapide !', created_at: '2026-04-01T10:00:00Z' },
  { id: 'r2', user_id: 'demo-buyer', shop_id: 'shop-1', product_id: 'p2', rating: 4, comment: 'Bon produit mais taille un peu petit.', created_at: '2026-04-05T10:00:00Z' },
  { id: 'r3', user_id: 'demo-buyer', shop_id: 'shop-2', product_id: 'p4', rating: 5, comment: 'Le beurre de karité est parfait, peau douce.', created_at: '2026-04-10T10:00:00Z' },
  { id: 'r4', user_id: 'demo-buyer', shop_id: 'shop-3', product_id: 'p7', rating: 5, comment: 'Le gâteau était délicieux et beau !', created_at: '2026-04-12T10:00:00Z' },
];

export const DEMO_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    shop_id: 'shop-1',
    product_id: 'p1',
    promo_text: 'Soldes: -20% sur la robe wax cette semaine !',
    start_date: '2026-07-01T00:00:00Z',
    end_date: '2026-08-15T00:00:00Z',
    visibility: 'home',
    status: 'active',
    shop: DEMO_SHOPS[0],
    product: DEMO_PRODUCTS[0],
  },
  {
    id: 'promo-2',
    shop_id: 'shop-2',
    product_id: 'p4',
    promo_text: 'Pack beauté: 3 savons pour le prix de 2',
    start_date: '2026-07-15T00:00:00Z',
    end_date: '2026-08-30T00:00:00Z',
    visibility: 'home',
    status: 'active',
    shop: DEMO_SHOPS[1],
    product: DEMO_PRODUCTS[3],
  },
];

export const DEMO_ORDERS: (Order & { items: OrderItem[]; payment?: Payment })[] = [
  {
    id: 'order-1',
    buyer_id: 'demo-buyer',
    seller_id: 'demo-seller',
    total_amount: 15000,
    delivery_address_id: 'addr-1',
    status: 'delivered',
    note: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-03T10:00:00Z',
    items: [{ id: 'oi-1', order_id: 'order-1', product_id: 'p1', quantity: 1, unit_price: 15000, product: DEMO_PRODUCTS[0] }],
    payment: { id: 'pay-1', order_id: 'order-1', amount: 15000, operator: 'orange_money', proof_image_url: null, status: 'validated', created_at: '2026-04-01T10:30:00Z', validated_at: '2026-04-01T11:00:00Z' },
  },
  {
    id: 'order-2',
    buyer_id: 'demo-buyer',
    seller_id: 'demo-seller',
    total_amount: 8500,
    delivery_address_id: 'addr-1',
    status: 'in_delivery',
    note: 'Livrer après 17h svp',
    created_at: '2026-07-20T10:00:00Z',
    updated_at: '2026-07-22T10:00:00Z',
    items: [{ id: 'oi-2', order_id: 'order-2', product_id: 'p2', quantity: 1, unit_price: 8500, product: DEMO_PRODUCTS[1] }],
    payment: { id: 'pay-2', order_id: 'order-2', amount: 8500, operator: 'moov_money', proof_image_url: null, status: 'validated', created_at: '2026-07-20T10:45:00Z', validated_at: '2026-07-20T12:00:00Z' },
  },
  {
    id: 'order-3',
    buyer_id: 'demo-buyer',
    seller_id: 'demo-seller',
    total_amount: 3500,
    delivery_address_id: 'addr-1',
    status: 'proof_uploaded',
    note: null,
    created_at: '2026-07-28T08:00:00Z',
    updated_at: '2026-07-28T08:30:00Z',
    items: [{ id: 'oi-3', order_id: 'order-3', product_id: 'p4', quantity: 1, unit_price: 3500, product: DEMO_PRODUCTS[3] }],
    payment: { id: 'pay-3', order_id: 'order-3', amount: 3500, operator: 'orange_money', proof_image_url: null, status: 'pending', created_at: '2026-07-28T08:30:00Z', validated_at: null },
  },
];

export const DEMO_ADDRESSES: DeliveryAddress[] = [
  {
    id: 'addr-1',
    user_id: 'demo-buyer',
    city: 'Ouagadougou',
    district: 'Gounghin',
    instructions: 'Près de la station Total, maison bleue',
    contact_phone: '70123456',
    is_default: true,
    created_at: '2026-03-01T10:00:00Z',
  },
];

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    buyer_id: 'demo-buyer',
    seller_id: 'demo-seller',
    shop_id: 'shop-1',
    created_at: '2026-04-01T09:00:00Z',
    shop: DEMO_SHOPS[0],
  },
];

export const DEMO_MESSAGES: Message[] = [
  { id: 'm1', conversation_id: 'conv-1', sender_id: 'demo-buyer', content: 'Bonjour, est-ce que la robe wax est disponible en taille M ?', image_url: null, created_at: '2026-04-01T09:01:00Z', read: true },
  { id: 'm2', conversation_id: 'conv-1', sender_id: 'demo-seller', content: 'Bonjour ! Oui nous avons la taille M en stock. Vous pouvez commander directement.', image_url: null, created_at: '2026-04-01T09:05:00Z', read: true },
  { id: 'm3', conversation_id: 'conv-1', sender_id: 'demo-buyer', content: 'Parfait, merci ! Est-ce possible de négocier le prix ?', image_url: null, created_at: '2026-04-01T09:06:00Z', read: true },
];

export const DEMO_BUYER: Profile = {
  id: 'demo-buyer',
  full_name: 'Awa Compaoré',
  phone: '70 12 34 56',
  city: 'Ouagadougou',
  role: 'buyer',
  avatar_url: null,
  created_at: new Date().toISOString(),
};

export const DEMO_SELLER: Profile = {
  id: 'demo-seller',
  full_name: 'Ibrahim Ouédraogo',
  phone: '66 98 76 54',
  city: 'Ouagadougou',
  role: 'seller',
  avatar_url: null,
  created_at: new Date().toISOString(),
};

// ============================================================
// Livreurs & livraisons (démo)
// ============================================================

export const DEMO_DRIVER_PROFILES: (DriverProfile & { profile?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url' | 'city'> })[] = [
  // Le vendeur démo est aussi livreur (cas fréquent au Burkina)
  {
    id: 'driver-seller',
    user_id: 'demo-seller',
    vehicle_type: 'moto',
    city: 'Ouagadougou',
    is_available: true,
    rating: 4.7,
    total_deliveries: 28,
    base_rate: 500,
    per_km_rate: 150,
    max_weight: 20,
    orange_money_number: '66987654',
    moov_money_number: null,
    coris_money_number: null,
    wave_number: null,
    current_lat: 12.3714,
    current_lng: -1.5197,
    license_number: 'A12345',
    created_at: '2026-02-01T10:00:00Z',
    profile: { id: 'demo-seller', full_name: 'Ibrahim Ouédraogo', phone: '66 98 76 54', avatar_url: null, city: 'Ouagadougou' },
  },
  {
    id: 'driver-1',
    user_id: 'driver-user-1',
    vehicle_type: 'moto',
    city: 'Ouagadougou',
    is_available: true,
    rating: 4.9,
    total_deliveries: 156,
    base_rate: 500,
    per_km_rate: 150,
    max_weight: 20,
    orange_money_number: '70112233',
    moov_money_number: '61998877',
    coris_money_number: null,
    wave_number: null,
    current_lat: 12.3714,
    current_lng: -1.5197,
    license_number: 'M67890',
    created_at: '2026-01-10T10:00:00Z',
    profile: { id: 'driver-user-1', full_name: 'Karim Sawadogo', phone: '70 11 22 33', avatar_url: null, city: 'Ouagadougou' },
  },
  {
    id: 'driver-2',
    user_id: 'driver-user-2',
    vehicle_type: 'voiture',
    city: 'Ouagadougou',
    is_available: true,
    rating: 4.6,
    total_deliveries: 42,
    base_rate: 1500,
    per_km_rate: 350,
    max_weight: 200,
    orange_money_number: '76445566',
    moov_money_number: null,
    coris_money_number: null,
    wave_number: null,
    current_lat: 12.3589,
    current_lng: -1.5054,
    license_number: 'B54321',
    created_at: '2026-01-15T10:00:00Z',
    profile: { id: 'driver-user-2', full_name: 'Fatou Kaboré', phone: '76 44 55 66', avatar_url: null, city: 'Ouagadougou' },
  },
  {
    id: 'driver-3',
    user_id: 'driver-user-3',
    vehicle_type: 'tricycle',
    city: 'Bobo-Dioulasso',
    is_available: false,
    rating: 4.3,
    total_deliveries: 19,
    base_rate: 800,
    per_km_rate: 200,
    max_weight: 150,
    orange_money_number: null,
    moov_money_number: '71889900',
    coris_money_number: null,
    wave_number: null,
    current_lat: 11.1716,
    current_lng: -4.297,
    license_number: null,
    created_at: '2026-03-01T10:00:00Z',
    profile: { id: 'driver-user-3', full_name: 'Moussa Traoré', phone: '71 88 99 00', avatar_url: null, city: 'Bobo-Dioulasso' },
  },
  {
    id: 'driver-4',
    user_id: 'driver-user-4',
    vehicle_type: 'velo',
    city: 'Ouagadougou',
    is_available: true,
    rating: 4.8,
    total_deliveries: 87,
    base_rate: 300,
    per_km_rate: 100,
    max_weight: 10,
    orange_money_number: '70223344',
    moov_money_number: null,
    coris_money_number: null,
    wave_number: null,
    current_lat: 12.365,
    current_lng: -1.512,
    license_number: null,
    created_at: '2026-02-20T10:00:00Z',
    profile: { id: 'driver-user-4', full_name: 'Adama Zongo', phone: '70 22 33 44', avatar_url: null, city: 'Ouagadougou' },
  },
];

const today = new Date();
const isoDate = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const DEMO_DELIVERY_REQUESTS: (DeliveryRequest & {
  driver?: DriverProfile & { profile?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url' | 'city'> };
  seller?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url' | 'city'>;
  payment?: DeliveryPayment;
})[] = [
  {
    id: 'deliv-1',
    seller_id: 'demo-seller',
    driver_id: 'driver-user-1',
    pickup_address: 'Quartier Gounghin, près de la pharmacie',
    pickup_city: 'Ouagadougou',
    destination_address: 'Quartier Wemtenga, rue 15.12',
    destination_city: 'Ouagadougou',
    package_weight: 3,
    package_length: 30,
    package_width: 20,
    package_height: 15,
    preferred_date: isoDate(0),
    preferred_time: '10:00 - 12:00',
    description: 'Robe wax soigneusement emballée',
    price: 1250,
    distance_km: 5,
    status: 'in_progress',
    cancellation_reason: null,
    created_at: '2026-07-29T08:00:00Z',
    updated_at: '2026-07-29T09:30:00Z',
    accepted_at: '2026-07-29T08:15:00Z',
    delivered_at: null,
    driver: DEMO_DRIVER_PROFILES[1],
    seller: { id: 'demo-seller', full_name: 'Ibrahim Ouédraogo', phone: '66 98 76 54', avatar_url: null, city: 'Ouagadougou' },
    payment: { id: 'dpay-1', delivery_id: 'deliv-1', amount: 1250, operator: 'orange_money', proof_image_url: 'https://dummyimage.com/400x300/FF7900/FFFFFF&text=OM+1250', status: 'validated', created_at: '2026-07-29T08:10:00Z', validated_at: '2026-07-29T08:20:00Z' },
  },
  {
    id: 'deliv-2',
    seller_id: 'demo-seller',
    driver_id: null,
    pickup_address: 'Marché Rood Woko',
    pickup_city: 'Ouagadougou',
    destination_address: 'Koudougou, secteur 4',
    destination_city: 'Koudougou',
    package_weight: 12,
    package_length: 50,
    package_width: 40,
    package_height: 30,
    preferred_date: isoDate(1),
    preferred_time: '08:00 - 10:00',
    description: 'Lot de cosmétiques à livrer à Koudougou',
    price: 15500,
    distance_km: 100,
    status: 'pending',
    cancellation_reason: null,
    created_at: '2026-07-29T16:00:00Z',
    updated_at: '2026-07-29T16:00:00Z',
    accepted_at: null,
    delivered_at: null,
    driver: undefined,
    seller: { id: 'demo-seller', full_name: 'Ibrahim Ouédraogo', phone: '66 98 76 54', avatar_url: null, city: 'Ouagadougou' },
    payment: undefined,
  },
  {
    id: 'deliv-3',
    seller_id: 'demo-seller',
    driver_id: 'driver-user-4',
    pickup_address: 'Quartier Tanghin',
    pickup_city: 'Ouagadougou',
    destination_address: 'Quartier Patte d\'Oie',
    destination_city: 'Ouagadougou',
    package_weight: 2,
    package_length: 20,
    package_width: 15,
    package_height: 10,
    preferred_date: isoDate(-2),
    preferred_time: '14:00 - 16:00',
    description: 'Sac à main',
    price: 800,
    distance_km: 5,
    status: 'delivered',
    cancellation_reason: null,
    created_at: '2026-07-27T13:00:00Z',
    updated_at: '2026-07-27T17:00:00Z',
    accepted_at: '2026-07-27T13:10:00Z',
    delivered_at: '2026-07-27T16:45:00Z',
    driver: DEMO_DRIVER_PROFILES[4],
    seller: { id: 'demo-seller', full_name: 'Ibrahim Ouédraogo', phone: '66 98 76 54', avatar_url: null, city: 'Ouagadougou' },
    payment: { id: 'dpay-3', delivery_id: 'deliv-3', amount: 800, operator: 'orange_money', proof_image_url: null, status: 'validated', created_at: '2026-07-27T13:05:00Z', validated_at: '2026-07-27T13:15:00Z' },
  },
  {
    id: 'deliv-4',
    seller_id: 'demo-seller',
    driver_id: 'driver-user-2',
    pickup_address: 'Depôt Zone 1',
    pickup_city: 'Ouagadougou',
    destination_address: 'Bobo-Dioulassou, Sarfalao',
    destination_city: 'Bobo-Dioulasso',
    package_weight: 80,
    package_length: 100,
    package_width: 60,
    package_height: 50,
    preferred_date: isoDate(-5),
    preferred_time: '08:00 - 10:00',
    description: 'Stock de vêtements pour la boutique de Bobo',
    price: 141000,
    distance_km: 360,
    status: 'cancelled',
    cancellation_reason: 'Client absent à la destination',
    created_at: '2026-07-23T07:00:00Z',
    updated_at: '2026-07-24T10:00:00Z',
    accepted_at: '2026-07-23T07:30:00Z',
    delivered_at: null,
    driver: DEMO_DRIVER_PROFILES[2],
    seller: { id: 'demo-seller', full_name: 'Ibrahim Ouédraogo', phone: '66 98 76 54', avatar_url: null, city: 'Ouagadougou' },
    payment: undefined,
  },
];

export const DEMO_DRIVER_REVIEWS: DeliveryReview[] = [
  { id: 'drev-1', delivery_id: 'deliv-3', reviewer_id: 'demo-seller', rating: 5, comment: 'Livraison rapide et soignée, merci !', created_at: '2026-07-27T17:30:00Z', reviewer: { id: 'demo-seller', full_name: 'Ibrahim Ouédraogo', avatar_url: null } },
  { id: 'drev-2', delivery_id: 'deliv-old-1', reviewer_id: 'seller-x', rating: 4, comment: 'Bon service, léger retard.', created_at: '2026-07-15T10:00:00Z', reviewer: { id: 'seller-x', full_name: 'Awa K.', avatar_url: null } },
];

// ============================================================
// Promotion de boutique (démo) — liens de partage, codes promo, événements
// ============================================================

const SHARE_BASE_URL = 'https://boutikplus.vercel.app/s';

export const DEMO_SHARE_LINKS: ShareLink[] = [
  {
    id: 'sl-1',
    shop_id: 'shop-1',
    owner_id: 'demo-seller',
    slug: 'faso-fashion',
    label: 'Lien principal WhatsApp',
    source: 'whatsapp',
    medium: 'social',
    campaign: 'Soldes été',
    target_url: `${SHARE_BASE_URL}/faso-fashion?utm_source=whatsapp&utm_medium=social&utm_campaign=ete`,
    is_active: true,
    created_at: '2026-07-01T08:00:00Z',
    views_count: 248,
    clicks_count: 96,
    conversions_count: 18,
    revenue_total: 270000,
  },
  {
    id: 'sl-2',
    shop_id: 'shop-1',
    owner_id: 'demo-seller',
    slug: 'faso-qr',
    label: 'QR code boutique physique',
    source: 'qr_code',
    medium: 'qr',
    campaign: 'Boutique Ouaga',
    target_url: `${SHARE_BASE_URL}/faso-qr?utm_source=qr_code&utm_medium=qr&utm_campaign=boutique`,
    is_active: true,
    created_at: '2026-07-05T10:00:00Z',
    views_count: 132,
    clicks_count: 58,
    conversions_count: 9,
    revenue_total: 135000,
  },
  {
    id: 'sl-3',
    shop_id: 'shop-2',
    owner_id: 'demo-seller',
    slug: 'karite-naturel',
    label: 'Campagne Facebook',
    source: 'facebook',
    medium: 'social',
    campaign: 'Lancement savons',
    target_url: `${SHARE_BASE_URL}/karite-naturel?utm_source=facebook&utm_medium=social&utm_campaign=savons`,
    is_active: true,
    created_at: '2026-07-10T09:00:00Z',
    views_count: 187,
    clicks_count: 64,
    conversions_count: 11,
    revenue_total: 38500,
  },
  {
    id: 'sl-4',
    shop_id: 'shop-3',
    owner_id: 'demo-seller',
    slug: 'delices-koudougou',
    label: 'Instagram Délices',
    source: 'instagram',
    medium: 'social',
    campaign: 'Gâteaux Ramadan',
    target_url: `${SHARE_BASE_URL}/delices-koudougou?utm_source=instagram&utm_medium=social&utm_campaign=ramadan`,
    is_active: true,
    created_at: '2026-07-12T14:00:00Z',
    views_count: 95,
    clicks_count: 31,
    conversions_count: 4,
    revenue_total: 14000,
  },
  {
    id: 'sl-5',
    shop_id: 'shop-1',
    owner_id: 'demo-seller',
    slug: 'faso-tiktok',
    label: 'Lien vidéo TikTok',
    source: 'tiktok',
    medium: 'social',
    campaign: 'Défilé wax',
    target_url: `${SHARE_BASE_URL}/faso-tiktok?utm_source=tiktok&utm_medium=social&utm_campaign=defile`,
    is_active: true,
    created_at: '2026-07-18T16:00:00Z',
    views_count: 412,
    clicks_count: 88,
    conversions_count: 7,
    revenue_total: 105000,
  },
  {
    id: 'sl-6',
    shop_id: 'shop-2',
    owner_id: 'demo-seller',
    slug: 'karite-snap',
    label: 'Story Snapchat',
    source: 'snapchat',
    medium: 'social',
    campaign: 'Routine beauté',
    target_url: `${SHARE_BASE_URL}/karite-snap?utm_source=snapchat&utm_medium=social&utm_campaign=beaute`,
    is_active: true,
    created_at: '2026-07-22T11:00:00Z',
    views_count: 156,
    clicks_count: 42,
    conversions_count: 5,
    revenue_total: 17500,
  },
];

export const DEMO_DISCOUNT_CODES: DiscountCode[] = [
  {
    id: 'dc-1',
    shop_id: 'shop-1',
    code: 'WAX20',
    discount_type: 'percentage',
    discount_value: 20,
    min_order_amount: 5000,
    max_uses: 100,
    uses_count: 18,
    expires_at: '2026-09-30T23:59:59Z',
    status: 'active',
    created_at: '2026-07-01T08:00:00Z',
  },
  {
    id: 'dc-2',
    shop_id: 'shop-2',
    code: 'KARITE1000',
    discount_type: 'fixed',
    discount_value: 1000,
    min_order_amount: 5000,
    max_uses: 50,
    uses_count: 11,
    expires_at: '2026-08-31T23:59:59Z',
    status: 'active',
    created_at: '2026-07-10T09:00:00Z',
  },
  {
    id: 'dc-3',
    shop_id: 'shop-3',
    code: 'GATEAU15',
    discount_type: 'percentage',
    discount_value: 15,
    min_order_amount: 3000,
    max_uses: 0,
    uses_count: 4,
    expires_at: '2026-08-15T23:59:59Z',
    status: 'active',
    created_at: '2026-07-12T14:00:00Z',
  },
];

// Génère ~40 événements sur 14 jours (ratio view:click:conversion ≈ 10:4:1.5)
// répartis sur les liens de partage démo, avec villes burkinabè et montants FCFA.
function generateDemoCampaignEvents(): CampaignEvent[] {
  const events: CampaignEvent[] = [];
  const cities = ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 'Kaya'];
  const now = new Date();
  let counter = 0;

  const configs: {
    linkId: string;
    shopId: string;
    source: CampaignEvent['source'];
    medium: CampaignEvent['medium'];
    views: number;
    clicks: number;
    conversions: number;
    avgAmount: number;
  }[] = [
    { linkId: 'sl-1', shopId: 'shop-1', source: 'whatsapp', medium: 'social', views: 26, clicks: 10, conversions: 2, avgAmount: 15000 },
    { linkId: 'sl-2', shopId: 'shop-1', source: 'qr_code', medium: 'qr', views: 14, clicks: 6, conversions: 1, avgAmount: 15000 },
    { linkId: 'sl-3', shopId: 'shop-2', source: 'facebook', medium: 'social', views: 20, clicks: 7, conversions: 1, avgAmount: 3500 },
    { linkId: 'sl-4', shopId: 'shop-3', source: 'instagram', medium: 'social', views: 10, clicks: 3, conversions: 0, avgAmount: 3500 },
  ];

  // Seed déterministe pour des résultats reproductibles (importante pour les tests/CI).
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (const cfg of configs) {
    const total = cfg.views + cfg.clicks + cfg.conversions;
    // Répartit les événements sur les 14 derniers jours
    for (let i = 0; i < total; i++) {
      let eventType: CampaignEvent['event_type'];
      if (i < cfg.views) eventType = 'view';
      else if (i < cfg.views + cfg.clicks) eventType = 'click';
      else eventType = 'conversion';

      const daysAgo = Math.floor(rand() * 14);
      const hoursAgo = Math.floor(rand() * 24);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(date.getHours() - hoursAgo);

      counter++;
      events.push({
        id: `ce-${counter}`,
        shop_id: cfg.shopId,
        share_link_id: cfg.linkId,
        promotion_id: null,
        discount_code_id: null,
        event_type: eventType,
        buyer_id: eventType === 'conversion' ? 'demo-buyer' : null,
        amount: eventType === 'conversion' ? cfg.avgAmount : null,
        order_id: eventType === 'conversion' ? `order-track-${counter}` : null,
        city: cities[Math.floor(rand() * cities.length)],
        source: cfg.source,
        medium: cfg.medium,
        created_at: date.toISOString(),
      });
    }
  }

  return events.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export const DEMO_CAMPAIGN_EVENTS: CampaignEvent[] = generateDemoCampaignEvents();
