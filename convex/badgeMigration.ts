import { internalMutation, internalQuery } from './_generated/server';

const LEGACY_BADGE_MIGRATIONS = [
  {
    name: 'Statue Explorer',
    legacyTag: 'Statue',
    normalizedTag: 'statue',
    key: 'statue-explorer',
    classification: 'general' as const,
  },
  {
    name: 'Ghost Story Hunter',
    legacyTag: 'Ghost Stories',
    normalizedTag: 'ghost-stories',
    key: 'ghost-story-hunter',
    classification: 'general' as const,
  },
  {
    name: 'People of Harvard',
    legacyTag: 'Interesting People',
    normalizedTag: 'interesting-people',
    key: 'people-of-harvard',
    classification: 'general' as const,
  },
  {
    name: 'Revolutionary Harvard',
    legacyTag: 'Revolutionary War',
    normalizedTag: 'revolutionary-war',
    key: 'revolutionary-harvard',
    classification: 'general' as const,
  },
  {
    name: 'Harvard Art Explorer',
    legacyTag: 'Art',
    normalizedTag: 'art',
    key: 'harvard-art-explorer',
    classification: 'general' as const,
  },
  {
    name: 'Civil War Historian',
    legacyTag: 'Civil War',
    normalizedTag: 'civil-war',
    key: 'civil-war-historian',
    classification: 'general' as const,
  },
  {
    name: 'Hidden in Plain Sight',
    legacyTag: 'Plaque',
    normalizedTag: 'plaque',
    key: 'hidden-in-plain-sight',
    classification: 'general' as const,
  },
  {
    name: 'Harvard Bookworm',
    legacyTag: 'Books',
    normalizedTag: 'books',
    key: 'harvard-bookworm',
    classification: 'general' as const,
  },
  {
    name: 'Indigenous Harvard',
    legacyTag: 'Native American History',
    normalizedTag: 'native-american-history',
    key: 'indigenous-harvard',
    classification: 'general' as const,
  },
] as const;

export const backfillBadgeDefinitions = internalMutation({
  args: {},

  handler: async (ctx) => {
    let updated = 0;

    for (const migration of LEGACY_BADGE_MIGRATIONS) {
      const definition = await ctx.db
        .query('badgeDefinitions')
        .withIndex('by_tag', (queryBuilder) =>
          queryBuilder.eq('tag', migration.legacyTag),
        )
        .unique();

      if (definition === null) {
        throw new Error(
          `Missing legacy badge record: ${migration.name}`,
        );
      }

      await ctx.db.patch(definition._id, {
        key: migration.key,
        classification: migration.classification,
        rule: {
          type: 'tag',
          normalizedTag: migration.normalizedTag,
        },
        retired: false,
      });

      updated += 1;
    }

    return {
      updated,
      expected: LEGACY_BADGE_MIGRATIONS.length,
    };
  },
});

export const verifyBadgeDefinitionBackfill = internalQuery({
  args: {},

  handler: async (ctx) => {
    const definitions = await ctx.db
      .query('badgeDefinitions')
      .collect();

    const expectedLegacyTags = new Set<string>(
      LEGACY_BADGE_MIGRATIONS.map(
        (migration) => migration.legacyTag,
      ),
    );

    const migratedDefinitions = definitions.filter(
      (definition) =>
        expectedLegacyTags.has(definition.tag) &&
        definition.key !== undefined &&
        definition.classification !== undefined &&
        definition.rule !== undefined &&
        definition.retired !== undefined,
    );

    const keys = definitions
      .map((definition) => definition.key)
      .filter((key): key is string => key !== undefined);

    return {
      totalDefinitions: definitions.length,
      expectedMigratedDefinitions:
        LEGACY_BADGE_MIGRATIONS.length,
      migratedDefinitions: migratedDefinitions.length,
      incompleteLegacyDefinitions: definitions.filter(
        (definition) =>
          expectedLegacyTags.has(definition.tag) &&
          (definition.key === undefined ||
            definition.classification === undefined ||
            definition.rule === undefined ||
            definition.retired === undefined),
      ).length,
      duplicateKeys: keys.filter(
        (key, index) => keys.indexOf(key) !== index,
      ),
    };
  },
});