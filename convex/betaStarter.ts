import { ConvexError, v } from 'convex/values';

import type { MutationCtx } from './_generated/server';
import { mutation } from './_generated/server';

const BETA_BADGE_KEY = 'beta-pathfinder';
const BETA_BADGE_TAG = 'beta-trail';
const STARTER_DISTANCE_METERS = 34;

const starterStops = [
  { key: 'base-camp', name: 'Beta Base Camp', east: 0, north: 0 },
  { key: 'north', name: 'Beta North Trail', east: 0, north: 1 },
  { key: 'east', name: 'Beta East Trail', east: 1, north: 0 },
  { key: 'south', name: 'Beta South Trail', east: 0, north: -1 },
  { key: 'west', name: 'Beta West Trail', east: -1, north: 0 },
] as const;

function offsetCoordinates(
  latitude: number,
  longitude: number,
  eastMultiplier: number,
  northMultiplier: number,
) {
  const latitudeOffset =
    (northMultiplier * STARTER_DISTANCE_METERS) / 111_320;
  const longitudeDivisor =
    111_320 * Math.cos((latitude * Math.PI) / 180);
  const longitudeOffset = longitudeDivisor === 0
    ? 0
    : (eastMultiplier * STARTER_DISTANCE_METERS) / longitudeDivisor;

  return {
    latitude: latitude + latitudeOffset,
    longitude: longitude + longitudeOffset,
  };
}

async function ensureBetaBadge(ctx: MutationCtx) {
  const existing = await ctx.db
    .query('badgeDefinitions')
    .withIndex('by_key', (queryBuilder) =>
      queryBuilder.eq('key', BETA_BADGE_KEY),
    )
    .unique();
  const fields = {
    name: 'Beta Pathfinder',
    tag: BETA_BADGE_TAG,
    key: BETA_BADGE_KEY,
    description:
      'Checked in at all five private Beta Trail stops during testing.',
    requiredVisits: starterStops.length,
    classification: 'general' as const,
    rule: {
      type: 'tag' as const,
      normalizedTag: BETA_BADGE_TAG,
    },
    retired: false,
    levelsEnabled: false,
    betaOnly: true,
    congratulationsMessages: [
      'Beta trail complete! Thanks for helping test Lorcal.',
    ],
  };

  if (existing !== null) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }

  return await ctx.db.insert('badgeDefinitions', fields);
}

export const ensureMyStarterContent = mutation({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    releaseChannel: v.literal('beta'),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Sign in before preparing beta content.');
    }

    if (
      args.latitude < -90 ||
      args.latitude > 90 ||
      args.longitude < -180 ||
      args.longitude > 180
    ) {
      throw new ConvexError('The supplied GPS coordinates are invalid.');
    }

    const existingLocations = await ctx.db
      .query('locations')
      .withIndex('by_owner', (queryBuilder) =>
        queryBuilder.eq('ownerClerkUserId', identity.subject),
      )
      .collect();
    const existingKeys = new Set(
      existingLocations
        .map((location) => location.betaStarterKey)
        .filter((key): key is string => key !== undefined),
    );
    const now = Date.now();
    let createdLocationCount = 0;

    for (const stop of starterStops) {
      if (existingKeys.has(stop.key)) {
        continue;
      }

      const coordinates = offsetCoordinates(
        args.latitude,
        args.longitude,
        stop.east,
        stop.north,
      );

      await ctx.db.insert('locations', {
        name: stop.name,
        description:
          'A private temporary stop created for your Lorcal beta tutorial. It is visible only to your account.',
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        badges: [BETA_BADGE_TAG],
        category: 'Beta Testing',
        mapPinType: 'other_discoveries',
        ownerClerkUserId: identity.subject,
        betaStarterKey: stop.key,
        betaOnly: true,
        retired: false,
      });
      createdLocationCount += 1;
    }

    await ensureBetaBadge(ctx);

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .unique();

    if (profile === null) {
      await ctx.db.insert('userProfiles', {
        clerkUserId: identity.subject,
        avatarPresetId: 'explorer',
        avatarTopId: 'explorer_field',
        avatarBottomId: 'explorer_cargo',
        avatarShoesId: 'explorer_boots',
        avatarNeckId: 'rust_neckerchief',
        avatarFaceId: 'explorer_goggles',
        betaStarterContentCreatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } else if (profile.betaStarterContentCreatedAt === undefined) {
      await ctx.db.patch(profile._id, {
        betaStarterContentCreatedAt: now,
        updatedAt: now,
      });
    }

    return {
      createdLocationCount,
      totalLocationCount: existingKeys.size + createdLocationCount,
    };
  },
});
