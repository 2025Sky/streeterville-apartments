// Streeterville Apartments — client-only filter + map app
// Data: data/apartments.json, data/units.json, data/meta.json

const state = {
  apartments: [],
  units: [],
  meta: null,
  filters: {
    beds: new Set(),
    rentMax: 9000,
    walkMax: 20,
    nowOnly: false,
    hideSkipped: true,
    sort: 'rent',
  },
  view: 'units',
  map: null,
  markers: {}, // apt_id -> Leaflet marker
  highlightedId: null,
};

// ---------- Load data ----------
async function load() {
  let apts, units, meta;
  // Prefer embedded data (works on file:// without CORS)
  if (window.__APARTMENTS__ && window.__UNITS__ && window.__META__) {
    apts = window.__APARTMENTS__;
    units = window.__UNITS__;
    meta = window.__META__;
  } else {
    [apts, units, meta] = await Promise.all([
      fetch('data/apartments.json').then(r => r.json()),
      fetch('data/units.json').then(r => r.json()),
      fetch('data/meta.json').then(r => r.json()),
    ]);
  }
  state.apartments = apts;
  state.units = units;
  state.meta = meta;

  document.getElementById('meta-stats').textContent =
    `${apts.length} buildings · ${units.length} units / plans`;

  const notScrapedCount = apts.filter(a => !a.scraped).length;
  const manualBtn = document.getElementById('manual-view-btn');
  if (notScrapedCount > 0) {
    manualBtn.hidden = false;
    manualBtn.textContent = `Manual check (${notScrapedCount})`;
    document.getElementById('manual-intro').textContent =
      `These ${notScrapedCount} buildings use widget-based listings that block automated scraping. Click through to check availability manually.`;
  }

  initFilters();
  initMap();
  initListeners();
  render();
}

// ---------- Filters ----------
function bedsOf(unit) {
  const b = (unit.beds || '').toLowerCase();
  if (b.includes('studio') || b.includes('convertible') || b === '0br' || b === '0' || b === '0.5') return 'Studio';
  if (b.includes('1br') || b.includes('jr 1br') || b.includes('1 bed') || b === '1' || b === '1.5') return '1BR';
  if (b.includes('2br') || b.includes('2 bed') || b === '2') return '2BR';
  if (b.includes('3br') || b.includes('3 bed') || b === '3' || b.includes('ph')) return '3BR+';
  return 'Other';
}
function rentNumberOf(unit) {
  if (typeof unit.rent_low === 'number') return unit.rent_low;
  return null;
}
function walkMinOf(walk_time) {
  if (!walk_time) return null;
  const m = String(walk_time).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function initFilters() {
  // Beds chips
  const beds = ['Studio', '1BR', '2BR', '3BR+'];
  const wrap = document.getElementById('beds-filter');
  beds.forEach(b => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = b;
    chip.addEventListener('click', () => {
      if (state.filters.beds.has(b)) state.filters.beds.delete(b);
      else state.filters.beds.add(b);
      chip.classList.toggle('active');
      render();
    });
    wrap.appendChild(chip);
  });

  // Rent max slider
  document.getElementById('rent-max').addEventListener('input', e => {
    state.filters.rentMax = +e.target.value;
    document.getElementById('rent-max-display').textContent = (+e.target.value).toLocaleString();
    render();
  });
  // Walk slider
  document.getElementById('walk-max').addEventListener('input', e => {
    state.filters.walkMax = +e.target.value;
    document.getElementById('walk-max-display').textContent = e.target.value;
    render();
  });
  // Now only
  document.getElementById('now-only').addEventListener('change', e => {
    state.filters.nowOnly = e.target.checked;
    render();
  });
  // Hide skipped
  document.getElementById('hide-skipped').addEventListener('change', e => {
    state.filters.hideSkipped = e.target.checked;
    render();
  });
  // Sort
  document.getElementById('sort').addEventListener('change', e => {
    state.filters.sort = e.target.value;
    render();
  });
  // Reset
  document.getElementById('reset').addEventListener('click', () => {
    state.filters = { beds: new Set(), rentMax: 9000, walkMax: 20, nowOnly: false, hideSkipped: true, sort: 'rent' };
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.getElementById('rent-max').value = 9000;
    document.getElementById('walk-max').value = 20;
    document.getElementById('rent-max-display').textContent = '9,000';
    document.getElementById('walk-max-display').textContent = '20';
    document.getElementById('now-only').checked = false;
    document.getElementById('hide-skipped').checked = true;
    document.getElementById('sort').value = 'rent';
    render();
  });
  // View toggle
  document.querySelectorAll('.view-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.view = b.dataset.view;
      document.getElementById('units-view').classList.toggle('hidden', state.view !== 'units');
      document.getElementById('buildings-view').classList.toggle('hidden', state.view !== 'buildings');
      document.getElementById('manual-view').classList.toggle('hidden', state.view !== 'manual');
      render();
    });
  });
}

