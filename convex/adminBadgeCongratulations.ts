import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import {
  DEFAULT_BADGE_CONGRATULATIONS,
} from './lib/badge_congratulations';
import { requireAdmin } from './lib/auth';

const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 160;

function getDefaultMessages() {
  return [...DEFAULT_BADGE_CONGRATULATIONS];
}

export const getMessagesForAdmin = query({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);

    const settings = await ctx.db
      .query('badgeCongratulations')
      .withIndex('by_key', (queryBuilder) =>
        queryBuilder.eq('key', 'shared'),
      )
      .unique();

    return settings === null
      ? getDefaultMessages()
      : settings.messages
          .filter((entry) => !entry.retired)
          .map((entry) => entry.message);
  },
});

export const saveMessages = mutation({
  args: {
    messages: v.array(v.string()),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Authentication required.');
    }

    if (args.messages.length === 0) {
      throw new ConvexError(
        'Add at least one congratulations message.',
      );
    }

    if (args.messages.length > MAX_MESSAGES) {
      throw new ConvexError(
        `The congratulations bank can contain no more than ${MAX_MESSAGES} messages.`,
      );
    }

    const seenMessages = new Set<string>();
    const messages = args.messages.map((value) => {
      const message = value.trim();

      if (message.length === 0) {
        throw new ConvexError(
          'Congratulations messages cannot be blank.',
        );
      }

      if (message.length > MAX_MESSAGE_LENGTH) {
        throw new ConvexError(
          `Congratulations messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
        );
      }

      const duplicateKey = message.toLowerCase();

      if (seenMessages.has(duplicateKey)) {
        throw new ConvexError(
          `The message "${message}" appears more than once.`,
        );
      }

      seenMessages.add(duplicateKey);

      return {
        message,
        retired: false,
      };
    });

    const existing = await ctx.db
      .query('badgeCongratulations')
      .withIndex('by_key', (queryBuilder) =>
        queryBuilder.eq('key', 'shared'),
      )
      .unique();
    const settings = {
      key: 'shared' as const,
      messages,
      updatedAt: Date.now(),
      updatedByClerkUserId: identity.subject,
    };

    if (existing === null) {
      await ctx.db.insert('badgeCongratulations', settings);
    } else {
      await ctx.db.patch(existing._id, settings);
    }

    return messages;
  },
});
