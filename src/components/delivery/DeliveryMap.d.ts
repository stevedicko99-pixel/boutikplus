import type { ComponentType } from 'react';

type Point = { latitude: number; longitude: number };
type DeliveryMapProps = { driver?: Point | null; pickup?: Point | null; destination?: Point | null };

export const DeliveryMap: ComponentType<DeliveryMapProps>;
