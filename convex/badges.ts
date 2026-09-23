import { ConvexError, v } from 'convex/values';

import { internalMutation, mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { normalizeBadgeTag } from './lib/badge_rules';

const BADGE_DEFINITIONS = [
  {
    name: 'Statue Explorer',
    tag: 'Statue',
    key: 'statue-explorer',
    classification: 'general' as const,
    description: 'Visit five locations featuring notable statues.',
    requiredVisits: 5,
    imageKey: 'statue',
  },
  {
    name: 'Ghost Story Hunter',
    tag: 'Ghost Stories',
    key: 'ghost-story-hunter',
    classification: 'general' as const,
    description: 'Visit five locations connected to Harvard ghost stories.',
    requiredVisits: 5,
    imageKey: 'ghost-stories',
  },
  {
    name: 'People of Harvard',
    tag: 'Interesting People',
    key: 'people-of-harvard',
    classification: 'general' as const,
    description: 'Visit five locations associated with interesting people.',
    requiredVisits: 5,
    imageKey: 'interesting-people',
  },
  {
    name: 'Revolutionary Harvard',
    tag: 'Revolutionary War',
    key: 'revolutionary-harvard',
    classification: 'general' as const,
    description: 'Visit three Revolutionary War locations.',
    requiredVisits: 3,
    imageKey: 'revolutionary-war',
  },
  {
    name: 'Harvard Art Explorer',
    tag: 'Art',
    key: 'harvard-art-explorer',
    classification: 'general' as const,
    description: 'Visit three locations connected to art.',
    requiredVisits: 3,
    imageKey: 'art',
  },
  {
    name: 'Civil War Historian',
    tag: 'Civil War',
    key: 'civil-war-historian',
    classification: 'general' as const,
    description: 'Visit three locations connected to the Civil War.',
    requiredVisits: 3,
    imageKey: 'civil-war',
  },
  {
    name: 'Hidden in Plain Sight',
    tag: 'Plaque',
    key: 'hidden-in-plain-sight',
    classification: 'general' as const,
    description: 'Find three notable plaques around Harvard.',
    requiredVisits: 3,
    imageKey: 'plaque',
  },
  {
    name: 'Harvard Bookworm',
    tag: 'Books',
    key: 'harvard-bookworm',
    classification: 'general' as const,
    description: 'Visit two locations connected to books and literature.',
    requiredVisits: 2,
    imageKey: 'books',
  },
  {
    name: 'Indigenous Harvard',
    tag: 'Native American History',
    key: 'indigenous-harvard',
    classification: 'general' as const,
    description:
      'Visit two locations connected to Native American history.',
    requiredVisits: 2,
    imageKey: 'native-american-history',
  },
  {
    name: 'Layers of Harvard',
    tag: 'The Onion',
    key: 'layers-of-harvard',
    classification: 'special_place' as const,
    description: 'Visit The Onion, Alexander Calder’s 1965 sculpture.',
    requiredVisits: 1,
    imageKey: 'the-onion',
    rule: {
      type: 'location' as const,
      locationKey: 'the-onion',
    },
  },
] as const;

type BadgeRule =
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

function getDefinitionRule(definition: {
  rule?: BadgeRule;
  tag: string;
}) {
  return (
    definition.rule ?? {
      type: 'tag' as const,
      normalizedTag: normalizeBadgeTag(definition.tag),
    }
  );
}

function locationMatchesRule(
  location: {
    key?: string;
    badges: string[];
    storyKey?: string;
    regionKey?: string;
  },
  rule: BadgeRule,
) {
  switch (rule.type) {
    case 'tag':
      return location.badges.some(
        (tag) =>
          normalizeBadgeTag(tag) ===
          normalizeBadgeTag(rule.normalizedTag),
      );
    case 'location':
      return location.key === rule.locationKey;
    case 'any_location':
      return true;
    case 'story':
      return location.storyKey === rule.storyKey;
    case 'region':
      return location.regionKey === rule.regionKey;
    case 'same_story':
    case 'same_region':
      return true;
  }
}

function getGroupedLocationKey(
  location: { storyKey?: string; regionKey?: string },
  rule: BadgeRule,
) {
  if (rule.type === 'same_story') {
    return location.storyKey;
  }

  if (rule.type === 'same_region') {
    return location.regionKey;
  }

  return undefined;
}

function isGroupedRule(rule: BadgeRule) {
  return (
    rule.type === 'same_story' ||
    rule.type === 'same_region'
  );
}

function hasSameLocationIds(
  firstLocationIds: string[],
  secondLocationIds: string[],
) {
  if (firstLocationIds.length !== secondLocationIds.length) {
    return false;
  }

  const secondLocationIdSet = new Set(secondLocationIds);

  return firstLocationIds.every((locationId) =>
    secondLocationIdSet.has(locationId),
  );
}

function groupAvailabilityWindows(
  windows: Array<{
    badgeDefinitionId: string;
    startsAt: number;
    endsAt: number;
  }>,
) {
  const windowsByBadge = new Map<
    string,
    Array<{ startsAt: number; endsAt: number }>
  >();

  for (const window of windows) {
    const badgeWindows = windowsByBadge.get(
      window.badgeDefinitionId,
    );

    if (badgeWindows === undefined) {
      windowsByBadge.set(window.badgeDefinitionId, [
        {
          startsAt: window.startsAt,
          endsAt: window.endsAt,
        },
      ]);
    } else {
      badgeWindows.push({
        startsAt: window.startsAt,
        endsAt: window.endsAt,
      });
    }
  }

  return windowsByBadge;
}

function chooseLargestGroup(
  groups: Map<string, Set<Id<'locations'>>>,
) {
  return [...groups.entries()].sort(
    ([firstKey, firstIds], [secondKey, secondIds]) =>
      secondIds.size - firstIds.size ||
      firstKey.localeCompare(secondKey),
  )[0];
}

function isVisitWithinWindow(
  visitedAt: number,
  windows: Array<{ startsAt: number; endsAt: number }>,
) {
  return windows.some(
    (window) =>
      visitedAt >= window.startsAt &&
      visitedAt < window.endsAt,
  );
}

function getAvailableState(
  now: number,
  retired: boolean,
  windows: Array<{ startsAt: number; endsAt: number }>,
) {
  const activeWindow = windows.some(
    (window) =>
      now >= window.startsAt && now < window.endsAt,
  );

  return {
    available: !retired &&
      (windows.length === 0 || activeWindow),
    activeWindow,
  };
}

export const seedBadgeDefinitions = internalMutation({
  args: {},

  handler: async (ctx) => {
    let added = 0;
    let existing = 0;
    let updated = 0;

    for (const definition of BADGE_DEFINITIONS) {
      const savedDefinition = await ctx.db
        .query('badgeDefinitions')
        .withIndex('by_tag', (queryBuilder) =>
          queryBuilder.eq('tag', definition.tag),
        )
        .unique();

      const defaultRule: BadgeRule =
        'rule' in definition && definition.rule !== undefined
          ? definition.rule
          : {
              type: 'tag',
              normalizedTag: normalizeBadgeTag(definition.tag),
            };

      if (savedDefinition !== null) {
        existing += 1;

        const patch: {
          key?: string;
          classification?: BadgeClassification;
          rule?: BadgeRule;
          retired?: boolean;
        } = {};

        if (savedDefinition.key === undefined) {
          patch.key = definition.key;
        }
        if (savedDefinition.classification === undefined) {
          patch.classification = definition.classification;
        }
        if (savedDefinition.rule === undefined) {
          patch.rule = defaultRule;
        }
        if (savedDefinition.retired === undefined) {
          patch.retired = false;
        }

        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(savedDefinition._id, patch);
          updated += 1;
        }

        continue;
      }

      await ctx.db.insert('badgeDefinitions', {
        name: definition.name,
        tag: definition.tag,
        key: definition.key,
        description: definition.description,
        requiredVisits: definition.requiredVisits,
        classification: definition.classification,
        rule: defaultRule,
        retired: false,
        imageKey: definition.imageKey,
      });

      added += 1;
    }

    return {
      added,
      existing,
      updated,
      total: BADGE_DEFINITIONS.length,
    };
  },
});


