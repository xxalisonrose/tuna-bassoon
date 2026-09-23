import { google } from '@ai-sdk/google';
import { Agent } from '@convex-dev/agent';
import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { components, internal } from './_generated/api';
import { action, mutation } from './_generated/server';
import { requireAdmin } from './lib/auth';

const LOCATION_VOICE = `
You write location descriptions for a Harvard history and landmarks app.

Voice:
- Warm, curious, and welcoming; sound like a knowledgeable local guide.
- Use plain language and favor concrete historical details over hype.
- Keep each description to 2-3 sentences and approximately 45-75 words.
- Write for a general audience, including visitors who may not know Harvard.
- Use the location's name naturally, but do not repeat it in every sentence.
- Do not invent dates, people, events, architectural details, or claims.
- Do not use headings, bullet points, emojis, hashtags, or promotional language.
`.trim();

const locationAgent = new Agent(components.agent, {
  name: 'Harvard Location Description Editor',
  languageModel: google('gemini-3.6-flash'),
  instructions: LOCATION_VOICE,
  callSettings: {
    maxRetries: 0,
  },
});

export const generateLocationDescription = action({
  args: {
    locationId: v.optional(v.id('locations')),
    draftContext: v.optional(
      v.object({
        name: v.string(),
        category: v.optional(v.string()),
        description: v.optional(v.string()),
      }),
    ),
    editorialNotes: v.optional(v.string()),
  },

  handler: async (
    ctx,
    args,
  ): Promise<{
    status: 'success';
    locationId?: Id<'locations'>;
    description: string;
  } | {
    status: 'unavailable';
    message: string;
  }> => {
    await requireAdmin(ctx);

    const editorialNotes = args.editorialNotes?.trim();

    if (editorialNotes !== undefined && editorialNotes.length > 2000) {
      throw new ConvexError('Editorial notes must be 2,000 characters or fewer.');
    }

    if (!args.locationId && !args.draftContext) {
      throw new ConvexError(
        'A location ID or draft context is required.',
      );
    }

    let locationName: string;
    let locationCategory: string;
    let locationDescription: string;

    if (args.draftContext) {
      locationName = args.draftContext.name.trim();

      if (locationName.length === 0) {
        throw new ConvexError('Location name cannot be empty.');
      }

      if (locationName.length > 120) {
        throw new ConvexError(
          'Location name must be 120 characters or fewer.',
        );
      }

      const category = args.draftContext.category?.trim() ?? '';
      if (category.length > 120) {
        throw new ConvexError(
          'Category must be 120 characters or fewer.',
        );
      }

      const description = args.draftContext.description?.trim() ?? '';
      if (description.length > 5000) {
        throw new ConvexError(
          'Description must be 5,000 characters or fewer.',
        );
      }

      locationCategory = category || 'Not specified';
      locationDescription =
        description || 'No current description provided.';
    } else {
      const location: Doc<'locations'> | null =
        await ctx.runQuery(
          internal.locations.getLocation,
          { locationId: args.locationId as Id<'locations'> },
        );

      if (location === null) {
        throw new Error('Location not found.');
      }

      locationName = location.name;
      locationCategory = location.category ?? 'Not specified';
      locationDescription = location.description;
    }

    const { thread } = await locationAgent.createThread(ctx);

    let result;

    try {
      result = await thread.generateText({
        prompt: [
          `Location name: ${locationName}`,
          `Category: ${locationCategory}`,
          `Current description: ${locationDescription}`,
          editorialNotes
            ? `Editorial notes: ${editorialNotes}`
            : '',
          '',
          'Rewrite the description using the voice guide. Return only the finished description.',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (error) {
      console.error(
        '[locationAgent] Gemini generation failed',
        error instanceof Error ? error.name : 'UnknownError',
      );
      return {
        status: 'unavailable',
        message:
          'Gemini is temporarily unavailable. Please try again in a few minutes.',
      };
    }

    const description = result.text.trim();

    if (description.length === 0) {
      throw new Error(
        'The agent returned an empty location description.',
      );
    }

    return {
      status: 'success',
      ...(args.locationId ? { locationId: args.locationId } : {}),
      description,
    };
  },
});

export const approveLocationDescription = mutation({
  args: {
    locationId: v.id('locations'),
    description: v.string(),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const description = args.description.trim();

    if (description.length === 0) {
      throw new ConvexError('Description cannot be empty.');
    }

    if (description.length > 5000) {
      throw new ConvexError('Description must be 5,000 characters or fewer.');
    }

    const location = await ctx.db.get(args.locationId);

    if (location === null) {
      throw new Error('Location not found.');
    }

    await ctx.db.patch(args.locationId, {
      description,
    });
  },
});
