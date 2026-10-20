import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { requireAdmin } from './lib/auth';
import {
  COMMUNITY_MAX_OPEN_SUBMISSIONS,
  requireCommunityContributor,
} from './lib/communityContributor';
import { DEFAULT_BADGE_CONGRATULATIONS } from './lib/badge_congratulations';
import { moderateLocationSubmission } from './lib/contentModeration';
import { suggestLocationSubmission } from './lib/contentSubmissionSuggestions';

const reviewStatusValidator = v.union(
  v.literal('ready'),
  v.literal('needs_attention'),
  v.literal('possible_duplicate'),
  v.literal('suggested_edit'),
  v.literal('already_published'),
  v.literal('published'),
  v.literal('kept_existing'),
  v.literal('dismissed'),
  v.literal('rejected_by_filter'),
);

const classificationValidator = v.union(
  v.literal('general'),
  v.literal('theme'),
  v.literal('special_place'),
  v.literal('seasonal'),
);

const mapPinTypeValidator = v.union(
  v.literal('historic_sites'),
  v.literal('monuments_public_art'),
  v.literal('mystery_lore'),
  v.literal('noteworthy_people'),
  v.literal('other_discoveries'),
);

const importConfidenceValidator = v.union(
  v.literal('high'),
  v.literal('medium'),
  v.literal('low'),
);

const locationDraftValidator = v.object({
  sourceOrdinal: v.optional(v.number()),
  sourceText: v.string(),
  sourceWasMarkedComplete: v.boolean(),
  name: v.string(),
  key: v.string(),
  description: v.string(),
  funFact: v.optional(v.string()),
  source: v.optional(v.string()),
  loreText: v.optional(v.string()),
  isLore: v.boolean(),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  category: v.optional(v.string()),
  mapPinType: v.optional(mapPinTypeValidator),
  badges: v.array(v.string()),
  submittedLocationInput: v.optional(v.string()),
  submitterLocationNotes: v.optional(v.string()),
  moderationFlags: v.optional(v.array(v.string())),
  importConfidence: v.optional(importConfidenceValidator),
  suggestionNotes: v.optional(v.array(v.string())),
  issues: v.array(v.string()),
});

const badgeDraftValidator = v.object({
  sourceOrdinal: v.optional(v.number()),
  sourceText: v.string(),
  sourceWasMarkedComplete: v.boolean(),
  name: v.string(),
  key: v.string(),
  tag: v.string(),
  description: v.string(),
  classification: classificationValidator,
  requiredVisits: v.number(),
  levelsEnabled: v.boolean(),
  congratulationsMessages: v.array(v.string()),
  importConfidence: v.optional(importConfidenceValidator),
  suggestionNotes: v.optional(v.array(v.string())),
  issues: v.array(v.string()),
});

const locationActionValidator = v.union(
  v.literal('publish_new'),
  v.literal('replace_existing'),
  v.literal('merge_missing'),
  v.literal('keep_existing'),
  v.literal('dismiss'),
  v.literal('reopen'),
);

const badgeActionValidator = v.union(
  v.literal('publish_new'),
  v.literal('replace_existing'),
  v.literal('merge_missing'),
  v.literal('keep_existing'),
  v.literal('dismiss'),
  v.literal('reopen'),
);

const locationCategories = new Set([
  'History & Heritage',
  'Culture & Arts',
  'Literature & Libraries',
  'People & Community',
  'Science & Nature',
  'Architecture & Places',
  'Weird & Curious',
]);

