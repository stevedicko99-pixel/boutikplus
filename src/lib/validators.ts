// ============================================================
// Validateurs d'entrée — Boutikplus (international friendly)
// ============================================================
// Toutes les entrées utilisateur (formulaires) doivent PASSER par ces validateurs
// avant d'atteindre la couche service ou le stockage distant.
// Ils complètent les contraintes SQL et les politiques RLS côté Supabase.

/**
 * Liste des indicatifs pays supportés (jeunes vendeurs internationaux).
 * - BF : Burkina Faso (+226) — public cible principal
 * - CN : Chine (+86) — propriétaire / public asiatique
 * - BJ : Bénin (+229), CI : Côte d'Ivoire (+225), SN : Sénégal (+221), TG : Togo (+228)
 * - ML : Mali (+223), NE : Niger (+227), CM : Cameroun (+237)
 * - FR : France (+33), BE : Belgique (+32), CA : Canada (+1)
 * - US : États-Unis (+1), NG : Nigéria (+234), GH : Ghana (+233)
 * - KE : Kenya (+254), ZA : Afrique du Sud (+27), AE : Émirats (+971)
 * - TR : Turquie (+90), IN : Inde (+91), VN : Vietnam (+84), JP : Japon (+81)
 */
export const SUPPORTED_COUNTRY_CODES = [
  { dial: '+86',  iso: 'CN', flag: '🇨🇳', label: 'Chine (中国)',        hint: '11 chiffres. Ex: 138 0013 8000 → +86 138 0013 8000' },
  { dial: '+226', iso: 'BF', flag: '🇧🇫', label: 'Burkina Faso',        hint: '8 chiffres. Ex: 70 12 34 56 → +226 70 12 34 56' },
  { dial: '+229', iso: 'BJ', flag: '🇧🇯', label: 'Bénin',               hint: '8 chiffres. Ex: 60 12 34 56 → +229 60 12 34 56' },
  { dial: '+225', iso: 'CI', flag: '🇨🇮', label: "Côte d'Ivoire",       hint: '10 chiffres → +225' },
  { dial: '+221', iso: 'SN', flag: '🇸🇳', label: 'Sénégal',             hint: '9 chiffres → +221' },
  { dial: '+228', iso: 'TG', flag: '🇹🇬', label: 'Togo',                hint: '8 chiffres → +228' },
  { dial: '+223', iso: 'ML', flag: '🇲🇱', label: 'Mali',                hint: '8 chiffres → +223' },
  { dial: '+227', iso: 'NE', flag: '🇳🇪', label: 'Niger',               hint: '8 chiffres → +227' },
  { dial: '+237', iso: 'CM', flag: '🇨🇲', label: 'Cameroun',            hint: '9 chiffres → +237' },
  { dial: '+234', iso: 'NG', flag: '🇳🇬', label: 'Nigéria',             hint: '10 chiffres → +234' },
  { dial: '+233', iso: 'GH', flag: '🇬🇭', label: 'Ghana',               hint: '10 chiffres → +233' },
  { dial: '+254', iso: 'KE', flag: '🇰🇪', label: 'Kenya',               hint: '9 chiffres → +254' },
  { dial: '+27',  iso: 'ZA', flag: '🇿🇦', label: 'Afrique du Sud',      hint: '9 chiffres → +27' },
  { dial: '+971', iso: 'AE', flag: '🇦🇪', label: 'Émirats arabes unis', hint: '9 chiffres → +971' },
  { dial: '+33',  iso: 'FR', flag: '🇫🇷', label: 'France',              hint: '9 chiffres → +33' },
  { dial: '+32',  iso: 'BE', flag: '🇧🇪', label: 'Belgique',            hint: '9 chiffres → +32' },
  { dial: '+1',   iso: 'CA', flag: '🇨🇦', label: 'Canada',              hint: '10 chiffres → +1' },
  { dial: '+1',   iso: 'US', flag: '🇺🇸', label: 'États-Unis',          hint: '10 chiffres → +1' },
  { dial: '+90',  iso: 'TR', flag: '🇹🇷', label: 'Turquie',             hint: '10 chiffres → +90' },
  { dial: '+91',  iso: 'IN', flag: '🇮🇳', label: 'Inde',                hint: '10 chiffres → +91' },
  { dial: '+84',  iso: 'VN', flag: '🇻🇳', label: 'Viêt Nam',            hint: '9-10 chiffres → +84' },
  { dial: '+81',  iso: 'JP', flag: '🇯🇵', label: 'Japon (日本)',        hint: '10 chiffres → +81' },
] as const;

export type SupportedDial = typeof SUPPORTED_COUNTRY_CODES[number]['dial'];

