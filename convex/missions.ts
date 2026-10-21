import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';

const CURRENT_MISSION_VERSION = 2;
const TUTORIAL_MISSION_KEY = 'welcome-to-lorcal';
const LEGACY_TUTORIAL_MISSION_KEY = 'welcome-to-tuna-bassoon';
const TUTORIAL_BADGE_KEY = 'mission-new-explorer';
const TUTORIAL_REWARD_ITEM_ID = 'new_explorer_tee';

const missionDefinitions = [
  {
    key: TUTORIAL_MISSION_KEY,
    name: 'Welcome to Lorcal',
    description:
      'Complete three real activities to learn how exploring and rewards work.',
    steps: [
      {
        key: 'check-in-five-spots',
        title: 'Check In at 5 Places',
        summary: 'Explore five different map locations.',
        details:
          'Open map markers to discover nearby history, art, architecture, people, and curious stories. When your avatar is close enough to a location, check in. Each distinct check-in is saved in your Passport.',
        targetValue: 5,
      },
      {
        key: 'earn-a-badge',
        title: 'Earn a Badge',
        summary: 'Complete the requirements for any non-Mission badge.',
        details:
          'General badges can level up through repeated exploration. Theme badges connect related places. Special Place badges recognize one location, while Seasonal badges are available during a scheduled window. Earn any one of them to finish this goal.',
        targetValue: 1,
      },
      {
        key: 'customize-avatar',
        title: 'Customize Your Avatar',
        summary: 'Save a look in the Passport wardrobe.',
        details:
          'Open your Passport, choose Customize Avatar, mix clothing or accessories, and save the look. Mission rewards can add more wardrobe choices over time.',
        targetValue: 1,
      },
    ],
    rewards: {
      badge: {
        name: 'New Explorer',
        description: 'Completed the Lorcal tutorial mission.',
        imageKey: 'mission-tutorial',
      },
      avatarItems: [
        {
          id: TUTORIAL_REWARD_ITEM_ID,
          name: 'New Explorer Shirt',
          slot: 'Top',
        },
      ],
    },
  },
] as const;

type MissionDefinition = (typeof missionDefinitions)[number];
type DatabaseContext = Pick<QueryCtx | MutationCtx, 'db'>;

function findMissionDefinition(missionKey: string): MissionDefinition {
  const normalizedKey = missionKey === LEGACY_TUTORIAL_MISSION_KEY
    ? TUTORIAL_MISSION_KEY
    : missionKey;
  const definition = missionDefinitions.find(
    (candidate) => candidate.key === normalizedKey,
  );

  if (definition === undefined) {
    throw new ConvexError('Mission not found.');
  }

  return definition;
}

async function getTutorialProgressRecords(
  ctx: DatabaseContext,
  clerkUserId: string,
) {
  const records = await ctx.db
    .query('missionProgress')
    .withIndex('by_user', (queryBuilder) =>
      queryBuilder.eq('clerkUserId', clerkUserId),
    )
    .collect();

  return {
    current: records.find(
      (record) => record.missionKey === TUTORIAL_MISSION_KEY,
    ) ?? null,
    legacy: records.find(
      (record) => record.missionKey === LEGACY_TUTORIAL_MISSION_KEY,
    ) ?? null,
  };
}

async function getTutorialObjectiveState(
  ctx: DatabaseContext,
  clerkUserId: string,
) {
  const [visits, awards, profile] = await Promise.all([
    ctx.db
      .query('visits')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', clerkUserId),
      )
      .collect(),
    ctx.db
      .query('badgeAwards')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', clerkUserId),
      )
      .collect(),
    ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', clerkUserId),
      )
      .unique(),
  ]);
  const awardedDefinitionIds = [
    ...new Set(awards.map((award) => award.badgeDefinitionId)),
  ];
  const awardedDefinitions = await Promise.all(
    awardedDefinitionIds.map((definitionId) =>
      ctx.db.get(definitionId),
    ),
  );
  const earnedNonMissionBadgeCount = awardedDefinitions.filter(
    (definition) =>
      definition !== null && definition.classification !== 'mission',
  ).length;

  return {
    distinctVisitCount: new Set(
      visits.map((visit) => visit.locationId),
    ).size,
    earnedNonMissionBadgeCount,
    avatarCustomized: profile?.avatarCustomizedAt !== undefined,
  };
}

