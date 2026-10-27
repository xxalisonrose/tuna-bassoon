import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { isAdminSubject } from './lib/auth';
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
  v.literal('explorer'),
  v.literal('trail_basics'),
  v.literal('cozy_winter'),
  v.literal('classic_cowboy'),
  v.literal('rodeo_cowboy'),
  v.literal('pink_princess'),
  v.literal('custom'),
);
const avatarTopValidator = v.union(
  v.literal('trail_tank'),
  v.literal('explorer_field'),
  v.literal('new_explorer_tee'),
  v.literal('winter_polka_sweater'),
  v.literal('cowboy_sheriff_shirt'),
  v.literal('princess_puff_bodice'),
);
const avatarBottomValidator = v.union(
  v.literal('trail_shorts'),
  v.literal('explorer_cargo'),
  v.literal('winter_charcoal_pants'),
  v.literal('cowboy_western_pants'),
  v.literal('cowboy_western_shorts'),
  v.literal('princess_ballgown_skirt'),
);
const avatarShoesValidator = v.union(
  v.literal('bare_hooves'),
  v.literal('explorer_boots'),
  v.literal('winter_snow_boots'),
  v.literal('cowboy_brown_boots'),
  v.literal('cowboy_red_boots'),
);
const avatarNeckValidator = v.union(
  v.literal('none'),
  v.literal('rust_neckerchief'),
  v.literal('winter_cream_scarf'),
  v.literal('cowboy_red_bandana'),
);
const avatarFaceValidator = v.union(
  v.literal('none'),
  v.literal('explorer_goggles'),
);
const avatarHeadwearValidator = v.union(
  v.literal('none'),
  v.literal('winter_knit_beanie'),
  v.literal('cowboy_sheriff_hat'),
  v.literal('princess_crown'),
);
const avatarHandheldValidator = v.union(
  v.literal('none'),
  v.literal('princess_star_wand'),
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
    | 'trail_tank'
    | 'explorer_field'
    | 'new_explorer_tee'
    | 'winter_polka_sweater'
    | 'cowboy_sheriff_shirt'
    | 'princess_puff_bodice';
  bottomId:
    | 'trail_shorts'
    | 'explorer_cargo'
    | 'winter_charcoal_pants'
    | 'cowboy_western_pants'
    | 'cowboy_western_shorts'
    | 'princess_ballgown_skirt';
  shoesId:
    | 'bare_hooves'
    | 'explorer_boots'
    | 'winter_snow_boots'
    | 'cowboy_brown_boots'
    | 'cowboy_red_boots';
  neckId:
    'none' | 'rust_neckerchief' | 'winter_cream_scarf' | 'cowboy_red_bandana';
  faceId: 'none' | 'explorer_goggles';
  headwearId:
    'none' | 'winter_knit_beanie' | 'cowboy_sheriff_hat' | 'princess_crown';
  handheldId: 'none' | 'princess_star_wand';
};

