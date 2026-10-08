import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireAdmin } from './lib/auth';

const MAX_STRING_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LOCATION_FUN_FACT_LENGTH = 1000;
const MAX_LOCATION_SOURCE_LENGTH = 2000;
const MAX_BADGE_TAGS = 25;
const MAX_BADGE_TAG_LENGTH = 80;

const LOCATION_CATEGORIES = [
  'History & Heritage',
  'Culture & Arts',
  'Literature & Libraries',
  'People & Community',
  'Science & Nature',
  'Architecture & Places',
  'Weird & Curious',
] as const;

type LocationCategory = (typeof LOCATION_CATEGORIES)[number];

const LEGACY_LOCATION_CATEGORY_MAP: Record<string, LocationCategory> = {
  architecture: 'Architecture & Places',
  art: 'Culture & Arts',
  'black history': 'History & Heritage',
  books: 'Literature & Libraries',
  'books & libraries': 'Literature & Libraries',
  'cultural heritage': 'History & Heritage',
  folklore: 'Weird & Curious',
  'harvard history': 'History & Heritage',
  'harvard people': 'People & Community',
  'historic artifact': 'History & Heritage',
  'historic building': 'Architecture & Places',
  'historic events': 'History & Heritage',
  'historic home': 'Architecture & Places',
  'historic object': 'History & Heritage',
  'historic places': 'Architecture & Places',
  libraries: 'Literature & Libraries',
  library: 'Literature & Libraries',
  'local history': 'History & Heritage',
  memorial: 'History & Heritage',
  'museum, science and art': 'Culture & Arts',
  'natural wonders': 'Science & Nature',
  oddities: 'Weird & Curious',
  'people, politics, industrial history': 'History & Heritage',
  'public art': 'Culture & Arts',
  'public gardens': 'Science & Nature',
  'religious history': 'History & Heritage',
  transportation: 'History & Heritage',
  'writers & poets': 'Literature & Libraries',
};

function normalizeCategoryLookupKey(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function getCanonicalLocationCategory(
  value: string | undefined,
): LocationCategory | null {
  if (!value) {
    return null;
  }

  const lookupKey = normalizeCategoryLookupKey(value);
  const canonical = LOCATION_CATEGORIES.find(
    (category) => normalizeCategoryLookupKey(category) === lookupKey,
  );

  return canonical ?? LEGACY_LOCATION_CATEGORY_MAP[lookupKey] ?? null;
}

function normalizeLocationCategory(value: string): LocationCategory {
  const category = getCanonicalLocationCategory(value);

  if (category === null) {
    throw new ConvexError(
      `Location category must be one of: ${LOCATION_CATEGORIES.join(', ')}.`,
    );
  }

  return category;
}

function normalizeRequiredString(
  value: string,
  fieldName: string,
  maxLength: number,
): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ConvexError(`${fieldName} is required.`);
  }

  if (trimmed.length > maxLength) {
    throw new ConvexError(
      `${fieldName} must be ${maxLength} characters or fewer.`,
    );
  }

  return trimmed;
}

function normalizeOptionalText(
  value: string | undefined,
  fieldName: string,
  maxLength: number,
): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > maxLength) {
    throw new ConvexError(
      `${fieldName} must be ${maxLength} characters or fewer.`,
    );
  }

  return trimmed;
}

function normalizeOptionalSlug(
  value: string | undefined,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.length > MAX_STRING_LENGTH) {
    throw new ConvexError(
      `${fieldName} must be ${MAX_STRING_LENGTH} characters or fewer.`,
    );
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) {
    throw new ConvexError(
      `${fieldName} must use lowercase letters, numbers, and single hyphens only.`,
    );
  }

  return trimmed;
}

function normalizeLatitude(value: number): number {
  if (!Number.isFinite(value)) {
    throw new ConvexError('latitude must be a finite number.');
  }

  if (value < -90 || value > 90) {
    throw new ConvexError('latitude must be between -90 and 90.');
  }

  return value;
}

function normalizeLongitude(value: number): number {
  if (!Number.isFinite(value)) {
    throw new ConvexError('longitude must be a finite number.');
  }

  if (value < -180 || value > 180) {
    throw new ConvexError('longitude must be between -180 and 180.');
  }

  return value;
}

