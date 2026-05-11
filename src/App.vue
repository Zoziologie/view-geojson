<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import logo from "./assets/logo.svg";
import "./style.scss";

const mapRoot = ref(null);
const map = shallowRef(null);
const markersLayer = shallowRef(null);
const pathLayer = shallowRef(null);

const filterText = ref("");
const hoveredSpecies = ref("");
const sidebarOpen = ref(window.innerWidth >= 960);
const sightings = ref([]);
const pathCoordinates = ref([]);
const loading = ref(false);
const loadError = ref("");
const shouldFitBounds = ref(false);

const tileProviders = [
  {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    active: true,
  },
  {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    active: false,
  },
  {
    name: "Carto Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
    active: false,
  },
];

const geojsonUrl = (() => {
  const rawQuery = window.location.search.slice(1);
  if (!rawQuery) {
    return "";
  }

  try {
    return decodeURIComponent(rawQuery);
  } catch {
    return rawQuery;
  }
})();

const groupedSightings = computed(() => {
  const groups = new Map();

  for (const sighting of sightings.value) {
    const key = sighting.commonName;
    const list = groups.get(key) ?? [];
    list.push(sighting);
    groups.set(key, list);
  }

  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
});

const filteredGroups = computed(() => {
  const query = filterText.value.trim().toLowerCase();

  if (!query) {
    return groupedSightings.value;
  }

  return groupedSightings.value.filter(([, items]) => {
    const first = items[0];
    return [first.commonName, first.scientificName]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });
});

const visibleSightings = computed(() => {
  if (hoveredSpecies.value) {
    const hoveredGroup = filteredGroups.value.find(([name]) => name === hoveredSpecies.value);
    return hoveredGroup ? hoveredGroup[1] : [];
  }

  return filteredGroups.value.flatMap(([, items]) => items);
});

const filteredSpeciesCount = computed(() => filteredGroups.value.length);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatComment(comment) {
  return escapeHtml(comment).replaceAll("\n", "<br>");
}

function createMarkerIcon(count) {
  const label = Number.isFinite(count) ? count : "X";
  const offset = String(label).length > 1 ? "4.44" : "8.39";

  return L.divIcon({
    className: "sighting-icon",
    popupAnchor: [0, -34],
    iconAnchor: [12.5, 34],
    iconSize: [25, 34],
    html: `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24.66 33.31"><defs><style>.cls-1,.cls-2{fill:#fff}.cls-1-pin{fill:#5286bf}.cls-2{font-family:ArialMT,Arial;font-size:14.2px}</style></defs><g><path class="cls-1-pin" d="M12.35,32.81c-.32,0-.8-.11-1.27-.66-2.97-3.44-5.33-6.7-7.21-9.96-1.43-2.49-2.36-4.61-2.91-6.66C.01,12.01,.54,8.71,2.52,5.74,4.22,3.21,6.6,1.55,9.6,.83c.42-.1,.86-.17,1.29-.23,.19-.03,.38-.06,.57-.09h1.67c.27,.03,.46,.06,.65,.09,.43,.06,.87,.13,1.29,.23,3.35,.83,5.92,2.79,7.64,5.83,.84,1.5,1.33,3.18,1.43,5.01,.15,2.57-.65,4.85-1.36,6.55-1.22,2.91-2.94,5.85-5.26,8.98-1.01,1.36-2.09,2.69-3.14,3.98l-.78,.97c-.45,.56-.93,.68-1.25,.68Z"/><path class="cls-1" d="M13.13,1c.61,.1,1.23,.17,1.83,.32,3.25,.8,5.69,2.69,7.32,5.59,.83,1.48,1.27,3.09,1.37,4.79,.13,2.23-.48,4.31-1.32,6.33-1.33,3.19-3.15,6.11-5.2,8.87-1.25,1.68-2.59,3.3-3.91,4.93-.27,.33-.57,.49-.87,.49s-.61-.16-.89-.49c-2.67-3.09-5.11-6.34-7.15-9.88-1.19-2.07-2.24-4.22-2.86-6.54-.9-3.35-.43-6.5,1.5-9.38,1.63-2.44,3.91-4.01,6.78-4.7,.6-.14,1.22-.21,1.83-.32h1.59m.08-1h-1.84c-.19,.05-.37,.07-.56,.1-.43,.07-.88,.13-1.33,.24C6.35,1.1,3.87,2.82,2.11,5.46,.04,8.56-.51,11.99,.48,15.66c.56,2.09,1.5,4.25,2.96,6.78,1.89,3.29,4.27,6.57,7.26,10.03,.6,.69,1.23,.84,1.65,.84,.61,0,1.19-.31,1.64-.86l.79-.97c1.05-1.29,2.13-2.62,3.15-3.99,2.35-3.16,4.09-6.13,5.32-9.08,.73-1.75,1.55-4.1,1.4-6.77-.11-1.9-.61-3.66-1.5-5.22-1.78-3.16-4.46-5.21-7.95-6.07-.45-.11-.9-.18-1.34-.24-.19-.03-.37-.06-.56-.09h-.08Z"/></g><text class="cls-2" transform="translate(${offset} 18.5)"><tspan x="0" y="0">${label}</tspan></text></svg>`,
  });
}

