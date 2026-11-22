/* ===== actions: loot, search, encounters, combat, crafting, trade, quests, rest, save ===== */
'use strict';
const ITEM_LIST = () => Object.values(D.ITEMS).filter(b => !['schematic', 'quest'].includes(b.cat));
function itemsByTag(spec) {
  const [main, sub] = spec.split(':');
  return ITEM_LIST().filter(b => (b.cat === main || b.tags.includes(main)) && (!sub || b.tags.includes(sub) || b.cat === sub));
}
function randomItemByTag(spec, danger, luck) {
  if (spec === 'schematic') { const known = G.p.recipes; const pool = D.SCHEMATICS.filter(r => !known.includes(r)); return makeItem('schematic', { recipe: pick(pool.length ? pool : D.SCHEMATICS) }); }
  let c = itemsByTag(spec); if (!c.length) c = itemsByTag(spec.split(':')[0]); if (!c.length) c = itemsByTag('junk');
  const b = wpick(c, x => 1 / (1 + x.v / (45 * danger)));
  let qty = 1;
  if (b.cat === 'ammo') qty = Math.round(ri(4, 14) * (hasPerk('scrounger') ? 1.5 : 1) * (b.id === 'cells' ? 0.6 : 1));
  else if (b.cat === 'comp') qty = ri(1, 3);
  else if (b.cat === 'junk' && !b.tags.includes('valuable')) qty = rnd() < 0.25 ? 2 : 1;
  return makeItem(b.id, { qty, luck: luck + danger * 3 });
}
function genLoot(type, danger, extraRolls) {
  const s = getStats(); const P = D.POI[type] || D.POI.ruin;
  const rolls = 1 + ri(1, 2) + Math.floor(G.p.skills.scavenging / 2) + (countItem('lockpick') ? 1 : 0) + (extraRolls || 0);
  const out = [];
  for (let i = 0; i < rolls; i++) {
    const tag = wpick(P.loot, x => x[1])[0];
    if (tag === 'artifact') { out.push(makeItem(pick(itemsByTag('artifact')).id, { luck: s.loot })); continue; }
    out.push(randomItemByTag(tag, danger, s.loot));
  }
  if (rnd() < 0.08 + s.loot / 400) out.push(randomItemByTag(pick(['book', 'schematic', 'valuable']), danger, s.loot));
  return { items: out, caps: rnd() < 0.3 ? Math.round(ri(2, 12) * (1 + danger * 0.3)) : 0 };
}

/* ---------- searching ---------- */
function searchLoc() {
  const l = currentLoc(); if (!l || G.combat || G.dead) return;
  if (l.searches <= 0) { if (day() >= l.respawnDay) l.searches = ri(1, 3); else return toast('Picked clean. Come back in a few days.'); }
  passTime(Math.max(10, 30 - G.p.skills.scavenging * 2)); if (G.dead) return;
  l.searches--; if (l.searches <= 0) l.respawnDay = day() + ri(3, 6);
  G.stats.searched++; gainXP(3);
  const danger = dangerAt(l.lat, l.lng) + D.POI[l.type].danger;
  const loot = genLoot(l.type, danger);
  const ambush = !l.settle && rnd() < 0.1 + danger * 0.035;
  log(`You search ${l.name}…`);
  if (ambush) {
    const kind = { military: 'raider', police: 'raider', bank: 'raider', prison: 'raider', hospital: 'mutant', clinic: 'mutant', industrial: null, factory: 'robot', power: 'robot' }[l.type] || null;
    const grp = makeGroup(danger, kind);
    log(`Something was already here: ${grp.map(e => e.name).join(', ')}!`, 'bad');
    startCombat(grp, { onWin: () => showLoot(loot, 'Search: ' + l.name) });
  } else showLoot(loot, 'Search: ' + l.name);
  renderAll(); saveGame(true);
}
function huntArtifacts() {
  const z = zonesAt(G.p.lat, G.p.lng).find(z => z.type === 'anomaly'); if (!z || G.combat || G.dead) return;
  const s = getStats(); passTime(45); if (G.dead) return;
  if (rnd() < 0.35) {
    const dmg = Math.round(ri(5, 14) * z.int * (1 - s.anomRes / 100) * (hasPerk('cautious') ? 0.6 : 1));
    G.p.hp -= dmg; log(`An anomaly discharges! -${dmg} HP.`, 'bad'); if (G.p.hp <= 0) return die('an anomaly');
  }
  const ch = 0.22 + G.p.skills.science * 0.04 + (countItem('detector') ? 0.25 : 0) + (hasPerk('anomalysense') ? 0.3 : 0) + z.int * 0.03;
  if (rnd() < ch) {
    const a = makeItem(pick(itemsByTag('artifact')).id, { luck: s.loot + z.int * 8 + G.p.skills.science * 4 });
    G.stats.artifacts++; gainXP(15 + z.int * 5);
    log(`Your detector chirps… you found an artifact: ${itemName(a)}!`, 'good');
    showLoot({ items: [a], caps: 0 }, 'Artifact found!');
    questArtifact(z);
  } else log('You comb the anomaly field but find nothing this time.');
  renderAll(); saveGame(true);
}

/* ---------- rest & camp ---------- */
function makeCamp() {
  if (G.camp && hasCampfire()) return toast('Campfire is already burning.');
  if (countItem('wood') < 2 || countItem('matches') < 1) return toast('Need 2 Wood and 1 Matches.');
  removeQty('wood', 2); removeQty('matches', 1); passTime(15);
  G.camp = { lat: G.p.lat, lng: G.p.lng }; log('You build a small campfire. You can cook and rest a bit safer here.', 'good');
  renderWorld(); renderAll();
}
function rest(hours) {
  if (G.combat || G.dead || G.travel) return;
  const l = currentLoc(); const safe = l && l.settle;
  if (safe && !l.settle.home && hours >= 8) { if (G.p.caps < 10) return toast('A bunk costs 10 caps.'); G.p.caps -= 10; }
  const danger = dangerAt(G.p.lat, G.p.lng);
  for (let h = 0; h < hours; h++) {
    passTime(60, { resting: true }); if (G.dead) return;
    if (!safe) {
      let ch = 0.02 + danger * 0.012; if (G.camp && hasCampfire()) ch *= 0.6; if (countItem('sleepbag')) ch *= 0.7;
      if (rnd() < ch) { log(`Your rest is interrupted after ${h + 1}h!`, 'bad'); renderAll(); return startCombat(makeGroup(danger), { ambush: true }); }
    }
  }
  if (safe) { G.p.hp = Math.min(getStats().maxhp, G.p.hp + hours * 4); }
  log(`You rest for ${hours} hour${hours > 1 ? 's' : ''}.`);
  renderWorld(); renderAll(); saveGame(true);
}

