// Mappeur d'erreurs — Boutikplus
// Transforme les messages techniques (Supabase, réseau, validation) en
// explications claires, non techniques, avec une action concrète à essayer.
//
// Objectif : un vendeur ou acheteur débutant doit comprendre ce qui se passe
// et savoir quoi faire, sans jamais voir « .env », « JWT », « RPC », etc.

export interface FriendlyError {
  /** Titre court, rassurant (ex: « Connexion impossible »). */
  title: string;
  /** Explication simple de ce qui s'est passé. */
  message: string;
  /** Action concrète à tenter (ex: « Vérifiez votre connexion internet »). */
  action: string;
  /** Nom d'icône Feather pour l'affichage. */
  icon: string;
}

const DEFAULT: FriendlyError = {
  title: 'Une erreur est survenue',
  message: "Quelque chose n'a pas fonctionné. Ce n'est pas de votre faute.",
  action: 'Réessayez dans un instant. Si le problème persiste, contactez le support.',
  icon: 'alert-triangle',
};

/**
 * Transforme un message d'erreur brut (Supabase, réseau, validation…)
 * en un objet lisible par tous. Aucun jargon technique ne ressort.
 */
export function toFriendlyError(rawError: string | null | undefined): FriendlyError {
  if (!rawError) return DEFAULT;
  const e = rawError.toLowerCase();

  // --- Configuration / service indisponible ---
  if (
    e.includes('supabase non configur') ||
    e.includes('non configuré') ||
    e.includes('voir le fichier .env') ||
    e.includes('placeholder') ||
    e.includes('fetch failed')
  ) {
    return {
      title: 'Service momentanément indisponible',
      message:
        "Boutikplus ne peut pas se connecter à son service pour le moment. Vos données restent en sécurité.",
      action:
        "Assurez-vous d'avoir la dernière version de l'app. Si le problème continue, écrivez-nous sur WhatsApp.",
      icon: 'cloud-off',
    };
  }

  // --- Réseau / connectivité ---
  if (
    e.includes('network') ||
    e.includes('failed to fetch') ||
    e.includes('timeout') ||
    e.includes('timed out') ||
    e.includes('connexion') && e.includes('réseau') ||
    e.includes('offline') ||
    e.includes('no connection') ||
    e.includes('internet')
  ) {
    return {
      title: 'Pas de connexion internet',
      message: "Votre téléphone ne semble pas connecté à internet.",
      action:
        "Vérifiez votre forfait data ou votre Wi-Fi, puis réessayez. L'app attendra que la connexion revienne.",
      icon: 'wifi-off',
    };
  }

  // --- Authentification : identifiants ---
  if (
    e.includes('invalid login credentials') ||
    e.includes('invalid credentials') ||
    e.includes('wrong password') ||
    e.includes('incorrect password')
  ) {
    return {
      title: 'Identifiants incorrects',
      message: "L'email ou le mot de passe ne correspond à aucun compte.",
      action:
        "Vérifiez l'orthographe de votre email et votre mot de passe. Si vous avez oublié, utilisez « Mot de passe oublié ».",
      icon: 'lock',
    };
  }

  // --- Email déjà utilisé ---
  if (
    e.includes('user already registered') ||
    e.includes('already registered') ||
    e.includes('already in use') ||
    e.includes('email déjà') ||
    e.includes('duplicate key')
  ) {
    return {
      title: 'Compte déjà existant',
      message: "Un compte existe déjà avec cet email.",
      action: 'Connectez-vous avec cet email, ou utilisez un autre email pour créer un nouveau compte.',
      icon: 'user',
    };
  }

  // --- Mot de passe trop faible ---
  if (
    e.includes('password should be') ||
    e.includes('weak password') ||
    e.includes('password too short') ||
    e.includes('au moins 8')
  ) {
    return {
      title: 'Mot de passe trop court',
      message: 'Pour protéger votre compte, votre mot de passe doit faire au moins 8 caractères.',
      action: 'Choisissez un mot de passe plus long, idéalement avec des chiffres et des lettres.',
      icon: 'shield',
    };
  }

  // --- Email invalide ---
  if (e.includes('email') && (e.includes('invalid') || e.includes('valid') || e.includes('format'))) {
    return {
      title: 'Email invalide',
      message: "L'adresse email saisie n'est pas correcte.",
      action: "Entrez une adresse email complète, par exemple : votre.nom@example.com.",
      icon: 'mail',
    };
  }

  // --- Email non confirmé ---
  if (
    e.includes('email not confirmed') ||
    e.includes('not confirmed') ||
    e.includes('verify your email') ||
    e.includes('confirmation')
  ) {
    return {
      title: 'Email non confirmé',
      message: "Vous devez confirmer votre adresse email avant de vous connecter.",
      action:
        "Ouvrez votre boîte mail (et les spams) et cliquez sur le lien de confirmation que nous vous avons envoyé.",
      icon: 'mail',
    };
  }

  // --- Trop de tentatives (rate limit) ---
  if (
    e.includes('rate limit') ||
    e.includes('too many') ||
    e.includes('too many requests') ||
    e.includes('tentatives')
  ) {
    return {
      title: 'Trop de tentatives',
      message: 'Par sécurité, nous limitons le nombre d\'essais pendant quelques minutes.',
      action: 'Attendez quelques minutes avant de réessayer. Protège votre compte contre le piratage.',
      icon: 'clock',
    };
  }

  // --- Stockage / quota ---
  if (e.includes('storage') && (e.includes('quota') || e.includes('limit') || e.includes('full'))) {
    return {
      title: 'Espace de stockage plein',
      message: "L'espace pour stocker les photos et vidéos est saturé.",
      action: 'Supprimez d\'anciennes photos de produits inutilisées, ou réessayez plus tard.',
      icon: 'hard-drive',
    };
  }

  // --- Format de fichier non pris en charge ---
  if (e.includes('unsupported_type') || e.includes('format d’image non supporté') || e.includes('image format')) {
    return {
      title: 'Format de photo non accepté',
      message: 'Cette photo n’est pas au format JPEG, PNG ou WebP.',
      action: 'Choisissez une autre photo dans l’un de ces trois formats.',
      icon: 'image',
    };
  }

  // --- Fichier trop volumineux ---
  if (e.includes('file too large') || e.includes('fichier trop lourd') || e.includes('payload too large') || e.includes('413')) {
    return {
      title: 'Photo ou vidéo trop lourde',
      message: "Le fichier dépasse la taille maximale autorisée.",
      action: "Choisissez une photo plus légère ou utilisez le Studio Photo intégré pour la réduire.",
      icon: 'image',
    };
  }

  // --- Permissions refusées ---
  if (
    e.includes('permission') ||
    e.includes('denied') ||
    e.includes('not authorized') ||
    e.includes('unauthorized') ||
    e.includes('rls')
  ) {
    return {
      title: 'Action non autorisée',
      message: "Vous n'avez pas l'autorisation de faire cette action.",
      action: 'Reconnectez-vous à votre compte. Si ça continue, contactez le support.',
      icon: 'shield',
    };
  }

  // --- Élément introuvable ---
  if (e.includes('not found') || e.includes('introuvable') || e.includes('404')) {
    return {
      title: 'Information introuvable',
      message: "Ce produit, cette boutique ou cette commande n'existe plus ou a été supprimé.",
      action: 'Revenez en arrière et actualisez la page. Si le problème persiste, contactez le support.',
      icon: 'search',
    };
  }

  // --- Conflit (déjà fait) ---
  if (e.includes('conflict') || e.includes('409') || e.includes('déjà') || e.includes('already')) {
    return {
      title: 'Déjà effectué',
      message: 'Cette action a déjà été réalisée.',
      action: 'Actualisez la page pour voir l\'état actuel.',
      icon: 'check-circle',
    };
  }

  // --- Paiement ---
  if (e.includes('payment') || e.includes('paiement') || e.includes('checkout')) {
    return {
      title: 'Paiement impossible',
      message: "Le paiement n'a pas pu aboutir.",
      action: 'Vérifiez votre solde Mobile Money et réessayez. Si l\'argent a été débité, contactez le support.',
      icon: 'credit-card',
    };
  }

  // --- Erreur serveur générique ---
  if (e.includes('500') || e.includes('server') || e.includes('internal')) {
    return {
      title: 'Problème côté serveur',
      message: "Nos serveurs rencontrent une difficulté. Ce n'est pas de votre faute.",
      action: 'Réessayez dans quelques minutes. Si ça dure, écrivez-nous sur WhatsApp.',
      icon: 'server',
    };
  }

  // --- Cas par défaut : message déjà clair ou inconnu ---
  return DEFAULT;
}

/**
 * Raccourci : renvoie uniquement le message clair (utile pour les Alert
 * natives ou les inputs qui n'ont besoin que d'une ligne).
 */
export function friendlyMessage(rawError: string | null | undefined): string {
  const f = toFriendlyError(rawError);
  return `${f.title} — ${f.action}`;
}
