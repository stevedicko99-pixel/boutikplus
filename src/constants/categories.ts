// Catégories de produits — marketplace communautaire
export interface CategoryDef {
  id: string;
  name: string;
  icon: string; // nom d'icône @expo/vector-icons (Feather)
  color: string;
  sort_order: number;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'vetements', name: 'Vêtements', icon: 'shopping-bag', color: '#FF6B00', sort_order: 1 },
  { id: 'cosmetiques', name: 'Cosmétiques', icon: 'droplet', color: '#6B2D8E', sort_order: 2 },
  { id: 'nourriture', name: 'Nourriture', icon: 'coffee', color: '#00A859', sort_order: 3 },
  { id: 'artisanat', name: 'Artisanat', icon: 'gift', color: '#FFC107', sort_order: 4 },
  { id: 'accessoires', name: 'Accessoires', icon: 'watch', color: '#0DCAF0', sort_order: 5 },
  { id: 'services', name: 'Services', icon: 'briefcase', color: '#DC3545', sort_order: 6 },
  { id: 'beaute', name: 'Beauté', icon: 'heart', color: '#FF8533', sort_order: 7 },
  { id: 'maison', name: 'Maison', icon: 'home', color: '#8B3DAE', sort_order: 8 },
];

export const getCategoryName = (id: string): string =>
  CATEGORIES.find((c) => c.id === id)?.name ?? 'Autre';

export const getCategoryIcon = (id: string): string =>
  CATEGORIES.find((c) => c.id === id)?.icon ?? 'tag';