export const syncMyAwards = mutation({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('You must sign in before syncing badges.');
    }

    const [
      definitions,
      visits,
      progress,
      awards,
      availabilityWindows,
    ] =
      await Promise.all([
        ctx.db.query('badgeDefinitions').collect(),
        ctx.db
          .query('visits')
          .withIndex('by_user', (queryBuilder) =>
            queryBuilder.eq('clerkUserId', identity.subject),
          )
          .collect(),
        ctx.db
          .query('badgeProgress')
          .withIndex('by_user', (queryBuilder) =>
            queryBuilder.eq('clerkUserId', identity.subject),
          )
          .collect(),
        ctx.db
          .query('badgeAwards')
          .withIndex('by_user', (queryBuilder) =>
            queryBuilder.eq('clerkUserId', identity.subject),
          )
          .collect(),
        ctx.db.query('badgeAvailabilityWindows').collect(),
      ]);

    const distinctLocationIds = [
      ...new Set(visits.map((visit) => visit.locationId)),
    ];
    const referencedLocations = await Promise.all(
      distinctLocationIds.map((locationId) =>
        ctx.db.get(locationId),
      ),
    );
    const locationsById = new Map(
      referencedLocations.flatMap((location) =>
        location === null
          ? []
          : [[location._id, location] as const],
      ),
    );
    const windowsByBadge = groupAvailabilityWindows(
      availabilityWindows,
    );
    const progressByBadge = new Map(
      progress.map((record) => [record.badgeDefinitionId, record]),
    );
    const awardByBadge = new Map(
      awards.map((award) => [award.badgeDefinitionId, award]),
    );
    const newlyAwarded: Array<{
      _id: typeof awards[number]['_id'];
      name: string;
      description: string;
      imageKey?: string;
    }> = [];
    const now = Date.now();

    for (const definition of definitions) {
      const windows = windowsByBadge.get(definition._id) ?? [];
      const storedProgress = progressByBadge.get(definition._id);
      const retired = definition.retired === true;
      const canRecalculate = !retired ||
        definition.retiredAt !== undefined;
      const rule = getDefinitionRule(definition);
      let selectedGroupKey: string | undefined;
      let visitedLocationIds: Id<'locations'>[] = [];

      if (!canRecalculate) {
        visitedLocationIds = storedProgress?.visitedLocationIds ?? [];
        selectedGroupKey = storedProgress?.groupKey;
      } else if (isGroupedRule(rule)) {
        const groups = new Map<
          string,
          Set<Id<'locations'>>
        >();

        for (const visit of visits) {
          if (
            definition.retiredAt !== undefined &&
            visit.visitedAt >= definition.retiredAt
          ) {
            continue;
          }

          if (
            windows.length > 0 &&
            !isVisitWithinWindow(visit.visitedAt, windows)
          ) {
            continue;
          }

          const location = locationsById.get(visit.locationId);
          const groupKey = location === undefined
            ? undefined
            : getGroupedLocationKey(location, rule);

          if (
            location !== undefined &&
            groupKey !== undefined
          ) {
            const group =
              groups.get(groupKey) ?? new Set<Id<'locations'>>();
            group.add(visit.locationId);
            groups.set(groupKey, group);
          }
        }

        const largestGroup = chooseLargestGroup(groups);

        selectedGroupKey = largestGroup?.[0];
        visitedLocationIds = largestGroup === undefined
          ? []
          : [...largestGroup[1]];
      } else {
        const eligibleLocationIds = new Set<Id<'locations'>>();

        for (const visit of visits) {
          if (
            definition.retiredAt !== undefined &&
            visit.visitedAt >= definition.retiredAt
          ) {
            continue;
          }

          if (
            windows.length > 0 &&
            !isVisitWithinWindow(visit.visitedAt, windows)
          ) {
            continue;
          }

          const location = locationsById.get(visit.locationId);

          if (
            location !== undefined &&
            locationMatchesRule(location, rule)
          ) {
            eligibleLocationIds.add(visit.locationId);
          }
        }

        visitedLocationIds = [...eligibleLocationIds];
      }

      const completedVisits = visitedLocationIds.length;
      const progressChanged =
        storedProgress === undefined ||
        storedProgress.completedVisits !== completedVisits ||
        storedProgress.groupKey !== selectedGroupKey ||
        !hasSameLocationIds(
          storedProgress.visitedLocationIds,
          visitedLocationIds,
        );

      if (progressChanged) {
        const progressRecord = {
          clerkUserId: identity.subject,
          badgeDefinitionId: definition._id,
          visitedLocationIds,
          groupKey: selectedGroupKey,
          completedVisits,
          updatedAt: now,
        };

        if (storedProgress === undefined) {
          await ctx.db.insert('badgeProgress', progressRecord);
        } else {
          await ctx.db.patch(storedProgress._id, progressRecord);
        }
      }

      if (
        completedVisits >= definition.requiredVisits &&
        awardByBadge.get(definition._id) === undefined
      ) {
        const awardId = await ctx.db.insert('badgeAwards', {
          clerkUserId: identity.subject,
          badgeDefinitionId: definition._id,
          earnedAt: now,
        });

        newlyAwarded.push({
          _id: awardId,
          name: definition.name,
          description: definition.description,
          imageKey: definition.imageKey,
        });
      }
    }

    return { newlyAwarded };
  },
});

