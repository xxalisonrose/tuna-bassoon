import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { isAdminSubject } from './lib/auth';

export const getCurrentUser = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return null;
    }

    return {
      clerkUserId: identity.subject,
      name: identity.name,
      email: identity.email,
      isAdmin: isAdminSubject(identity.subject),
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
