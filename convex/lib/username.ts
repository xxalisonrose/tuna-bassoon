import { ConvexError } from 'convex/values';

import { containsBlockedUsernameContent } from './contentModeration';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_CHANGE_COOLDOWN_DAYS = 7;

const usernamePattern = /^[A-Za-z0-9][A-Za-z0-9_-]*[A-Za-z0-9]$/;
const reservedUsernames = new Set([
  'admin',
  'administrator',
  'moderator',
  'official',
  'staff',
  'support',
  'system',
  'tuna-bassoon',
  'tunabassoon',
]);

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string) {
  const username = value.trim();
  const normalized = normalizeUsername(username);

  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    throw new ConvexError(
      `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`,
    );
  }

  if (!usernamePattern.test(username)) {
    throw new ConvexError(
      'Username must begin and end with a letter or number and may also contain underscores or hyphens.',
    );
  }

  if (reservedUsernames.has(normalized)) {
    throw new ConvexError('That username is reserved. Choose another.');
  }

  if (containsBlockedUsernameContent(username)) {
    throw new ConvexError('That username is not allowed. Choose another.');
  }

  return { normalized, username };
}