/* ---------- using items ---------- */
function useItem(uidv) {
  const it = invFind(uidv); if (!it) return; const b = def(it), p = G.p;
  if (['food', 'drink', 'med', 'chem'].includes(b.cat)) {
    const e = b.eff;
    if (e.food) p.food = clamp(p.food + e.food, 0, 100);
    if (e.water) p.water = clamp(p.water + e.water, 0, 100);
    if (e.hp) p.hp = Math.min(getStats().maxhp, p.hp + (e.hp > 0 && b.cat === 'med' ? e.hp * (1 + p.skills.medicine * 0.1) : e.hp));
    if (e.rad) { let r = e.rad; if (r > 0 && hasPerk('leadbelly')) r *= 0.4; if (r > 0 && b.id === 'dirtywater' && countItem('waterfilter')) r = 0; p.rad = clamp(p.rad + r, 0, 150); }
    if (e.fatigue) p.fatigue = clamp(p.fatigue + e.fatigue, 0, 100);
    if (e.bleed) p.bleed = 0;
    if (e.buff) { p.buffs = p.buffs.filter(x => x.stat !== e.buff[0]); p.buffs.push({ stat: e.buff[0], val: e.buff[1], until: G.time + e.buff[2] }); }
    log(`Used ${itemName(it)}.`);
    removeItemUnit(it);
    if (b.id === 'water' || b.id === 'purewater' || b.id === 'cola' || b.id === 'vodka' || b.id === 'beer') { if (rnd() < 0.5) giveItem('bottle', 1); }
    if (b.id === 'beans' && rnd() < 0.5) giveItem('tincan', 1);
  } else if (b.cat === 'book') {
    if (p.skills[b.skill] >= 10) return toast('You already mastered that skill.');
    p.skills[b.skill]++; log(`You read ${b.name}. ${D.SKILLS[b.skill][0]} +1!`, 'good'); removeItemUnit(it);
  } else if (b.cat === 'schematic') {
    if (p.recipes.includes(it.recipe)) { toast('Already known — sell it.'); return; }
    p.recipes.push(it.recipe); log(`Learned recipe: ${recipeName(D.RECIPE_BY_ID[it.recipe])}.`, 'good'); removeItemUnit(it); gainXP(10);
  } else if (b.id === 'repairkit') {
    const w = equipped('weapon'), a = equipped('armor'); if (!w && !a) return toast('Nothing equipped to repair.');
    const amt = 50 * (hasPerk('mrfixit') ? 1.5 : 1) * (1 + p.skills.crafting * 0.05);
    [w, a].forEach(x => { if (x) x.dur = Math.min(x.maxDur, x.dur + amt); }); log('Repaired your gear.', 'good'); removeItemUnit(it);
  } else if (b.id === 'modkit') {
    const w = equipped('weapon'); if (!w) return toast('Equip a weapon first.');
    const a = wpick(D.WPN_PREFIX.filter(x => !(x[1].dmg < 0) && !(x[1].value < 0) && !w.affixes.includes(x[0])));
    w.affixes.push(a[0]); const m = a[1];
    if (m.dmg) w.dmg = w.dmg.map(v => Math.round(v * (1 + m.dmg / 100)));
    w.acc += m.acc || 0; w.crit += m.crit || 0; w.bleed += m.bleed || 0; w.burn += m.burn || 0; w.radDmg += m.radDmg || 0; w.lifesteal += m.lifesteal || 0;
    if (m.durab) { w.maxDur = Math.round(w.maxDur * (1 + m.durab / 100)); }
    for (const k in m) if (!W_CONSUMED.includes(k)) w.gmods[k] = (w.gmods[k] || 0) + m[k];
    w.name = a[0] + ' ' + w.name; w.v = Math.round(w.v * 1.25);
    if (w.rarity < 4 && rnd() < 0.25) { w.rarity++; log('The mod pushes the weapon to a higher tier!', 'good'); }
    log(`Modded weapon: ${w.name}.`, 'good'); removeItemUnit(it);
  } else if (b.id === 'plating') {
    const a = equipped('armor'); if (!a) return toast('Equip armor first.');
    a.armor += 4; a.w = round1(a.w + 0.8); a.v = Math.round(a.v * 1.15); if (!/Plated/.test(a.name)) a.name = 'Plated ' + a.name;
    log(`Reinforced ${a.name} (+4 armor).`, 'good'); removeItemUnit(it);
  } else if (b.cat === 'throw') return toast('Throwables are used in combat.');
  else return;
  renderAll(); saveGame(true);
}
function equipItem(uidv) {
  const it = invFind(uidv); if (!it) return; const b = def(it), e = G.p.equip;
  if (b.cat === 'melee' || b.cat === 'ranged') e.weapon = it.uid;
  else if (b.cat === 'armor') e.armor = it.uid;
  else if (b.cat === 'artifact') { if (!e.art1) e.art1 = it.uid; else if (!e.art2) e.art2 = it.uid; else e.art1 = it.uid; }
  log(`Equipped ${itemName(it)}.`); renderAll();
}
function unequipItem(uidv) { const it = invFind(uidv); if (it) { unequip(it); renderAll(); } }
function dropItem(uidv, all) {
  const it = invFind(uidv); if (!it) return; if (it.base === 'package') return toast("Can't drop a quest item.");
  unequip(it); if (all || !it.qty || it.qty <= 1) G.p.inv.splice(G.p.inv.indexOf(it), 1); else it.qty--;
  renderAll();
}
function scrapItem(uidv, all) {
  const it = invFind(uidv); if (!it) return; const b = def(it);
  let n = all && it.qty ? it.qty : 1; const got = {};
  const addc = (k, q) => { got[k] = (got[k] || 0) + q; };
  for (let i = 0; i < n; i++) {
    if (b.scrap) for (const k in b.scrap) addc(k, b.scrap[k] + (rnd() < G.p.skills.crafting * 0.06 ? 1 : 0));
    else if (b.cat === 'melee' || b.cat === 'ranged') { addc('scrap', ri(1, 3) + (it.rarity || 0)); addc('screws', ri(0, 2)); if (b.cat === 'ranged') { addc('springs', ri(1, 2)); if (rnd() < 0.5) addc('gunpowder', 1); } if (b.tags.includes('science')) addc('circuit', ri(1, 2)); }
    else if (b.cat === 'armor') { addc('cloth', ri(1, 3)); addc(b.armor > 10 ? 'scrap' : 'leather', ri(1, 2) + (it.rarity || 0)); if (b.radRes > 20) addc('lead', 1); if (b.tags.includes('science') || b.tags.includes('mil')) addc('fiber', ri(0, 2)); }
    else return toast("Can't scrap that.");
    if (hasPerk('salvager')) addc(pick(Object.keys(D.COMP)), 1);
  }
  if (all && it.qty) { G.p.inv.splice(G.p.inv.indexOf(it), 1); } else removeItemUnit(it);
  for (const k in got) if (got[k] > 0) giveItem(k, got[k]);
  log(`Scrapped ${n > 1 ? n + 'x ' : ''}${itemName(it)} → ${Object.entries(got).filter(e => e[1] > 0).map(([k, q]) => q + ' ' + D.ITEMS[k].name).join(', ')}`);
  passTime(5); renderAll();
}
function scrapAllJunk() {
  const junk = G.p.inv.filter(i => def(i).cat === 'junk' && !def(i).tags.includes('valuable'));
  if (!junk.length) return toast('No junk to scrap.');
  junk.forEach(i => scrapItem(i.uid, true));
}

