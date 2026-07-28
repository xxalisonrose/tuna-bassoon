// -------------------------
// MAP INITIALIZATION
// -------------------------

const defaultLocation = [-71.1167, 42.377];

// Boston + Cambridge bounds (for testing purposes, can be adjusted later)
const bounds = [
  [-71.2, 42.3], // Southwest (Newton / Brookline)
  [-70.95, 42.45], // Northeast (Medford / Revere)
];

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: defaultLocation,
  zoom: 15,
  maxBounds: bounds, // Sets bounds as max
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

// -------------------------
// MAP APPEARANCE
// -------------------------
map.on("load", () => {
  // -------------------------
  // MAP STYLE CLEANUP
  // -------------------------

  const hiddenLayers = [
    "poi_r1",
    "poi_r7",
    "poi_r20",
    "poi_transit",
    "highway-shield-non-us",
    "highway-shield-us-interstate",
    "road_shield_us",
    "airport",
  ];

  hiddenLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", "none");
    }
  });

  // Convert fills and lines to grayscale
  map.getStyle().layers.forEach((layer) => {
    if (layer.type === "fill") {
      if (map.getPaintProperty(layer.id, "fill-color")) {
        map.setPaintProperty(layer.id, "fill-color", "#d8d8d8");
      }
    }

    if (layer.type === "line") {
      if (map.getPaintProperty(layer.id, "line-color")) {
        map.setPaintProperty(layer.id, "line-color", "#999999");
      }
    }
  });

  // Hide green areas
  [
    "park",
    "park_outline",
    "landcover_wood",
    "landcover_grass",
    "landcover_wetland",
  ].forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", "none");
    }
  });

  // Restore water
  ["water", "waterway_river", "waterway_other", "waterway_tunnel"].forEach(
    (layerId) => {
      if (!map.getLayer(layerId)) return;

      if (layerId === "water") {
        map.setPaintProperty(layerId, "fill-color", "#9ecbff");
      } else {
        map.setPaintProperty(layerId, "line-color", "#6fa8dc");
      }
    },
  );

  // -------------------------
  // ADD FACT MARKERS - CHATGPT WROTE DESCRIPTION FROM MY NOTES!!!!
  // -------------------------

  map.addSource("places", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            title: "Massachusetts Hall",
            description:
              "<strong>Massachusetts Hall</strong><p>Built in 1718, Massachusetts Hall is the oldest building still standing at Harvard and the second oldest academic building in the United States. During the Revolutionary War, members of the Continental Army stayed here. Legend says soldiers caused 50 pounds in damages, including removing doorknobs, locks, roofs, and woodwork for munitions.</p>",
          },
          geometry: {
            type: "Point",
            coordinates: [-71.1182833, 42.3744389],
          },
        },

        {
          type: "Feature",
          properties: {
            title: "Holbrook Smith Ghost",
            description:
              "<strong>Holbrook Smith</strong><p>Class of 1914. When students were caught with hidden alcohol or contraband in their rooms, they jokingly blamed it on Holbrook Smith, claiming his ghost had brought it there.</p>",
          },
          geometry: {
            type: "Point",
            coordinates: [-71.1182833, 42.3744389],
          },
        },

        {
          type: "Feature",
          properties: {
            title: "John Harvard Statue",
            description:
              "<strong>John Harvard Statue</strong><p>Known as the Statue of Three Lies because the inscription contains three historical inaccuracies.</p>",
          },
          geometry: {
            type: "Point",
            coordinates: [-71.11718, 42.37443],
          },
        },

        {
          type: "Feature",
          properties: {
            title: "Memorial Hall",
            description:
              "<strong>Memorial Hall</strong><p>A historic Harvard landmark completed in 1878.</p>",
          },
          geometry: {
            type: "Point",
            coordinates: [-71.114917, 42.375888],
          },
        },

        {
          type: "Feature",
          properties: {
            title: "Widener Library",
            description:
              "<strong>Widener Library</strong><p>One of Harvard's most famous buildings and home to millions of books.</p>",
          },
          geometry: {
            type: "Point",
            coordinates: [-71.11633, 42.373973],
          },
        },

        {
          type: "Feature",
          properties: {
            title: "Blaschka Glass Flowers",
            description:
              "<strong>Blaschka Glass Flowers</strong><p>A world-famous collection of incredibly detailed glass botanical models.</p>",
          },
          geometry: {
            type: "Point",
            coordinates: [-71.11648, 42.378357],
          },
        },

        {
          type: "Feature",
          properties: {
            title: "Forbes Pigment Collection",
            description:
              "<strong>Forbes Pigment Collection</strong><p>A collection of historic pigments documenting the science and art of color.</p>",
          },
          geometry: {
            type: "Point",
            coordinates: [-71.1143582, 42.3740898],
          },
        },

        {
          type: "Feature",
          properties: {
            title: "Phillips Brooks House",
            description:
              "<strong>Phillips Brooks House</strong><p>Named after Phillips Brooks, an 1885 Harvard graduate and author of the Christmas carol 'O Little Town of Bethlehem.'</p>",
          },
          geometry: {
            type: "Point",
            coordinates: [-71.118, 42.376],
          },
        },

        {
          type: "Feature",
          properties: {
            title: "University Hall",
            description:
              "<strong>University Hall</strong><p>The site of the Rebellion of 1818, a massive food fight that ended with the expulsion of the sophomore class. Legend says the noise left an 'audio imprint' that could supposedly be heard for decades.</p>",
          },
          geometry: {
            type: "Point",
            coordinates: [-71.1169, 42.3745],
          },
        },
      ],
    },
  });

  map.addLayer({
    id: "places",
    type: "circle",
    source: "places",
    paint: {
      "circle-radius": 8,
      "circle-color": "#c80096",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  // Popup
  map.on("click", "places", (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();

    const description = e.features[0].properties.description;

    new maplibregl.Popup()
      .setLngLat(coordinates)
      .setHTML(description)
      .addTo(map);
  });

  // Cursor
  map.on("mouseenter", "places", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "places", () => {
    map.getCanvas().style.cursor = "";
  });
});

// -------------------------
// USER LOCATION STATE
// -------------------------

let userMarker = null;
let userLocation = null;
let followUser = true;

// -------------------------
// USER LOCATION MARKER
// -------------------------

const userDot = document.createElement("div");

userDot.style.width = "18px";
userDot.style.height = "18px";
userDot.style.background = "#3366ff";
userDot.style.border = "3px solid white";
userDot.style.borderRadius = "50%";
userDot.style.boxShadow = "0 0 8px rgba(0, 0, 0, 0.5)";

// Add the location marker after the map finishes loading
map.on("load", () => {
  userMarker = new maplibregl.Marker({
    element: userDot,
  })
    .setLngLat(userLocation ?? defaultLocation)
    .addTo(map);

  console.log("User location marker loaded");
});

// -------------------------
// MAP FOLLOW BEHAVIOR
// -------------------------

// Stop automatically following when the user manually drags the map
map.on("dragstart", () => {
  followUser = false;

  console.log("Location follow mode disabled");
});

// -------------------------
// GPS LOCATION TRACKING
// -------------------------

if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      userLocation = [longitude, latitude];

      console.log("GPS location:", userLocation);

      // Move the blue location marker to the latest GPS coordinates
      if (userMarker) {
        userMarker.setLngLat(userLocation);
      }

      // Keep the map centered on the user while follow mode is active
      if (followUser) {
        map.easeTo({
          center: userLocation,
          duration: 1000,
        });
      }
    },

    (error) => {
      console.error("GPS error:", error.message);
    },

    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    },
  );
} else {
  console.error("Geolocation is not supported by this browser");
}

// -------------------------
// LOCATE CONTROL
// -------------------------

class LocateControl {
  onAdd(mapInstance) {
    this.map = mapInstance;
    this.container = document.createElement("button");

    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this.container.type = "button";
    this.container.innerHTML = "📍";
    this.container.title = "Center map on your location";
    this.container.setAttribute("aria-label", "Center map on your location");

    this.container.style.fontSize = "20px";
    this.container.style.width = "40px";
    this.container.style.height = "40px";
    this.container.style.cursor = "pointer";

    this.container.onclick = () => {
      if (!userLocation) {
        alert("Waiting for GPS location...");
        return;
      }

      // Resume location following when the locate button is pressed
      followUser = true;

      this.map.flyTo({
        center: userLocation,
        zoom: 17,
      });

      console.log("Location follow mode enabled");
    };

    return this.container;
  }

  onRemove() {
    this.container.remove();
    this.map = undefined;
  }
}

map.addControl(new LocateControl(), "top-right");

// Map Maker Examples
const testMarker1 = new maplibregl.Marker()
  .setLngLat([-71.1182833, 42.3744389])
  .addTo(map);

const testMarker2 = new maplibregl.Marker()
  .setLngLat([-71.114917, 42.375888])
  .addTo(map);
