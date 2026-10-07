import { ConvexError, v } from 'convex/values';

import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { normalizeBadgeTag } from './lib/badge_rules';
import { requireAdmin } from './lib/auth';

const MAX_NAME_LENGTH = 120;
const MAX_KEY_LENGTH = 120;
const MAX_TAG_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LEVEL_CELEBRATION_TITLE_LENGTH = 160;
const MAX_LEVEL_CELEBRATION_MESSAGE_LENGTH = 1000;

const badgeRuleValidator = v.union(
  v.object({
    type: v.literal('tag'),
  }),
  v.object({
    type: v.literal('location'),
    locationKey: v.string(),
  }),
  v.object({
    type: v.literal('any_location'),
  }),
  v.object({
    type: v.literal('story'),
    storyKey: v.string(),
  }),
  v.object({
    type: v.literal('region'),
    regionKey: v.string(),
  }),
  v.object({
    type: v.literal('same_story'),
  }),
  v.object({
    type: v.literal('same_region'),
  }),
);

const classificationValidator = v.union(
  v.literal('general'),
  v.literal('special_place'),
  v.literal('seasonal'),
);

const levelCelebrationValidator = v.object({
  maximumLevel: v.number(),
  title: v.string(),
  message: v.string(),
});

type BadgeRuleInput =
  | { type: 'tag' }
  | { type: 'location'; locationKey: string }
  | { type: 'any_location' }
  | { type: 'story'; storyKey: string }
  | { type: 'region'; regionKey: string }
  | { type: 'same_story' }
  | { type: 'same_region' };

type StoredBadgeRule =
  | { type: 'tag'; normalizedTag: string }
  | { type: 'location'; locationKey: string }
  | { type: 'any_location' }
  | { type: 'story'; storyKey: string }
  | { type: 'region'; regionKey: string }
  | { type: 'same_story' }
  | { type: 'same_region' };

type BadgeClassification =
  | 'general'
  | 'special_place'
  | 'seasonal';

type LevelCelebrationInput = {
  maximumLevel: number;
  title: string;
  message: string;
};

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

function normalizeSlug(value: string, fieldName: string) {
  const normalized = normalizeRequiredString(
    value,
    fieldName,
    MAX_KEY_LENGTH,
  );

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new ConvexError(
      `${fieldName} must use lowercase letters, numbers, and single hyphens only.`,
    );
  }

  return normalized;
}

function normalizeTag(value: string) {
  const normalized = normalizeBadgeTag(
    normalizeRequiredString(value, 'tag', MAX_TAG_LENGTH),
  );

  if (!normalized) {
    throw new ConvexError('tag is required.');
  }

  return normalized;
}

function normalizeOptionalImageKey(value: string | undefined) {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }

  return normalizeSlug(value, 'imageKey');
}

function normalizeClassification(value: BadgeClassification) {
  return value;
}

function normalizeRequiredVisits(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    throw new ConvexError(
      'requiredVisits must be a positive integer no greater than 1,000.',
    );
  }

  return value;
}

function normalizeLevelCelebrations(
  values: LevelCelebrationInput[],
) {
  if (values.length > 10) {
    throw new ConvexError(
      'A badge can have no more than ten level celebration bands.',
    );
  }

  const maximumLevels = new Set<number>();

  const normalized = values.map((value) => {
    if (
      !Number.isInteger(value.maximumLevel) ||
      value.maximumLevel < 5 ||
      value.maximumLevel > 50 ||
      value.maximumLevel % 5 !== 0
    ) {
      throw new ConvexError(
        'Level celebration bands must end at a multiple of five from 5 through 50.',
      );
    }

    if (maximumLevels.has(value.maximumLevel)) {
      throw new ConvexError(
        `Only one celebration can be saved for Levels ${value.maximumLevel - 4}–${value.maximumLevel}.`,
      );
    }

    maximumLevels.add(value.maximumLevel);

    return {
      maximumLevel: value.maximumLevel,
      title: normalizeRequiredString(
        value.title,
        'Level celebration title',
        MAX_LEVEL_CELEBRATION_TITLE_LENGTH,
      ),
      message: normalizeRequiredString(
        value.message,
        'Level celebration message',
        MAX_LEVEL_CELEBRATION_MESSAGE_LENGTH,
      ),
    };
  });

  return normalized.sort(
    (first, second) => first.maximumLevel - second.maximumLevel,
  );
}