function normalizeBadgeTags(badges: string[]): string[] {
  if (badges.length > MAX_BADGE_TAGS) {
    throw new ConvexError(
      `badges must contain ${MAX_BADGE_TAGS} tags or fewer.`,
    );
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of badges) {
    const trimmed = tag.trim();

    if (trimmed.length === 0) {
      continue;
    }

    if (trimmed.length > MAX_BADGE_TAG_LENGTH) {
      throw new ConvexError(
        `badge tags must be ${MAX_BADGE_TAG_LENGTH} characters or fewer.`,
      );
    }

    const lowerCaseTag = trimmed.toLowerCase();

    if (seen.has(lowerCaseTag)) {
      continue;
    }

    seen.add(lowerCaseTag);
    normalized.push(trimmed);
  }

  if (normalized.length === 0) {
    throw new ConvexError(
      'At least one badge tag is required for every location.',
    );
  }

  return normalized;
}

function normalizeLocationInput(args: {
  name: string;
  key: string;
  description: string;
  funFact?: string;
  source?: string;
  isLore?: boolean;
  latitude: number;
  longitude: number;
  category: string;
  badges: string[];
  storyKey?: string;
  regionKey?: string;
}) {
  const name = normalizeRequiredString(args.name, 'name', MAX_STRING_LENGTH);
  const key = normalizeRequiredString(args.key, 'key', MAX_STRING_LENGTH);
  const description = normalizeRequiredString(
    args.description,
    'description',
    MAX_DESCRIPTION_LENGTH,
  );
  const category = normalizeLocationCategory(args.category);
  const funFact = normalizeOptionalText(
    args.funFact,
    'Fun fact',
    MAX_LOCATION_FUN_FACT_LENGTH,
  );
  const source = normalizeOptionalText(
    args.source,
    'Source',
    MAX_LOCATION_SOURCE_LENGTH,
  );
  const isLore = args.isLore === true;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) {
    throw new ConvexError(
      'key must use lowercase letters, numbers, and single hyphens only.',
    );
  }

  const storyKey = normalizeOptionalSlug(args.storyKey, 'storyKey');
  const regionKey = normalizeOptionalSlug(args.regionKey, 'regionKey');
  const latitude = normalizeLatitude(args.latitude);
  const longitude = normalizeLongitude(args.longitude);
  const badges = normalizeBadgeTags(args.badges);

  return {
    name,
    key,
    description,
    funFact,
    source,
    isLore,
    latitude,
    longitude,
    category,
    badges,
    storyKey,
    regionKey,
  };
}

export const getLocationsForAdmin = query({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);

    const locations = await ctx.db.query('locations').collect();

    return locations
      .map((location) => ({
        ...location,
        isLore: location.isLore === true,
        retired: location.retired === true,
      }))
      .sort((left, right) =>
        left.name.localeCompare(right.name),
      );
  },
});

export const previewLocationCategoryStandardization = query({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);

    const locations = await ctx.db.query('locations').collect();
    const changes: Array<{
      locationId: typeof locations[number]['_id'];
      name: string;
      before: string;
      after: LocationCategory;
    }> = [];
    const unknownCategories: Array<{
      locationId: typeof locations[number]['_id'];
      name: string;
      category: string;
    }> = [];

    for (const location of locations) {
      const before = location.category?.trim() ?? '';
      const after = getCanonicalLocationCategory(before);

      if (after === null) {
        unknownCategories.push({
          locationId: location._id,
          name: location.name,
          category: before,
        });
      } else if (before !== after) {
        changes.push({
          locationId: location._id,
          name: location.name,
          before,
          after,
        });
      }
    }

    return {
      totalLocations: locations.length,
      alreadyStandardized:
        locations.length - changes.length - unknownCategories.length,
      changes,
      unknownCategories,
    };
  },
});

