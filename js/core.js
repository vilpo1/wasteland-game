/* ===== core: utils, state, items, stats ===== */
'use strict';
const $ = s => document.querySelector(s);
function hashStr(str) {
  str = String(str); let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let RNG = Math.random;
const rnd = () => RNG();
const ri = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round1 = v => Math.round(v * 10) / 10;
function wpick(arr, wf) { // arr of items; wf(item)->weight or item[2]
  const ws = arr.map(x => Math.max(0, wf ? wf(x) : x[2])); const tot = ws.reduce((a, b) => a + b, 0);
  if (tot <= 0) return arr[Math.floor(rnd() * arr.length)];
  let r = rnd() * tot; for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1];
}
function withSeed(seed, fn) { const old = RNG; RNG = mulberry32(seed >>> 0); try { return fn(); } finally { RNG = old; } }
function dist(la1, lo1, la2, lo2) {
  const R = 6371000, toR = Math.PI / 180, dLa = (la2 - la1) * toR, dLo = (lo2 - lo1) * toR;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * toR) * Math.cos(la2 * toR) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtDist(m) { return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 2 : 1) + ' km'; }
function fmtMin(min) { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h ${m}m` : `${m}m`; }

let G = null;
const SAVE_KEY = 'wasteland_rw_save_v1';

// runtime-defined items
D.ITEMS.schematic = { id: 'schematic', name: 'Schematic', cat: 'schematic', w: 0.1, v: 90, tags: ['schematic'] };
D.ITEMS.package = { id: 'package', name: 'Sealed Package', cat: 'quest', w: 1, v: 0, tags: [] };
D.RECIPE_BY_ID = {}; D.RECIPES.forEach(r => D.RECIPE_BY_ID[r.id] = r);
D.PERK_BY_ID = {}; D.PERKS.forEach(p => D.PERK_BY_ID[p[0]] = p);

function uid() { return G.nextUid++; }
function hasPerk(id) { return G.p.perks.includes(id); }
function day() { return Math.floor(G.time / 1440) + 1; }
function hourOf() { return (G.time % 1440) / 60; }
function isNight() { const h = hourOf(); return h < 6 || h >= 21; }
function timeStr() { const m = Math.floor(G.time % 1440); return `Day ${day()} ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }

/* ---------- items ---------- */
function def(it) { return D.ITEMS[it.base]; }
function itemName(it) {
  if (it.base === 'schematic') return 'Schematic: ' + recipeName(D.RECIPE_BY_ID[it.recipe]);
  return it.name || D.ITEMS[it.base].name;
}
function recipeName(r) { return r ? D.ITEMS[r.out[0]].name + (r.out[1] > 1 ? ' x' + r.out[1] : '') : '?'; }
function itemWeight(it) { const b = def(it); return (it.w != null ? it.w : b.w) * (it.qty || 1); }
function itemUnitValue(it) {
  const b = def(it); let v = it.v != null ? it.v : b.v;
  if (it.maxDur) v *= 0.45 + 0.55 * (it.dur / it.maxDur);
  return Math.max(1, Math.round(v));
}
function rarityColor(it) { return it.rarity != null ? D.RARITY[it.rarity].color : '#cfe8c8'; }

