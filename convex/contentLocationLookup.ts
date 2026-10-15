import { ConvexError, v } from 'convex/values';

import { action } from './_generated/server';
import { requireContentContributor } from './lib/auth';

type Coordinates = {
  latitude: number;
  longitude: number;
};

const googleMapHosts = new Set([
  'google.com',
  'goo.gl',
  'maps.app.goo.gl',
  'maps.google.com',
  'www.google.com',
]);

function validCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function coordinateResult(latitudeText: string, longitudeText: string) {
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  return validCoordinates(latitude, longitude)
    ? { latitude, longitude }
    : null;
}

function extractCoordinates(value: string): Coordinates | null {
  const decoded = decodeURIComponent(value.replace(/\+/g, ' '));
  const atMatch = decoded.match(
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
  );
  if (atMatch) {
    return coordinateResult(atMatch[1], atMatch[2]);
  }

  const dataMatch = decoded.match(
    /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
  );
  if (dataMatch) {
    return coordinateResult(dataMatch[1], dataMatch[2]);
  }

  try {
    const parsed = new URL(value);
    for (const key of ['q', 'query', 'll', 'destination']) {
      const parameter = parsed.searchParams.get(key);
      const match = parameter?.match(
        /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/,
      );
      if (match) {
        return coordinateResult(match[1], match[2]);
      }
    }
  } catch {
    // Plain addresses are handled by the geocoder below.
  }

  const plainMatch = decoded.match(
    /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/,
  );
  return plainMatch
    ? coordinateResult(plainMatch[1], plainMatch[2])
    : null;
}

function isAllowedGoogleMapsUrl(value: string) {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      (googleMapHosts.has(parsed.hostname) ||
        parsed.hostname.endsWith('.google.com'))
    );
  } catch {
    return false;
  }
}

function placeTextFromGoogleUrl(value: string) {
  try {
    const parsed = new URL(value);
    const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/]+)/i);
    const query =
      parsed.searchParams.get('q') ?? parsed.searchParams.get('query');
    return decodeURIComponent(placeMatch?.[1] ?? query ?? '')
      .replace(/\+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

async function expandGoogleMapsUrl(value: string) {
  if (!isAllowedGoogleMapsUrl(value)) {
    throw new ConvexError(
      'Paste a Google Maps link or enter a street address or place name.',
    );
  }

  const response = await fetch(value, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'User-Agent': 'TunaBassoonPrototype/1.0 (educational capstone)',
    },
  });

  if (!response.ok) {
    throw new ConvexError(
      'That Google Maps link could not be opened. Try copying the full link or entering the address.',
    );
  }

  return response.url;
}

async function geocodeAddress(query: string) {
  const endpoint = new URL('https://nominatim.openstreetmap.org/search');
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('limit', '1');
  endpoint.searchParams.set('countrycodes', 'us');
  endpoint.searchParams.set('q', query);

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'TunaBassoonPrototype/1.0 (educational capstone)',
    },
  });

  if (!response.ok) {
    throw new ConvexError(
      'The address lookup service is unavailable right now. You can still place the pin directly on the map.',
    );
  }

  const results = (await response.json()) as {
    lat?: string;
    lon?: string;
    display_name?: string;
  }[];
  const first = results[0];
  const coordinates = first
    ? coordinateResult(first.lat ?? '', first.lon ?? '')
    : null;

  if (!coordinates) {
    throw new ConvexError(
      'No matching place was found. Add a city and state, paste a Google Maps link, or place the pin manually.',
    );
  }

  return {
    ...coordinates,
    displayName: first.display_name ?? query,
  };
}

export const resolveSubmissionLocationInput = action({
  args: {
    input: v.string(),
  },
  handler: async (ctx, args) => {
    await requireContentContributor(ctx);
    const input = args.input.trim();

    if (!input) {
      throw new ConvexError('Enter an address, place name, or Google Maps link.');
    }
    if (input.length > 1_500) {
      throw new ConvexError('The address or map link is too long.');
    }

    const directCoordinates = extractCoordinates(input);
    if (directCoordinates) {
      return {
        ...directCoordinates,
        displayName: 'Coordinates from the provided location',
        resolvedInput: input,
      };
    }

    let geocodeQuery = input;
    let resolvedInput = input;
    if (/^https:\/\//i.test(input)) {
      resolvedInput = await expandGoogleMapsUrl(input);
      const expandedCoordinates = extractCoordinates(resolvedInput);
      if (expandedCoordinates) {
        return {
          ...expandedCoordinates,
          displayName: placeTextFromGoogleUrl(resolvedInput) ||
            'Location from Google Maps',
          resolvedInput,
        };
      }
      geocodeQuery = placeTextFromGoogleUrl(resolvedInput);
      if (!geocodeQuery) {
        throw new ConvexError(
          'That link did not include a readable location. Try the full Google Maps link or enter the address.',
        );
      }
    }

    const result = await geocodeAddress(geocodeQuery);
    return {
      ...result,
      resolvedInput,
    };
  },
});
