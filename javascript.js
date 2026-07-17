// -------------------------
// MAP INITIALIZATION
// -------------------------

const defaultLocation = [-71.1167, 42.377];

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: defaultLocation,
  zoom: 15,
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

// -------------------------
// MAP APPEARANCE
// -------------------------

map.on("load", () => {
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

  // Hide unwanted points of interest and road shields
  hiddenLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", "none");
    }
  });

  // Convert fill and line layers to grayscale
  map.getStyle().layers.forEach((layer) => {
    if (layer.type === "fill") {
      if (map.getPaintProperty(layer.id, "fill-color")) {
        map.setPaintProperty(layer.id, "fill-color", "#d8d8d8");
      }

      if (map.getPaintProperty(layer.id, "fill-outline-color")) {
        map.setPaintProperty(layer.id, "fill-outline-color", "#d8d8d8");
      }
    }

    if (layer.type === "line") {
      if (map.getPaintProperty(layer.id, "line-color")) {
        map.setPaintProperty(layer.id, "line-color", "#999999");
      }
    }
  });

  // Hide patterned fill layers
  map.getStyle().layers.forEach((layer) => {
    if (
      layer.type === "fill" &&
      map.getPaintProperty(layer.id, "fill-pattern")
    ) {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  });

  // Hide parks, wooded areas, grass, and wetlands
  const greenAreaLayers = [
    "park",
    "park_outline",
    "landcover_wood",
    "landcover_grass",
    "landcover_wetland",
  ];

  greenAreaLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", "none");
    }
  });

  // Restore blue water layers after grayscale styling
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

    if (layerId === "water") {
      map.setPaintProperty(layerId, "fill-color", "#9ecbff");
    } else {
      map.setPaintProperty(layerId, "line-color", "#6fa8dc");
    }
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