function createClusterIcon(cluster) {
  const total = cluster
    .getAllChildMarkers()
    .map((marker) => marker.options.count)
    .reduce((sum, count) => sum + (Number.isFinite(count) ? count : 0), 0);

  const label = total || "X";
  let sizeClass = "small";
  if (total >= 100) {
    sizeClass = "large";
  } else if (total >= 10) {
    sizeClass = "medium";
  }

  return L.divIcon({
    html: `<div><span>${label}</span></div>`,
    className: `marker-cluster marker-cluster-${sizeClass}`,
    iconSize: L.point(40, 40, true),
  });
}

function buildPopupContent(sighting) {
  const dateLine = sighting.date ? `<p>${escapeHtml(sighting.date)}</p>` : "";
  const placeLine = sighting.locationName ? `<p>${escapeHtml(sighting.locationName)}</p>` : "";
  const commentLine = sighting.comment
    ? `<p class="popup-comment">${formatComment(sighting.comment)}</p>`
    : "";
  const countLine = Number.isFinite(sighting.count)
    ? `<p>Count: <strong>${sighting.count}</strong></p>`
    : "";
  const mapLink = `<a href="https://www.google.com/maps/place/${sighting.lat},${sighting.lng}" target="_blank" rel="noreferrer">Map</a>`;
  const sourceLink = sighting.link
    ? `<a href="${escapeHtml(sighting.link)}" target="_blank" rel="noreferrer">Observation</a>`
    : "";

  return `
    <article class="popup-card">
      <h3>${escapeHtml(sighting.commonName)}</h3>
      ${sighting.scientificName ? `<p><em>${escapeHtml(sighting.scientificName)}</em></p>` : ""}
      ${dateLine}
      ${placeLine}
      ${countLine}
      ${commentLine}
      <p class="popup-links">${mapLink}${sourceLink ? ` · ${sourceLink}` : ""}</p>
    </article>
  `;
}

function parseGeojson(featureCollection) {
  const nextSightings = [];
  const nextPathCoordinates = [];

  for (const [index, feature] of (featureCollection.features ?? []).entries()) {
    if (feature?.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)) {
      const [lng, lat] = feature.geometry.coordinates;
      const properties = feature.properties ?? {};
      const parsedCount = Number.parseInt(properties.count, 10);

      nextSightings.push({
        id: `${properties.specie ?? "unknown"}-${index}`,
        lat,
        lng,
        date: properties.date ?? "",
        commonName: properties.specie ?? "Unknown species",
        scientificName: properties.latin ?? "",
        locationName: properties.place ?? "",
        count: Number.isFinite(parsedCount) ? parsedCount : null,
        comment: properties.description ?? properties.comment ?? "",
        link: properties.link ?? "",
      });
    }

    if (feature?.geometry?.type === "LineString" && nextPathCoordinates.length === 0) {
      nextPathCoordinates.push(
        ...feature.geometry.coordinates
          .filter((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2)
          .map(([lng, lat]) => [lat, lng]),
      );
    }
  }

  sightings.value = nextSightings;
  pathCoordinates.value = nextPathCoordinates;
  hoveredSpecies.value = "";
  shouldFitBounds.value = true;
}

function renderMapData() {
  if (!map.value || !markersLayer.value || !pathLayer.value) {
    return;
  }

  markersLayer.value.clearLayers();
  pathLayer.value.setLatLngs(pathCoordinates.value);

  const markers = visibleSightings.value.map((sighting) => {
    const marker = L.marker([sighting.lat, sighting.lng], {
      icon: createMarkerIcon(sighting.count),
      count: sighting.count,
    });
    marker.bindPopup(buildPopupContent(sighting), {
      maxWidth: 320,
    });
    return marker;
  });

  markersLayer.value.addLayers(markers);

  if (shouldFitBounds.value) {
    const points = [
      ...sightings.value.map((sighting) => [sighting.lat, sighting.lng]),
      ...pathCoordinates.value,
    ];

    if (points.length) {
      map.value.fitBounds(points, { padding: [32, 32] });
    }

    shouldFitBounds.value = false;
  }
}

function invalidateMapSize() {
  if (!map.value) {
    return;
  }

  window.setTimeout(() => {
    map.value?.invalidateSize();
  }, 180);
}

