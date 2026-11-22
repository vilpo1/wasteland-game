/* ===== UI ===== */
'use strict';
let TAB = 'inv', INV_FILTER = 'all', OPEN_ITEM = null, LP_COLLAPSED = false;

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 2200); setTimeout(() => t.remove(), 2800);
}
function bar(label, v, max, cls, txt) {
  const pct = clamp(v / max * 100, 0, 100);
  return `<div class="stat ${cls}" title="${label}"><span class="sl">${label}</span><div class="bar"><i style="width:${pct}%"></i></div><span class="sv">${txt != null ? txt : Math.round(v)}</span></div>`;
}
function renderHUD() {
  if (!G) return; const p = G.p, s = getStats();
  const w = totalWeight(), cap = s.carry;
  $('#hud').innerHTML =
    bar('HP', p.hp, s.maxhp, 'hp', `${Math.max(0, Math.round(p.hp))}/${s.maxhp}`) + bar('FOOD', p.food, 100, 'food') + bar('H2O', p.water, 100, 'water') +
    bar('RAD', p.rad, 100, 'rad') + bar('FTG', p.fatigue, 100, 'ftg') +
    `<div class="hinfo"><span class="${w > cap ? 'neg' : ''}">⚖ ${round1(w)}/${cap}kg</span><span>⛁ ${p.caps} caps</span><span>${isNight() ? '☾' : '☀'} ${timeStr()}</span><span>LVL ${p.level} <small>${p.xp}/${xpNeed(p.level)}xp</small></span><span title="Danger level here">⚠ ${dangerAt(p.lat, p.lng)}</span>${p.bleed > 0 ? '<span class="neg">🩸BLEEDING</span>' : ''}${p.sp > 0 ? `<span class="pos">+${p.sp} SP</span>` : ''}</div>`;
  applyNight();
}
function onLog() { const t = $('#ticker'); if (t && G) t.innerHTML = G.log.slice(0, 3).map(l => `<div class="${l.cls}"><span class="muted">[${l.t}]</span> ${l.msg}</div>`).join(''); if (TAB === 'log') renderTab(); }
function renderAll() { if (!G) return; renderHUD(); renderTab(); renderLocPanel(); onLog(); maybePerkModal(); }

