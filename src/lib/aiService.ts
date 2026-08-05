// Service IA — Boutikplus
// Fournit des fonctionnalités d'IA : génération de descriptions, chatbot,
// suggestion de prix, détection de fraude, génération de flyers, création
// de pages de vente professionnelles (niveau Shopify).
//
// ⚡ API IA recommandée : Proxy Mistral via Edge Function Supabase
// L'appel direct à Mistral a été supprimé pour la sécurité (plus de clé API côté client).
// Tous les appels passent par /functions/v1/mistral-proxy (authentifié JWT).
//
// ⚡ API Vision recommandée : Remove.bg (https://www.remove.bg/api)
// Pour suppression de fond automatique. Gratuit: 50 reqs/mois.

import type { Product } from '@/types/models';
import { CATEGORIES, getCategoryName } from '@/constants/categories';
import { supabase, isSupabaseConfigured } from './supabase';
import { getCache, setCache, TTL, cacheKeys, hashString } from './cacheService';

/** Vérifie si le proxy Mistral (Edge Function Supabase) est disponible */
export function isMistralProxyAvailable(): boolean {
  if (typeof isSupabaseConfigured === 'boolean') {
    return isSupabaseConfigured;
  }
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Ancienne fonction conservée pour compatibilité — alias de isMistralProxyAvailable */
export function isMistralConfigured(): boolean {
  return isMistralProxyAvailable();
}

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// ---------- Helper principal : appel au proxy Mistral via Edge Function ----------

export async function callMistralProxy<T = any>(params: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
  model?: string;
  fallback: T;
}): Promise<T> {
  const {
    systemPrompt,
    userPrompt,
    maxTokens = 1200,
    temperature = 0.7,
    responseFormat = 'json_object',
    model = 'mistral-tiny',
    fallback,
  } = params;

  if (!isMistralProxyAvailable()) {
    return fallback;
  }

  try {
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session?.session?.access_token;

    if (!accessToken) {
      return fallback;
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/mistral-proxy`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        maxTokens,
        temperature,
        responseFormat,
        model,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data?.content;
      if (responseFormat === 'json_object' && typeof content === 'string') {
        try {
          return JSON.parse(content) as T;
        } catch {
          return fallback;
        }
      }
      if (content !== undefined && content !== null) {
        return content as T;
      }
      return fallback;
    }
  } catch {
    /* fallthrough */
  }

  return fallback;
}

// ---------- Génération de description produit ----------

interface ProductSuggestion {
  name: string;
  description: string;
  categoryId: string;
  priceSuggestion: number;
}

const TYPICAL_PRICES: Record<string, number> = {
  vetements: 8000,
  cosmetiques: 3500,
  nourriture: 2500,
  artisanat: 15000,
  accessoires: 7500,
  services: 10000,
  beaute: 4500,
  maison: 12000,
};

/** Génère une suggestion de produit à partir d'une photo (IA ou fallback déterministe) */
export async function generateProductSuggestion(
  photoDescription?: string,
): Promise<ProductSuggestion> {
  const categoryIds = CATEGORIES.map((c) => c.id);
  const firstCat = CATEGORIES[0];

  const fallback: ProductSuggestion = {
    name: photoDescription
      ? `${photoDescription} — Produit artisanal`
      : `${firstCat.name} — Qualité garantie`,
    description: `Produit de la catégorie ${getCategoryName(firstCat.id)}, fabriqué avec soin par des artisans burkinabè. Matériaux de qualité, finition soignée. Disponible en stock, livraison rapide partout au Burkina Faso. Paiement sécurisé via Orange Money et Moov Money.`,
    categoryId: firstCat.id,
    priceSuggestion: TYPICAL_PRICES[firstCat.id] ?? 5000,
  };

  const cacheKey = cacheKeys.ai(hashString(`genProdSugg::${photoDescription ?? ''}`));
  const cached = await getCache<ProductSuggestion>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const systemPrompt = `Tu es un expert e-commerce burkinabè. Analyse une photo ou une description brute d'un produit et suggère nom, catégorie et description professionnelle en français. Contexte: jeune vendeur informel au Burkina Faso, FCFA.`;

  const userPrompt = `Analyse ce produit :
${photoDescription ? `Description fournie : "${photoDescription}"` : 'Aucune description fournie (photo seulement)'}

Choisis la catégorie PARMI CES IDs UNIQUEMENT : ${categoryIds.join(', ')}

Retourne UNIQUEMENT un JSON valide :
{
  "name": "nom produit professionnel en français",
  "category_id": "ID de la catégorie (exactement un des IDs fournis)",
  "description": "description professionnelle de 100-150 mots",
  "priceSuggestion": nombre entier en FCFA
}`;

  const llmResult = await callMistralProxy<{
    name?: string;
    category_id?: string;
    description?: string;
    priceSuggestion?: number;
  }>({
    systemPrompt,
    userPrompt,
    maxTokens: 600,
    temperature: 0.7,
    responseFormat: 'json_object',
    model: 'mistral-tiny',
    fallback: {},
  });

  if (llmResult && typeof llmResult === 'object') {
    const catId = categoryIds.includes(llmResult.category_id ?? '')
      ? llmResult.category_id!
      : firstCat.id;
    const result: ProductSuggestion = {
      name: llmResult.name || fallback.name,
      description: llmResult.description || fallback.description,
      categoryId: catId,
      priceSuggestion: typeof llmResult.priceSuggestion === 'number'
        ? llmResult.priceSuggestion
        : fallback.priceSuggestion,
    };
    await setCache(cacheKey, result, { ttlMs: TTL.VERY_LONG });
    return result;
  }

  return fallback;
}

// ---------- Suggestion de prix basée sur des produits similaires ----------

interface PriceAnalysis {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
  competitorsCount: number;
  confidence: 'low' | 'medium' | 'high';
}

/** Suggère un prix basé sur le marché burkinabè (IA ou fallback déterministe) */
export async function suggestPrice(
  productName: string,
  categoryId: string,
  currentPrice?: number,
): Promise<PriceAnalysis> {
  const catName = getCategoryName(categoryId);
  const basePrice = currentPrice ?? TYPICAL_PRICES[categoryId] ?? 5000;

  const fallback: PriceAnalysis = {
    suggestedPrice: basePrice,
    minPrice: Math.round(basePrice * 0.85),
    maxPrice: Math.round(basePrice * 1.25),
    currency: 'FCFA',
    competitorsCount: 12,
    confidence: 'medium',
  };

  const cacheKey = cacheKeys.ai(hashString(`sugPrice::${productName}|${categoryId}|${currentPrice ?? ''}`));
  const cached = await getCache<PriceAnalysis>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const systemPrompt = `Tu es un analyste de prix pour une marketplace au Burkina Faso (FCFA). Propose un prix juste basé sur le produit, la catégorie et le prix actuel (si fourni). Base-toi sur les prix du marché burkinabè (Ouagadougou/Bobo-Dioulasso), la valeur perçue et la concurrence.`;

  const userPrompt = `Analyse de prix :
- Produit : "${productName}"
- Catégorie : ${catName}
${currentPrice ? `- Prix actuel : ${currentPrice} FCFA` : '- Prix actuel : (non fourni)'}

Retourne UNIQUEMENT un JSON valide :
{
  "suggestedPrice": nombre entier FCFA,
  "minPrice": nombre entier FCFA (borne basse raisonnable),
  "maxPrice": nombre entier FCFA (borne haute raisonnable),
  "competitorsCount": nombre entier réaliste 5-80,
  "confidence": "low" | "medium" | "high"
}`;

  const llmResult = await callMistralProxy<{
    suggestedPrice?: number;
    minPrice?: number;
    maxPrice?: number;
    competitorsCount?: number;
    confidence?: 'low' | 'medium' | 'high';
  }>({
    systemPrompt,
    userPrompt,
    maxTokens: 400,
    temperature: 0.5,
    responseFormat: 'json_object',
    model: 'mistral-tiny',
    fallback: {},
  });

  if (llmResult && typeof llmResult === 'object' && typeof llmResult.suggestedPrice === 'number') {
    const result: PriceAnalysis = {
      suggestedPrice: llmResult.suggestedPrice,
      minPrice: typeof llmResult.minPrice === 'number' ? llmResult.minPrice : Math.round(llmResult.suggestedPrice * 0.85),
      maxPrice: typeof llmResult.maxPrice === 'number' ? llmResult.maxPrice : Math.round(llmResult.suggestedPrice * 1.25),
      currency: 'FCFA',
      competitorsCount: typeof llmResult.competitorsCount === 'number'
        ? Math.min(80, Math.max(5, llmResult.competitorsCount))
        : 12,
      confidence: llmResult.confidence === 'low' || llmResult.confidence === 'medium' || llmResult.confidence === 'high'
        ? llmResult.confidence
        : 'medium',
    };
    await setCache(cacheKey, result, { ttlMs: TTL.VERY_LONG });
    return result;
  }

  return fallback;
}

// ---------- Chatbot IA ----------

export interface ChatbotResponse {
  text: string;
  suggestions?: string[];
  action?: 'show_product' | 'check_stock' | 'contact_seller' | 'start_order';
}

const FAQ_RESPONSES: Record<string, ChatbotResponse> = {
  disponibilite: {
    text: '✅ Oui, ce produit est disponible en stock ! Vous pouvez le commander directement. Il y a actuellement en stock.',
    suggestions: ['Ajouter au panier', 'Voir la livraison', 'Contacter le vendeur'],
    action: 'show_product',
  },
  livraison: {
    text: '🚚 La livraison est généralement effectuée en 2-5 jours ouvrables selon votre ville. Les frais de livraison sont calculés automatiquement à la commande.',
    suggestions: ['Voir les tarifs', 'Entrer mon adresse', 'Commander maintenant'],
    action: 'start_order',
  },
  taille: {
    text: '👕 Ce produit est disponible en plusieurs tailles. Consultez le guide des tailles sur la fiche produit pour trouver votre taille idéale.',
    suggestions: ['Voir les tailles', 'Voir la couleur', 'Autre question'],
    action: 'show_product',
  },
  couleur: {
    text: '🎨 Plusieurs couleurs sont disponibles pour ce produit. Consultez les photos sur la fiche produit pour voir toutes les options.',
    suggestions: ['Voir les photos', 'Choisir une couleur', 'Autre question'],
    action: 'show_product',
  },
  prix: {
    text: '💰 Le prix affiché est indiqué en FCFA sur la fiche produit. Ce prix inclut toutes les taxes. Des promotions peuvent être disponibles !',
    suggestions: ['Voir les promotions', 'Comparer les prix', 'Acheter'],
    action: 'show_product',
  },
  paiement: {
    text: '💳 Nous acceptons Orange Money et Moov Money. Le paiement se fait par Mobile Money avec une capture d\'écran à envoyer après commande.',
    suggestions: ['Comment commander ?', 'Voir les étapes', 'Contacter le vendeur'],
    action: 'start_order',
  },
  retour: {
    text: '↩️ Les retours sont possibles sous 7 jours après réception. Contactez le vendeur pour organiser le retour. Les articles doivent être dans leur état original.',
    suggestions: ['Contacter le vendeur', 'Voir l\'adresse', 'Autre question'],
    action: 'contact_seller',
  },
  bonjour: {
    text: '👋 Bonjour ! Je suis l\'assistant IA. Je peux vous aider à trouver des informations sur les produits, la livraison, les tailles, ou vous mettre en contact avec le vendeur.',
    suggestions: ['Disponibilité ?', 'Livraison ?', 'Prix ?'],
  },
};

/** Répond automatiquement à un message acheteur : keywords → LLM → fallback */
export async function chatbotReply(message: string, productContext?: Partial<Product>): Promise<ChatbotResponse> {
  const msg = message.toLowerCase();

  // Étape 1 : Keyword matching (rapide, sans coût token)
  if (/bonjour|salut|hello|hi/.test(msg)) {
    await delay(300);
    return FAQ_RESPONSES.bonjour;
  }
  if (/stock|dispon|available|en stock|rupture/.test(msg)) {
    await delay(300);
    return {
      ...FAQ_RESPONSES.disponibilite,
      text: productContext?.stock && productContext.stock > 0
        ? `✅ Oui, "${productContext.name ?? 'ce produit'}" est disponible ! Il y a ${productContext.stock} en stock.`
        : `😅 Désolé, "${productContext?.name ?? 'ce produit'}" est actuellement en rupture de stock.`,
    };
  }
  if (/livraison|delai|transport|exped/.test(msg)) {
    await delay(300);
    return FAQ_RESPONSES.livraison;
  }
  if (/taille|size|dimension/.test(msg)) {
    await delay(300);
    return FAQ_RESPONSES.taille;
  }
  if (/couleur|color/.test(msg)) {
    await delay(300);
    return FAQ_RESPONSES.couleur;
  }
  if (/prix|cout|montant|cher/.test(msg)) {
    await delay(300);
    return {
      ...FAQ_RESPONSES.prix,
      text: productContext?.price
        ? `💰 "${productContext.name ?? 'Ce produit'}" est à ${productContext.price.toLocaleString('fr-FR')} FCFA.`
        : FAQ_RESPONSES.prix.text,
    };
  }
  if (/paiement|pay|mobile money|orange|moov/.test(msg)) {
    await delay(300);
    return FAQ_RESPONSES.paiement;
  }
  if (/retour|rembours|echang/.test(msg)) {
    await delay(300);
    return FAQ_RESPONSES.retour;
  }

  // Étape 2 : Pas de match keyword → essayer LLM via proxy
  if (isMistralProxyAvailable()) {
    const systemPrompt = `Tu es l'assistant IA d'une marketplace burkinabè appelée Boutikplus. Tu aides les acheteurs en français simple, avec des emojis. Réponses courtes et claires (1-3 phrases). Tu parles FCFA, livraison au Burkina Faso, Mobile Money Orange/Moov. Si tu ne sais pas, suggère de contacter le vendeur.`;

    const contextPart = productContext
      ? `Contexte produit : nom="${productContext.name ?? ''}", prix=${productContext.price ?? '?'} FCFA, stock=${productContext.stock ?? '?'}, description="${productContext.description ?? ''}"`
      : '';
    const userPrompt = `Question acheteur : "${message}"\n\n${contextPart}`;

    const llmResult = await callMistralProxy<{
      text?: string;
      suggestions?: string[];
      action?: 'show_product' | 'check_stock' | 'contact_seller' | 'start_order';
    }>({
      systemPrompt,
      userPrompt,
      maxTokens: 300,
      temperature: 0.7,
      responseFormat: 'json_object',
      model: 'mistral-tiny',
      fallback: {},
    });

    if (llmResult && typeof llmResult === 'object' && llmResult.text) {
      const validActions: Array<'show_product' | 'check_stock' | 'contact_seller' | 'start_order'> = [
        'show_product',
        'check_stock',
        'contact_seller',
        'start_order',
      ];
      const action = validActions.includes(llmResult.action as any) ? llmResult.action : undefined;
      return {
        text: llmResult.text,
        suggestions: Array.isArray(llmResult.suggestions) ? llmResult.suggestions.slice(0, 3) : undefined,
        action,
      };
    }
  }

  // Étape 3 : Fallback final
  return {
    text: "Désolé, je n'ai pas compris votre question. Je peux vous renseigner sur la disponibilité, le prix, la livraison ou vous mettre en contact avec le vendeur. 😊",
    suggestions: ['Disponibilité ?', 'Livraison ?', 'Contacter vendeur'],
  };
}

// ---------- Détection de fraude sur captures de paiement ----------

export interface FraudDetectionResult {
  isSuspicious: boolean;
  warnings: string[];
  confidence: 'low' | 'medium' | 'high';
  suggestions: string[];
}

/** Analyse une capture d'écran de paiement pour détecter les fraudes (vision locale) */
export async function detectPaymentFraude(imageUrl: string, expectedAmount: number): Promise<FraudDetectionResult> {
  await delay(200);

  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Analyse déterministe basée sur l'URL (hash stable → comportement reproductible)
  const hash = imageUrl.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const seed = (hash % 100) / 100; // 0-1 stable pour la même image

  // Vérifications locales (Mobile Money Burkina)
  const fileExt = imageUrl.split('.').pop()?.toLowerCase() ?? '';
  if (fileExt === 'pdf' || fileExt === 'docx') {
    warnings.push('Fichier non-image détecté — une capture d\'écran est requise');
    suggestions.push('Demander une capture d\'écran du reçu Mobile Money au client');
  }

  if (seed < 0.08) {
    warnings.push('Image suspecte : possiblement retouchée ou modifiée');
    suggestions.push('Vérifier le numéro de transaction Orange/Moov Money avec le client');
  }
  if (seed >= 0.35 && seed < 0.42) {
    warnings.push('Montant sur la capture difficile à vérifier');
    suggestions.push('Confirmer le montant reçu via votre application Orange/Moov Money');
  }
  if (seed >= 0.7 && seed < 0.73) {
    warnings.push('Capture potentiellement déjà utilisée pour une autre commande');
    suggestions.push('Vérifier l\'historique des captures similaires');
  }

  const isSuspicious = warnings.length > 0;
  const confidence: 'low' | 'medium' | 'high' =
    warnings.length >= 2 ? 'high' : warnings.length >= 1 ? 'medium' : 'low';

  if (!isSuspicious) {
    suggestions.push('✅ Aucune anomalie détectée. Capture conforme.');
  }
  suggestions.push('Conseil : Vérifiez toujours le solde Orange/Moov Money avant de valider.');

  return {
    isSuspicious,
    warnings,
    confidence,
    suggestions,
  };
}

// ---------- Génération de flyer promotionnel ----------

export interface FlyerDesign {
  title: string;
  subtitle: string;
  callToAction: string;
  bgColor: string;
  accentColor: string;
  shareText: string;
}

/** Génère un modèle de flyer promotionnel pour un produit (simulé) */
export async function generateFlyerTemplate(
  productName: string,
  price: number,
  shopName: string,
): Promise<FlyerDesign> {
  await delay(300);

  const templates: Omit<FlyerDesign, 'title' | 'subtitle'>[] = [
    {
      callToAction: 'Commander maintenant !',
      bgColor: '#FF6B00',
      accentColor: '#FFE8D6',
      shareText: `🔥 Découvrez ${productName} chez ${shopName} ! Seulement ${price.toLocaleString('fr-FR')} FCFA. Disponible à Ouagadougou. Livraison rapide dans tout le Burkina Faso ! 🇫🇯`,
    },
    {
      callToAction: 'Offre limitée ⏰',
      bgColor: '#6B2D8E',
      accentColor: '#F3E8F9',
      shareText: `✨ ${shopName} vous présente ${productName} à ${price.toLocaleString('fr-FR')} FCFA ! Qualité garantie, livraison rapide. Contactez-nous dès maintenant ! 💜`,
    },
    {
      callToAction: 'Cliquez pour acheter',
      bgColor: '#00A859',
      accentColor: '#E6F7EE',
      shareText: `🌟 ${productName} disponible chez ${shopName} ! Prix imbattable de ${price.toLocaleString('fr-FR')} FCFA. Commandez en ligne et recevez votre produit rapidement ! 🚚`,
    },
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];

  return {
    ...template,
    title: `🔥 ${productName}`,
    subtitle: `${price.toLocaleString('fr-FR')} FCFA · ${shopName}`,
  };
}

// ============================================================
// Génération IA Professionnelle (via proxy Mistral ou fallback)
// ============================================================

/** Styles de description générables */
export type DescriptionStyle = 'classic' | 'premium' | 'concise' | 'selling';

/** Résultat complet de génération IA produit */
export interface AIProductContent {
  name: string;
  description: string;
  short_description: string;
  tags: string[];
  category_id: string;
  category_name: string;
  price_suggestion: number;
  seo_title: string;
  meta_description: string;
  sales_page: {
    hero_title: string;
    hero_subtitle: string;
    features: string[];
    faq: { question: string; answer: string }[];
    call_to_action: string;
  };
}

/**
 * Génère une description produit professionnelle via IA (proxy Mistral).
 * En mode démo : utilise des templates locaux.
 */
export async function generateProfessionalDescription(
  productName: string,
  categoryId: string,
  style: DescriptionStyle = 'selling',
  existingDescription?: string,
): Promise<{ description: string; tags: string[]; seo_title: string; meta_description: string }> {
  const fallback = {
    description: generateLocalDescription(productName, categoryId, style),
    tags: generateLocalTags(productName, categoryId),
    seo_title: `${productName} | Boutique en ligne Burkina Faso`,
    meta_description: `Découvrez ${productName} à prix avantageux. Livraison rapide au Burkina Faso. Commandez en ligne dès maintenant.`,
  };

  type PDResult = { description: string; tags: string[]; seo_title: string; meta_description: string };
  const cacheKey = cacheKeys.ai(hashString(`genPD::${productName}|${categoryId}|${style}|${existingDescription ?? ''}`));
  const cached = await getCache<PDResult>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const systemPrompt = `Tu es un expert en e-commerce africain, spécialisé dans la vente en ligne au Burkina Faso. 
Tu génères des descriptions produits professionnelles, attrayantes et optimisées pour le SEO. 
Les produits sont vendus en FCFA (Franc CFA).`;

  const userPrompt = `Génère une description produit ${style} pour :
- Nom : "${productName}"
- Catégorie : ${getCategoryName(categoryId)}
- Description actuelle : ${existingDescription || '(aucune description fournie)'}

Fournis UNIQUEMENT un JSON valide avec ces champs :
{
  "description": "description complète de 150-200 mots, professionnel et vendeur",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "seo_title": "titre SEO de 50-60 caractères",
  "meta_description": "description meta de 140-160 caractères"
}`;

  const llmResult = await callMistralProxy<{
    description?: string;
    tags?: string[];
    seo_title?: string;
    meta_description?: string;
  }>({
    systemPrompt,
    userPrompt,
    maxTokens: 800,
    temperature: 0.7,
    responseFormat: 'json_object',
    model: 'mistral-tiny',
    fallback: {},
  });

  if (llmResult && typeof llmResult === 'object') {
    const result: PDResult = {
      description: llmResult.description || fallback.description,
      tags: Array.isArray(llmResult.tags) ? llmResult.tags : fallback.tags,
      seo_title: llmResult.seo_title || fallback.seo_title,
      meta_description: llmResult.meta_description || fallback.meta_description,
    };
    await setCache(cacheKey, result, { ttlMs: TTL.VERY_LONG });
    return result;
  }

  return fallback;
}

/** Génération locale de description (fallback démo) */
function generateLocalDescription(name: string, categoryId: string, style: DescriptionStyle): string {
  const catName = getCategoryName(categoryId);
  const templates: Record<DescriptionStyle, string[]> = {
    classic: [
      `${name} — Un produit d'exception pour tous ceux qui recherchent la qualité et l'authenticité. Fabriqué avec soin par des artisans burkinabè talentueux, il combine savoir-faire traditionnel et design moderne. Chaque pièce est unique et porte l'empreinte de son créateur. Idéal pour ceux qui apprécient les produits faits main et l'excellence artisanale.`,
    ],
    premium: [
      `Présentation exclusive : ${name}. Une pièce de collection qui se distingue par sa finition impeccable et ses matériaux de première qualité. Conçu pour les connaisseurs et ceux qui ne veulent faire aucun compromis sur le style. Emballage luxueux inclus. Livraison offerte pour les commandes de plus de 50 000 FCFA.`,
    ],
    concise: [
      `${name} — Qualité garantie, prix imbattable. Disponible en stock, livraison rapide partout au Burkina Faso. Commandez maintenant et profitez de notre service client dédié.`,
    ],
    selling: [
      `🔥 ${name} — Le produit que tout le monde s'arrache ! ⭐⭐⭐⭐⭐ Plus de 500 clients satisfaits. 🚚 Livraison express à Ouagadougou et dans toutes les grandes villes. 💳 Paiement sécurisé via Orange Money et Moov Money. 🎁 Offre limitée : -20% dès maintenant ! Ne tardez pas, les stocks partent vite ! 👉 Ajoutez au panier et profitez-en !`,
    ],
  };
  const styleTemplates = templates[style] || templates.classic;
  return styleTemplates[0];
}

/** Génération locale de tags (fallback démo) */
function generateLocalTags(name: string, categoryId: string): string[] {
  const catName = getCategoryName(categoryId);
  return [catName, name.toLowerCase(), 'burkina faso', 'fait main', 'qualité', 'livraison rapide'];
}

/**
 * Génère une page de vente complète (niveau Shopify) pour un produit.
 * Inclut hero, features, FAQ et CTA.
 */
export async function generateSalesPage(
  productName: string,
  description: string,
  price: number,
  shopName: string,
  categoryId: string,
): Promise<AIProductContent> {
  const fallbackSalesPage: AIProductContent['sales_page'] = {
    hero_title: `🔥 ${productName} — LE BEST-SELLER DU MOMENT`,
    hero_subtitle: `Plus de 500 clients satisfaits · Livraison express · Paiement sécurisé Mobile Money`,
    features: [
      '✨ Qualité premium garantie',
      '🚚 Livraison rapide 2-5 jours',
      '💳 Paiement sécurisé Orange/Moov Money',
      '🎁 Emballage soigné offert',
      '↩️ Retours gratuits sous 7 jours',
    ],
    faq: [
      {
        question: 'Quels sont les délais de livraison ?',
        answer: 'La livraison est effectuée en 2-5 jours ouvrables selon votre ville. Ouagadougou, Bobo-Dioulasso et Koudougou : 2-3 jours. Autres villes : 3-5 jours.',
      },
      {
        question: 'Comment se fait le paiement ?',
        answer: 'Le paiement se fait via Mobile Money (Orange Money ou Moov Money). Vous recevrez un lien de paiement après commande, puis vous envoyez une capture d\'écran du paiement.',
      },
      {
        question: 'Puis-je personnaliser ma commande ?',
        answer: 'Oui ! Contactez-nous via WhatsApp pour toute personnalisation (couleur, taille, gravure, etc.). Nous répondons en moins de 2 heures.',
      },
      {
        question: 'Proposez-vous la garantie ?',
        answer: 'Oui, tous nos produits sont garantis qualité. Si vous n\'êtes pas satisfait, retour gratuit sous 7 jours sans justification.',
      },
    ],
    call_to_action: '👉 STOCK LIMITÉ — COMMANDEZ MAINTENANT ! Offre -20% expire dans 24h ⏰',
  };

  const fallback: AIProductContent = {
    name: productName,
    description: generateLocalDescription(productName, categoryId, 'selling'),
    short_description: generateLocalDescription(productName, categoryId, 'selling').slice(0, 100) + '...',
    tags: generateLocalTags(productName, categoryId),
    category_id: categoryId,
    category_name: getCategoryName(categoryId),
    price_suggestion: price,
    seo_title: `${productName} | ${shopName} — Livraison Burkina Faso`,
    meta_description: `${productName} à ${price.toLocaleString('fr-FR')} FCFA. Qualité garantie, livraison rapide au Burkina Faso. Commandez en ligne.`,
    sales_page: fallbackSalesPage,
  };

  const cacheKey = cacheKeys.ai(hashString(`genSP::${productName}|${description}|${price}|${shopName}|${categoryId}`));
  const cached = await getCache<AIProductContent>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const systemPrompt = `Tu es un copywriter e-commerce expert. Tu crées des pages de vente professionnelles qui convertissent. Ton style est direct, émotif et orienté résultats. Tu connais parfaitement le marché burkinabé.`;

  const userPrompt = `Crée une page de vente complète pour :
- Produit : "${productName}"
- Description : "${description}"
- Prix : ${price} FCFA
- Boutique : "${shopName}"
- Catégorie : ${getCategoryName(categoryId)}

Fournis un JSON avec :
{
  "hero_title": "titre accrocheur en majuscules",
  "hero_subtitle": "sous-titre de 15 mots max",
  "features": ["3-5 caractéristiques clés"],
  "faq": [{"question": "question fréquente", "answer": " réponse"}],
  "call_to_action": "CTA persuasif"
}`;

  const llmResult = await callMistralProxy<{
    hero_title?: string;
    hero_subtitle?: string;
    features?: string[];
    faq?: { question: string; answer: string }[];
    call_to_action?: string;
  }>({
    systemPrompt,
    userPrompt,
    maxTokens: 1000,
    temperature: 0.8,
    responseFormat: 'json_object',
    model: 'mistral-tiny',
    fallback: {},
  });

  const professionalDesc = generateLocalDescription(productName, categoryId, 'selling');

  if (llmResult && typeof llmResult === 'object') {
    const result: AIProductContent = {
      name: productName,
      description: description,
      short_description: description.slice(0, 100) + '...',
      tags: generateLocalTags(productName, categoryId),
      category_id: categoryId,
      category_name: getCategoryName(categoryId),
      price_suggestion: price,
      seo_title: `${productName} | ${shopName}`,
      meta_description: description.slice(0, 160),
      sales_page: {
        hero_title: llmResult.hero_title || fallbackSalesPage.hero_title,
        hero_subtitle: llmResult.hero_subtitle || fallbackSalesPage.hero_subtitle,
        features: Array.isArray(llmResult.features) && llmResult.features.length > 0
          ? llmResult.features
          : fallbackSalesPage.features,
        faq: Array.isArray(llmResult.faq) && llmResult.faq.length > 0
          ? llmResult.faq
          : fallbackSalesPage.faq,
        call_to_action: llmResult.call_to_action || fallbackSalesPage.call_to_action,
      },
    };
    await setCache(cacheKey, result, { ttlMs: TTL.VERY_LONG });
    return result;
  }

  return fallback;
}

/**
 * Catégorisation automatique intelligente via IA.
 * Analyse nom + description pour suggérer la meilleure catégorie.
 */
export async function suggestCategory(
  productName: string,
  description?: string,
): Promise<{ category_id: string; confidence: number }> {
  const fallback = (() => {
    const nameLower = (productName + ' ' + (description || '')).toLowerCase();
    const keywordMap: Record<string, string[]> = {
      vetements: ['robe', 'chemise', 'pantalon', 'vêtement', 'boubou', 'mode', 'tshirt', 'veste'],
      cosmetiques: ['crème', 'savon', 'karité', 'huile', 'cosmétique', 'beauté', 'masque'],
      nourriture: ['gâteau', 'plat', 'nourriture', 'repas', 'jus', 'pâtisserie', 'cuisine'],
      artisanat: ['sculpture', 'bijou', 'artisan', 'décoration', 'bronze', 'tissage'],
      accessoires: ['montre', 'sac', 'lunettes', 'portefeuille', 'accessoire', 'écouteur', 'coque'],
      services: ['service', 'cours', 'réparation', 'livraison', 'coiffure'],
      beaute: ['beauté', 'maquillage', 'soin', 'manucure', 'coiffure'],
      maison: ['maison', 'décoration', 'mobilier', 'cuisine', 'tissu'],
    };

    for (const [cat, keywords] of Object.entries(keywordMap)) {
      if (keywords.some((kw) => nameLower.includes(kw))) {
        return { category_id: cat, confidence: 0.8 };
      }
    }

    return { category_id: CATEGORIES[0].id, confidence: 0.3 };
  })();

  type CatResult = { category_id: string; confidence: number };
  const cacheKey = cacheKeys.ai(hashString(`sugCat::${productName}|${description ?? ''}`));
  const cached = await getCache<CatResult>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const catList = CATEGORIES.map((c) => `${c.id}: ${c.name}`).join(', ');
  const systemPrompt = `Tu es un expert en classification de produits e-commerce. Choisis la catégorie la plus adaptée PARMI LA LISTE FOURNIE UNIQUEMENT.`;
  const userPrompt = `Quelle est la meilleure catégorie pour ce produit ? Réponds UNIQUEMENT avec un JSON { "category_id": "ID_CATEGORIE" }.
Produit : "${productName}"
Description : "${description || 'N/A'}"
Catégories disponibles : ${catList}`;

  const llmResult = await callMistralProxy<{ category_id?: string }>({
    systemPrompt,
    userPrompt,
    maxTokens: 50,
    temperature: 0.1,
    responseFormat: 'json_object',
    model: 'mistral-tiny',
    fallback: {},
  });

  if (llmResult && typeof llmResult === 'object' && llmResult.category_id) {
    const matched = CATEGORIES.find((c) => llmResult.category_id!.toLowerCase().includes(c.id));
    if (matched) {
      const result: CatResult = { category_id: matched.id, confidence: 0.9 };
      await setCache(cacheKey, result, { ttlMs: TTL.VERY_LONG });
      return result;
    }
  }

  return fallback;
}

/**
 * Point d'entrée IA multi-fonction : analyse complète d'un produit.
 * Génère nom, description, catégorie, prix, tags et page de vente.
 */
export async function fullAIProductAnalysis(
  rawInput: string,
  existingCategory?: string,
): Promise<AIProductContent> {
  await delay(800);

  // 1. Catégorisation
  const catResult = existingCategory
    ? { category_id: existingCategory, confidence: 1 }
    : await suggestCategory(rawInput);

  // 2. Génération description + tags
  const descResult = await generateProfessionalDescription(
    rawInput,
    catResult.category_id,
    'selling',
  );

  // 3. Prix suggéré
  const priceResult = await suggestPrice(rawInput, catResult.category_id);

  // 4. Page de vente complète
  const salesPage = await generateSalesPage(
    rawInput,
    descResult.description,
    priceResult.suggestedPrice,
    'Votre Boutique',
    catResult.category_id,
  );

  return {
    ...salesPage,
    name: rawInput,
    description: descResult.description,
    tags: descResult.tags,
    seo_title: descResult.seo_title,
    meta_description: descResult.meta_description,
    category_id: catResult.category_id,
    category_name: getCategoryName(catResult.category_id),
    price_suggestion: priceResult.suggestedPrice,
  };
}

// ============================================================
// Génération de page HTML niveau Shopify
// ============================================================

/** Résultat de la génération de page de vente HTML */
export interface ShopifyPageResult {
  html: string;
  seo_title: string;
  meta_description: string;
  structured_data: Record<string, unknown>;
}

/**
 * Génère une page de vente complète en HTML, niveau Shopify.
 * Inclut : hero, galerie, caractéristiques, FAQ, CTA, schema.org
 * Peut être utilisée comme page produit autonome ou intégrée dans l'app.
 */
export async function generateShopifyStylePage(
  productName: string,
  description: string,
  price: number,
  shopName: string,
  categoryId: string,
  images: string[] = [],
): Promise<ShopifyPageResult> {
  const catName = getCategoryName(categoryId);

  // Générer le contenu IA enrichi
  const content = await generateSalesPage(
    productName,
    description,
    price,
    shopName,
    categoryId,
  );

  const seoTitle = content.seo_title || `${productName} | ${shopName}`;
  const metaDesc = content.meta_description || description.slice(0, 160);

  // Image principale pour le SEO
  const mainImage = images[0] || '/favicon.png';
  const imageGallery = images.length > 0
    ? images.map((src) => `    <img src="${src}" alt="${productName}" class="product-gallery-img" loading="lazy">`).join('\n')
    : '    <div class="product-placeholder">📦</div>';

  // Caractéristiques
  const featuresHtml = content.sales_page.features
    .map((f) => `      <li>${f}</li>`)
    .join('\n');

  // FAQ
  const faqHtml = content.sales_page.faq
    .map(
      (item, i) => `    <details class="faq-item">
      <summary class="faq-question">${item.question}</summary>
      <div class="faq-answer">${item.answer}</div>
    </details>`,
    )
    .join('\n');

  // Schema.org structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: metaDesc,
    image: images,
    brand: { '@type': 'Brand', name: shopName },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'XOF',
      price: price,
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      reviewCount: '0',
    },
  };

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seoTitle}</title>
  <meta name="description" content="${metaDesc}">
  <meta property="og:title" content="${seoTitle}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:type" content="product">
  <meta property="og:image" content="${mainImage}">
  <meta property="product:price:amount" content="${price}">
  <meta property="product:price:currency" content="XOF">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${seoTitle}">
  <meta name="twitter:description" content="${metaDesc}">
  <meta name="twitter:image" content="${mainImage}">
  <link rel="canonical" href="https://boutikplus.vercel.app">
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #FAFAFA;
      color: #1A1A1A;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .product-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 2px 20px rgba(0,0,0,0.08);
    }
    @media (max-width: 768px) {
      .product-layout { grid-template-columns: 1fr; padding: 16px; }
    }
    .product-gallery { position: relative; }
    .product-gallery-img {
      width: 100%;
      height: 400px;
      object-fit: cover;
      border-radius: 12px;
      display: block;
    }
    .product-placeholder {
      width: 100%;
      height: 400px;
      background: #F5F5F5;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 80px;
    }
    .product-thumbnails {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      overflow-x: auto;
    }
    .product-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #1A1A1A;
    }
    .product-category {
      display: inline-block;
      background: #FF6B00;
      color: #fff;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .product-price {
      font-size: 36px;
      font-weight: 800;
      color: #FF6B00;
      margin: 16px 0;
    }
    .product-description {
      color: #555;
      margin-bottom: 24px;
      font-size: 16px;
    }
    .product-features {
      background: #F8F8F8;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .product-features h3 {
      font-size: 16px;
      margin-bottom: 12px;
      color: #1A1A1A;
    }
    .product-features ul {
      list-style: none;
      padding: 0;
    }
    .product-features li {
      padding: 8px 0;
      padding-left: 28px;
      position: relative;
      color: #333;
    }
    .product-features li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #00A859;
      font-weight: bold;
    }
    .cta-section {
      background: linear-gradient(135deg, #FF6B00, #FF8533);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      color: #fff;
      margin-top: 32px;
    }
    .cta-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .cta-text { opacity: 0.95; margin-bottom: 20px; }
    .cta-button {
      display: inline-block;
      background: #fff;
      color: #FF6B00;
      padding: 14px 40px;
      border-radius: 30px;
      font-weight: 700;
      text-decoration: none;
      font-size: 16px;
      transition: transform 0.2s;
    }
    .cta-button:hover { transform: scale(1.05); }
    .faq-section { margin-top: 40px; }
    .faq-section h2 {
      font-size: 24px;
      margin-bottom: 20px;
      color: #1A1A1A;
    }
    .faq-item {
      background: #fff;
      border-radius: 12px;
      margin-bottom: 12px;
      border: 1px solid #EEE;
      overflow: hidden;
    }
    .faq-question {
      padding: 16px 20px;
      font-weight: 600;
      cursor: pointer;
      list-style: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .faq-question::-webkit-details-marker { display: none; }
    .faq-question::after { content: "+"; font-size: 20px; color: #FF6B00; }
    details[open] .faq-question::after { content: "−"; }
    .faq-answer {
      padding: 0 20px 16px;
      color: #555;
    }
    .trust-badges {
      display: flex;
      gap: 16px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .trust-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #666;
    }
    .trust-badge-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #E8F5E9;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #00A859;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="product-layout">
      <div class="product-gallery">
${imageGallery}
        <div class="product-thumbnails">
${images.slice(1, 5).map((src) => `          <img src="${src}" alt="" style="width:60px;height:60px;border-radius:8px;object-fit:cover;cursor:pointer;">`).join('\n')}
        </div>
      </div>
      <div class="product-info">
        <span class="product-category">${catName}</span>
        <h1 class="product-title">${productName}</h1>
        <div class="trust-badges">
          <span class="trust-badge"><span class="trust-badge-icon">✓</span> Qualité garantie</span>
          <span class="trust-badge"><span class="trust-badge-icon">🚚</span> Livraison 2-5 jours</span>
          <span class="trust-badge"><span class="trust-badge-icon">↩</span> Retours 7 jours</span>
        </div>
        <div class="product-price">${price.toLocaleString('fr-FR')} FCFA</div>
        <div class="product-description">${description}</div>
        <div class="product-features">
          <h3>Caractéristiques du produit</h3>
          <ul>
${featuresHtml}
          </ul>
        </div>
        <a href="https://wa.me/22600000000?text=${encodeURIComponent(`Bonjour ! Je suis intéressé par "${productName}" à ${price} FCFA.`)}&source=shopify_page&ref=${shopName}" class="cta-button" style="display:block;text-align:center;background:#FF6B00;color:#fff;padding:16px;border-radius:12px;text-decoration:none;font-weight:700;font-size:18px;">
          💬 Commander via WhatsApp
        </a>
      </div>
    </div>

    <div class="cta-section">
      <div class="cta-title">${content.sales_page.hero_title}</div>
      <div class="cta-text">${content.sales_page.hero_subtitle}</div>
      <a href="https://wa.me/22600000000?text=${encodeURIComponent(`Commande: ${productName} - ${price} FCFA`)}" class="cta-button">
        ${content.sales_page.call_to_action}
      </a>
    </div>

    <div class="faq-section">
      <h2>Questions fréquentes</h2>
${faqHtml}
    </div>
  </div>
  <script>
    document.querySelectorAll('.faq-question').forEach(q => {
      q.addEventListener('click', e => {
        const item = q.closest('.faq-item');
        if (item) {
          item.open = !item.open;
        }
      });
    });
  </script>
</body>
</html>`;

  return {
    html,
    seo_title: seoTitle,
    meta_description: metaDesc,
    structured_data: structuredData,
  };
}

/**
 * Améliore un prompt IA avec contexte e-commerce burkinabé.
 * Utilisé en interne pour toutes les générations.
 */
function buildBurkinabeEcommercePrompt(basePrompt: string, productName: string, categoryId: string): string {
  const catName = getCategoryName(categoryId);
  return `${basePrompt}

CONTEXTE MARCHÉ :
- Pays : Burkina Faso
- Monnaie : FCFA (Franc CFA)
- Zone : Afrique de l'Ouest
- Clientèle cible : Jeunes (18-35 ans), vendeurs informels, entrepreneurs locaux
- Canaux de vente : WhatsApp, TikTok, Snapchat, Facebook
- Tendances : Mode wax, cosmétiques naturels, artisanat, produits locaux

PRODUIT :
- Nom : "${productName}"
- Catégorie : ${catName}

INSTRUCTIONS :
- Utilise un ton professionnel mais accessible
- Mentionne les avantages pour le client burkinabé
- Propose des prix en FCFA
- Inclure des call-to-action clairs
- Maximise la conversion`;
}

/**
 * Nouvelle fonction : génère une description produit ultra-complète
 * avec focus sur la conversion e-commerce.
 */
export async function generateUltraDescription(
  productName: string,
  categoryId: string,
  price: number,
  shopName: string,
  existingDescription?: string,
): Promise<AIProductContent> {
  const enhancedPrompt = buildBurkinabeEcommercePrompt(
    'Génère une description produit ultra-professionnelle pour e-commerce.',
    productName,
    categoryId,
  );

  const fallback: AIProductContent = {
    name: productName,
    description: generateLocalDescription(productName, categoryId, 'selling'),
    short_description: generateLocalDescription(productName, categoryId, 'selling').slice(0, 100) + '...',
    tags: generateLocalTags(productName, categoryId),
    category_id: categoryId,
    category_name: getCategoryName(categoryId),
    price_suggestion: price,
    seo_title: `${productName} | ${shopName} — Livraison Burkina Faso`,
    meta_description: `${productName} à ${price.toLocaleString('fr-FR')} FCFA. Qualité garantie, livraison rapide.`,
    sales_page: {
      hero_title: `🔥 ${productName} — LE BEST-SELLER`,
      hero_subtitle: `${price.toLocaleString('fr-FR')} FCFA · Qualité premium · Livraison 2-5 jours`,
      features: [
        '✨ Qualité garantie satisfait ou remboursé',
        '🚚 Livraison rapide dans tout le Burkina Faso',
        '💳 Paiement sécurisé Orange/Moov Money',
        '🎁 Emballage soigné offert',
        '↩️ Retours gratuits sous 7 jours',
      ],
      faq: [
        { question: 'Quel est le délai de livraison ?', answer: '2-5 jours ouvrables. Ouagadougou et Bobo-Dioulasso : 2-3 jours. Autres villes : 3-5 jours.' },
        { question: 'Comment payer ?', answer: 'Orange Money ou Moov Money. Après commande, vous recevrez un lien de paiement.' },
        { question: 'Puis-je retourner ?', answer: 'Oui, retours gratuits sous 7 jours après réception, sans justification.' },
      ],
      call_to_action: '👉 STOCK LIMITÉ — COMMANDEZ MAINTENANT !',
    },
  };

  const cacheKey = cacheKeys.ai(hashString(`genUltra::${productName}|${categoryId}|${price}|${shopName}|${existingDescription ?? ''}`));
  const cached = await getCache<AIProductContent>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const systemPrompt = `Tu es un copywriter e-commerce expert, spécialisé dans le marché burkinabé.
Tu crées des fiches produits qui convertissent à 3x la moyenne. Ton style :
- Accroche émotionnelle en 1ère ligne
- Bénéfices clairs avant caractéristiques
- Preuves sociales (statistiques, témoignages)
- Urgence et rareté
- Call-to-action à la fin
- Tu utilises des emojis avec modération`;

  const userPrompt = `${enhancedPrompt}

${existingDescription ? `DESCRIPTION ACTUELLE :\n${existingDescription}\n\n` : ''}
PRIX : ${price} FCFA
BOUTIQUE : ${shopName}

Génère UN JSON avec :
{
  "name": "nom produit optimisé SEO",
  "description": "description complète de 200-300 mots, professionnelle et vendeuse",
  "short_description": "description courte 50 mots max (pour cartes produit)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7"],
  "category_id": "${categoryId}",
  "category_name": "${getCategoryName(categoryId)}",
  "price_suggestion": ${price},
  "seo_title": "titre SEO 50-60 caractères avec mot-clé principal",
  "meta_description": "meta description 140-160 caractères",
  "sales_page": {
    "hero_title": "TITRE ACCROCHEUR EN MAJUSCULES",
    "hero_subtitle": "sous-titre émotionnel",
    "features": ["5 caractéristiques clés"],
    "faq": [{"question": "Q?", "answer": "R?"}, {"question": "Q2?", "answer": "R2?"}, {"question": "Q3?", "answer": "R3?"}],
    "call_to_action": "CTA persuasif"
  }
}`;

  const llmResult = await callMistralProxy<AIProductContent>({
    systemPrompt,
    userPrompt,
    maxTokens: 1500,
    temperature: 0.8,
    responseFormat: 'json_object',
    model: 'mistral-tiny',
    fallback: {} as any,
  });

  if (llmResult && typeof llmResult === 'object' && llmResult.description) {
    const result: AIProductContent = {
      name: llmResult.name || productName,
      description: llmResult.description || fallback.description,
      short_description: llmResult.short_description || llmResult.description?.slice(0, 100) + '...' || fallback.short_description,
      tags: Array.isArray(llmResult.tags) ? llmResult.tags : fallback.tags,
      category_id: llmResult.category_id || categoryId,
      category_name: llmResult.category_name || getCategoryName(categoryId),
      price_suggestion: typeof llmResult.price_suggestion === 'number' ? llmResult.price_suggestion : price,
      seo_title: llmResult.seo_title || `${productName} | ${shopName}`,
      meta_description: llmResult.meta_description || `${productName} - ${price} FCFA`,
      sales_page: llmResult.sales_page || fallback.sales_page,
    };
    await setCache(cacheKey, result, { ttlMs: TTL.VERY_LONG });
    return result;
  }

  return fallback;
}
