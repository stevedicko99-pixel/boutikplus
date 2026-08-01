// Service IA — Boutikplus (simulé en mode démo)
// Fournit des fonctionnalités d'IA : génération de descriptions, chatbot,
// suggestion de prix, détection de fraude, génération de flyers.

import type { Product } from '@/types/models';
import { CATEGORIES, getCategoryName } from '@/constants/categories';

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// ---------- Génération de description produit ----------

interface ProductSuggestion {
  name: string;
  description: string;
  categoryId: string;
  priceSuggestion: number;
}

const NAME_POOL: Record<string, string[]> = {
  vetements: ['Robe wax moderne', 'T-shirt tendance', 'Veste en cuir', 'Pantalon slim', 'Chemise africaine'],
  cosmetiques: ['Crème hydratante', 'Savon karité', 'Baume nourrissant', 'Huile essentielle', 'Masque facial'],
  nourriture: ['Gâteau d\'anniversaire', 'Plat du jour', 'Jus frais', 'Pâtisserie maison', 'Repas complet'],
  artisanat: ['Sculpture en bronze', 'Bijou artisanal', 'Panier tissé', 'Décoration murale', 'Cadeau unique'],
  accessoires: ['Montre élégante', 'Sac à main', 'Lunettes de soleil', 'Bijoux fantaisie', 'Portefeuille'],
  services: ['Coiffure à domicile', 'Cours particulier', 'Réparation rapide', 'Livraison express', 'Service professionnel'],
  beaute: ['Soin du visage', 'Manucure', 'Coiffure', 'Maquillage', 'Traitement beauté'],
  maison: ['Décoration intérieure', 'Mobilier artisanal', 'Textile maison', 'Cuisine équipée', 'Rangement'],
};

const DESC_TEMPLATES: Record<string, string[]> = {
  vetements: [
    'Vêtement confectionné avec soin par des artisans locaux. Tissu de qualité supérieure, coupe moderne qui mettra en valeur votre style. Disponible en plusieurs tailles et couleurs.',
    'Pièce unique inspirée de la mode africaine contemporaine. Fabriquée à la main avec des matériaux sélectionnés. Parfaite pour toutes les occasions.',
  ],
  cosmetiques: [
    'Formule 100% naturelle à base de karité et d\'ingrédients locaux. Nourrit, hydrate et protège votre peau. Adapté à tous les types de peau.',
    'Produit artisanal fabriqué au Burkina Faso. Riche en vitamines et en propriétés bienfaisantes. Résultats visibles dès les premières utilisations.',
  ],
  nourriture: [
    'Préparé frais chaque jour avec des ingrédients de qualité. Saveurs authentiques faites maison. Parfait pour vos événements et célébrations.',
    'Recette traditionnelle revisitée avec une touche moderne. Emballage élégant et pratique. Livraison rapide garantie.',
  ],
  artisanat: [
    'Pièce unique faite main par des artisans burkinabè talentueux. Chaque création est originale et porte l\'âme de son créateur.',
    'Œuvre authentique qui apportera une touche d\'élégance à votre intérieur. Matériaux nobles et savoir-faire traditionnel.',
  ],
};

