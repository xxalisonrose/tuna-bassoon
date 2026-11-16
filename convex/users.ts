import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { isAdminSubject } from './lib/auth';
import { isPurchasableAvatarItemId } from './lib/avatarEconomy';
import { getCommunityContributorStatus } from './lib/communityContributor';
import {
  USERNAME_CHANGE_COOLDOWN_DAYS,
  validateUsername,
} from './lib/username';

const USERNAME_CHANGE_COOLDOWN_MS =
  USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1_000;

export const getCurrentUser = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return null;
    }

    const communityStatus = await getCommunityContributorStatus(
      ctx,
      identity.subject,
    );
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .unique();
    const usernameChangeAvailableAt =
      profile?.username &&
      profile.usernameChangedAt !== undefined &&
      !communityStatus.isAdmin
        ? profile.usernameChangedAt + USERNAME_CHANGE_COOLDOWN_MS
        : null;

    return {
      clerkUserId: identity.subject,
      name: identity.name ?? profile?.displayName,
      email: identity.email ?? profile?.email,
      username: profile?.username ?? null,
      profileReady: profile !== null,
      canChangeUsername:
        !profile?.username ||
        usernameChangeAvailableAt === null ||
        usernameChangeAvailableAt <= Date.now(),
      usernameChangeAvailableAt,
      isAdmin: communityStatus.isAdmin,
      isCommunityContributor: communityStatus.isCommunityContributor,
      isRegionalModerator: communityStatus.isRegionalModerator,
      canSubmitContent: communityStatus.canSubmitContent,
      contentRole: communityStatus.contentRole,
      communityContributor: {
        accessSource: communityStatus.accessSource,
        isBlocked: communityStatus.isBlocked,
        requirements: communityStatus.requirements,
      },
      shouldShowCommunitySubmissionIntro:
        communityStatus.shouldShowCommunitySubmissionIntro,
    };
  },
});

const avatarPresetValidator = v.union(
  v.literal('standard'),
  v.literal('pretty_pretty_princess'),
  v.literal('custom'),
);
const avatarTopValidator = v.union(
  v.literal('white_tee'),
  v.literal('brown_tee'),
  v.literal('color_splash_tee'),
  v.literal('purple_tee'),
  v.literal('crimson_tee'),
  v.literal('pink_tee'),
  v.literal('black_tee'),
  v.literal('fire_tee'),
  v.literal('noah_kahan_tee'),
  v.literal('beta_tester_tee'),
  v.literal('pink_gown_top'),
);
const avatarBottomValidator = v.union(
  v.literal('classic_pants'),
  v.literal('blue_pants'),
  v.literal('grey_pants'),
  v.literal('brown_pants'),
  v.literal('purple_pants'),
  v.literal('pink_gown_bottom'),
);
const avatarShoesValidator = v.union(
  v.literal('bare_hooves'),
  v.literal('scout_boots'),
  v.literal('pink_heels'),
);
const avatarNeckValidator = v.literal('none');
const avatarFaceValidator = v.union(
  v.literal('none'),
  v.literal('goggles'),
  v.literal('glasses'),
);
const avatarHeadwearValidator = v.union(
  v.literal('none'),
  v.literal('beanie'),
  v.literal('beanie_blue'),
  v.literal('beanie_green'),
  v.literal('beanie_pink'),
  v.literal('beanie_purple'),
  v.literal('beanie_red'),
  v.literal('cowboy_hat'),
  v.literal('cowboy_hat_brown'),
  v.literal('cowboy_hat_red'),
  v.literal('princess_crown'),
);
const avatarHandheldValidator = v.union(
  v.literal('none'),
  v.literal('heart_wand'),
);
const avatarSelectionValidator = v.object({
  topId: avatarTopValidator,
  bottomId: avatarBottomValidator,
  shoesId: avatarShoesValidator,
  neckId: avatarNeckValidator,
  faceId: avatarFaceValidator,
  headwearId: v.optional(avatarHeadwearValidator),
  handheldId: v.optional(avatarHandheldValidator),
});

