import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  locations: defineTable({
    name: v.string(),

    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    description: v.string(),

    badges: v.array(v.string()),

    category: v.optional(v.string()),
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
    description: v.string(),
    requiredVisits: v.number(),
    imageKey: v.optional(v.string()),
  }).index('by_tag', ['tag']),
});