async function normalizeRule(
  ctx: MutationCtx,
  rule: BadgeRuleInput,
  tag: string,
): Promise<StoredBadgeRule> {
  switch (rule.type) {
    case 'tag':
      return {
        type: 'tag',
        normalizedTag: normalizeBadgeTag(tag),
      };
    case 'location': {
      const locationKey = normalizeSlug(
        rule.locationKey,
        'locationKey',
      );
      const locations = await ctx.db
        .query('locations')
        .withIndex('by_key', (queryBuilder) =>
          queryBuilder.eq('key', locationKey),
        )
        .collect();

      if (locations.length === 0) {
        throw new ConvexError(
          `No location exists with key "${locationKey}".`,
        );
      }

      return { type: 'location', locationKey };
    }
    case 'story':
      return {
        type: 'story',
        storyKey: normalizeSlug(rule.storyKey, 'storyKey'),
      };
    case 'region':
      return {
        type: 'region',
        regionKey: normalizeSlug(rule.regionKey, 'regionKey'),
      };
    case 'any_location':
      return { type: 'any_location' };
    case 'same_story':
      return { type: 'same_story' };
    case 'same_region':
      return { type: 'same_region' };
  }
}

function normalizeBadgeInput(args: {
  name: string;
  key: string;
  tag: string;
  description: string;
  requiredVisits: number;
  classification: BadgeClassification;
  levelsEnabled: boolean;
  levelCelebrations: LevelCelebrationInput[];
  imageKey?: string;
}) {
  return {
    name: normalizeRequiredString(args.name, 'name', MAX_NAME_LENGTH),
    key: normalizeSlug(args.key, 'key'),
    tag: normalizeTag(args.tag),
    description: normalizeRequiredString(
      args.description,
      'description',
      MAX_DESCRIPTION_LENGTH,
    ),
    requiredVisits: normalizeRequiredVisits(args.requiredVisits),
    classification: normalizeClassification(args.classification),
    levelsEnabled:
      args.classification !== 'seasonal' && args.levelsEnabled,
    levelCelebrations:
      args.classification === 'seasonal'
        ? []
        : normalizeLevelCelebrations(args.levelCelebrations),
    imageKey: normalizeOptionalImageKey(args.imageKey),
  };
}

function ensureRequiredVisitsMatchRule(
  requiredVisits: number,
  rule: StoredBadgeRule,
) {
  if (rule.type === 'location' && requiredVisits !== 1) {
    throw new ConvexError(
      'Specific location badges must require exactly one visit.',
    );
  }
}

function ensureLevelsMatchRule(
  levelsEnabled: boolean,
  rule: StoredBadgeRule,
) {
  if (levelsEnabled && rule.type === 'location') {
    throw new ConvexError(
      'Specific location badges cannot use repeatable levels because each location can only be collected once.',
    );
  }
}

async function ensureBadgeKeyIsUnique(
  ctx: MutationCtx,
  key: string,
  badgeDefinitionId?: Id<'badgeDefinitions'>,
) {
  const definitions = await ctx.db
    .query('badgeDefinitions')
    .withIndex('by_key', (queryBuilder) =>
      queryBuilder.eq('key', key),
    )
    .collect();
  const duplicate = definitions.find(
    (definition) =>
      definition._id !== badgeDefinitionId,
  );

  if (duplicate !== undefined) {
    throw new ConvexError(`Badge key "${key}" is already in use.`);
  }
}

async function ensureBadgeTagIsUnique(
  ctx: MutationCtx,
  tag: string,
  badgeDefinitionId?: Id<'badgeDefinitions'>,
  annualSeriesId?: Id<'badgeAnnualSeries'>,
) {
  const definitions = await ctx.db.query('badgeDefinitions').collect();
  const duplicate = definitions.find((definition) => {
    const sameAnnualSeries =
      annualSeriesId !== undefined &&
      definition.annualSeriesId === annualSeriesId;

    return (
      definition._id !== badgeDefinitionId &&
      normalizeBadgeTag(definition.tag) === normalizeBadgeTag(tag) &&
      !sameAnnualSeries
    );
  });

  if (duplicate !== undefined) {
    throw new ConvexError(`Badge tag "${tag}" is already in use.`);
  }
}

export const getBadgesForAdmin = query({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);

    const definitions = await ctx.db
      .query('badgeDefinitions')
      .collect();

    const definitionsWithArtwork = await Promise.all(
      definitions.map(async (definition) => ({
        ...definition,
        imageUrl: definition.imageStorageId === undefined
          ? undefined
          : (await ctx.storage.getUrl(
              definition.imageStorageId,
            )) ?? undefined,
        key: definition.key ?? '',
        classification: definition.classification ?? 'general',
        rule: definition.rule ?? {
          type: 'tag' as const,
          normalizedTag: normalizeBadgeTag(definition.tag),
        },
        levelsEnabled:
          definition.classification !== 'seasonal' &&
          definition.levelsEnabled === true,
        retired: definition.retired === true,
      })),
    );

    return definitionsWithArtwork.sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  },
});

