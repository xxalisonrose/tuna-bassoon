import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { isAdminSubject } from './lib/auth';
import {
  AVATAR_ITEM_LORCOIN_PRICE,
  BADGE_LORCOIN_REWARD,
  CHECK_IN_LORCOIN_REWARD,
  getStoredAvatarItemIds,
  isPurchasableAvatarItemId,
  type PurchasableAvatarItemId,
} from './lib/avatarEconomy';

const BETA_PROMO_CODE = 'TRAILBETA500';

function getPurchasedAvatarItemProfilePatch(
  itemId: PurchasableAvatarItemId,
) {
  switch (itemId) {
    case 'brown_tee':
    case 'purple_tee':
    case 'crimson_tee':
    case 'pink_tee':
    case 'black_tee':
    case 'fire_tee':
    case 'noah_kahan_tee':
    case 'pink_gown_top':
      return { avatarTopId: itemId };
    case 'classic_pants':
    case 'grey_pants':
    case 'brown_pants':
    case 'purple_pants':
    case 'pink_gown_bottom':
      return { avatarBottomId: itemId };
    case 'pink_heels':
      return { avatarShoesId: itemId };
    case 'glasses':
      return { avatarFaceId: itemId };
    case 'beanie':
    case 'beanie_blue':
    case 'beanie_green':
    case 'beanie_pink':
    case 'beanie_purple':
    case 'beanie_red':
    case 'cowboy_hat':
    case 'cowboy_hat_brown':
    case 'cowboy_hat_red':
    case 'princess_crown':
      return { avatarHeadwearId: itemId };
    case 'heart_wand':
      return { avatarHandheldId: itemId };
  }
}

async function equipPurchasedAvatarItem(
  ctx: MutationCtx,
  profileId: Id<'userProfiles'> | null,
  itemId: PurchasableAvatarItemId,
) {
  if (profileId === null) {
    return;
  }

  const now = Date.now();

  await ctx.db.patch(profileId, {
    avatarPresetId: 'custom',
    ...getPurchasedAvatarItemProfilePatch(itemId),
    avatarCatalogVersion: 2,
    avatarCustomizedAt: now,
    updatedAt: now,
  });
}

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

    const itemId = args.itemId;

    if (!isPurchasableAvatarItemId(itemId)) {
      throw new ConvexError('This wardrobe item is not for sale.');
    }

    const [existingPurchase, profile] = await Promise.all([
      ctx.db
        .query('avatarItemPurchases')
        .withIndex('by_user_and_item', (queryBuilder) =>
          queryBuilder
            .eq('clerkUserId', identity.subject)
            .eq('itemId', itemId),
        )
        .unique(),
      ctx.db
        .query('userProfiles')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .unique(),
    ]);

    if (existingPurchase !== null) {
      await equipPurchasedAvatarItem(
        ctx,
        profile?._id ?? null,
        itemId,
      );
      const snapshot = await getWalletSnapshot(ctx, identity.subject);

      return {
        status: 'already_owned' as const,
        balance: snapshot.balance,
      };
    }

    if (
      profile !== null &&
      getStoredAvatarItemIds(profile).includes(itemId)
    ) {
      await ctx.db.insert('avatarItemPurchases', {
        clerkUserId: identity.subject,
        itemId,
        price: 0,
        acquisition: 'legacy',
        purchasedAt: Date.now(),
      });

      await equipPurchasedAvatarItem(ctx, profile._id, itemId);

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

    const purchasedAt = Date.now();

    await ctx.db.insert('avatarItemPurchases', {
      clerkUserId: identity.subject,
      itemId,
      price: AVATAR_ITEM_LORCOIN_PRICE,
      acquisition: 'purchase',
      purchasedAt,
    });

    await equipPurchasedAvatarItem(ctx, profile?._id ?? null, itemId);

    return {
      status: 'purchased' as const,
      balance: snapshot.balance - AVATAR_ITEM_LORCOIN_PRICE,
    };
  },
});

export const purchaseAvatarItems = mutation({
  args: {
    itemIds: v.array(v.string()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Sign in before buying wardrobe items.');
    }

    const requestedItemIds = Array.from(new Set(args.itemIds));

    if (requestedItemIds.length === 0) {
      throw new ConvexError('Choose at least one wardrobe item to buy.');
    }

    if (requestedItemIds.length > 16) {
      throw new ConvexError('Too many wardrobe items were selected.');
    }

    if (!requestedItemIds.every(isPurchasableAvatarItemId)) {
      throw new ConvexError('One of these wardrobe items is not for sale.');
    }

    const [existingPurchases, profile] = await Promise.all([
      ctx.db
        .query('avatarItemPurchases')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .collect(),
      ctx.db
        .query('userProfiles')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .unique(),
    ]);

    const ownedItemIds = new Set(
      existingPurchases.map((purchase) => purchase.itemId),
    );
    const legacyOwnedItemIds = new Set(
      profile === null ? [] : getStoredAvatarItemIds(profile),
    );
    const purchasedAt = Date.now();

    for (const itemId of requestedItemIds) {
      if (!ownedItemIds.has(itemId) && legacyOwnedItemIds.has(itemId)) {
        await ctx.db.insert('avatarItemPurchases', {
          clerkUserId: identity.subject,
          itemId,
          price: 0,
          acquisition: 'legacy',
          purchasedAt,
        });
        ownedItemIds.add(itemId);
      }
    }

    const missingItemIds = requestedItemIds.filter(
      (itemId) => !ownedItemIds.has(itemId),
    );
    const totalPrice =
      missingItemIds.length * AVATAR_ITEM_LORCOIN_PRICE;
    const snapshot = await getWalletSnapshot(ctx, identity.subject);

    if (missingItemIds.length === 0) {
      return {
        status: 'already_owned' as const,
        balance: snapshot.balance,
        purchasedItemIds: [] as string[],
        totalPrice: 0,
      };
    }

    if (snapshot.balance < totalPrice) {
      return {
        status: 'insufficient_funds' as const,
        balance: snapshot.balance,
        needed: totalPrice - snapshot.balance,
        purchasedItemIds: [] as string[],
        totalPrice,
      };
    }

    for (const itemId of missingItemIds) {
      await ctx.db.insert('avatarItemPurchases', {
        clerkUserId: identity.subject,
        itemId,
        price: AVATAR_ITEM_LORCOIN_PRICE,
        acquisition: 'purchase',
        purchasedAt,
      });
    }

    return {
      status: 'purchased' as const,
      balance: snapshot.balance - totalPrice,
      purchasedItemIds: missingItemIds,
      totalPrice,
    };
  },
});
