import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';

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