/* ---------- side tabs ---------- */
const MOBILE_MQ = window.matchMedia('(max-width: 820px), (pointer: coarse) and (max-height: 520px)');
const COARSE = window.matchMedia('(pointer: coarse)').matches;
function isMobile() { return MOBILE_MQ.matches; }
function openSheet() { if (!document.body.classList.contains('sheet-open')) { document.body.classList.add('sheet-open'); } }
function closeSheet() { document.body.classList.remove('sheet-open'); }
function setTab(t, keepSheet) {
  if (t === 'map') { closeSheet(); return; }
  if (isMobile() && !keepSheet) {
    if (TAB === t && document.body.classList.contains('sheet-open')) { closeSheet(); return; }
    openSheet();
  }
  TAB = t; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); renderTab();
  const tb = $('#tabbody'); if (tb) tb.scrollTop = 0;
}
function renderTab() {
  const el = $('#tabbody'); if (!el || !G) return;
  el.innerHTML = ({ inv: tabInv, craft: tabCraft, char: tabChar, skills: tabSkills, quests: tabQuests, log: tabLog, menu: tabMenu })[TAB]();
}
const INV_CATS = { all: null, weapons: ['melee', 'ranged', 'ammo', 'throw'], armor: ['armor', 'artifact'], aid: ['food', 'drink', 'med', 'chem'], junk: ['junk'], comp: ['comp'], misc: ['tool', 'book', 'schematic', 'quest'] };
function invRow(it) {
  const b = def(it), eq = isEquipped(it), open = OPEN_ITEM === it.uid;
  let acts = [];
  if (open) {
    if (['food', 'drink', 'med', 'chem', 'book', 'schematic'].includes(b.cat) || ['repairkit', 'modkit', 'plating'].includes(b.id)) acts.push(`<button class="btn" onclick="useItem(${it.uid})">${b.cat === 'book' || b.cat === 'schematic' ? 'Read' : 'Use'}</button>`);
    if (['melee', 'ranged', 'armor', 'artifact'].includes(b.cat)) acts.push(eq ? `<button class="btn" onclick="unequipItem(${it.uid})">Unequip</button>` : `<button class="btn" onclick="equipItem(${it.uid})">Equip</button>`);
    if (b.scrap || ['melee', 'ranged', 'armor'].includes(b.cat)) { acts.push(`<button class="btn" onclick="scrapItem(${it.uid})">Scrap</button>`); if (it.qty > 1) acts.push(`<button class="btn" onclick="scrapItem(${it.uid},true)">Scrap all</button>`); }
    if (b.cat !== 'quest') { acts.push(`<button class="btn dim" onclick="dropItem(${it.uid})">Drop</button>`); if (it.qty > 1) acts.push(`<button class="btn dim" onclick="dropItem(${it.uid},true)">Drop all</button>`); }
  }
  return `<div class="irow${eq ? ' eq' : ''}${open ? ' open' : ''}" ><div class="ihead" onclick="OPEN_ITEM=${open ? 'null' : it.uid};renderTab()"><span style="color:${rarityColor(it)}">${eq ? '[E] ' : ''}${esc(itemName(it))}${it.qty > 1 ? ' ×' + it.qty : ''}</span><span class="muted">${round1(itemWeight(it))}kg</span></div>${open ? `<div class="idesc">${itemDesc(it)}<div class="acts">${acts.join('')}</div></div>` : ''}</div>`;
}
function tabInv() {
  const cats = INV_CATS[INV_FILTER];
  const order = ['melee', 'ranged', 'armor', 'artifact', 'ammo', 'throw', 'med', 'chem', 'food', 'drink', 'tool', 'book', 'schematic', 'quest', 'comp', 'junk'];
  const list = G.p.inv.filter(i => !cats || cats.includes(def(i).cat)).sort((a, b) => (isEquipped(b) - isEquipped(a)) || order.indexOf(def(a).cat) - order.indexOf(def(b).cat) || itemName(a).localeCompare(itemName(b)));
  const w = weaponStats();
  return `<div class="filters">${Object.keys(INV_CATS).map(k => `<button class="chip${INV_FILTER === k ? ' on' : ''}" onclick="INV_FILTER='${k}';renderTab()">${k}</button>`).join('')}</div>
  <div class="muted small">Weapon: ${esc(w.name)} ${w.dmg[0]}-${w.dmg[1]} dmg${w.ammo ? ` · ammo ${countItem(w.ammo)}` : ''} · click an item for actions</div>
  ${list.map(invRow).join('') || '<div class="muted">Empty.</div>'}
  <div class="acts"><button class="btn" onclick="scrapAllJunk()">Scrap all junk</button></div>`;
}
function tabCraft() {
  const rs = D.RECIPES.filter(r => !r.schem || G.p.recipes.includes(r.id)).map(r => ({ r, st: recipeStatus(r) }));
  rs.sort((a, b) => (b.st.can - a.st.can) || (b.st.skillOk - a.st.skillOk) || recipeName(a.r).localeCompare(recipeName(b.r)));
  const row = ({ r, st }) => {
    const b = D.ITEMS[r.out[0]];
    const needs = Object.entries(r.needs).map(([k, n]) => `<span class="${countItem(k) >= n ? 'pos' : 'neg'}">${n} ${D.ITEMS[k].name} (${countItem(k)})</span>`).join(', ');
    return `<div class="irow craft ${st.can ? '' : 'locked'}"><div class="ihead"><span>${r.schem ? '📜 ' : ''}${esc(recipeName(r))} <span class="muted small">${b.cat}</span></span>
      <button class="btn" ${st.can ? '' : 'disabled'} onclick="craft('${r.id}')">Craft</button></div>
      <div class="small">${needs}${r.station ? ` · <span class="${st.stationOk ? 'pos' : 'neg'}">needs ${r.station}</span>` : ''}${st.miss.length ? ` · <span class="neg">req ${st.miss.join(', ')}</span>` : ''}</div></div>`;
  };
  return `<div class="small">Campfire: <b class="${hasCampfire() ? 'pos' : 'neg'}">${hasCampfire() ? 'yes' : 'no'}</b> · Workbench: <b class="${hasWorkbench() ? 'pos' : 'neg'}">${hasWorkbench() ? 'yes' : 'no'}</b>
  <br><span class="muted">Workbenches at settlements, factories, garages, hardware & fire stations. Make a campfire with 2 Wood + Matches. Find 📜 schematics to unlock advanced recipes (${G.p.recipes.length}/${D.SCHEMATICS.length} learned).</span></div>
  <div class="acts"><button class="btn" onclick="makeCamp()">🔥 Make campfire</button></div>${rs.map(row).join('')}`;
}
function tabChar() {
  const s = getStats(), p = G.p;
  const art = ['art1', 'art2'].map(k => equipped(k)).filter(Boolean);
  return `<h3>${esc(G.name)} <span class="muted">— Level ${p.level}</span></h3>
  <div class="grid2 small">
   <div>Armor <b>${Math.round(s.armor)}</b></div><div>Max HP <b>${s.maxhp}</b></div>
   <div>Rad resist <b>${Math.round(s.radRes)}%</b></div><div>Anomaly resist <b>${Math.round(s.anomRes)}%</b></div>
   <div>Damage <b>+${s.dmg}%</b></div><div>Accuracy <b>+${s.acc}</b></div>
   <div>Crit <b>${s.crit}%</b></div><div>Stealth <b>${s.stealth}</b></div>
   <div>Carry <b>${s.carry} kg</b></div><div>Speed <b>${travelSpeed().toFixed(1)} km/h</b></div>
   <div>Loot luck <b>${s.loot}</b></div><div>HP regen <b>${round1(0.8 + s.regen)}/h</b></div>
   ${s.radEmit ? `<div class="neg">Artifact rad <b>${s.radEmit}/h</b></div>` : ''}${s.lifesteal ? `<div>Lifesteal <b>${s.lifesteal}%</b></div>` : ''}
  </div>
  <h4>Equipped artifacts</h4>${art.length ? art.map(a => `<div style="color:${rarityColor(a)}">${esc(itemName(a))}: <span class="small">${modsText(a.gmods)}</span></div>`).join('') : '<div class="muted small">None. Find artifacts in anomaly fields (purple zones).</div>'}
  ${p.buffs.length ? '<h4>Active effects</h4>' + p.buffs.map(b => `<div class="small pos">+${b.val} ${b.stat} (${fmtMin(b.until - G.time)})</div>`).join('') : ''}
  <h4>Factions</h4>${Object.keys(D.FACTIONS).map(f => `<div class="small"><span style="color:${D.FACTIONS[f].color}">${D.FACTIONS[f].name}</span> ${bar('', G.rep[f] + 100, 200, 'rep', G.rep[f])}</div>`).join('')}
  <h4>Record</h4><div class="small muted">Travelled ${G.stats.km.toFixed(1)} km · Kills ${G.stats.kills} · Searches ${G.stats.searched} · Crafted ${G.stats.crafted} · Quests ${G.stats.quests} · Artifacts ${G.stats.artifacts}<br>Start: ${esc(G.startName)}</div>`;
}
function tabSkills() {
  const p = G.p;
  return `<div>Skill points: <b class="pos">${p.sp}</b> <span class="muted small">(+2 per level, books give +1)</span></div>
  ${Object.keys(D.SKILLS).map(k => `<div class="irow"><div class="ihead"><span>${D.SKILLS[k][0]} <b>${p.skills[k]}</b>/10</span><button class="btn" ${p.sp > 0 && p.skills[k] < 10 ? '' : 'disabled'} onclick="raiseSkill('${k}')">+</button></div><div class="small muted">${D.SKILLS[k][1]}</div><div class="pips">${'■'.repeat(p.skills[k])}${'□'.repeat(10 - p.skills[k])}</div></div>`).join('')}
  <h4>Perks (${p.perks.length}/${D.PERKS.length})</h4>${p.perks.map(id => `<div class="small"><b>${D.PERK_BY_ID[id][1]}</b> — <span class="muted">${D.PERK_BY_ID[id][2]}</span></div>`).join('') || '<div class="muted small">Level up to choose perks.</div>'}
  ${p.pendingPerks > 0 ? `<button class="btn" onclick="maybePerkModal(true)">Choose perk (${p.pendingPerks})</button>` : ''}`;
}
function questLine(q) {
  let prog = '';
  if (q.type === 'fetch') prog = `${Math.min(countItem(q.need), q.count)}/${q.count} ${D.ITEMS[q.need].name} — return to ${G.locs[q.giverId] ? esc(G.locs[q.giverId].name) : 'giver'}`;
  if (q.type === 'kill') prog = `${Math.min(q.prog || 0, q.count)}/${q.count} killed — return to ${G.locs[q.giverId] ? esc(G.locs[q.giverId].name) : 'giver'}`;
  const tl = q.locId && G.locs[q.locId], tz = q.zoneId && G.zones.find(z => z.id === q.zoneId);
  if (tl) prog = `Target: ${esc(tl.name)} (${fmtDist(dist(G.p.lat, G.p.lng, tl.lat, tl.lng))})`;
  if (tz) prog = `Zone: ${esc(tz.name)} (${fmtDist(dist(G.p.lat, G.p.lng, tz.lat, tz.lng))})`;
  const tgt = tl || tz || G.locs[q.giverId];
  return `<div class="irow"><div class="ihead"><span class="qtxt">${esc(q.title)}</span><span class="muted small">${q.type}</span></div><div class="small">${q.desc}</div>
   <div class="small pos">${prog}</div><div class="small muted">Reward: ${q.caps} caps, ${q.xp} XP, +${q.rep} ${D.FACTIONS[q.fac].name}${q.item ? ', bonus item' : ''}</div>
   <div class="acts">${tgt ? `<button class="btn" onclick="closeSheet();map.setView([${tgt.lat},${tgt.lng}],16)">Show on map</button>` : ''}<button class="btn dim" onclick="abandonQuest('${q.id}')">Abandon</button></div></div>`;
}
function tabQuests() {
  const a = G.quests.filter(q => q.status === 'active');
  return `<div class="muted small">Quests come from settlements (⌂ markers). Completed: ${G.stats.quests}</div>${a.map(questLine).join('') || '<div class="muted">No active quests. Visit a settlement — your home bunker has a quest board.</div>'}`;
}
function tabLog() { return G.log.map(l => `<div class="logl ${l.cls}"><span class="muted">[${l.t}]</span> ${l.msg}</div>`).join(''); }
function tabMenu() {
  return `<div class="acts col"><button class="btn" onclick="saveGame()">💾 Save game</button><button class="btn" onclick="if(loadGame()){bootGame();toast('Loaded')}else toast('No save')">📂 Load game</button>
  <button class="btn" onclick="if(confirm('Start a new game? Unsaved progress is lost.'))showStart()">☢ New game</button>
  <button class="btn" onclick="document.body.classList.toggle('nofilter')">🎨 Toggle map filter</button>
  <button class="btn" onclick="ensurePOIs(true)">📡 Rescan area (OSM)</button>
  <button class="btn" onclick="showHelp()">❓ How to play</button></div>
  <p class="small muted">Map © OpenStreetMap contributors, tiles © Esri &amp; OpenTopoMap. Places from the Overpass API. Your progress autosaves to this browser.</p>`;
}

