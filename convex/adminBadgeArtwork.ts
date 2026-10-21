import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import {
  mutation,
  query,
  type MutationCtx,
} from './_generated/server';
import { requireAdmin } from './lib/auth';

const MAX_ARTWORK_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

async function requireBadgeDefinition(
  ctx: MutationCtx,
  badgeDefinitionId: Id<'badgeDefinitions'>,
) {
  const definition = await ctx.db.get(badgeDefinitionId);

  if (definition === null) {
    throw new ConvexError('Badge definition not found.');
  }

  return definition;
}

async function deleteArtworkIfUnreferenced(
  ctx: MutationCtx,
  storageId: Id<'_storage'>,
  excludingBadgeDefinitionId: Id<'badgeDefinitions'>,
) {
  const definitions = await ctx.db
    .query('badgeDefinitions')
    .collect();
  const stillReferenced = definitions.some(
    (definition) =>
      definition._id !== excludingBadgeDefinitionId &&
      definition.imageStorageId === storageId,
  );

  if (!stillReferenced) {
    await ctx.storage.delete(storageId);
  }
}

export const getArtworkStorageAudit = query({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [definitions, files] = await Promise.all([
      ctx.db.query('badgeDefinitions').collect(),
      ctx.db.system.query('_storage').collect(),
    ]);
    const referencedStorageIds = new Set(
      definitions.flatMap((definition) =>
        definition.imageStorageId === undefined
          ? []
          : [definition.imageStorageId],
      ),
    );
    const filesByHash = new Map<
      string,
      typeof files
    >();

    for (const file of files) {
      const matchingFiles = filesByHash.get(file.sha256) ?? [];
      matchingFiles.push(file);
      filesByHash.set(file.sha256, matchingFiles);
    }

    const unreferencedFiles = files.filter(
      (file) => !referencedStorageIds.has(file._id),
    );
    const duplicateGroups = [...filesByHash.values()]
      .filter((group) => group.length > 1)
      .map((group) => ({
        sha256: group[0].sha256,
        size: group[0].size,
        storageIds: group.map((file) => file._id),
        referencedStorageIds: group
          .filter((file) => referencedStorageIds.has(file._id))
          .map((file) => file._id),
      }));

    return {
      totalFiles: files.length,
      totalBytes: files.reduce((total, file) => total + file.size, 0),
      referencedFiles: files.length - unreferencedFiles.length,
      referencedBytes: files
        .filter((file) => referencedStorageIds.has(file._id))
        .reduce((total, file) => total + file.size, 0),
      unreferencedFiles: unreferencedFiles.map((file) => ({
        storageId: file._id,
        size: file.size,
        contentType: file.contentType,
        uploadedAt: file._creationTime,
      })),
      unreferencedBytes: unreferencedFiles.reduce(
        (total, file) => total + file.size,
        0,
      ),
      duplicateGroups,
      duplicateBytes: duplicateGroups.reduce(
        (total, group) =>
          total + group.size * (group.storageIds.length - 1),
        0,
      ),
    };
  },
});

export const generateArtworkUploadUrl = mutation({
  args: {},

  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const setBadgeArtwork = mutation({
  args: {
    badgeDefinitionId: v.id('badgeDefinitions'),
    storageId: v.id('_storage'),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const definition = await requireBadgeDefinition(
      ctx,
      args.badgeDefinitionId,
    );
    const metadata = await ctx.db.system.get(
      '_storage',
      args.storageId,
    );

    if (metadata === null) {
      throw new ConvexError('Uploaded artwork was not found.');
    }

    if (
      metadata.contentType === undefined ||
      !ALLOWED_CONTENT_TYPES.has(metadata.contentType)
    ) {
      throw new ConvexError(
        'Badge artwork must be a PNG, JPEG, or WebP image.',
      );
    }

    if (metadata.size > MAX_ARTWORK_BYTES) {
      throw new ConvexError(
        'Badge artwork must be 5 MB or smaller.',
      );
    }

    const previousStorageId = definition.imageStorageId;

    await ctx.db.patch(args.badgeDefinitionId, {
      imageStorageId: args.storageId,
    });

    if (
      previousStorageId !== undefined &&
      previousStorageId !== args.storageId
    ) {
      await deleteArtworkIfUnreferenced(
        ctx,
        previousStorageId,
        args.badgeDefinitionId,
      );
    }

    return {
      badgeDefinitionId: args.badgeDefinitionId,
      storageId: args.storageId,
      imageUrl: await ctx.storage.getUrl(args.storageId),
      contentType: metadata.contentType,
      size: metadata.size,
    };
  },
});

export const removeBadgeArtwork = mutation({
  args: {
    badgeDefinitionId: v.id('badgeDefinitions'),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const definition = await requireBadgeDefinition(
      ctx,
      args.badgeDefinitionId,
    );
    const previousStorageId = definition.imageStorageId;

    if (previousStorageId === undefined) {
      return {
        badgeDefinitionId: args.badgeDefinitionId,
        removed: false,
      };
    }

    await ctx.db.patch(args.badgeDefinitionId, {
      imageStorageId: undefined,
    });
    await deleteArtworkIfUnreferenced(
      ctx,
      previousStorageId,
      args.badgeDefinitionId,
    );

    return {
      badgeDefinitionId: args.badgeDefinitionId,
      removed: true,
    };
  },
});
