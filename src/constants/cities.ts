// Villes principales du Burkina Faso pour les filtres
export const BURKINA_CITIES = [
  'Ouagadougou',
  'Bobo-Dioulasso',
  'Koudougou',
  'Ouahigouya',
  'Banfora',
  'Kaya',
  'Dédougou',
  'Tenkodogo',
  'Fada N\'Gourma',
  'Dori',
  'Gaoua',
  'Manga',
  'Ziniaré',
  'Dano',
  'Pouytenga',
] as const;

export type BurkinaCity = (typeof BURKINA_CITIES)[number];

export const CITY_LIST: string[] = [...BURKINA_CITIES];
