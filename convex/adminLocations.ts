import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireAdmin } from './lib/auth';

const MAX_STRING_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_BADGE_TAGS = 25;
const MAX_BADGE_TAG_LENGTH = 80;

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

  return normalized;
}

function normalizeLocationInput(args: {
  name: string;
  key: string;
  description: string;
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
  const category = normalizeRequiredString(
    args.category,
    'category',
    MAX_STRING_LENGTH,
  );

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

    return locations.sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  },
});

export const createLocation = mutation({
  args: {
    name: v.string(),
    key: v.string(),
    description: v.string(),
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
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      category: normalized.category,
      badges: normalized.badges,
      storyKey: normalized.storyKey,
      regionKey: normalized.regionKey,
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
