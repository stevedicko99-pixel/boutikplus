export interface ProductGridLayout {
  columns: number;
  gap: number;
  sidePadding: number;
  cardWidth: number;
}

export function getProductGridColumns(containerWidth: number): number {
  if (containerWidth < 600) return 2;
  if (containerWidth < 900) return 3;
  return 4;
}

export function getProductGridLayout(containerWidth: number): ProductGridLayout {
  const width = Math.max(0, containerWidth);
  const columns = getProductGridColumns(width);
  const sidePadding = width < 600 ? 16 : width < 1024 ? 24 : 32;
  const gap = width < 600 ? 12 : 16;
  const availableWidth = Math.max(0, width - sidePadding * 2);

  return {
    columns,
    gap,
    sidePadding,
    cardWidth: Math.max(0, (availableWidth - gap * (columns - 1)) / columns),
  };
}
