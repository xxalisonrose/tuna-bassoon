import { ConvexError } from 'convex/values';

import type {
  MutationCtx,
  QueryCtx,
} from '../_generated/server';
import {
  isAdminSubject,
  isCommunityContributorSubject,
  isRegionalModeratorSubject,
  isSubmissionBlockedSubject,
} from './auth';

export const COMMUNITY_ACCOUNT_AGE_DAYS = 7;
export const COMMUNITY_UNIQUE_VISITS = 10;
export const COMMUNITY_DISTINCT_BADGES = 3;
export const COMMUNITY_MAX_OPEN_SUBMISSIONS = 3;

const DAY_MS = 24 * 60 * 60 * 1_000;

type CommunityContext = Pick<QueryCtx, 'auth' | 'db'> |
  Pick<MutationCtx, 'auth' | 'db'>;

export async function getCommunityContributorStatus(
  ctx: CommunityContext,
  clerkUserId: string,
) {
  const [profile, visits, awards] = await Promise.all([
    ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', clerkUserId),
      )
      .unique(),
    ctx.db
      .query('visits')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', clerkUserId),
      )
      .collect(),
    ctx.db
      .query('badgeAwards')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', clerkUserId),
      )
      .collect(),
  ]);

  const now = Date.now();
  const firstSeenCandidates = [
    profile?.createdAt,
    ...visits.map((visit) => visit.visitedAt),
    ...awards.map((award) => award.earnedAt),
  ].filter((value): value is number => value !== undefined);
  const firstSeenAt = firstSeenCandidates.length > 0
    ? Math.min(...firstSeenCandidates)
    : now;
  const accountAgeDays = Math.floor((now - firstSeenAt) / DAY_MS);
  const uniqueVisitCount = new Set(
    visits.map((visit) => visit.locationId),
  ).size;
  const distinctBadgeCount = new Set(
    awards.map((award) => award.badgeDefinitionId),
  ).size;
  const meetsEarnedRequirements =
    accountAgeDays >= COMMUNITY_ACCOUNT_AGE_DAYS &&
    uniqueVisitCount >= COMMUNITY_UNIQUE_VISITS &&
    distinctBadgeCount >= COMMUNITY_DISTINCT_BADGES;
  const isAdmin = isAdminSubject(clerkUserId);
  const isRegionalModerator =
    isRegionalModeratorSubject(clerkUserId) ||
    profile?.manualContentRole === 'regional_moderator';
  const hasManualContributorAccess =
    isCommunityContributorSubject(clerkUserId) ||
    profile?.manualContentRole === 'community_contributor';
  const isBlocked =
    !isAdmin && isSubmissionBlockedSubject(clerkUserId);
  const isCommunityContributor =
    !isBlocked &&
    (isAdmin ||
      isRegionalModerator ||
      hasManualContributorAccess ||
      meetsEarnedRequirements);
  const accessSource = isAdmin
    ? ('admin' as const)
    : isRegionalModerator
      ? ('regional_moderator' as const)
      : hasManualContributorAccess
        ? ('manual' as const)
        : meetsEarnedRequirements
          ? ('earned' as const)
          : null;

  return {
    isAdmin,
    isBlocked,
    isCommunityContributor,
    isRegionalModerator,
    canSubmitContent: isCommunityContributor,
    accessSource,
    contentRole: isAdmin
      ? ('admin' as const)
      : isRegionalModerator
        ? ('regional_moderator' as const)
        : isCommunityContributor
          ? ('community_contributor' as const)
          : ('explorer' as const),
    shouldShowCommunitySubmissionIntro:
      isCommunityContributor &&
      !isAdmin &&
      profile?.communitySubmissionIntroSeenAt === undefined,
    requirements: {
      accountAgeDays,
      accountAgeDaysRequired: COMMUNITY_ACCOUNT_AGE_DAYS,
      distinctBadgeCount,
      distinctBadgesRequired: COMMUNITY_DISTINCT_BADGES,
      uniqueVisitCount,
      uniqueVisitsRequired: COMMUNITY_UNIQUE_VISITS,
      meetsAccountAge:
        accountAgeDays >= COMMUNITY_ACCOUNT_AGE_DAYS,
      meetsDistinctBadges:
        distinctBadgeCount >= COMMUNITY_DISTINCT_BADGES,
      meetsUniqueVisits:
        uniqueVisitCount >= COMMUNITY_UNIQUE_VISITS,
    },
  };
}

export async function requireCommunityContributor(
  ctx: CommunityContext,
) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError('Authentication required.');
  }

  const status = await getCommunityContributorStatus(
    ctx,
    identity.subject,
  );

  if (!status.canSubmitContent) {
    throw new ConvexError('Community Contributor access required.');
  }

  return { identity, status };
}