type AvatarSelection = {
  topId:
    | 'white_tee'
    | 'brown_tee'
    | 'color_splash_tee'
    | 'purple_tee'
    | 'crimson_tee'
    | 'pink_tee'
    | 'black_tee'
    | 'fire_tee'
    | 'noah_kahan_tee'
    | 'beta_tester_tee'
    | 'pink_gown_top';
  bottomId:
    | 'classic_pants'
    | 'blue_pants'
    | 'grey_pants'
    | 'brown_pants'
    | 'purple_pants'
    | 'pink_gown_bottom';
  shoesId: 'bare_hooves' | 'scout_boots' | 'pink_heels';
  neckId: 'none';
  faceId: 'none' | 'goggles' | 'glasses';
  headwearId:
    | 'none'
    | 'beanie'
    | 'beanie_blue'
    | 'beanie_green'
    | 'beanie_pink'
    | 'beanie_purple'
    | 'beanie_red'
    | 'cowboy_hat'
    | 'cowboy_hat_brown'
    | 'cowboy_hat_red'
    | 'princess_crown';
  handheldId: 'none' | 'heart_wand';
};

const currentAvatarCatalogVersion = 2;
const standardSelection: AvatarSelection = {
  topId: 'white_tee',
  bottomId: 'blue_pants',
  shoesId: 'scout_boots',
  neckId: 'none',
  faceId: 'none',
  headwearId: 'none',
  handheldId: 'none',
};

const prettyPrettyPrincessSelection: AvatarSelection = {
  topId: 'pink_gown_top',
  bottomId: 'pink_gown_bottom',
  shoesId: 'pink_heels',
  neckId: 'none',
  faceId: 'none',
  headwearId: 'princess_crown',
  handheldId: 'heart_wand',
};

function getIdentityProfileFields(identity: { name?: string; email?: string }) {
  const displayName = identity.name?.trim() || undefined;
  const email = identity.email?.trim() || undefined;

  return {
    ...(displayName ? { displayName } : {}),
    ...(email
      ? {
          email,
          emailNormalized: email.toLowerCase(),
        }
      : {}),
  };
}

export const syncMyUserProfile = mutation({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Authentication required.');
    }

    const existingProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .unique();
    const now = Date.now();
    const identityFields = getIdentityProfileFields(identity);

    if (existingProfile === null) {
      await ctx.db.insert('userProfiles', {
        clerkUserId: identity.subject,
        avatarPresetId: 'standard',
        avatarTopId: standardSelection.topId,
        avatarBottomId: standardSelection.bottomId,
        avatarShoesId: standardSelection.shoesId,
        avatarNeckId: standardSelection.neckId,
        avatarFaceId: standardSelection.faceId,
        avatarHeadwearId: standardSelection.headwearId,
        avatarHandheldId: standardSelection.handheldId,
        avatarCatalogVersion: currentAvatarCatalogVersion,
        ...identityFields,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existingProfile._id, {
        ...(existingProfile.avatarCatalogVersion === currentAvatarCatalogVersion
          ? {}
          : {
              avatarPresetId: 'standard',
              avatarTopId: standardSelection.topId,
              avatarBottomId: standardSelection.bottomId,
              avatarShoesId: standardSelection.shoesId,
              avatarNeckId: standardSelection.neckId,
              avatarFaceId: standardSelection.faceId,
              avatarHeadwearId: standardSelection.headwearId,
              avatarHandheldId: standardSelection.handheldId,
              avatarCatalogVersion: currentAvatarCatalogVersion,
            }),
        ...identityFields,
        updatedAt: now,
      });
    }

    return { profileReady: true };
  },
});

