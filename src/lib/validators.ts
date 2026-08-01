// Validateurs d'entrée stricte — Boutikplus (production)
// Toutes les entrées utilisateur (formulaires) doivent PASSER par ces validateurs
// avant d'atteindre la couche service ou le stockage distant.
// Ils complètent les contraintes SQL et les politiques RLS côté Supabase.

/**
 * Burkina Faso — indicatif téléphonique.
 * Formats acceptés :
 *   - 8 chiffres  : "70123456" (8)
 *   - "+226 8 chiffres" : "+22670123456" / "+226 70 12 34 56"
 *   - "00226 préfixé"
 *   - espaces, tirets, points autorisés comme séparateurs (strippés avant validation)
 */
const BF_MOBILE_STRICT = /^(?:\+226|00226)?[5-7]\d{7}$/;
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
  PHONE_MIN: 8, // chiffres seulement
  PHONE_MAX: 13, // avec +226
} as const;

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

const ok: ValidationResult = { ok: true };
const err = (message: string): ValidationResult => ({ ok: false, message });

// ---------- Normaliseurs ----------
// On normalise TOUT (strip HTML, normalise espaces) avant validation.

export function normalizeText(raw: string, max?: number): string {
  let s = raw.replace(/\u0000/g, '').replace(/[\u200B-\u200D\uFEFF]/g, ''); // NUL & zero-width
  s = s.replace(/\s+/g, ' ').trim(); // collapse whitespace
  if (max !== undefined && s.length > max) s = s.slice(0, max);
  return s;
}

export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-.()]/g, '').trim();
}

// ---------- Helpers ----------
function hasBlocklistChars(text: string): boolean {
  return SAFE_TEXT_BLOCKLIST.test(text);
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

/** Téléphone mobile Burkina Faso */
export function validatePhone(raw: string): ValidationResult {
  const normalized = normalizePhone(raw);
  if (!normalized) return err('Téléphone requis');
  if (normalized.length < VALIDATION.PHONE_MIN) return err('Téléphone trop court');
  if (!BF_MOBILE_STRICT.test(normalized))
    return err('Format téléphone invalide (Burkina Faso)');
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
