import type { Id } from '../../convex/_generated/dataModel';
import type { LocationMapPinType } from '@/lib/location-map-pin';

export type Place = {
  id: Id<'locations'>;
  title: string;
  description: string;
  funFact?: string;
  source?: string;
  isLore?: boolean;
  coordinates: [number, number];
  category?: string;
  city?: string;
  state?: string;
  mapPinType: LocationMapPinType;
  badges: string[];
  betaOnly?: boolean;
};