function rollRarity(luck) {
  luck = luck || 0;
  return wpick(D.RARITY, r => r.w * (1 + (luck / 40) * r.id * (r.id + 1) / 2)).id;
}
function makeItem(baseId, opts) {
  opts = opts || {}; const b = D.ITEMS[baseId];
  if (!b) throw new Error('Unknown item ' + baseId);
  if (b.cat === 'artifact') return makeArtifact(baseId, opts.luck || 0);
  if (b.stack) return { uid: uid(), base: baseId, qty: opts.qty || 1 };
  if (baseId === 'schematic') return { uid: uid(), base: 'schematic', recipe: opts.recipe || pick(D.SCHEMATICS) };
  if (b.cat === 'quest') return { uid: uid(), base: baseId, quest: opts.quest };
  const rarity = opts.rarity != null ? opts.rarity : rollRarity(opts.luck || 0);
  return makeGear(baseId, rarity, opts);
}
const W_CONSUMED = ['dmg', 'acc', 'crit', 'bleed', 'burn', 'radDmg', 'lifesteal', 'durab', 'weight', 'value'];
const A_CONSUMED = ['armor', 'radRes', 'anomRes', 'stealth', 'carry', 'durab', 'weight', 'value'];
function makeGear(baseId, rarity, opts) {
  const b = D.ITEMS[baseId], R = D.RARITY[rarity];
  const isW = b.cat === 'melee' || b.cat === 'ranged';
  const P = isW ? D.WPN_PREFIX : D.ARM_PREFIX, S = isW ? D.WPN_SUFFIX : D.ARM_SUFFIX;
  const pre = [], suf = [];
  if (rarity === 0 && rnd() < 0.3) pre.push(rnd() < 0.5 ? P[0] : (isW ? P[8] : P[8]));
  for (let i = 0; i < R.affixes; i++) {
    const usePre = pre.length <= suf.length ? rnd() < 0.6 : rnd() < 0.35;
    const pool = usePre ? P : S; let a = null;
    for (let t = 0; t < 12; t++) { a = wpick(pool); const bad = a[1].value < 0 || (a[1].dmg < 0) || (a[1].armor < 0); if (!pre.includes(a) && !suf.includes(a) && !bad) break; a = null; }
    if (a) (usePre ? pre : suf).push(a);
  }
  const mods = {};
  [...pre, ...suf].forEach(a => { for (const k in a[1]) mods[k] = (mods[k] || 0) + a[1][k]; });
  const it = { uid: uid(), base: baseId, rarity, affixes: [...pre, ...suf].map(a => a[0]) };
  it.name = [pre.map(a => a[0]).join(' '), b.name, suf.length ? suf.map(a => a[0]).join(' & ').replace(/ & of /g, ' & ') : ''].filter(Boolean).join(' ');
  const q = R.mult * (0.92 + rnd() * 0.16);
  if (isW) {
    const dm = 1 + (mods.dmg || 0) / 100;
    it.dmg = [Math.max(1, Math.round(b.dmg[0] * q * dm)), Math.max(2, Math.round(b.dmg[1] * q * dm))];
    it.acc = b.acc + (mods.acc || 0) + rarity * 2; it.crit = b.crit + (mods.crit || 0);
    it.bleed = mods.bleed || 0; it.burn = (mods.burn || 0) + (b.elem === 'fire' ? 20 : 0); it.radDmg = mods.radDmg || 0; it.lifesteal = mods.lifesteal || 0;
    if (b.elem === 'shock') it.shock = 1;
  } else {
    it.armor = Math.max(0, Math.round(b.armor * q + (mods.armor || 0)));
    it.radRes = Math.max(0, Math.round(b.radRes * (0.9 + 0.2 * rnd()) * (1 + rarity * 0.08) + (mods.radRes || 0)));
    it.anomRes = Math.max(0, Math.round(b.anomRes * (0.9 + 0.2 * rnd()) * (1 + rarity * 0.08) + (mods.anomRes || 0)));
    it.stealth = (b.stealth || 0) + (mods.stealth || 0); it.carry = (b.carry || 0) + (mods.carry || 0);
  }
  const gm = {}; const cons = isW ? W_CONSUMED : A_CONSUMED;
  for (const k in mods) if (!cons.includes(k) && mods[k]) gm[k] = mods[k];
  it.gmods = gm;
  it.maxDur = Math.max(10, Math.round(b.dur * (1 + (mods.durab || 0) / 100) * (1 + rarity * 0.1)));
  it.dur = opts.fullDur ? it.maxDur : Math.round(it.maxDur * (0.35 + rnd() * 0.6));
  it.w = round1(Math.max(0.1, b.w * (1 + (mods.weight || 0) / 100)));
  it.v = Math.round(b.v * Math.pow(R.mult, 2.4) * (1 + (mods.value || 0) / 100) * (1 + it.affixes.length * 0.08));
  return it;
}
function makeArtifact(baseId, luck) {
  const b = D.ITEMS[baseId];
  const qi = D.ART_PREFIX.indexOf(wpick(D.ART_PREFIX, x => x[2] * (1 + D.ART_PREFIX.indexOf(x) * (luck || 0) / 80)));
  const [qname, factor] = D.ART_PREFIX[qi];
  const rarity = [0, 0, 1, 2, 3, 3, 4][qi];
  const mods = {};
  for (const k in b.mods) { const v = b.mods[k]; mods[k] = D.NEG_MODS[k] ? v : Math.round(v * factor) || Math.sign(v); }
  const extras = rarity === 0 ? 0 : ri(Math.max(0, rarity - 2), rarity);
  for (let i = 0; i < extras; i++) { const e = pick(D.ART_EXTRA); mods[e[0]] = (mods[e[0]] || 0) + ri(e[1], e[2]); }
  let score = 0; for (const k in mods) score += D.NEG_MODS[k] ? -mods[k] * 4 : mods[k] * (k === 'regen' ? 15 : k === 'maxhp' ? 1.5 : 1);
  return { uid: uid(), base: baseId, rarity, name: (qname ? qname + ' ' : '') + b.name, gmods: mods, w: 0.5, v: Math.max(40, Math.round(60 + score * 6 * (1 + rarity * 0.3))) };
}
function modsText(m) {
  return Object.keys(m || {}).filter(k => m[k]).map(k => {
    const v = m[k]; const bad = D.NEG_MODS[k] ? v > 0 : v < 0;
    return `<span class="${bad ? 'neg' : 'pos'}">${v > 0 ? '+' : ''}${v}${D.MOD_NAMES[k] || ' ' + k}</span>`;
  }).join(', ');
}
function itemDesc(it) {
  const b = def(it), L = [];
  L.push(`<span class="muted">${b.cat.toUpperCase()}${it.rarity != null ? ' · <span style="color:' + rarityColor(it) + '">' + D.RARITY[it.rarity].name + '</span>' : ''} · ${round1(itemWeight(it))} kg · ${itemUnitValue(it)} caps</span>`);
  if (it.dmg) L.push(`Damage ${it.dmg[0]}-${it.dmg[1]} · Acc ${it.acc} · Crit ${it.crit}%${b.ammo ? ' · Ammo: ' + D.ITEMS[b.ammo].name : ''}${b.burst ? ' · Burst x' + b.burst : ''}`);
  if (it.dmg && (it.bleed || it.burn || it.radDmg || it.lifesteal || it.shock)) L.push([it.bleed && `Bleed ${it.bleed}%`, it.burn && `Burn ${it.burn}%`, it.radDmg && `+${it.radDmg} rad dmg`, it.lifesteal && `Lifesteal ${it.lifesteal}%`, it.shock && 'Shock (ignores armor)'].filter(Boolean).join(' · '));
  if (it.armor != null) L.push(`Armor ${it.armor} · Rad res ${it.radRes}% · Anomaly res ${it.anomRes}%${it.stealth ? ' · Stealth ' + it.stealth : ''}${it.carry ? ' · Carry +' + it.carry : ''}`);
  if (it.maxDur) L.push(`Condition ${Math.round(it.dur)}/${it.maxDur}${it.dur <= 0 ? ' <span class="neg">BROKEN</span>' : ''}`);
  if (it.gmods && Object.keys(it.gmods).length) L.push(modsText(it.gmods));
  if (b.eff) { const e = b.eff; L.push(['food', 'water', 'hp', 'rad', 'fatigue'].filter(k => e[k]).map(k => `${e[k] > 0 ? '+' : ''}${e[k]} ${k}`).join(', ') + (e.bleed ? ', stops bleeding' : '') + (e.buff ? `, +${e.buff[1]} ${e.buff[0]} for ${fmtMin(e.buff[2])}` : '') + (e.dmg ? `Deals ${e.dmg[0]}-${e.dmg[1]} damage${e.burn ? ' + burning' : ''} (combat)` : '')); }
  if (b.scrap) L.push('Scraps into: ' + Object.entries(b.scrap).map(([k, n]) => n + ' ' + D.ITEMS[k].name).join(', '));
  if (b.desc) L.push(b.desc);
  if (b.cat === 'book') L.push('Read: +1 ' + D.SKILLS[b.skill][0]);
  if (it.base === 'schematic') { const r = D.RECIPE_BY_ID[it.recipe]; L.push('Read to learn recipe. Needs: ' + Object.entries(r.needs).map(([k, n]) => n + ' ' + D.ITEMS[k].name).join(', ')); }
  if (it.affixes && it.affixes.length) L.push('<span class="muted">Affixes: ' + it.affixes.join(', ') + '</span>');
  return L.join('<br>');
}

