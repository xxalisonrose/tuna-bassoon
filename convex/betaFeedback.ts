import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireAdmin, requireAuthenticatedIdentity } from './lib/auth';

const MINIMUM_MESSAGE_LENGTH = 5;
const MAXIMUM_MESSAGE_LENGTH = 2_000;
const MAXIMUM_SCREENSHOTS = 3;
const MAXIMUM_SCREENSHOT_BYTES = 8 * 1_024 * 1_024;
const MAXIMUM_SUBMISSIONS_PER_HOUR = 10;
const ONE_HOUR_MS = 60 * 60 * 1_000;

export const submit = mutation({
  args: {
    message: v.string(),
    imageStorageIds: v.optional(v.array(v.id('_storage'))),
    sourceRoute: v.literal('map'),
    sourcePlatform: v.string(),
    buildProfile: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedIdentity(ctx);
    const message = args.message.trim();
    const imageStorageIds = Array.from(new Set(args.imageStorageIds ?? []));

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

    if (imageStorageIds.length > MAXIMUM_SCREENSHOTS) {
      throw new ConvexError(
        `Attach no more than ${MAXIMUM_SCREENSHOTS} screenshots.`,
      );
    }

    const imageMetadata = await Promise.all(
      imageStorageIds.map((storageId) => ctx.storage.getMetadata(storageId)),
    );

    if (
      imageMetadata.some(
        (metadata) =>
          metadata === null ||
          metadata.size > MAXIMUM_SCREENSHOT_BYTES ||
          !metadata.contentType?.startsWith('image/'),
      )
    ) {
      throw new ConvexError(
        'Each attachment must be an image that is 8 MB or smaller.',
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
      imageStorageIds,
      sourceRoute: args.sourceRoute,
      sourcePlatform: args.sourcePlatform.trim().slice(0, 40) || 'unknown',
      buildProfile: args.buildProfile.trim().slice(0, 40) || 'unknown',
      status: 'new',
      submittedAt,
    });

    return { feedbackId, submittedAt };
  },
});

export const generateUploadUrl = mutation({
  args: {},

  handler: async (ctx) => {
    await requireAuthenticatedIdentity(ctx);
    return await ctx.storage.generateUploadUrl();
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

    return await Promise.all(
      feedback.map(async (entry) => {
        const profile = profilesByUserId.get(entry.clerkUserId);
        const imageUrls = (
          await Promise.all(
            (entry.imageStorageIds ?? []).map((storageId) =>
              ctx.storage.getUrl(storageId),
            ),
          )
        ).filter((url): url is string => url !== null);

        return {
          ...entry,
          imageUrls,
          testerName: profile?.username ?? profile?.displayName ?? null,
          testerEmail: profile?.email ?? null,
        };
      }),
    );
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