/* ---------- crafting ---------- */
function recipeStatus(r) {
  const p = G.p; const out = { known: !r.schem || p.recipes.includes(r.id), skillOk: true, haveAll: true, stationOk: true, miss: [] };
  for (const k in r.req) if ((p.skills[k] || 0) < r.req[k]) { out.skillOk = false; out.miss.push(`${D.SKILLS[k][0]} ${r.req[k]}`); }
  for (const k in r.needs) if (countItem(k) < r.needs[k]) out.haveAll = false;
  if (r.station === 'campfire' && !hasCampfire()) out.stationOk = false;
  if (r.station === 'workbench' && !hasWorkbench()) out.stationOk = false;
  out.can = out.known && out.skillOk && out.haveAll && out.stationOk;
  return out;
}
function craft(rid) {
  const r = D.RECIPE_BY_ID[rid]; const st = recipeStatus(r); if (!st.can || G.combat) return toast('Cannot craft that right now.');
  for (const k in r.needs) removeQty(k, r.needs[k]);
  const b = D.ITEMS[r.out[0]]; let it;
  if (b.stack) { let q = r.out[1]; if (hasPerk('chemist') && (b.cat === 'med' || b.cat === 'chem')) q *= 2; it = giveItem(b.id, q); }
  else {
    const luck = G.p.skills.crafting * 9 + (hasPerk('tinker') ? 25 : 0);
    it = addItem(makeItem(b.id, { luck, fullDur: true }));
  }
  passTime(b.stack ? 15 : 40); G.stats.crafted++; gainXP(4 + Object.values(r.req).reduce((a, v) => a + v, 0) * 3);
  log(`Crafted ${itemName(it)}${it.qty > 1 ? '' : ''}.`, 'good'); toast('Crafted: ' + itemName(it));
  renderAll(); saveGame(true);
}

