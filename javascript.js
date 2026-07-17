// Create the map
const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [-71.1167, 42.377],
  zoom: 15,
});

// Add controls
map.addControl(new maplibregl.NavigationControl(), "top-right");

// -------------------------
// MAP STYLE CLEANUP
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

  hiddenLayers.forEach((layer) => {
    if (map.getLayer(layer)) {
      map.setLayoutProperty(layer, "visibility", "none");
    }
  });

  // grayscale
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

  // Remove patterns
  map.getStyle().layers.forEach((layer) => {
    if (
      layer.type === "fill" &&
      map.getPaintProperty(layer.id, "fill-pattern")
    ) {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  });

  // Remove green areas
  [
    "park",
    "park_outline",
    "landcover_wood",
    "landcover_grass",
    "landcover_wetland",
  ].forEach((layer) => {
    if (map.getLayer(layer)) {
      map.setLayoutProperty(layer, "visibility", "none");
    }
  });

  // Restore water
  ["water", "waterway_river", "waterway_other", "waterway_tunnel"].forEach(
    (layer) => {
      if (map.getLayer(layer)) {
        if (layer === "water") {
          map.setPaintProperty(layer, "fill-color", "#9ecbff");
        } else {
          map.setPaintProperty(layer, "line-color", "#6fa8dc");
        }
      }
    },
  );
});

// -------------------------
// GPS MARKER
// -------------------------

// -------------------------
// GPS MARKER
// -------------------------

let userMarker = null;
let userLocation = null;

// Create blue dot
const userDot = document.createElement("div");

userDot.style.width = "18px";
userDot.style.height = "18px";
userDot.style.background = "#3366ff";
userDot.style.border = "3px solid white";
userDot.style.borderRadius = "50%";
userDot.style.boxShadow = "0 0 8px rgba(0,0,0,.5)";

// Create marker after map loads
map.on("load", () => {
  userMarker = new maplibregl.Marker({
    element: userDot,
  })
    .setLngLat([-71.1167, 42.377])
    .addTo(map);

  console.log("Marker loaded");
});

// GPS tracking
navigator.geolocation.watchPosition(
  (position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    userLocation = [longitude, latitude];

    console.log("GPS:", userLocation);

    // Move marker only
    if (userMarker) {
      userMarker.setLngLat(userLocation);
    }
  },

  (error) => {
    console.error("GPS Error:", error.message);
  },

  {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 10000,
  },
);
// -------------------------
// LOCATE BUTTON
// -------------------------

class LocateControl {
  onAdd(map) {
    this.container = document.createElement("button");

    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    this.container.innerHTML = "📍";

    this.container.style.fontSize = "20px";
    this.container.style.width = "40px";
    this.container.style.height = "40px";

    this.container.onclick = () => {
      if (userLocation) {
        map.flyTo({
          center: userLocation,
          zoom: 17,
        });
      } else {
        alert("Waiting for GPS...");
      }
    };

    return this.container;
  }

  onRemove() {
    this.container.remove();
  }
}

map.addControl(new LocateControl(), "top-right");
