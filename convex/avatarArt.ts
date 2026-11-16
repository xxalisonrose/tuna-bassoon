import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireAdmin } from './lib/auth';

const fitValidator = {
  height: v.number(),
  left: v.number(),
  rotation: v.number(),
  top: v.number(),
  width: v.number(),
};

function validateFit(fit: {
  height: number;
  left: number;
  rotation: number;
  top: number;
  width: number;
}) {
  const values = Object.values(fit);

  if (values.some((value) => !Number.isFinite(value))) {
    throw new ConvexError('Every fit value must be a finite number.');
  }
  if (fit.width < 4 || fit.width > 150 || fit.height < 4 || fit.height > 150) {
    throw new ConvexError('Width and height must remain between 4% and 150%.');
  }
  if (fit.left < -100 || fit.left > 150 || fit.top < -100 || fit.top > 150) {
    throw new ConvexError('The item position is outside the supported canvas.');
  }
  if (fit.rotation < -180 || fit.rotation > 180) {
    throw new ConvexError('Rotation must remain between -180° and 180°.');
  }
}

export const getAvatarItemFits = query({
  args: {},
  handler: async (ctx) => {
    const fits = await ctx.db.query('avatarItemFits').collect();

    return Object.fromEntries(
      fits.map((fit) => [
        fit.itemId,
        {
          height: fit.height,
          left: fit.left,
          rotation: fit.rotation,
          top: fit.top,
          width: fit.width,
        },
      ]),
    );
  },
});

export const saveAvatarItemFit = mutation({
  args: {
    itemId: v.string(),
    ...fitValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const itemId = args.itemId.trim();

    if (!itemId) {
      throw new ConvexError('Choose a clothing item before saving.');
    }

    const fit = {
      height: args.height,
      left: args.left,
      rotation: args.rotation,
      top: args.top,
      width: args.width,
    };
    validateFit(fit);

    const existing = await ctx.db
      .query('avatarItemFits')
      .withIndex('by_item', (queryBuilder) =>
        queryBuilder.eq('itemId', itemId),
      )
      .unique();
    const values = {
      itemId,
      ...fit,
      updatedAt: Date.now(),
      updatedByClerkUserId: identity.subject,
    };

    if (existing === null) {
      await ctx.db.insert('avatarItemFits', values);
    } else {
      await ctx.db.patch(existing._id, values);
    }

    return { itemId, fit };
  },
});

export const resetAvatarItemFit = mutation({
  args: { itemId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query('avatarItemFits')
      .withIndex('by_item', (queryBuilder) =>
        queryBuilder.eq('itemId', args.itemId),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.delete(existing._id);
    }

    return { itemId: args.itemId, reset: true };
  },
});
