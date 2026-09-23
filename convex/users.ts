import { query } from './_generated/server';
import { isAdminSubject } from './lib/auth';

export const getCurrentUser = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return null;
    }

    return {
      clerkUserId: identity.subject,
      name: identity.name,
      email: identity.email,
      isAdmin: isAdminSubject(identity.subject),
    };
  },
});
