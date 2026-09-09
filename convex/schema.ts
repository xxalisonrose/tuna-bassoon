import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  locations: defineTable({
    name: v.string(),

    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    description: v.string(),

    badges: v.array(v.string()),

    category: v.optional(v.string()),
  }),
});