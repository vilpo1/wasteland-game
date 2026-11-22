/* ===== world: new game, map, POIs, zones, time, travel ===== */
'use strict';
let map = null, playerMarker = null, routeLine = null;
const layers = {};

function newGame(name, lat, lng, placeName) {
  const seed = Math.floor(Math.random() * 1e9);
  G = {
    v: 1, seed, name: name || 'Stalker', startName: placeName || 'Unknown', start: { lat, lng }, time: 8 * 60, nextUid: 1,
    p: { lat, lng, hp: 100, food: 80, water: 80, rad: 0, fatigue: 10, xp: 0, level: 1, sp: 3, caps: 60, bleed: 0,
      skills: { combat: 1, survival: 1, scavenging: 0, crafting: 0, medicine: 0, barter: 0, science: 0 },
      perks: [], buffs: [], inv: [], equip: { weapon: null, armor: null, art1: null, art2: null }, recipes: [], at: null, pendingPerks: 0 },
    locs: {}, zones: [], zoneCells: {}, fetchCenters: [], quests: [], rep: {}, log: [], kills: {}, camp: null,
    stats: { km: 0, kills: 0, searched: 0, crafted: 0, quests: 0, artifacts: 0 },
  };
  for (const f in D.FACTIONS) G.rep[f] = D.FACTIONS[f].start;
  const knife = addItem(makeItem('knife', { rarity: 0, fullDur: true }));
  const pistol = addItem(makeItem('pipepistol', { rarity: 0, fullDur: true }));
  G.p.equip.weapon = pistol.uid; void knife;
  const hood = addItem(makeItem('hoodie', { rarity: 0, fullDur: true })); G.p.equip.armor = hood.uid;
  giveItem('ammo9', 18); giveItem('bandage', 3); giveItem('beans', 2); giveItem('water', 3); giveItem('matches', 3);
  giveItem('wood', 2); giveItem('cloth', 2); giveItem('antirad', 1);
  // home bunker
  const home = { id: 'home', type: 'bunker', name: 'Bunker 77 (Home)', lat, lng, real: false, searches: 1, respawnDay: 0, visited: true, revealed: true };
  home.settle = { fac: 'loners', name: 'Bunker 77', trader: 'Quartermaster ' + pick(D.NICK), questDay: -1, quests: [], stockDay: -99, stock: [], caps: 400, home: true };
  G.locs.home = home; G.p.at = 'home';
  log(`You emerge from Bunker 77 near ${placeName}. The world above is dead... mostly.`, 'sys');
  log('Tip: click the map or a marker to travel. Search locations for loot. Check the bunker for quests and trade.', 'sys');
}

/* ---------- logging ---------- */
function log(msg, cls) {
  G.log.unshift({ t: timeStr(), msg, cls: cls || '' });
  if (G.log.length > 250) G.log.length = 250;
  if (typeof onLog === 'function') onLog();
}

/* ---------- time ---------- */
function passTime(min, o) {
  o = o || {}; const p = G.p, s = getStats(), h = min / 60;
  const oldDay = day();
  const act = o.resting ? 0.5 : o.traveling ? 1.3 : 1;
  p.food -= h * 3.0 * (1 + s.hunger / 100) * act;
  p.water -= h * 4.2 * (1 + s.thirst / 100) * act;
  if (o.resting) p.fatigue -= h * 12 * (1 + G.p.skills.survival * 0.05) * (countItem('sleepbag') ? 1.25 : 1);
  else p.fatigue += h * (o.traveling ? 4.5 : 2.5) * (overEncumbered() ? 1.8 : 1);
  if (s.radEmit > 0) p.rad += s.radEmit * h * (1 - s.radRes / 100);
  p.rad -= h * 0.4;
  if (p.food > 15 && p.water > 15 && p.rad < 90) p.hp += h * (0.8 + s.regen) * (o.resting ? 3 : 1);
  else if (s.regen < 0) p.hp += h * s.regen;
  if (hasPerk('radchild')) p.hp += h * Math.floor(p.rad / 20);
  if (p.food <= 0) p.hp -= h * 4; if (p.water <= 0) p.hp -= h * 6; if (p.fatigue >= 100) p.hp -= h * 2; if (p.rad >= 100) p.hp -= h * 6;
  if (p.bleed > 0) { p.hp -= Math.min(h, 1) * 6; p.bleed = Math.max(0, p.bleed - h * 2); }
  G.time += min;
  p.buffs = p.buffs.filter(b => b.until > G.time);
  p.food = clamp(p.food, 0, 100); p.water = clamp(p.water, 0, 100); p.fatigue = clamp(p.fatigue, 0, 100); p.rad = clamp(p.rad, 0, 150);
  p.hp = Math.min(p.hp, getStats().maxhp);
  if (day() !== oldDay) log(`— Day ${day()} begins —`, 'sys');
  if (p.food <= 0 && rnd() < 0.3) log('You are starving!', 'bad');
  if (p.water <= 0 && rnd() < 0.3) log('You are dying of thirst!', 'bad');
  if (p.hp <= 0) die(o.cause || (p.rad >= 100 ? 'radiation sickness' : p.water <= 0 ? 'dehydration' : p.food <= 0 ? 'starvation' : 'wounds'));
}