/* ---------- enemies & combat ---------- */
function makeEnemy(danger, kind, baseId, boss) {
  let base;
  if (baseId) base = D.ENEMIES.find(e => e[0] === baseId);
  if (!base) {
    let c = D.ENEMIES.filter(e => e[10] <= danger && (!kind || e[9] === kind));
    if (!c.length) c = D.ENEMIES.filter(e => e[10] <= Math.max(danger, 2.5));
    base = wpick(c, e => 1 + (danger - e[10] < 2 ? 2 : 0) + (isNight() && e[9] === 'mutant' ? 1 : 0));
  }
  const [id, name, hp, dmg, acc, armor, xp, caps, loot, k, , special] = base;
  const v = wpick(D.ENEMY_VARIANTS); const vm = v[1];
  const lvl = Math.max(1, Math.round(danger * 0.7 + G.p.level * 0.45)); const sc = 1 + 0.11 * (lvl - 1);
  const e = { id, kind: k, lvl, name: (v[0] ? v[0] + ' ' : '') + name, hp: Math.round(hp * (vm.hp || 1) * sc), dmg: dmg.map(x => Math.round(x * (vm.dmg || 1) * (1 + 0.07 * (lvl - 1)))),
    acc: acc + (vm.acc || 0), armor: armor + (vm.armor || 0) + Math.floor(lvl / 3), xp: Math.round(xp * (vm.xp || 1) * (1 + 0.1 * (lvl - 1))), caps: Math.round(ri(caps[0], caps[1]) * (vm.caps || 1)),
    loot, special: vm.special || special, bleed: 0, burn: 0 };
  if (boss) { e.boss = true; e.name = `${pick(D.BOSS_NAMES)} the ${name}`; e.hp = Math.round(e.hp * 2.3); e.dmg = e.dmg.map(x => Math.round(x * 1.35)); e.xp *= 3; e.caps = e.caps * 3 + 40; e.armor += 3; }
  e.maxhp = e.hp; return e;
}
function makeGroup(danger, kind) {
  const first = makeEnemy(danger, kind);
  const packy = ['radrat', 'dog', 'bandit', 'ghoul', 'raider', 'snork', 'zombie'];
  const n = packy.includes(first.id) ? (rnd() < 0.45 ? 1 : rnd() < 0.7 ? 2 : 3) : 1;
  const g = [first]; for (let i = 1; i < n; i++) g.push(makeEnemy(danger, kind, first.id));
  return g;
}
function startCombat(enemies, opts) {
  opts = opts || {};
  G.combat = { enemies, log: [], onWin: opts.onWin || null, onLose: opts.onLose || null, target: 0, noFlee: !!opts.noFlee };
  map && map.closePopup();
  cLog(`Combat! ${enemies.map(e => `${e.name} (lvl ${e.lvl})`).join(', ')}`);
  if (opts.ambush) { cLog('You are ambushed!'); enemyTurn(); }
  renderCombat(); renderAll();
}
function cLog(m, cls) { if (G.combat) G.combat.log.unshift({ m, cls: cls || '' }); }
function aliveEnemies() { return G.combat.enemies.filter(e => e.hp > 0); }
function curTarget() { const a = aliveEnemies(); let t = G.combat.enemies[G.combat.target]; if (!t || t.hp <= 0) { t = a[0]; G.combat.target = G.combat.enemies.indexOf(t); } return t; }
function setTarget(i) { if (G.combat.enemies[i] && G.combat.enemies[i].hp > 0) { G.combat.target = i; renderCombat(); } }
function wearGear(slot) { const it = equipped(slot); if (it && it.dur > 0) { it.dur = Math.max(0, it.dur - (hasPerk('mrfixit') ? 0.5 : 1)); if (it.dur <= 0) log(`${itemName(it)} broke!`, 'bad'); } }
function playerAttack(aimed) {
  if (!G.combat) return; const w = weaponStats(), s = getStats(); let t = curTarget(); if (!t) return;
  let shots = aimed ? 1 : (w.burst || 1), bash = false;
  if (w.ammo) {
    const have = countItem(w.ammo); const need = aimed ? 1 : shots;
    if (have <= 0) { bash = true; shots = 1; cLog('Out of ammo — you bash with the stock!', 'bad'); } else { shots = Math.min(shots, have); removeQty(w.ammo, shots); }
  }
  const extra = hasPerk('dualwield') && rnd() < 0.15 ? 1 : 0; if (extra) cLog('Rapid fire!');
  for (let i = 0; i < shots + extra; i++) {
    t = curTarget(); if (!t) break;
    let acc = (bash ? 75 : w.acc) + s.acc + (!w.melee && hasPerk('sniper') ? 12 : 0) + (aimed ? -8 + (hasPerk('deadeye') ? 15 : 0) : 0) + (hasPerk('nightowl') && isNight() ? 10 : 0) - (isNight() && !hasPerk('nightowl') ? 8 : 0);
    acc = clamp(acc, 5, 97);
    if (rnd() * 100 >= acc) { cLog(`You miss ${t.name}.`); continue; }
    let d = bash ? ri(2, 5) : ri(w.dmg[0], w.dmg[1]);
    d *= 1 + s.dmg / 100;
    if (w.melee && hasPerk('ironfist')) d *= 1.3;
    if (w.pistol && hasPerk('gunslinger')) d *= 1.2;
    if (hasPerk('adrenaline') && G.p.hp < s.maxhp * 0.35) d *= 1.25;
    if (aimed) d *= 1.6;
    let crit = rnd() * 100 < (w.crit + s.crit + (aimed ? 12 : 0));
    if (crit) d *= hasPerk('bloodymess') ? 2.6 : 2;
    const arm = w.shock ? t.armor * 0.3 : t.armor; d = Math.max(1, Math.round(d * (1 - arm / (arm + 30)) + (w.radDmg || 0)));
    t.hp -= d; cLog(`${crit ? 'CRITICAL! ' : ''}You hit ${t.name} for ${d}.`, crit ? 'good' : '');
    if (w.bleed && rnd() * 100 < w.bleed) { t.bleed = 3; cLog(`${t.name} is bleeding.`); }
    if (w.burn && rnd() * 100 < w.burn) { t.burn = 2; cLog(`${t.name} catches fire!`); }
    const ls = (w.lifesteal || 0) + s.lifesteal; if (ls > 0) G.p.hp = Math.min(s.maxhp, G.p.hp + d * ls / 100);
    if (t.hp <= 0) cLog(`${t.name} is down!`, 'good');
    if (w.it && !bash) wearGear('weapon');
  }
  afterPlayerAction();
}
function combatUse(uidv) {
  const it = invFind(uidv); if (!it || !G.combat) return; const b = def(it);
  if (b.cat === 'throw') {
    const targets = b.id === 'molotov' ? [curTarget()] : aliveEnemies();
    targets.forEach(t => { const d = ri(b.eff.dmg[0], b.eff.dmg[1]); t.hp -= d; cLog(`${itemName(it)} hits ${t.name} for ${d}!`, 'good'); if (b.eff.burn) t.burn = 3; if (t.hp <= 0) cLog(`${t.name} is down!`, 'good'); });
    removeItemUnit(it);
  } else if (b.cat === 'melee' || b.cat === 'ranged') { G.p.equip.weapon = it.uid; cLog(`You switch to ${itemName(it)}.`); }
  else { useItem(uidv); cLog(`You use ${itemName(it)}.`); }
  afterPlayerAction();
}
function afterPlayerAction() {
  if (!aliveEnemies().length) return winCombat();
  enemyTurn();
  if (G.dead) return;
  if (!aliveEnemies().length) return winCombat();
  renderCombat(); renderHUD();
}
function enemyTurn() {
  const s = getStats(), p = G.p;
  G.combat.enemies.forEach(e => {
    if (e.hp <= 0) return;
    if (e.bleed > 0) { e.bleed--; e.hp -= 4; cLog(`${e.name} bleeds (-4).`); }
    if (e.burn > 0) { e.burn--; e.hp -= 6; cLog(`${e.name} burns (-6).`); }
    if (e.hp <= 0) { cLog(`${e.name} is down!`, 'good'); return; }
    if (s.fear > 0 && rnd() * 200 < s.fear) { cLog(`${e.name} hesitates, intimidated.`); return; }
    const acc = clamp(e.acc - s.stealth / 6 - (isNight() && e.kind !== 'mutant' ? 8 : 0), 10, 95);
    if (rnd() * 100 >= acc) { cLog(`${e.name} misses you.`); return; }
    let d = ri(e.dmg[0], e.dmg[1]);
    const arm = (e.special === 'shock' || e.special === 'psy') ? s.armor * 0.4 : s.armor;
    d = Math.max(1, Math.round(d * (1 - arm / (arm + 40))));
    p.hp -= d; cLog(`${e.name} hits you for ${d}.`, 'bad'); wearGear('armor');
    if (e.special === 'rad') { const r = Math.round(ri(2, 6) * (1 - s.radRes / 100)); if (r > 0) { p.rad = clamp(p.rad + r, 0, 150); cLog(`+${r} radiation.`, 'bad'); } }
    if ((e.special === 'bleed' || e.special === 'poison') && rnd() < 0.3) { p.bleed = 3; cLog(e.special === 'poison' ? 'You are poisoned!' : 'You are bleeding!', 'bad'); }
    if (e.special === 'drain') { e.hp = Math.min(e.maxhp, e.hp + Math.round(d / 2)); cLog(`${e.name} feeds on your blood.`); }
  });
  if (p.bleed > 0) { p.bleed--; p.hp -= 3; cLog('You bleed (-3).', 'bad'); }
  if (p.hp <= 0) { const killer = aliveEnemies()[0]; die(killer ? killer.name : 'wounds'); }
}
function fleeCombat() {
  if (!G.combat) return; if (G.combat.noFlee) { cLog("You can't run from this one!", 'bad'); renderCombat(); return; }
  const s = getStats(); const boss = G.combat.enemies.some(e => e.boss && e.hp > 0);
  let ch = (40 + G.p.skills.survival * 4 + s.stealth / 3 - (boss ? 20 : 0) - (overEncumbered() ? 20 : 0)) * (hasPerk('quickfeet') ? 1.6 : 1);
  ch = clamp(ch, 5, 95);
  if (rnd() * 100 < ch) {
    log('You escaped.', 'warn'); const cb = G.combat.onLose; G.combat = null; closeModal(); passTime(10); if (cb) cb(); renderAll(); saveGame(true);
  } else { cLog('You fail to escape!', 'bad'); enemyTurn(); if (!G.dead) { renderCombat(); renderHUD(); } }
}
function winCombat() {
  const c = G.combat; let xp = 0, caps = 0; const items = [];
  const danger = dangerAt(G.p.lat, G.p.lng);
  c.enemies.forEach(e => {
    xp += e.xp; caps += e.caps; G.stats.kills++; G.kills[e.id] = (G.kills[e.id] || 0) + 1;
    G.quests.forEach(q => { if (q.status === 'active' && q.type === 'kill' && q.enemy === e.id) q.prog = (q.prog || 0) + 1; });
    if (e.kind === 'raider') { G.rep.order = clamp(G.rep.order + 1, -100, 100); G.rep.raiders = clamp(G.rep.raiders - 1, -100, 100); }
    if (e.kind === 'mutant') {
      if (hasPerk('butcher') || rnd() < 0.55) items.push(makeItem('rawmeat', { qty: ri(1, 2) }));
      if (hasPerk('butcher') || rnd() < 0.3) items.push(makeItem(rnd() < 0.6 ? 'hide' : 'bones', { qty: 1 }));
      if (rnd() < 0.04 + (e.boss ? 0.5 : 0)) items.push(makeItem(pick(itemsByTag('artifact')).id, { luck: danger * 5 }));
    } else if (e.kind === 'robot') { items.push(makeItem(pick(['electronics', 'circuit', 'scrap', 'copper']), { qty: ri(1, 3) })); if (rnd() < 0.4) items.push(makeItem('cells', { qty: ri(3, 8) })); }
    else {
      if (rnd() < 0.35 || e.boss) items.push(randomItemByTag('weapon', danger + (e.boss ? 3 : 0), getStats().loot + (e.boss ? 30 : 0)));
      if (rnd() < 0.5) items.push(randomItemByTag('ammo', danger, 0));
      if (rnd() < 0.4) items.push(randomItemByTag(pick(['food', 'drink', 'med', 'junk', 'chem']), danger, 0));
      if (rnd() < 0.15 || e.boss) items.push(randomItemByTag(e.boss ? pick(['armor', 'schematic', 'artifact']) === 'artifact' ? 'armor' : pick(['armor', 'schematic']) : 'armor', danger, getStats().loot));
    }
  });
  G.p.caps += caps; log(`Victory! +${xp} XP${caps ? `, +${caps} caps` : ''}.`, 'good');
  const cb = c.onWin; G.combat = null; closeModal();
  gainXP(xp); passTime(5);
  const after = () => { if (cb) cb(); };
  if (items.length) showLoot({ items, caps: 0 }, 'Loot from the fallen', after); else after();
  renderAll(); saveGame(true);
}

