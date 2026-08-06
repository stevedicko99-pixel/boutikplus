export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type DeliveryZoneType = 'quartier' | 'secteur' | 'autre';

export interface DeliveryZone {
  id: string;
  name: string;
  type: DeliveryZoneType;
  center: Coordinates;
}

export interface BurkinaCityDefinition {
  id: string;
  name: string;
  center: Coordinates;
  zones: readonly DeliveryZone[];
}

const zone = (
  id: string,
  name: string,
  type: DeliveryZoneType,
  latitude: number,
  longitude: number,
): DeliveryZone => ({ id, name, type, center: { latitude, longitude } });

export const BURKINA_CITY_DEFINITIONS = [
  {
    id: 'ouagadougou',
    name: 'Ouagadougou',
    center: { latitude: 12.3714, longitude: -1.5197 },
    zones: [
      zone('ouaga-gounghin', 'Gounghin', 'quartier', 12.365, -1.548),
      zone('ouaga-dapoya', 'Dapoya', 'quartier', 12.382, -1.518),
      zone('ouaga-wemtenga', 'Wemtenga', 'quartier', 12.374, -1.488),
      zone('ouaga-pissy', 'Pissy', 'quartier', 12.337, -1.574),
      zone('ouaga-ouaga-2000', 'Ouaga 2000', 'quartier', 12.305, -1.523),
      zone('ouaga-tampouy', 'Tampouy', 'quartier', 12.414, -1.552),
      zone('ouaga-autre', 'Autre zone', 'autre', 12.3714, -1.5197),
    ],
  },
  {
    id: 'bobo-dioulasso',
    name: 'Bobo-Dioulasso',
    center: { latitude: 11.1771, longitude: -4.2979 },
    zones: [
      zone('bobo-dioulasso', 'Dioulassoba', 'quartier', 11.174, -4.299),
      zone('bobo-colma', 'Colma', 'quartier', 11.195, -4.31),
      zone('bobo-sarfalao', 'Sarfalao', 'quartier', 11.153, -4.283),
      zone('bobo-dafra', 'Dafra', 'quartier', 11.145, -4.305),
      zone('bobo-dogona', 'Dogona', 'quartier', 11.188, -4.276),
      zone('bobo-autre', 'Autre zone', 'autre', 11.1771, -4.2979),
    ],
  },
  { id: 'koudougou', name: 'Koudougou', center: { latitude: 12.2526, longitude: -2.3627 }, zones: [zone('koudougou-autre', 'Autre zone', 'autre', 12.2526, -2.3627)] },
  { id: 'ouahigouya', name: 'Ouahigouya', center: { latitude: 13.5828, longitude: -2.4216 }, zones: [zone('ouahigouya-autre', 'Autre zone', 'autre', 13.5828, -2.4216)] },
  { id: 'banfora', name: 'Banfora', center: { latitude: 10.6333, longitude: -4.7667 }, zones: [zone('banfora-autre', 'Autre zone', 'autre', 10.6333, -4.7667)] },
  { id: 'kaya', name: 'Kaya', center: { latitude: 13.0917, longitude: -1.0844 }, zones: [zone('kaya-autre', 'Autre zone', 'autre', 13.0917, -1.0844)] },
  { id: 'dedougou', name: 'Dédougou', center: { latitude: 12.4634, longitude: -3.4608 }, zones: [zone('dedougou-autre', 'Autre zone', 'autre', 12.4634, -3.4608)] },
  { id: 'tenkodogo', name: 'Tenkodogo', center: { latitude: 11.78, longitude: -0.3697 }, zones: [zone('tenkodogo-autre', 'Autre zone', 'autre', 11.78, -0.3697)] },
  { id: 'fada-ngourma', name: "Fada N'Gourma", center: { latitude: 12.0616, longitude: 0.3584 }, zones: [zone('fada-ngourma-autre', 'Autre zone', 'autre', 12.0616, 0.3584)] },
  { id: 'dori', name: 'Dori', center: { latitude: 14.0354, longitude: -0.0345 }, zones: [zone('dori-autre', 'Autre zone', 'autre', 14.0354, -0.0345)] },
  { id: 'gaoua', name: 'Gaoua', center: { latitude: 10.2992, longitude: -3.2508 }, zones: [zone('gaoua-autre', 'Autre zone', 'autre', 10.2992, -3.2508)] },
  { id: 'manga', name: 'Manga', center: { latitude: 11.6636, longitude: -1.0731 }, zones: [zone('manga-autre', 'Autre zone', 'autre', 11.6636, -1.0731)] },
  { id: 'ziniare', name: 'Ziniaré', center: { latitude: 12.5822, longitude: -1.2983 }, zones: [zone('ziniare-autre', 'Autre zone', 'autre', 12.5822, -1.2983)] },
  { id: 'dano', name: 'Dano', center: { latitude: 11.1464, longitude: -3.0578 }, zones: [zone('dano-autre', 'Autre zone', 'autre', 11.1464, -3.0578)] },
  { id: 'pouytenga', name: 'Pouytenga', center: { latitude: 12.25, longitude: -0.4333 }, zones: [zone('pouytenga-autre', 'Autre zone', 'autre', 12.25, -0.4333)] },
] as const satisfies readonly BurkinaCityDefinition[];

export const BURKINA_CITIES = BURKINA_CITY_DEFINITIONS.map((city) => city.name);
export type BurkinaCity = (typeof BURKINA_CITY_DEFINITIONS)[number]['name'];
export const CITY_LIST: string[] = [...BURKINA_CITIES];

export function getCityByName(cityName: string): BurkinaCityDefinition | undefined {
  return BURKINA_CITY_DEFINITIONS.find((city) => city.name === cityName);
}

export function getZonesForCity(cityName: string): readonly DeliveryZone[] {
  return getCityByName(cityName)?.zones ?? [];
}

export function getZoneById(zoneId: string | null | undefined): DeliveryZone | undefined {
  if (!zoneId) return undefined;
  for (const city of BURKINA_CITY_DEFINITIONS) {
    const found = city.zones.find((item) => item.id === zoneId);
    if (found) return found;
  }
  return undefined;
}