function gainXP(n) {
  if (!n) return; const p = G.p; p.xp += Math.round(n);
  while (p.xp >= xpNeed(p.level)) {
    p.xp -= xpNeed(p.level); p.level++; p.sp += 2; p.pendingPerks++; p.hp += 15;
    log(`LEVEL UP! You are now level ${p.level}. +2 skill points and a new perk.`, 'good');
    if (typeof toast === 'function') toast(`LEVEL ${p.level}!`);
  }
}
function changeRep(f, n) {
  if (!G.rep[f] && G.rep[f] !== 0) return; G.rep[f] = clamp(G.rep[f] + n, -100, 100);
  if (n) log(`${D.FACTIONS[f].name} reputation ${n > 0 ? '+' : ''}${n}`, n > 0 ? 'good' : 'bad');
}

/* ---------- danger & zones ---------- */
function distFromStartKm(lat, lng) { return dist(lat, lng, G.start.lat, G.start.lng) / 1000; }
function zonesAt(lat, lng) { return G.zones.filter(z => dist(lat, lng, z.lat, z.lng) <= z.r); }
function dangerAt(lat, lng) {
  let d = 1 + distFromStartKm(lat, lng) * 0.35;
  zonesAt(lat, lng).forEach(z => d += z.int * 0.6);
  if (isNight() && !hasPerk('nightowl')) d += 0.8;
  return round1(Math.min(d, 12));
}
const ZLAT = 0.018, ZLNG = 0.032;
function genZonesAround(lat, lng) {
  const ci = Math.floor(lat / ZLAT), cj = Math.floor(lng / ZLNG);
  for (let i = ci - 3; i <= ci + 3; i++) for (let j = cj - 3; j <= cj + 3; j++) {
    const key = i + ':' + j; if (G.zoneCells[key]) continue; G.zoneCells[key] = 1;
    withSeed(hashStr(G.seed + 'z' + key), () => {
      const n = rnd() < 0.5 ? 1 : rnd() < 0.25 ? 2 : 0;
      for (let k = 0; k < n; k++) {
        const zl = (i + rnd()) * ZLAT, zg = (j + rnd()) * ZLNG;
        const dk = distFromStartKm(zl, zg); if (dk < 0.7) continue;
        const type = wpick([['rad', 0, 40], ['anomaly', 0, 30], ['mutant', 0, 16], ['raider', 0, 14]]) [0];
        const z = { id: 'z' + key + '_' + k, type, lat: zl, lng: zg, r: Math.round(140 + rnd() * 420), int: clamp(1 + Math.floor(rnd() * 2 + dk / 4), 1, 5),
          name: (type === 'raider' ? 'Rust Gang ' + pick(['Turf', 'Hideout', 'Den', 'Checkpoint']) : 'The ' + pick(D.ZONE_ADJ) + ' ' + pick(D.ZONE_NOUN)) };
        G.zones.push(z);
      }
    });
  }
}
function zoneLabel(z) { return { rad: '☢ Radiation', anomaly: '✺ Anomaly field', mutant: '☠ Mutant nest', raider: '⚔ Raider territory' }[z.type]; }