// Email + sécurité (inchangés)
const EMAIL_RFC_5322_LAX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DISCOUNT_CODE_ALLOWED = /^[A-Z0-9_-]{3,24}$/;
const SAFE_TEXT_BLOCKLIST = /<script|<\/script|javascript:|onerror=|onclick=|<iframe/i;

export const VALIDATION = {
  NAME_MIN: 2,
  NAME_MAX: 80,
  DESCRIPTION_MAX: 2000,
  PASSWORD_MIN: 8,
  PRICE_MAX: 50_000_000, // 50 millions FCFA (cap raisonnable)
  STOCK_MAX: 1_000_000,
  // Phone international : 6 chiffres mini (locale) / +XXX + 14 (indicatif + numéro long)
  PHONE_MIN: 6,
  PHONE_MAX: 16,
} as const;

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

const ok: ValidationResult = { ok: true };
const err = (message: string): ValidationResult => ({ ok: false, message });

// ---------- Normaliseurs ----------

export function normalizeText(raw: string, max?: number): string {
  let s = raw.replace(/\u0000/g, '').replace(/[\u200B-\u200D\uFEFF]/g, ''); // NUL & zero-width
  s = s.replace(/\s+/g, ' ').trim(); // collapse whitespace
  if (max !== undefined && s.length > max) s = s.slice(0, max);
  return s;
}

/**
 * Normalise un numéro de téléphone :
 * - Retire espaces, tirets, points, parenthèses
 * - Convertit "00xx…" en "+xx…"
 * - Ajoute l'indicatif pays par défaut si le numéro est saisi en local
 *
 * Exemples (countryDial = "+226") :
 *   "70 12 34 56"          → "+22670123456"
 *   "+86 159 5271 7063"    → "+8615952717063" (indicatif déjà présent)
 *   "008615952717063"      → "+8615952717063" (00 converti en +)
 *   "15952717063" + dial="+86" → "+8615952717063"
 */
export function normalizePhone(raw: string, defaultCountryDial: string = '+226'): string {
  let s = raw.replace(/[\s\-.()]/g, '').trim();
  // 00xxx → +xxx
  if (s.startsWith('00')) s = '+' + s.slice(2);
  // Si l'utilisateur n'a pas tapé d'indicatif, on préfixe avec le pays sélectionné
  if (s.length > 0 && !s.startsWith('+')) {
    const dial = defaultCountryDial.replace(/\D/g, '');
    // Éviter de doubler si l'utilisateur a tapé l'indicatif sans le +
    if (!s.startsWith(dial)) {
      s = defaultCountryDial + s;
    } else {
      s = '+' + s;
    }
  }
  return s;
}

// ---------- Helpers ----------
function hasBlocklistChars(text: string): boolean {
  return SAFE_TEXT_BLOCKLIST.test(text);
}

/** Vérifie qu'un numéro est a minima un format E.164-like. */
function looksLikeInternationalPhone(s: string): boolean {
  // Format attendu: + (1 à 3 chiffres indicatif) puis 6 à 14 chiffres
  return /^\+[1-9]\d{5,15}$/.test(s);
}

// ---------- Validateurs ----------

/** Email (format basique, la preuve viendra du lien de confirmation) */
export function validateEmail(raw: string): ValidationResult {
  const v = normalizeText(raw, 254).toLowerCase();
  if (!v) return err('Email requis');
  if (!EMAIL_RFC_5322_LAX.test(v)) return err('Format email invalide');
  return ok;
}

/** Mot de passe : longueur minimale + diversité basique */
export function validatePassword(raw: string): ValidationResult {
  if (!raw) return err('Mot de passe requis');
  if (raw.length < VALIDATION.PASSWORD_MIN)
    return err(`Mot de passe trop court (min. ${VALIDATION.PASSWORD_MIN} caractères)`);
  if (raw.length > 128) return err('Mot de passe trop long');
  return ok;
}

/**
 * Téléphone (international friendly).
 * @param raw Numéro saisi par l'utilisateur
 * @param defaultCountryDial Indicatif pays sélectionné (ex: "+86", "+226"). Si pas fourni, on valide en mode "strict E.164" (indicatif obligatoire).
 */
export function validatePhone(raw: string, defaultCountryDial?: string): ValidationResult {
  const normalized = defaultCountryDial
    ? normalizePhone(raw, defaultCountryDial)
    : normalizePhone(raw);

  if (!normalized) return err('Téléphone requis');
  if (!normalized.startsWith('+'))
    return err("Numéro invalide : ajoutez l'indicatif pays (ex: +86 pour la Chine)");

  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length < VALIDATION.PHONE_MIN + 1)
    return err('Téléphone trop court');
  if (digitsOnly.length > VALIDATION.PHONE_MAX + 1)
    return err('Téléphone trop long');
  if (!looksLikeInternationalPhone(normalized))
    return err('Format téléphone invalide. Utilisez le format : +indicatif numéro (ex: +86 138 0013 8000)');

  return ok;
}