// ---------- Map ----------
function initMap() {
  const m = state.meta;
  state.map = L.map('map', { zoomControl: true }).setView([41.8941, -87.6248], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(state.map);

  // Draw rectangle bounds
  const r = m.rectangle;
  L.rectangle(
    [[r.south, r.west], [r.north, r.east]],
    { color: '#2563eb', weight: 2, fillOpacity: 0.05, dashArray: '4 4' }
  ).addTo(state.map);

  // Target marker (Feinberg)
  const targetIcon = L.divIcon({
    className: 'target-marker',
    html: `<div style="background:#dc2626;color:white;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;white-space:nowrap;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)">★ Feinberg</div>`,
    iconSize: [80, 22],
    iconAnchor: [40, 11],
  });
  L.marker([m.target.lat, m.target.lng], { icon: targetIcon, zIndexOffset: 1000 })
    .addTo(state.map)
    .bindPopup(`<div class="popup-name">${m.target.name}</div><div class="popup-addr">${m.target.address}</div>`);

  // Building markers
  state.apartments.forEach(apt => {
    const color = apt.scraped ? '#2563eb' : '#9ca3af';
    const icon = L.divIcon({
      className: 'apt-marker',
      html: `<div style="background:${color};color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer">${apt.id}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    const marker = L.marker([apt.lat, apt.lng], { icon })
      .addTo(state.map)
      .bindPopup(buildingPopup(apt));
    marker.on('click', () => highlightApartment(apt.id));
    state.markers[apt.id] = marker;
  });
}

function buildingPopup(apt) {
  const units = state.units.filter(u => u.apt_id === apt.id);
  const ratingStr = apt.rating ? `${apt.rating} ★ (${apt.rating_count})` : '—';
  return `
    <div class="popup-name">#${apt.id} ${apt.name}</div>
    <div class="popup-addr">${apt.address}</div>
    <div class="popup-stats">
      ${ratingStr} · ${apt.walk_time} walk
      ${apt.scraped ? `<br>${units.length} units / plans` : '<br><em>Not scraped</em>'}
    </div>
    <a class="popup-link" href="${apt.url}" target="_blank" rel="noopener">Official site →</a>
    ${apt.url !== apt.url_floorplans ? `<a class="popup-link" href="${apt.url_floorplans}" target="_blank" rel="noopener">Floor plans →</a>` : ''}
  `;
}

function highlightApartment(aptId) {
  state.highlightedId = aptId;
  // Highlight rows
  document.querySelectorAll('tbody tr').forEach(tr => {
    tr.classList.toggle('highlighted', +tr.dataset.aptId === aptId);
  });
  // Scroll first matching row into view
  const first = document.querySelector(`tbody tr[data-apt-id="${aptId}"]`);
  if (first) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ---------- Filtering ----------
function getFilteredUnits() {
  const aptById = Object.fromEntries(state.apartments.map(a => [a.id, a]));
  return state.units.filter(u => {
    const apt = aptById[u.apt_id];
    if (!apt) return false;
    if (state.filters.hideSkipped && !apt.scraped) return false;
    if (state.filters.beds.size > 0 && !state.filters.beds.has(bedsOf(u))) return false;
    const rent = rentNumberOf(u);
    if (rent !== null && rent > state.filters.rentMax) return false;
    const walk = walkMinOf(apt.walk_time);
    if (walk !== null && walk > state.filters.walkMax) return false;
    if (state.filters.nowOnly && !u.available_now) return false;
    return true;
  });
}
function getFilteredBuildings() {
  const visibleAptIds = new Set(getFilteredUnits().map(u => u.apt_id));
  return state.apartments.filter(a => {
    if (state.filters.hideSkipped && !a.scraped) return false;
    if (state.filters.beds.size > 0 || state.filters.rentMax < 9000 || state.filters.walkMax < 20 || state.filters.nowOnly) {
      return visibleAptIds.has(a.id);
    }
    return true;
  });
}

function sortUnits(units) {
  const aptById = Object.fromEntries(state.apartments.map(a => [a.id, a]));
  const sortFn = {
    rent: (a, b) => (rentNumberOf(a) ?? 9e9) - (rentNumberOf(b) ?? 9e9),
    walk: (a, b) => (walkMinOf(aptById[a.apt_id].walk_time) ?? 99) - (walkMinOf(aptById[b.apt_id].walk_time) ?? 99),
    sqft: (a, b) => (b.sqft || 0) - (a.sqft || 0),
    avail: (a, b) => {
      const ka = a.available_now ? 0 : (Date.parse(a.available) || 9e15);
      const kb = b.available_now ? 0 : (Date.parse(b.available) || 9e15);
      return ka - kb;
    },
  }[state.filters.sort];
  return [...units].sort(sortFn);
}

// ---------- Rendering ----------
function render() {
  if (state.view === 'units') renderUnits();
  else if (state.view === 'buildings') renderBuildings();
  else renderManual();
  updateMapMarkers();
}

function renderManual() {
  const skipped = state.apartments.filter(a => !a.scraped);
  const sorted = [...skipped].sort((a, b) => (walkMinOf(a.walk_time) ?? 99) - (walkMinOf(b.walk_time) ?? 99));
  const container = document.getElementById('manual-cards');
  container.innerHTML = '';
  sorted.forEach(apt => {
    const card = document.createElement('div');
    card.className = 'card manual-card';
    if (apt.id === state.highlightedId) card.style.borderColor = 'var(--accent)';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-name">#${apt.id} ${apt.name}</div>
          <div class="card-address">${apt.address}</div>
        </div>
        <div class="card-rating">
          ${apt.rating ? `<span class="star">★</span> ${apt.rating} <span class="muted">(${apt.rating_count})</span>` : ''}
        </div>
      </div>
      <div class="card-stats">
        <div><span class="stat-label">Walk:</span> ${apt.walk_time}</div>
        ${apt.year ? `<div><span class="stat-label">Built:</span> ${apt.year}</div>` : ''}
      </div>
      ${apt.notes ? `<div class="card-notes manual-notes">Why not scraped: ${apt.notes}</div>` : ''}
      <div class="manual-cta-row">
        <a class="btn-primary" href="${apt.url}" target="_blank" rel="noopener">Open official site ↗</a>
        ${apt.url_floorplans && apt.url !== apt.url_floorplans ? `<a class="link-btn" href="${apt.url_floorplans}" target="_blank" rel="noopener">Floor plans ↗</a>` : ''}
      </div>
    `;
    card.addEventListener('click', e => {
      if (e.target.tagName === 'A') return;
      highlightApartment(apt.id);
      const marker = state.markers[apt.id];
      if (marker && !state.map.hasLayer(marker)) marker.addTo(state.map);
      state.map.flyTo([apt.lat, apt.lng], 16, { duration: 0.5 });
      if (marker) marker.openPopup();
    });
    container.appendChild(card);
  });
  document.getElementById('result-count').textContent = `${sorted.length} buildings — open each site manually to check availability`;
}

function renderUnits() {
  const units = sortUnits(getFilteredUnits());
  const aptById = Object.fromEntries(state.apartments.map(a => [a.id, a]));
  const tbody = document.querySelector('#units-table tbody');
  tbody.innerHTML = '';
  units.forEach(u => {
    const apt = aptById[u.apt_id];
    const tr = document.createElement('tr');
    tr.dataset.aptId = u.apt_id;
    if (u.apt_id === state.highlightedId) tr.classList.add('highlighted');
    const rentStr = u.rent_low
      ? (u.rent_high ? `$${u.rent_low.toLocaleString()}–$${u.rent_high.toLocaleString()}` : `$${u.rent_low.toLocaleString()}+`)
      : '—';
    const availStr = u.available_now
      ? '<span class="avail-now">Now</span>'
      : (u.available ? `<span class="avail-future">${u.available}</span>` : '—');
    tr.innerHTML = `
      <td><div class="building-name">${apt.name}</div><div class="muted" style="font-size:11px">${apt.address}</div></td>
      <td>${u.unit !== 'plan' && u.unit !== 'featured' && u.unit !== 'starting' && u.unit !== 'highlight' ? u.unit + ' · ' : ''}${u.plan}</td>
      <td>${u.beds}${u.baths ? ` / ${u.baths}ba` : ''}</td>
      <td>${u.sqft ? u.sqft + ' sf' : '—'}</td>
      <td class="rent">${rentStr}</td>
      <td>${availStr}</td>
      <td>${apt.walk_time}</td>
      <td><a class="link-btn" href="${u.url}" target="_blank" rel="noopener">View →</a></td>
    `;
    tr.addEventListener('click', e => {
      if (e.target.tagName === 'A') return;
      highlightApartment(u.apt_id);
      state.map.flyTo([apt.lat, apt.lng], 16, { duration: 0.5 });
      state.markers[u.apt_id].openPopup();
    });
    tbody.appendChild(tr);
  });
  document.getElementById('result-count').textContent = `${units.length} unit${units.length !== 1 ? 's' : ''} matching filters`;
}

function renderBuildings() {
  const buildings = getFilteredBuildings();
  const aptById = Object.fromEntries(state.apartments.map(a => [a.id, a]));
  const container = document.getElementById('buildings-cards');
  container.innerHTML = '';
  const filtered = getFilteredUnits();
  const unitsByApt = {};
  filtered.forEach(u => {
    (unitsByApt[u.apt_id] = unitsByApt[u.apt_id] || []).push(u);
  });

  buildings.forEach(apt => {
    const units = unitsByApt[apt.id] || [];
    const nowCount = units.filter(u => u.available_now).length;
    const prices = units.map(rentNumberOf).filter(x => typeof x === 'number');
    const priceRange = prices.length ? `$${Math.min(...prices).toLocaleString()}–$${Math.max(...prices).toLocaleString()}` : '—';
    const card = document.createElement('div');
    card.className = 'card' + (apt.scraped ? '' : ' skipped');
    if (apt.id === state.highlightedId) card.style.borderColor = 'var(--accent)';
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-name">#${apt.id} ${apt.name}</div>
          <div class="card-address">${apt.address}</div>
        </div>
        <div class="card-rating">
          ${apt.rating ? `<span class="star">★</span> ${apt.rating} <span class="muted">(${apt.rating_count})</span>` : '—'}
        </div>
      </div>
      <div class="card-stats">
        <div><span class="stat-label">Walk:</span> ${apt.walk_time}</div>
        <div><span class="stat-label">Built:</span> ${apt.year}</div>
        ${apt.scraped ? `<div><span class="stat-label">Units shown:</span> ${units.length}</div>` : ''}
        ${apt.scraped ? `<div><span class="stat-label">Price:</span> ${priceRange}</div>` : ''}
        ${nowCount > 0 ? `<div><span class="avail-now">${nowCount} Now</span></div>` : ''}
      </div>
      ${apt.notes ? `<div class="card-notes">${apt.notes}</div>` : ''}
      <div style="margin-top:6px;display:flex;gap:12px">
        <a class="link-btn" href="${apt.url}" target="_blank" rel="noopener">Official site →</a>
        ${apt.url !== apt.url_floorplans ? `<a class="link-btn" href="${apt.url_floorplans}" target="_blank" rel="noopener">Floor plans →</a>` : ''}
      </div>
    `;
    card.addEventListener('click', e => {
      if (e.target.tagName === 'A') return;
      highlightApartment(apt.id);
      state.map.flyTo([apt.lat, apt.lng], 16, { duration: 0.5 });
      state.markers[apt.id].openPopup();
    });
    container.appendChild(card);
  });
  document.getElementById('result-count').textContent = `${buildings.length} building${buildings.length !== 1 ? 's' : ''} matching filters`;
}

function updateMapMarkers() {
  const visibleAptIds = new Set(getFilteredUnits().map(u => u.apt_id));
  state.apartments.forEach(apt => {
    const marker = state.markers[apt.id];
    if (!marker) return;
    let show;
    if (state.view === 'manual') {
      show = true;
    } else {
      const include = state.filters.hideSkipped ? apt.scraped : true;
      const matched = state.filters.beds.size > 0 || state.filters.nowOnly
        ? visibleAptIds.has(apt.id)
        : include;
      show = matched && include;
    }
    if (show) marker.addTo(state.map);
    else state.map.removeLayer(marker);
  });
}

function initListeners() {
  // No-op (handled in initFilters)
}

load().catch(err => {
  console.error(err);
  document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif"><h2>Failed to load data</h2><pre>' + err + '</pre></div>';
});
