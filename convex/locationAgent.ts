import { google } from '@ai-sdk/google';
import { Agent } from '@convex-dev/agent';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { components, internal } from './_generated/api';
import { action, mutation } from './_generated/server';

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
});

export const generateLocationDescription = action({
  args: {
    locationId: v.id('locations'),
    editorialNotes: v.optional(v.string()),
  },

  handler: async (
    ctx,
    args,
  ): Promise<{
    locationId: Id<'locations'>;
    description: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new Error(
        'You must be signed in to rewrite a location description.',
      );
    }

    const location: Doc<'locations'> | null =
      await ctx.runQuery(
        internal.locations.getLocation,
        { locationId: args.locationId },
      );

    if (location === null) {
      throw new Error('Location not found.');
    }

    const { thread } = await locationAgent.createThread(ctx);

    const result = await thread.generateText({
      prompt: [
        `Location name: ${location.name}`,
        `Category: ${location.category ?? 'Not specified'}`,
        `Current description: ${location.description}`,
        args.editorialNotes
          ? `Editorial notes: ${args.editorialNotes}`
          : '',
        '',
        'Rewrite the description using the voice guide. Return only the finished description.',
      ]
        .filter(Boolean)
        .join('\n'),
    });

    const description = result.text.trim();

    if (description.length === 0) {
      throw new Error(
        'The agent returned an empty location description.',
      );
    }

    return {
      locationId: args.locationId,
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
    if ((await ctx.auth.getUserIdentity()) === null) {
      throw new Error(
        'You must be signed in to approve a location description.',
      );
    }

    const location = await ctx.db.get(args.locationId);

    if (location === null) {
      throw new Error('Location not found.');
    }

    await ctx.db.patch(args.locationId, {
      description: args.description,
    });
  },
});