function normalizedText(value: string | undefined) {
  return (value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function comparableText(value: string | undefined) {
  return (value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function comparableStringList(values: string[] | undefined) {
  return (values ?? [])
    .map((value) => comparableText(value).toLowerCase())
    .filter(Boolean)
    .sort();
}

type ComparableLocation = {
  name: string;
  key?: string;
  description: string;
  funFact?: string;
  source?: string;
  isLore?: boolean;
  latitude?: number;
  longitude?: number;
  category?: string;
  mapPinType?: string;
  badges: string[];
};

const submissionLimits = {
  description: 5_000,
  funFact: 1_000,
  locationInput: 1_500,
  locationNotes: 1_000,
  name: 120,
  source: 1_000,
} as const;

function requireSubmissionText(
  value: string,
  label: string,
  maximumLength: number,
) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new ConvexError(`${label} is required.`);
  }
  if (trimmed.length > maximumLength) {
    throw new ConvexError(
      `${label} must be ${maximumLength.toLocaleString()} characters or fewer.`,
    );
  }

  return trimmed;
}

type ComparableBadge = {
  name: string;
  key?: string;
  tag: string;
  description: string;
  classification?: 'general' | 'theme' | 'special_place' | 'seasonal';
  requiredVisits: number;
  levelsEnabled?: boolean;
  congratulationsMessages?: string[];
};

function locationFingerprint(value: ComparableLocation) {
  return JSON.stringify({
    name: comparableText(value.name),
    key: comparableText(value.key),
    description: comparableText(value.description),
    funFact: comparableText(value.funFact),
    source: comparableText(value.source),
    isLore: value.isLore === true,
    latitude: value.latitude ?? null,
    longitude: value.longitude ?? null,
    category: comparableText(value.category),
    mapPinType: comparableText(value.mapPinType),
    badges: comparableStringList(value.badges),
  });
}

function badgeFingerprint(value: ComparableBadge) {
  return JSON.stringify({
    name: comparableText(value.name),
    key: comparableText(value.key),
    tag: comparableText(value.tag).toLowerCase(),
    description: comparableText(value.description),
    classification: value.classification ?? 'general',
    requiredVisits: value.requiredVisits,
    levelsEnabled: value.levelsEnabled === true,
    congratulationsMessages: (value.congratulationsMessages ?? []).map(
      comparableText,
    ),
  });
}

function badgeMatchesPublished(
  draft: ComparableBadge,
  published: Doc<'badgeDefinitions'>,
) {
  const draftMessages = (draft.congratulationsMessages ?? []).map(
    comparableText,
  );
  const publishedMessages = (published.congratulationsMessages ?? []).map(
    comparableText,
  );

  return (
    comparableText(draft.name) === comparableText(published.name) &&
    comparableText(draft.key) === comparableText(published.key) &&
    comparableText(draft.tag).toLowerCase() ===
      comparableText(published.tag).toLowerCase() &&
    comparableText(draft.description) ===
      comparableText(published.description) &&
    (draft.classification ?? 'general') ===
      (published.classification ?? 'general') &&
    draft.requiredVisits === published.requiredVisits &&
    (draft.levelsEnabled === true) === (published.levelsEnabled === true) &&
    draftMessages.length > 0 &&
    draftMessages.every(
      (message, index) => message === publishedMessages[index],
    )
  );
}

function isUsableSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function getDistanceMeters(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getLocationMatch(
  draft: {
    key: string;
    name: string;
    latitude?: number;
    longitude?: number;
  },
  locations: Doc<'locations'>[],
) {
  const exact = locations.find(
    (location) =>
      (location.key && location.key === draft.key) ||
      normalizedText(location.name) === normalizedText(draft.name),
  );

  if (exact) {
    return { location: exact, exact: true, distanceMeters: 0 };
  }

  if (draft.latitude === undefined || draft.longitude === undefined) {
    return null;
  }

  let closest: Doc<'locations'> | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const location of locations) {
    if (location.latitude === undefined || location.longitude === undefined) {
      continue;
    }

    const distance = getDistanceMeters(
      { latitude: draft.latitude, longitude: draft.longitude },
      { latitude: location.latitude, longitude: location.longitude },
    );

    if (distance < closestDistance) {
      closest = location;
      closestDistance = distance;
    }
  }

  return closest && closestDistance <= 75
    ? { location: closest, exact: false, distanceMeters: closestDistance }
    : null;
}

function getBadgeMatch(
  draft: { key: string; tag: string; name: string },
  definitions: Doc<'badgeDefinitions'>[],
) {
  return (
    definitions.find(
      (definition) => definition.key && definition.key === draft.key,
    ) ??
    definitions.find(
      (definition) =>
        normalizedText(definition.tag) === normalizedText(draft.tag) ||
        normalizedText(definition.name) === normalizedText(draft.name),
    ) ??
    null
  );
}

function getInitialStatus(
  issues: string[],
  match: { exact: boolean } | null,
) {
  if (match?.exact) {
    return 'suggested_edit' as const;
  }
  if (match) {
    return 'possible_duplicate' as const;
  }
  return issues.length > 0
    ? ('needs_attention' as const)
    : ('ready' as const);
}

function createSubmissionSourceText(input: {
  name: string;
  description: string;
  funFact?: string;
  source: string;
  locationInput?: string;
  locationNotes?: string;
  latitude?: number;
  longitude?: number;
  isLore: boolean;
}) {
  return [
    `Name: ${input.name}`,
    `Description: ${input.description}`,
    input.funFact ? `Fun Fact: ${input.funFact}` : undefined,
    input.locationInput
      ? `Submitted Address or Map Link: ${input.locationInput}`
      : undefined,
    input.locationNotes
      ? `Additional Location Details: ${input.locationNotes}`
      : undefined,
    input.latitude !== undefined && input.longitude !== undefined
      ? `Coordinates: ${input.latitude}, ${input.longitude}`
      : undefined,
    `Includes Lore or Legend: ${input.isLore ? 'Yes' : 'No'}`,
    `Source: ${input.source}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function getLocationIssues(
  draft: {
    sourceWasMarkedComplete: boolean;
    name: string;
    key: string;
    description: string;
    latitude?: number;
    longitude?: number;
    category?: string;
    badges: string[];
  },
  duplicateInBatch: boolean,
) {
  const issues: string[] = [];

  if (!draft.name.trim()) {
    issues.push('Name is missing.');
  }
  if (!isUsableSlug(draft.key)) {
    issues.push('A valid lowercase, hyphenated stable key is required.');
  }
  if (!draft.description.trim()) {
    issues.push('Description is missing.');
  }
  if (
    draft.latitude === undefined ||
    draft.latitude < -90 ||
    draft.latitude > 90
  ) {
    issues.push('A valid latitude is missing.');
  }
  if (
    draft.longitude === undefined ||
    draft.longitude < -180 ||
    draft.longitude > 180
  ) {
    issues.push('A valid longitude is missing.');
  }
  if (!draft.category || !locationCategories.has(draft.category)) {
    issues.push('Choose a standard location category.');
  }
  if (draft.badges.length === 0) {
    issues.push('Add at least one badge tag.');
  }
  if (draft.sourceWasMarkedComplete) {
    issues.push(
      'This entry is crossed out in the source document and may already be published.',
    );
  }
  if (duplicateInBatch) {
    issues.push('This import contains another entry with the same name.');
  }

  return issues;
}

function getBadgeIssues(
  draft: {
    sourceText: string;
    sourceWasMarkedComplete: boolean;
    name: string;
    key: string;
    tag: string;
    description: string;
    classification: 'general' | 'theme' | 'special_place' | 'seasonal';
    requiredVisits: number;
    levelsEnabled: boolean;
    congratulationsMessages: string[];
  },
  duplicateInBatch: boolean,
) {
  const issues: string[] = [];

  if (!draft.name.trim()) {
    issues.push('Name is missing.');
  }
  if (!isUsableSlug(draft.key)) {
    issues.push('A valid lowercase, hyphenated stable key is required.');
  }
  if (!isUsableSlug(draft.tag)) {
    issues.push('A valid lowercase, hyphenated badge tag is required.');
  }
  if (!draft.description.trim()) {
    issues.push('Description is missing.');
  }
  if (
    draft.congratulationsMessages.length === 0 ||
    draft.congratulationsMessages.some((message) => !message.trim())
  ) {
    issues.push('Congratulations message is missing.');
  }
  if (draft.congratulationsMessages.some((message) => message.length > 160)) {
    issues.push('Congratulations messages must be 160 characters or fewer.');
  }
  if (
    (draft.classification === 'theme' && draft.requiredVisits !== 2) ||
    ((draft.classification === 'special_place' ||
      draft.classification === 'seasonal') &&
      draft.requiredVisits !== 1)
  ) {
    issues.push('Required visits do not match the classification preset.');
  }
  if (
    draft.levelsEnabled !==
    (draft.classification === 'general' || draft.classification === 'theme')
  ) {
    issues.push('Leveling does not match the classification preset.');
  }
  if (draft.classification === 'seasonal') {
    issues.push('Confirm the badge availability dates before publishing.');
  }
  if (
    /^\d+\.\s/m.test(draft.sourceText) ||
    /^Badge name:/im.test(draft.sourceText)
  ) {
    issues.push('This appears in an unfinished draft section and needs review.');
  }
  if (draft.sourceWasMarkedComplete) {
    issues.push('This entry is crossed out in the source document.');
  }
  if (duplicateInBatch) {
    issues.push('This import contains another badge with the same name.');
  }

  return issues;
}

function requireLocationDraftReady(draft: Doc<'locationIngestDrafts'>) {
  if (!draft.name.trim() || !draft.description.trim()) {
    throw new ConvexError('Name and description are required before publishing.');
  }
  if (!isUsableSlug(draft.key)) {
    throw new ConvexError('The proposed stable key is not valid.');
  }
  if (
    draft.latitude === undefined ||
    draft.longitude === undefined ||
    draft.latitude < -90 ||
    draft.latitude > 90 ||
    draft.longitude < -180 ||
    draft.longitude > 180
  ) {
    throw new ConvexError('Valid latitude and longitude are required before publishing.');
  }
  if (
    !draft.category ||
    !locationCategories.has(draft.category) ||
    !draft.mapPinType
  ) {
    throw new ConvexError('Category and map pin type are required before publishing.');
  }
  if (draft.badges.length === 0) {
    throw new ConvexError('At least one badge tag is required before publishing.');
  }
}

function requireBadgeDraftReady(draft: Doc<'badgeIngestDrafts'>) {
  if (!draft.name.trim() || !draft.description.trim()) {
    throw new ConvexError('Name and description are required before publishing.');
  }
  if (!isUsableSlug(draft.key) || !isUsableSlug(draft.tag)) {
    throw new ConvexError('The proposed badge key or tag is not valid.');
  }
  if (!Number.isInteger(draft.requiredVisits) || draft.requiredVisits < 1) {
    throw new ConvexError('Required visits must be a positive whole number.');
  }
  if (
    draft.congratulationsMessages.length === 0 ||
    draft.congratulationsMessages.some((message) => !message.trim())
  ) {
    throw new ConvexError('At least one congratulations message is required.');
  }
  if (draft.congratulationsMessages.some((message) => message.length > 160)) {
    throw new ConvexError('Congratulations messages must be 160 characters or fewer.');
  }
  if (
    (draft.classification === 'theme' && draft.requiredVisits !== 2) ||
    ((draft.classification === 'special_place' ||
      draft.classification === 'seasonal') &&
      draft.requiredVisits !== 1)
  ) {
    throw new ConvexError('Required visits must match the classification preset.');
  }
  if (
    draft.levelsEnabled !==
    (draft.classification === 'general' || draft.classification === 'theme')
  ) {
    throw new ConvexError('Leveling must match the classification preset.');
  }
}

async function getUniqueLocationKey(
  ctx: MutationCtx,
  requestedKey: string,
) {
  let candidate = requestedKey;
  let suffix = 2;

  while (
    (await ctx.db
      .query('locations')
      .withIndex('by_key', (q) => q.eq('key', candidate))
      .first()) !== null
  ) {
    candidate = `${requestedKey}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function getUniqueBadgeKey(ctx: MutationCtx, requestedKey: string) {
  let candidate = requestedKey;
  let suffix = 2;

  while (
    (await ctx.db
      .query('badgeDefinitions')
      .withIndex('by_key', (q) => q.eq('key', candidate))
      .first()) !== null
  ) {
    candidate = `${requestedKey}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function getBadgeMessages(draft: Doc<'badgeIngestDrafts'>) {
  if (draft.classification === 'seasonal' || draft.classification === 'special_place') {
    return [draft.congratulationsMessages[0]];
  }

  const messages = [...draft.congratulationsMessages];
  const seen = new Set(messages.map((message) => message.toLowerCase()));

  for (const message of DEFAULT_BADGE_CONGRATULATIONS) {
    if (messages.length >= 10) {
      break;
    }
    if (!seen.has(message.toLowerCase())) {
      messages.push(message);
      seen.add(message.toLowerCase());
    }
  }

  return messages;
}

export const submitLocationProposal = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    funFact: v.optional(v.string()),
    source: v.string(),
    locationInput: v.optional(v.string()),
    locationNotes: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    isLore: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireCommunityContributor(ctx);
    const now = Date.now();
    const recentSubmissions = await ctx.db
      .query('ingestBatches')
      .withIndex('by_creator_and_created_at', (q) =>
        q
          .eq('createdByClerkUserId', identity.subject)
          .gte('createdAt', now - 60 * 60 * 1_000),
      )
      .collect();

    const allSubmissionBatches = await ctx.db
      .query('ingestBatches')
      .withIndex('by_creator_and_created_at', (q) =>
        q.eq('createdByClerkUserId', identity.subject),
      )
      .collect();
    const communitySubmissionBatches = allSubmissionBatches.filter(
      (batch) =>
        batch.contentType === 'location' &&
        batch.sourceType === 'user_submission',
    );
    const communitySubmissionDrafts = (
      await Promise.all(
        communitySubmissionBatches.map((batch) =>
          ctx.db
            .query('locationIngestDrafts')
            .withIndex('by_batch', (q) => q.eq('batchId', batch._id))
            .first(),
        ),
      )
    ).filter((draft) => draft !== null);
    const completedStatuses = new Set([
      'published',
      'kept_existing',
      'dismissed',
    ]);
    const openSubmissionCount = communitySubmissionDrafts.filter(
      (draft) => !completedStatuses.has(draft.status),
    ).length;

    if (openSubmissionCount >= COMMUNITY_MAX_OPEN_SUBMISSIONS) {
      throw new ConvexError(
        `You may have up to ${COMMUNITY_MAX_OPEN_SUBMISSIONS} locations waiting for review at once. Please wait for an administrator to finish reviewing one before submitting another.`,
      );
    }

    if (
      recentSubmissions.filter(
        (batch) => batch.sourceType === 'user_submission',
      ).length >= 5
    ) {
      throw new ConvexError(
        'Please wait before submitting another location. The limit is five submissions per hour.',
      );
    }

    const name = requireSubmissionText(
      args.name,
      'Location name',
      submissionLimits.name,
    );
    const description = requireSubmissionText(
      args.description,
      'Description',
      submissionLimits.description,
    );
    const source = requireSubmissionText(
      args.source,
      'Source',
      submissionLimits.source,
    );
    const locationInput = args.locationInput?.trim() || undefined;
    const locationNotes = args.locationNotes?.trim() || undefined;
    const funFact = args.funFact?.trim() || undefined;

    if (funFact && funFact.length > submissionLimits.funFact) {
      throw new ConvexError(
        `Fun Fact must be ${submissionLimits.funFact.toLocaleString()} characters or fewer.`,
      );
    }
    if (
      locationInput &&
      locationInput.length > submissionLimits.locationInput
    ) {
      throw new ConvexError(
        `Address or map link must be ${submissionLimits.locationInput.toLocaleString()} characters or fewer.`,
      );
    }
    if (
      locationNotes &&
      locationNotes.length > submissionLimits.locationNotes
    ) {
      throw new ConvexError(
        `Location details must be ${submissionLimits.locationNotes.toLocaleString()} characters or fewer.`,
      );
    }
    if (
      args.latitude < -90 ||
      args.latitude > 90 ||
      args.longitude < -180 ||
      args.longitude > 180
    ) {
      throw new ConvexError(
        'Place a valid location pin before submitting.',
      );
    }

    const definitions = await ctx.db.query('badgeDefinitions').collect();
    const suggestions = suggestLocationSubmission({
      name,
      description,
      funFact,
      source,
      locationInput,
      locationNotes,
      isLore: args.isLore,
      availableTags: definitions
        .filter((definition) => definition.retired !== true)
        .map((definition) => definition.tag),
    });
    const proposed = {
      sourceText: createSubmissionSourceText({
        name,
        description,
        funFact,
        source,
        locationInput,
        locationNotes,
        latitude: args.latitude,
        longitude: args.longitude,
        isLore: args.isLore,
      }),
      sourceWasMarkedComplete: false,
      name,
      key: suggestions.key,
      description,
      funFact,
      source,
      isLore: args.isLore,
      latitude: args.latitude,
      longitude: args.longitude,
      category: suggestions.category,
      mapPinType: suggestions.mapPinType,
      badges: suggestions.badges,
      submittedLocationInput: locationInput,
      submitterLocationNotes: locationNotes,
      importConfidence:
        suggestions.category !== undefined &&
        suggestions.badges.length > 0
          ? ('high' as const)
          : suggestions.category !== undefined || suggestions.badges.length > 0
            ? ('medium' as const)
            : ('low' as const),
      suggestionNotes: suggestions.suggestionNotes,
    };
    const existingDrafts = await ctx.db.query('locationIngestDrafts').collect();
    const fingerprint = locationFingerprint(proposed);

    if (
      existingDrafts.some(
        (draft) => locationFingerprint(draft) === fingerprint,
      )
    ) {
      throw new ConvexError(
        'An identical location proposal is already in the review queue.',
      );
    }

    const locations = await ctx.db.query('locations').collect();
    const match = getLocationMatch(proposed, locations);

    if (
      match?.exact &&
      locationFingerprint(proposed) === locationFingerprint(match.location)
    ) {
      throw new ConvexError(
        'This location is already published with the same information.',
      );
    }

    const issues = getLocationIssues(proposed, false);
    const moderationFlags = moderateLocationSubmission({
      name,
      description,
      funFact,
      source,
      locationInput,
      locationNotes,
    });

    if (moderationFlags.length > 0) {
      issues.unshift(
        'Automatically held by the content-safety filter. An administrator must review it before any other action.',
      );
    }

    const submitterProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (queryBuilder) =>
        queryBuilder.eq('clerkUserId', identity.subject),
      )
      .unique();
    const submitterName = submitterProfile?.username
      ? `@${submitterProfile.username}`
      : typeof identity.name === 'string' && identity.name.trim()
        ? identity.name.trim()
        : 'Community Contributor';
    const batchId = await ctx.db.insert('ingestBatches', {
      contentType: 'location',
      sourceType: 'user_submission',
      sourceName: `Community submission from ${submitterName}`,
      warnings: [],
      createdAt: now,
      createdByClerkUserId: identity.subject,
    });
    const status =
      moderationFlags.length > 0
        ? ('rejected_by_filter' as const)
        : getInitialStatus(issues, match);
    const draftId = await ctx.db.insert('locationIngestDrafts', {
      ...proposed,
      batchId,
      moderationFlags:
        moderationFlags.length > 0 ? moderationFlags : undefined,
      issues,
      status,
      matchedLocationId: match?.location._id,
      matchDistanceMeters: match?.distanceMeters,
      createdAt: now,
      updatedAt: now,
    });

    return {
      draftId,
      status,
      moderationFiltered: moderationFlags.length > 0,
      suggestions: {
        category: suggestions.category,
        mapPinType: suggestions.mapPinType,
        badges: suggestions.badges,
      },
    };
  },
});

export const getMyLocationSubmissions = query({
  args: {},
  handler: async (ctx) => {
    const { identity } = await requireCommunityContributor(ctx);
    const batches = await ctx.db
      .query('ingestBatches')
      .withIndex('by_creator_and_created_at', (q) =>
        q.eq('createdByClerkUserId', identity.subject),
      )
      .order('desc')
      .take(20);
    const submissionBatches = batches.filter(
      (batch) =>
        batch.contentType === 'location' &&
        batch.sourceType === 'user_submission',
    );

    return (
      await Promise.all(
        submissionBatches.map(async (batch) => {
          const draft = await ctx.db
            .query('locationIngestDrafts')
            .withIndex('by_batch', (q) => q.eq('batchId', batch._id))
            .first();

          return draft
            ? {
                id: draft._id,
                name: draft.name,
                status: draft.status,
                createdAt: draft.createdAt,
                updatedAt: draft.updatedAt,
              }
            : null;
        }),
      )
    ).filter((submission) => submission !== null);
  },
});

export const getCommunitySubmissionActivity = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const batches = await ctx.db
      .query('ingestBatches')
      .withIndex('by_created_at')
      .order('desc')
      .collect();
    const submissionBatches = batches.filter(
      (batch) =>
        batch.contentType === 'location' &&
        batch.sourceType === 'user_submission',
    );
    const drafts = (
      await Promise.all(
        submissionBatches.map((batch) =>
          ctx.db
            .query('locationIngestDrafts')
            .withIndex('by_batch', (q) => q.eq('batchId', batch._id))
            .first(),
        ),
      )
    ).filter((draft) => draft !== null);
    const completedStatuses = new Set([
      'published',
      'kept_existing',
      'dismissed',
    ]);

    return {
      waitingCount: drafts.filter(
        (draft) => !completedStatuses.has(draft.status),
      ).length,
    };
  },
});

export const createBatch = mutation({
  args: {
    contentType: v.union(v.literal('location'), v.literal('badge')),
    sourceType: v.union(v.literal('document'), v.literal('user_submission')),
    sourceName: v.string(),
    warnings: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);

    return await ctx.db.insert('ingestBatches', {
      ...args,
      createdAt: Date.now(),
      createdByClerkUserId: identity.subject,
    });
  },
});

export const stageLocationDrafts = mutation({
  args: {
    batchId: v.id('ingestBatches'),
    drafts: v.array(locationDraftValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const batch = await ctx.db.get(args.batchId);

    if (!batch || batch.contentType !== 'location') {
      throw new ConvexError('Location import batch not found.');
    }

    const locations = await ctx.db.query('locations').collect();
    const existingDrafts = await ctx.db.query('locationIngestDrafts').collect();
    const seenFingerprints = new Set(existingDrafts.map(locationFingerprint));
    const createdAt = Date.now();
    let staged = 0;
    let skippedDuplicates = 0;
    let suggestedEdits = 0;

    for (const draft of args.drafts) {
      const fingerprint = locationFingerprint(draft);

      if (seenFingerprints.has(fingerprint)) {
        skippedDuplicates += 1;
        continue;
      }

      const match = getLocationMatch(draft, locations);

      if (
        match?.exact &&
        locationFingerprint(draft) === locationFingerprint(match.location)
      ) {
        skippedDuplicates += 1;
        seenFingerprints.add(fingerprint);
        continue;
      }

      await ctx.db.insert('locationIngestDrafts', {
        ...draft,
        batchId: args.batchId,
        status: getInitialStatus(draft.issues, match),
        matchedLocationId: match?.location._id,
        matchDistanceMeters: match?.distanceMeters,
        createdAt,
        updatedAt: createdAt,
      });
      seenFingerprints.add(fingerprint);
      staged += 1;

      if (match?.exact) {
        suggestedEdits += 1;
      }
    }

    return { staged, skippedDuplicates, suggestedEdits };
  },
});

export const stageBadgeDrafts = mutation({
  args: {
    batchId: v.id('ingestBatches'),
    drafts: v.array(badgeDraftValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const batch = await ctx.db.get(args.batchId);

    if (!batch || batch.contentType !== 'badge') {
      throw new ConvexError('Badge import batch not found.');
    }

    const definitions = await ctx.db.query('badgeDefinitions').collect();
    const existingDrafts = await ctx.db.query('badgeIngestDrafts').collect();
    const seenFingerprints = new Set(existingDrafts.map(badgeFingerprint));
    const createdAt = Date.now();
    let staged = 0;
    let skippedDuplicates = 0;
    let suggestedEdits = 0;

    for (const draft of args.drafts) {
      const fingerprint = badgeFingerprint(draft);

      if (seenFingerprints.has(fingerprint)) {
        skippedDuplicates += 1;
        continue;
      }

      const match = getBadgeMatch(draft, definitions);

      if (match && badgeMatchesPublished(draft, match)) {
        skippedDuplicates += 1;
        seenFingerprints.add(fingerprint);
        continue;
      }

      await ctx.db.insert('badgeIngestDrafts', {
        ...draft,
        batchId: args.batchId,
        status: getInitialStatus(
          draft.issues,
          match ? { exact: true } : null,
        ),
        matchedBadgeDefinitionId: match?._id,
        createdAt,
        updatedAt: createdAt,
      });
      seenFingerprints.add(fingerprint);
      staged += 1;

      if (match) {
        suggestedEdits += 1;
      }
    }

    return { staged, skippedDuplicates, suggestedEdits };
  },
});

export const discardEmptyBatch = mutation({
  args: { batchId: v.id('ingestBatches') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const batch = await ctx.db.get(args.batchId);

    if (!batch) {
      return false;
    }

    const draft =
      batch.contentType === 'location'
        ? await ctx.db
            .query('locationIngestDrafts')
            .withIndex('by_batch', (q) => q.eq('batchId', args.batchId))
            .first()
        : await ctx.db
            .query('badgeIngestDrafts')
            .withIndex('by_batch', (q) => q.eq('batchId', args.batchId))
            .first();

    if (draft) {
      return false;
    }

    await ctx.db.delete(batch._id);
    return true;
  },
});

export const updateLocationDraft = mutation({
  args: {
    draftId: v.id('locationIngestDrafts'),
    name: v.string(),
    key: v.string(),
    description: v.string(),
    funFact: v.optional(v.string()),
    source: v.optional(v.string()),
    isLore: v.boolean(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    category: v.optional(v.string()),
    mapPinType: v.optional(mapPinTypeValidator),
    badges: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      throw new ConvexError('Location proposal not found.');
    }
    if (
      draft.status === 'published' ||
      draft.status === 'kept_existing' ||
      draft.status === 'dismissed'
    ) {
      throw new ConvexError('Finalized proposals must be reopened before editing.');
    }

    const normalizedBadges = Array.from(
      new Set(
        args.badges
          .map((tag) => tag.trim().toLowerCase())
          .filter((tag) => isUsableSlug(tag)),
      ),
    ).slice(0, 25);
    const proposed = {
      ...draft,
      ...args,
      name: args.name.trim(),
      key: args.key.trim(),
      description: args.description.trim(),
      funFact: args.funFact?.trim() || undefined,
      source: args.source?.trim() || undefined,
      badges: normalizedBadges,
    };
    const batchDrafts = await ctx.db
      .query('locationIngestDrafts')
      .withIndex('by_batch', (q) => q.eq('batchId', draft.batchId))
      .collect();
    const duplicateInBatch = batchDrafts.some(
      (candidate) =>
        candidate._id !== draft._id &&
        normalizedText(candidate.name) === normalizedText(proposed.name),
    );
    const issues = getLocationIssues(proposed, duplicateInBatch);
    const locations = await ctx.db.query('locations').collect();
    const match = getLocationMatch(proposed, locations);

    await ctx.db.patch(draft._id, {
      name: proposed.name,
      key: proposed.key,
      description: proposed.description,
      funFact: proposed.funFact,
      source: proposed.source,
      isLore: proposed.isLore,
      latitude: proposed.latitude,
      longitude: proposed.longitude,
      category: proposed.category,
      mapPinType: proposed.mapPinType,
      badges: proposed.badges,
      moderationFlags: undefined,
      issues,
      status: getInitialStatus(issues, match),
      matchedLocationId: match?.location._id,
      matchDistanceMeters: match?.distanceMeters,
      updatedAt: Date.now(),
      reviewedAt: undefined,
      reviewedByClerkUserId: undefined,
    });

    return draft._id;
  },
});

export const updateBadgeDraft = mutation({
  args: {
    draftId: v.id('badgeIngestDrafts'),
    name: v.string(),
    key: v.string(),
    tag: v.string(),
    description: v.string(),
    classification: classificationValidator,
    requiredVisits: v.number(),
    levelsEnabled: v.boolean(),
    congratulationsMessages: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      throw new ConvexError('Badge proposal not found.');
    }
    if (
      draft.status === 'published' ||
      draft.status === 'kept_existing' ||
      draft.status === 'dismissed'
    ) {
      throw new ConvexError('Finalized proposals must be reopened before editing.');
    }

    const proposed = {
      ...draft,
      ...args,
      name: args.name.trim(),
      key: args.key.trim(),
      tag: args.tag.trim().toLowerCase(),
      description: args.description.trim(),
      congratulationsMessages: args.congratulationsMessages.map((message) =>
        message.trim(),
      ),
    };
    const batchDrafts = await ctx.db
      .query('badgeIngestDrafts')
      .withIndex('by_batch', (q) => q.eq('batchId', draft.batchId))
      .collect();
    const duplicateInBatch = batchDrafts.some(
      (candidate) =>
        candidate._id !== draft._id &&
        normalizedText(candidate.name) === normalizedText(proposed.name),
    );
    const issues = getBadgeIssues(proposed, duplicateInBatch);
    const definitions = await ctx.db.query('badgeDefinitions').collect();
    const match = getBadgeMatch(proposed, definitions);

    await ctx.db.patch(draft._id, {
      name: proposed.name,
      key: proposed.key,
      tag: proposed.tag,
      description: proposed.description,
      classification: proposed.classification,
      requiredVisits: proposed.requiredVisits,
      levelsEnabled: proposed.levelsEnabled,
      congratulationsMessages: proposed.congratulationsMessages,
      issues,
      status: getInitialStatus(
        issues,
        match ? { exact: true } : null,
      ),
      matchedBadgeDefinitionId: match?._id,
      updatedAt: Date.now(),
      reviewedAt: undefined,
      reviewedByClerkUserId: undefined,
    });

    return draft._id;
  },
});

export const getLocationDrafts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const drafts = await ctx.db.query('locationIngestDrafts').collect();

    return await Promise.all(
      drafts
        .sort((left, right) => right.createdAt - left.createdAt)
        .map(async (draft) => ({
          ...draft,
          batch: await ctx.db.get(draft.batchId),
          matchedLocation: draft.matchedLocationId
            ? await ctx.db.get(draft.matchedLocationId)
            : null,
        })),
    );
  },
});

export const getBadgeDrafts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const drafts = await ctx.db.query('badgeIngestDrafts').collect();

    return await Promise.all(
      drafts
        .sort((left, right) => right.createdAt - left.createdAt)
        .map(async (draft) => ({
          ...draft,
          batch: await ctx.db.get(draft.batchId),
          matchedBadge: draft.matchedBadgeDefinitionId
            ? await ctx.db.get(draft.matchedBadgeDefinitionId)
            : null,
        })),
    );
  },
});

export const reviewLocationDraft = mutation({
  args: {
    draftId: v.id('locationIngestDrafts'),
    action: locationActionValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      throw new ConvexError('Location proposal not found.');
    }

    const now = Date.now();
    if (args.action === 'dismiss' || args.action === 'keep_existing') {
      await ctx.db.patch(draft._id, {
        status: args.action === 'dismiss' ? 'dismissed' : 'kept_existing',
        reviewedAt: now,
        reviewedByClerkUserId: identity.subject,
        updatedAt: now,
      });
      return null;
    }

    if (args.action === 'reopen') {
      await ctx.db.patch(draft._id, {
        status: draft.matchedLocationId
          ? draft.matchDistanceMeters === 0
            ? 'suggested_edit'
            : 'possible_duplicate'
          : draft.issues.length > 0
            ? 'needs_attention'
            : 'ready',
        reviewedAt: undefined,
        reviewedByClerkUserId: undefined,
        updatedAt: now,
      });
      return null;
    }

    if ((draft.moderationFlags?.length ?? 0) > 0) {
      throw new ConvexError(
        'This proposal was held by the content-safety filter. Reopen and edit it before publishing.',
      );
    }

    requireLocationDraftReady(draft);
    const existing = draft.matchedLocationId
      ? await ctx.db.get(draft.matchedLocationId)
      : null;
    const proposed = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      funFact: draft.funFact?.trim() || undefined,
      source: draft.source?.trim() || undefined,
      isLore: draft.isLore,
      latitude: draft.latitude!,
      longitude: draft.longitude!,
      category: draft.category!,
      mapPinType: draft.mapPinType!,
      badges: Array.from(new Set(draft.badges.map((tag) => tag.trim()).filter(Boolean))),
    };
    let locationId: Id<'locations'>;

    if (args.action === 'publish_new') {
      const key = await getUniqueLocationKey(ctx, draft.key);
      locationId = await ctx.db.insert('locations', {
        ...proposed,
        key,
        retired: false,
      });
    } else {
      if (!existing) {
        throw new ConvexError('Choose an existing location before merging or replacing.');
      }
      locationId = existing._id;

      if (args.action === 'replace_existing') {
        await ctx.db.patch(existing._id, {
          ...proposed,
          key: existing.key ?? draft.key,
        });
      } else {
        await ctx.db.patch(existing._id, {
          name: existing.name || proposed.name,
          key: existing.key ?? draft.key,
          description: existing.description || proposed.description,
          funFact: existing.funFact || proposed.funFact,
          source: existing.source || proposed.source,
          isLore: existing.isLore === true || proposed.isLore,
          latitude: existing.latitude ?? proposed.latitude,
          longitude: existing.longitude ?? proposed.longitude,
          category: existing.category || proposed.category,
          mapPinType: existing.mapPinType ?? proposed.mapPinType,
          badges: Array.from(new Set([...existing.badges, ...proposed.badges])),
        });
      }
    }

    await ctx.db.patch(draft._id, {
      status: 'published',
      publishedLocationId: locationId,
      reviewedAt: now,
      reviewedByClerkUserId: identity.subject,
      resolution: args.action,
      updatedAt: now,
    });

    return locationId;
  },
});

export const reviewBadgeDraft = mutation({
  args: {
    draftId: v.id('badgeIngestDrafts'),
    action: badgeActionValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      throw new ConvexError('Badge proposal not found.');
    }

    const now = Date.now();
    if (args.action === 'dismiss' || args.action === 'keep_existing') {
      await ctx.db.patch(draft._id, {
        status: args.action === 'dismiss' ? 'dismissed' : 'kept_existing',
        reviewedAt: now,
        reviewedByClerkUserId: identity.subject,
        updatedAt: now,
      });
      return null;
    }

    if (args.action === 'reopen') {
      await ctx.db.patch(draft._id, {
        status: draft.matchedBadgeDefinitionId
          ? 'suggested_edit'
          : draft.issues.length > 0
            ? 'needs_attention'
            : 'ready',
        reviewedAt: undefined,
        reviewedByClerkUserId: undefined,
        updatedAt: now,
      });
      return null;
    }

    requireBadgeDraftReady(draft);
    const existing = draft.matchedBadgeDefinitionId
      ? await ctx.db.get(draft.matchedBadgeDefinitionId)
      : null;
    const congratulationsMessages = getBadgeMessages(draft);
    const proposed = {
      name: draft.name.trim(),
      tag: draft.tag.trim(),
      description: draft.description.trim(),
      requiredVisits: draft.requiredVisits,
      classification: draft.classification,
      levelsEnabled: draft.levelsEnabled,
      congratulationsMessages,
      rule: {
        type: 'tag' as const,
        normalizedTag: draft.tag.trim(),
      },
    };
    let badgeDefinitionId: Id<'badgeDefinitions'>;

    if (args.action === 'publish_new') {
      const key = await getUniqueBadgeKey(ctx, draft.key);
      badgeDefinitionId = await ctx.db.insert('badgeDefinitions', {
        ...proposed,
        key,
        retired: false,
      });
    } else {
      if (!existing) {
        throw new ConvexError('Choose an existing badge before merging or replacing.');
      }
      badgeDefinitionId = existing._id;

      if (args.action === 'replace_existing') {
        await ctx.db.patch(existing._id, {
          ...proposed,
          key: existing.key ?? draft.key,
        });
      } else {
        await ctx.db.patch(existing._id, {
          name: existing.name || proposed.name,
          key: existing.key ?? draft.key,
          tag: existing.tag || proposed.tag,
          description: existing.description || proposed.description,
          requiredVisits: existing.requiredVisits || proposed.requiredVisits,
          classification: existing.classification ?? proposed.classification,
          levelsEnabled: existing.levelsEnabled ?? proposed.levelsEnabled,
          congratulationsMessages:
            existing.congratulationsMessages?.length
              ? existing.congratulationsMessages
              : proposed.congratulationsMessages,
          rule: existing.rule ?? proposed.rule,
        });
      }
    }

    await ctx.db.patch(draft._id, {
      status: 'published',
      publishedBadgeDefinitionId: badgeDefinitionId,
      reviewedAt: now,
      reviewedByClerkUserId: identity.subject,
      resolution: args.action,
      updatedAt: now,
    });

    return badgeDefinitionId;
  },
});

export { reviewStatusValidator };
