import { ConvexError } from 'convex/values';

type AuthContext = {
  auth: {
    getUserIdentity: () => Promise<{
      subject: string;
      [key: string]: unknown;
    } | null>;
  };
};

function getAdminSubjects() {
  return new Set(
    (process.env.ADMIN_CLERK_USER_IDS ?? '')
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => subject.length > 0),
  );
}

function getCommunityContributorSubjects() {
  return new Set(
    [
      process.env.COMMUNITY_CONTRIBUTOR_CLERK_USER_IDS,
      process.env.TRUSTED_CONTRIBUTOR_CLERK_USER_IDS,
    ]
      .filter(Boolean)
      .join(',')
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => subject.length > 0),
  );
}

function getRegionalModeratorSubjects() {
  return new Set(
    (process.env.REGIONAL_MODERATOR_CLERK_USER_IDS ?? '')
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => subject.length > 0),
  );
}

function getBlockedSubmissionSubjects() {
  return new Set(
    (process.env.COMMUNITY_SUBMISSION_BLOCKED_CLERK_USER_IDS ?? '')
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => subject.length > 0),
  );
}

export function isAdminSubject(subject: string) {
  return getAdminSubjects().has(subject);
}

export function isCommunityContributorSubject(subject: string) {
  return getCommunityContributorSubjects().has(subject);
}

export function isRegionalModeratorSubject(subject: string) {
  return getRegionalModeratorSubjects().has(subject);
}

export function isSubmissionBlockedSubject(subject: string) {
  return getBlockedSubmissionSubjects().has(subject);
}

export async function requireAdmin(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError('Authentication required.');
  }

  if (!isAdminSubject(identity.subject)) {
    throw new ConvexError('Administrator access required.');
  }

  return identity;
}

export async function requireAuthenticatedIdentity(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError('Authentication required.');
  }

  return identity;
}
