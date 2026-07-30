// -------------------------
// MAP CONFIGURATION
// -------------------------

const defaultLocation = [-71.1167, 42.377];

const mapBounds = [
  [-71.2, 42.3], // Southwest
  [-70.95, 42.45], // Northeast
];

// -------------------------
// MAP INITIALIZATION
// -------------------------

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: defaultLocation,
  zoom: 15,
  maxBounds: mapBounds,
});

map.addControl(
  new maplibregl.NavigationControl(),
  "top-right",
);

map.on("error", (event) => {
  console.error("MapLibre error:", event.error);
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
userDot.style.backgroundColor = "#3366ff";
userDot.style.border = "3px solid white";
userDot.style.borderRadius = "50%";
userDot.style.boxShadow = "0 0 8px rgba(0, 0, 0, 0.5)";
userDot.style.boxSizing = "border-box";

// -------------------------
// HARVARD PLACE DATA
// -------------------------

const placesData = {
  type: "FeatureCollection",

  features: [
    {
      type: "Feature",

      properties: {
        title: "Massachusetts Hall",
        description: `
          <strong>Massachusetts Hall</strong>
          <p>
            Built in 1718, Massachusetts Hall is the oldest building
            still standing at Harvard and the second-oldest academic
            building in the United States.
          </p>
          <p>
            During the Revolutionary War, members of the Continental
            Army stayed here. Soldiers reportedly caused damage by
            removing items such as doorknobs, locks, roofing materials,
            and woodwork.
          </p>
        `,
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
        description: `
          <strong>Holbrook Smith Ghost</strong>
          <p>
            Holbrook Smith was a member of Harvard's Class of 1914.
            According to campus lore, students caught with hidden
            alcohol or other contraband jokingly blamed his ghost,
            claiming that he had brought the items into their rooms.
          </p>
        `,
      },

      geometry: {
        type: "Point",
        coordinates: [-71.11815, 42.37455],
      },
    },

    {
      type: "Feature",

      properties: {
        title: "John Harvard Statue",
        description: `
          <strong>John Harvard Statue</strong>
          <p>
            The statue is commonly called the Statue of Three Lies
            because its inscription contains three historical
            inaccuracies.
          </p>
        `,
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
        description: `
          <strong>Memorial Hall</strong>
          <p>
            Memorial Hall is a prominent Harvard landmark completed
            in 1878. It was built to honor Harvard graduates who
            served the Union during the American Civil War.
          </p>
        `,
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
        description: `
          <strong>Widener Library</strong>
          <p>
            Widener Library is one of Harvard's best-known buildings
            and is the central library of the Harvard Library system.
          </p>
        `,
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
        description: `
          <strong>Blaschka Glass Flowers</strong>
          <p>
            The Harvard Museum of Natural History houses an extensive
            collection of highly detailed glass botanical models made
            by Leopold and Rudolf Blaschka.
          </p>
        `,
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
        description: `
          <strong>Forbes Pigment Collection</strong>
          <p>
            The collection contains historic pigments used for
            research into the materials, science, and conservation
            of art.
          </p>
        `,
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
        description: `
          <strong>Phillips Brooks House</strong>
          <p>
            Phillips Brooks House was named for the influential
            preacher and Harvard graduate associated with the
            Christmas carol “O Little Town of Bethlehem.”
          </p>
        `,
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
        description: `
          <strong>University Hall</strong>
          <p>
            University Hall was the site of the Rebellion of 1818,
            a student disturbance involving complaints about food
            and university discipline.
          </p>
          <p>
            Campus stories later claimed that the event left behind
            an unusual “audio imprint” that could supposedly be heard
            long afterward.
          </p>
        `,
      },

      geometry: {
        type: "Point",
        coordinates: [-71.1169, 42.3745],
      },
    },
  ],
};

// -------------------------
// MAP LOAD SETUP
// -------------------------

map.on("load", () => {
  console.log("Map loaded successfully");

  addUserLocationMarker();
  cleanUpMapAppearance();
  addHarvardPlaces();

  console.log("Map setup complete");
});

// -------------------------
// ADD USER LOCATION MARKER
// -------------------------

function addUserLocationMarker() {
  userMarker = new maplibregl.Marker({
    element: userDot,
    anchor: "center",
  })
    .setLngLat(userLocation ?? defaultLocation)
    .addTo(map);

  console.log("User location marker loaded");
}

// -------------------------
// MAP APPEARANCE
// -------------------------

function cleanUpMapAppearance() {
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
    hideLayer(layerId);
  });

  map.getStyle().layers.forEach((layer) => {
    try {
      if (
        layer.type === "fill" &&
        map.getPaintProperty(layer.id, "fill-color")
      ) {
        map.setPaintProperty(
          layer.id,
          "fill-color",
          "#d8d8d8",
        );
      }

      if (
        layer.type === "line" &&
        map.getPaintProperty(layer.id, "line-color")
      ) {
        map.setPaintProperty(
          layer.id,
          "line-color",
          "#999999",
        );
      }
    } catch (error) {
      console.warn(
        `Could not restyle layer "${layer.id}":`,
        error,
      );
    }
  });

  const greenAreaLayers = [
    "park",
    "park_outline",
    "landcover_wood",
    "landcover_grass",
    "landcover_wetland",
  ];

  greenAreaLayers.forEach((layerId) => {
    hideLayer(layerId);
  });

  restoreWaterColors();
}