export const setMyUsername = mutation({
  args: {
    username: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Authentication required.');
    }

    const validated = validateUsername(args.username);
    const [existingProfile, usernameOwner] = await Promise.all([
      ctx.db
        .query('userProfiles')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .unique(),
      ctx.db
        .query('userProfiles')
        .withIndex('by_username_normalized', (queryBuilder) =>
          queryBuilder.eq('usernameNormalized', validated.normalized),
        )
        .unique(),
    ]);

    if (
      usernameOwner !== null &&
      usernameOwner.clerkUserId !== identity.subject
    ) {
      throw new ConvexError('That username is already taken.');
    }

    const now = Date.now();
    const normalizedChanged =
      existingProfile?.usernameNormalized !== undefined &&
      existingProfile.usernameNormalized !== validated.normalized;
    const changeAvailableAt =
      (existingProfile?.usernameChangedAt ?? 0) + USERNAME_CHANGE_COOLDOWN_MS;

    if (
      normalizedChanged &&
      !isAdminSubject(identity.subject) &&
      changeAvailableAt > now
    ) {
      throw new ConvexError(
        `Username can be changed again on ${new Date(changeAvailableAt).toLocaleDateString()}.`,
      );
    }

    const identityFields = getIdentityProfileFields(identity);
    const usernameFields = {
      username: validated.username,
      usernameNormalized: validated.normalized,
      usernameChangedAt: now,
      ...identityFields,
      updatedAt: now,
    };

    if (existingProfile === null) {
      await ctx.db.insert('userProfiles', {
        clerkUserId: identity.subject,
        avatarPresetId: 'standard',
        avatarTopId: standardSelection.topId,
        avatarBottomId: standardSelection.bottomId,
        avatarShoesId: standardSelection.shoesId,
        avatarNeckId: standardSelection.neckId,
        avatarFaceId: standardSelection.faceId,
        avatarHeadwearId: standardSelection.headwearId,
        avatarHandheldId: standardSelection.handheldId,
        avatarCatalogVersion: currentAvatarCatalogVersion,
        ...usernameFields,
        createdAt: now,
      });
    } else {
      await ctx.db.patch(existingProfile._id, usernameFields);
    }

    return {
      username: validated.username,
      usernameChangedAt: now,
    };
  },
});

export const acknowledgeCommunitySubmissionIntro = mutation({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Authentication required.');
    }

    const communityStatus = await getCommunityContributorStatus(
      ctx,
      identity.subject,
    );

    if (!communityStatus.canSubmitContent) {
      throw new ConvexError('Community Contributor access required.');
    }

    const existingProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .unique();
    const now = Date.now();

    if (existingProfile === null) {
      await ctx.db.insert('userProfiles', {
        clerkUserId: identity.subject,
        avatarPresetId: 'standard',
        avatarTopId: standardSelection.topId,
        avatarBottomId: standardSelection.bottomId,
        avatarShoesId: standardSelection.shoesId,
        avatarNeckId: standardSelection.neckId,
        avatarFaceId: standardSelection.faceId,
        avatarHeadwearId: standardSelection.headwearId,
        avatarHandheldId: standardSelection.handheldId,
        avatarCatalogVersion: currentAvatarCatalogVersion,
        communitySubmissionIntroSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existingProfile._id, {
        communitySubmissionIntroSeenAt: now,
        updatedAt: now,
      });
    }

    return { acknowledgedAt: now };
  },
});

function selectionForPreset(presetId: string | undefined) {
  return presetId === 'pretty_pretty_princess'
    ? prettyPrettyPrincessSelection
    : standardSelection;
}

function getStoredSelection(
  profile: {
    avatarPresetId: string;
    avatarTopId?: string;
    avatarBottomId?: string;
    avatarShoesId?: string;
    avatarNeckId?: string;
    avatarFaceId?: string;
    avatarHeadwearId?: string;
    avatarHandheldId?: string;
    avatarCatalogVersion?: number;
  } | null,
): AvatarSelection {
  if (
    profile === null ||
    profile.avatarCatalogVersion !== currentAvatarCatalogVersion
  ) {
    return { ...standardSelection };
  }

  const fallback = selectionForPreset(profile?.avatarPresetId);

  return {
    topId: (profile.avatarTopId as AvatarSelection['topId']) ?? fallback.topId,
    bottomId:
      (profile.avatarBottomId as AvatarSelection['bottomId']) ??
      fallback.bottomId,
    shoesId:
      (profile.avatarShoesId as AvatarSelection['shoesId']) ??
      fallback.shoesId,
    neckId: 'none',
    faceId:
      (profile.avatarFaceId as AvatarSelection['faceId']) ?? fallback.faceId,
    headwearId:
      (profile.avatarHeadwearId as AvatarSelection['headwearId']) ??
      fallback.headwearId,
    handheldId:
      (profile.avatarHandheldId as AvatarSelection['handheldId']) ??
      fallback.handheldId,
  };
}

