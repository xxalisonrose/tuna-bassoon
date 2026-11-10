import { ConvexError, v } from 'convex/values';

import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { isAdminSubject } from './lib/auth';
import {
  AVATAR_ITEM_LORCOIN_PRICE,
  BADGE_LORCOIN_REWARD,
  CHECK_IN_LORCOIN_REWARD,
  getStoredAvatarItemIds,
  isPurchasableAvatarItemId,
} from './lib/avatarEconomy';

const BETA_PROMO_CODE = 'TRAILBETA500';

async function getWalletSnapshot(
  ctx: QueryCtx | MutationCtx,
  clerkUserId: string,
) {
  const [visits, badgeAwards, purchases, grants] = await Promise.all([
    ctx.db
      .query('visits')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', clerkUserId),
      )
      .collect(),
    ctx.db
      .query('badgeAwards')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', clerkUserId),
      )
      .collect(),
    ctx.db
      .query('avatarItemPurchases')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', clerkUserId),
      )
      .collect(),
    ctx.db
      .query('lorcoinGrants')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', clerkUserId),
      )
      .collect(),
  ]);

  const checkInEarnings = visits.length * CHECK_IN_LORCOIN_REWARD;
  const badgeEarnings = badgeAwards.length * BADGE_LORCOIN_REWARD;
  const adminBonus = isAdminSubject(clerkUserId) ? 10_000 : 0;
  const promoEarnings = grants.reduce(
    (total, grant) => total + grant.amount,
    0,
  );
  const lifetimeEarned =
    checkInEarnings + badgeEarnings + adminBonus + promoEarnings;

  const spent = purchases.reduce(
    (total, purchase) => total + purchase.price,
    0,
  );

  return {
    balance: Math.max(0, lifetimeEarned - spent),
    lifetimeEarned,
    adminBonus,
    spent,
    visitCount: visits.length,
    badgeAwardCount: badgeAwards.length,
    purchases,
  };
}

export const getMyWallet = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return null;
    }

    const snapshot = await getWalletSnapshot(ctx, identity.subject);

    return {
      balance: snapshot.balance,
      lifetimeEarned: snapshot.lifetimeEarned,
      adminBonus: snapshot.adminBonus,
      spent: snapshot.spent,
      visitCount: snapshot.visitCount,
      badgeAwardCount: snapshot.badgeAwardCount,
      checkInReward: CHECK_IN_LORCOIN_REWARD,
      badgeReward: BADGE_LORCOIN_REWARD,
      clothingPrice: AVATAR_ITEM_LORCOIN_PRICE,
    };
  },
});

export const redeemPromoCode = mutation({
  args: {
    code: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Sign in before redeeming a promo code.');
    }

    if (args.code.trim().toUpperCase() !== BETA_PROMO_CODE) {
      throw new ConvexError('That promo code is not valid.');
    }

    await ctx.db.insert('lorcoinGrants', {
      clerkUserId: identity.subject,
      amount: 500,
      code: BETA_PROMO_CODE,
      redeemedAt: Date.now(),
    });

    const snapshot = await getWalletSnapshot(ctx, identity.subject);

    return {
      amount: 500,
      balance: snapshot.balance,
    };
  },
});

export const purchaseAvatarItem = mutation({
  args: {
    itemId: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Sign in before buying wardrobe items.');
    }

    if (!isPurchasableAvatarItemId(args.itemId)) {
      throw new ConvexError('This wardrobe item is not for sale.');
    }

    const existingPurchase = await ctx.db
      .query('avatarItemPurchases')
      .withIndex('by_user_and_item', (queryBuilder) =>
        queryBuilder
          .eq('clerkUserId', identity.subject)
          .eq('itemId', args.itemId),
      )
      .unique();

    if (existingPurchase !== null) {
      const snapshot = await getWalletSnapshot(ctx, identity.subject);

      return {
        status: 'already_owned' as const,
        balance: snapshot.balance,
      };
    }

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .unique();

    if (
      profile !== null &&
      getStoredAvatarItemIds(profile).includes(args.itemId)
    ) {
      await ctx.db.insert('avatarItemPurchases', {
        clerkUserId: identity.subject,
        itemId: args.itemId,
        price: 0,
        acquisition: 'legacy',
        purchasedAt: Date.now(),
      });

      const snapshot = await getWalletSnapshot(ctx, identity.subject);

      return {
        status: 'already_owned' as const,
        balance: snapshot.balance,
      };
    }

    const snapshot = await getWalletSnapshot(ctx, identity.subject);

    if (snapshot.balance < AVATAR_ITEM_LORCOIN_PRICE) {
      const needed = AVATAR_ITEM_LORCOIN_PRICE - snapshot.balance;

      return {
        status: 'insufficient_funds' as const,
        balance: snapshot.balance,
        needed,
      };
    }

    await ctx.db.insert('avatarItemPurchases', {
      clerkUserId: identity.subject,
      itemId: args.itemId,
      price: AVATAR_ITEM_LORCOIN_PRICE,
      acquisition: 'purchase',
      purchasedAt: Date.now(),
    });

    return {
      status: 'purchased' as const,
      balance: snapshot.balance - AVATAR_ITEM_LORCOIN_PRICE,
    };
  },
});