/* ---------- location panel / action bar ---------- */
function renderLocPanel() {
  const el = $('#locpanel'); if (!el || !G) return;
  if (G.travel) { el.innerHTML = `<div class="lp-title">Travelling…</div><button class="btn" onclick="stopTravel();arrive(null)">■ Stop</button>`; return; }
  const l = currentLoc(); const zs = zonesAt(G.p.lat, G.p.lng); const anom = zs.find(z => z.type === 'anomaly');
  let h = `<button class="lp-toggle" onclick="LP_COLLAPSED=!LP_COLLAPSED;renderLocPanel()" aria-label="Toggle panel">${LP_COLLAPSED ? '▴' : '▾'}</button>`;
  el.classList.toggle('collapsed', LP_COLLAPSED);
  if (l) {
    const P = D.POI[l.type]; const looted = l.searches <= 0 && day() < l.respawnDay;
    h += `<div class="lp-title">${esc(l.name)} <span class="muted small">${P.label}${l.real ? ' · real' : ''}</span></div><div class="lp-body">`;
    if (l.settle) h += `<div class="small" style="color:${D.FACTIONS[l.settle.fac].color}">⌂ ${esc(l.settle.name)} · ${D.FACTIONS[l.settle.fac].name} (rep ${G.rep[l.settle.fac]})</div>`;
    h += `<div class="acts">`;
    h += `<button class="btn" ${looted ? 'disabled' : ''} onclick="searchLoc()">🔍 Search${looted ? ' (empty)' : ''}</button>`;
    if (l.settle) { h += `<button class="btn" onclick="openTrade(currentLoc())">⛁ Trade</button><button class="btn" onclick="openSettlementQuests('${l.id}')">! Quests${settleQuestBadge(l)}</button><button class="btn" onclick="rest(8)">🛏 Sleep 8h${l.settle.home ? '' : ' (10c)'}</button>`; }
    if (hasWorkbench()) h += `<button class="btn" onclick="setTab('craft',false)">⚒ Workbench</button>`;
    h += `</div>`;
  } else h += `<div class="lp-title">Wilderness <span class="muted small">${G.p.lat.toFixed(4)}, ${G.p.lng.toFixed(4)}</span></div><div class="lp-body">`;
  if (zs.length) h += `<div class="small">${zs.map(z => `<span class="z-${z.type}">${zoneLabel(z)}: ${esc(z.name)} (lvl ${z.int})</span>`).join(' · ')}</div>`;
  h += `<div class="acts">${anom ? `<button class="btn hot" onclick="huntArtifacts()">✺ Hunt artifacts</button>` : ''}${!(l && l.settle) ? `<button class="btn" onclick="makeCamp()">🔥 Campfire</button><button class="btn" onclick="rest(1)">⏳ Rest 1h</button><button class="btn" onclick="rest(8)">🛏 Sleep 8h</button>` : `<button class="btn" onclick="rest(1)">⏳ Wait 1h</button>`}<button class="btn dim" onclick="map.setView([G.p.lat,G.p.lng],16)">◎ Center</button></div></div>`;
  el.innerHTML = h;
}
function openLocPanel() { LP_COLLAPSED = false; renderLocPanel(); $('#locpanel').classList.add('flash'); setTimeout(() => $('#locpanel').classList.remove('flash'), 600); }
function settleQuestBadge(l) {
  const s = l.settle; const ready = G.quests.filter(q => q.status === 'active' && q.giverId === l.id && questReady(q)).length;
  return ready ? ` <b class="pos">(${ready}✓)</b>` : (s.questDay !== day() || s.quests.length) ? ' •' : '';
}