/* ---------- inventory ---------- */
function invFind(uidv) { return G.p.inv.find(i => i.uid === uidv); }
function countItem(baseId) { return G.p.inv.filter(i => i.base === baseId).reduce((a, i) => a + (i.qty || 1), 0); }
function addItem(it) {
  const b = def(it);
  if (b.stack) { const ex = G.p.inv.find(i => i.base === it.base); if (ex) { ex.qty += it.qty; return ex; } }
  G.p.inv.push(it); return it;
}
function giveItem(baseId, qty, opts) { return addItem(makeItem(baseId, Object.assign({ qty }, opts || {}))); }
function removeQty(baseId, n) {
  for (const it of [...G.p.inv]) {
    if (n <= 0) break; if (it.base !== baseId) continue;
    if (isEquipped(it)) continue;
    const take = Math.min(n, it.qty || 1);
    if (it.qty) { it.qty -= take; if (it.qty <= 0) G.p.inv.splice(G.p.inv.indexOf(it), 1); } else G.p.inv.splice(G.p.inv.indexOf(it), 1);
    n -= take;
  }
  return n <= 0;
}
function removeItemUnit(it) {
  if (it.qty > 1) it.qty--; else { unequip(it); G.p.inv.splice(G.p.inv.indexOf(it), 1); }
}
function isEquipped(it) { const e = G.p.equip; return it && (e.weapon === it.uid || e.armor === it.uid || e.art1 === it.uid || e.art2 === it.uid); }
function unequip(it) { const e = G.p.equip; for (const k in e) if (e[k] === it.uid) e[k] = null; }
function equipped(slot) { const u = G.p.equip[slot]; return u ? invFind(u) : null; }
function totalWeight() { return G.p.inv.reduce((a, i) => a + itemWeight(i), 0); }