/* ---------- encounters ---------- */
function randomEncounter(kind, danger) {
  const th = hasPerk('treasurehunter') ? 2 : 1;
  const opts = kind ? [['fight', 0, 80], ['stash', 0, 5 * th], ['corpse', 0, 8]] :
    [['fight', 0, isNight() ? 52 : 42], ['trader', 0, 9], ['stash', 0, 8 * th], ['wanderer', 0, 8], ['car', 0, 7], ['distress', 0, 6], ['corpse', 0, 7], ['storm', 0, day() > 1 ? 3 : 0]];
  const t = wpick(opts)[0];
  if (t === 'fight') return encounterFight(kind, danger);
  if (t === 'trader') { log('You meet a wandering trader caravan.', 'good'); return openEvent('Trader Caravan', 'A pack mule, two guards and a fat merchant with a shotgun. "Caps or barter, friend?"', [['Trade', () => openTrade(null)], ['Move on', closeModal]]); }
  if (t === 'stash') {
    const loot = genLoot(pick(['camp', 'military', 'ruin', 'bunker']), danger + 1, 1 + (th > 1 ? 2 : 0)); loot.caps += ri(5, 30) * th;
    log('You found a hidden stalker stash!', 'good'); gainXP(6); return showLoot(loot, 'Hidden Stash');
  }
  if (t === 'corpse') {
    return openEvent('A Body', 'A dead stalker lies face-down in the weeds, backpack still on.', [
      ['Search the body', () => { closeModal(); if (rnd() < 0.15) { log('The corpse twitches… it was not dead!', 'bad'); startCombat([makeEnemy(danger, null, 'zombie')], { onWin: () => showLoot(genLoot('camp', danger), 'Stalker remains') }); } else showLoot(genLoot('camp', danger), 'Stalker remains'); }],
      ['Leave it', closeModal]]);
  }
  if (t === 'car') {
    return openEvent('Abandoned Car', 'A rusted Lada with the doors hanging open. The trunk is closed.', [
      ['Pry open the trunk (15m)', () => { closeModal(); passTime(15); if (rnd() < 0.15) { const d = ri(5, 15); G.p.hp -= d; log(`A grenade trap! -${d} HP.`, 'bad'); if (G.p.hp <= 0) return die('a booby trap'); } showLoot(genLoot('wreck', danger), 'Car trunk'); renderAll(); }],
      ['Ignore', closeModal]]);
  }
  if (t === 'distress') {
    const grp = makeGroup(danger, 'raider');
    return openEvent('Cry for Help', `"Help! Over here!" A wounded stalker is pinned down by ${grp.length} ${grp[0].name}${grp.length > 1 ? 's' : ''}.`, [
      ['Help him', () => { closeModal(); startCombat(grp, { onWin: () => { const c = ri(20, 60); G.p.caps += c; changeRep('loners', 5); gainXP(15); log(`The stalker thanks you and hands over ${c} caps.`, 'good'); const it = giveItem(pick(['firstaid', 'antirad', 'ammo9', 'stimpak']), 1); log(`He also gives you ${itemName(it)}.`, 'good'); renderAll(); } }); }],
      ['Not my problem', () => { closeModal(); changeRep('loners', -1); }]]);
  }
  if (t === 'storm') {
    return openEvent('⚠ EMISSION!', 'The sky turns blood-red and the ground hums. An emission is coming. Find cover NOW.', [
      ['Run for the nearest building', () => {
        closeModal(); const l = nearestLoc(G.p.lat, G.p.lng, 600);
        if (l) { const d = dist(G.p.lat, G.p.lng, l.lat, l.lng); passTime(d / 1000 / travelSpeed() * 60); G.p.lat = l.lat; G.p.lng = l.lng; G.p.at = l.id; l.revealed = true; log(`You made it into ${l.name} as the emission hit.`, 'good'); renderWorld(); openLocPanel(); }
        else { const s = getStats(); const d = Math.round(ri(20, 40) * (1 - s.anomRes / 100)); G.p.hp -= d; G.p.rad += Math.round(30 * (1 - s.radRes / 100)); log(`No cover! The emission tears through you: -${d} HP.`, 'bad'); if (G.p.hp <= 0) return die('the emission'); }
        renderAll();
      }],
      ['Dig in and pray', () => { closeModal(); const s = getStats(); const d = Math.round(ri(10, 30) * (1 - s.anomRes / 100)); G.p.hp -= d; G.p.rad += Math.round(25 * (1 - s.radRes / 100)); passTime(60); log(`You survive the emission… barely. -${d} HP.`, 'bad'); if (G.p.hp <= 0) return die('the emission'); renderAll(); }]]);
  }
  if (t === 'wanderer') {
    const name = `${pick(D.FIRST)} "${pick(D.NICK)}"`;
    const v = ri(0, 2);
    if (v === 0) return openEvent('Wanderer', `${name} sits by a dying fire. "Spare some food? I'll tell you what I've seen around here."`, [
      ['Give food (any)', () => { const f = G.p.inv.find(i => def(i).cat === 'food'); if (!f) return toast('You have no food.'); removeItemUnit(f); closeModal(); let n = 0; Object.values(G.locs).forEach(l => { if (!l.revealed && dist(l.lat, l.lng, G.p.lat, G.p.lng) < 2000) { l.revealed = true; n++; } }); changeRep('loners', 2); gainXP(5); log(`${name} marks ${n} locations on your map.`, 'good'); renderWorld(); renderAll(); }],
      ['Leave', closeModal]]);
    if (v === 1) { const it = makeItem('schematic', {}); const price = 60 + ri(0, 60); return openEvent('Wanderer', `${name} whispers: "Found this in a lab. ${price} caps and it's yours."<br><b>${esc(itemName(it))}</b>`, [
      [`Buy (${price} caps)`, () => { if (G.p.caps < price) return toast('Not enough caps.'); G.p.caps -= price; addItem(it); closeModal(); log(`Bought ${itemName(it)}.`, 'good'); renderAll(); }], ['Decline', closeModal]]); }
    return openEvent('Wanderer', `${name} nods. "Watch out — the ${pick(D.ZONE_ADJ)} ${pick(D.ZONE_NOUN)} is crawling with mutants. Here, take this." He tosses you something.`, [['Thanks', () => { closeModal(); const it = giveItem(pick(['bandage', 'water', 'beans', 'antirad', 'vodka', 'ammo9']), ri(1, 2)); log(`Got ${itemName(it)}.`, 'good'); gainXP(3); renderAll(); }]]);
  }
}
function encounterFight(kind, danger) {
  const grp = makeGroup(danger, kind); const s = getStats();
  const desc = `${grp.length > 1 ? grp.length + 'x ' : ''}${grp[0].name} (lvl ${grp[0].lvl})`;
  log(`Encounter: ${desc}!`, 'warn');
  const sneak = clamp(25 + s.stealth + G.p.skills.survival * 3 - (isNight() ? -10 : 0), 5, 90);
  const choices = [['Fight', () => { closeModal(); startCombat(grp); }], [`Sneak past (${Math.round(sneak)}%)`, () => {
    closeModal(); if (rnd() * 100 < sneak) { log('You slip past unnoticed.', 'good'); gainXP(3); renderAll(); } else { log('They spotted you!', 'bad'); startCombat(grp, { ambush: true }); }
  }]];
  if (s.fear > 0 && grp[0].kind !== 'robot') choices.push([`Intimidate (${Math.round(s.fear * 1.5)}%)`, () => { closeModal(); if (rnd() * 100 < s.fear * 1.5) { log('They back off from you.', 'good'); gainXP(4); } else startCombat(grp); renderAll(); }]);
  openEvent('Hostiles!', `You spot ${desc} ${grp[0].kind === 'mutant' ? 'sniffing the air' : grp[0].kind === 'robot' ? 'scanning the area' : 'blocking the road'} ahead.`, choices);
}
function encounterAnomaly(z) {
  const s = getStats();
  openEvent('Anomaly!', `The air ripples in front of you — a ${pick(['Vortex', 'Burner', 'Electro', 'Springboard', 'Fruit Punch', 'Whirligig', 'Burnt Fuzz'])} anomaly in ${esc(z.name)}.`, [
    ['Throw bolts and go around (+20m)', () => { closeModal(); passTime(20); log('You carefully navigate around the anomaly.'); renderAll(); }],
    ['Search it for artifacts', () => {
      closeModal(); const d = Math.round(ri(6, 16) * z.int * (1 - s.anomRes / 100) * (hasPerk('cautious') ? 0.6 : 1));
      if (rnd() < 0.5) { G.p.hp -= d; log(`The anomaly lashes out: -${d} HP.`, 'bad'); if (G.p.hp <= 0) return die('an anomaly'); }
      if (rnd() < 0.3 + G.p.skills.science * 0.04 + (countItem('detector') ? 0.2 : 0)) { const a = makeItem(pick(itemsByTag('artifact')).id, { luck: z.int * 8 }); G.stats.artifacts++; gainXP(15); showLoot({ items: [a], caps: 0 }, 'Artifact!'); questArtifact(z); }
      else log('Nothing but twisted metal.'); renderAll();
    }]]);
}

