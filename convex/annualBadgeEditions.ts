import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from './_generated/server';
import { requireAdmin } from './lib/auth';

const MAX_NAME_LENGTH = 115;
const MAX_KEY_LENGTH = 115;
const MAX_WINDOW_KEY_LENGTH = 120;
const GENERATION_LEAD_TIME_MS = 183 * 24 * 60 * 60 * 1000;

function normalizeRequiredString(
  value: string,
  fieldName: string,
  maxLength: number,
) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ConvexError(`${fieldName} is required.`);
  }

  if (trimmed.length > maxLength) {
    throw new ConvexError(
      `${fieldName} must be ${maxLength} characters or fewer.`,
    );
  }

  return trimmed;
}

function normalizeSeriesKey(value: string) {
  const key = normalizeRequiredString(
    value,
    'Annual series key',
    MAX_KEY_LENGTH,
  );

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) {
    throw new ConvexError(
      'Annual series key must use lowercase letters, numbers, and single hyphens only.',
    );
  }

  return key;
}

function getEditionYear(
  windows: Array<{ startsAt: number }>,
) {
  const earliestStart = Math.min(
    ...windows.map((window) => window.startsAt),
  );

  return new Date(earliestStart).getUTCFullYear();
}

function shiftTimestampOneYear(timestamp: number) {
  const source = new Date(timestamp);
  const targetYear = source.getUTCFullYear() + 1;
  const month = source.getUTCMonth();
  const day = source.getUTCDate();
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, month + 1, 0),
  ).getUTCDate();

  return Date.UTC(
    targetYear,
    month,
    Math.min(day, lastDayOfTargetMonth),
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds(),
  );
}

function getNextWindowKey(
  key: string,
  currentYear: number,
  nextYear: number,
) {
  const currentSuffix = `-${currentYear}`;
  const baseKey = key.endsWith(currentSuffix)
    ? key.slice(0, -currentSuffix.length)
    : key;
  const nextKey = `${baseKey}-${nextYear}`;

  if (nextKey.length > MAX_WINDOW_KEY_LENGTH) {
    throw new ConvexError(
      `Generated window keys must be ${MAX_WINDOW_KEY_LENGTH} characters or fewer.`,
    );
  }

  return nextKey;
}

async function getEditionWindows(
  ctx: MutationCtx,
  badgeDefinitionId: Id<'badgeDefinitions'>,
) {
  return await ctx.db
    .query('badgeAvailabilityWindows')
    .withIndex('by_badge', (queryBuilder) =>
      queryBuilder.eq('badgeDefinitionId', badgeDefinitionId),
    )
    .collect();
}

async function getLatestEdition(
  ctx: MutationCtx,
  annualSeriesId: Id<'badgeAnnualSeries'>,
) {
  return await ctx.db
    .query('badgeDefinitions')
    .withIndex('by_annual_series_and_year', (queryBuilder) =>
      queryBuilder.eq('annualSeriesId', annualSeriesId),
    )
    .order('desc')
    .first();
}

