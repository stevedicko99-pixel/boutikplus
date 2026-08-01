// Fonctions de formatage — devise FCFA, dates, téléphones

const fcfaFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
});

/** Formate un montant en FCFA, ex: 12500 -> "12 500 FCFA" */
export const formatFCFA = (amount: number): string =>
  `${fcfaFormatter.format(amount)} FCFA`;

/** Formate un montant en FCFA compact, ex: 12500 -> "12 500" */
export const formatNumber = (amount: number): string =>
  fcfaFormatter.format(amount);

/** Date relative courte en français : "Il y a 5 min", "Hier", "12 mars" */
export const formatRelativeDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffH / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH} h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} j`;

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
};

/** Date complète : "30 juillet 2026, 14:30" */
export const formatDateTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Formate un numéro de téléphone burkinabè : 70123456 -> "70 12 34 56" */
export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(
      4,
      6,
    )} ${digits.slice(6, 8)}`;
  }
  return phone;
};

/** Tronque un texte long avec ellipsis */
export const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;