function hideLayer(layerId) {
  if (!map.getLayer(layerId)) {
    return;
  }

  try {
    map.setLayoutProperty(
      layerId,
      "visibility",
      "none",
    );
  } catch (error) {
    console.warn(
      `Could not hide layer "${layerId}":`,
      error,
    );
  }
}

function restoreWaterColors() {
  const waterLayers = [
    "water",
    "waterway_river",
    "waterway_other",
    "waterway_tunnel",
  ];

  waterLayers.forEach((layerId) => {
    if (!map.getLayer(layerId)) {
      return;
    }

    try {
      if (layerId === "water") {
        map.setPaintProperty(
          layerId,
          "fill-color",
          "#9ecbff",
        );
      } else {
        map.setPaintProperty(
          layerId,
          "line-color",
          "#6fa8dc",
        );
      }
    } catch (error) {
      console.warn(
        `Could not restore water layer "${layerId}":`,
        error,
      );
    }
  });
}

// -------------------------
// HARVARD FACT MARKERS
// -------------------------

function addHarvardPlaces() {
  if (map.getSource("places")) {
    return;
  }

  map.addSource("places", {
    type: "geojson",
    data: placesData,
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

  map.on("click", "places", (event) => {
    const feature = event.features?.[0];

    if (!feature) {
      return;
    }

    const coordinates =
      feature.geometry.coordinates.slice();

    const description =
      feature.properties.description;

    new maplibregl.Popup({
      offset: 12,
      maxWidth: "350px",
    })
      .setLngLat(coordinates)
      .setHTML(description)
      .addTo(map);
  });

  map.on("mouseenter", "places", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "places", () => {
    map.getCanvas().style.cursor = "";
  });

  console.log("Harvard fact markers loaded");
}

// -------------------------
// MAP FOLLOW BEHAVIOR
// -------------------------

map.on("dragstart", () => {
  followUser = false;

  console.log("Location follow mode disabled");
});

// -------------------------
// GPS LOCATION TRACKING
// -------------------------

if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    handleLocationUpdate,
    handleLocationError,
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    },
  );
} else {
  console.error(
    "Geolocation is not supported by this browser",
  );
}

function handleLocationUpdate(position) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;

  userLocation = [longitude, latitude];

  console.log("GPS location:", userLocation);

  if (userMarker) {
    userMarker.setLngLat(userLocation);
  }

  if (followUser) {
    map.easeTo({
      center: userLocation,
      duration: 1000,
    });
  }
}

function handleLocationError(error) {
  const messages = {
    1: "Location permission was denied.",
    2: "Your location could not be determined.",
    3: "The location request timed out.",
  };

  console.error(
    "GPS error:",
    messages[error.code] ?? error.message,
  );
}

// -------------------------
// LOCATE CONTROL
// -------------------------

class LocateControl {
  onAdd(mapInstance) {
    this.map = mapInstance;
    this.container = document.createElement("button");

    this.container.className =
      "maplibregl-ctrl maplibregl-ctrl-group";

    this.container.type = "button";
    this.container.innerHTML = "📍";
    this.container.title =
      "Center map on your location";

    this.container.setAttribute(
      "aria-label",
      "Center map on your location",
    );

    this.container.style.fontSize = "20px";
    this.container.style.width = "40px";
    this.container.style.height = "40px";
    this.container.style.cursor = "pointer";

    this.container.addEventListener(
      "click",
      () => {
        if (!userLocation) {
          alert(
            "Waiting for your GPS location. Make sure location access is allowed.",
          );

          return;
        }

        followUser = true;

        this.map.flyTo({
          center: userLocation,
          zoom: 17,
          duration: 1000,
        });

        console.log(
          "Location follow mode enabled",
        );
      },
    );

    return this.container;
  }

  onRemove() {
    this.container.remove();
    this.map = undefined;
  }
}

map.addControl(
  new LocateControl(),
  "top-right",
);