export const applyLocationCategoryStandardization = mutation({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);

    const locations = await ctx.db.query('locations').collect();
    const changes: Array<{
      locationId: typeof locations[number]['_id'];
      name: string;
      before: string;
      after: LocationCategory;
    }> = [];
    const unknownCategories: Array<{
      locationId: typeof locations[number]['_id'];
      name: string;
      category: string;
    }> = [];

    for (const location of locations) {
      const before = location.category?.trim() ?? '';
      const after = getCanonicalLocationCategory(before);

      if (after === null) {
        unknownCategories.push({
          locationId: location._id,
          name: location.name,
          category: before,
        });
      } else if (before !== after) {
        changes.push({
          locationId: location._id,
          name: location.name,
          before,
          after,
        });
      }
    }

    if (unknownCategories.length > 0) {
      throw new ConvexError(
        'Category standardization stopped because one or more locations use an unknown category. Run the preview and review those locations first.',
      );
    }

    for (const change of changes) {
      await ctx.db.patch(change.locationId, {
        category: change.after,
      });
    }

    return {
      totalLocations: locations.length,
      updatedLocations: changes.length,
      unchangedLocations: locations.length - changes.length,
      changes,
    };
  },
});

export const createLocation = mutation({
  args: {
    name: v.string(),
    key: v.string(),
    description: v.string(),
    funFact: v.optional(v.string()),
    source: v.optional(v.string()),
    isLore: v.optional(v.boolean()),
    latitude: v.number(),
    longitude: v.number(),
    category: v.string(),
    badges: v.array(v.string()),
    storyKey: v.optional(v.string()),
    regionKey: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const normalized = normalizeLocationInput(args);

    const existingByKey = await ctx.db
      .query('locations')
      .withIndex('by_key', (q) => q.eq('key', normalized.key))
      .collect();

    if (existingByKey.length > 0) {
      throw new ConvexError(
        `Location key "${normalized.key}" is already in use.`,
      );
    }

    const locationId = await ctx.db.insert('locations', {
      name: normalized.name,
      key: normalized.key,
      description: normalized.description,
      funFact: normalized.funFact,
      source: normalized.source,
      isLore: normalized.isLore,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      category: normalized.category,
      badges: normalized.badges,
      storyKey: normalized.storyKey,
      regionKey: normalized.regionKey,
      retired: false,
    });

    return locationId;
  },
});

export const updateLocation = mutation({
  args: {
    locationId: v.id('locations'),
    name: v.string(),
    key: v.string(),
    description: v.string(),
    funFact: v.optional(v.string()),
    source: v.optional(v.string()),
    isLore: v.optional(v.boolean()),
    latitude: v.number(),
    longitude: v.number(),
    category: v.string(),
    badges: v.array(v.string()),
    storyKey: v.optional(v.string()),
    regionKey: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existingLocation = await ctx.db.get(args.locationId);

    if (existingLocation === null) {
      throw new ConvexError('Location not found.');
    }

    const normalized = normalizeLocationInput(args);

    const duplicateKey = await ctx.db
      .query('locations')
      .withIndex('by_key', (q) => q.eq('key', normalized.key))
      .collect();

    const hasDifferentLocation = duplicateKey.some(
      (location) => location._id !== args.locationId,
    );

    if (hasDifferentLocation) {
      throw new ConvexError(
        `Location key "${normalized.key}" is already in use.`,
      );
    }

    await ctx.db.patch(args.locationId, {
      name: normalized.name,
      key: normalized.key,
      description: normalized.description,
      funFact: normalized.funFact,
      source: normalized.source,
      isLore: normalized.isLore,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      category: normalized.category,
      badges: normalized.badges,
      storyKey: normalized.storyKey,
      regionKey: normalized.regionKey,
    });

    return args.locationId;
  },
});

export const setLocationRetired = mutation({
  args: {
    locationId: v.id('locations'),
    retired: v.boolean(),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const location = await ctx.db.get(args.locationId);

    if (location === null) {
      throw new ConvexError('Location not found.');
    }

    if (args.retired) {
      if (location.retired === true) {
        return {
          locationId: args.locationId,
          retired: true,
        };
      }

      await ctx.db.patch(args.locationId, {
        retired: true,
        retiredAt: Date.now(),
      });

      return {
        locationId: args.locationId,
        retired: true,
      };
    }

    await ctx.db.patch(args.locationId, {
      retired: false,
      retiredAt: undefined,
    });

    return {
      locationId: args.locationId,
      retired: false,
    };
  },
});
