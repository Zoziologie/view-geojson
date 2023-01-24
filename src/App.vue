<script setup>
import logo from "./assets/logo.svg";
</script>
<template>
  <b-container fluid class="h-100 d-flex flex-column">
    <b-row class="flex-grow-1">
      <l-map :bounds="bounds" :options="{ zoomControl: false, preferCanvas: true }" ref="map">
        <l-control-layers position="topright"></l-control-layers>
        <l-control position="topleft">
          <b-button v-b-toggle.sidebar-1><b-icon-layout-sidebar-inset></b-icon-layout-sidebar-inset></b-button>
        </l-control>
        <l-tile-layer
          v-for="tileProvider in tileProviders"
          :key="tileProvider.name"
          :name="tileProvider.name"
          :visible="tileProvider.visible"
          :url="tileProvider.url"
          :attribution="tileProvider.attribution"
          layer-type="base"
        />
        <l-control-zoom position="bottomright"></l-control-zoom>
        <!-- <v-marker-cluster
          :options="{
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            iconCreateFunction: iconCreateFunction,
          }"
        >
          <l-marker
            ref="markers"
            :options="{ count: loc.obs.length }"
            :name="loc.locId + loc.obs.map((x) => x.speciesCode).join('_')"
            v-for="loc in locationFiltered"
            :key="loc.locId"
            :lat-lng="loc.latLng"
            @click="clickMarker(loc)"
            :icon="getIcon(loc)"
          >
          </l-marker>
        </v-marker-cluster>
        <l-circle
          v-if="isMylocation & (location != null)"
          :lat-lng="[location.latitude, location.longitude]"
          :radius="distSelected * 1000"
          color="#4ca800"
          :fillOpacity="0"
        />
        -->
      </l-map>

      <b-sidebar id="sidebar-1" title="View Geojson" visible shadow>
        <div class="px-3 py-2">Test</div>
        <template #footer>
          <div class="d-flex bg-dark text-light align-items-center px-3 py-2 w-100 justify-content-between">
            <a v-b-modal.modal-instruction title="instruction/setting"> <b-icon-gear-fill /></a>
            <a href="https://github.com/Zoziologie/global-rare-ebird/" target="_blank" title="github">
              <b-icon-github style="color: white" />
            </a>
            <a href="https://zoziologie.raphaelnussbaumer.com/" target="_blank" title="zoziologie.com">
              <b-img :src="logo" class="zozio" style="height: 1rem" />
            </a>
          </div>
        </template>
      </b-sidebar>
    </b-row>
  </b-container>
</template>

<script>
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet/dist/images/marker-shadow.png";

import "./style.scss";

import { latLngBounds, latLng } from "leaflet";
import {
  LMap,
  LTileLayer,
  LControlLayers,
  LControl,
  LControlZoom,
  LMarker,
  LPopup,
  LIcon,
  LCircle,
  LCircleMarker,
} from "vue2-leaflet";
import Vue2LeafletMarkerCluster from "vue2-leaflet-markercluster";

export default {
  components: {
    LMap,
    LTileLayer,
    LControlLayers,
    LControl,
    LControlZoom,
    LMarker,
    LPopup,
    LIcon,
    LCircle,
    LCircleMarker,
    "v-marker-cluster": Vue2LeafletMarkerCluster,
  },
  data() {
    return {
      logo: logo,
      bounds: latLngBounds([
        [90, 180],
        [-90, -180],
      ]),
      tileProviders: [
        {
          name: "Mapbox.Streets",
          visible: true,
          url: "https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmFmbnVzcyIsImEiOiIzMVE1dnc0In0.3FNMKIlQ_afYktqki-6m0g",
          attribution: "",
        },
        {
          name: "Mapbox.Satellite",
          visible: false,
          url: "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmFmbnVzcyIsImEiOiIzMVE1dnc0In0.3FNMKIlQ_afYktqki-6m0g",
          attribution: "",
        },
        {
          name: "OpenStreetMap",
          visible: false,
          attribution: '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        },
        {
          name: "Esri.WorldImagery",
          visible: false,
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        },
      ],
    };
  },
  methods: {},
  computed: {},
  mounted() {},
  created() {},
  watch: {},
};
</script>