/* ---------- trade ---------- */
function priceMod(fac) { const rep = fac ? G.rep[fac] : 0; return G.p.skills.barter * 0.04 + (hasPerk('silvertongue') ? 0.15 : 0) + rep / 500; }
function buyPrice(it, fac) { const v = itemUnitValue(it); return Math.max(1, Math.ceil(v * Math.max(0.85, 1.4 - priceMod(fac)))); }
function sellPrice(it, fac) { const v = itemUnitValue(it); return Math.max(it.base === 'package' ? 0 : 1, Math.floor(Math.min(v * 0.85, v * (0.35 + priceMod(fac) * 0.7)))); }
function traderStock(settle, seedKey) {
  return withSeed(hashStr(G.seed + seedKey + Math.floor(day() / 2)), () => {
    const st = []; const dg = 1 + G.p.level * 0.4 + (distFromStartKm(G.p.lat, G.p.lng) * 0.3);
    const add = (spec, n) => { for (let i = 0; i < n; i++) { const it = randomItemByTag(spec, dg, 10); const b = def(it); if (b.stack) { const ex = st.find(x => x.base === it.base); if (ex) { ex.qty += it.qty; continue; } } st.push(it); } };
    [['water', 3], ['beans', 2], ['bandage', 3], ['antirad', 1], ['ammo9', 30]].forEach(([b, q]) => st.push(makeItem(b, { qty: q + ri(0, q) })));
    add('food', 3); add('drink', 2); add('med', 3); add('ammo', 3); add('comp', 5); add('weapon', ri(2, 4)); add('armor', ri(1, 2)); add('tool', 2);
    if (rnd() < 0.6) add('schematic', 1); if (rnd() < 0.4) add('book', 1); if (rnd() < 0.5) add('chem', 1);
    if (settle && settle.fac === 'science') { add('artifact', 1); add('tool:science', 1); }
    if (settle && settle.fac === 'order') { add('weapon:mil', 1); add('armor:mil', 1); }
    return st;
  });
}
let TRADE = null;
function openTrade(loc) {
  if (loc && loc.settle) {
    const s = loc.settle;
    if (G.rep[s.fac] < -30) return toast(`${D.FACTIONS[s.fac].name} refuse to trade with you.`);
    if (s.stockDay !== Math.floor(day() / 2)) { s.stockDay = Math.floor(day() / 2); s.stock = traderStock(s, loc.id); s.caps = Math.max(s.caps, 300 + G.p.level * 40); }
    TRADE = { name: s.trader, fac: s.fac, stock: s.stock, ref: s };
  } else {
    TRADE = { name: `${pick(D.FIRST)} the Caravaneer`, fac: null, stock: traderStock(null, 'wander' + G.time), ref: { caps: ri(200, 500) } };
  }
  renderTrade();
}
function tradeBuy(i) {
  const it = TRADE.stock[i]; if (!it) return; const pr = buyPrice(it, TRADE.fac);
  if (G.p.caps < pr) return toast('Not enough caps.');
  G.p.caps -= pr; TRADE.ref.caps += pr;
  if (it.qty > 1) { it.qty--; giveItem(it.base, 1); } else { TRADE.stock.splice(i, 1); addItem(it); }
  renderTrade(); renderHUD();
}
function tradeSell(uidv) {
  const it = invFind(uidv); if (!it) return; if (it.base === 'package') return toast("That's not yours to sell.");
  const pr = sellPrice(it, TRADE.fac); if (TRADE.ref.caps < pr) return toast('Trader is out of caps.');
  G.p.caps += pr; TRADE.ref.caps -= pr;
  if (it.qty > 1) { it.qty--; const ex = TRADE.stock.find(x => x.base === it.base && x.qty); if (ex) ex.qty++; else TRADE.stock.push(makeItem(it.base, { qty: 1 })); }
  else { removeItemUnit(it); TRADE.stock.push(it); }
  renderTrade(); renderHUD();
}

