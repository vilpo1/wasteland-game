const { chromium } = require('playwright');
const MODE = process.argv[2] || 'fallback';
const URL = process.argv[3] || 'http://localhost:8765/index.html';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  await page.route(/overpass/, async route => {
    if (MODE === 'fixture') {
      const els = [];
      const types = [['amenity','pharmacy'],['amenity','hospital'],['amenity','fuel'],['amenity','police'],['shop','supermarket'],['amenity','school'],['shop','hardware'],['amenity','place_of_worship'],['railway','station'],['military','barracks'],['landuse','industrial'],['amenity','bank'],['amenity','cafe'],['shop','car_repair']];
      for (let i = 0; i < 120; i++) { const t = types[i % types.length]; const tags = { [t[0]]: t[1] }; if (i % 3) tags.name = `Test ${t[1]} ${i}`; const lat = 59.437 + (Math.random() - .5) * .03, lon = 24.7536 + (Math.random() - .5) * .06; els.push(i % 5 ? { type: 'node', id: 1000 + i, lat, lon, tags } : { type: 'way', id: 5000 + i, center: { lat, lon }, tags }); }
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ elements: els }) });
    } else await route.abort();
  });
  const step = async (name, fn) => { try { await fn(); console.log('OK  ', name); } catch (e) { console.log('FAIL', name, e.message); errors.push(name + ': ' + e.message); } };
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await step('start screen', async () => { await page.waitForSelector('#newBtn', { state: 'visible', timeout: 10000 }); });
  await step('new game Tallinn', async () => { await page.click('#newBtn'); await page.waitForSelector('#map .leaflet-tile-loaded', { timeout: 20000 }); });
  await page.waitForTimeout(800);
  await page.evaluate(() => closeModal());
  await step('POIs appear', async () => { await page.waitForFunction(() => !scanning && document.querySelectorAll('.loc-icon').length > 10, null, { timeout: 30000 }); const n = await page.evaluate(() => ({ markers: document.querySelectorAll('.loc-icon').length, locs: Object.keys(G.locs).length, real: Object.values(G.locs).filter(l => l.real).length, settle: Object.values(G.locs).filter(l => l.settle).length, zones: G.zones.length })); console.log('     ', JSON.stringify(n)); });
  await page.screenshot({ path: '/workspace/wasteland-game/screenshots/01-start-' + MODE + '.png' });
  // resolve whatever modal is open
  const resolveModals = async () => {
    for (let k = 0; k < 40; k++) {
      const st = await page.evaluate(() => ({ combat: !!G.combat, modal: $('#modal').classList.contains('show'), dead: G.dead, travel: !!G.travel, loot: !!LOOT }));
      if (st.dead) return 'dead';
      if (st.combat) { await page.evaluate(() => { G.p.hp = Math.max(G.p.hp, 60); playerAttack(false); }); continue; }
      if (st.loot) { await page.evaluate(() => takeLoot(-1)); continue; }
      if (st.modal) { const b = await page.$('#modalbox .btn'); if (b) await b.click(); else await page.evaluate(() => closeModal()); continue; }
      if (st.travel) { await page.waitForTimeout(300); continue; }
      return 'clear';
    }
    return 'stuck';
  };
  await step('travel via map click + popup', async () => {
    const box = await page.$eval('#map', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2 + 180, y: r.y + r.height / 2 - 120 }; });
    await page.mouse.click(box.x, box.y);
    await page.waitForSelector('.term-pop .btn', { timeout: 5000 });
    const before = await page.evaluate(() => G.time);
    await page.click('.term-pop .btn');
    await page.waitForTimeout(500);
    let r; for (let k = 0; k < 10; k++) { r = await resolveModals(); const tr = await page.evaluate(() => !!G.travel); if (!tr && r !== 'stuck') break; await page.waitForTimeout(500); }
    const after = await page.evaluate(() => ({ t: G.time, km: G.stats.km, log: G.log.slice(0, 6).map(l => l.msg) }));
    if (after.t <= before) throw new Error('time did not pass');
    console.log('      travelled', after.km.toFixed(2), 'km;', r, after.log.join(' | '));
  });
  await step('travel to location & search', async () => {
    const id = await page.evaluate(() => { const l = Object.values(G.locs).filter(l => l.id !== 'home' && !l.settle).sort((a, b) => dist(G.p.lat, G.p.lng, a.lat, a.lng) - dist(G.p.lat, G.p.lng, b.lat, b.lng))[0]; startTravel(l.lat, l.lng, l.id); return l.id; });
    for (let k = 0; k < 30; k++) { await page.waitForTimeout(400); const r = await resolveModals(); const st = await page.evaluate(() => ({ at: G.p.at, tr: !!G.travel })); if (!st.tr && r === 'clear') { if (st.at !== id) { await page.evaluate(i => { const l = G.locs[i]; startTravel(l.lat, l.lng, i); }, id); } else break; } }
    await page.evaluate(() => { G.p.hp = 100; searchLoc(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/workspace/wasteland-game/screenshots/02-search-' + MODE + '.png' });
    const r = await resolveModals();
    const inv = await page.evaluate(() => ({ at: G.p.at && G.locs[G.p.at].name, n: G.p.inv.length, searched: G.stats.searched }));
    console.log('     ', JSON.stringify(inv), r);
    if (!inv.searched) throw new Error('search did not happen');
  });
  await step('inventory/item gen sanity', async () => {
    const out = await page.evaluate(() => { const names = new Set(); for (let i = 0; i < 3000; i++) { const b = pick(itemsByTag('weapon')); const it = makeItem(b.id, { luck: 30 }); names.add(itemName(it)); itemDesc(it); } for (let i = 0; i < 300; i++) { const a = makeItem(pick(itemsByTag('artifact')).id, { luck: 40 }); itemDesc(a); } ['pharmacy','military','police','fuel','industrial','supermarket','bank','school'].forEach(t => genLoot(t, 3)); return names.size; });
    console.log('      unique weapon names from 3000 rolls:', out);
    await page.evaluate(() => { setTab('inv'); OPEN_ITEM = G.p.inv[0].uid; renderTab(); });
  });
  await step('crafting', async () => {
    await page.evaluate(() => { giveItem('cloth', 4); setTab('craft'); });
    const before = await page.evaluate(() => countItem('bandage'));
    await page.evaluate(() => craft('r_bandage'));
    const after = await page.evaluate(() => countItem('bandage'));
    if (after <= before) throw new Error('craft failed');
    await page.evaluate(() => { giveItem('radio', 2); scrapAllJunk(); });
  });
  await step('combat', async () => {
    await page.evaluate(() => { closeModal(); startCombat(makeGroup(2)); });
    await page.waitForSelector('#modal.combat', { timeout: 3000 });
    await page.screenshot({ path: '/workspace/wasteland-game/screenshots/03-combat-' + MODE + '.png' });
    await page.evaluate(() => { const g = giveItem('grenade', 1); combatUse(g.uid); });
    const r = await resolveModals(); console.log('      after combat:', r, await page.evaluate(() => G.log.slice(0, 3).map(l => l.msg).join(' | ')));
  });
  await step('trade & quests at home', async () => {
    await page.evaluate(() => { G.p.at = 'home'; G.p.lat = G.locs.home.lat; G.p.lng = G.locs.home.lng; openTrade(G.locs.home); });
    await page.waitForSelector('#modal.wide', { timeout: 3000 });
    await page.evaluate(() => { G.p.caps = 500; tradeBuy(0); tradeSell(G.p.inv.find(i => !isEquipped(i)).uid); closeModal(); openSettlementQuests('home'); });
    const q = await page.evaluate(() => { const s = G.locs.home.settle; const n = s.quests.length; for (let i = 0; i < n; i++) acceptQuest('home', 0); return { offered: n, active: G.quests.length, titles: G.quests.map(q => q.title) }; });
    console.log('     ', JSON.stringify(q));
    await page.evaluate(() => { closeModal(); setTab('quests'); });
    await page.screenshot({ path: '/workspace/wasteland-game/screenshots/04-quests-' + MODE + '.png' });
  });
  await step('level up & perk', async () => {
    await page.evaluate(() => { gainXP(500); renderAll(); });
    await page.waitForSelector('.btn.perk', { timeout: 3000 });
    await page.click('.btn.perk');
    await page.evaluate(() => { closeModal(); while (G.p.pendingPerks > 0) takePerk(perkOffers()[0][0]); raiseSkill('crafting'); setTab('skills'); setTab('char'); setTab('log'); setTab('menu'); setTab('inv'); });
  });
  await step('anomaly hunt + rest + camp', async () => {
    await page.evaluate(() => { const z = G.zones.find(z => z.type === 'anomaly') || (G.zones.push({ id: 'zt', type: 'anomaly', lat: G.p.lat, lng: G.p.lng, r: 300, int: 1, name: 'Test' }), G.zones[G.zones.length - 1]); G.p.lat = z.lat; G.p.lng = z.lng; G.p.at = null; G.p.hp = 100; huntArtifacts(); });
    await resolveModals();
    await page.evaluate(() => { giveItem('wood', 2); giveItem('matches', 1); makeCamp(); G.p.hp = 100; rest(2); });
    await resolveModals();
  });
  await step('save + reload + continue', async () => {
    await page.evaluate(() => { G.p.hp = 100; saveGame(); });
    const lvl = await page.evaluate(() => G.p.level);
    await page.reload(); await page.waitForSelector('#continueBtn', { state: 'visible' }); await page.click('#continueBtn');
    await page.waitForSelector('#map .leaflet-tile-loaded', { timeout: 20000 });
    const l2 = await page.evaluate(() => G.p.level); if (l2 !== lvl) throw new Error('level mismatch');
  });
  await step('long random play (bot)', async () => {
    for (let k = 0; k < 6; k++) {
      await page.evaluate(() => { G.p.hp = 100; G.p.food = 80; G.p.water = 80; G.p.rad = 0; const ls = Object.values(G.locs); const l = pick(ls); startTravel(l.lat, l.lng, l.id); });
      for (let j = 0; j < 40; j++) { await page.waitForTimeout(250); const r = await resolveModals(); if (r === 'dead') { await page.evaluate(() => { loadGame(); bootGame(); }); break; } if (r === 'clear' && !(await page.evaluate(() => !!G.travel))) break; }
      await page.evaluate(() => { if (G.p.at) { G.p.hp = 100; searchLoc(); } });
      await resolveModals();
    }
    console.log('     ', await page.evaluate(() => JSON.stringify(G.stats)));
  });
  await page.evaluate(() => { closeModal(); map.setView([G.p.lat, G.p.lng], 15); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/workspace/wasteland-game/screenshots/05-map-' + MODE + '.png' });
  console.log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
  await browser.close();
})();
