import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  locations: defineTable({
    name: v.string(),
    key: v.optional(v.string()),

    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    description: v.string(),

    badges: v.array(v.string()),

    category: v.optional(v.string()),
    storyKey: v.optional(v.string()),
    regionKey: v.optional(v.string()),
  }),

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
    requiredVisits: v.number(),
    classification: v.optional(
      v.union(
        v.literal('general'),
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
      ),
    ),
    retired: v.optional(v.boolean()),
    retiredAt: v.optional(v.number()),
    imageKey: v.optional(v.string()),
    })
      .index('by_tag', ['tag'])
      .index('by_key', ['key']),

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
      earnedAt: v.number(),
      announcedAt: v.optional(v.number()),
    })
      .index('by_user', ['clerkUserId'])
      .index('by_user_and_badge', [
        'clerkUserId',
        'badgeDefinitionId',
      ]),
});