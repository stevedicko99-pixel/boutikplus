// ============================================================
// BOUTIKPLUS AI SUITE — 3 assistants IA pour vendeurs burkinabè
// ------------------------------------------------------------
// 1. Fiche Magique     — fiche produit complète à partir d'une photo
// 2. Atelier Contenu   — visuels et textes multi-canaux
// 3. Boost Promo       — plan de promotion sur 7 jours
//
// Tous les modules utilisent le proxy Mistral via Edge Function
// Supabase (/functions/v1/mistral-proxy) avec authentification JWT.
// ============================================================

import {
  generateProfessionalDescription,
  suggestPrice,
  suggestCategory,
  generateSalesPage,
  generateFlyerTemplate,
  generateUltraDescription,
  isMistralConfigured,
  callMistralProxy,
  type AIProductContent,
  type DescriptionStyle,
} from './aiService';
import { CATEGORIES, getCategoryName } from '@/constants/categories';
import { colors } from '@/theme';
import { formatFCFA } from './format';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ---------- Utilitaire : wrapper callMistralProxy vers ancienne signature ----------

async function callMistralJSON<T = any>(
  systemPrompt: string,
  userPrompt: string,
  fallback: T,
  maxTokens = 1200,
  temperature = 0.75,
): Promise<T> {
  return callMistralProxy<T>({
    systemPrompt,
    userPrompt,
    maxTokens,
    temperature,
    responseFormat: 'json_object',
    model: 'mistral-tiny',
    fallback,
  });
}

// =============================================================
// 1. ✨ Fiche Magique — fiche produit complète à partir d'une photo
// =============================================================
// 1 photo ou 3 mots → fiche complète : titre, description, prix, variantes,
// SEO local longue traîne et emojis vendeurs.

export interface MagicListingResult extends AIProductContent {
  /** 10 suggestions de noms burkinabè (ton local vs standard) */
  nameSuggestions: string[];
  /** Suggestions de variantes (taille / couleur / option locale) */
  variants: { label: string; options: string[] }[];
  /** 5 mots-clés SEO longue traîne pour Ouaga/Bobo/Koudougou */
  longTailKeywords: string[];
  /** Suggestions d'emojis vendeurs */
  emojis: string[];
}

/** Génère une fiche produit COMPLÈTE à partir d'entrées minimales */
export async function generateMagicListing(params: {
  rawInput: string;
  photoHint?: string;
  targetCity?: string;
  preferredStyle?: DescriptionStyle;
}): Promise<MagicListingResult> {
  const { rawInput, photoHint, targetCity = 'Ouagadougou', preferredStyle = 'selling' } = params;

  // Phase 1 : catégorie + prix
  const [catRes, priceRes] = await Promise.all([
    suggestCategory(rawInput, photoHint),
    suggestPrice(rawInput, CATEGORIES[0].id),
  ]);
  const categoryId = catRes.category_id;
  const categoryName = getCategoryName(categoryId);

  // Phase 2 : contenu IA
  const baseContent = await generateUltraDescription(
    rawInput,
    categoryId,
    catRes.confidence > 0.7 ? priceRes.suggestedPrice : Math.round(priceRes.suggestedPrice * 0.95),
    `Boutique ${targetCity}`,
  );

  // Phase 3 : variantes + suggestions nom + SEO longue traîne (Mistral ou fallback)
  const extrasPrompt = `Produit : "${rawInput}" (${photoHint || 'photo fournie'})
Catégorie : ${categoryName}
Prix suggéré : ${priceRes.suggestedPrice} FCFA
Ville cible : ${targetCity}, Burkina Faso

Retourne JSON :
{
  "nameSuggestions": ["10 variations de noms vendeurs, dont 5 en français simple, 3 avec touche locale (ex: "Le Wax de Ouaga")", "..."],
  "variants": [
    {"label": "Taille", "options": ["S","M","L","XL","XXL"]},
    {"label": "Couleur", "options": ["Rouge terre","Bleu Sahel","Beige Karité"]}
  ],
  "longTailKeywords": ["5 mots-clés SEO longue traine ex: "savon karité Bobo Dioulasso prix"", "..."],
  "emojis": ["5 emojis vendeurs liés au produit"]
}`;

  const fallback = {
    nameSuggestions: [
      `${rawInput} — Édition Premium ${targetCity}`,
      `✨ ${rawInput} — Qualité Garantie`,
      `Le ${rawInput} Préféré des Burkinabè`,
      `${rawInput} — Fait Main au Faso`,
      `🔥 ${rawInput} — Offre Spéciale`,
      `${rawInput} — Authentique & Abordable`,
      `💯 ${rawInput} — Satisfait Ou Remboursé`,
      `${rawInput} — Meilleur Prix ${targetCity}`,
      `⭐ ${rawInput} — 5000+ Clients Satisfaits`,
      `🚚 ${rawInput} — Livraison Partout au BF`,
    ],
    variants: [
      { label: 'Taille', options: ['S', 'M', 'L', 'XL', 'XXL'] },
      { label: 'Couleur', options: ['Rouge Terre', 'Bleu Sahel', 'Beige Karité', 'Vert Éléphant'] },
    ],
    longTailKeywords: [
      `${categoryName} ${targetCity.toLowerCase()} meilleur prix`,
      `${rawInput.toLowerCase()} pas cher ouagadougou`,
      `acheter ${rawInput.toLowerCase()} bobo-dioulasso livraison`,
      `${categoryName.toLowerCase()} fait au burkina faso`,
      `${rawInput.toLowerCase()} orange money paiement sécurisé`,
    ],
    emojis: ['✨', '🔥', '💯', '🚚', '💳'],
  };

  const extras = await callMistralJSON<typeof fallback>(
    'Tu es un expert listing e-commerce Burkina. Tu génères NOMS vendeurs + VARIANTES locales + SEO longue traîne + EMOJIS.',
    extrasPrompt,
    fallback,
    900,
    0.9,
  );

  return {
    ...baseContent,
    nameSuggestions: extras?.nameSuggestions || fallback.nameSuggestions,
    variants: extras?.variants || fallback.variants,
    longTailKeywords: extras?.longTailKeywords || fallback.longTailKeywords,
    emojis: extras?.emojis || fallback.emojis,
  };
}

