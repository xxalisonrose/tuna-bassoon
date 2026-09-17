import { mutation, query } from './_generated/server';

const BADGE_DEFINITIONS = [
  {
    name: 'Statue Explorer',
    tag: 'Statue',
    description: 'Visit five locations featuring notable statues.',
    requiredVisits: 5,
    imageKey: 'statue',
  },
  {
    name: 'Ghost Story Hunter',
    tag: 'Ghost Stories',
    description: 'Visit five locations connected to Harvard ghost stories.',
    requiredVisits: 5,
    imageKey: 'ghost-stories',
  },
  {
    name: 'People of Harvard',
    tag: 'Interesting People',
    description: 'Visit five locations associated with interesting people.',
    requiredVisits: 5,
    imageKey: 'interesting-people',
  },
  {
    name: 'Revolutionary Harvard',
    tag: 'Revolutionary War',
    description: 'Visit three Revolutionary War locations.',
    requiredVisits: 3,
    imageKey: 'revolutionary-war',
  },
  {
    name: 'Harvard Art Explorer',
    tag: 'Art',
    description: 'Visit three locations connected to art.',
    requiredVisits: 3,
    imageKey: 'art',
  },
  {
    name: 'Civil War Historian',
    tag: 'Civil War',
    description: 'Visit three locations connected to the Civil War.',
    requiredVisits: 3,
    imageKey: 'civil-war',
  },
  {
    name: 'Hidden in Plain Sight',
    tag: 'Plaque',
    description: 'Find three notable plaques around Harvard.',
    requiredVisits: 3,
    imageKey: 'plaque',
  },
  {
    name: 'Harvard Bookworm',
    tag: 'Books',
    description: 'Visit two locations connected to books and literature.',
    requiredVisits: 2,
    imageKey: 'books',
  },
  {
    name: 'Indigenous Harvard',
    tag: 'Native American History',
    description:
      'Visit two locations connected to Native American history.',
    requiredVisits: 2,
    imageKey: 'native-american-history',
  },
] as const;

export const seedBadgeDefinitions = mutation({
  args: {},

  handler: async (ctx) => {
    let added = 0;
    let existing = 0;

    for (const definition of BADGE_DEFINITIONS) {
      const savedDefinition = await ctx.db
        .query('badgeDefinitions')
        .withIndex('by_tag', (queryBuilder) =>
          queryBuilder.eq('tag', definition.tag),
        )
        .unique();

      if (savedDefinition !== null) {
        existing += 1;
        continue;
      }

      await ctx.db.insert('badgeDefinitions', {
        name: definition.name,
        tag: definition.tag,
        description: definition.description,
        requiredVisits: definition.requiredVisits,
        imageKey: definition.imageKey,
      });

      added += 1;
    }

    return {
      added,
      existing,
      total: BADGE_DEFINITIONS.length,
    };
  },
});

export const getMyBadgeProgress = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return [];
    }

    const [definitions, visits] = await Promise.all([
      ctx.db.query('badgeDefinitions').collect(),
      ctx.db
        .query('visits')
        .withIndex('by_user', (queryBuilder) =>
          queryBuilder.eq('clerkUserId', identity.subject),
        )
        .collect(),
    ]);

    const visitedLocations = await Promise.all(
      visits.map((visit) => ctx.db.get(visit.locationId)),
    );

    const visitsByTag = new Map<string, number>();

    for (const location of visitedLocations) {
      if (location === null) {
        continue;
      }

      const uniqueTags = new Set(location.badges);

      for (const tag of uniqueTags) {
        visitsByTag.set(tag, (visitsByTag.get(tag) ?? 0) + 1);
      }
    }

    return definitions
      .map((definition) => {
        const completedVisits =
          visitsByTag.get(definition.tag) ?? 0;

        return {
          ...definition,
          completedVisits,
          earned:
            completedVisits >= definition.requiredVisits,
          progress:
            definition.requiredVisits === 0
              ? 1
              : Math.min(
                  completedVisits /
                    definition.requiredVisits,
                  1,
                ),
        };
      })
      .sort((firstBadge, secondBadge) =>
        firstBadge.name.localeCompare(secondBadge.name),
      );
  },
});