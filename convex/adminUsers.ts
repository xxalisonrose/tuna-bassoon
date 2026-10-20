import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { isAdminSubject, requireAdmin } from './lib/auth';
import { getCommunityContributorStatus } from './lib/communityContributor';

const manualRoleValidator = v.union(
  v.literal('none'),
  v.literal('community_contributor'),
  v.literal('regional_moderator'),
);

export const searchUsers = query({
  args: {
    search: v.string(),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const normalizedSearch = args.search.trim().toLowerCase();
    const profiles = await ctx.db.query('userProfiles').collect();
    const matches = profiles
      .filter((profile) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          profile.usernameNormalized,
          profile.emailNormalized,
          profile.displayName?.toLowerCase(),
        ].some((value) => value?.includes(normalizedSearch));
      })
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, 50);

    return Promise.all(
      matches.map(async (profile) => {
        const status = await getCommunityContributorStatus(
          ctx,
          profile.clerkUserId,
        );

        return {
          clerkUserId: profile.clerkUserId,
          username: profile.username ?? null,
          displayName: profile.displayName ?? null,
          email: profile.email ?? null,
          manualContentRole: profile.manualContentRole ?? null,
          manualRoleGrantedAt:
            profile.manualRoleGrantedAt ?? null,
          manualRoleReason: profile.manualRoleReason ?? null,
          contentRole: status.contentRole,
          accessSource: status.accessSource,
          isAdmin: status.isAdmin,
          isBlocked: status.isBlocked,
          requirements: status.requirements,
          updatedAt: profile.updatedAt,
        };
      }),
    );
  },
});

export const getRecentRoleChanges = query({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);

    const entries = await ctx.db
      .query('userRoleAuditLog')
      .withIndex('by_changed_at')
      .order('desc')
      .take(30);

    return Promise.all(
      entries.map(async (entry) => {
        const [targetProfile, adminProfile] = await Promise.all([
          ctx.db
            .query('userProfiles')
            .withIndex('by_user', (queryBuilder) =>
              queryBuilder.eq(
                'clerkUserId',
                entry.targetClerkUserId,
              ),
            )
            .unique(),
          ctx.db
            .query('userProfiles')
            .withIndex('by_user', (queryBuilder) =>
              queryBuilder.eq(
                'clerkUserId',
                entry.changedByClerkUserId,
              ),
            )
            .unique(),
        ]);

        return {
          ...entry,
          targetUsername: targetProfile?.username ?? null,
          targetEmail: targetProfile?.email ?? null,
          changedByUsername: adminProfile?.username ?? null,
        };
      }),
    );
  },
});

export const setManualContentRole = mutation({
  args: {
    targetClerkUserId: v.string(),
    role: manualRoleValidator,
    reason: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const adminIdentity = await requireAdmin(ctx);
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', args.targetClerkUserId),
      )
      .unique();

    if (profile === null) {
      throw new ConvexError(
        'User profile not found. Ask the user to open the app once, then search again.',
      );
    }

    if (isAdminSubject(profile.clerkUserId)) {
      throw new ConvexError(
        'Administrator access is configured separately and cannot be changed here.',
      );
    }

    const reason = args.reason?.trim();

    if (reason && reason.length > 240) {
      throw new ConvexError('Role-change notes must be 240 characters or fewer.');
    }

    const nextManualRole =
      args.role === 'none' ? undefined : args.role;
    const previousManualRole = profile.manualContentRole;

    if (previousManualRole === nextManualRole) {
      return { changed: false };
    }

    const now = Date.now();

    await ctx.db.patch(profile._id, {
      manualContentRole: nextManualRole,
      manualRoleGrantedAt:
        nextManualRole === undefined ? undefined : now,
      manualRoleGrantedByClerkUserId:
        nextManualRole === undefined
          ? undefined
          : adminIdentity.subject,
      manualRoleReason:
        nextManualRole === undefined ? undefined : reason,
      updatedAt: now,
    });

    await ctx.db.insert('userRoleAuditLog', {
      targetClerkUserId: profile.clerkUserId,
      changedByClerkUserId: adminIdentity.subject,
      previousManualRole,
      nextManualRole,
      reason,
      changedAt: now,
    });

    return { changed: true };
  },
});
