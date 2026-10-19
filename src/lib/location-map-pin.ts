export const locationMapPinTypeOptions = [
  {
    value: 'historic_sites',
    label: 'Historic Sites',
    mapSymbol: 'H',
    unvisitedDescription: 'Closed antique book',
    visitedDescription: 'Open antique book',
  },
  {
    value: 'monuments_public_art',
    label: 'Monuments & Public Art',
    mapSymbol: 'M',
    unvisitedDescription: 'Covered monument',
    visitedDescription: 'Revealed cow statue',
  },
  {
    value: 'mystery_lore',
    label: 'Mystery & Lore',
    mapSymbol: '?',
    unvisitedDescription: 'Question story cloud',
    visitedDescription: 'Discovered story cloud',
  },
  {
    value: 'noteworthy_people',
    label: 'Noteworthy People',
    mapSymbol: 'P',
    unvisitedDescription: 'Unrevealed person',
    visitedDescription: 'Discovered person',
  },
  {
    value: 'other_discoveries',
    label: 'Other Discoveries',
    mapSymbol: 'O',
    unvisitedDescription: 'Red discovery gem',
    visitedDescription: 'Green discovery gem',
  },
] as const;

export type LocationMapPinType =
  (typeof locationMapPinTypeOptions)[number]['value'];

const monumentTags = new Set([
  'memorials-monuments',
  'plaque',
  'public-art',
  'statue',
  'statues-sculpture',
]);

const mysteryTags = new Set([
  'folklore-legends',
  'ghost-stories',
  'halloween-history',
  'historical-mysteries',
  'oddities',
  'strange-history',
  'unsolved-mysteries',
]);

const peopleTags = new Set([
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

const womensHistoryTags = new Set([
  'women-history',
  'women-s-history',
  'women-s-history-month',
  'womens-history',
  'womens-history-month',
]);

const historicCategories = new Set([
  'Architecture & Places',
  'History & Heritage',
  'Literature & Libraries',
]);

function normalizeTag(value: string) {
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
) {
  for (const tag of normalizedTags) {
    if (candidates.has(tag)) {
      return true;
    }
  }

  return false;
}

export function getLocationMapPinTypeOption(
  value: string | undefined,
) {
  return locationMapPinTypeOptions.find(
    (option) => option.value === value,
  );
}

export function getCanonicalLocationMapPinType(
  value: string | undefined,
): LocationMapPinType | null {
  return getLocationMapPinTypeOption(value)?.value ?? null;
}

export function usesWomensHistoryPersonPin(badges: string[]) {
  return includesTagFrom(
    new Set(badges.map(normalizeTag)),
    womensHistoryTags,
  );
}

export function suggestLocationMapPinType(args: {
  badges: string[];
  category?: string;
  isLore?: boolean;
}): LocationMapPinType {
  const normalizedTags = new Set(args.badges.map(normalizeTag));

  if (includesTagFrom(normalizedTags, monumentTags)) {
    return 'monuments_public_art';
  }

  if (
    args.isLore === true ||
    includesTagFrom(normalizedTags, mysteryTags) ||
    args.category === 'Weird & Curious'
  ) {
    return 'mystery_lore';
  }

  if (
    includesTagFrom(normalizedTags, peopleTags) ||
    args.category === 'People & Community'
  ) {
    return 'noteworthy_people';
  }

  if (historicCategories.has(args.category ?? '')) {
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
  return (
    getCanonicalLocationMapPinType(args.mapPinType) ??
    suggestLocationMapPinType(args)
  );
}
