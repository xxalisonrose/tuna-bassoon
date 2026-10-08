import { ConvexError, v } from 'convex/values';

import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import {
  DEFAULT_BADGE_CONGRATULATIONS,
  getBadgeCongratulations,
} from './lib/badge_congratulations';
import { normalizeBadgeTag } from './lib/badge_rules';
import { requireAdmin } from './lib/auth';

const MAX_NAME_LENGTH = 120;
const MAX_KEY_LENGTH = 120;
const MAX_TAG_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_CONGRATULATIONS_MESSAGES = 100;
const MAX_CONGRATULATIONS_MESSAGE_LENGTH = 160;

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
  v.literal('theme'),
  v.literal('special_place'),
  v.literal('seasonal'),
);

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
  | 'theme'
  | 'special_place'
  | 'seasonal';

const classificationPresets: Record<
  BadgeClassification,
  { requiredVisits: number; levelsEnabled: boolean }
> = {
  general: {
    requiredVisits: 5,
    levelsEnabled: true,
  },
  theme: {
    requiredVisits: 2,
    levelsEnabled: true,
  },
  special_place: {
    requiredVisits: 1,
    levelsEnabled: false,
  },
  seasonal: {
    requiredVisits: 1,
    levelsEnabled: false,
  },
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

function normalizeCongratulationsMessages(values: string[]) {
  if (values.length === 0) {
    throw new ConvexError(
      'Add at least one badge congratulations message.',
    );
  }

  if (values.length > MAX_CONGRATULATIONS_MESSAGES) {
    throw new ConvexError(
      `A badge can contain no more than ${MAX_CONGRATULATIONS_MESSAGES} congratulations messages.`,
    );
  }

  const seenMessages = new Set<string>();

  return values.map((value) => {
    const message = value.trim();

    if (message.length === 0) {
      throw new ConvexError(
        'Badge congratulations messages cannot be blank.',
      );
    }

    if (message.length > MAX_CONGRATULATIONS_MESSAGE_LENGTH) {
      throw new ConvexError(
        `Badge congratulations messages must be ${MAX_CONGRATULATIONS_MESSAGE_LENGTH} characters or fewer.`,
      );
    }

    const duplicateKey = message.toLowerCase();

    if (seenMessages.has(duplicateKey)) {
      throw new ConvexError(
        `The congratulations message "${message}" appears more than once.`,
      );
    }

    seenMessages.add(duplicateKey);
    return message;
  });
}

function getPresetCongratulationsMessages(
  classification: BadgeClassification,
  currentMessages: string[] | undefined,
) {
  const messages = getBadgeCongratulations(currentMessages);

  if (
    classification === 'special_place' ||
    classification === 'seasonal'
  ) {
    return [messages[0] ?? DEFAULT_BADGE_CONGRATULATIONS[0]];
  }

  const presetMessages = [...messages];
  const seenMessages = new Set(
    presetMessages.map((message) => message.toLowerCase()),
  );

  for (const defaultMessage of DEFAULT_BADGE_CONGRATULATIONS) {
    if (presetMessages.length >= 10) {
      break;
    }

    const duplicateKey = defaultMessage.toLowerCase();

    if (!seenMessages.has(duplicateKey)) {
      presetMessages.push(defaultMessage);
      seenMessages.add(duplicateKey);
    }
  }

  return presetMessages;
}

function messagesMatch(first: string[], second: string[]) {
  return (
    first.length === second.length &&
    first.every((message, index) => message === second[index])
  );
}

function getClassificationPresetChange(definition: {
  _id: Id<'badgeDefinitions'>;
  name: string;
  tag: string;
  classification?: BadgeClassification;
  requiredVisits: number;
  levelsEnabled?: boolean;
  congratulationsMessages?: string[];
  rule?: StoredBadgeRule;
}) {
  const classification = definition.classification ?? 'general';
  const preset = classificationPresets[classification];
  const requiredVisits = classification === 'general'
    ? normalizeRequiredVisits(definition.requiredVisits)
    : preset.requiredVisits;
  const beforeMessages = getBadgeCongratulations(
    definition.congratulationsMessages,
  );
  const afterMessages = getPresetCongratulationsMessages(
    classification,
    definition.congratulationsMessages,
  );
  const rule = definition.rule ?? {
    type: 'tag' as const,
    normalizedTag: normalizeBadgeTag(definition.tag),
  };
  const conflict =
    preset.levelsEnabled && rule.type === 'location'
      ? `${classification === 'theme' ? 'Theme' : 'General'} badges cannot use a specific-location rule because they use repeatable levels. Change this badge to Special Place before applying the migration.`
      : null;
  const changed =
    definition.classification !== classification ||
    definition.requiredVisits !== requiredVisits ||
    definition.levelsEnabled !== preset.levelsEnabled ||
    !messagesMatch(beforeMessages, afterMessages);

  if (!changed && conflict === null) {
    return null;
  }

  return {
    badgeDefinitionId: definition._id,
    name: definition.name,
    classification,
    conflict,
    before: {
      requiredVisits: definition.requiredVisits,
      levelsEnabled: definition.levelsEnabled === true,
      messageCount: beforeMessages.length,
    },
    after: {
      requiredVisits,
      levelsEnabled: preset.levelsEnabled,
      messageCount: afterMessages.length,
    },
    removedMessages:
      classification === 'general' || classification === 'theme'
        ? []
        : beforeMessages.slice(1),
    congratulationsMessages: afterMessages,
  };
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
  congratulationsMessages: string[];
  imageKey?: string;
}) {
  const classification = normalizeClassification(args.classification);
  const preset = classificationPresets[classification];
  const requiredVisits = normalizeRequiredVisits(args.requiredVisits);

  if (
    classification !== 'general' &&
    requiredVisits !== preset.requiredVisits
  ) {
    throw new ConvexError(
      `${classification === 'theme' ? 'Theme' : classification === 'special_place' ? 'Special Place' : 'Seasonal'} badges require exactly ${preset.requiredVisits} ${preset.requiredVisits === 1 ? 'visit' : 'visits'}.`,
    );
  }

  if (args.levelsEnabled !== preset.levelsEnabled) {
    throw new ConvexError(
      preset.levelsEnabled
        ? 'General and Theme badges must use repeatable levels.'
        : 'Special Place and Seasonal badges cannot use repeatable levels.',
    );
  }

  return {
    name: normalizeRequiredString(args.name, 'name', MAX_NAME_LENGTH),
    key: normalizeSlug(args.key, 'key'),
    tag: normalizeTag(args.tag),
    description: normalizeRequiredString(
      args.description,
      'description',
      MAX_DESCRIPTION_LENGTH,
    ),
    requiredVisits,
    classification,
    levelsEnabled: preset.levelsEnabled,
    congratulationsMessages: normalizeCongratulationsMessages(
      args.congratulationsMessages,
    ),
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
        congratulationsMessages: getBadgeCongratulations(
          definition.congratulationsMessages,
        ),
        retired: definition.retired === true,
      })),
    );

    return definitionsWithArtwork.sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  },
});

