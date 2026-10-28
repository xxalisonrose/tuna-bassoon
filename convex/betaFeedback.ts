import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireAdmin, requireAuthenticatedIdentity } from './lib/auth';

const MINIMUM_MESSAGE_LENGTH = 5;
const MAXIMUM_MESSAGE_LENGTH = 2_000;
const MAXIMUM_SUBMISSIONS_PER_HOUR = 10;
const ONE_HOUR_MS = 60 * 60 * 1_000;

export const submit = mutation({
  args: {
    message: v.string(),
    sourceRoute: v.literal('map'),
    sourcePlatform: v.string(),
    buildProfile: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedIdentity(ctx);
    const message = args.message.trim();

    if (message.length < MINIMUM_MESSAGE_LENGTH) {
      throw new ConvexError(
        `Feedback must be at least ${MINIMUM_MESSAGE_LENGTH} characters.`,
      );
    }

    if (message.length > MAXIMUM_MESSAGE_LENGTH) {
      throw new ConvexError(
        `Feedback must be ${MAXIMUM_MESSAGE_LENGTH.toLocaleString()} characters or fewer.`,
      );
    }

    const recentSubmissions = await ctx.db
      .query('betaFeedback')
      .withIndex('by_user_and_submitted_at', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .order('desc')
      .take(MAXIMUM_SUBMISSIONS_PER_HOUR);
    const oneHourAgo = Date.now() - ONE_HOUR_MS;

    if (
      recentSubmissions.length >= MAXIMUM_SUBMISSIONS_PER_HOUR &&
      recentSubmissions.every(
        (submission) => submission.submittedAt >= oneHourAgo,
      )
    ) {
      throw new ConvexError(
        'You have sent several notes recently. Please wait a little before submitting another one.',
      );
    }

    const submittedAt = Date.now();
    const feedbackId = await ctx.db.insert('betaFeedback', {
      clerkUserId: identity.subject,
      message,
      sourceRoute: args.sourceRoute,
      sourcePlatform: args.sourcePlatform.trim().slice(0, 40) || 'unknown',
      buildProfile: args.buildProfile.trim().slice(0, 40) || 'unknown',
      status: 'new',
      submittedAt,
    });

    return { feedbackId, submittedAt };
  },
});

export const getActivityForAdmin = query({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);

    const newFeedback = await ctx.db
      .query('betaFeedback')
      .withIndex('by_status_and_submitted_at', (queryBuilder) =>
        queryBuilder.eq('status', 'new'),
      )
      .collect();

    return { newCount: newFeedback.length };
  },
});

export const listForAdmin = query({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);

    const feedback = await ctx.db
      .query('betaFeedback')
      .withIndex('by_submitted_at')
      .order('desc')
      .take(200);
    const profileEntries = await Promise.all(
      [...new Set(feedback.map((entry) => entry.clerkUserId))].map(
        async (clerkUserId) => {
          const profile = await ctx.db
            .query('userProfiles')
            .withIndex('by_user', (queryBuilder) =>
              queryBuilder.eq('clerkUserId', clerkUserId),
            )
            .unique();

          return [clerkUserId, profile] as const;
        },
      ),
    );
    const profilesByUserId = new Map(profileEntries);

    return feedback.map((entry) => {
      const profile = profilesByUserId.get(entry.clerkUserId);

      return {
        ...entry,
        testerName: profile?.username ?? profile?.displayName ?? null,
        testerEmail: profile?.email ?? null,
      };
    });
  },
});

export const setReviewed = mutation({
  args: {
    feedbackId: v.id('betaFeedback'),
    reviewed: v.boolean(),
  },

  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const feedback = await ctx.db.get(args.feedbackId);

    if (feedback === null) {
      throw new ConvexError('That feedback entry no longer exists.');
    }

    await ctx.db.patch(args.feedbackId, {
      status: args.reviewed ? 'reviewed' : 'new',
      reviewedAt: args.reviewed ? Date.now() : undefined,
      reviewedByClerkUserId: args.reviewed ? identity.subject : undefined,
    });
  },
});