/* ---------- modals ---------- */
function openModal(html, cls) { const m = $('#modal'); m.className = 'show ' + (cls || ''); $('#modalbox').innerHTML = html; }
function closeModal() { const m = $('#modal'); if (m) { m.className = ''; $('#modalbox').innerHTML = ''; } setTimeout(() => maybePerkModal(), 30); }
let EVENT_CB = [];
function openEvent(title, text, choices) {
  EVENT_CB = choices.map(c => c[1]);
  openModal(`<h2>${title}</h2><p>${text}</p><div class="acts col">${choices.map((c, i) => `<button class="btn" onclick="EVENT_CB[${i}]()">${c[0]}</button>`).join('')}</div>`);
  renderAll();
}
let LOOT = null;
function showLoot(loot, title, after) {
  LOOT = { items: loot.items.slice(), caps: loot.caps || 0, after: after || null };
  if (LOOT.caps) { G.p.caps += LOOT.caps; log(`Found ${LOOT.caps} caps.`, 'good'); }
  renderLoot(title);
}
function renderLoot(title) {
  if (!LOOT) return; if (title) LOOT.title = title;
  openModal(`<h2>${esc(LOOT.title)}</h2>${LOOT.caps ? `<div class="pos">+${LOOT.caps} caps</div>` : ''}
   <div class="lootlist">${LOOT.items.map((it, i) => `<div class="irow"><div class="ihead"><span style="color:${rarityColor(it)}">${esc(itemName(it))}${it.qty > 1 ? ' ×' + it.qty : ''}</span><button class="btn" onclick="takeLoot(${i})">Take</button></div><div class="small">${itemDesc(it)}</div></div>`).join('') || '<div class="muted">Nothing left.</div>'}</div>
   <div class="small muted">Carrying ${round1(totalWeight())}/${carryCap()} kg</div>
   <div class="acts"><button class="btn hot" onclick="takeLoot(-1)">Take all</button><button class="btn dim" onclick="leaveLoot()">Leave</button></div>`, 'loot');
}
function takeLoot(i) {
  if (!LOOT) return;
  const take = i < 0 ? LOOT.items.splice(0) : LOOT.items.splice(i, 1);
  take.forEach(it => { addItem(it); log(`Picked up ${itemName(it)}${it.qty > 1 ? ' ×' + it.qty : ''}.`); });
  if (!LOOT.items.length) return leaveLoot();
  renderLoot(); renderHUD(); renderTab();
}
function leaveLoot() { const cb = LOOT && LOOT.after; LOOT = null; closeModal(); renderAll(); saveGame(true); if (cb) cb(); }