async function ensureNextEdition(
  ctx: MutationCtx,
  series: Doc<'badgeAnnualSeries'>,
  currentEdition: Doc<'badgeDefinitions'>,
) {
  const currentYear = currentEdition.editionYear;

  if (currentYear === undefined) {
    throw new ConvexError(
      'The current annual badge edition is missing its year.',
    );
  }

  const nextYear = currentYear + 1;
  const maximumGeneratedYear =
    new Date().getUTCFullYear() + 1;

  if (nextYear > maximumGeneratedYear) {
    return {
      created: false as const,
      badgeDefinitionId: currentEdition._id,
      editionYear: currentYear,
    };
  }

  const existingNextEdition = await ctx.db
    .query('badgeDefinitions')
    .withIndex('by_annual_series_and_year', (queryBuilder) =>
      queryBuilder
        .eq('annualSeriesId', series._id)
        .eq('editionYear', nextYear),
    )
    .unique();

  if (existingNextEdition !== null) {
    if (series.latestEditionYear < nextYear) {
      await ctx.db.patch(series._id, {
        latestEditionYear: nextYear,
        updatedAt: Date.now(),
      });
    }

    return {
      created: false as const,
      badgeDefinitionId: existingNextEdition._id,
      editionYear: nextYear,
    };
  }

  const currentWindows = await getEditionWindows(
    ctx,
    currentEdition._id,
  );

  if (currentWindows.length === 0) {
    throw new ConvexError(
      'Annual badge editions require at least one availability window.',
    );
  }

  const nextKey = `${series.key}-${nextYear}`;
  const duplicateKey = await ctx.db
    .query('badgeDefinitions')
    .withIndex('by_key', (queryBuilder) =>
      queryBuilder.eq('key', nextKey),
    )
    .first();

  if (duplicateKey !== null) {
    throw new ConvexError(
      `Badge key "${nextKey}" is already in use.`,
    );
  }

  const shiftedWindows = currentWindows.map((window) => ({
    key: getNextWindowKey(window.key, currentYear, nextYear),
    startsAt: shiftTimestampOneYear(window.startsAt),
    endsAt: shiftTimestampOneYear(window.endsAt),
  }));

  if (
    shiftedWindows.some(
      (window) =>
        window.startsAt <= Date.now() ||
        window.startsAt >= window.endsAt,
    )
  ) {
    throw new ConvexError(
      'The generated annual availability window must be in the future.',
    );
  }

  const uniqueWindowKeys = new Set(
    shiftedWindows.map((window) => window.key),
  );

  if (uniqueWindowKeys.size !== shiftedWindows.length) {
    throw new ConvexError(
      'The generated annual availability windows would have duplicate keys.',
    );
  }

  const badgeDefinitionId = await ctx.db.insert(
    'badgeDefinitions',
    {
      name: `${series.name} ${nextYear}`,
      key: nextKey,
      tag: currentEdition.tag,
      description: currentEdition.description,
      funFact: currentEdition.funFact,
      source: currentEdition.source,
      requiredVisits: currentEdition.requiredVisits,
      classification: 'seasonal',
      rule: currentEdition.rule,
      retired: false,
      imageKey: currentEdition.imageKey,
      imageStorageId: currentEdition.imageStorageId,
      annualSeriesId: series._id,
      editionYear: nextYear,
    },
  );

  for (const window of shiftedWindows) {
    await ctx.db.insert('badgeAvailabilityWindows', {
      badgeDefinitionId,
      key: window.key,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    });
  }

  await ctx.db.patch(series._id, {
    latestEditionYear: nextYear,
    updatedAt: Date.now(),
  });

  return {
    created: true as const,
    badgeDefinitionId,
    editionYear: nextYear,
  };
}

export const getAnnualSeriesForAdmin = query({
  args: {
    badgeDefinitionId: v.id('badgeDefinitions'),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const definition = await ctx.db.get(args.badgeDefinitionId);

    if (definition === null) {
      throw new ConvexError('Badge definition not found.');
    }

    if (definition.annualSeriesId === undefined) {
      return null;
    }

    const series = await ctx.db.get(definition.annualSeriesId);

    if (series === null) {
      return null;
    }

    const editions = await ctx.db
      .query('badgeDefinitions')
      .withIndex('by_annual_series_and_year', (queryBuilder) =>
        queryBuilder.eq('annualSeriesId', series._id),
      )
      .collect();

    return {
      ...series,
      editions: editions
        .map((edition) => ({
          badgeDefinitionId: edition._id,
          name: edition.name,
          key: edition.key,
          editionYear: edition.editionYear,
          imageKey: edition.imageKey,
          retired: edition.retired === true,
        }))
        .sort(
          (first, second) =>
            (first.editionYear ?? 0) -
            (second.editionYear ?? 0),
        ),
    };
  },
});