function buildTutorialSteps(
  definition: MissionDefinition,
  state: Awaited<ReturnType<typeof getTutorialObjectiveState>>,
) {
  const valuesByStepKey: Record<string, number> = {
    'check-in-five-spots': state.distinctVisitCount,
    'earn-a-badge': Math.min(state.earnedNonMissionBadgeCount, 1),
    'customize-avatar': state.avatarCustomized ? 1 : 0,
  };

  return definition.steps.map((step) => {
    const currentValue = Math.min(
      valuesByStepKey[step.key] ?? 0,
      step.targetValue,
    );

    return {
      ...step,
      currentValue,
      completed: currentValue >= step.targetValue,
      progressLabel: step.key === 'customize-avatar'
        ? currentValue >= step.targetValue
          ? 'Saved'
          : 'Not saved yet'
        : `${currentValue} of ${step.targetValue}`,
    };
  });
}

function sameKeys(first: readonly string[], second: readonly string[]) {
  return first.length === second.length &&
    first.every((key, index) => key === second[index]);
}

async function ensureTutorialBadgeDefinition(ctx: MutationCtx) {
  const existing = await ctx.db
    .query('badgeDefinitions')
    .withIndex('by_key', (queryBuilder) =>
      queryBuilder.eq('key', TUTORIAL_BADGE_KEY),
    )
    .unique();
  const badgeFields = {
    name: 'New Explorer',
    tag: 'mission-tutorial',
    key: TUTORIAL_BADGE_KEY,
    description: 'Completed the Lorcal tutorial mission.',
    requiredVisits: 1,
    classification: 'mission' as const,
    rule: { type: 'any_location' as const },
    retired: false,
    levelsEnabled: false,
    imageKey: 'mission-tutorial',
    congratulationsMessages: [
      'Tutorial complete! Your New Explorer Shirt is now unlocked.',
    ],
  };

  if (existing !== null) {
    await ctx.db.patch(existing._id, badgeFields);
    return existing._id;
  }

  return await ctx.db.insert('badgeDefinitions', badgeFields);
}

async function awardTutorialRewards(
  ctx: MutationCtx,
  clerkUserId: string,
  now: number,
) {
  const badgeDefinitionId = await ensureTutorialBadgeDefinition(ctx);
  const existingAward = await ctx.db
    .query('badgeAwards')
    .withIndex('by_user_badge_and_level', (queryBuilder) =>
      queryBuilder
        .eq('clerkUserId', clerkUserId)
        .eq('badgeDefinitionId', badgeDefinitionId)
        .eq('level', 1),
    )
    .unique();
  let badgeAwardId: Id<'badgeAwards'> | null = existingAward?._id ?? null;

  if (existingAward === null) {
    badgeAwardId = await ctx.db.insert('badgeAwards', {
      clerkUserId,
      badgeDefinitionId,
      level: 1,
      earnedAt: now,
    });
  }

  const profile = await ctx.db
    .query('userProfiles')
    .withIndex('by_user', (queryBuilder) =>
      queryBuilder.eq('clerkUserId', clerkUserId),
    )
    .unique();
  const currentUnlocks = profile?.unlockedAvatarItemIds ?? [];
  const unlockedAvatarItemIds = Array.from(
    new Set([...currentUnlocks, TUTORIAL_REWARD_ITEM_ID]),
  );

  if (profile === null) {
    await ctx.db.insert('userProfiles', {
      clerkUserId,
      avatarPresetId: 'explorer',
      avatarTopId: 'explorer_field',
      avatarBottomId: 'explorer_cargo',
      avatarShoesId: 'explorer_boots',
      avatarNeckId: 'rust_neckerchief',
      avatarFaceId: 'explorer_goggles',
      unlockedAvatarItemIds,
      createdAt: now,
      updatedAt: now,
    });
  } else if (!currentUnlocks.includes(TUTORIAL_REWARD_ITEM_ID)) {
    await ctx.db.patch(profile._id, {
      unlockedAvatarItemIds,
      updatedAt: now,
    });
  }

  return { badgeAwardId, unlockedAvatarItemIds };
}

async function revokeIncompleteLegacyRewards(
  ctx: MutationCtx,
  clerkUserId: string,
  now: number,
) {
  const badgeDefinition = await ctx.db
    .query('badgeDefinitions')
    .withIndex('by_key', (queryBuilder) =>
      queryBuilder.eq('key', TUTORIAL_BADGE_KEY),
    )
    .unique();

  if (badgeDefinition !== null) {
    const awards = await ctx.db
      .query('badgeAwards')
      .withIndex('by_user_and_badge', (queryBuilder) =>
        queryBuilder
          .eq('clerkUserId', clerkUserId)
          .eq('badgeDefinitionId', badgeDefinition._id),
      )
      .collect();
    await Promise.all(awards.map((award) => ctx.db.delete(award._id)));
  }

  const profile = await ctx.db
    .query('userProfiles')
    .withIndex('by_user', (queryBuilder) =>
      queryBuilder.eq('clerkUserId', clerkUserId),
    )
    .unique();

  if (profile !== null) {
    const unlockedAvatarItemIds = (
      profile.unlockedAvatarItemIds ?? []
    ).filter((itemId) => itemId !== TUTORIAL_REWARD_ITEM_ID);
    await ctx.db.patch(profile._id, {
      ...(profile.avatarTopId === TUTORIAL_REWARD_ITEM_ID
        ? {
            avatarPresetId: 'custom' as const,
            avatarTopId: 'trail_tank' as const,
          }
        : {}),
      unlockedAvatarItemIds,
      updatedAt: now,
    });
  }
}