const explorerSelection: AvatarSelection = {
  topId: 'explorer_field',
  bottomId: 'explorer_cargo',
  shoesId: 'explorer_boots',
  neckId: 'rust_neckerchief',
  faceId: 'explorer_goggles',
  headwearId: 'none',
  handheldId: 'none',
};
const trailBasicsSelection: AvatarSelection = {
  topId: 'trail_tank',
  bottomId: 'trail_shorts',
  shoesId: 'bare_hooves',
  neckId: 'none',
  faceId: 'none',
  headwearId: 'none',
  handheldId: 'none',
};
const cozyWinterSelection: AvatarSelection = {
  topId: 'winter_polka_sweater',
  bottomId: 'winter_charcoal_pants',
  shoesId: 'winter_snow_boots',
  neckId: 'winter_cream_scarf',
  faceId: 'none',
  headwearId: 'winter_knit_beanie',
  handheldId: 'none',
};
const classicCowboySelection: AvatarSelection = {
  topId: 'cowboy_sheriff_shirt',
  bottomId: 'cowboy_western_pants',
  shoesId: 'cowboy_brown_boots',
  neckId: 'cowboy_red_bandana',
  faceId: 'none',
  headwearId: 'cowboy_sheriff_hat',
  handheldId: 'none',
};
const rodeoCowboySelection: AvatarSelection = {
  topId: 'cowboy_sheriff_shirt',
  bottomId: 'cowboy_western_shorts',
  shoesId: 'cowboy_red_boots',
  neckId: 'cowboy_red_bandana',
  faceId: 'none',
  headwearId: 'cowboy_sheriff_hat',
  handheldId: 'none',
};
const pinkPrincessSelection: AvatarSelection = {
  topId: 'princess_puff_bodice',
  bottomId: 'princess_ballgown_skirt',
  shoesId: 'bare_hooves',
  neckId: 'none',
  faceId: 'none',
  headwearId: 'princess_crown',
  handheldId: 'princess_star_wand',
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
        avatarPresetId: 'explorer',
        avatarTopId: explorerSelection.topId,
        avatarBottomId: explorerSelection.bottomId,
        avatarShoesId: explorerSelection.shoesId,
        avatarNeckId: explorerSelection.neckId,
        avatarFaceId: explorerSelection.faceId,
        avatarHeadwearId: explorerSelection.headwearId,
        avatarHandheldId: explorerSelection.handheldId,
        ...identityFields,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existingProfile._id, {
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
        avatarPresetId: 'explorer',
        avatarTopId: explorerSelection.topId,
        avatarBottomId: explorerSelection.bottomId,
        avatarShoesId: explorerSelection.shoesId,
        avatarNeckId: explorerSelection.neckId,
        avatarFaceId: explorerSelection.faceId,
        avatarHeadwearId: explorerSelection.headwearId,
        avatarHandheldId: explorerSelection.handheldId,
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
        avatarPresetId: 'explorer',
        avatarTopId: explorerSelection.topId,
        avatarBottomId: explorerSelection.bottomId,
        avatarShoesId: explorerSelection.shoesId,
        avatarNeckId: explorerSelection.neckId,
        avatarFaceId: explorerSelection.faceId,
        avatarHeadwearId: explorerSelection.headwearId,
        avatarHandheldId: explorerSelection.handheldId,
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
  if (presetId === 'pink_princess') {
    return pinkPrincessSelection;
  }
  if (presetId === 'classic_cowboy') {
    return classicCowboySelection;
  }
  if (presetId === 'rodeo_cowboy') {
    return rodeoCowboySelection;
  }
  if (presetId === 'cozy_winter') {
    return cozyWinterSelection;
  }

  return presetId === 'trail_basics' ? trailBasicsSelection : explorerSelection;
}

function getStoredSelection(
  profile: {
    avatarPresetId: string;
    avatarTopId?: AvatarSelection['topId'];
    avatarBottomId?: AvatarSelection['bottomId'];
    avatarShoesId?: AvatarSelection['shoesId'];
    avatarNeckId?: AvatarSelection['neckId'];
    avatarFaceId?: AvatarSelection['faceId'];
    avatarHeadwearId?: AvatarSelection['headwearId'];
    avatarHandheldId?: AvatarSelection['handheldId'];
  } | null,
): AvatarSelection {
  const fallback = selectionForPreset(profile?.avatarPresetId);

  return {
    topId: profile?.avatarTopId ?? fallback.topId,
    bottomId: profile?.avatarBottomId ?? fallback.bottomId,
    shoesId: profile?.avatarShoesId ?? fallback.shoesId,
    neckId: profile?.avatarNeckId ?? fallback.neckId,
    faceId: profile?.avatarFaceId ?? fallback.faceId,
    headwearId: profile?.avatarHeadwearId ?? fallback.headwearId,
    handheldId: profile?.avatarHandheldId ?? fallback.handheldId,
  };
}

function getMatchingPresetId(selection: AvatarSelection) {
  const matches = (candidate: AvatarSelection) =>
    Object.keys(candidate).every(
      (key) =>
        selection[key as keyof AvatarSelection] ===
        candidate[key as keyof AvatarSelection],
    );

  if (matches(explorerSelection)) {
    return 'explorer' as const;
  }
  if (matches(trailBasicsSelection)) {
    return 'trail_basics' as const;
  }
  if (matches(cozyWinterSelection)) {
    return 'cozy_winter' as const;
  }
  if (matches(classicCowboySelection)) {
    return 'classic_cowboy' as const;
  }
  if (matches(rodeoCowboySelection)) {
    return 'rodeo_cowboy' as const;
  }
  if (matches(pinkPrincessSelection)) {
    return 'pink_princess' as const;
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

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .unique();
    const selection = getStoredSelection(profile);

    return {
      avatarPresetId: getMatchingPresetId(selection),
      selection,
      unlockedAvatarItemIds: profile?.unlockedAvatarItemIds ?? [],
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

    const existingProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .unique();
    const selection: AvatarSelection = args.selection
      ? {
          ...args.selection,
          headwearId: args.selection.headwearId ?? 'none',
          handheldId: args.selection.handheldId ?? 'none',
        }
      : selectionForPreset(args.avatarPresetId);

    if (
      selection.topId === 'new_explorer_tee' &&
      !existingProfile?.unlockedAvatarItemIds?.includes('new_explorer_tee')
    ) {
      throw new ConvexError(
        'Complete the Welcome to Lorcal mission to unlock this shirt.',
      );
    }

    const avatarPresetId = getMatchingPresetId(selection);
    const now = Date.now();
    const avatarFields = {
      avatarPresetId,
      avatarTopId: selection.topId,
      avatarBottomId: selection.bottomId,
      avatarShoesId: selection.shoesId,
      avatarNeckId: selection.neckId,
      avatarFaceId: selection.faceId,
      avatarHeadwearId: selection.headwearId,
      avatarHandheldId: selection.handheldId,
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