// =============================================================
// 2. ⚡ Atelier Contenu — visuels et textes multi-canaux
// =============================================================
// Génère en un lot : captions WhatsApp/TikTok/Facebook/Instagram, hashtags,
// stories et flyers — prêts à publier pour le marché burkinabè.

export interface ContentBatch {
  captions: {
    whatsapp: string[];
    tiktok: string[];
    facebook: string[];
    instagram: string[];
  };
  hashtags: string[];
  stories: string[];
  flyers: { title: string; cta: string; shareText: string }[];
}

/** Génère 1 batch de 12 contenus multi-canaux */
export async function generateSmartContentBatch(params: {
  productName: string;
  price: number;
  shopName: string;
  shopCity: string;
  categoryId: string;
  promo?: string; // ex: "-20% ce weekend"
}): Promise<ContentBatch> {
  const { productName, price, shopName, shopCity, categoryId, promo } = params;
  const catName = getCategoryName(categoryId);

  const systemPrompt = `Tu es un social media manager SÉNIOR spécialisé Afrique de l'Ouest.
Tu écris des captions courtes, punchy, avec mots-clés locaux burkinabè, incluant systématiquement un appel WhatsApp, Mobile Money, et livraison.
RULES :
- WhatsApp status = 3-4 lignes MAX, tons très décontracté, emojis vendeurs
- TikTok = sous-titres qui défilent, hashtags #FaitAuBurkina #BoutikPlus #(Ville)
- Facebook = texte plus descriptif, 5-7 lignes, preuve sociale
- Instagram = visuel, story-oriented, hashtags ciblés
- Hashtags : MIX 30% large + 50% niche + 20% local Burkina
- Stories = questions / sondages style Instagram`;

  const userPrompt = `Produit : "${productName}"
Prix : ${price} FCFA
Boutique : "${shopName}" (${shopCity})
Catégorie : ${catName}
Promo : ${promo || '(aucune)'}

Génère JSON :
{
  "captions": {
    "whatsapp": ["2 statuts WhatsApp courts punchy 3-4 lignes"],
    "tiktok": ["2 sous-titres TikTok avec hashtags finaux"],
    "facebook": ["2 posts Facebook descriptifs 5-7 lignes"],
    "instagram": ["2 posts Instagram vendeurs"]
  },
  "hashtags": ["10 hashtags mix large/niche/local"],
  "stories": ["4 story texts : 2 sondages + 2 quiz style Instagram"],
  "flyers": ["2 flyers textuels : chacun { title, cta, shareText }"]
}`;

  // Flyer fallback indépendant
  const [flyer1, flyer2] = await Promise.all([
    generateFlyerTemplate(productName, price, shopName),
    generateFlyerTemplate(`${productName} ${promo || ''}`, price * 0.9, shopName),
  ]);

  const fallback: ContentBatch = {
    captions: {
      whatsapp: [
        `🔥 ${productName} dispo chez ${shopName} (${shopCity}) !\n💵 ${formatFCFA(price)} seulement\n📱 Paiement Orange / Moov Money\n🚚 Livraison dans tout le BF\n👉 Écris-moi en MP maintenant !`,
        `💯 ${productName} — Qualité garantie satisfait OU remboursé !\n📍 Retrait possible ${shopCity}\n🎁 ${promo || 'Cadeau surprise'} pour les 10 premiers\n💬 WhatsApp direct sur la photo`,
      ],
      tiktok: [
        `${productName} à ${formatFCFA(price)} seulement 🔥 Vous en pensez quoi ?\n#FaitAuBurkina #${shopCity.replace(/\s/g, '')} #${catName.replace(/\s/g, '')} #BoutikPlus`,
        `Le ${productName} que tout le monde s'arrache à ${shopCity} 🇫🇯\n#BoutiqueBurkina #${shopName.replace(/\s/g, '')} #TendanceBF #EcommerceOuaga`,
      ],
      facebook: [
        `✨ NOUVEAUTÉ ✨\n\nDécouvrez "${productName}" — la référence ${catName} au Burkina Faso.\n\n📍 Disponible chez ${shopName} (${shopCity})\n💳 Prix : ${formatFCFA(price)} FCFA\n🚚 Livraison offerte dès 30.000 FCFA d'achat !\n💳 Paiement Mobile Money (Orange / Moov Money)\n↩️ Retours gratuits sous 7 jours\n\n👉 Lien WhatsApp en commentaire pour commander.  Partagez à un ami qui a besoin !`,
        `💥 Le BEST-SELLER du mois est de retour : ${productName} 💥\n\nPlus de 500 clients burkinabè nous font déjà confiance pour ce produit.\n\n✅ Qualité premium\n✅ Livraison rapide 2-5 jours\n✅ Support 7j/7 WhatsApp\n✅ Prix imbattable : ${formatFCFA(price)} FCFA\n\nCliquez sur "Envoyer un message" pour recevoir votre produit en 48h.`,
      ],
      instagram: [
        `${productName} — votre nouvelle obsession 💫\n.${promo ? `\n⚡ ${promo} EN CE MOMENT\n` : ''}\n📍 Boutique: ${shopName} · ${shopCity}\n💵 ${formatFCFA(price)}\n.💬 DM or WhatsApp pour commander\n.\n.\n#BoutikPlus #FaitAuBurkina #${catName.replace(/\s/g, '')} #ShopLocalBF #Ouagadougou #BoboDioulasso`,
        `Spoiler : c'est le ${catName} le plus vendu du moment sur BoutikPlus 🔥\n.\nProduit : ${productName}\nBoutique : ${shopName}\nPrix : ${formatFCFA(price)}\n.\n👉 Slide up / lien en bio pour commander`,
      ],
    },
    hashtags: [
      '#FaitAuBurkina', '#BoutikPlus', `#${shopCity.replace(/\s/g, '')}`,
      `#${catName.replace(/\s/g, '')}`, '#EcommerceBF', '#ShopLocalBF',
      `#${productName.replace(/\s/g, '')}`, `#${shopName.replace(/\s/g, '')}`,
      '#Ouagadougou', '#BoboDioulasso', '#MobileMoneyBF', '#QualitéGarantie',
    ],
    stories: [
      `📊 Tu préfères quel format ?\nA) ${productName} simple\nB) ${productName} premium\n👉 Slide up pour voter !`,
      `🎁 Quiz : Combien coûte ${productName} ?\nA) ${formatFCFA(Math.round(price * 1.4))}\nB) ${formatFCFA(price)}\n👉 Réponse en story suivante !`,
      `✨ Nouveau jour, nouveau style.\n${productName} est disponible MAINTENANT sur @${shopName.replace(/\s/g, '_').toLowerCase()}\n#FaitAuBurkina`,
      `🔥 Vite ! Il reste plus que ${Math.floor(2 + Math.random() * 8)} exemplaires de ${productName}.\n👉 Lien en bio pour commander AVANT rupture.`,
    ],
    flyers: [
      { title: flyer1.title, cta: flyer1.callToAction, shareText: flyer1.shareText },
      { title: flyer2.title, cta: flyer2.callToAction, shareText: flyer2.shareText },
    ],
  };

  const res = await callMistralJSON<ContentBatch>(systemPrompt, userPrompt, fallback, 1800, 0.92);
  return res || fallback;
}

