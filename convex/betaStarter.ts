import { ConvexError, v } from 'convex/values';

import type { MutationCtx } from './_generated/server';
import { mutation } from './_generated/server';

const BETA_BADGE_KEY = 'beta-pathfinder';
const BETA_BADGE_TAG = 'beta-trail';
const STARTER_DISTANCE_METERS = 34;

const starterStops = [
  {
    key: 'base-camp',
    name: 'Beta Eiffel Tower',
    description:
      'Paris’s Eiffel Tower was completed for the 1889 Exposition Universelle. This private beta stand-in is placed near you so you can test Lorcal’s location details and check-in flow.',
    funFact:
      'The tower was intended to stand for only 20 years, but its usefulness as a radio antenna helped preserve it.',
    category: 'Monuments & Public Art',
    mapPinType: 'monuments_public_art',
    east: 0,
    north: 0,
  },
  {
    key: 'north',
    name: 'Beta Louvre Museum',
    description:
      'The Louvre began as a medieval fortress, later became a royal palace, and opened as a public museum in 1793. This private beta stand-in stays close enough for testing.',
    funFact:
      'Remains of the Louvre’s original fortress can still be seen beneath the museum.',
    category: 'Historic Sites',
    mapPinType: 'historic_sites',
    east: 0,
    north: 1,
  },
  {
    key: 'east',
    name: 'Beta Stonehenge',
    description:
      'Stonehenge is a prehistoric stone circle in southern England, built in stages over many centuries. This nearby private version demonstrates Lorcal’s mystery and lore locations.',
    funFact:
      'Some of Stonehenge’s bluestones were transported from Wales, more than 150 miles away.',
    category: 'Mystery & Lore',
    mapPinType: 'mystery_lore',
    east: 1,
    north: 0,
  },
  {
    key: 'south',
    name: 'Beta Shakespeare’s Globe',
    description:
      'Shakespeare’s Globe in London is a reconstruction of the open-air theater associated with William Shakespeare’s company. This private beta stop showcases people-centered stories.',
    funFact:
      'The modern Globe opened in 1997 near the site of the original theater, which was built in 1599.',
    category: 'Noteworthy People',
    mapPinType: 'noteworthy_people',
    east: 0,
    north: -1,
  },
  {
    key: 'west',
    name: 'Beta Great Barrier Reef',
    description:
      'Australia’s Great Barrier Reef is the world’s largest coral reef system. This private nearby stand-in demonstrates the discoveries and natural-wonders side of Lorcal.',
    funFact:
      'The reef system stretches for more than 1,400 miles along the coast of Queensland.',
    category: 'Other Discoveries',
    mapPinType: 'other_discoveries',
    east: -1,
    north: 0,
  },
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
      'Checked in at all five private Beta Landmark stops during testing.',
    imageKey: 'beta-pathfinder',
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
    const existingByKey = new Map(
      existingLocations
        .filter(
          (location) => location.betaStarterKey !== undefined,
        )
        .map((location) => [location.betaStarterKey!, location]),
    );
    const now = Date.now();
    let createdLocationCount = 0;
    let updatedLocationCount = 0;

    for (const stop of starterStops) {
      const existingLocation = existingByKey.get(stop.key);

      if (existingLocation !== undefined) {
        const needsUpdate =
          existingLocation.name !== stop.name ||
          existingLocation.description !== stop.description ||
          existingLocation.funFact !== stop.funFact ||
          existingLocation.badges.length !== 1 ||
          existingLocation.badges[0] !== BETA_BADGE_TAG ||
          existingLocation.category !== stop.category ||
          existingLocation.mapPinType !== stop.mapPinType ||
          existingLocation.betaOnly !== true ||
          existingLocation.retired !== false;

        if (needsUpdate) {
          await ctx.db.patch(existingLocation._id, {
            name: stop.name,
            description: stop.description,
            funFact: stop.funFact,
            badges: [BETA_BADGE_TAG],
            category: stop.category,
            mapPinType: stop.mapPinType,
            betaOnly: true,
            retired: false,
          });
          updatedLocationCount += 1;
        }
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
        description: stop.description,
        funFact: stop.funFact,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        badges: [BETA_BADGE_TAG],
        category: stop.category,
        mapPinType: stop.mapPinType,
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
      updatedLocationCount,
      totalLocationCount: existingByKey.size + createdLocationCount,
    };
  },
});