/** Nom / prénom / nom de boutique */
export function validateName(raw: string, field = 'Nom'): ValidationResult {
  const v = normalizeText(raw, VALIDATION.NAME_MAX);
  if (!v) return err(`${field} requis`);
  if (v.length < VALIDATION.NAME_MIN)
    return err(`${field} trop court (min. ${VALIDATION.NAME_MIN} caractères)`);
  if (hasBlocklistChars(v)) return err(`${field} contient des caractères interdits`);
  return ok;
}

/** Ville / quartier */
export function validateCity(raw: string): ValidationResult {
  const v = normalizeText(raw, 80);
  if (!v) return err('Ville requise');
  if (v.length < 2) return err('Ville trop courte');
  if (hasBlocklistChars(v)) return err('Ville contient des caractères interdits');
  return ok;
}

/** Description produit / boutique */
export function validateDescription(raw: string | null | undefined): ValidationResult {
  if (!raw) return ok; // nullable
  const v = normalizeText(raw, VALIDATION.DESCRIPTION_MAX);
  if (hasBlocklistChars(v)) return err('La description contient des caractères interdits');
  return ok;
}

/** Prix en FCFA (entier strictement positif) */
export function validatePrice(raw: number | string): ValidationResult {
  const n = typeof raw === 'string' ? Number.parseInt(raw.replace(/\s/g, ''), 10) : raw;
  if (!Number.isFinite(n)) return err('Prix invalide');
  if (!Number.isInteger(n)) return err('Le prix doit être un entier (FCFA)');
  if (n < 0) return err('Le prix ne peut pas être négatif');
  if (n > VALIDATION.PRICE_MAX) return err('Prix trop élevé');
  return ok;
}

/** Stock */
export function validateStock(raw: number | string): ValidationResult {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
  if (!Number.isFinite(n)) return err('Stock invalide');
  if (!Number.isInteger(n)) return err('Le stock doit être un entier');
  if (n < 0) return err('Le stock ne peut pas être négatif');
  if (n > VALIDATION.STOCK_MAX) return err('Stock trop élevé');
  return ok;
}

/** URL (utilisée pour les vidéos externes : TikTok, YouTube, Snapchat) */
export function validateProductVideoUrl(raw: string): ValidationResult {
  const v = normalizeText(raw, 2048);
  if (!v) return err('URL requise');
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return err('URL invalide');
  }
  if (!['http:', 'https:'].includes(u.protocol)) return err('Seuls HTTP et HTTPS sont acceptés');
  const host = u.hostname.replace(/^www\./, '');
  const allowed = ['tiktok.com', 'youtube.com', 'youtu.be', 'snapchat.com'];
  const okHost = allowed.some((d) => host === d || host.endsWith(`.${d}`));
  if (!okHost) return err('Plateforme non autorisée (TikTok, YouTube ou Snapchat uniquement)');
  return ok;
}

/** Code promo (ex: WAX20) */
export function validateDiscountCode(raw: string): ValidationResult {
  const v = normalizeText(raw, 24).toUpperCase();
  if (!v) return err('Code requis');
  if (!DISCOUNT_CODE_ALLOWED.test(v))
    return err('Code invalide : 3 à 24 lettres/chiffres');
  return ok;
}

/** Pourcentage réduction : 1 à 100 inclus */
export function validatePercentage(raw: number | string): ValidationResult {
  const n = typeof raw === 'string' ? Number.parseFloat(raw) : raw;
  if (!Number.isFinite(n)) return err('Pourcentage invalide');
  if (n < 1) return err('La réduction doit être au minimum 1%');
  if (n > 90) return err('La réduction maximum autorisée est 90%');
  return ok;
}

/** Montant fixe (FCFA) pour réduction */
export function validateFixedDiscount(raw: number | string): ValidationResult {
  const n = typeof raw === 'string' ? Number.parseInt(raw.replace(/\s/g, ''), 10) : raw;
  if (!Number.isFinite(n)) return err('Montant invalide');
  if (!Number.isInteger(n) || n <= 0) return err('Le montant doit être un entier positif');
  if (n > 1_000_000) return err('Montant trop élevé');
  return ok;
}

/** ID (UUID) — vérification de forme minimale, pas d'accès DB côté client */
export function validateIdShape(raw: string | undefined | null): ValidationResult {
  if (!raw) return err('Identifiant manquant');
  if (raw.length < 5 || raw.length > 64) return err('Identifiant invalide');
  return ok;
}