function renderCombat() {
  const c = G.combat; if (!c) return; const p = G.p, s = getStats(), w = weaponStats();
  const tgt = curTarget();
  const usable = p.inv.filter(i => ['med', 'chem', 'throw', 'food', 'drink'].includes(def(i).cat) || (['melee', 'ranged'].includes(def(i).cat) && !isEquipped(i)));
  openModal(`<h2>⚔ COMBAT</h2>
   <div class="enemies">${c.enemies.map((e, i) => `<div class="enemy${e.hp <= 0 ? ' dead' : ''}${e === tgt ? ' tgt' : ''}" onclick="setTarget(${i})"><b>${esc(e.name)}</b> <span class="muted small">lvl ${e.lvl}${e.boss ? ' · BOSS' : ''}${e.special ? ' · ' + e.special : ''}</span>${bar('HP', Math.max(0, e.hp), e.maxhp, 'hp', Math.max(0, e.hp) + '/' + e.maxhp)}${e.bleed ? '<span class="small neg">bleeding </span>' : ''}${e.burn ? '<span class="small neg">burning</span>' : ''}</div>`).join('')}</div>
   <div class="you">${bar('YOU', p.hp, s.maxhp, 'hp', Math.round(p.hp) + '/' + s.maxhp)}<div class="small">${esc(w.name)} ${w.dmg[0]}-${w.dmg[1]}${w.ammo ? ` · ${D.ITEMS[w.ammo].name}: ${countItem(w.ammo)}` : ''} · Armor ${Math.round(s.armor)}${p.bleed > 0 ? ' · <span class="neg">bleeding</span>' : ''}</div></div>
   <div class="acts"><button class="btn hot" onclick="playerAttack(false)">Attack${w.burst > 1 ? ' (burst)' : ''}</button><button class="btn" onclick="playerAttack(true)">Aimed ${w.melee ? 'strike' : 'shot'}</button>
   <select id="cuse"><option value="">— use item —</option>${usable.map(i => `<option value="${i.uid}">${esc(itemName(i))}${i.qty > 1 ? ' ×' + i.qty : ''}</option>`).join('')}</select><button class="btn" onclick="const v=$('#cuse').value;if(v)combatUse(+v)">Use</button>
   <button class="btn dim" onclick="fleeCombat()">Flee</button></div>
   <div class="clog">${c.log.slice(0, 14).map(l => `<div class="${l.cls}">${esc(l.m)}</div>`).join('')}</div>`, 'combat');
}
function renderTrade() {
  const T = TRADE; if (!T) return;
  const mine = G.p.inv.filter(i => !isEquipped(i) && i.base !== 'package');
  openModal(`<h2>⛁ Trading with ${esc(T.name)}</h2><div class="small">You: <b>${G.p.caps}</b> caps · Trader: <b>${T.ref.caps}</b> caps${T.fac ? ` · ${D.FACTIONS[T.fac].name} rep ${G.rep[T.fac]}` : ''} · Barter ${G.p.skills.barter}</div>
  <div class="trade"><div><h4>Trader (buy)</h4>${T.stock.map((it, i) => `<div class="irow"><div class="ihead"><span style="color:${rarityColor(it)}" onclick="this.closest('.irow').classList.toggle('open')">${esc(itemName(it))}${it.qty > 1 ? ' ×' + it.qty : ''} <span class="muted small">ⓘ</span></span><button class="btn" onclick="tradeBuy(${i})">${buyPrice(it, T.fac)}c</button></div><div class="tdesc">${itemDesc(it)}</div></div>`).join('')}</div>
  <div><h4>You (sell)</h4>${mine.map(it => `<div class="irow"><div class="ihead"><span style="color:${rarityColor(it)}" onclick="this.closest('.irow').classList.toggle('open')">${esc(itemName(it))}${it.qty > 1 ? ' ×' + it.qty : ''} <span class="muted small">ⓘ</span></span><button class="btn" onclick="tradeSell(${it.uid})">${sellPrice(it, T.fac)}c</button></div><div class="tdesc">${itemDesc(it)}</div></div>`).join('')}</div></div>
  <div class="acts"><button class="btn" onclick="TRADE=null;closeModal();renderAll();saveGame(true)">Done</button></div>`, 'wide');
}
function openSettlementQuests(locId) {
  const l = G.locs[locId]; const s = l.settle; if (!s) return;
  if (G.rep[s.fac] < -30) return toast(`${D.FACTIONS[s.fac].name} won't give you work.`);
  if (s.questDay !== day()) { s.questDay = day(); s.quests = genQuests(l); }
  const ready = G.quests.filter(q => q.status === 'active' && q.giverId === locId);
  openModal(`<h2>! Quest board — ${esc(s.name)}</h2>
  ${ready.length ? '<h4>Your jobs here</h4>' + ready.map(q => `<div class="irow"><div class="ihead"><span class="qtxt">${esc(q.title)}</span>${questReady(q) ? `<button class="btn hot" onclick="turnInQuest('${q.id}')">Turn in</button>` : '<span class="muted small">in progress</span>'}</div></div>`).join('') : ''}
  <h4>Available</h4>${s.quests.map((q, i) => `<div class="irow"><div class="ihead"><span class="qtxt">${esc(q.title)}</span><button class="btn" onclick="acceptQuest('${locId}',${i})">Accept</button></div><div class="small">${q.desc}</div><div class="small muted">Reward: ${q.caps} caps · ${q.xp} XP · +${q.rep} rep${q.item ? ' · bonus item' : ''}</div></div>`).join('') || '<div class="muted">No more work today. Come back tomorrow.</div>'}
  <div class="acts"><button class="btn" onclick="closeModal();renderAll()">Close</button></div>`, 'wide');
}
function maybePerkModal(force) {
  if (!G || G.dead || G.combat || G.travel || G.p.pendingPerks <= 0) return;
  if (!force && $('#modal').classList.contains('show')) return;
  const offers = perkOffers(); if (!offers.length) { G.p.pendingPerks = 0; return; }
  openModal(`<h2>★ LEVEL ${G.p.level} — choose a perk</h2><div class="acts col">${offers.map(p => `<button class="btn perk" onclick="takePerk('${p[0]}')"><b>${p[1]}</b><br><span class="small">${p[2]}</span></button>`).join('')}</div><p class="small muted">You also got +2 skill points (Skills tab).</p>`);
}
function showDeath(cause) {
  openModal(`<h2 class="neg">☠ YOU DIED</h2><p>Killed by ${esc(cause)} on ${timeStr()}.</p><p class="small">Level ${G.p.level} · ${G.stats.km.toFixed(1)} km travelled · ${G.stats.kills} kills · ${G.stats.quests} quests</p>
  <div class="acts col"><button class="btn" onclick="if(loadGame()){bootGame();toast('Last save loaded')}else showStart()">↺ Load last save</button><button class="btn" onclick="showStart()">☢ New game</button></div>`, 'death');
}
function showHelp() {
  openModal(`<h2>How to play</h2><ul class="small">
  <li><b>Travel:</b> click the map or a marker → "Travel here". Walking costs time, food, water and fatigue. Random encounters happen on the road — more at night, far from home, and inside danger zones.</li>
  <li><b>Zones:</b> <span class="z-rad">yellow = radiation</span>, <span class="z-anomaly">purple = anomalies (artifacts!)</span>, <span class="z-mutant">red = mutant nests</span>, <span class="z-raider">orange = raider turf</span>.</li>
  <li><b>Locations</b> are real places from OpenStreetMap. Loot depends on the type: pharmacies → meds, police → guns, gas stations → fuel & junk, military → weapons & armor… "?" markers are unidentified until you get close.</li>
  <li><b>⌂ Settlements</b> have traders, quest boards, workbenches and safe beds.</li>
  <li><b>Scrap</b> junk into components and <b>craft</b> weapons, ammo, armor, meds and upgrades. Find schematics for advanced gear.</li>
  <li><b>Level up</b> to raise 7 skills and pick perks. Equip up to 2 artifacts — but watch their radiation.</li>
  <li>Keep food, water and radiation in check. RAD ≥ 100 is lethal over time. Anti-Rad, RadAway and vodka help.</li>
  <li>Progress autosaves in your browser. Death lets you reload your last autosave.</li></ul>
  <div class="acts"><button class="btn" onclick="closeModal()">Got it</button></div>`);
}

