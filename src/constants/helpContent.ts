// Contenu statique du centre d'aide — Boutikplus
// Données en dur (pas de backend) pour rester léger et fonctionnel hors-ligne.
// Langage simple et court, adapté aux vendeurs débutants.

export interface HelpFaqItem {
  q: string;
  a: string;
}

export interface HelpFaqSection {
  id: string;
  title: string;
  icon: string; // nom Feather
  color: string;
  items: HelpFaqItem[];
}

export interface HelpTutorialStep {
  title: string;
  desc: string;
  icon?: string;
}

export interface HelpTutorial {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  steps: HelpTutorialStep[];
}

// Numéro de support WhatsApp Boutikplus (+86 15952717063)
export const SUPPORT_WHATSAPP_NUMBER = '8615952717063';
export const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Bonjour, j'ai besoin d'aide sur Boutikplus.",
)}`;

export const HELP_FAQ_SECTIONS: HelpFaqSection[] = [
  {
    id: 'demarrage',
    title: 'Démarrage',
    icon: 'rocket',
    color: '#FF6B00',
    items: [
      {
        q: 'Comment créer mon compte ?',
        a: "Ouvrez l'app, appuyez sur « Créer un compte ». Entrez votre nom, téléphone et ville. Choisissez « Vendeur » si vous voulez vendre. C'est gratuit.",
      },
      {
        q: 'Comment créer ma boutique ?',
        a: "Après connexion, allez dans « Espace vendeur » → « Créer ma boutique ». Donnez un nom, choisissez une catégorie et votre ville. Ajoutez un logo si vous voulez. Validez.",
      },
      {
        q: "L'application est-elle vraiment gratuite ?",
        a: 'Oui, Boutikplus est 100% gratuit pour les vendeurs. Aucun frais d\'inscription, aucun abonnement. Vous gardez tout ce que vous vendez.',
      },
      {
        q: 'Faut-il une connexion internet permanente ?',
        a: "Non. L'app fonctionne en mode démo hors-ligne. Vos produits sont sauvegardés et synchronisés dès que la connexion revient.",
      },
    ],
  },
  {
    id: 'produits',
    title: 'Produits & photos',
    icon: 'camera',
    color: '#6B2D8E',
    items: [
      {
        q: 'Comment ajouter un produit ?',
        a: "Dans l'espace vendeur, appuyez sur « Produits » → bouton « + ». Prenez ou choisissez une photo, remplissez le nom, le prix et le stock. Appuyez sur « Publier ».",
      },
      {
        q: 'Combien de photos par produit ?',
        a: 'Vous pouvez ajouter jusqu\'à 5 photos par produit. La première photo est la couverture (celle que les clients voient en premier).',
      },
      {
        q: 'Comment rendre mes photos professionnelles ?',
        a: "Utilisez le Studio Photo intégré : prenez la photo avec un bon éclairage, recadrez en carré, pivotez si besoin. Un fond neutre et clair met vos produits en valeur.",
      },
      {
        q: 'Puis-je ajouter une vidéo de mon produit ?',
        a: 'Oui ! Collez un lien TikTok ou YouTube de votre vidéo, ou importez une vidéo depuis votre téléphone. La vidéo apparaît sur la fiche produit.',
      },
      {
        q: 'Comment utiliser l\'IA pour ma description ?',
        a: "Sur l'écran d'ajout de produit, appuyez sur « Utiliser l'IA ». Prenez une photo, l'IA génère une description et suggère un prix automatiquement.",
      },
    ],
  },
  {
    id: 'paiements',
    title: 'Paiements',
    icon: 'credit-card',
    color: '#00A859',
    items: [
      {
        q: 'Comment recevoir un paiement ?',
        a: "Les clients paient par Orange Money ou Moov Money. Vous recevez une notification à chaque commande. Validez le paiement dans « Commandes ».",
      },
      {
        q: 'Comment valider une preuve de paiement ?',
        a: "Dans « Commandes », ouvrez la commande, regardez la capture d'écran du paiement du client. Si le montant correspond, appuyez sur « Valider ».",
      },
      {
        q: 'Quand est-ce que je reçois mon argent ?',
        a: "L'argent arrive directement sur votre compte Mobile Money. Boutikplus ne touche pas à vos paiements.",
      },
    ],
  },
  {
    id: 'livraison',
    title: 'Livraison',
    icon: 'truck',
    color: '#0DCAF0',
    items: [
      {
        q: 'Comment livrer à un client ?',
        a: "Dans la commande, appuyez sur « Trouver un livreur ». Choisissez un livreur disponible, fixez le prix et la date. Suivez la livraison en temps réel.",
      },
      {
        q: 'Combien coûte la livraison ?',
        a: "Vous fixez le prix avec le livreur. Le client paie la livraison séparément du produit. Les livreurs sont notés par les vendeurs.",
      },
      {
        q: 'Que faire si un client refuse la livraison ?',
        a: "Dans le suivi de livraison, appuyez sur « Annuler » et indiquez la raison. Le client est remboursé automatiquement.",
      },
    ],
  },
  {
    id: 'promotion',
    title: 'Promotion & croissance',
    icon: 'trending-up',
    color: '#FFC107',
    items: [
      {
        q: 'Comment partager ma boutique ?',
        a: "Allez dans « Promouvoir » → « Partager ma boutique ». Copiez le lien et envoyez-le sur WhatsApp, TikTok, Snapchat ou Instagram. Chaque clic est compté.",
      },
      {
        q: 'Comment créer un code promo ?',
        a: "Dans « Promouvoir » → « Codes promo », créez un code (ex: WAX20 pour -20%). Partagez-le à vos clients. Ils l'entrent au moment de payer.",
      },
      {
        q: 'Comment voir mes statistiques ?',
        a: "Dans « Promouvoir » → « Statistiques », voyez vos vues, clics et ventes par canal. Comparez WhatsApp vs TikTok pour savoir où investir.",
      },
    ],
  },
  {
    id: 'depannage',
    title: 'Dépannage & erreurs',
    icon: 'life-buoy',
    color: '#DC3545',
    items: [
      {
        q: "Je n'arrive pas à me connecter, que faire ?",
        a: "Vérifiez votre connexion internet (data ou Wi-Fi). Assurez-vous d'utiliser le bon email et mot de passe. Si vous avez oublié votre mot de passe, utilisez « Mot de passe oublié ». Si rien ne marche, écrivez-nous sur WhatsApp.",
      },
      {
        q: "Je n'arrive pas à créer mon compte",
        a: "Vérifiez que votre email est bien écrit (ex: votre.nom@example.com) et que votre mot de passe fait au moins 8 caractères. Si on vous dit que le compte existe déjà, connectez-vous avec cet email.",
      },
      {
        q: "Je n'ai pas reçu l'email de confirmation",
        a: "Attendez 2 à 5 minutes. Vérifiez vos spams ou courriers indésirables. Si rien n'arrive, demandez un renvoi depuis l'écran de connexion, ou contactez-nous sur WhatsApp.",
      },
      {
        q: "L'application affiche « Service indisponible »",
        a: "Ce n'est pas de votre faute. Vérifiez votre connexion internet. Si le problème continue, mettez à jour l'app avec la dernière version. En cas de persistance, écrivez-nous sur WhatsApp.",
      },
      {
        q: "L'app est lente ou se bloque",
        a: "Fermez complètement l'app et rouvrez-la. Vérifiez votre connexion. Si ça continue, supprimez les anciennes photos inutiles. Redémarrez votre téléphone si nécessaire.",
      },
      {
        q: "Mes photos ne se chargent pas",
        a: "Vérifiez votre connexion internet. Prenez les photos avec un bon éclairage. Si une photo est trop lourde, utilisez le Studio Photo intégré pour la réduire automatiquement.",
      },
      {
        q: "Un client a payé mais je ne vois rien",
        a: "Patientez quelques minutes, les notifications peuvent arriver avec un léger délai. Vérifiez l'onglet « Commandes ». Si le paiement n'apparaît toujours pas, demandez au client la capture d'écran et contactez le support.",
      },
      {
        q: "Le paiement Mobile Money a échoué",
        a: "Vérifiez votre solde sur Orange Money ou Moov Money. Vérifiez votre code secret. Si l'argent a été débité sans confirmation, contactez votre opérateur puis le support Boutikplus avec la capture.",
      },
    ],
  },
];

export const HELP_TUTORIALS: HelpTutorial[] = [
  {
    id: 'create-shop',
    title: 'Créer ma boutique en 3 min',
    subtitle: 'Démarrez votre activité en quelques étapes',
    icon: 'briefcase',
    color: '#FF6B00',
    steps: [
      { title: 'Se connecter', desc: 'Ouvrez l\'app et choisissez « Vendeur » ou connectez-vous.', icon: 'log-in' },
      { title: 'Créer la boutique', desc: 'Allez dans « Espace vendeur » → « Créer ma boutique ».', icon: 'plus-circle' },
      { title: 'Nom & catégorie', desc: 'Donnez un nom clair, choisissez la catégorie de vos produits.', icon: 'tag' },
      { title: 'Logo & ville', desc: 'Ajoutez un logo et indiquez votre ville pour être trouvé.', icon: 'map-pin' },
      { title: 'Valider', desc: 'Appuyez sur « Créer ». Votre boutique est en ligne !', icon: 'check-circle' },
    ],
  },
  {
    id: 'first-product',
    title: 'Ajouter mon 1er produit',
    subtitle: 'Présentez vos produits comme un pro',
    icon: 'package',
    color: '#6B2D8E',
    steps: [
      { title: 'Ouvrir Produits', desc: 'Dans l\'espace vendeur, appuyez sur « Produits » puis « + ».', icon: 'plus' },
      { title: 'Prendre une photo', desc: 'Appuyez sur « Ajouter ». Prenez une photo ou choisissez dans la galerie.', icon: 'camera' },
      { title: 'Rédiger la description', desc: 'Donnez un nom clair, un prix en FCFA et une description. L\'IA peut vous aider.', icon: 'edit-3' },
      { title: 'Ajouter une vidéo', desc: 'Collez un lien TikTok ou YouTube pour montrer votre produit en action.', icon: 'video' },
      { title: 'Publier', desc: 'Appuyez sur « Publier le produit ». Il apparaît immédiatement.', icon: 'upload' },
    ],
  },
  {
    id: 'receive-payment',
    title: 'Recevoir un paiement',
    subtitle: 'Encaissez avec Mobile Money',
    icon: 'dollar-sign',
    color: '#00A859',
    steps: [
      { title: 'Recevoir la commande', desc: 'Vous recevez une notification « Nouvelle commande ».', icon: 'bell' },
      { title: 'Voir la preuve', desc: 'Ouvrez la commande, regardez la capture du paiement Mobile Money.', icon: 'image' },
      { title: 'Vérifier le montant', desc: 'Confirmez que le montant correspond au prix de la commande.', icon: 'check' },
      { title: 'Valider', desc: 'Appuyez sur « Valider le paiement ». Le client est notifié.', icon: 'check-circle' },
      { title: 'Préparer la livraison', desc: 'Cherchez un livreur et envoyez le colis au client.', icon: 'truck' },
    ],
  },
  {
    id: 'share-shop',
    title: 'Partager ma boutique',
    subtitle: 'Attirez des clients sur les réseaux',
    icon: 'share-2',
    color: '#FFC107',
    steps: [
      { title: 'Ouvrir Promouvoir', desc: 'Dans l\'espace vendeur, appuyez sur « Créer promo ».', icon: 'percent' },
      { title: 'Partager ma boutique', desc: 'Choisissez « Liens partagés » puis « Partager ».', icon: 'link' },
      { title: 'Choisir le canal', desc: 'Sélectionnez WhatsApp, TikTok, Snapchat ou Instagram.', icon: 'share-2' },
      { title: 'Coller le lien', desc: 'Le lien est copié. Collez-le dans votre bio ou story.', icon: 'copy' },
      { title: 'Suivre les résultats', desc: 'Consultez les vues et clics dans « Statistiques ».', icon: 'bar-chart-2' },
    ],
  },
  {
    id: 'promo-code',
    title: 'Créer un code promo',
    subtitle: 'Fidélisez et attirez plus de clients',
    icon: 'percent',
    color: '#0DCAF0',
    steps: [
      { title: 'Ouvrir Codes promo', desc: 'Dans « Promouvoir », choisissez « Codes promo ».', icon: 'percent' },
      { title: 'Nouveau code', desc: 'Appuyez sur « + ». Choisissez un code court (ex: WAX20).', icon: 'plus' },
      { title: 'Définir la réduction', desc: 'Pourcentage (-20%) ou montant fixe (1000 FCFA).', icon: 'tag' },
      { title: 'Conditions', desc: 'Fixez un montant minimum et une date d\'expiration.', icon: 'calendar' },
      { title: 'Partager', desc: 'Donnez le code à vos clients. Ils l\'entrent au paiement.', icon: 'share-2' },
    ],
  },
];
