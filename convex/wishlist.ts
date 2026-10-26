import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';

export const getMyWishlist = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return [];
    }

    const entries = await ctx.db
      .query('locationWishlist')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .collect();

    return entries
      .map((entry) => ({
        locationId: entry.locationId,
        savedAt: entry.createdAt,
      }))
      .sort((first, second) => second.savedAt - first.savedAt);
  },
});

export const setWishlistStatus = mutation({
  args: {
    locationId: v.id('locations'),
    saved: v.boolean(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Sign in to save locations.');
    }

    const [location, existingEntry] = await Promise.all([
      ctx.db.get(args.locationId),
      ctx.db
        .query('locationWishlist')
        .withIndex('by_user_and_location', (queryBuilder) =>
          queryBuilder
            .eq('clerkUserId', identity.subject)
            .eq('locationId', args.locationId),
        )
        .unique(),
    ]);

    if (
      location === null ||
      location.retired === true ||
      (location.ownerClerkUserId !== undefined &&
        location.ownerClerkUserId !== identity.subject)
    ) {
      throw new ConvexError('This location is not available to save.');
    }

    if (args.saved) {
      if (existingEntry === null) {
        await ctx.db.insert('locationWishlist', {
          clerkUserId: identity.subject,
          locationId: args.locationId,
          createdAt: Date.now(),
        });
      }

      return { saved: true };
    }

    if (existingEntry !== null) {
      await ctx.db.delete(existingEntry._id);
    }

    return { saved: false };
  },
});
