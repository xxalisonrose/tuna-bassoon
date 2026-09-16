import type { Id } from '../../convex/_generated/dataModel';

export type Place = {
  id: Id<'locations'>;
  title: string;
  description: string;
  coordinates: [number, number];
  category?: string;
  badges: string[];
};