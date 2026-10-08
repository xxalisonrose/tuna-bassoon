import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  locations: defineTable({
    name: v.string(),
    key: v.optional(v.string()),

    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    description: v.string(),
    funFact: v.optional(v.string()),
    source: v.optional(v.string()),
    isLore: v.optional(v.boolean()),

    badges: v.array(v.string()),

    category: v.optional(v.string()),
    storyKey: v.optional(v.string()),
    regionKey: v.optional(v.string()),
    retired: v.optional(v.boolean()),
    retiredAt: v.optional(v.number()),
  }).index('by_key', ['key']),

  visits: defineTable({
    clerkUserId: v.string(),
    locationId: v.id('locations'),
    visitedAt: v.number(),
    distanceMeters: v.number(),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_user_and_location', [
      'clerkUserId',
      'locationId',
    ]),

  badgeDefinitions: defineTable({
    name: v.string(),
    tag: v.string(),
    key: v.optional(v.string()),
    description: v.string(),
    funFact: v.optional(v.string()),
    source: v.optional(v.string()),
    requiredVisits: v.number(),
    classification: v.optional(
      v.union(
        v.literal('general'),
        v.literal('theme'),
        v.literal('special_place'),
        v.literal('seasonal'),
      ),
    ),
    rule: v.optional(
      v.union(
        v.object({
          type: v.literal('tag'),
          normalizedTag: v.string(),
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
      ),
    ),
    retired: v.optional(v.boolean()),
    retiredAt: v.optional(v.number()),
    imageKey: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    annualSeriesId: v.optional(v.id('badgeAnnualSeries')),
    editionYear: v.optional(v.number()),
    levelsEnabled: v.optional(v.boolean()),
    congratulationsMessages: v.optional(v.array(v.string())),
    // Legacy level-range entries remain valid but are no longer used.
    levelCelebrations: v.optional(
      v.array(
        v.object({
          maximumLevel: v.number(),
          title: v.string(),
          message: v.string(),
        }),
      ),
    ),
    })
      .index('by_tag', ['tag'])
      .index('by_key', ['key'])
      .index('by_annual_series_and_year', [
        'annualSeriesId',
        'editionYear',
      ]),

    badgeAnnualSeries: defineTable({
    key: v.string(),
    name: v.string(),
    enabled: v.boolean(),
    latestEditionYear: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  badgeAvailabilityWindows: defineTable({
      badgeDefinitionId: v.id('badgeDefinitions'),
      key: v.string(),
      startsAt: v.number(),
      endsAt: v.number(),
    })
      .index('by_badge', ['badgeDefinitionId'])
      .index('by_badge_and_key', [
        'badgeDefinitionId',
        'key',
      ]),

    badgeProgress: defineTable({
      clerkUserId: v.string(),
      badgeDefinitionId: v.id('badgeDefinitions'),
      visitedLocationIds: v.array(v.id('locations')),
      groupKey: v.optional(v.string()),
      completedVisits: v.number(),
      updatedAt: v.number(),
    })
      .index('by_user', ['clerkUserId'])
      .index('by_user_and_badge', [
        'clerkUserId',
        'badgeDefinitionId',
      ]),

    badgeAwards: defineTable({
      clerkUserId: v.string(),
      badgeDefinitionId: v.id('badgeDefinitions'),
      level: v.optional(v.number()),
      earnedAt: v.number(),
      announcedAt: v.optional(v.number()),
    })
      .index('by_user', ['clerkUserId'])
      .index('by_user_and_badge', [
        'clerkUserId',
        'badgeDefinitionId',
      ])
      .index('by_user_badge_and_level', [
        'clerkUserId',
        'badgeDefinitionId',
        'level',
      ]),

    // Kept temporarily so an existing development shared-bank row remains
    // schema-valid while badge-specific pools replace it.
    badgeCongratulations: defineTable({
      key: v.literal('shared'),
      messages: v.array(
        v.object({
          message: v.string(),
          retired: v.boolean(),
        }),
      ),
      updatedAt: v.number(),
      updatedByClerkUserId: v.string(),
    }).index('by_key', ['key']),
});
