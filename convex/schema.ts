import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  locations: defineTable({
    name: v.string(),
    key: v.optional(v.string()),

    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    description: v.string(),
    funFact: v.optional(v.string()),
    source: v.optional(v.string()),
    isLore: v.optional(v.boolean()),

    badges: v.array(v.string()),

    category: v.optional(v.string()),
    mapPinType: v.optional(
      v.union(
        v.literal('historic_sites'),
        v.literal('monuments_public_art'),
        v.literal('mystery_lore'),
        v.literal('noteworthy_people'),
        v.literal('other_discoveries'),
      ),
    ),
    storyKey: v.optional(v.string()),
    regionKey: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    ownerClerkUserId: v.optional(v.string()),
    betaStarterKey: v.optional(v.string()),
    betaOnly: v.optional(v.boolean()),
    retired: v.optional(v.boolean()),
    retiredAt: v.optional(v.number()),
  })
    .index('by_key', ['key'])
    .index('by_owner', ['ownerClerkUserId'])
    .index('by_owner_and_beta_starter_key', [
      'ownerClerkUserId',
      'betaStarterKey',
    ]),

  userProfiles: defineTable({
    clerkUserId: v.string(),
    username: v.optional(v.string()),
    usernameNormalized: v.optional(v.string()),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    emailNormalized: v.optional(v.string()),
    usernameChangedAt: v.optional(v.number()),
    manualContentRole: v.optional(
      v.union(
        v.literal('community_contributor'),
        v.literal('regional_moderator'),
      ),
    ),
    manualRoleGrantedAt: v.optional(v.number()),
    manualRoleGrantedByClerkUserId: v.optional(v.string()),
    manualRoleReason: v.optional(v.string()),
    avatarPresetId: v.union(
      v.literal('explorer'),
      v.literal('trail_basics'),
      v.literal('cozy_winter'),
      v.literal('classic_cowboy'),
      v.literal('rodeo_cowboy'),
      v.literal('pink_princess'),
      v.literal('custom'),
    ),
    avatarTopId: v.optional(
      v.union(
        v.literal('trail_tank'),
        v.literal('explorer_field'),
        v.literal('new_explorer_tee'),
        v.literal('winter_polka_sweater'),
        v.literal('cowboy_sheriff_shirt'),
        v.literal('princess_puff_bodice'),
      ),
    ),
    avatarBottomId: v.optional(
      v.union(
        v.literal('trail_shorts'),
        v.literal('explorer_cargo'),
        v.literal('winter_charcoal_pants'),
        v.literal('cowboy_western_pants'),
        v.literal('cowboy_western_shorts'),
        v.literal('princess_ballgown_skirt'),
      ),
    ),
    avatarShoesId: v.optional(
      v.union(
        v.literal('bare_hooves'),
        v.literal('explorer_boots'),
        v.literal('winter_snow_boots'),
        v.literal('cowboy_brown_boots'),
        v.literal('cowboy_red_boots'),
      ),
    ),
    avatarNeckId: v.optional(
      v.union(
        v.literal('none'),
        v.literal('rust_neckerchief'),
        v.literal('winter_cream_scarf'),
        v.literal('cowboy_red_bandana'),
      ),
    ),
    avatarFaceId: v.optional(
      v.union(v.literal('none'), v.literal('explorer_goggles')),
    ),
    avatarHeadwearId: v.optional(
      v.union(
        v.literal('none'),
        v.literal('winter_knit_beanie'),
        v.literal('cowboy_sheriff_hat'),
        v.literal('princess_crown'),
      ),
    ),
    avatarHandheldId: v.optional(
      v.union(v.literal('none'), v.literal('princess_star_wand')),
    ),
    unlockedAvatarItemIds: v.optional(v.array(v.string())),
    avatarCustomizedAt: v.optional(v.number()),
    communitySubmissionIntroSeenAt: v.optional(v.number()),
    betaStarterContentCreatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_username_normalized', ['usernameNormalized'])
    .index('by_email_normalized', ['emailNormalized']),

  userRoleAuditLog: defineTable({
    targetClerkUserId: v.string(),
    changedByClerkUserId: v.string(),
    previousManualRole: v.optional(
      v.union(
        v.literal('community_contributor'),
        v.literal('regional_moderator'),
      ),
    ),
    nextManualRole: v.optional(
      v.union(
        v.literal('community_contributor'),
        v.literal('regional_moderator'),
      ),
    ),
    reason: v.optional(v.string()),
    changedAt: v.number(),
  })
    .index('by_target_and_changed_at', [
      'targetClerkUserId',
      'changedAt',
    ])
    .index('by_changed_at', ['changedAt']),

  visits: defineTable({
    clerkUserId: v.string(),
    locationId: v.id('locations'),
    visitedAt: v.number(),
    distanceMeters: v.number(),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_user_and_location', ['clerkUserId', 'locationId']),

  locationWishlist: defineTable({
    clerkUserId: v.string(),
    locationId: v.id('locations'),
    createdAt: v.number(),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_user_and_location', ['clerkUserId', 'locationId']),

  badgeDefinitions: defineTable({
    name: v.string(),
    tag: v.string(),
    key: v.optional(v.string()),
    description: v.string(),
    funFact: v.optional(v.string()),
    source: v.optional(v.string()),
    requiredVisits: v.number(),
    classification: v.optional(
      v.union(
        v.literal('general'),
        v.literal('theme'),
        v.literal('special_place'),
        v.literal('seasonal'),
        v.literal('mission'),
      ),
    ),
    rule: v.optional(
      v.union(
        v.object({
          type: v.literal('tag'),
          normalizedTag: v.string(),
        }),
        v.object({
          type: v.literal('location'),
          locationKey: v.string(),
        }),
        v.object({
          type: v.literal('any_location'),
        }),
        v.object({
          type: v.literal('story'),
          storyKey: v.string(),
        }),
        v.object({
          type: v.literal('region'),
          regionKey: v.string(),
        }),
        v.object({
          type: v.literal('same_story'),
        }),
        v.object({
          type: v.literal('same_region'),
        }),
      ),
    ),
    retired: v.optional(v.boolean()),
    retiredAt: v.optional(v.number()),
    imageKey: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    annualSeriesId: v.optional(v.id('badgeAnnualSeries')),
    editionYear: v.optional(v.number()),
    levelsEnabled: v.optional(v.boolean()),
    betaOnly: v.optional(v.boolean()),
    congratulationsMessages: v.optional(v.array(v.string())),
    // Legacy level-range entries remain valid but are no longer used.
    levelCelebrations: v.optional(
      v.array(
        v.object({
          maximumLevel: v.number(),
          title: v.string(),
          message: v.string(),
        }),
      ),
    ),
    })
      .index('by_tag', ['tag'])
      .index('by_key', ['key'])
    .index('by_annual_series_and_year', ['annualSeriesId', 'editionYear']),

    badgeAnnualSeries: defineTable({
    key: v.string(),
    name: v.string(),
    enabled: v.boolean(),
    latestEditionYear: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  badgeAvailabilityWindows: defineTable({
      badgeDefinitionId: v.id('badgeDefinitions'),
      key: v.string(),
      startsAt: v.number(),
      endsAt: v.number(),
    })
      .index('by_badge', ['badgeDefinitionId'])
    .index('by_badge_and_key', ['badgeDefinitionId', 'key']),

    badgeProgress: defineTable({
      clerkUserId: v.string(),
      badgeDefinitionId: v.id('badgeDefinitions'),
      visitedLocationIds: v.array(v.id('locations')),
      groupKey: v.optional(v.string()),
      completedVisits: v.number(),
      updatedAt: v.number(),
    })
      .index('by_user', ['clerkUserId'])
    .index('by_user_and_badge', ['clerkUserId', 'badgeDefinitionId']),

    badgeAwards: defineTable({
      clerkUserId: v.string(),
      badgeDefinitionId: v.id('badgeDefinitions'),
      level: v.optional(v.number()),
      earnedAt: v.number(),
      announcedAt: v.optional(v.number()),
    })
      .index('by_user', ['clerkUserId'])
    .index('by_user_and_badge', ['clerkUserId', 'badgeDefinitionId'])
      .index('by_user_badge_and_level', [
        'clerkUserId',
        'badgeDefinitionId',
        'level',
      ]),

    missionProgress: defineTable({
      clerkUserId: v.string(),
      missionKey: v.string(),
      version: v.optional(v.number()),
      completedStepKeys: v.array(v.string()),
      startedAt: v.number(),
      introSeenAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      updatedAt: v.number(),
    })
      .index('by_user', ['clerkUserId'])
      .index('by_user_and_mission', ['clerkUserId', 'missionKey']),

    // Kept temporarily so an existing development shared-bank row remains
    // schema-valid while badge-specific pools replace it.
    badgeCongratulations: defineTable({
      key: v.literal('shared'),
      messages: v.array(
        v.object({
          message: v.string(),
          retired: v.boolean(),
        }),
      ),
      updatedAt: v.number(),
      updatedByClerkUserId: v.string(),
    }).index('by_key', ['key']),

    ingestBatches: defineTable({
      contentType: v.union(v.literal('location'), v.literal('badge')),
    sourceType: v.union(v.literal('document'), v.literal('user_submission')),
      sourceName: v.string(),
      warnings: v.array(v.string()),
      createdAt: v.number(),
      createdByClerkUserId: v.string(),
    })
      .index('by_content_type', ['contentType'])
      .index('by_created_at', ['createdAt'])
      .index('by_creator_and_created_at', [
        'createdByClerkUserId',
        'createdAt',
      ]),

    locationIngestDrafts: defineTable({
      batchId: v.id('ingestBatches'),
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
      mapPinType: v.optional(
        v.union(
          v.literal('historic_sites'),
          v.literal('monuments_public_art'),
          v.literal('mystery_lore'),
          v.literal('noteworthy_people'),
          v.literal('other_discoveries'),
        ),
      ),
      badges: v.array(v.string()),
      submittedLocationInput: v.optional(v.string()),
      submitterLocationNotes: v.optional(v.string()),
      moderationFlags: v.optional(v.array(v.string())),
    importConfidence: v.optional(
      v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
    ),
    suggestionNotes: v.optional(v.array(v.string())),
      issues: v.array(v.string()),
      status: v.union(
        v.literal('ready'),
        v.literal('needs_attention'),
        v.literal('possible_duplicate'),
      v.literal('suggested_edit'),
        v.literal('already_published'),
        v.literal('published'),
        v.literal('kept_existing'),
        v.literal('dismissed'),
        v.literal('rejected_by_filter'),
      ),
      matchedLocationId: v.optional(v.id('locations')),
      matchDistanceMeters: v.optional(v.number()),
      publishedLocationId: v.optional(v.id('locations')),
      resolution: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      reviewedAt: v.optional(v.number()),
      reviewedByClerkUserId: v.optional(v.string()),
    })
      .index('by_batch', ['batchId'])
      .index('by_status', ['status']),

    badgeIngestDrafts: defineTable({
      batchId: v.id('ingestBatches'),
      sourceOrdinal: v.optional(v.number()),
      sourceText: v.string(),
      sourceWasMarkedComplete: v.boolean(),
      name: v.string(),
      key: v.string(),
      tag: v.string(),
      description: v.string(),
      classification: v.union(
        v.literal('general'),
        v.literal('theme'),
        v.literal('special_place'),
        v.literal('seasonal'),
      ),
      requiredVisits: v.number(),
      levelsEnabled: v.boolean(),
      congratulationsMessages: v.array(v.string()),
    importConfidence: v.optional(
      v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
    ),
    suggestionNotes: v.optional(v.array(v.string())),
      issues: v.array(v.string()),
      status: v.union(
        v.literal('ready'),
        v.literal('needs_attention'),
        v.literal('possible_duplicate'),
      v.literal('suggested_edit'),
        v.literal('already_published'),
        v.literal('published'),
        v.literal('kept_existing'),
        v.literal('dismissed'),
      ),
      matchedBadgeDefinitionId: v.optional(v.id('badgeDefinitions')),
      publishedBadgeDefinitionId: v.optional(v.id('badgeDefinitions')),
      resolution: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      reviewedAt: v.optional(v.number()),
      reviewedByClerkUserId: v.optional(v.string()),
    })
      .index('by_batch', ['batchId'])
      .index('by_status', ['status']),
});
