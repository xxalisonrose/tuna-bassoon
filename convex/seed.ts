import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedLocations = mutation({
  args: {
    locations: v.array(
      v.object({
        name: v.string(),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        description: v.string(),
        badges: v.array(v.string()),
        category: v.optional(v.string()),
      })
    ),
  },

  handler: async (ctx, args) => {
    for (const location of args.locations) {
      await ctx.db.insert("locations", location);
    }

    return args.locations.length;
  },
});