/* ---------- quests ---------- */
const FETCH_POOL = [['bandage', 3, 5], ['beans', 2, 4], ['water', 2, 4], ['antirad', 1, 3], ['scrap', 4, 8], ['electronics', 2, 4], ['chemicals', 2, 4], ['cloth', 3, 6], ['vodka', 1, 3], ['firstaid', 1, 2], ['circuit', 1, 3], ['rawmeat', 2, 4], ['hide', 1, 3], ['herbs', 3, 6], ['gunpowder', 2, 4], ['filter', 1, 2], ['carbatt', 1, 1], ['goldwatch', 1, 1], ['fuel', 1, 3], ['ammo9', 15, 30], ['bones', 2, 4], ['phone', 1, 2]];
function genQuests(loc) {
  const s = loc.settle; const out = [];
  withSeed(hashStr(G.seed + loc.id + 'q' + day()), () => {
    for (let i = 0; i < 6 && out.length < 3; i++) {
      const q = genQuest(loc); if (!q) continue;
      const active = G.quests.filter(x => x.status === 'active');
      if ([...out, ...active].some(x => x.title === q.title || (q.locId && x.locId === q.locId) || (q.zoneId && x.zoneId === q.zoneId))) continue;
      out.push(q);
    }
  });
  return out;
}
function questTargetLoc(from, minD, maxD) {
  const c = Object.values(G.locs).filter(l => l.id !== from.id && !l.settle && (l.real || rnd() < 0.5)).map(l => ({ l, d: dist(from.lat, from.lng, l.lat, l.lng) })).filter(x => x.d > minD && x.d < maxD);
  c.sort((a, b) => (b.l.real && b.l.name.indexOf('Abandoned') < 0 ? 1 : 0) - (a.l.real && a.l.name.indexOf('Abandoned') < 0 ? 1 : 0) || a.d - b.d);
  const top = c.slice(0, 25); return top.length ? pick(top).l : null;
}
function genQuest(loc) {
  const s = loc.settle; const fac = s.fac; const giver = `${pick(D.FIRST)} "${pick(D.NICK)}"`;
  const lvl = G.p.level; const danger = dangerAt(loc.lat, loc.lng);
  const mult = (1 + G.p.skills.barter * 0.05) * (hasPerk('leader') ? 1.25 : 1);
  const type = wpick([['fetch', 0, 3], ['kill', 0, 3], ['deliver', 0, 2], ['explore', 0, 2], ['clear', 0, 2], ['artifact', 0, 1.5], ['escort', 0, 1.2]])[0];
  const q = { id: 'q' + G.time + '_' + ri(1000, 9999), type, giverId: loc.id, giver, fac, status: 'offer', prog: 0 };
  const rew = (base) => { q.caps = Math.round(base * mult * (1 + lvl * 0.15)); q.xp = Math.round(base * 0.8 * (1 + lvl * 0.1)); q.rep = ri(4, 10); if (rnd() < 0.35) q.item = pick(['firstaid', 'stimpak', 'antirad', 'radaway', 'repairkit', 'armymed', 'schematic', 'modkit', 'grenade', 'bk_' + pick(['combat', 'survival', 'scav', 'craft', 'med', 'barter', 'science'])]); };
  if (type === 'fetch') {
    const [b, a, z] = pick(FETCH_POOL); q.need = b; q.count = ri(a, z);
    q.title = `${pick(['Supply Run', 'Shopping List', 'Urgent Need', 'Stock Up'])}: ${D.ITEMS[b].name}`;
    q.desc = `${giver} needs ${q.count}x ${D.ITEMS[b].name}. ${pick(['"Our stores are running dry."', '"Don\'t ask what it\'s for."', '"The Doc is asking for it."', '"I\'ll pay fair, I swear."'])} Bring them back here.`;
    rew(D.ITEMS[b].v * q.count * 1.6 + 25);
  } else if (type === 'kill') {
    const c = D.ENEMIES.filter(e => e[10] <= danger + 1 + lvl * 0.3); const e = pick(c);
    q.enemy = e[0]; q.count = e[10] >= 3 ? ri(1, 2) : ri(2, 5);
    q.title = `${pick(['Cull', 'Hunt', 'Extermination', 'Bounty'])}: ${e[1]}`;
    q.desc = `${giver}: "${e[9] === 'raider' ? 'Those scum have been robbing our people.' : 'These creatures killed two of ours last week.'}" Kill ${q.count} ${e[1]}(s) anywhere, then return.`;
    rew(e[6] * q.count * 1.5 + 30);
  } else if (type === 'artifact') {
    let z = G.zones.filter(z => z.type === 'anomaly').map(z => ({ z, d: dist(loc.lat, loc.lng, z.lat, z.lng) })).filter(x => x.d < 6000).sort((a, b) => a.d - b.d)[0];
    if (!z) return null; z = z.z; q.zoneId = z.id;
    q.title = `Artifact Hunt: ${z.name}`; q.desc = `${giver} wants samples from the anomaly field "${z.name}". Go there and use "Hunt artifacts" until you find one.`;
    rew(90 + z.int * 30);
  } else {
    const t = questTargetLoc(loc, type === 'clear' ? 400 : 500, 3500 + lvl * 300); if (!t) return null;
    q.locId = t.id; const tn = `${t.name} (${D.POI[t.type].label})`;
    if (type === 'deliver') { q.title = `Delivery to ${t.name}`; q.desc = `Carry a sealed package to ${tn}. ${pick(['"Don\'t open it."', '"Someone will be waiting."', '"Leave it under the counter."'])}`; rew(50 + dist(loc.lat, loc.lng, t.lat, t.lng) / 40); }
    if (type === 'explore') { q.title = `Recon: ${t.name}`; q.desc = `${giver}: "Nobody's been to ${tn} since the bombs. Go take a look." Reach the location.`; rew(40 + dist(loc.lat, loc.lng, t.lat, t.lng) / 50); }
    if (type === 'clear') { q.title = `Clear Out ${t.name}`; q.desc = `A dangerous ${pick(['raider boss', 'mutant alpha', 'gang leader', 'beast'])} has made ${tn} its lair. Kill it.`; q.boss = true; rew(110 + danger * 25); }
    if (type === 'escort') { q.title = `Escort to ${t.name}`; q.desc = `${pick(D.FIRST)}, a ${pick(['nervous scientist', 'young stalker', 'old medic', 'trader'])}, needs to reach ${tn} alive. Expect trouble on the road.`; rew(70 + dist(loc.lat, loc.lng, t.lat, t.lng) / 30); }
  }
  return q;
}
function acceptQuest(locId, i) {
  const s = G.locs[locId].settle; const q = s.quests[i]; if (!q) return;
  if (G.quests.filter(x => x.status === 'active').length >= 8) return toast('Journal full (8 active quests).');
  q.status = 'active'; G.quests.push(q); s.quests.splice(i, 1);
  if (q.type === 'deliver') addItem(makeItem('package', { quest: q.id }));
  log(`Quest accepted: ${q.title}`, 'quest'); renderWorld(); renderAll(); renderLocPanel(); openSettlementQuests(locId);
}
function questReady(q) {
  if (q.type === 'fetch') return countItem(q.need) >= q.count;
  if (q.type === 'kill') return (q.prog || 0) >= q.count;
  return false;
}
function completeQuest(q) {
  q.status = 'done'; G.stats.quests++;
  G.p.caps += q.caps; gainXP(q.xp); changeRep(q.fac, q.rep);
  (D.FACTIONS[q.fac].enemies || []).forEach(f => { if (f !== 'raiders') changeRep(f, -Math.ceil(q.rep / 3)); });
  let extra = '';
  if (q.item) { const it = q.item === 'schematic' ? makeItem('schematic', {}) : makeItem(q.item, { qty: 1, luck: 20 }); addItem(it); extra = ` and ${itemName(it)}`; }
  log(`Quest complete: ${q.title}! +${q.caps} caps, +${q.xp} XP${extra}.`, 'quest'); toast('Quest complete!');
  renderWorld(); renderAll();
}
function turnInQuest(qid) {
  const q = G.quests.find(x => x.id === qid); if (!q || !questReady(q)) return;
  if (q.type === 'fetch') removeQty(q.need, q.count);
  completeQuest(q); openSettlementQuests(q.giverId);
}
function abandonQuest(qid) {
  const q = G.quests.find(x => x.id === qid); if (!q) return; q.status = 'failed';
  if (q.type === 'deliver') removeQty('package', 1);
  changeRep(q.fac, -2); log(`Quest abandoned: ${q.title}`, 'bad'); renderWorld(); renderAll();
}
function questArrive(loc) {
  G.quests.filter(q => q.status === 'active' && q.locId === loc.id).forEach(q => {
    if (q.type === 'deliver') { G.p.inv = G.p.inv.filter(i => !(i.base === 'package' && i.quest === q.id)); log('You leave the package at the drop point.', 'quest'); completeQuest(q); }
    else if (q.type === 'explore') completeQuest(q);
    else if (q.type === 'escort') { log('Your escort thanks you and disappears inside.', 'quest'); completeQuest(q); }
    else if (q.type === 'clear' && q.boss) {
      const boss = makeEnemy(dangerAt(loc.lat, loc.lng) + 1.5, null, null, true);
      const grp = [boss]; if (rnd() < 0.6) grp.push(makeEnemy(dangerAt(loc.lat, loc.lng), boss.kind));
      log(`${boss.name} is here!`, 'bad');
      setTimeout(() => startCombat(grp, { onWin: () => { q.boss = false; completeQuest(q); } }), 50);
    }
  });
}
function questArtifact(z) { G.quests.filter(q => q.status === 'active' && q.zoneId === z.id).forEach(completeQuest); }

