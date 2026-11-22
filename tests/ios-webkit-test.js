const { webkit, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8765/';
const SHOT = '/workspace/wasteland-game/screenshots/ios-';
(async () => {
  const browser = await webkit.launch();
  const errors = [];
  for (const orient of ['portrait', 'landscape']) {
    const dev = orient === 'portrait' ? devices['iPhone 14'] : devices['iPhone 14 landscape'];
    const ctx = await browser.newContext({ ...dev, serviceWorkers: 'block' }); // SW would hide requests from page.route
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/overpass|ERR_FAILED|Failed to load resource/i.test(m.text())) errors.push(`[${orient}] console: ${m.text()}`); });
    page.on('pageerror', e => errors.push(`[${orient}] pageerror: ${e.message}`));
    await page.route(/overpass/, async route => {
      const els = []; const types = [['amenity','pharmacy'],['amenity','hospital'],['amenity','fuel'],['amenity','police'],['shop','supermarket'],['amenity','school'],['shop','hardware'],['amenity','place_of_worship'],['railway','station'],['military','barracks'],['landuse','industrial'],['amenity','bank']];
      const names = ['Apteek', 'Keskhaigla', 'Circle K', 'Politsei', 'Rimi', 'Gümnaasium', 'Bauhof', 'Kirik', 'Balti jaam', 'Kasarm', 'Tööstuspark', 'Pank'];
      for (let i = 0; i < 100; i++) { const t = types[i % types.length]; els.push({ type: 'node', id: 900 + i, lat: 59.437 + (Math.random() - .5) * .03, lon: 24.7536 + (Math.random() - .5) * .06, tags: { [t[0]]: t[1], name: names[i % names.length] + ' ' + i } }); }
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ elements: els }) });
    });
    const step = async (name, fn) => { try { await fn(); console.log(`OK   [${orient}] ${name}`); } catch (e) { console.log(`FAIL [${orient}] ${name}: ${e.message.split('\n').filter(l => /intercept|waiting for|not visible|outside|Error/.test(l)).slice(-4).join(' | ')}`); await page.screenshot({ path: '/tmp/fail-' + orient + '-' + name.replace(/\W+/g, '_') + '.png' }); errors.push(`[${orient}] ${name}: ${e.message.split('\n')[0]}`); } };
    const overflow = async (where) => {
      const o = await page.evaluate(() => { const w = window.innerWidth; const bad = []; if (document.documentElement.scrollWidth > w + 1) bad.push('html ' + document.documentElement.scrollWidth); ['#game', '#hud', '#tabs', '#tabbody', '#locpanel', '#modalbox', '#start', '.startbox'].forEach(s => { const e = document.querySelector(s); if (e && e.offsetParent !== null) { const r = e.getBoundingClientRect(); if (r.right > w + 1 || r.left < -1) bad.push(s + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); if (e.scrollWidth > e.clientWidth + 2 && s !== '#game') bad.push(s + ' inner ' + e.scrollWidth + '>' + e.clientWidth); } }); return { w, bad }; });
      if (o.bad.length) throw new Error(`horizontal overflow at ${where} (w=${o.w}): ${o.bad.join(', ')}`);
    };
    const tap = async sel => { await page.locator(sel).first().tap({ timeout: 6000 }); await page.waitForTimeout(250); };
    await page.goto(BASE + 'index.html');
    await page.evaluate(() => localStorage.clear()); await page.reload();
    await step('start screen + no overflow', async () => {
      await page.waitForSelector('#newBtn', { state: 'visible' });
      const info = await page.evaluate(() => ({ coarse: matchMedia('(pointer: coarse)').matches, mobile: isMobile(), secure: isSecureContext, inputFont: getComputedStyle($('#citySearch')).fontSize, vw: innerWidth, vh: innerHeight }));
      console.log('     ', JSON.stringify(info));
      if (parseFloat(info.inputFont) < 16) throw new Error('input font < 16px');
      await overflow('start'); await page.screenshot({ path: SHOT + orient + '-1-start.png' });
    });
    await step('geolocation button handled', async () => { await tap('#geoBtn'); await page.waitForTimeout(800); });
    await step('tap NEW GAME (Tallinn) + map tiles', async () => {
      await page.evaluate(() => setStartPos(59.4370, 24.7536, 'Tallinn, Estonia'));
      await tap('#newBtn'); await page.waitForSelector('#map .leaflet-tile-loaded', { timeout: 20000 });
      await page.waitForFunction(() => !scanning && document.querySelectorAll('.loc-icon').length > 10, null, { timeout: 30000 });
      await page.waitForTimeout(500);
      await tap('#modalbox .btn'); // close help
      await overflow('game');
      await page.waitForTimeout(800);
      await page.screenshot({ path: SHOT + orient + '-2-map.png' });
    });
    await step('tap map -> popup -> tap Travel here', async () => {
      const r = await page.$eval('#map', e => { const b = e.getBoundingClientRect(); return { x: b.x + b.width * 0.3, y: b.y + b.height * 0.4 }; });
      await page.touchscreen.tap(r.x, r.y);
      await page.waitForSelector('.term-pop .btn', { timeout: 5000 });
      await page.waitForTimeout(600); await page.screenshot({ path: SHOT + orient + '-3-popup.png' });
      const t0 = await page.evaluate(() => G.time);
      await tap('.term-pop .btn');
      await page.waitForFunction(() => !G.travel, null, { timeout: 20000 });
      // resolve encounter if any
      for (let k = 0; k < 20; k++) { const st = await page.evaluate(() => ({ c: !!G.combat, m: $('#modal').classList.contains('show'), l: !!LOOT })); if (st.c) { await page.evaluate(() => { G.p.hp = 100; playerAttack(false); }); continue; } if (st.l) { await tap('#modalbox .btn.hot'); continue; } if (st.m) { await tap('#modalbox .btn'); continue; } break; }
      const t1 = await page.evaluate(() => G.time); if (t1 <= t0) throw new Error('no travel happened');
    });
    await step('tap marker -> travel to location -> search', async () => {
      await page.evaluate(() => { const l = Object.values(G.locs).filter(l => l.real && !l.settle).sort((a, b) => dist(G.p.lat, G.p.lng, a.lat, a.lng) - dist(G.p.lat, G.p.lng, b.lat, b.lng))[0]; window._tl = l.id; map.setView([l.lat, l.lng], 16, { animate: false }); });
      await page.waitForTimeout(400);
      const pos = await page.evaluate(() => { const l = G.locs[_tl]; const p = map.latLngToContainerPoint([l.lat, l.lng]); const b = $('#map').getBoundingClientRect(); return { x: b.x + p.x, y: b.y + p.y }; });
      await page.touchscreen.tap(pos.x, pos.y);
      await page.waitForSelector('.term-pop .btn', { timeout: 5000 });
      await tap('.term-pop .btn');
      for (let k = 0; k < 30; k++) { await page.waitForTimeout(300); const st = await page.evaluate(() => ({ tr: !!G.travel, c: !!G.combat, m: $('#modal').classList.contains('show'), l: !!LOOT, at: G.p.at })); if (st.c) { await page.evaluate(() => { G.p.hp = 100; playerAttack(false); }); continue; } if (st.l) { await tap('#modalbox .btn.hot'); continue; } if (st.m) { await tap('#modalbox .btn'); continue; } if (!st.tr && st.at !== _tl_dummy()) break; }
    }).catch(() => {});
    await step('search via location panel', async () => {
      await page.evaluate(() => { if (!G.p.at) { const l = G.locs[_tl]; G.p.lat = l.lat; G.p.lng = l.lng; G.p.at = l.id; renderAll(); } G.p.hp = 100; });
      await page.evaluate(() => { const b = [...document.querySelectorAll('#locpanel .btn')].find(b => /Search/.test(b.textContent)); if (b && b.disabled) G.locs[G.p.at].searches = 3, renderAll(); });
      await page.locator('#locpanel .btn', { hasText: 'Search' }).tap();
      await page.waitForTimeout(400);
      if (await page.evaluate(() => !!G.combat)) { await page.screenshot({ path: SHOT + orient + '-5-combat.png' }); for (let k = 0; k < 30 && await page.evaluate(() => !!G.combat); k++) { await page.evaluate(() => G.p.hp = 100); await tap('#modalbox .btn.hot'); } }
      await page.waitForSelector('#modal.loot', { timeout: 5000 });
      await overflow('loot modal');
      await page.screenshot({ path: SHOT + orient + '-4-loot.png' });
      for (let k = 0; k < 10; k++) { const st = await page.evaluate(() => ({ c: !!G.combat, l: !!LOOT, m: $('#modal').classList.contains('show') })); if (st.c) { await page.evaluate(() => { G.p.hp = 100; playerAttack(false); }); continue; } if (st.l) { await tap('#modalbox .btn.hot'); continue; } if (st.m) { await tap('#modalbox .btn'); continue; } break; }
      if (await page.evaluate(() => G.stats.searched) < 1) throw new Error('no search');
    });
    await step('open every panel via bottom tabs', async () => {
      for (const t of ['inv', 'craft', 'char', 'skills', 'quests', 'log', 'menu']) {
        await tap(`#tabs button[data-t="${t}"]`);
        const vis = await page.evaluate(() => getComputedStyle($('#tabbody')).display !== 'none' && $('#tabbody').getBoundingClientRect().height > 100);
        if (!vis) throw new Error('panel not visible: ' + t);
        await overflow('tab ' + t);
        if (t === 'inv') { await tap('#tabbody .irow .ihead'); await page.screenshot({ path: SHOT + orient + '-6-inventory.png' }); }
        if (t === 'craft') await page.screenshot({ path: SHOT + orient + '-7-craft.png' });
      }
      await tap('#tabs button[data-t="map"]');
      const hidden = await page.evaluate(() => getComputedStyle($('#tabbody')).display === 'none'); if (!hidden) throw new Error('map tab did not close sheet');
    });
    await step('craft by tap', async () => {
      await page.evaluate(() => giveItem('cloth', 4));
      await tap('#tabs button[data-t="craft"]');
      const before = await page.evaluate(() => countItem('bandage'));
      await page.locator('#tabbody .irow', { hasText: 'Bandage x2' }).locator('.btn').tap();
      await page.waitForTimeout(300);
      if (await page.evaluate(() => countItem('bandage')) <= before) throw new Error('craft failed');
      await tap('#tabs button[data-t="map"]');
    });
    await step('combat by tap', async () => {
      await page.evaluate(() => startCombat(makeGroup(2)));
      await page.waitForSelector('#modal.combat');
      await overflow('combat');
      await page.screenshot({ path: SHOT + orient + '-5-combat.png' });
      for (let k = 0; k < 40 && await page.evaluate(() => !!G.combat); k++) { await page.evaluate(() => G.p.hp = 100); await tap('#modalbox .btn.hot'); }
      if (await page.evaluate(() => !!G.combat)) throw new Error('combat did not end');
      if (await page.evaluate(() => !!LOOT)) await tap('#modalbox .btn.hot');
    });
    await step('trade + quests modals scroll', async () => {
      await page.evaluate(() => { const h = G.locs.home; G.p.at = 'home'; G.p.lat = h.lat; G.p.lng = h.lng; renderAll(); openTrade(h); });
      await page.waitForSelector('#modal.wide');
      const sc = await page.evaluate(() => { const m = $('#modalbox'); return { sh: m.scrollHeight, ch: m.clientHeight, oy: getComputedStyle(m).overflowY, fits: m.getBoundingClientRect().bottom <= innerHeight + 1 }; });
      if (!sc.fits || (sc.sh > sc.ch && sc.oy !== 'auto')) throw new Error('modal not scrollable/fitting ' + JSON.stringify(sc));
      await overflow('trade'); await page.screenshot({ path: SHOT + orient + '-8-trade.png' });
      await page.locator('#modalbox .btn', { hasText: 'Done' }).tap();
      await page.evaluate(() => openSettlementQuests('home')); await overflow('quests'); await tap('#modalbox .irow .btn');
      await page.evaluate(() => closeModal());
    });
    await ctx.close();
  }
  // PWA check in a separate context with service workers allowed
  { const ctx = await browser.newContext({ ...devices['iPhone 14'] }); const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('[pwa] pageerror: ' + e.message));
    try {
      await page.goto(BASE + 'index.html');
      const r = await page.evaluate(async () => { const m = await fetch('manifest.json').then(r => r.json()); const reg = await Promise.race([navigator.serviceWorker.ready.then(() => 'ready'), new Promise(r => setTimeout(() => r('timeout'), 10000))]); return { manifest: m.short_name, display: m.display, icons: m.icons.length, sw: reg, apple: !!document.querySelector('link[rel=apple-touch-icon]'), capable: document.querySelector('meta[name=apple-mobile-web-app-capable]').content }; });
      await page.waitForTimeout(1500);
      const cached = await page.evaluate(async () => { const ks = await caches.keys(); let n = 0; for (const k of ks) n += (await (await caches.open(k)).keys()).length; return { ks, n }; });
      await ctx.setOffline(true); await page.reload(); const off = await page.locator('#newBtn').isVisible();
      console.log('OK   [pwa]', JSON.stringify({ ...r, cached, offlineShellLoads: off }));
      if (r.sw !== 'ready' || !off) errors.push('[pwa] sw not ready or offline shell failed');
    } catch (e) { errors.push('[pwa] ' + e.message); console.log('FAIL [pwa]', e.message); }
    await ctx.close(); }
  await browser.close();
  console.log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
})();
function _tl_dummy() { return null; }
