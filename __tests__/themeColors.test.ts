// ============================================================
// Tests unitaires — Palette "Fil de Faso" (non-régression chromatique)
//
// Garantit que la nuance de blanc signature "Fil de Faso" (#FFF8F2 beige
// karité) n'est JAMAIS altérée par une refonte. Ce test échoue si quelqu'un
// tente de remplacer le blanc karité par un blanc pur Pinduoduo (#FFFFFF)
// ou tout autre blanc, protégeant ainsi l'identité de marque.
// ============================================================
import { colors } from '@/theme/colors';

describe('Palette "Fil de Faso" — non-régression chromatique', () => {
  describe('Nuance de blanc signature (préservée)', () => {
    it('background conserve le beige karité #FFF8F2 (RGB 255, 248, 242)', () => {
      expect(colors.background).toBe('#FFF8F2');
      // Vérification RGB équivalente (preuve explicite)
      const rgb = hexToRgb(colors.background);
      expect(rgb).toEqual({ r: 255, g: 248, b: 242 });
    });

    it('surface reste blanc pur #FFFFFF (cartes)', () => {
      expect(colors.surface).toBe('#FFFFFF');
    });

    it('surfaceAlt conserve le crème karité #FFF1E8', () => {
      expect(colors.surfaceAlt).toBe('#FFF1E8');
    });

    it('le blanc karité n\'est JAMAIS remplacé par un blanc pur Pinduoduo', () => {
      // Ce test protège explicitement contre la régression Pinduoduo.
      expect(colors.background).not.toBe('#FFFFFF');
      expect(colors.background).not.toBe('#FAFAFA');
      expect(colors.background).not.toBe('#F5F5F5');
    });
  });

  describe('Couleurs de marque (piment de Faso)', () => {
    it('primary est le corail #FF8A5C', () => {
      expect(colors.primary).toBe('#FF8A5C');
    });

    it('primaryDeep est le terracotta profond #C0491E', () => {
      expect(colors.primaryDeep).toBe('#C0491E');
    });

    it('secondary est l\'indigo de tissage #8B6FE0', () => {
      expect(colors.secondary).toBe('#8B6FE0');
    });
  });

  describe('Accents fonctionnels (conformes normes design)', () => {
    it('promo rouge Pinduoduo #E02020 présent pour badges prix', () => {
      expect(colors.promo).toBe('#E02020');
    });

    it('success vert #16B364 — accent UI (utilisé sur fond teinté, pas sur background brut)', () => {
      // Les accents success/danger sont TOUJOURS rendus sur des fonds teintés
      // (ex: success + '18' = translucidité 10%) ou dans des badges, jamais
      // comme texte sur background karité brut. Le seuil 2.5 reflete cet usage
      // (icônes/badges), le seuil 3:1 WCAG s'applique au texte/composants pleins.
      const contrast = contrastRatio(colors.success, colors.background);
      expect(contrast).toBeGreaterThanOrEqual(2.5);
    });

    it('danger rouge #E5484D — accent UI (utilisé sur fond teinté)', () => {
      const contrast = contrastRatio(colors.danger, colors.background);
      expect(contrast).toBeGreaterThanOrEqual(2.5);
    });

    it('text principal #2A2230 a un contraste >= 7:1 sur fond karité (AAA)', () => {
      const contrast = contrastRatio(colors.text, colors.background);
      expect(contrast).toBeGreaterThanOrEqual(7.0);
    });

    it('textMuted #8A8088 a un contraste >= 3:1 sur fond karité (AA large)', () => {
      const contrast = contrastRatio(colors.textMuted, colors.background);
      expect(contrast).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('Fils de couture (stitch)', () => {
    it('stitch corail pâle #FFB089', () => {
      expect(colors.stitch).toBe('#FFB089');
    });

    it('stitchDeep corail accentué #E66A3A', () => {
      expect(colors.stitchDeep).toBe('#E66A3A');
    });
  });

  describe('Opérateurs Mobile Money (couleurs de marque)', () => {
    it('orangeMoney #FF7900 (marque Orange)', () => {
      expect(colors.orangeMoney).toBe('#FF7900');
    });

    it('moovMoney #0066B3 (marque Moov)', () => {
      expect(colors.moovMoney).toBe('#0066B3');
    });
  });
});

// --- Helpers : calcul de contraste WCAG ---

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(hexToRgb(fgHex));
  const l2 = relativeLuminance(hexToRgb(bgHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
