import { getProductGridColumns, getProductGridLayout } from '@/lib/responsiveGrid';

describe('grilles produits responsive', () => {
  it.each([
    [320, 2],
    [360, 2],
    [390, 2],
    [600, 3],
    [768, 3],
    [1024, 4],
    [1200, 4],
  ])('utilise %i colonnes pour une largeur de %i px', (width, expectedColumns) => {
    expect(getProductGridColumns(width)).toBe(expectedColumns);
  });

  it.each([320, 360, 390, 600, 768, 1024, 1200])(
    'calcule des cellules uniformes sans dépasser le conteneur à %i px',
    (width) => {
      const layout = getProductGridLayout(width);
      const occupiedWidth = layout.sidePadding * 2
        + layout.cardWidth * layout.columns
        + layout.gap * (layout.columns - 1);

      expect(occupiedWidth).toBeCloseTo(width, 5);
      expect(layout.cardWidth).toBeGreaterThan(0);
    },
  );
});