function getMatchingPresetId(selection: AvatarSelection) {
  const matches = (candidate: AvatarSelection) =>
    Object.keys(candidate).every(
      (key) =>
        selection[key as keyof AvatarSelection] ===
        candidate[key as keyof AvatarSelection],
    );

  if (matches(standardSelection)) {
    return 'standard' as const;
  }

  if (matches(prettyPrettyPrincessSelection)) {
    return 'pretty_pretty_princess' as const;
  }

  return 'custom' as const;
}

export const getMyAvatarProfile = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Authentication required.');
    }

    const [profile, purchases] = await Promise.all([
      ctx.db
        .query('userProfiles')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .unique(),
      ctx.db
        .query('avatarItemPurchases')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .collect(),
    ]);
    const selection = getStoredSelection(profile);

    const unlockedAvatarItemIds = profile?.unlockedAvatarItemIds ?? [];
    const effectiveUnlockedAvatarItemIds = unlockedAvatarItemIds.includes(
      'color_splash_tee',
    )
      ? Array.from(new Set([...unlockedAvatarItemIds, 'beta_tester_tee']))
      : unlockedAvatarItemIds;

    return {
      avatarPresetId: getMatchingPresetId(selection),
      selection,
      unlockedAvatarItemIds: effectiveUnlockedAvatarItemIds,
      purchasedAvatarItemIds: purchases.map((purchase) => purchase.itemId),
      hasSavedAvatar: profile !== null,
    };
  },
});

export const saveMyAvatarProfile = mutation({
  args: {
    avatarPresetId: v.optional(avatarPresetValidator),
    selection: v.optional(avatarSelectionValidator),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Authentication required.');
    }

    const [existingProfile, purchases] = await Promise.all([
      ctx.db
        .query('userProfiles')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .unique(),
      ctx.db
        .query('avatarItemPurchases')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .collect(),
    ]);
    const selection: AvatarSelection = args.selection
      ? {
          ...args.selection,
          headwearId: args.selection.headwearId ?? 'none',
          handheldId: args.selection.handheldId ?? 'none',
        }
      : selectionForPreset(args.avatarPresetId);

    if (
      selection.topId === 'beta_tester_tee' &&
      !existingProfile?.unlockedAvatarItemIds?.some(
        (itemId) =>
          itemId === 'beta_tester_tee' || itemId === 'color_splash_tee',
      )
    ) {
      throw new ConvexError(
        'Complete the Welcome to Lorcal mission to unlock this shirt.',
      );
    }

    const purchasedItemIds = new Set(
      purchases.map((purchase) => purchase.itemId),
    );
    const now = Date.now();

    const unownedItemId = Object.values(selection).find(
      (itemId) =>
        isPurchasableAvatarItemId(itemId) &&
        !purchasedItemIds.has(itemId),
    );

    if (unownedItemId !== undefined) {
      throw new ConvexError(
        'Buy this wardrobe item with Lorcoins before equipping it.',
      );
    }

    const avatarPresetId = getMatchingPresetId(selection);
    const avatarFields = {
      avatarPresetId,
      avatarTopId: selection.topId,
      avatarBottomId: selection.bottomId,
      avatarShoesId: selection.shoesId,
      avatarNeckId: selection.neckId,
      avatarFaceId: selection.faceId,
      avatarHeadwearId: selection.headwearId,
      avatarHandheldId: selection.handheldId,
      avatarCatalogVersion: currentAvatarCatalogVersion,
      avatarCustomizedAt: now,
      updatedAt: now,
    };

    if (existingProfile === null) {
      await ctx.db.insert('userProfiles', {
        clerkUserId: identity.subject,
        ...avatarFields,
        createdAt: now,
      });
    } else {
      await ctx.db.patch(existingProfile._id, avatarFields);
    }

    return {
      avatarPresetId,
      selection,
    };
  },
});
