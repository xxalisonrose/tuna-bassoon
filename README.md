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

Seed locations from the Convex dashboard or by calling the `seedLocations`
mutation. The map reads locations reactively through
`api.locations.getLocations`, so changes in Convex appear automatically.
