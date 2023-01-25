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
        <l-polyline
          :lat-lngs="path"
          v-if="path && path.length > 0"
          color="#ad8533"
          :weight="5"
          :opacity="1"
        ></l-polyline>
        <v-marker-cluster
          :options="{
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            iconCreateFunction: iconCreateFunction,
          }"
        >
          <l-marker
            ref="markers"
            v-for="s in hover_s ? hover_s : sightings_species_filters_map"
            :options="{ count: s.count }"
            :key="s.time + s.common_name"
            :lat-lng="[s.lon, s.lat]"
            :icon="getIcon(s)"
          >
            <l-popup :options="{ width: 600 }">
              <p v-html="s.comment"></p>
            </l-popup>
          </l-marker>
        </v-marker-cluster>
      </l-map>

      <b-sidebar id="sidebar-1" title="View Geojson" visible shadow>
        <div class="px-3 py-2">
          <b-form-input v-model="filter_text" placeholder="Filter species name..." />
          <b-card-group deck class="mt-2">
            <b-card header="Sightings" no-body>
              <b-list-group flush>
                <b-list-group-item
                  href="#"
                  v-for="s in sightings_species_filters"
                  :key="s[0].common_name"
                  class="d-flex justify-content-between align-items-center py-2 px-2"
                  @mouseover="hover_s = s"
                  @mouseout="hover_s = false"
                >
                  {{ s[0].common_name }}
                  <b-badge variant="primary" pill>{{ s.length }}</b-badge>
                </b-list-group-item>
              </b-list-group>
            </b-card>
          </b-card-group>
        </div>
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
  LPolyline,
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
    LPolyline,
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
          visible: false,
          url: "https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmFmbnVzcyIsImEiOiIzMVE1dnc0In0.3FNMKIlQ_afYktqki-6m0g",
          attribution: "",
        },
        {
          name: "Mapbox.Satellite",
          visible: true,
          url: "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmFmbnVzcyIsImEiOiIzMVE1dnc0In0.3FNMKIlQ_afYktqki-6m0g",
          attribution: "",
        },
        {
          name: "OpenStreetMap",
          visible: false,
          attribution: '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        },
      ],
      sightings_species: [],
      sightings: [],
      path: null,
      filter_text: "",
      hover_s: false,
    };
  },
  methods: {
    unloadOld(json) {
      this.sightings = json.features
        .filter((f) => f.geometry.type == "Point")
        .map((f) => {
          let s = f.properties;
          return {
            location_name: s.place,
            lat: f.geometry.coordinates[0],
            lon: f.geometry.coordinates[1],
            date: s.date.split(" ")[0], // required
            time: s.date.split(" ")[1],
            common_name: s.specie,
            scientific_name: s.latin,
            count: parseInt(s.count),
            count_precision: "",
            comment: s.description,
          };
        });
      this.sightings_species = this.sightings.reduce((objectsByKeyValue, obj) => {
        const value = obj.common_name;
        objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
        return objectsByKeyValue;
      }, {});

      this.path = json.features
        .filter((d) => d.geometry.type == "LineString")[0]
        .geometry.coordinates.map((c) => [c[1], c[0]]);

      setTimeout(() => {
        this.$refs.map.mapObject.fitBounds(this.sightings.map((s) => [s.lon, s.lat]));
      }, 500);
    },
    iconCreateFunction: function (cluster) {
      var childCount = cluster.getAllChildMarkers().reduce((acc, x) => acc + x.options.count, 0);
      var c = " marker-cluster-";
      if (childCount < 10) {
        c += "small";
      } else if (childCount < 100) {
        c += "medium";
      } else {
        c += "large";
      }

      return new L.DivIcon({
        html: "<div><span>" + childCount + "</span></div>",
        className: "marker-cluster" + c,
        iconSize: new L.Point(40, 40),
      });
    },
    getIcon(s) {
      return L.divIcon({
        className: "my-custom-icon",
        popupAnchor: [0, -34],
        iconAnchor: [12.5, 34],
        iconSize: [25, 34],
        html: `
        <?xml version="1.0" encoding="UTF-8"?><svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24.66 33.31"><defs><style>.cls-1,.cls-2{fill:#fff;}#cls-${"1"}{fill:${
          true ? "#5286bf" : "#ED7A25"
        };}.cls-2{font-family:ArialMT, Arial;font-size:14.2px; fill:#fff;}</style></defs><g><path id="cls-${"1"}" d="M12.35,32.81c-.32,0-.8-.11-1.27-.66-2.97-3.44-5.33-6.7-7.21-9.96-1.43-2.49-2.36-4.61-2.91-6.66C.01,12.01,.54,8.71,2.52,5.74,4.22,3.21,6.6,1.55,9.6,.83c.42-.1,.86-.17,1.29-.23,.19-.03,.38-.06,.57-.09h1.67c.27,.03,.46,.06,.65,.09,.43,.06,.87,.13,1.29,.23,3.35,.83,5.92,2.79,7.64,5.83,.84,1.5,1.33,3.18,1.43,5.01,.15,2.57-.65,4.85-1.36,6.55-1.22,2.91-2.94,5.85-5.26,8.98-1.01,1.36-2.09,2.69-3.14,3.98l-.78,.97c-.45,.56-.93,.68-1.25,.68Z"/><path class="cls-1" d="M13.13,1c.61,.1,1.23,.17,1.83,.32,3.25,.8,5.69,2.69,7.32,5.59,.83,1.48,1.27,3.09,1.37,4.79,.13,2.23-.48,4.31-1.32,6.33-1.33,3.19-3.15,6.11-5.2,8.87-1.25,1.68-2.59,3.3-3.91,4.93-.27,.33-.57,.49-.87,.49s-.61-.16-.89-.49c-2.67-3.09-5.11-6.34-7.15-9.88-1.19-2.07-2.24-4.22-2.86-6.54-.9-3.35-.43-6.5,1.5-9.38,1.63-2.44,3.91-4.01,6.78-4.7,.6-.14,1.22-.21,1.83-.32h1.59m.08-1h-1.84c-.19,.05-.37,.07-.56,.1-.43,.07-.88,.13-1.33,.24C6.35,1.1,3.87,2.82,2.11,5.46,.04,8.56-.51,11.99,.48,15.66c.56,2.09,1.5,4.25,2.96,6.78,1.89,3.29,4.27,6.57,7.26,10.03,.6,.69,1.23,.84,1.65,.84,.61,0,1.19-.31,1.64-.86l.79-.97c1.05-1.29,2.13-2.62,3.15-3.99,2.35-3.16,4.09-6.13,5.32-9.08,.73-1.75,1.55-4.1,1.4-6.77-.11-1.9-.61-3.66-1.5-5.22-1.78-3.16-4.46-5.21-7.95-6.07-.45-.11-.9-.18-1.34-.24-.19-.03-.37-.06-.56-.09h-.08Z"/></g><text class="cls-2" transform="translate(${
          s.count > 9 ? "4.44" : "8.39"
        } 18.5)"><tspan x="0" y="0">${s.count}</tspan></text></svg>`,
      });
    },
  },
  computed: {
    sightings_species_filters_map() {
      return Object.keys(this.sightings_species_filters).reduce((a, key) => {
        return [...a, ...this.sightings_species_filters[key]];
      }, []);
    },
    sightings_species_filters() {
      return Object.keys(this.sightings_species)
        .filter((key) => {
          const ss = this.sightings_species[key][0];
          return (
            ss.common_name.toLowerCase().includes(this.filter_text.toLowerCase()) ||
            ss.scientific_name.toLowerCase().includes(this.filter_text.toLowerCase())
          );
        })
        .reduce((cur, key) => {
          return Object.assign(cur, { [key]: this.sightings_species[key] });
        }, {});
    },
  },
  mounted() {
    const geojson_url = decodeURIComponent(window.location.href.split("?")[1]);
    console.log(geojson_url);
    if (geojson_url) {
      fetch(geojson_url)
        .then((response) => response.json())
        .then((json) => {
          if (json.type && json.type == "FeatureCollection") {
            this.unloadOld(json);
          }
        });
    }
  },
  created() {},
  watch: {},
};
</script>