/** Génère une suggestion de produit à partir d'une photo (simulé) */
export async function generateProductSuggestion(
  photoDescription?: string,
): Promise<ProductSuggestion> {
  await delay(600);

  // Détection simulée de catégorie
  const randomCat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const catNames = NAME_POOL[randomCat.id] ?? NAME_POOL.vetements;
  const descriptions = DESC_TEMPLATES[randomCat.id] ?? DESC_TEMPLATES.vetements;

  const name = catNames[Math.floor(Math.random() * catNames.length)];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  const priceSuggestion = Math.floor(2500 + Math.random() * 50000);

  return {
    name: `${name} ${photoDescription ? '(Photo)' : ''}`.trim(),
    description,
    categoryId: randomCat.id,
    priceSuggestion,
  };
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

/** Suggère un prix basé sur des produits similaires (simulé) */
export async function suggestPrice(
  productName: string,
  categoryId: string,
  currentPrice?: number,
): Promise<PriceAnalysis> {
  await delay(500);

  const basePrice = currentPrice ?? 5000;
  const variation = 0.7 + Math.random() * 0.6;
  const suggestedPrice = Math.round(basePrice * variation);

  return {
    suggestedPrice,
    minPrice: Math.round(suggestedPrice * 0.7),
    maxPrice: Math.round(suggestedPrice * 1.4),
    currency: 'FCFA',
    competitorsCount: 15 + Math.floor(Math.random() * 30),
    confidence: Math.random() > 0.3 ? 'high' : 'medium',
  };
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

/** Répond automatiquement à un message acheteur (simulé) */
export async function chatbotReply(message: string, productContext?: Partial<Product>): Promise<ChatbotResponse> {
  await delay(800);

  const msg = message.toLowerCase();

  // Détection d'intention simple
  if (/bonjour|salut|hello|hi/.test(msg)) {
    return FAQ_RESPONSES.bonjour;
  }
  if (/stock|dispon|available|en stock|rupture/.test(msg)) {
    return {
      ...FAQ_RESPONSES.disponibilite,
      text: productContext?.stock && productContext.stock > 0
        ? `✅ Oui, "${productContext.name ?? 'ce produit'}" est disponible ! Il y a ${productContext.stock} en stock.`
        : `😅 Désolé, "${productContext?.name ?? 'ce produit'}" est actuellement en rupture de stock.`,
    };
  }
  if (/livraison|delai|transport|exped/.test(msg)) {
    return FAQ_RESPONSES.livraison;
  }
  if (/taille|size|dimension/.test(msg)) {
    return FAQ_RESPONSES.taille;
  }
  if (/couleur|color/.test(msg)) {
    return FAQ_RESPONSES.couleur;
  }
  if (/prix|cout|montant|cher/.test(msg)) {
    return {
      ...FAQ_RESPONSES.prix,
      text: productContext?.price
        ? `💰 "${productContext.name ?? 'Ce produit'}" est à ${productContext.price.toLocaleString('fr-FR')} FCFA.`
        : FAQ_RESPONSES.prix.text,
    };
  }
  if (/paiement|pay|mobile money|orange|moov/.test(msg)) {
    return FAQ_RESPONSES.paiement;
  }
  if (/retour|rembours|echang/.test(msg)) {
    return FAQ_RESPONSES.retour;
  }

  // Réponse générique
  return {
    text: "Je comprends votre question ! Voici ce que je peux faire : vous renseigner sur la disponibilité, la livraison, les tailles, les couleurs, ou vous mettre en contact direct avec le vendeur.",
    suggestions: ['Disponibilité ?', 'Livraison ?', 'Contacter le vendeur'],
  };
}

// ---------- Détection de fraude sur captures de paiement ----------

export interface FraudDetectionResult {
  isSuspicious: boolean;
  warnings: string[];
  confidence: 'low' | 'medium' | 'high';
  suggestions: string[];
}

/** Analyse une capture d'écran de paiement pour détecter les fraudes (simulé) */
export async function detectPaymentFraude(imageUrl: string, expectedAmount: number): Promise<FraudDetectionResult> {
  await delay(700);

  const warnings: string[] = [];
  const suggestions: string[] = [];
  const randomCheck = Math.random();

  // Simulation de détection
  if (randomCheck < 0.15) {
    warnings.push('Image potentiellement floue ou peu lisible');
    suggestions.push('Demander une capture plus nette au client');
  }
  if (randomCheck < 0.1) {
    warnings.push('Montant difficilement lisible sur la capture');
    suggestions.push('Vérifier le montant auprès du client');
  }
  if (randomCheck < 0.05) {
    warnings.push('Capture possiblement dupliquée ou déjà utilisée');
    suggestions.push('Demander une nouvelle capture au client');
  }
  if (randomCheck < 0.08) {
    warnings.push('Date ou heure non visible sur la capture');
  }

  const isSuspicious = warnings.length > 0;
  const confidence: 'low' | 'medium' | 'high' =
    warnings.length >= 3 ? 'high' : warnings.length >= 2 ? 'medium' : 'low';

  if (!isSuspicious) {
    suggestions.push('Aucune anomalie détectée. Vous pouvez valider ce paiement.');
  } else {
    suggestions.push('Soyez vigilant avant de valider ce paiement.');
  }

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