export const enableAnnualRepeat = mutation({
  args: {
    badgeDefinitionId: v.id('badgeDefinitions'),
    seriesName: v.string(),
    seriesKey: v.string(),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const definition = await ctx.db.get(args.badgeDefinitionId);

    if (definition === null) {
      throw new ConvexError('Badge definition not found.');
    }

    if ((definition.classification ?? 'general') !== 'seasonal') {
      throw new ConvexError(
        'Yearly repeats can only be enabled for seasonal badges.',
      );
    }

    if (definition.retired === true) {
      throw new ConvexError(
        'Reactivate this badge before enabling yearly repeats.',
      );
    }

    if (definition.annualSeriesId !== undefined) {
      const existingSeries = await ctx.db.get(
        definition.annualSeriesId,
      );

      if (existingSeries === null) {
        throw new ConvexError('Annual badge series not found.');
      }

      await ctx.db.patch(existingSeries._id, {
        enabled: true,
        updatedAt: Date.now(),
      });

      const latestEdition = await getLatestEdition(
        ctx,
        existingSeries._id,
      );

      if (latestEdition === null) {
        throw new ConvexError('Annual badge series has no editions.');
      }

      const latestWindows = await getEditionWindows(
        ctx,
        latestEdition._id,
      );
      const earliestStart = Math.min(
        ...latestWindows.map((window) => window.startsAt),
      );
      const generationCutoff =
        Date.now() + GENERATION_LEAD_TIME_MS;

      if (
        latestWindows.length > 0 &&
        earliestStart > generationCutoff
      ) {
        if (latestEdition.editionYear === undefined) {
          throw new ConvexError(
            'The latest annual badge edition is missing its year.',
          );
        }

        return {
          annualSeriesId: existingSeries._id,
          created: false as const,
          badgeDefinitionId: latestEdition._id,
          editionYear: latestEdition.editionYear,
        };
      }

      const nextEdition = await ensureNextEdition(
        ctx,
        { ...existingSeries, enabled: true },
        latestEdition,
      );

      return {
        annualSeriesId: existingSeries._id,
        ...nextEdition,
      };
    }

    const seriesName = normalizeRequiredString(
      args.seriesName,
      'Annual series name',
      MAX_NAME_LENGTH,
    );
    const seriesKey = normalizeSeriesKey(args.seriesKey);
    const duplicateSeries = await ctx.db
      .query('badgeAnnualSeries')
      .withIndex('by_key', (queryBuilder) =>
        queryBuilder.eq('key', seriesKey),
      )
      .first();

    if (duplicateSeries !== null) {
      throw new ConvexError(
        `Annual series key "${seriesKey}" is already in use.`,
      );
    }

    const windows = await getEditionWindows(
      ctx,
      args.badgeDefinitionId,
    );

    if (windows.length === 0) {
      throw new ConvexError(
        'Add an availability window before enabling yearly repeats.',
      );
    }

    const editionYear = getEditionYear(windows);
    const now = Date.now();
    const annualSeriesId = await ctx.db.insert(
      'badgeAnnualSeries',
      {
        key: seriesKey,
        name: seriesName,
        enabled: true,
        latestEditionYear: editionYear,
        createdAt: now,
        updatedAt: now,
      },
    );

    await ctx.db.patch(args.badgeDefinitionId, {
      annualSeriesId,
      editionYear,
    });

    const series = await ctx.db.get(annualSeriesId);

    if (series === null) {
      throw new ConvexError('Unable to create annual badge series.');
    }

    const nextEdition = await ensureNextEdition(
      ctx,
      series,
      {
        ...definition,
        annualSeriesId,
        editionYear,
      },
    );

    return {
      annualSeriesId,
      ...nextEdition,
    };
  },
});

export const disableAnnualRepeat = mutation({
  args: {
    badgeDefinitionId: v.id('badgeDefinitions'),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const definition = await ctx.db.get(args.badgeDefinitionId);

    if (definition === null) {
      throw new ConvexError('Badge definition not found.');
    }

    if (definition.annualSeriesId === undefined) {
      return { disabled: false as const };
    }

    const series = await ctx.db.get(definition.annualSeriesId);

    if (series === null) {
      return { disabled: false as const };
    }

    await ctx.db.patch(series._id, {
      enabled: false,
      updatedAt: Date.now(),
    });

    return {
      disabled: true as const,
      annualSeriesId: series._id,
    };
  },
});

export const maintainAnnualBadgeEditions = internalMutation({
  args: {},

  handler: async (ctx) => {
    const seriesRecords = await ctx.db
      .query('badgeAnnualSeries')
      .collect();
    const generationCutoff = Date.now() + GENERATION_LEAD_TIME_MS;
    let created = 0;
    let skipped = 0;

    for (const series of seriesRecords) {
      if (!series.enabled) {
        skipped += 1;
        continue;
      }

      const latestEdition = await getLatestEdition(ctx, series._id);

      if (latestEdition === null) {
        skipped += 1;
        continue;
      }

      const latestWindows = await getEditionWindows(
        ctx,
        latestEdition._id,
      );
      const earliestStart = Math.min(
        ...latestWindows.map((window) => window.startsAt),
      );

      if (
        latestWindows.length === 0 ||
        earliestStart > generationCutoff
      ) {
        skipped += 1;
        continue;
      }

      const result = await ensureNextEdition(
        ctx,
        series,
        latestEdition,
      );

      if (result.created) {
        created += 1;
      } else {
        skipped += 1;
      }
    }

    return { created, skipped };
  },
});