/* ---------- POIs ---------- */
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
function overpassQuery(lat, lng, r) {
  const A = `(around:${r},${lat},${lng})`;
  return `[out:json][timeout:25];(
node${A}[amenity~"^(pharmacy|hospital|clinic|doctors|dentist|veterinary|fuel|police|school|kindergarten|university|college|restaurant|cafe|bar|pub|fast_food|bank|place_of_worship|fire_station|library|post_office|townhall|marketplace|cinema|theatre|prison)$"];
node${A}[shop~"^(supermarket|convenience|hardware|doityourself|car_repair|car_parts|electronics|clothes|outdoor|sports|chemist|butcher|bakery|alcohol|mall|department_store|gas|hunting|weapons|kiosk|mobile_phone|computer)$"];
way${A}[shop~"^(supermarket|mall|department_store|hardware|doityourself)$"];
way${A}[amenity~"^(hospital|school|university|college|fuel|prison|place_of_worship|police|fire_station|townhall)$"];
nwr${A}[military];
way${A}[landuse~"^(industrial|military)$"];
way${A}[man_made~"^(works|water_tower|wastewater_plant|water_works)$"];
nwr${A}[power~"^(plant|substation)$"];
node${A}[railway~"^(station|halt)$"];
nwr${A}[tourism~"^(museum|hotel|motel|hostel)$"];
);out center 600;`;
}
async function fetchOverpass(lat, lng, r) {
  const q = overpassQuery(lat, lng, r); let lastErr;
  for (const url of OVERPASS) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 22000);
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
      clearTimeout(to);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      return (j.elements || []).map(e => {
        const t = e.tags || {}; const type = D.tagToPoi(t); const la = e.lat != null ? e.lat : e.center && e.center.lat; const lo = e.lon != null ? e.lon : e.center && e.center.lon;
        if (!type || la == null) return null;
        return ['o' + e.type[0] + e.id, type, t.name || t['name:en'] || '', +la.toFixed(6), +lo.toFixed(6)];
      }).filter(Boolean);
    } catch (e) { clearTimeout(to); lastErr = e; }
  }
  throw lastErr || new Error('Overpass failed');
}
function cacheGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function cacheSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota */ } }

