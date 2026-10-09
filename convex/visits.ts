import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireAdmin } from './lib/auth';

const CHECK_IN_RADIUS_METERS = 80;
const EARTH_RADIUS_METERS = 6_371_000;

function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

function calculateDistanceMeters(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
) {
  const latitudeDifference = degreesToRadians(
    secondLatitude - firstLatitude,
  );
  const longitudeDifference = degreesToRadians(
    secondLongitude - firstLongitude,
  );

  const firstLatitudeRadians =
    degreesToRadians(firstLatitude);
  const secondLatitudeRadians =
    degreesToRadians(secondLatitude);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDifference / 2) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine),
    );

  return EARTH_RADIUS_METERS * angularDistance;
}

export const checkIn = mutation({
  args: {
    locationId: v.id('locations'),
    userLatitude: v.number(),
    userLongitude: v.number(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('You must sign in before checking in.');
    }

    if (
      args.userLatitude < -90 ||
      args.userLatitude > 90 ||
      args.userLongitude < -180 ||
      args.userLongitude > 180
    ) {
      throw new ConvexError('The supplied GPS coordinates are invalid.');
    }

    const location = await ctx.db.get(args.locationId);

    if (location === null) {
      throw new ConvexError('This location no longer exists.');
    }

    if (location.retired === true) {
      throw new ConvexError(
        'This location is retired and no longer accepts check-ins.',
      );
    }

    if (
      location.latitude === undefined ||
      location.longitude === undefined
    ) {
      throw new ConvexError(
        'This location does not support check-ins yet.',
      );
    }

    const existingVisit = await ctx.db
      .query('visits')
      .withIndex('by_user_and_location', (queryBuilder) =>
        queryBuilder
          .eq('clerkUserId', identity.subject)
          .eq('locationId', args.locationId),
      )
      .unique();

    if (existingVisit !== null) {
      return {
        status: 'already_checked_in' as const,
        visitId: existingVisit._id,
        distanceMeters: existingVisit.distanceMeters,
      };
    }

    const distanceMeters = calculateDistanceMeters(
      args.userLatitude,
      args.userLongitude,
      location.latitude,
      location.longitude,
    );

    if (distanceMeters > CHECK_IN_RADIUS_METERS) {
      return {
        status: 'too_far' as const,
        distanceMeters: Math.round(distanceMeters),
      };
    }

    const visitId = await ctx.db.insert('visits', {
      clerkUserId: identity.subject,
      locationId: args.locationId,
      visitedAt: Date.now(),
      distanceMeters: Math.round(distanceMeters),
    });

    return {
      status: 'success' as const,
      visitId,
      distanceMeters: Math.round(distanceMeters),
      stampName: location.name,
      badgeTags: location.badges,
    };
  },
});


export const getMyVisits = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return [];
    }

    const visits = await ctx.db
      .query('visits')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .collect();

    return Promise.all(
      visits.map(async (visit) => {
        const location = await ctx.db.get(visit.locationId);

        return {
          ...visit,
          locationName: location?.name ?? 'Unknown location',
          badgeTags: location?.badges ?? [],
        };
      }),
    );
  },
});

export const resetMyTestingProgress = mutation({
  args: {},

  handler: async (ctx) => {
    const identity = await requireAdmin(ctx);

    const [visits, badgeProgress, badgeAwards] =
      await Promise.all([
        ctx.db
          .query('visits')
          .withIndex('by_user', (queryBuilder) =>
            queryBuilder.eq('clerkUserId', identity.subject),
          )
          .collect(),
        ctx.db
          .query('badgeProgress')
          .withIndex('by_user', (queryBuilder) =>
            queryBuilder.eq('clerkUserId', identity.subject),
          )
          .collect(),
        ctx.db
          .query('badgeAwards')
          .withIndex('by_user', (queryBuilder) =>
            queryBuilder.eq('clerkUserId', identity.subject),
          )
          .collect(),
      ]);

    await Promise.all([
      ...visits.map((visit) => ctx.db.delete(visit._id)),
      ...badgeProgress.map((progress) =>
        ctx.db.delete(progress._id),
      ),
      ...badgeAwards.map((award) =>
        ctx.db.delete(award._id),
      ),
    ]);

    return {
      deletedVisits: visits.length,
      deletedProgressRecords: badgeProgress.length,
      deletedAwards: badgeAwards.length,
    };
  },
});

export const awardMyTestBadgeLevel = mutation({
  args: {},

  handler: async (ctx) => {
    const identity = await requireAdmin(ctx);
    const definitions = await ctx.db
      .query('badgeDefinitions')
      .collect();
    const definition = definitions
      .filter(
        (candidate) =>
          candidate.retired !== true &&
          (candidate.levelsEnabled === true ||
            candidate.classification === 'general' ||
            candidate.classification === 'theme'),
      )
      .sort((first, second) =>
        first.name.localeCompare(second.name),
      )[0];

    if (definition === undefined) {
      throw new ConvexError(
        'Create an active General or Theme badge before testing celebrations.',
      );
    }

    const existingAwards = await ctx.db
      .query('badgeAwards')
      .withIndex('by_user_and_badge', (queryBuilder) =>
        queryBuilder
          .eq('clerkUserId', identity.subject)
          .eq('badgeDefinitionId', definition._id),
      )
      .collect();
    const highestLevel = existingAwards.reduce(
      (highest, award) =>
        Math.max(highest, award.level ?? 1),
      0,
    );
    const level = highestLevel + 1;

    await ctx.db.insert('badgeAwards', {
      clerkUserId: identity.subject,
      badgeDefinitionId: definition._id,
      level,
      earnedAt: Date.now(),
    });

    return {
      badgeName: definition.name,
      level,
    };
  },
});
export const getVisitForLocation = query({
  args: {
    locationId: v.id('locations'),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return null;
    }

    return await ctx.db
      .query('visits')
      .withIndex('by_user_and_location', (queryBuilder) =>
        queryBuilder
          .eq('clerkUserId', identity.subject)
          .eq('locationId', args.locationId),
      )
      .unique();
  },
});