export const getMyBadgeProgress = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return [];
    }

    const [
      definitions,
      progress,
      awards,
      availabilityWindows,
    ] = await Promise.all([
      ctx.db.query('badgeDefinitions').collect(),
      ctx.db
        .query('badgeProgress')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .collect(),
      ctx.db
        .query('badgeAwards')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .collect(),
      ctx.db.query('badgeAvailabilityWindows').collect(),
    ]);

    const progressByBadge = new Map(
      progress.map((record) => [record.badgeDefinitionId, record]),
    );
    const awardByBadge = new Map(
      awards.map((award) => [award.badgeDefinitionId, award]),
    );
    const windowsByBadge = groupAvailabilityWindows(
      availabilityWindows,
    );
    const now = Date.now();

    const badgeProgress = await Promise.all(
      definitions.map(async (definition) => {
        const windows = windowsByBadge.get(definition._id) ?? [];
        const completedVisits =
          progressByBadge.get(definition._id)?.completedVisits ?? 0;
        const earned = awardByBadge.has(definition._id);
        const retired = definition.retired === true;
        const { activeWindow, available } = getAvailableState(
          now,
          retired,
          windows,
        );
        const progress = definition.requiredVisits === 0
          ? 1
          : Math.min(
              completedVisits / definition.requiredVisits,
              1,
            );

        return {
          ...definition,
          rule: getDefinitionRule(definition),
          groupKey: progressByBadge.get(definition._id)?.groupKey,
          classification:
            definition.classification ?? 'general',
          retired,
          completedVisits,
          earned,
          inProgress: !earned && completedVisits > 0,
          unearned: !earned && completedVisits === 0,
          available,
          locked: !available && !retired,
          activeWindow,
          progress,
          progressPercentage: Math.round(progress * 100),
        };
      }),
    );

    return badgeProgress.sort((firstBadge, secondBadge) =>
      firstBadge.name.localeCompare(secondBadge.name),
    );
  },
});

export const getUnannouncedAwards = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return [];
    }

    const awards = await ctx.db
      .query('badgeAwards')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .collect();
    const unannouncedAwards = awards.filter(
      (award) => award.announcedAt === undefined,
    );

    return Promise.all(
      unannouncedAwards.map(async (award) => {
        const definition = await ctx.db.get(
          award.badgeDefinitionId,
        );

        return {
          _id: award._id,
          name: definition?.name ?? 'Badge earned',
          description: definition?.description ?? '',
          imageKey: definition?.imageKey,
        };
      }),
    );
  },
});

export const acknowledgeAward = mutation({
  args: {
    awardId: v.id('badgeAwards'),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('You must sign in first.');
    }

    const award = await ctx.db.get(args.awardId);

    if (
      award === null ||
      award.clerkUserId !== identity.subject
    ) {
      throw new ConvexError('Award not found.');
    }

    if (award.announcedAt === undefined) {
      await ctx.db.patch(args.awardId, {
        announcedAt: Date.now(),
      });
    }
  },
});