// =============================================================
// 3. ⚡ Boost Promo — plan de promotion sur 7 jours
// =============================================================
// Plan quotidien sur 7 jours, multi-canaux (WhatsApp Status, TikTok Reel,
// Facebook Post, SMS groupe, influenceurs BF) avec personnalisation ville
// et audience.

export type PushChannel = 'whatsapp_status' | 'tiktok_reel' | 'facebook_post' | 'sms_group' | 'influencer_bf';

export interface LightningPlan {
  productName: string;
  budgetFCFA: number;
  periodDays: number;
  cities: string[];
  channels: PushChannel[];
  /** Chaque jour contient la liste des posts à faire */
  days: {
    day: number;
    date: string;
    posts: {
      channel: PushChannel;
      time: string;
      title: string;
      copy: string;
      hashtags: string[];
      targeting: string;
      expectedReach: number;
      expectedClicks: number;
    }[];
    expectedSales: number;
  }[];
  summary: {
    totalReach: number;
    totalClicks: number;
    expectedROAS: number; // Return On Ad Spend : CA / Budget
    totalExpectedSalesFCFA: number;
  };
}

/** Génère un plan de promotion sur 7 jours */
export async function generateLightningPushPlan(params: {
  productName: string;
  price: number;
  shopName: string;
  shopCity: string;
  categoryId: string;
  budgetFCFA: number;
  periodDays?: 7 | 14;
  targetCities?: string[];
}): Promise<LightningPlan> {
  const {
    productName, price, shopName, shopCity, categoryId,
    budgetFCFA, periodDays = 7,
    targetCities = ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Boulsa'],
  } = params;
  const catName = getCategoryName(categoryId);

  const systemPrompt = `Tu es un media planner DIGITAL BURKINA, expert en lancement de produit rapide (type "flash sale").
Tu plans pour ${periodDays} jours des posts multi-canaux.
Chiffres attendus pour le Burkina (réalistes) :
  - WhatsApp status posté à 19h : reach = 350 vues/jour
  - TikTok Reel : reach = 1500 vues (jour 1), +30% croissance jour suivant
  - Facebook post (public ciblé ${shopCity} 18-35) : reach = 800 / 1000 FCFA dépensé
  - SMS groupe (60 groupes de contacts vendeurs) : 5% clic
  - Influenceur local nano (5k abonnés TikTok) : 8000 vues
Les ROI attendus sont RÉALISTES. JAMAIS de chiffres fous.`;

  const userPrompt = `Plan lancement produit "${productName}" :
Prix unitaire : ${price} FCFA
Boutique : ${shopName} (${shopCity})
Budget marketing TOTAL : ${budgetFCFA} FCFA
Durée : ${periodDays} jours
Catégorie : ${catName}
Villes ciblées : ${targetCities.join(', ')}

GENERE JSON EXACT :
{
  "cities": ["liste villes"],
  "channels": ["whatsapp_status","tiktok_reel","facebook_post","sms_group","influencer_bf"],
  "days": [
    {
      "day": 1,
      "date": "JJ/MM",
      "posts": [
        { "channel": "...", "time": "19:00", "title": "...", "copy": "texte copy 3-5 lignes punchy", "hashtags": ["#","#"], "targeting": "18-34 ans Ouagadougou", "expectedReach": 200, "expectedClicks": 25 }
      ],
      "expectedSales": 3
    }
  ],
  "summary": { "totalReach": 0, "totalClicks": 0, "expectedROAS": 10, "totalExpectedSalesFCFA": 0 }
}
Génère ${periodDays} jours.`;

  // Fallback ultra-optimisé Burkina
  const reachPerChannel: Record<PushChannel, { min: number; max: number; ctr: number; costFCFA: number }> = {
    whatsapp_status: { min: 300, max: 500, ctr: 0.08, costFCFA: 0 },
    tiktok_reel:     { min: 1200, max: 2500, ctr: 0.05, costFCFA: 0 },
    facebook_post:   { min: 500, max: 900, ctr: 0.04, costFCFA: 1500 },
    sms_group:       { min: 250, max: 450, ctr: 0.06, costFCFA: 800 },
    influencer_bf:   { min: 5000, max: 9000, ctr: 0.07, costFCFA: 7500 },
  };

  const channels: PushChannel[] = budgetFCFA >= 15000
    ? ['whatsapp_status', 'tiktok_reel', 'facebook_post', 'sms_group', 'influencer_bf']
    : budgetFCFA >= 5000
      ? ['whatsapp_status', 'tiktok_reel', 'facebook_post']
      : ['whatsapp_status', 'tiktok_reel'];

  const days: LightningPlan['days'] = [];
  let totalReach = 0;
  let totalClicks = 0;
  let totalSalesFCFA = 0;
  let remainingBudget = budgetFCFA;

  for (let d = 1; d <= periodDays; d++) {
    const posts: LightningPlan['days'][number]['posts'] = [];
    for (const ch of channels) {
      const cfg = reachPerChannel[ch];
      if (cfg.costFCFA > remainingBudget && ch !== 'whatsapp_status' && ch !== 'tiktok_reel') continue;
      const reach = Math.round(cfg.min + Math.random() * (cfg.max - cfg.min));
      const clicks = Math.round(reach * cfg.ctr);
      posts.push({
        channel: ch,
        time: ch === 'whatsapp_status' ? '19:00' : ch === 'tiktok_reel' ? '20:30' : '12:15',
        title: ch === 'whatsapp_status' ? `📢 ${productName} — Promo Jour J${d}`
             : ch === 'tiktok_reel'     ? `🎥 Reel : Découvrez ${productName}`
             : ch === 'facebook_post'   ? `🛒 ${productName} — Edition limitée`
             : ch === 'sms_group'       ? `SMS: ${productName} dispo`
             :                            `⭐ Collab: ${productName} x ${shopName}`,
        copy: `🔥 **${productName}** est enfin là !\n💵 ${formatFCFA(price)} seulement.\n📍 Retrait ${shopCity} ou livraison 24h.\n👉 Clique sur le lien en bio ou WhatsApp pour commander !\n\n${shopName} — #FaitAuBurkina`,
        hashtags: ['#FaitAuBurkina', `#${catName.replace(/\s/g, '')}`, `#${shopCity.replace(/\s/g, '')}`, '#BoutikPlus', `#J${d}`],
        targeting: d % 2 === 0 ? targetCities.slice(0, 2).join(', ') : targetCities.slice(2).join(', '),
        expectedReach: reach,
        expectedClicks: clicks,
      });
      remainingBudget -= cfg.costFCFA;
      totalReach += reach;
      totalClicks += clicks;
    }
    // ~3.2% des clics convertissent
    const convRate = 0.032 + d * 0.001;
    const estSales = Math.max(1, Math.round(posts.reduce((s, p) => s + p.expectedClicks, 0) * convRate));
    days.push({
      day: d,
      date: `J${d}`,
      posts,
      expectedSales: estSales,
    });
    totalSalesFCFA += estSales * price;
  }

  const fallback: LightningPlan = {
    productName,
    budgetFCFA,
    periodDays,
    cities: targetCities,
    channels,
    days,
    summary: {
      totalReach,
      totalClicks,
      expectedROAS: budgetFCFA > 0 ? Math.max(4, Math.round((totalSalesFCFA / budgetFCFA) * 10) / 10) : 99,
      totalExpectedSalesFCFA: totalSalesFCFA,
    },
  };

  const res = await callMistralJSON<LightningPlan>(systemPrompt, userPrompt, fallback, 2200, 0.85);
  // S'assurer que summary est toujours là
  if (res && !res.summary) res.summary = fallback.summary;
  // Injecter champs obligatoires
  if (res) {
    res.productName = productName;
    res.budgetFCFA = budgetFCFA;
    res.periodDays = periodDays;
  }
  return res || fallback;
}

// =============================================================
// Pack couleur associé à chaque module (pour UI Hub IA)
// Noms humains et originaux — pas de comparaison "10× vs X".
// =============================================================
export const AISuiteMeta = {
  MagicListingAI:   { name: 'Fiche Magique',    short: 'Express',    icon: 'zap' as const,         color: colors.primary },
  SmartContentAI:   { name: 'Atelier Contenu',  short: 'Contenus',   icon: 'layers' as const,      color: colors.secondary },
  LightningPushAI:  { name: 'Boost Promo',      short: 'Promo',      icon: 'send' as const,        color: colors.warning },
} as const;

/** Taglines courtes et humaines pour chaque module (sous-titre UI). */
export const AISuiteTaglines: Record<keyof typeof AISuiteMeta, string> = {
  MagicListingAI:  'Une photo, une fiche produit complète en quelques secondes',
  SmartContentAI:  'Visuels et textes prêts pour WhatsApp, TikTok et Facebook',
  LightningPushAI: 'Un plan de promo sur 7 jours pour décoller',
};