/* ---------- start screen ---------- */
function showStart() {
  stopTravel(); G = null; closeModal();
  $('#start').style.display = 'flex'; $('#game').style.display = 'none';
  $('#continueBtn').style.display = localStorage.getItem(SAVE_KEY) ? 'inline-block' : 'none';
}
let START_POS = { lat: 59.4370, lng: 24.7536, name: 'Tallinn, Estonia' };
function setStartPos(lat, lng, name) { START_POS = { lat: +lat, lng: +lng, name }; $('#startpos').textContent = `Start: ${name} (${(+lat).toFixed(4)}, ${(+lng).toFixed(4)})`; }
async function searchCity() {
  const q = $('#citySearch').value.trim(); if (!q) return; const out = $('#cityResults'); out.innerHTML = '<div class="muted">Searching…</div>';
  let res = [];
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=en&q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(r.status); res = (await r.json()).map(x => ({ lat: x.lat, lng: x.lon, name: x.display_name }));
  } catch (e) {
    try { const r = await fetch('https://photon.komoot.io/api/?limit=6&q=' + encodeURIComponent(q)); const j = await r.json(); res = j.features.map(f => ({ lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: [f.properties.name, f.properties.city, f.properties.country].filter(Boolean).join(', ') })); }
    catch (e2) { out.innerHTML = '<div class="neg">Search failed (offline?). Using default.</div>'; return; }
  }
  window._cityRes = res;
  out.innerHTML = res.map((x, i) => `<div class="cityopt" onclick="setStartPos(_cityRes[${i}].lat,_cityRes[${i}].lng,_cityRes[${i}].name.split(',').slice(0,2).join(','));$('#cityResults').innerHTML=''">${esc(x.name)}</div>`).join('') || '<div class="muted">No results.</div>';
}
function useGeo() {
  if (!window.isSecureContext) { $('#startpos').innerHTML = '<span class="warn">📍 Location needs a secure (https://) page — on iPhone open the hosted https version. For now, search your city instead.</span>'; $('#citySearch').focus(); return; }
  if (!navigator.geolocation) return toast('Geolocation not available.');
  $('#startpos').textContent = 'Locating…';
  navigator.geolocation.getCurrentPosition(p => setStartPos(p.coords.latitude, p.coords.longitude, 'Your location'), e => {
    setStartPos(START_POS.lat, START_POS.lng, START_POS.name);
    const msg = e.code === 1 ? 'Location permission denied. On iPhone: Settings › Privacy & Security › Location Services › Safari Websites → While Using. Or search your city.' : 'Could not get your location (timeout). Try again or search your city.';
    $('#startpos').innerHTML += '<br><span class="warn">' + msg + '</span>';
  }, { timeout: 12000, maximumAge: 600000, enableHighAccuracy: false });
}
function startNew() {
  const name = $('#pname').value.trim() || 'Stalker';
  newGame(name, START_POS.lat, START_POS.lng, START_POS.name);
  bootGame(); showHelpFirst();
}
function showHelpFirst() { setTimeout(showHelp, 300); }
function bootGame() {
  $('#start').style.display = 'none'; $('#game').style.display = 'flex';
  closeModal(); closeSheet();
  initMap(); genZonesAround(G.p.lat, G.p.lng); revealNear(); renderWorld(); setTab(TAB, true); if (isMobile()) closeSheet(); renderAll();
  setTimeout(() => map.invalidateSize(), 50);
  ensurePOIs();
}
window.addEventListener('load', () => {
  if (typeof L === 'undefined') { document.body.innerHTML = '<div style="color:#5dff6a;padding:30px;font-family:monospace">Failed to load Leaflet from the CDN. Check your internet connection and reload.</div>'; return; }
  setStartPos(START_POS.lat, START_POS.lng, START_POS.name);
  $('#citySearch').addEventListener('keydown', e => { if (e.key === 'Enter') searchCity(); });
  showStart();
});
window.addEventListener('beforeunload', () => saveGame(true));
// iOS doesn't reliably fire beforeunload: save when the app is backgrounded
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveGame(true); });
window.addEventListener('pagehide', () => saveGame(true));
// block pinch-zoom of the whole page on iOS (map still pinch-zooms itself)
['gesturestart', 'gesturechange'].forEach(ev => document.addEventListener(ev, e => { if (!e.target.closest || !e.target.closest('#map')) e.preventDefault(); }, { passive: false }));
let _rsz = null;
function onResize() { clearTimeout(_rsz); _rsz = setTimeout(() => { if (map) map.invalidateSize(); if (!isMobile()) closeSheet(); }, 120); }
window.addEventListener('resize', onResize); window.addEventListener('orientationchange', onResize);
// PWA: service worker only over http(s) (never on file:// or in the single-file build)
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.WL_SINGLE) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW registration failed', e)));
}