async function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
  await nextTick();
  invalidateMapSize();
}

function handleResize() {
  invalidateMapSize();
}

async function loadGeojson() {
  if (!geojsonUrl) {
    return;
  }

  loading.value = true;
  loadError.value = "";

  try {
    const response = await fetch(geojsonUrl);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const json = await response.json();
    if (json?.type !== "FeatureCollection") {
      throw new Error("Expected a GeoJSON FeatureCollection.");
    }

    parseGeojson(json);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "Failed to load GeoJSON.";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const initialCenter = [46.57591, 7.84956];
  map.value = L.map(mapRoot.value, {
    center: initialCenter,
    zoom: 8,
    preferCanvas: true,
    zoomControl: false,
  });

  const baseLayerMap = {};
  for (const tileProvider of tileProviders) {
    const layer = L.tileLayer(tileProvider.url, {
      attribution: tileProvider.attribution,
      maxZoom: 19,
    });

    baseLayerMap[tileProvider.name] = layer;
    if (tileProvider.active) {
      layer.addTo(map.value);
    }
  }

  L.control.layers(baseLayerMap, undefined, { collapsed: true }).addTo(map.value);
  L.control.zoom({ position: "bottomright" }).addTo(map.value);

  markersLayer.value = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 50,
    iconCreateFunction: createClusterIcon,
  }).addTo(map.value);

  pathLayer.value = L.polyline([], {
    color: "#ad8533",
    weight: 5,
    opacity: 0.8,
  }).addTo(map.value);

  window.addEventListener("resize", handleResize);

  await loadGeojson();
  renderMapData();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  map.value?.remove();
});

watch(visibleSightings, () => {
  renderMapData();
});

watch(pathCoordinates, () => {
  renderMapData();
});
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-open': sidebarOpen }">
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar__header">
        <div>
          <p class="eyebrow">View GeoJSON</p>
          <h1>Explore bird sightings</h1>
          <p class="sidebar__intro">
            Load a GeoJSON export through the URL query string to browse clustered points and track
            lines.
          </p>
        </div>
        <button class="icon-button sidebar__close" type="button" @click="toggleSidebar">
          Close
        </button>
      </div>

      <div class="sidebar__controls">
        <label class="search-field">
          <span>Filter species</span>
          <input v-model.trim="filterText" type="search" placeholder="Common or scientific name" />
        </label>

        <div class="stats-grid">
          <article>
            <span>Species</span>
            <strong>{{ filteredSpeciesCount }}</strong>
          </article>
          <article>
            <span>Sightings</span>
            <strong>{{ visibleSightings.length }}</strong>
          </article>
        </div>
      </div>

      <div class="species-list">
        <button
          v-for="[name, items] in filteredGroups"
          :key="name"
          class="species-item"
          :class="{ active: hoveredSpecies === name }"
          type="button"
          @mouseenter="hoveredSpecies = name"
          @mouseleave="hoveredSpecies = ''"
          @focus="hoveredSpecies = name"
          @blur="hoveredSpecies = ''"
        >
          <span class="species-item__name">{{ name }}</span>
          <span class="species-item__count">{{ items.length }}</span>
        </button>

        <p v-if="!filteredGroups.length" class="empty-state">No species match the current filter.</p>
      </div>

      <footer class="sidebar__footer">
        <a href="https://github.com/Zoziologie/view-geojson/" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href="https://zoziologie.raphaelnussbaumer.com/" target="_blank" rel="noreferrer">
          <img :src="logo" alt="Zoziologie" class="footer-logo" />
        </a>
      </footer>
    </aside>

    <main class="map-panel">
      <button class="icon-button sidebar-toggle" type="button" @click="toggleSidebar">
        {{ sidebarOpen ? "Hide list" : "Show list" }}
      </button>
      <div ref="mapRoot" class="map-root"></div>

      <div v-if="!geojsonUrl || loading || loadError" class="status-card">
        <p v-if="loading">Loading GeoJSON…</p>
        <template v-else-if="loadError">
          <p>Unable to load the GeoJSON file.</p>
          <p class="status-detail">{{ loadError }}</p>
        </template>
        <template v-else>
          <p>No GeoJSON URL provided.</p>
          <p class="status-detail">
            Open the app with a percent-encoded GeoJSON URL in the query string.
          </p>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100%;
  background:
    radial-gradient(circle at top left, rgba(82, 134, 191, 0.18), transparent 28%),
    linear-gradient(180deg, #f4f8fb 0%, #edf3f7 100%);
}

.sidebar {
  display: flex;
  width: 0;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(23, 48, 66, 0.08);
  background: rgba(250, 252, 253, 0.92);
  backdrop-filter: blur(10px);
  transition:
    width 0.18s ease,
    border-color 0.18s ease;
}

