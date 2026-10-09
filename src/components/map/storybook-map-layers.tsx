import { Layer } from '@maplibre/maplibre-react-native';

export function StorybookMapLayers() {
  return (
    <>
      <Layer
        id="storybook-woods"
        type="fill"
        source="openmaptiles"
        source-layer="landcover"
        beforeId="waterway_tunnel"
        filter={['==', ['get', 'class'], 'wood']}
        paint={{
          'fill-color': '#759B69',
          'fill-opacity': 0.52,
        }}
      />

      <Layer
        id="storybook-grass"
        type="fill"
        source="openmaptiles"
        source-layer="landcover"
        beforeId="waterway_tunnel"
        filter={['==', ['get', 'class'], 'grass']}
        paint={{
          'fill-color': '#9EC68D',
          'fill-opacity': 0.66,
        }}
      />

      <Layer
        id="storybook-parks"
        type="fill"
        source="openmaptiles"
        source-layer="park"
        beforeId="waterway_tunnel"
        paint={{
          'fill-color': '#8EBD7E',
          'fill-opacity': 0.62,
          'fill-outline-color': '#6D9D62',
        }}
      />

      <Layer
        id="storybook-water"
        type="fill"
        source="openmaptiles"
        source-layer="water"
        beforeId="landcover_sand"
        filter={['!=', ['get', 'brunnel'], 'tunnel']}
        paint={{
          'fill-color': '#78B7CF',
        }}
      />

      <Layer
        id="storybook-pedestrian-areas"
        type="fill"
        source="openmaptiles"
        source-layer="transportation"
        beforeId="road_motorway_link_casing"
        filter={[
          'all',
          [
            'match',
            ['geometry-type'],
            ['Polygon', 'MultiPolygon'],
            true,
            false,
          ],
          [
            'match',
            ['get', 'class'],
            ['path', 'pedestrian', 'service'],
            true,
            false,
          ],
        ]}
        paint={{
          'fill-color': '#D8CCB5',
          'fill-opacity': 0.82,
        }}
      />

      <Layer
        id="storybook-buildings"
        type="fill-extrusion"
        source="openmaptiles"
        source-layer="building"
        beforeId="boundary_3"
        minzoom={14}
        paint={{
          'fill-extrusion-base': [
            'coalesce',
            ['get', 'render_min_height'],
            0,
          ],
          'fill-extrusion-color': '#D2B48B',
          'fill-extrusion-height': [
            'coalesce',
            ['get', 'render_height'],
            8,
          ],
          'fill-extrusion-opacity': 0.9,
          'fill-extrusion-vertical-gradient': true,
        }}
      />
    </>
  );
}