let scanning = false;
async function ensurePOIs(force) {
  const { lat, lng } = G.p;
  if (!force && G.fetchCenters.some(c => dist(c.lat, c.lng, lat, lng) < 1300)) return;
  if (scanning) return; scanning = true;
  const cLat = Math.round(lat * 100) / 100, cLng = Math.round(lng * 100) / 100;
  G.fetchCenters.push({ lat: cLat, lng: cLng });
  setScan('Scanning area for real locations…');
  const key = 'wl_poi_' + cLat.toFixed(2) + '_' + cLng.toFixed(2);
  let els = cacheGet(key), src = 'cache';
  if (!els) {
    try { els = await fetchOverpass(cLat, cLng, 2200); src = 'OpenStreetMap'; if (els.length) cacheSet(key, els); }
    catch (e) { els = null; src = 'none'; }
  }
  let added = 0;
  if (els) added = addOsmLocs(els);
  if (!els) log('Overpass (OpenStreetMap) unreachable — generating procedural ruins instead.', 'warn');
  if (added < 25) addProcLocs(cLat, cLng, 30 - added);
  ensureSettlement(cLat, cLng);
  if (els) log(`Scanner: ${added} real locations found nearby (${src}).`, 'sys');
  scanning = false; setScan('');
  revealNear(); renderWorld(); saveGame(true);
}
function setScan(t) { const e = $('#scan'); if (e) { e.textContent = t; e.style.display = t ? 'block' : 'none'; } }
function addOsmLocs(els) {
  // prioritise named + interesting
  const prio = { military: 5, hospital: 4, police: 4, industrial: 3, factory: 4, power: 4, pharmacy: 4, fuel: 3, supermarket: 3, hardware: 4, railway: 4, prison: 5, firestation: 3, hunting: 5, school: 2, university: 3, church: 2, townhall: 3, bank: 3 };
  const list = els.filter(e => !G.locs[e[0]]).map(e => ({ e, s: (e[2] ? 3 : 0) + (prio[e[1]] || 1) + rnd() }));
  list.sort((a, b) => b.s - a.s);
  let n = 0; const placed = Object.values(G.locs);
  for (const { e } of list) {
    if (n >= 220) break;
    const [id, type, name, la, lo] = e;
    if (placed.some(l => Math.abs(l.lat - la) < 0.00035 && Math.abs(l.lng - lo) < 0.0006)) continue;
    const loc = makeLoc(id, type, name || ('Abandoned ' + D.POI[type].label), la, lo, true);
    G.locs[id] = loc; placed.push(loc); n++;
  }
  return n;
}
function makeLoc(id, type, name, lat, lng, real) {
  return withSeed(hashStr(G.seed + id), () => {
    const loc = { id, type, name, lat, lng, real, searches: ri(2, 4), respawnDay: 0, visited: false, revealed: false };
    const P = D.POI[type];
    if (P.sc && rnd() * 100 < P.sc * 0.3) makeSettlement(loc);
    return loc;
  });
}
function makeSettlement(loc) {
  const fac = wpick([['loners', 0, 40], ['order', 0, 20], ['freedom', 0, 20], ['science', 0, 18]])[0];
  loc.settle = { fac, name: `${pick(D.SETTLE_NAMES)} ${loc.name.length < 22 ? '@ ' + loc.name : pick(D.NICK)}`, trader: `${pick(D.FIRST)} "${pick(D.NICK)}"`, questDay: -1, quests: [], stockDay: -99, stock: [], caps: ri(250, 700) };
}
const PROC_TYPES = [['ruin', 0, 8], ['wreck', 0, 6], ['camp', 0, 4], ['farm', 0, 4], ['shop', 0, 3], ['fuel', 0, 2], ['industrial', 0, 2], ['pharmacy', 0, 2], ['school', 0, 1], ['church', 0, 1], ['military', 0, 1], ['police', 0, 1], ['supermarket', 0, 2], ['hardware', 0, 1], ['clinic', 0, 1], ['railway', 0, 1]];
const PROC_ADJ = ['Old', 'Burnt', 'Collapsed', 'Silent', 'Overgrown', 'Looted', 'Flooded', 'Northern', 'Eastern', 'Lonely', 'Crooked', 'Sunken', 'Rusty'];
function addProcLocs(lat, lng, n) {
  withSeed(hashStr(G.seed + 'proc' + lat + ',' + lng), () => {
    for (let i = 0; i < n; i++) {
      const type = wpick(PROC_TYPES)[0]; const a = rnd() * Math.PI * 2, r = 150 + Math.sqrt(rnd()) * 2100;
      const la = lat + (r * Math.cos(a)) / 111320, lo = lng + (r * Math.sin(a)) / (111320 * Math.cos(lat * Math.PI / 180));
      const id = `p${lat}_${lng}_${i}`; if (G.locs[id]) continue;
      const nm = `${pick(PROC_ADJ)} ${D.POI[type].label}${rnd() < 0.3 ? ' #' + ri(2, 99) : ''}`;
      G.locs[id] = makeLoc(id, type, nm, +la.toFixed(6), +lo.toFixed(6), false);
    }
  });
}
function ensureSettlement(lat, lng) {
  const near = Object.values(G.locs).filter(l => dist(l.lat, l.lng, lat, lng) < 2300);
  if (near.some(l => l.settle && !l.settle.home)) return;
  near.splice(0, near.length, ...near.filter(l => l.id !== 'home' && dist(l.lat, l.lng, G.start.lat, G.start.lng) > 300));
  const cand = near.filter(l => D.POI[l.type].sc > 0).sort((a, b) => D.POI[b.type].sc - D.POI[a.type].sc)[0] || near[0];
  if (cand) withSeed(hashStr(G.seed + 'set' + cand.id), () => makeSettlement(cand));
}
function revealNear() {
  const r = 550 + G.p.skills.scavenging * 60;
  Object.values(G.locs).forEach(l => { if (!l.revealed && dist(l.lat, l.lng, G.p.lat, G.p.lng) < r) l.revealed = true; });
}
function nearestLoc(lat, lng, maxD) {
  let best = null, bd = maxD || 1e9;
  for (const l of Object.values(G.locs)) { const d = dist(lat, lng, l.lat, l.lng); if (d < bd) { bd = d; best = l; } }
  return best;
}
function currentLoc() { return G.p.at ? G.locs[G.p.at] : null; }
function hasWorkbench() { const l = currentLoc(); return !!(l && (l.settle || D.POI[l.type].bench)); }
function hasCampfire() { return !!(G.camp && dist(G.camp.lat, G.camp.lng, G.p.lat, G.p.lng) < 60) || !!(currentLoc() && currentLoc().settle); }

