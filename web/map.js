(function () {
  'use strict';
  const NDVI_DATE = '2025-07-01';
  const S = {
    en: {
      ndvi: 'NASA NDVI (context)', cells: 'Trend cells', base: 'NASA Blue Marble',
      rising: 'rising', falling: 'falling', sig: 'significant', notSig: 'not significant',
      slope: 'Slope', pval: 'p (perm)', unit: '/yr', elev: 'cell mean elev.',
      offline: 'Basemap unavailable — vector layers still active',
      ndviNote: 'MODIS Terra NDVI 8-day · context only, not used in the statistics',
      cellNote: 'Sampled POWER cell', ring: 'ring = FDR-significant (q<0.05)'
    },
    ar: {
      ndvi: 'NDVI من ناسا (سياق)', cells: 'خلايا الاتجاه', base: 'خريطة ناسا (Blue Marble)',
      rising: 'صاعدة', falling: 'هابطة', sig: 'معنوية', notSig: 'غير معنوية',
      slope: 'الميل', pval: 'p (تبديل)', unit: '/سنة', elev: 'متوسط ارتفاع الخلية',
      offline: 'الخريطة الأساسية غير متاحة — الطبقات المتجهة تعمل',
      ndviNote: 'MODIS Terra NDVI كل 8 أيام · للسياق فقط، غير مستخدم في الإحصاء',
      cellNote: 'خلية باور مقاسة', ring: 'الحلقة = معنوية بعد تصحيح FDR'
    }
  };
  const st = { map: null, base: null, gibs: null, cells: null, box: null, legend: null, ctrl: null, data: null, lang: 'en', ok: 0, err: 0 };

  const num = x => (x === null || x === undefined || !isFinite(x)) ? '—' : Number(Number(x).toPrecision(3)).toString();
  const txt = k => (S[st.lang] && S[st.lang][k]) || S.en[k];

  function spark(series, color) {
    if (!series || series.length < 2) return '';
    const w = 224, h = 56, pad = 5;
    const ys = series.map(p => p[1]);
    const mn = Math.min.apply(null, ys), mx = Math.max.apply(null, ys);
    const X = i => pad + i * (w - 2 * pad) / (series.length - 1);
    const Y = v => h - pad - (v - mn) / ((mx - mn) || 1) * (h - 2 * pad);
    const pts = series.map((p, i) => X(i).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ');
    const t0 = series[0][0], t1 = series[series.length - 1][0];
    return '<svg class="pp-spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<text x="' + pad + '" y="' + (h - 1) + '" fill="#8B96A8" font-size="9">' + t0 + '</text>' +
      '<text x="' + (w - pad) + '" y="' + (h - 1) + '" fill="#8B96A8" font-size="9" text-anchor="end">' + t1 + '</text></svg>';
  }

  function ensure() {
    if (st.map) return st.map;
    const el = document.getElementById('map');
    if (!el || !window.L) return null;
    const map = L.map(el, { zoomControl: true, scrollWheelZoom: false, minZoom: 2, maxZoom: 11, worldCopyJump: true });
    st.map = map;
    st.base = L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg', {
      maxNativeZoom: 8, maxZoom: 11, tileSize: 256, className: 'basemap-dim',
      attribution: 'NASA GIBS'
    }).addTo(map);
    st.gibs = L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/' + NDVI_DATE + '/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png', {
      maxNativeZoom: 9, maxZoom: 11, opacity: 0.66, tileSize: 256
    }).addTo(map);
    st.cells = L.layerGroup().addTo(map);
    st.box = L.layerGroup().addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 110 }).addTo(map);
    [st.base, st.gibs].forEach(function (ly) {
      ly.on('tileload', function () { st.ok++; });
      ly.on('tileerror', function () {
        st.err++;
        if (!st.ok && st.err >= 6) { el.classList.add('map-offline'); el.setAttribute('data-msg', txt('offline')); }
      });
    });
    window.addEventListener('resize', function () { map.invalidateSize(); });
    return map;
  }

  function setLayersControl() {
    if (st.ctrl) { st.map.removeControl(st.ctrl); st.ctrl = null; }
    const ov = {};
    ov[txt('ndvi')] = st.gibs;
    ov[txt('cells')] = st.cells;
    const bs = {}; bs[txt('base')] = st.base;
    st.ctrl = L.control.layers(bs, ov, { position: 'topright', collapsed: true }).addTo(st.map);
  }

  function drawBox(meta, bbox) {
    if (!bbox || bbox.length !== 4) return;
    const b = [[bbox[0], bbox[2]], [bbox[1], bbox[3]]];
    const html = '<div class="pp" dir="' + (st.lang === 'ar' ? 'rtl' : 'ltr') + '">' +
      '<b>' + meta.name + '</b>' +
      '<div class="pp-sub">' + (meta.note || '') + '</div>' +
      '<div class="pp-row"><span>bbox</span><b>' + bbox.join(', ') + '</b></div>' +
      '<div class="pp-row"><span>' + (st.lang === 'ar' ? 'النقاط' : 'Points') + '</span><b>' + (meta.points || '—') + '</b></div>' +
      '<div class="pp-row"><span>' + (st.lang === 'ar' ? 'الخلايا' : 'Cells') + '</span><b>' + (meta.effective_cells || '—') + '</b></div>' +
      '</div>';
    st.box.addLayer(L.rectangle(b, { color: '#4D9FFF', weight: 1.6, opacity: 0.9, fillColor: '#4D9FFF', fillOpacity: 0.06, dashArray: '5 4' }).bindPopup(html));
  }

  function drawCells(sp) {
    const cells = (sp.cells || []).slice();
    const mx = Math.max.apply(null, cells.map(c => Math.abs(c.slope)).concat([1e-9]));
    cells.sort((a, b) => (a.sig ? 1 : 0) - (b.sig ? 1 : 0));
    cells.forEach(function (c) {
      const up = c.slope >= 0;
      const mag = Math.min(1, Math.abs(c.slope) / mx);
      const color = up ? '#00D4AA' : '#FF6B6B';
      const m = L.circleMarker([c.lat, c.lon], {
        radius: c.sig ? 7 : 5,
        weight: c.sig ? 1.4 : 0,
        color: '#FFFFFF', opacity: 0.9,
        fillColor: color, fillOpacity: 0.32 + 0.55 * mag
      });
      const tip = '<div dir="ltr" style="font-size:11px">' + c.lat + '°, ' + c.lon + '° · ' +
        num(c.slope) + txt('unit') + ' · p=' + num(c.p) + (c.sig ? '' : ' · ' + txt('notSig')) + '</div>';
      m.bindTooltip(tip, { direction: 'top', opacity: 1 });
      m.bindPopup('<div class="pp" dir="' + (st.lang === 'ar' ? 'rtl' : 'ltr') + '">' +
        '<b>' + c.lat + '°, ' + c.lon + '°</b>' +
        '<div class="pp-sub">' + txt('cellNote') + ' · ' + num(c.elev) + ' m</div>' +
        spark(c.series, color) +
        '<div class="pp-row"><span>' + txt('slope') + '</span><b>' + num(c.slope) + txt('unit') + '</b></div>' +
        '<div class="pp-row"><span>' + txt('pval') + '</span><b>' + num(c.p) + '</b></div>' +
        '<div class="pp-row"><span>q (FDR)</span><b>' + num(c.q) + '</b></div>' +
        '<div class="pp-row"><span>' + (c.sig ? txt('sig') : txt('notSig')) + '</span><b>' + (up ? txt('rising') : txt('falling')) + '</b></div>' +
        '</div>', { maxWidth: 260 });
      st.cells.addLayer(m);
    });
  }

  function drawLegend(sp) {
    const el = document.getElementById('mapLegend');
    if (!el) return;
    const cells = sp.cells || [];
    const mx = Math.max.apply(null, cells.map(c => Math.abs(c.slope)).concat([1e-9]));
    el.innerHTML =
      '<div class="lg-title">' + sp.param + ' · ' + cells.length + ' ' +
        (st.lang === 'ar' ? 'خلية' : 'cells') + '</div>' +
      '<div class="lg-bar" style="background:linear-gradient(90deg,#FF6B6B,#3a4a66,#00D4AA)"></div>' +
      '<div class="lg-row"><span>−' + num(mx) + '</span><span>+' + num(mx) + '</span></div>' +
      '<div class="lg-row"><span>' + txt('falling') + '</span><span>' + txt('rising') + '</span></div>' +
      '<div class="lg-foot"><span>◯ ' + txt('ring') + '</span></div>' +
      '<div class="lg-note">' + txt('ndviNote') + '</div>';
  }

  function update(data, lang) {
    st.lang = lang === 'ar' ? 'ar' : 'en';
    const map = ensure();
    if (!map) return;
    st.data = data;
    const meta = (data.region && data.region.meta) || {};
    const bbox = data.region && data.region.bbox;
    st.cells.clearLayers();
    st.box.clearLayers();
    if (data.spatial && data.spatial.cells && data.spatial.cells.length) {
      drawBox(meta, bbox);
      drawCells(data.spatial);
      drawLegend(data.spatial);
      if (bbox && bbox.length === 4) map.fitBounds([[bbox[0], bbox[2]], [bbox[1], bbox[3]]], { padding: [26, 26], maxZoom: 6 });
      else map.setView([15, 0], 3);
    } else {
      if (bbox && bbox.length === 4) {
        drawBox(meta, bbox);
        map.fitBounds([[bbox[0], bbox[2]], [bbox[1], bbox[3]]], { padding: [26, 26], maxZoom: 6 });
      }
      st.cells.addLayer(L.circleMarker([(bbox[0] + bbox[1]) / 2, (bbox[2] + bbox[3]) / 2], { radius: 8, color: '#fff', weight: 1.4, fillColor: '#4D9FFF', fillOpacity: 0.8 }));
    }
    setLayersControl();
    setTimeout(function () { map.invalidateSize(); }, 0);
  }

  window.TDMap = { update: update };
})();