/* ---------- derived stats ---------- */
function getStats() {
  const p = G.p, sk = p.skills;
  const s = { armor: 0, radRes: 0, anomRes: 0, stealth: 0, carry: 45, regen: 0, speed: 0, loot: 0, maxhp: 100, radEmit: 0, thirst: 0, hunger: 0, dmg: 0, acc: 0, crit: 3, lifesteal: 0, fear: 0 };
  s.maxhp += (p.level - 1) * 6 + sk.survival * 3;
  s.speed += sk.survival * 4; s.hunger -= sk.survival * 4; s.thirst -= sk.survival * 4;
  s.radRes += sk.science * 3; s.anomRes += sk.science * 4;
  s.dmg += sk.combat * 5; s.acc += sk.combat * 2; s.loot += sk.scavenging * 5; s.carry += sk.survival * 2;
  const add = m => { for (const k in m) if (k in s) s[k] += m[k]; };
  p.perks.forEach(id => { const pk = D.PERK_BY_ID[id]; if (pk) add(pk[3]); });
  const ar = equipped('armor');
  if (ar) { const f = ar.dur > 0 ? 1 : 0.4; s.armor += ar.armor * f; s.radRes += ar.radRes * f; s.anomRes += ar.anomRes * f; s.stealth += ar.stealth; s.carry += ar.carry; add(ar.gmods); }
  const wp = equipped('weapon'); if (wp) add(wp.gmods);
  ['art1', 'art2'].forEach(k => { const a = equipped(k); if (a) add(a.gmods); });
  p.buffs.forEach(b => { if (b.stat in s) s[b.stat] += b.val; });
  if (countItem('backpack') > 0) s.carry += 20;
  if (countItem('compass') > 0) s.speed += 8;
  if (p.rad >= 50) s.maxhp -= Math.round((p.rad - 50) * 0.8);
  s.maxhp = Math.max(20, s.maxhp);
  s.radRes = clamp(s.radRes, -50, 90); s.anomRes = clamp(s.anomRes, -50, 90);
  return s;
}
function weaponStats() {
  const w = equipped('weapon');
  if (!w) return { name: 'Fists', dmg: [1, 4], acc: 90, crit: 5, melee: true, bleed: 0, burn: 0, radDmg: 0, lifesteal: 0 };
  const b = def(w); const broken = w.dur <= 0;
  return { it: w, name: itemName(w), dmg: broken ? [Math.ceil(w.dmg[0] / 2), Math.ceil(w.dmg[1] / 2)] : w.dmg, acc: w.acc, crit: w.crit, melee: b.cat === 'melee', ammo: b.ammo, burst: b.burst || 1,
    bleed: w.bleed, burn: w.burn, radDmg: w.radDmg, lifesteal: w.lifesteal, shock: w.shock, pistol: ['pm', 'revolver', 'smg', 'pipepistol', 'laserpistol'].includes(w.base) };
}
function carryCap() { return getStats().carry; }
function overEncumbered() { return totalWeight() > carryCap(); }
function travelSpeed() { // km/h
  const s = getStats(); let v = 4.5 * (1 + s.speed / 100);
  if (overEncumbered()) v *= 0.5; if (G.p.fatigue > 85) v *= 0.75; if (G.p.hp < getStats().maxhp * 0.25) v *= 0.8;
  return Math.max(1, v);
}
function xpNeed(l) { return Math.floor(80 * Math.pow(l, 1.45)); }