export const getMyMissions = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return [];
    }

    const definition = missionDefinitions[0];
    const [records, objectiveState] = await Promise.all([
      getTutorialProgressRecords(ctx, identity.subject),
      getTutorialObjectiveState(ctx, identity.subject),
    ]);
    const progress = records.current ?? records.legacy;
    const steps = buildTutorialSteps(definition, objectiveState);
    const completedStepKeys = steps
      .filter((step) => step.completed)
      .map((step) => step.key);
    const allObjectivesComplete = steps.every((step) => step.completed);
    const introSeen = progress?.introSeenAt !== undefined;
    const shouldBeCompleted = allObjectivesComplete && introSeen;
    const completed =
      shouldBeCompleted &&
      progress?.completedAt !== undefined &&
      progress.version === CURRENT_MISSION_VERSION &&
      progress.missionKey === TUTORIAL_MISSION_KEY;
    const currentStep = steps.find((step) => !step.completed) ?? null;
    const needsSync =
      progress === null ||
      progress.missionKey !== TUTORIAL_MISSION_KEY ||
      progress.version !== CURRENT_MISSION_VERSION ||
      !sameKeys(progress.completedStepKeys, completedStepKeys) ||
      completed !== shouldBeCompleted;

    return [
      {
        ...definition,
        steps,
        currentStep,
        completedStepKeys,
        completedStepCount: completedStepKeys.length,
        stepCount: steps.length,
        completed,
        completedAt: completed ? progress?.completedAt ?? null : null,
        introSeen,
        needsSync,
      },
    ];
  },
});

export const acknowledgeMissionIntro = mutation({
  args: { missionKey: v.string() },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Authentication required.');
    }

    findMissionDefinition(args.missionKey);
    const records = await getTutorialProgressRecords(ctx, identity.subject);
    const existing = records.current ?? records.legacy;
    const now = Date.now();

    if (records.current !== null && records.legacy !== null) {
      await ctx.db.delete(records.legacy._id);
    }

    if (existing === null) {
      await ctx.db.insert('missionProgress', {
        clerkUserId: identity.subject,
        missionKey: TUTORIAL_MISSION_KEY,
        version: CURRENT_MISSION_VERSION,
        completedStepKeys: [],
        startedAt: now,
        introSeenAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        missionKey: TUTORIAL_MISSION_KEY,
        introSeenAt: existing.introSeenAt ?? now,
        updatedAt: now,
      });
    }

    return { acknowledgedAt: now };
  },
});

export const syncMyMissionProgress = mutation({
  args: { missionKey: v.string() },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError('Authentication required.');
    }

    const definition = findMissionDefinition(args.missionKey);
    const [records, objectiveState] = await Promise.all([
      getTutorialProgressRecords(ctx, identity.subject),
      getTutorialObjectiveState(ctx, identity.subject),
    ]);
    const existing = records.current ?? records.legacy;
    const steps = buildTutorialSteps(definition, objectiveState);
    const completedStepKeys = steps
      .filter((step) => step.completed)
      .map((step) => step.key);
    const allObjectivesComplete = steps.every((step) => step.completed);
    const introSeenAt = existing?.introSeenAt;
    const completed = allObjectivesComplete && introSeenAt !== undefined;
    const now = Date.now();
    const invalidLegacyCompletion =
      existing?.completedAt !== undefined && !completed;

    if (invalidLegacyCompletion) {
      await revokeIncompleteLegacyRewards(ctx, identity.subject, now);
    }

    if (completed) {
      await awardTutorialRewards(ctx, identity.subject, now);
    }

    if (records.current !== null && records.legacy !== null) {
      await ctx.db.delete(records.legacy._id);
    }

    const progressFields = {
      missionKey: TUTORIAL_MISSION_KEY,
      version: CURRENT_MISSION_VERSION,
      completedStepKeys,
      completedAt: completed
        ? existing?.completedAt ?? now
        : undefined,
      updatedAt: now,
    };

    if (existing === null) {
      await ctx.db.insert('missionProgress', {
        clerkUserId: identity.subject,
        startedAt: now,
        ...progressFields,
      });
    } else {
      await ctx.db.patch(existing._id, progressFields);
    }

    return {
      completed,
      completedStepKeys,
      rewardGranted: completed,
    };
  },
});
