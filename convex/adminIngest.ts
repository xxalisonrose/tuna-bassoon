import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { requireAdmin } from './lib/auth';
import { DEFAULT_BADGE_CONGRATULATIONS } from './lib/badge_congratulations';

const reviewStatusValidator = v.union(
  v.literal('ready'),
  v.literal('needs_attention'),
  v.literal('possible_duplicate'),
  v.literal('already_published'),
  v.literal('published'),
  v.literal('kept_existing'),
  v.literal('dismissed'),
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
    return 'already_published' as const;
  }
  if (match) {
    return 'possible_duplicate' as const;
  }
  return issues.length > 0
    ? ('needs_attention' as const)
    : ('ready' as const);
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
    const createdAt = Date.now();

    for (const draft of args.drafts) {
      const match = getLocationMatch(draft, locations);
      await ctx.db.insert('locationIngestDrafts', {
        ...draft,
        batchId: args.batchId,
        status: getInitialStatus(draft.issues, match),
        matchedLocationId: match?.location._id,
        matchDistanceMeters: match?.distanceMeters,
        createdAt,
        updatedAt: createdAt,
      });
    }

    return { staged: args.drafts.length };
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
    const createdAt = Date.now();

    for (const draft of args.drafts) {
      const match = getBadgeMatch(draft, definitions);
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
    }

    return { staged: args.drafts.length };
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
            ? 'already_published'
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
          ? 'already_published'
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
