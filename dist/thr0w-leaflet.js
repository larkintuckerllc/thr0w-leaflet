(function() {
  // jscs:disable
  /**
  * This module provides tools to manage Leaflet maps.
  * @module thr0w-leaflet
  */
  // jscs:enable
  'use strict';
  if (window.thr0w === undefined) {
    throw 300;
  }
  var MAX_LAT = 85;
  var MIN_LAT = -85;
  var INTERVAL = 33;
  var HAND_WIDTH = 400;
  var L = window.L;
  var service = {};
  // jscs:disable
  /**
  * This object provides Leaflet maps management functionality.
  * @namespace thr0w
  * @class leaflet
  * @static
  */
  // jscs:enable
  window.thr0w.leaflet = service;
  service.Map = Map;
  // jscs:disable
  /**
  * This class is used to manage Leaflet maps.
  * @namespace thr0w.leaflet
  * @class Map
  * @constructor
  * @param grid {Object} The grid, {{#crossLink "thr0w.Grid"}}thr0w.Grid{{/crossLink}}, object.
  * @param lat {Number} The center latitute; -80 <= lat <= 80.
  * @param lng {Number} The center longitude.
  * @param zoomLevel {Number} Zoom level.
  * @param options {Object} Leaflet options.
  */
  // jscs:enable
  function Map(grid, lat, lng, zoomLevel, options) {
    if (!grid || typeof grid !== 'object') {
      throw 400;
    }
    if (lat  === undefined ||
      typeof lat !== 'number' ||
      lat > MAX_LAT ||
      lat < MIN_LAT) {
      throw 400;
    }
    if (lng === undefined || typeof lng !== 'number') {
      throw 400;
    }
    if (zoomLevel === undefined || typeof zoomLevel !== 'number') {
      throw 400;
    }
    if (!options || typeof options !== 'object') {
      throw 400;
    }
    var centerLatLng = L.latLng(
      lat,
      lng
    );
    var frameEl = grid.getFrame();
    var contentEl = grid.getContent();
    var scale = grid.getRowScale();
    var frameOffsetLeft = frameEl.offsetLeft;
    var frameOffsetTop = frameEl.offsetTop;
    var contentCenterX = grid.getWidth() / 2;
    var contentCenterY = grid.getHeight() / 2;
    var visibleContentLeft = grid.frameXYToContentXY([0,0])[0];
    var visibleContentTop = grid.frameXYToContentXY([0,0])[1];
    var visibleContentRight = grid.frameXYToContentXY([
      frameEl.clientWidth / scale,
      frameEl.clientHeight / scale
    ])[0];
    var visibleContentBottom = grid.frameXYToContentXY([
      frameEl.clientWidth / scale,
      frameEl.clientHeight / scale
    ])[1];
    var visibleContentCenterX = (visibleContentLeft +
      visibleContentRight) / 2;
    var visibleContentCenterY = (visibleContentTop +
      visibleContentBottom) / 2;
    var containerEl = document.createElement('div');
    var mapContainerEl = document.createElement('div');
    var positioningMapContainerEl = document.createElement('div');
    var map;
    var positioningMap;
    var palatteEl = document.createElement('div');
    var mousePanning = false;
    var mouseLastX;
    var mouseLastY;
    var touchOneLastX;
    var touchOneLastY;
    var abort = false;
    var abortInterval;
    var abortCancel = true;
    var syncing = false;
    var iAmSyncing = false;
    var animationSyncing = false;
    var iAmAnimationSyncing = false;
    var nextMove = false;
    var nextMoveDuration;
    var nextMoveLat;
    var nextMoveLng;
    var nextMoveZ;
    var moveAnimationInterval = null;
    var minZoom = options.minZoom !== undefined ? options.minZoom : 1;
    var maxZoom = options.maxZoom !== undefined ? options.maxZoom : 999; // INFINITY
    var sync;
    var animationSync;
    var oobSync;
    var zooming;
    var zoomingDone = false;
    var touchStartRadius;
    // DOM SETUP
    containerEl.classList.add('thr0w_leaflet_container');
    contentEl.appendChild(containerEl);
    mapContainerEl.id = 'thr0w_leaflet_' +
      contentEl.id;
    mapContainerEl.classList.add('thr0w_leaflet_container__map');
    mapContainerEl.style.left = visibleContentLeft + 'px';
    mapContainerEl.style.top = visibleContentTop + 'px';
    mapContainerEl.style.width = (visibleContentRight -
      visibleContentLeft) + 'px';
    mapContainerEl.style.height = (visibleContentBottom -
      visibleContentTop) + 'px';
    containerEl.appendChild(mapContainerEl);
    map = L.map('thr0w_leaflet_' + contentEl.id, options);
    positioningMapContainerEl.id = 'thr0w_leaflet_positioning_' +
      contentEl.id;
    positioningMapContainerEl.classList
      .add('thr0w_leaflet_container__map');
    positioningMapContainerEl.classList
      .add('thr0w_leaflet_container__map--positioning');
    containerEl.appendChild(positioningMapContainerEl);
    positioningMap = L.map('thr0w_leaflet_positioning_' +
      contentEl.id
    );
    palatteEl.classList.add('thr0w_leaflet_palette');
    // jscs:disable
    palatteEl.innerHTML = [
      '<div class="thr0w_leaflet_palette__row">',
      '<div class="thr0w_leaflet_palette__row__cell thr0w_leaflet_palette__row__cell--plus">+</div>',
      '</div>',
      '<div class="thr0w_leaflet_palette__row">',
      '<div class="thr0w_leaflet_palette__row__cell thr0w_leaflet_palette__row__cell--minus">-</div>',
      '</div>'
    ].join('\n');
    // jscs:enable
    contentEl.appendChild(palatteEl);
    // FINALIZE MAPS
    setView();
    zoom(centerLatLng, zoomLevel); // CORRECT FOR MAX/MIN_LAT
    // SYNCS
    sync = new window.thr0w.Sync(
      grid,
      'thr0w_leaflet_' + contentEl.id,
      message,
      receive
    );
    animationSync = new window.thr0w.Sync(
      grid,
      'thr0w_leaflet_animation_' + contentEl.id,
      message,
      receive,
      true
    );
    oobSync = new window.thr0w.Sync(
      grid,
      'thr0w_leaflet_oob_' + contentEl.id,
      messageOob,
      receiveOob
    );
    // EVENT LISTENERS
    containerEl.addEventListener('mousedown', handleMouseDown, true);
    containerEl.addEventListener('mousemove', handleMouseMove, true);
    containerEl.addEventListener('mouseup', handleMouseEnd, true);
    // MOUSELEAVE NOT USED AS LEAFLET HAS LAYERS
    containerEl.addEventListener('touchstart', handleTouchStart, true);
    containerEl.addEventListener('touchmove', handleTouchMove, true);
    containerEl.addEventListener('touchend', handleTouchEnd, true);
    containerEl.addEventListener('touchcancel', handleTouchEnd, true);
    palatteEl.querySelector('.thr0w_leaflet_palette__row__cell--plus')
      .addEventListener('click', zoomIn);
    palatteEl.querySelector('.thr0w_leaflet_palette__row__cell--minus')
      .addEventListener('click', zoomOut);
    // EXPORTS
    this.moveTo = moveTo;
    this.moveStop = moveStop;
    this.getLeafletMap = getLeafletMap;
    this.getCenterLat = getCenterLat;
    this.getCenterLng = getCenterLng;
    this.getZoomLevel = getZoomLevel;
    // FUNCTIONS
    function message() {
      return {
        lat: centerLatLng.lat,
        lng: centerLatLng.lng,
        zoomLevel: zoomLevel
      };
    }
    function receive(data) {
      centerLatLng = L.latLng(data.lat, data.lng);
      zoomLevel = data.zoomLevel;
      setView();
    }
    function messageOob() {
      return {
        syncing: syncing,
        animationSyncing: animationSyncing,
        nextMove: nextMove,
        nextMoveDuration: nextMoveDuration,
        nextMoveLat: nextMoveLat,
        nextMoveLng: nextMoveLng,
        nextMoveZ: nextMoveZ
      };
    }
    function receiveOob(data) {
      syncing = data.syncing;
      animationSyncing = data.animationSyncing;
      if (iAmSyncing && !syncing) {
        iAmSyncing = false;
        sync.idle();
      }
      if (iAmAnimationSyncing && !animationSyncing) {
        iAmAnimationSyncing = false;
        clearAnimation();
        animationSync.idle();
      }
      if (iAmAnimationSyncing && data.nextMove) {
        moveTo(data.nextMoveDuration, data.nextMoveLat,
          data.nextMoveLng, data.nextMoveZ);
      }
    }
    // jscs:disable
    /**
    * This method will animate zoom and then move the map.
    * @method moveTo
    * @param duration {Integer} The maximum number of milliseconds for move.
    * @param lat {Number} The center latitute; -80 <= lat <= 80.
    * @param lng {Number} The center longitude.
    * @param z {Number} Optional zoom level.
    */
    // jscs:enable
    function moveTo(duration, lat, lng, z) {
      if (duration !== parseInt(duration)) {
        throw 400;
      }
      if (lat  === undefined ||
        typeof lat !== 'number' ||
        lat > MAX_LAT ||
        lat < MIN_LAT) {
        throw 400;
      }
      if (lng === undefined || typeof lng !== 'number') {
        throw 400;
      }
      if (z === undefined) {
        z = zoomLevel;
      }
      if (typeof z !== 'number') {
        throw 400;
      }
      var moveTimeLat;
      var moveTimeLng;
      var moveTime;
      var moveIncrementLat;
      var moveIncrementLng;
      var newLng;
      var moveAnimationTime = 0;
      if (syncing) {
        if (iAmSyncing) {
          iAmSyncing = false;
          sync.idle();
        }
        syncing = false;
        oobSync.update();
        oobSync.idle();
      }
      if (animationSyncing) {
        if (iAmAnimationSyncing) {
          clearAnimation();
          animationSync.idle();
          iAmAnimationSyncing = false;
          animationSyncing = false;
          oobSync.update();
          oobSync.idle();
        } else {
          nextMove = true;
          nextMoveDuration = duration;
          nextMoveLat = lat;
          nextMoveLng = lng;
          nextMoveZ = z;
          oobSync.update();
          oobSync.idle();
          return;
        }
      }
      iAmAnimationSyncing = true;
      animationSyncing = true;
      oobSync.update();
      oobSync.idle();
      if (duration !== 0) {
        zoom(centerLatLng, z);
        animationSync.update();
      }
      lat = validLat(L.latLng(lat, lng), z);
      moveTimeLat = Math.abs(duration * (lat - centerLatLng.lat) / 180);
      if (Math.abs(lng - centerLatLng.lng) <= 180) {
        moveTimeLng = Math.abs(duration * (lng - centerLatLng.lng) / 180);
        moveTime = Math.max(moveTimeLat, moveTimeLng);
        moveIncrementLng = moveTime !== 0 ?
          (lng - centerLatLng.lng) / (moveTime / INTERVAL) : 0;
      } else {
        if (centerLatLng.lng >= 0) {
          moveTimeLng = duration * (180 - centerLatLng.lng + 180 + lng) / 180;
          moveTime = Math.max(moveTimeLat, moveTimeLng);
          moveIncrementLng = moveTime !== 0 ?
            (180 - centerLatLng.lng + 180 + lng) / (moveTime / INTERVAL) : 0;
        } else {
          moveTimeLng = duration * (180 + centerLatLng.lng + 180 - lng) / 180;
          moveTime = Math.max(moveTimeLat, moveTimeLng);
          moveIncrementLng = moveTime !== 0 ?
            -1 * (180 + centerLatLng.lng + 180 - lng) /
            (moveTime / INTERVAL) : 0;
        }
      }
      moveIncrementLat = moveTime !== 0 ?
        (lat - centerLatLng.lat) / (moveTime / INTERVAL) : 0;
      moveAnimationInterval = window.setInterval(moveAnimation, INTERVAL);
      function moveAnimation() {
        moveAnimationTime += INTERVAL;
        if (moveAnimationTime > moveTime) {
          window.clearInterval(moveAnimationInterval);
          moveAnimationInterval = null;
          zoomLevel = z;
          centerLatLng = L.latLng(lat,lng);
          setView();
          animationSync.update();
          animationSync.idle();
          iAmAnimationSyncing = false;
          animationSyncing = false;
          oobSync.update();
          oobSync.idle();
        } else {
          if (moveIncrementLng >= 0) {
            newLng = centerLatLng.lng + moveIncrementLng <= 180 ?
              centerLatLng.lng + moveIncrementLng : -180;
          } else {
            newLng = centerLatLng.lng + moveIncrementLng >= -180 ?
              centerLatLng.lng + moveIncrementLng : 180;
          }
          centerLatLng = L.latLng(
            centerLatLng.lat + moveIncrementLat,
            newLng
          );
          setView();
          animationSync.update();
        }
      }
    }
    // jscs:disable
    /**
    * This method will stop active map animations.
    * @method moveStop
    */
    // jscs:enable
    function moveStop() {
      if (animationSyncing) {
        if (iAmAnimationSyncing) {
          iAmAnimationSyncing = false;
          clearAnimation();
          animationSync.idle();
        }
        animationSyncing = false;
        oobSync.update();
        oobSync.idle();
      }
    }
    // jscs:disable
    /**
    * This method will return the Leaflet map.
    * @method getLeafletMap
    * @return {Object} The Leaflet map.
    */
    // jscs:enable
    function getLeafletMap() {
      return map;
    }
    // jscs:disable
    /**
    * This method will return the Leaflet map center latitude.
    * @method getCenterLat
    * @return {Number} The latitude.
    */
    // jscs:enable
    function getCenterLat() {
      return centerLatLng.lat;
    }
    // jscs:disable
    /**
    * This method will return the Leaflet map center longitude.
    * @method getCenterLng
    * @return {Number} The longitude.
    */
    // jscs:enable
    function getCenterLng() {
      return centerLatLng.lng;
    }
    // jscs:disable
    /**
    * This method will return the Leaflet map zoom level.
    * @method getZoomLevel
    * @return {Integer} The zoom level.
    */
    // jscs:enable
    function getZoomLevel() {
      return zoomLevel;
    }
    function zoomIn() {
      zoom(centerLatLng, zoomLevel + 1);
      sync.update();
      sync.idle();
    }
    function zoomOut() {
      zoom(centerLatLng, zoomLevel - 1);
      sync.update();
      sync.idle();
    }
    function handleMouseDown(e) {
      e.stopPropagation();
      mousePanning = true;
      mouseLastX = (e.pageX - frameOffsetLeft) * scale + visibleContentLeft;
      mouseLastY = (e.pageY - frameOffsetTop) * scale + visibleContentTop;
      sync.update();
      iAmSyncing = true;
      syncing = true;
      oobSync.update();
      oobSync.idle();
    }
    function handleMouseMove(e) {
      e.stopPropagation();
      if (iAmSyncing && mousePanning) {
        var mouseCurrentX = (e.pageX - frameOffsetLeft) * scale +
          visibleContentLeft;
        var mouseCurrentY = (e.pageY - frameOffsetTop) * scale +
          visibleContentTop;
        pan(
          mouseLastX - mouseCurrentX,
          mouseLastY - mouseCurrentY
        );
        mouseLastX =  mouseCurrentX;
        mouseLastY = mouseCurrentY;
        sync.update();
      }
    }
    function handleMouseEnd(e) {
      e.stopPropagation();
      if (iAmSyncing && mousePanning) {
        mousePanning = false;
        sync.idle();
        iAmSyncing = false;
        syncing = false;
        oobSync.update();
        oobSync.idle();
      }
    }
    function handleTouchStart(e) {
      e.stopPropagation();
      var touchOneX;
      var touchOneY;
      if (e.touches.length === 1) {
        touchStartRadius = 0;
        touchOneX = (e.touches[0].pageX - frameOffsetLeft) *
          scale + visibleContentLeft;
        touchOneLastX = touchOneX;
        touchOneY = (e.touches[0].pageY - frameOffsetTop) *
          scale + visibleContentTop;
        touchOneLastY = touchOneY;
        abort = false;
        abortCancel = true;
        window.clearInterval(abortInterval);
        abortInterval = window.setInterval(checkAbort, 1000);
        sync.update();
        iAmSyncing = true;
        syncing = true;
        oobSync.update();
        oobSync.idle();
      }
    }
    function handleTouchMove(e) {
      e.stopPropagation();
      if (abort) return;
      if (!iAmSyncing) return;
      abortCancel = false;
      if (zooming) return;
      var touchOneX;
      var touchOneY;
      var i;
      var j;
      var radius;
      for (i = 0; i < e.touches.length; i++) {
        inner: for (j = 0; j < e.touches.length; j++) {
          if (i >= j) continue inner;
          radius = Math.floor(scale * Math.sqrt(
            Math.pow(e.touches[i].pageX - e.touches[j].pageX, 2) +
            Math.pow(e.touches[i].pageY - e.touches[j].pageY, 2)
          ));
          touchStartRadius = radius > touchStartRadius ? radius : touchStartRadius;
        }
      }
      if (touchStartRadius >= HAND_WIDTH) {
        zooming = true;
        return;
      }
      touchOneX = (e.touches[0].pageX - frameOffsetLeft) *
        scale + visibleContentLeft;
      touchOneY = (e.touches[0].pageY - frameOffsetTop) *
        scale + visibleContentTop;
      pan(
        touchOneLastX - touchOneX,
        touchOneLastY - touchOneY
      );
      sync.update();
      touchOneLastX = touchOneX;
      touchOneLastY = touchOneY;
    }
    function handleTouchEnd(e) {
      e.stopPropagation();
      var i;
      var radius;
      var touchEndRadius = 0;
      var changedTouchX = (e.changedTouches[0].pageX - frameOffsetLeft) *
        scale + visibleContentLeft;
      var changedTouchY = (e.changedTouches[0].pageY - frameOffsetTop) *
        scale + visibleContentTop;
      var farthestTouchIndex;
      var farthestTouchX;
      var farthestTouchY;
      var touchEndCenterX;
      var touchEndCenterY;
      var touchEndCenterLatLng;
      var newLat;
      var newLng;
      if (abort) {
        return;
      }
      if (iAmSyncing) {
        if (zooming && !zoomingDone) {
          zoomingDone = true;
          for (i = 0; i < e.touches.length; i++) {
            radius = Math.floor(scale * Math.sqrt(
              Math.pow(e.touches[i].pageX - e.changedTouches[0].pageX, 2) +
              Math.pow(e.touches[i].pageY - e.changedTouches[0].pageY, 2)
            ));
            if (radius > touchEndRadius) {
              farthestTouchIndex = i;
              touchEndRadius = radius;
            }
          }
          farthestTouchX = (e.touches[farthestTouchIndex].pageX - frameOffsetLeft) *
            scale + visibleContentLeft;
          farthestTouchY = (e.touches[farthestTouchIndex].pageY - frameOffsetTop) *
            scale + visibleContentTop;
          touchEndCenterX = (changedTouchX + farthestTouchX) / 2;
          touchEndCenterY = (changedTouchY + farthestTouchY) / 2;
          touchEndCenterLatLng = positioningMap.containerPointToLatLng(
            L.point(touchEndCenterX, touchEndCenterY)
          );
          newLat = (centerLatLng.lat + touchEndCenterLatLng.lat) / 2;
          newLat = newLat <= MAX_LAT ? newLat : MAX_LAT;
          newLat = newLat >= MIN_LAT ? newLat : MIN_LAT;
          newLng = (centerLatLng.lng + touchEndCenterLatLng.lng) / 2;
          if (touchEndCenterX > contentCenterX &&
            touchEndCenterLatLng.lng < centerLatLng.lng) {
            newLng = (centerLatLng.lng + touchEndCenterLatLng.lng + 360) / 2;
            newLng = newLng <= 180 ? newLng : newLng - 360;
          }
          if (touchEndCenterX < contentCenterX &&
            touchEndCenterLatLng.lng > centerLatLng.lng) {
            newLng = (centerLatLng.lng + touchEndCenterLatLng.lng - 360) / 2;
            newLng = newLng >= 180 ? newLng : newLng + 360;
          }
          if (touchEndRadius > touchStartRadius) {
            zoom(L.latLng(newLat, newLng), zoomLevel + 1);
          } else {
            zoom(L.latLng(newLat, newLng), zoomLevel - 1);
          }
          sync.update();
        }
        if (e.touches.length === 1) {
          touchOneLastX = (e.touches[0].pageX - frameOffsetLeft) *
            scale + visibleContentLeft;
          touchOneLastY = (e.touches[0].pageY - frameOffsetTop) *
            scale + visibleContentTop;
        }
        if (e.touches.length === 0) {
          zooming = false;
          zoomingDone = false;
          window.clearInterval(abortInterval);
          sync.idle();
          iAmSyncing = false;
          syncing = false;
          oobSync.update();
          oobSync.idle();
        }
      }
    }
    function pan(shiftX, shiftY) {
      var topLeftLatLng = positioningMap.containerPointToLatLng(
        L.point(0, 0)
      );
      var bottomRightLatLng = positioningMap.containerPointToLatLng(
        L.point(contentCenterX * 2, contentCenterY * 2)
      );
      if (topLeftLatLng.lat > MAX_LAT && shiftY < 0) {
        shiftY = 0;
      }
      if (bottomRightLatLng.lat < MIN_LAT && shiftY > 0) {
        shiftY = 0;
      }
      centerLatLng = positioningMap.containerPointToLatLng(
        L.point(
          contentCenterX + shiftX,
          contentCenterY + shiftY
        )
      );
      setView();
    }
    function zoom(newCenterLatLng, level) {
      var newCenterLat;
      level = level <= maxZoom ? level : maxZoom;
      level = level >= minZoom ? level : minZoom;
      newCenterLat = validLat(newCenterLatLng, level);
      centerLatLng = L.latLng(newCenterLat, newCenterLatLng.lng);
      zoomLevel = level;
      setView();
    }
    function clearAnimation() {
      if (moveAnimationInterval) {
        window.clearInterval(moveAnimationInterval);
        moveAnimationInterval = null;
      }
    }
    function setView() {
      positioningMap.setView(
        centerLatLng,
        zoomLevel,
        {animate: false}
      );
      map.setView(
        positioningMap.containerPointToLatLng(
          L.point(
            visibleContentCenterX,
            visibleContentCenterY
          )
        ),
        zoomLevel,
        {animate: false}
      );
    }
    // HACK FOR GOOGLE TOUCH EVENTS HANDLING WITH MEMORY
    function checkAbort() {
      if (abortCancel) {
        abort = true;
        window.clearInterval(abortInterval);
        sync.idle();
        iAmSyncing = false;
        syncing = false;
        oobSync.update();
        oobSync.idle();
      }
      abortCancel = true;
    }
    function validLat(newCenterLatLng, level) {
      var lat = newCenterLatLng.lat;
      var topLeftLatLng;
      var bottomRightLatLng;
      positioningMap.setView(
        newCenterLatLng,
        level,
        {animate: false}
      );
      topLeftLatLng = positioningMap.containerPointToLatLng(
        L.point(0, 0)
      );
      bottomRightLatLng = positioningMap.containerPointToLatLng(
        L.point(contentCenterX * 2, contentCenterY * 2)
      );
      if (topLeftLatLng.lat > MAX_LAT) {
        lat = positioningMap.containerPointToLatLng(
          L.point(0,
            contentCenterY +
            positioningMap.latLngToContainerPoint(L.latLng(MAX_LAT, 0)).y
          )
        ).lat;
      }
      if (bottomRightLatLng.lat < MIN_LAT) {
        lat = positioningMap.containerPointToLatLng(
          L.point(0,
            positioningMap.latLngToContainerPoint(L.latLng(MIN_LAT, 0)).y -
              contentCenterY
          )
        ).lat;
      }
      positioningMap.setView(
        centerLatLng,
        zoomLevel,
        {animate: false}
      );
      return lat;
    }
  }
})();
