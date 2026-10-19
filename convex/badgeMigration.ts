import { internalMutation, internalQuery } from './_generated/server';

const BADGE_CONGRATULATIONS_RESTORES = [
  {
    targetKey: 'artists-architects',
    sourceKey: 'artists-and-architects',
  },
  {
    targetKey: 'books-libraries',
    sourceKey: 'books-and-libraries',
  },
  {
    targetKey: 'bridges-infrastructure',
    sourceKey: 'bridges-and-infrastructure',
  },
  {
    targetKey: 'churches-religious-sites',
    sourceKey: 'churches-and-religious-sites',
  },
  {
    targetKey: 'folklore-legends',
    sourceKey: 'folklore-and-legends',
  },
  {
    targetKey: 'historic-buildings-homes',
    sourceKey: 'historic-buildings-and-homes',
  },
  {
    targetKey: 'inventors-scientists',
    sourceKey: 'inventors-and-scientists',
  },
  {
    targetKey: 'memorials-monuments',
    sourceKey: 'memorials-and-monuments',
  },
  {
    targetKey: 'midnight-ride',
    sourceKey: 'paul-reveres-midnight-ride',
  },
  {
    targetKey: 'museums-collections',
    sourceKey: 'museums-and-collections',
  },
  {
    targetKey: 'musicians-performers',
    sourceKey: 'musicians-and-performers',
  },
  {
    targetKey: 'statues-sculpture',
    sourceKey: 'statues-and-sculpture',
  },
  {
    targetKey: 'women-s-history',
    sourceKey: 'women-history',
  },
  {
    targetKey: 'writers-poets',
    sourceKey: 'writers-and-poets',
  },
] as const;

const BADGE_CONGRATULATIONS_MANUAL_REVIEW = [
  {
    key: 'architecture',
    reason:
      'No earlier ten-message custom pool exists in the current database or source document.',
  },
] as const;

function messagesMatch(first: string[], second: string[]) {
  return (
    first.length === second.length &&
    first.every((message, index) => message === second[index])
  );
}

function validateRestorationSource(
  sourceKey: string,
  messages: string[] | undefined,
) {
  const normalized = (messages ?? []).map((message) => message.trim());

  if (
    normalized.length !== 10 ||
    normalized.some((message) => !message) ||
    new Set(normalized.map((message) => message.toLowerCase())).size !== 10
  ) {
    throw new Error(
      `Badge ${sourceKey} does not contain a valid ten-message restoration pool.`,
    );
  }

  return normalized;
}

export const previewCongratulationsMessageRestore = internalQuery({
  args: {},

  handler: async (ctx) => {
    const definitions = await ctx.db
      .query('badgeDefinitions')
      .collect();
    const definitionsByKey = new Map(
      definitions.map((definition) => [definition.key, definition]),
    );

    const recoverable = BADGE_CONGRATULATIONS_RESTORES.map((restore) => {
      const target = definitionsByKey.get(restore.targetKey);
      const source = definitionsByKey.get(restore.sourceKey);
      const sourceMessages = validateRestorationSource(
        restore.sourceKey,
        source?.congratulationsMessages,
      );
      const targetMessages = target?.congratulationsMessages ?? [];

      return {
        targetKey: restore.targetKey,
        targetName: target?.name ?? null,
        sourceKey: restore.sourceKey,
        sourceName: source?.name ?? null,
        currentMessageCount: targetMessages.length,
        restoredMessageCount: sourceMessages.length,
        status:
          target === undefined
            ? 'missing_target'
            : messagesMatch(targetMessages, sourceMessages)
              ? 'already_restored'
              : 'ready_to_restore',
      };
    });

    return {
      readyToRestore: recoverable.filter(
        (record) => record.status === 'ready_to_restore',
      ).length,
      alreadyRestored: recoverable.filter(
        (record) => record.status === 'already_restored',
      ).length,
      recoverable,
      manualReview: BADGE_CONGRATULATIONS_MANUAL_REVIEW,
    };
  },
});

export const restoreCongratulationsMessages = internalMutation({
  args: {},

  handler: async (ctx) => {
    const definitions = await ctx.db
      .query('badgeDefinitions')
      .collect();
    const definitionsByKey = new Map(
      definitions.map((definition) => [definition.key, definition]),
    );
    const restored: string[] = [];
    const unchanged: string[] = [];

    for (const restore of BADGE_CONGRATULATIONS_RESTORES) {
      const target = definitionsByKey.get(restore.targetKey);
      const source = definitionsByKey.get(restore.sourceKey);

      if (target === undefined) {
        throw new Error(`Missing restoration target: ${restore.targetKey}`);
      }

      const sourceMessages = validateRestorationSource(
        restore.sourceKey,
        source?.congratulationsMessages,
      );

      if (
        messagesMatch(
          target.congratulationsMessages ?? [],
          sourceMessages,
        )
      ) {
        unchanged.push(restore.targetKey);
        continue;
      }

      await ctx.db.patch(target._id, {
        congratulationsMessages: sourceMessages,
      });
      restored.push(restore.targetKey);
    }

    return {
      restoredCount: restored.length,
      restored,
      unchangedCount: unchanged.length,
      unchanged,
      manualReview: BADGE_CONGRATULATIONS_MANUAL_REVIEW,
    };
  },
});

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
      const matchingDefinitions = await ctx.db
        .query('badgeDefinitions')
        .withIndex('by_tag', (queryBuilder) =>
          queryBuilder.eq('tag', migration.legacyTag),
        )
        .collect();
      const definition = matchingDefinitions.find(
        (candidate) => candidate.name === migration.name,
      ) ?? null;

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
