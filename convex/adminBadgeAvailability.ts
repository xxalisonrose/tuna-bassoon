import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import {
  mutation,
  query,
  type MutationCtx,
} from './_generated/server';
import { requireAdmin } from './lib/auth';

const MAX_KEY_LENGTH = 120;

function normalizeKey(value: string) {
  const key = value.trim();

  if (key.length === 0) {
    throw new ConvexError('Window key is required.');
  }

  if (key.length > MAX_KEY_LENGTH) {
    throw new ConvexError(
      `Window key must be ${MAX_KEY_LENGTH} characters or fewer.`,
    );
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) {
    throw new ConvexError(
      'Window key must use lowercase letters, numbers, and single hyphens only.',
    );
  }

  return key;
}

function normalizeTimestamp(value: number, fieldName: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ConvexError(
      `${fieldName} must be a valid date and time.`,
    );
  }

  return value;
}

function normalizeWindowInput(args: {
  key: string;
  startsAt: number;
  endsAt: number;
}) {
  const key = normalizeKey(args.key);
  const startsAt = normalizeTimestamp(args.startsAt, 'Start');
  const endsAt = normalizeTimestamp(args.endsAt, 'End');

  if (startsAt >= endsAt) {
    throw new ConvexError(
      'The window end must be later than its start.',
    );
  }

  return { key, startsAt, endsAt };
}

async function requireSeasonalBadge(
  ctx: MutationCtx,
  badgeDefinitionId: Id<'badgeDefinitions'>,
) {
  const definition = await ctx.db.get(badgeDefinitionId);

  if (definition === null) {
    throw new ConvexError('Badge definition not found.');
  }

  if ((definition.classification ?? 'general') !== 'seasonal') {
    throw new ConvexError(
      'Availability windows can only be added to seasonal badges.',
    );
  }

  return definition;
}

async function ensureWindowKeyIsUnique(
  ctx: MutationCtx,
  badgeDefinitionId: Id<'badgeDefinitions'>,
  key: string,
  availabilityWindowId?: Id<'badgeAvailabilityWindows'>,
) {
  const matches = await ctx.db
    .query('badgeAvailabilityWindows')
    .withIndex('by_badge_and_key', (queryBuilder) =>
      queryBuilder
        .eq('badgeDefinitionId', badgeDefinitionId)
        .eq('key', key),
    )
    .collect();
  const duplicate = matches.some(
    (window) => window._id !== availabilityWindowId,
  );

  if (duplicate) {
    throw new ConvexError(
      `Window key "${key}" is already in use for this badge.`,
    );
  }
}

async function ensureWindowDoesNotOverlap(
  ctx: MutationCtx,
  badgeDefinitionId: Id<'badgeDefinitions'>,
  startsAt: number,
  endsAt: number,
  availabilityWindowId?: Id<'badgeAvailabilityWindows'>,
) {
  const windows = await ctx.db
    .query('badgeAvailabilityWindows')
    .withIndex('by_badge', (queryBuilder) =>
      queryBuilder.eq('badgeDefinitionId', badgeDefinitionId),
    )
    .collect();
  const overlap = windows.some(
    (window) =>
      window._id !== availabilityWindowId &&
      startsAt < window.endsAt &&
      endsAt > window.startsAt,
  );

  if (overlap) {
    throw new ConvexError(
      'This availability window overlaps another window for the badge.',
    );
  }
}

function requireFutureStart(startsAt: number) {
  if (startsAt <= Date.now()) {
    throw new ConvexError(
      'Availability windows must start in the future.',
    );
  }
}

export const getAvailabilityWindowsForAdmin = query({
  args: {
    badgeDefinitionId: v.optional(v.id('badgeDefinitions')),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const definitions = await ctx.db
      .query('badgeDefinitions')
      .collect();
    const definitionsById = new Map(
      definitions.map((definition) => [definition._id, definition]),
    );
    const requestedBadgeId = args.badgeDefinitionId;

    if (
      requestedBadgeId !== undefined &&
      !definitionsById.has(requestedBadgeId)
    ) {
      throw new ConvexError('Badge definition not found.');
    }

    const windows = requestedBadgeId === undefined
      ? await ctx.db.query('badgeAvailabilityWindows').collect()
      : await ctx.db
          .query('badgeAvailabilityWindows')
          .withIndex('by_badge', (queryBuilder) =>
            queryBuilder.eq(
              'badgeDefinitionId',
              requestedBadgeId,
            ),
          )
          .collect();

    return windows
      .map((window) => {
        const definition = definitionsById.get(
          window.badgeDefinitionId,
        );

        return {
          ...window,
          badgeName: definition?.name ?? 'Unknown badge',
          badgeKey: definition?.key,
          classification:
            definition?.classification ?? 'general',
          badgeRetired: definition?.retired === true,
        };
      })
      .sort(
        (first, second) =>
          first.startsAt - second.startsAt ||
          first.badgeName.localeCompare(second.badgeName),
      );
  },
});

export const createAvailabilityWindow = mutation({
  args: {
    badgeDefinitionId: v.id('badgeDefinitions'),
    key: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await requireSeasonalBadge(ctx, args.badgeDefinitionId);

    const normalized = normalizeWindowInput(args);
    requireFutureStart(normalized.startsAt);

    await ensureWindowKeyIsUnique(
      ctx,
      args.badgeDefinitionId,
      normalized.key,
    );
    await ensureWindowDoesNotOverlap(
      ctx,
      args.badgeDefinitionId,
      normalized.startsAt,
      normalized.endsAt,
    );

    return await ctx.db.insert('badgeAvailabilityWindows', {
      badgeDefinitionId: args.badgeDefinitionId,
      key: normalized.key,
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
    });
  },
});

export const updateAvailabilityWindow = mutation({
  args: {
    availabilityWindowId: v.id('badgeAvailabilityWindows'),
    key: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existingWindow = await ctx.db.get(
      args.availabilityWindowId,
    );

    if (existingWindow === null) {
      throw new ConvexError('Availability window not found.');
    }

    if (existingWindow.startsAt <= Date.now()) {
      throw new ConvexError(
        'Availability windows cannot be changed after they start.',
      );
    }

    await requireSeasonalBadge(
      ctx,
      existingWindow.badgeDefinitionId,
    );

    const normalized = normalizeWindowInput(args);
    requireFutureStart(normalized.startsAt);

    await ensureWindowKeyIsUnique(
      ctx,
      existingWindow.badgeDefinitionId,
      normalized.key,
      args.availabilityWindowId,
    );
    await ensureWindowDoesNotOverlap(
      ctx,
      existingWindow.badgeDefinitionId,
      normalized.startsAt,
      normalized.endsAt,
      args.availabilityWindowId,
    );

    await ctx.db.patch(args.availabilityWindowId, {
      key: normalized.key,
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
    });

    return args.availabilityWindowId;
  },
});

export const deleteAvailabilityWindow = mutation({
  args: {
    availabilityWindowId: v.id('badgeAvailabilityWindows'),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existingWindow = await ctx.db.get(
      args.availabilityWindowId,
    );

    if (existingWindow === null) {
      throw new ConvexError('Availability window not found.');
    }

    if (existingWindow.startsAt <= Date.now()) {
      throw new ConvexError(
        'Availability windows cannot be removed after they start.',
      );
    }

    await ctx.db.delete(args.availabilityWindowId);

    return {
      availabilityWindowId: args.availabilityWindowId,
      badgeDefinitionId: existingWindow.badgeDefinitionId,
    };
  },
});