export const previewClassificationPresetMigration = query({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);
    const definitions = await ctx.db
      .query('badgeDefinitions')
      .collect();
    const changes: NonNullable<
      ReturnType<typeof getClassificationPresetChange>
    >[] = [];

    for (const definition of definitions) {
      const change = getClassificationPresetChange(definition);

      if (change !== null) {
        changes.push(change);
      }
    }

    return changes.sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  },
});

export const applyClassificationPresetMigration = mutation({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);
    const definitions = await ctx.db
      .query('badgeDefinitions')
      .collect();
    const changes: NonNullable<
      ReturnType<typeof getClassificationPresetChange>
    >[] = [];

    for (const definition of definitions) {
      const change = getClassificationPresetChange(definition);

      if (change !== null) {
        changes.push(change);
      }
    }

    const conflicts = changes.filter(
      (change) => change.conflict !== null,
    );

    if (conflicts.length > 0) {
      throw new ConvexError(
        'Resolve classification preset conflicts before applying: ' +
          conflicts
            .map((change) => `${change.name}: ${change.conflict}`)
            .join(' '),
      );
    }

    for (const change of changes) {
      await ctx.db.patch(change.badgeDefinitionId, {
        classification: change.classification,
        requiredVisits: change.after.requiredVisits,
        levelsEnabled: change.after.levelsEnabled,
        congratulationsMessages: change.congratulationsMessages,
      });
    }

    return {
      updated: changes.length,
      badges: changes.map((change) => change.name),
    };
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
    congratulationsMessages: v.array(v.string()),
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
      congratulationsMessages: normalized.congratulationsMessages,
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
    congratulationsMessages: v.array(v.string()),
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
      congratulationsMessages: normalized.congratulationsMessages,
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
