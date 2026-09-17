import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

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

export const getLocation = internalQuery({
  args: { locationId: v.id("locations") },

  handler: async (ctx, args) => {
    return await ctx.db.get(args.locationId);
  },
});

export const saveDescription = internalMutation({
  args: {
    locationId: v.id("locations"),
    description: v.string(),
  },

  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.locationId);

    if (location === null) {
      throw new Error("Location not found.");
    }

    await ctx.db.patch(args.locationId, {
      description: args.description,
    });
  },
});