.sidebar.open {
  width: min(24rem, 85vw);
}

.sidebar__header,
.sidebar__controls,
.species-list,
.sidebar__footer {
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

.sidebar__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1.25rem;
}

.eyebrow {
  margin: 0 0 0.5rem;
  color: #5286bf;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #173042;
  font-size: clamp(1.5rem, 2vw, 2rem);
  line-height: 1.05;
}

.sidebar__intro {
  margin: 0.75rem 0 0;
  color: #496476;
  line-height: 1.5;
}

.sidebar__controls {
  padding-top: 1.25rem;
}

.search-field {
  display: grid;
  gap: 0.5rem;
}

.search-field span,
.stats-grid span {
  color: #5a7588;
  font-size: 0.82rem;
  font-weight: 600;
}

.search-field input {
  width: 100%;
  border: 1px solid rgba(82, 134, 191, 0.25);
  border-radius: 0.9rem;
  padding: 0.8rem 0.95rem;
  background: #fff;
  color: #173042;
  font: inherit;
}

.search-field input:focus {
  outline: 2px solid rgba(82, 134, 191, 0.24);
  outline-offset: 2px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1rem;
}

.stats-grid article {
  border: 1px solid rgba(82, 134, 191, 0.12);
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  background: rgba(255, 255, 255, 0.86);
}

.stats-grid strong {
  display: block;
  margin-top: 0.35rem;
  color: #173042;
  font-size: 1.35rem;
}

.species-list {
  display: grid;
  gap: 0.65rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  overflow: auto;
}

.species-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgba(82, 134, 191, 0.12);
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  background: rgba(255, 255, 255, 0.88);
  color: #173042;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.species-item:hover,
.species-item:focus,
.species-item.active {
  transform: translateY(-1px);
  border-color: rgba(82, 134, 191, 0.4);
  box-shadow: 0 12px 24px rgba(23, 48, 66, 0.08);
  outline: none;
}

.species-item__name {
  font-weight: 600;
}

.species-item__count {
  min-width: 2rem;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  background: #5286bf;
  color: #fff;
  font-size: 0.82rem;
  text-align: center;
}

.empty-state {
  margin: 0;
  color: #5a7588;
  line-height: 1.5;
}

.sidebar__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
  border-top: 1px solid rgba(23, 48, 66, 0.08);
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.sidebar__footer a {
  color: #173042;
  font-weight: 600;
  text-decoration: none;
}

.footer-logo {
  display: block;
  height: 1.15rem;
}

.map-panel {
  position: relative;
  min-width: 0;
  flex: 1;
}

.map-root {
  height: 100%;
  width: 100%;
}

.icon-button {
  border: 0;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  background: rgba(23, 48, 66, 0.88);
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.sidebar-toggle {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 900;
  box-shadow: 0 10px 24px rgba(23, 48, 66, 0.22);
}

.sidebar__close {
  flex-shrink: 0;
}

.status-card {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  z-index: 900;
  max-width: min(26rem, calc(100% - 2rem));
  border: 1px solid rgba(23, 48, 66, 0.08);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  background: rgba(255, 255, 255, 0.94);
  color: #173042;
  box-shadow: 0 18px 40px rgba(23, 48, 66, 0.12);
}

.status-card p {
  margin: 0;
}

.status-detail {
  margin-top: 0.45rem !important;
  color: #5a7588;
  line-height: 1.45;
}

:deep(.leaflet-control-attribution) {
  font-family: inherit;
}

:deep(.leaflet-popup-content) {
  margin: 0.85rem 1rem;
}

:deep(.popup-card) h3 {
  margin: 0 0 0.35rem;
  color: #173042;
  font-size: 1rem;
}

:deep(.popup-card p) {
  margin: 0.25rem 0;
  color: #496476;
  line-height: 1.45;
}

:deep(.popup-comment) {
  white-space: normal;
}

:deep(.popup-links) {
  margin-top: 0.65rem !important;
}

:deep(.popup-links a) {
  color: #376da7;
  font-weight: 600;
  text-decoration: none;
}

:deep(.sighting-icon) {
  background: transparent;
  border: 0;
}

@media (max-width: 959px) {
  .sidebar {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 950;
    width: min(24rem, calc(100vw - 2.5rem));
    max-width: calc(100vw - 2.5rem);
    transform: translateX(-100%);
    transition: transform 0.18s ease;
  }

  .sidebar.open {
    width: min(24rem, calc(100vw - 2.5rem));
    transform: translateX(0);
  }

  .sidebar-toggle {
    top: 0.75rem;
    left: 0.75rem;
  }
}
</style>
