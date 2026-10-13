export const LOCATION_MAP_PIN_TYPES = [
  'historic_sites',
  'monuments_public_art',
  'mystery_lore',
  'noteworthy_people',
  'other_discoveries',
] as const;

export type LocationMapPinType =
  (typeof LOCATION_MAP_PIN_TYPES)[number];

const MONUMENT_TAGS = new Set([
  'memorials-monuments',
  'plaque',
  'public-art',
  'statue',
  'statues-sculpture',
]);

const MYSTERY_TAGS = new Set([
  'folklore-legends',
  'ghost-stories',
  'halloween-history',
  'historical-mysteries',
  'oddities',
  'strange-history',
  'unsolved-mysteries',
]);

const PEOPLE_TAGS = new Set([
  'activists',
  'artists',
  'artists-and-architects',
  'athletes',
  'born-here',
  'civil-war-figures',
  'educators',
  'entrepreneurs',
  'explorers',
  'harvard-people',
  'interesting-people',
  'inventors-and-scientists',
  'musicians',
  'musicians-and-performers',
  'presidential-history',
  'scientists',
  'women-history',
  'writers-and-poets',
  'writers-poets',
]);

const HISTORIC_CATEGORIES = new Set([
  'Architecture & Places',
  'History & Heritage',
  'Literature & Libraries',
]);

function normalizeTag(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function includesTagFrom(
  normalizedTags: ReadonlySet<string>,
  candidates: ReadonlySet<string>,
): boolean {
  for (const tag of normalizedTags) {
    if (candidates.has(tag)) {
      return true;
    }
  }

  return false;
}

export function isLocationMapPinType(
  value: string | undefined,
): value is LocationMapPinType {
  return LOCATION_MAP_PIN_TYPES.some(
    (candidate) => candidate === value,
  );
}

export function suggestLocationMapPinType(args: {
  badges: string[];
  category?: string;
  isLore?: boolean;
}): LocationMapPinType {
  const normalizedTags = new Set(args.badges.map(normalizeTag));

  if (includesTagFrom(normalizedTags, MONUMENT_TAGS)) {
    return 'monuments_public_art';
  }

  if (
    args.isLore === true ||
    includesTagFrom(normalizedTags, MYSTERY_TAGS) ||
    args.category === 'Weird & Curious'
  ) {
    return 'mystery_lore';
  }

  if (
    includesTagFrom(normalizedTags, PEOPLE_TAGS) ||
    args.category === 'People & Community'
  ) {
    return 'noteworthy_people';
  }

  if (HISTORIC_CATEGORIES.has(args.category ?? '')) {
    return 'historic_sites';
  }

  return 'other_discoveries';
}

export function resolveLocationMapPinType(args: {
  mapPinType?: string;
  badges: string[];
  category?: string;
  isLore?: boolean;
}): LocationMapPinType {
  return isLocationMapPinType(args.mapPinType)
    ? args.mapPinType
    : suggestLocationMapPinType(args);
}