/* ---------- map ---------- */
function initMap() {
  if (map) { map.remove(); map = null; }
  map = L.map('map', { zoomControl: true, worldCopyJump: true, preferCanvas: false, tapTolerance: 20, bounceAtZoomLimits: false, fadeAnimation: !(typeof COARSE !== 'undefined' && COARSE) }).setView([G.p.lat, G.p.lng], 15);
  // Keyless, referer-free tile providers (work from file://). CARTO now requires an API key.
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  const esriAttr = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · POIs: Overpass API';
  const dark = L.layerGroup([
    L.tileLayer(ESRI + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 16, maxZoom: 19, attribution: esriAttr }),
    L.tileLayer(ESRI + 'Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 16, maxZoom: 19 }),
  ]);
  const sat = L.tileLayer(ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 18, maxZoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics · POIs: Overpass API' });
  const street = L.tileLayer(ESRI + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 18, maxZoom: 19, attribution: esriAttr });
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { subdomains: 'abc', maxNativeZoom: 17, maxZoom: 19, attribution: 'Map data &copy; OpenStreetMap contributors, SRTM · Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' });
  const bases = { 'Wasteland (dark)': dark, 'Satellite ruins': sat, 'Street map': street, 'Topographic': topo };
  const chosen = bases[localStorage.getItem('wl_basemap')] || dark; chosen.addTo(map);
  L.control.layers(bases, null, { position: 'topright' }).addTo(map);
  map.on('baselayerchange', e => { try { localStorage.setItem('wl_basemap', e.name); } catch (er) { } });
  layers.zones = L.layerGroup().addTo(map);
  layers.locs = L.layerGroup().addTo(map);
  layers.misc = L.layerGroup().addTo(map);
  playerMarker = L.marker([G.p.lat, G.p.lng], { icon: L.divIcon({ className: 'pl-icon', html: '<div class="pl-dot"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 2000, interactive: false }).addTo(map);
  map.on('click', onMapClick);
}
function locIcon(l) {
  const P = D.POI[l.type]; const q = G.quests.some(q => q.status === 'active' && q.locId === l.id);
  const looted = l.searches <= 0 && day() < l.respawnDay;
  let cls = 'loc-icon' + (l.settle ? ' settle' : '') + (looted ? ' looted' : '') + (q ? ' quest' : '') + (!l.revealed && !q ? ' unk' : '');
  const g = l.settle ? '⌂' : (l.revealed || q) ? P.g : '?';
  const c = l.settle ? D.FACTIONS[l.settle.fac].color : P.c;
  const sz = (l.settle ? 26 : 20) + (typeof COARSE !== 'undefined' && COARSE ? 8 : 0);
  return L.divIcon({ className: cls, html: `<div style="--c:${c}">${g}</div>`, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] });
}
function renderWorld() {
  if (!map) return;
  layers.zones.clearLayers(); layers.locs.clearLayers(); layers.misc.clearLayers();
  const { lat, lng } = G.p;
  const col = { rad: '#d4ff00', anomaly: '#b266ff', mutant: '#ff3b3b', raider: '#ff8c1a' };
  G.zones.forEach(z => {
    if (dist(lat, lng, z.lat, z.lng) > 9000) return;
    const c = L.circle([z.lat, z.lng], { radius: z.r, color: col[z.type], weight: 1.5, fillColor: col[z.type], fillOpacity: 0.12 + z.int * 0.03, className: 'zone zone-' + z.type, interactive: false });
    c.addTo(layers.zones);
  });
  Object.values(G.locs).forEach(l => {
    if (dist(lat, lng, l.lat, l.lng) > 7000) return;
    const m = L.marker([l.lat, l.lng], { icon: locIcon(l), title: l.revealed ? l.name : 'Unknown location' });
    m.on('click', () => openLocPopup(l, m));
    m.addTo(layers.locs);
  });
  // quest targets for zones
  G.quests.filter(q => q.status === 'active' && q.zoneId).forEach(q => {
    const z = G.zones.find(z => z.id === q.zoneId);
    if (z) L.marker([z.lat, z.lng], { icon: L.divIcon({ className: 'qz-icon', html: '<div>!</div>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false }).addTo(layers.misc);
  });
  if (G.camp) L.marker([G.camp.lat, G.camp.lng], { icon: L.divIcon({ className: 'camp-icon', html: '<div>🔥</div>', iconSize: [20, 20], iconAnchor: [10, 10] }), interactive: false }).addTo(layers.misc);
  playerMarker.setLatLng([lat, lng]);
  applyNight();
}
function applyNight() {
  const h = hourOf(); let b = 1;
  if (h >= 21 || h < 5) b = 0.45; else if (h >= 19) b = 1 - (h - 19) / 2 * 0.55; else if (h < 7) b = 0.45 + (h - 5) / 2 * 0.55;
  document.documentElement.style.setProperty('--night', b.toFixed(2));
}

function travelEstimate(lat, lng) {
  const d = dist(G.p.lat, G.p.lng, lat, lng); const min = d / 1000 / travelSpeed() * 60;
  return { d, min };
}
function onMapClick(e) {
  if (document.body.classList.contains('sheet-open')) { closeSheet(); return; }
  if (G.travel || G.combat || G.dead) return;
  const { lat, lng } = e.latlng; const est = travelEstimate(lat, lng);
  const zs = zonesAt(lat, lng);
  const html = `<div class="pop"><b>Unmarked ground</b><br>${fmtDist(est.d)} · ~${fmtMin(est.min)} on foot<br>Danger: ${dangerAt(lat, lng)}${zs.length ? '<br>' + zs.map(z => `<span class="z-${z.type}">${zoneLabel(z)}: ${esc(z.name)} (lvl ${z.int})</span>`).join('<br>') : ''}<br>
  <button class="btn" onclick="startTravel(${lat},${lng},null)">▶ Travel here</button></div>`;
  L.popup({ className: 'term-pop' }).setLatLng(e.latlng).setContent(html).openOn(map);
}
function openLocPopup(l, m) {
  if (G.travel || G.combat || G.dead) return;
  const P = D.POI[l.type]; const est = travelEstimate(l.lat, l.lng);
  const here = G.p.at === l.id;
  const known = l.revealed || G.quests.some(q => q.locId === l.id);
  const looted = l.searches <= 0 && day() < l.respawnDay;
  const html = `<div class="pop"><b>${known ? esc(l.name) : 'Unknown location'}</b><br>
   <span class="muted">${known ? P.label + (l.real ? ' · real place' : '') : 'Get closer to identify'}</span>
   ${l.settle ? `<br><span style="color:${D.FACTIONS[l.settle.fac].color}">⌂ ${esc(l.settle.name)} — ${D.FACTIONS[l.settle.fac].name}</span>` : ''}
   ${known && looted ? '<br><span class="neg">Picked clean (for now)</span>' : ''}
   ${G.quests.filter(q => q.status === 'active' && q.locId === l.id).map(q => `<br><span class="qtxt">! ${esc(q.title)}</span>`).join('')}
   <br>${here ? 'You are here.' : `${fmtDist(est.d)} · ~${fmtMin(est.min)} · danger ${dangerAt(l.lat, l.lng)}`}<br>
   ${here ? `<button class="btn" onclick="map.closePopup();openLocPanel()">Enter</button>` : `<button class="btn" onclick="startTravel(${l.lat},${l.lng},'${l.id}')">▶ Travel here</button>`}</div>`;
  L.popup({ className: 'term-pop', offset: [0, -6] }).setLatLng([l.lat, l.lng]).setContent(html).openOn(map);
}

/* ---------- travel ---------- */
let travelTimer = null;
function startTravel(lat, lng, locId) {
  if (G.travel || G.combat || G.dead) return;
  map.closePopup(); closeModal(); if (typeof closeSheet === 'function') closeSheet();
  const d = dist(G.p.lat, G.p.lng, lat, lng);
  if (d < 5) { if (locId) arrive(locId); return; }
  const steps = Math.min(80, Math.max(2, Math.ceil(d / 150)));
  G.travel = { fromLat: G.p.lat, fromLng: G.p.lng, lat, lng, locId, steps, i: 0, stepLen: d / steps, entered: {} };
  G.p.at = null; G.camp = null;
  if (routeLine) routeLine.remove();
  routeLine = L.polyline([[G.p.lat, G.p.lng], [lat, lng]], { color: '#5dff6a', weight: 2, dashArray: '6 6', opacity: 0.7, interactive: false }).addTo(map);
  renderLocPanel();
  travelTimer = setInterval(travelStep, 70);
}
function stopTravel() {
  if (travelTimer) clearInterval(travelTimer); travelTimer = null;
  if (G) G.travel = null; if (routeLine) { routeLine.remove(); routeLine = null; }
}
function travelStep() {
  const t = G.travel; if (!t) return stopTravel();
  t.i++; const f = t.i / t.steps;
  G.p.lat = t.fromLat + (t.lat - t.fromLat) * f; G.p.lng = t.fromLng + (t.lng - t.fromLng) * f;
  playerMarker.setLatLng([G.p.lat, G.p.lng]);
  if (!map.getBounds().pad(-0.15).contains([G.p.lat, G.p.lng])) map.panTo([G.p.lat, G.p.lng], { animate: true, duration: 0.3 });
  const km = t.stepLen / 1000; const s = getStats();
  passTime(km / travelSpeed() * 60, { traveling: true });
  G.stats.km += km;
  if (G.dead) return stopTravel();
  // zones
  const zs = zonesAt(G.p.lat, G.p.lng); let encMul = 1, kind = null;
  for (const z of zs) {
    if (!t.entered[z.id]) { t.entered[z.id] = 1; log(`Entering ${zoneLabel(z)}: ${z.name} (level ${z.int})`, 'warn'); }
    if (z.type === 'rad') { const g = z.int * 2.2 * (km / 0.15) * (1 - s.radRes / 100) * (countItem('geiger') ? 0.85 : 1); G.p.rad = clamp(G.p.rad + g, 0, 150); }
    if (z.type === 'anomaly' && rnd() < 0.07 * z.int) { pauseTravel(); return encounterAnomaly(z); }
    if (z.type === 'mutant') { encMul *= 2.5; kind = 'mutant'; }
    if (z.type === 'raider') { encMul *= 2.5; kind = 'raider'; }
  }
  if (G.p.rad >= 100 && rnd() < 0.1) log('Your Geiger counter screams. Radiation sickness is killing you!', 'bad');
  if (hasPerk('forager') && rnd() < 0.04) { const it = giveItem(pick(['herbs', 'apples', 'herbs', 'wood']), 1); log(`Foraged: ${itemName(it)}.`, 'good'); }
  const danger = dangerAt(G.p.lat, G.p.lng);
  const escort = G.quests.some(q => q.status === 'active' && q.type === 'escort');
  let chance = km * 0.32 * encMul * (0.7 + danger * 0.12) * (1 - Math.min(60, s.stealth) / 120) * (isNight() ? 1.4 : 1) * (escort ? 1.6 : 1);
  if (distFromStartKm(G.p.lat, G.p.lng) < 0.35) chance *= 0.2;
  if (rnd() < chance) { pauseTravel(); return randomEncounter(kind, danger); }
  if (t.i >= t.steps) { const id = t.locId; const lt = t.lat, lg = t.lng; stopTravel(); G.p.lat = lt; G.p.lng = lg; return arrive(id); }
  renderHUD();
}
function pauseTravel() { // stop mid-route due to an event
  stopTravel(); G.p.at = null; genZonesAround(G.p.lat, G.p.lng); revealNear(); renderWorld(); renderAll();
}
function arrive(locId) {
  let loc = locId ? G.locs[locId] : nearestLoc(G.p.lat, G.p.lng, 45);
  if (loc) {
    G.p.at = loc.id; G.p.lat = loc.lat; G.p.lng = loc.lng;
    if (!loc.visited) { loc.visited = true; gainXP(4); }
    loc.revealed = true;
  }
  genZonesAround(G.p.lat, G.p.lng); revealNear();
  ensurePOIs();
  renderWorld(); renderAll();
  if (loc) { log(`Arrived at ${loc.name}.`); questArrive(loc); }
  else log(`You stop at ${G.p.lat.toFixed(4)}, ${G.p.lng.toFixed(4)}.`);
  if (!G.combat && !G.dead && loc) openLocPanel();
  saveGame(true);
}
