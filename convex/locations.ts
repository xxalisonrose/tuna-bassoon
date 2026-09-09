import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addLocation = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    category: v.string(),
    city: v.string(),
    state: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("locations", {
      name: args.title,
      description: args.description,
      latitude: args.latitude,
      longitude: args.longitude,
      category: args.category,
      badges: [],
    });
  },
});

export const getLocations = query({
  args: {},

  handler: async (ctx) => {
    return await ctx.db.query("locations").collect();
  },
});
