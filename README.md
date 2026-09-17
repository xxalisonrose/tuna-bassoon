# Tuna Bassoon

Docs for map - https://maplibre.org/maplibre-gl-js/docs/

## Convex

Start the Convex development deployment and keep it running while developing:

```sh
npx convex dev
```

Copy the deployment URL into `.env.local`:

```sh
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Add your Google AI Studio key to the Convex deployment environment (do not put it in
`.env.local` or the Expo app):

```sh
npx convex env set GOOGLE_GENERATIVE_AI_API_KEY your-google-ai-key
```

The `api.locationAgent.rewriteLocationDescription` action rewrites a location
using the app's shared editorial voice and saves the result back to Convex.
It requires an authenticated user. Pass the location ID and optional editorial
notes when calling it from an admin/editor workflow.

Seed locations from the Convex dashboard or by calling the `seedLocations`
mutation. The map reads locations reactively through
`api.locations.getLocations`, so changes in Convex appear automatically.