export const createBadgeDefinition = mutation({
  args: {
    name: v.string(),
    key: v.string(),
    tag: v.string(),
    description: v.string(),
    requiredVisits: v.number(),
    classification: classificationValidator,
    levelsEnabled: v.boolean(),
    levelCelebrations: v.array(levelCelebrationValidator),
    rule: badgeRuleValidator,
    imageKey: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const normalized = normalizeBadgeInput(args);
    const rule = await normalizeRule(ctx, args.rule, normalized.tag);

    ensureRequiredVisitsMatchRule(
      normalized.requiredVisits,
      rule,
    );
    ensureLevelsMatchRule(normalized.levelsEnabled, rule);

    await ensureBadgeKeyIsUnique(ctx, normalized.key);
    await ensureBadgeTagIsUnique(ctx, normalized.tag);

    return await ctx.db.insert('badgeDefinitions', {
      name: normalized.name,
      key: normalized.key,
      tag: normalized.tag,
      description: normalized.description,
      requiredVisits: normalized.requiredVisits,
      classification: normalized.classification,
      levelsEnabled: normalized.levelsEnabled,
      levelCelebrations: normalized.levelCelebrations,
      rule,
      retired: false,
      imageKey: normalized.imageKey,
    });
  },
});

export const updateBadgeDefinition = mutation({
  args: {
    badgeDefinitionId: v.id('badgeDefinitions'),
    name: v.string(),
    key: v.string(),
    tag: v.string(),
    description: v.string(),
    requiredVisits: v.number(),
    classification: classificationValidator,
    levelsEnabled: v.boolean(),
    levelCelebrations: v.array(levelCelebrationValidator),
    rule: badgeRuleValidator,
    imageKey: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existingDefinition = await ctx.db.get(
      args.badgeDefinitionId,
    );

    if (existingDefinition === null) {
      throw new ConvexError('Badge definition not found.');
    }

    const normalized = normalizeBadgeInput(args);
    const rule = await normalizeRule(ctx, args.rule, normalized.tag);

    ensureRequiredVisitsMatchRule(
      normalized.requiredVisits,
      rule,
    );
    ensureLevelsMatchRule(normalized.levelsEnabled, rule);

    if (normalized.classification !== 'seasonal') {
      const availabilityWindows = await ctx.db
        .query('badgeAvailabilityWindows')
        .withIndex('by_badge', (queryBuilder) =>
          queryBuilder.eq(
            'badgeDefinitionId',
            args.badgeDefinitionId,
          ),
        )
        .collect();

      if (
        availabilityWindows.some(
          (window) => window.startsAt <= Date.now(),
        )
      ) {
        throw new ConvexError(
          'Badges with started availability windows must remain seasonal.',
        );
      }

      if (availabilityWindows.length > 0) {
        throw new ConvexError(
          "Remove this badge's future availability windows before changing its classification.",
        );
      }

      if (existingDefinition.annualSeriesId !== undefined) {
        const annualSeries = await ctx.db.get(
          existingDefinition.annualSeriesId,
        );

        if (annualSeries !== null && annualSeries.enabled) {
          await ctx.db.patch(annualSeries._id, {
            enabled: false,
            updatedAt: Date.now(),
          });
        }
      }
    }

    await ensureBadgeKeyIsUnique(
      ctx,
      normalized.key,
      args.badgeDefinitionId,
    );
    await ensureBadgeTagIsUnique(
      ctx,
      normalized.tag,
      args.badgeDefinitionId,
      existingDefinition.annualSeriesId,
    );

    await ctx.db.patch(args.badgeDefinitionId, {
      name: normalized.name,
      key: normalized.key,
      tag: normalized.tag,
      description: normalized.description,
      requiredVisits: normalized.requiredVisits,
      classification: normalized.classification,
      levelsEnabled: normalized.levelsEnabled,
      levelCelebrations: normalized.levelCelebrations,
      rule,
      imageKey: normalized.imageKey,
    });

    return args.badgeDefinitionId;
  },
});

export const setBadgeRetired = mutation({
  args: {
    badgeDefinitionId: v.id('badgeDefinitions'),
    retired: v.boolean(),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const definition = await ctx.db.get(args.badgeDefinitionId);

    if (definition === null) {
      throw new ConvexError('Badge definition not found.');
    }

    if (args.retired) {
      if (definition.retired === true) {
        return {
          badgeDefinitionId: args.badgeDefinitionId,
          retired: true,
        };
      }

      await ctx.db.patch(args.badgeDefinitionId, {
        retired: true,
        retiredAt: Date.now(),
      });

      return {
        badgeDefinitionId: args.badgeDefinitionId,
        retired: true,
      };
    }

    await ctx.db.patch(args.badgeDefinitionId, {
      retired: false,
      retiredAt: undefined,
    });

    return {
      badgeDefinitionId: args.badgeDefinitionId,
      retired: false,
    };
  },
});
