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

The `api.locationAgent.generateLocationDescription` action drafts a rewrite
using the app's shared editorial voice. The authenticated editor can review it
and call `api.locationAgent.approveLocationDescription` to save it to Convex.
Pass the location ID and optional editorial notes when calling the action.

Seed locations from the Convex dashboard or by calling the `seedLocations`
mutation. The map reads locations reactively through
`api.locations.getLocations`, so changes in Convex appear automatically.