/* ---------- skills & perks ---------- */
function raiseSkill(k) { if (G.p.sp <= 0 || G.p.skills[k] >= 10) return; G.p.sp--; G.p.skills[k]++; log(`${D.SKILLS[k][0]} raised to ${G.p.skills[k]}.`, 'good'); renderAll(); saveGame(true); }
function perkOffers() { const pool = D.PERKS.filter(p => !G.p.perks.includes(p[0])); const out = []; while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); return out; }
function takePerk(id) { if (G.p.pendingPerks <= 0) return; G.p.perks.push(id); G.p.pendingPerks--; log(`New perk: ${D.PERK_BY_ID[id][1]}.`, 'good'); closeModal(); renderAll(); saveGame(true); maybePerkModal(); }

/* ---------- save / load / death ---------- */
function saveGame(quiet) {
  if (!G || G.dead || G.combat) return false;
  try { const copy = Object.assign({}, G); delete copy.travel; delete copy.combat; localStorage.setItem(SAVE_KEY, JSON.stringify(copy)); if (!quiet) toast('Game saved.'); return true; }
  catch (e) { if (!quiet) toast('Save failed: ' + e.message); return false; }
}
function loadGame() {
  try { const s = localStorage.getItem(SAVE_KEY); if (!s) return false; G = JSON.parse(s); G.travel = null; G.combat = null; G.dead = false; return true; } catch (e) { return false; }
}
function die(cause) {
  if (G.dead) return; G.dead = true; stopTravel(); G.combat = null;
  log(`You died (${cause}).`, 'bad');
  showDeath(cause);
}
