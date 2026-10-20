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
      isCommunityContributor:
        communityStatus.isCommunityContributor,
      isRegionalModerator:
        communityStatus.isRegionalModerator,
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
  v.literal('custom'),
);
const avatarTopValidator = v.union(
  v.literal('trail_tank'),
  v.literal('explorer_field'),
);
const avatarBottomValidator = v.union(
  v.literal('trail_shorts'),
  v.literal('explorer_cargo'),
);
const avatarShoesValidator = v.union(
  v.literal('bare_hooves'),
  v.literal('explorer_boots'),
);
const avatarNeckValidator = v.union(
  v.literal('none'),
  v.literal('rust_neckerchief'),
);
const avatarFaceValidator = v.union(
  v.literal('none'),
  v.literal('explorer_goggles'),
);
const avatarSelectionValidator = v.object({
  topId: avatarTopValidator,
  bottomId: avatarBottomValidator,
  shoesId: avatarShoesValidator,
  neckId: avatarNeckValidator,
  faceId: avatarFaceValidator,
});

type AvatarSelection = {
  topId: 'trail_tank' | 'explorer_field';
  bottomId: 'trail_shorts' | 'explorer_cargo';
  shoesId: 'bare_hooves' | 'explorer_boots';
  neckId: 'none' | 'rust_neckerchief';
  faceId: 'none' | 'explorer_goggles';
};

const explorerSelection: AvatarSelection = {
  topId: 'explorer_field',
  bottomId: 'explorer_cargo',
  shoesId: 'explorer_boots',
  neckId: 'rust_neckerchief',
  faceId: 'explorer_goggles',
};
const trailBasicsSelection: AvatarSelection = {
  topId: 'trail_tank',
  bottomId: 'trail_shorts',
  shoesId: 'bare_hooves',
  neckId: 'none',
  faceId: 'none',
};

function getIdentityProfileFields(identity: {
  name?: string;
  email?: string;
}) {
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
      (existingProfile?.usernameChangedAt ?? 0) +
      USERNAME_CHANGE_COOLDOWN_MS;

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
  return presetId === 'trail_basics'
    ? trailBasicsSelection
    : explorerSelection;
}

function getStoredSelection(profile: {
  avatarPresetId: string;
  avatarTopId?: AvatarSelection['topId'];
  avatarBottomId?: AvatarSelection['bottomId'];
  avatarShoesId?: AvatarSelection['shoesId'];
  avatarNeckId?: AvatarSelection['neckId'];
  avatarFaceId?: AvatarSelection['faceId'];
} | null): AvatarSelection {
  const fallback = selectionForPreset(profile?.avatarPresetId);

  return {
    topId: profile?.avatarTopId ?? fallback.topId,
    bottomId: profile?.avatarBottomId ?? fallback.bottomId,
    shoesId: profile?.avatarShoesId ?? fallback.shoesId,
    neckId: profile?.avatarNeckId ?? fallback.neckId,
    faceId: profile?.avatarFaceId ?? fallback.faceId,
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
    const selection =
      args.selection ?? selectionForPreset(args.avatarPresetId);
    const avatarPresetId = getMatchingPresetId(selection);
    const now = Date.now();
    const avatarFields = {
      avatarPresetId,
      avatarTopId: selection.topId,
      avatarBottomId: selection.bottomId,
      avatarShoesId: selection.shoesId,
      avatarNeckId: selection.neckId,
      avatarFaceId: selection.faceId,
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
