import { v } from 'convex/values';

import {
  internalMutation,
  internalQuery,
  query,
} from './_generated/server';
import { resolveLocationMapPinType } from './lib/locationMapPin';

export const addLocation = internalMutation({
  args: {
    title: v.string(),
    description: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    category: v.string(),
    city: v.string(),
    state: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert('locations', {
      name: args.title,
      description: args.description,
      isLore: false,
      latitude: args.latitude,
      longitude: args.longitude,
      category: args.category,
      city: args.city.trim() || undefined,
      state: args.state.trim() || undefined,
      mapPinType: 'other_discoveries',
      badges: [],
      retired: false,
    });
  },
});

export const getLocations = query({
  args: {
    includeBeta: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const locations = await ctx.db.query('locations').collect();

    return locations
      .filter(
        (location) =>
          location.retired !== true &&
          (location.ownerClerkUserId === undefined ||
            (args.includeBeta === true &&
              identity !== null &&
              location.ownerClerkUserId === identity.subject)),
      )
      .map((location) => ({
        ...location,
        mapPinType: resolveLocationMapPinType({
          mapPinType: location.mapPinType,
          badges: location.badges,
          category: location.category,
          isLore: location.isLore,
        }),
      }));
  },
});

export const getLocation = internalQuery({
  args: {
    locationId: v.id('locations'),
  },

  handler: async (ctx, args) => {
    return await ctx.db.get(args.locationId);
  },
});

export const saveDescription = internalMutation({
  args: {
    locationId: v.id('locations'),
    description: v.string(),
  },

  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.locationId);

    if (location === null) {
      throw new Error('Location not found.');
    }

    await ctx.db.patch(args.locationId, {
      description: args.description,
    });
  },
});
