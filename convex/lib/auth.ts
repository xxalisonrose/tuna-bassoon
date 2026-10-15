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

function getTrustedContributorSubjects() {
  return new Set(
    (process.env.TRUSTED_CONTRIBUTOR_CLERK_USER_IDS ?? '')
      .split(',')
      .map((subject) => subject.trim())
      .filter((subject) => subject.length > 0),
  );
}

export function isAdminSubject(subject: string) {
  return getAdminSubjects().has(subject);
}

export function isTrustedContributorSubject(subject: string) {
  return getTrustedContributorSubjects().has(subject);
}

export function canSubmitContent(subject: string) {
  return (
    isAdminSubject(subject) ||
    isTrustedContributorSubject(subject)
  );
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

export async function requireContentContributor(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError('Authentication required.');
  }

  if (!canSubmitContent(identity.subject)) {
    throw new ConvexError('Trusted Contributor access required.');
  }

  return identity;
}
