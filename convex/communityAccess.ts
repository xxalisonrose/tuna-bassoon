import { v } from 'convex/values';

import { internalQuery } from './_generated/server';
import { getCommunityContributorStatus } from './lib/communityContributor';

export const getForSubject = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) =>
    getCommunityContributorStatus(ctx, args.clerkUserId),
});
