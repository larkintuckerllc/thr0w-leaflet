(function() {
  'use strict';
  var thr0w = window.thr0w;
  var L = window.L;
  document.addEventListener('DOMContentLoaded', ready);
  function ready() {
    var frameEl = document.getElementById('my_frame');
    var contentEl = document.getElementById('my_content');
    thr0w.setBase('http://localhost');
    thr0w.addAdminTools(frameEl,
      connectCallback, messageCallback);
    function connectCallback() {
      var grid = new thr0w.Grid(
        frameEl,
        contentEl,
        [[0, 1, 2]]
      );
      /*
      CREATE A LEAFLET MAP WRAPPED IN A MAP OBJECT;
      FILLS THE GRID'S CONTENT.
      */
      var map = new thr0w.leaflet.Map(
        grid,
        0, // LATITUDE
        0, // LONGITUDE
        3, // ZOOM
        /*
        PASS-THROUGH LEAFLET LIBRARY OPTIONS.
        MINIMALLY NEED TO DISABLE THE LEAFLET ZOOM CONTROLS.
        */
        {
          minZoom: 0,
          maxZoom: 7,
          zoomControl: false,
          attributionControl: false
        }
      );
      // EXTRACTING REFERENCE TO LEAFLET MAP
      var leafletMap = map.getLeafletMap();
      /*
      USING LEAFLET LIBRARY API TO OPERATE ON LEAFLET MAP.
      AVOID ANY API CALLS THAT INVOLVE MOVING OR ZOOMING
      THE MAP.
      */
      // jscs:disable
      L.tileLayer(
        'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }
      ).addTo(leafletMap);
      // jscs:disable
    }
    function messageCallback() {
    }
  }
})();
