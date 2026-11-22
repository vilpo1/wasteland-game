/* ===== WASTELAND: ZONE OF REAL WORLD — static game data ===== */
'use strict';
const D = {};

D.RARITY = [
  { id: 0, name: 'Common',    color: '#b8c4b0', mult: 1.00, affixes: 0, w: 60 },
  { id: 1, name: 'Uncommon',  color: '#5dff6a', mult: 1.12, affixes: 1, w: 25 },
  { id: 2, name: 'Rare',      color: '#4fb3ff', mult: 1.25, affixes: 2, w: 10 },
  { id: 3, name: 'Epic',      color: '#c77dff', mult: 1.45, affixes: 3, w: 4 },
  { id: 4, name: 'Legendary', color: '#ffa630', mult: 1.75, affixes: 4, w: 1 },
];

/* ---- Components (stackable crafting materials) ---- */
D.COMP = {
  scrap: ['Scrap Metal', 0.5, 3], cloth: ['Cloth', 0.2, 2], electronics: ['Electronics', 0.3, 8], chemicals: ['Chemicals', 0.3, 7],
  wood: ['Wood', 0.8, 1], tape: ['Duct Tape', 0.1, 6], glue: ['Glue', 0.2, 6], screws: ['Screws', 0.1, 3],
  gunpowder: ['Gunpowder', 0.1, 6], plastic: ['Plastic', 0.2, 2], leather: ['Leather', 0.4, 5], glass: ['Glass', 0.3, 2],
  springs: ['Springs', 0.1, 4], circuit: ['Circuit Board', 0.2, 14], fuel: ['Fuel', 1.0, 8], hide: ['Mutant Hide', 0.8, 9],
  lead: ['Lead', 0.8, 6], copper: ['Copper Wire', 0.2, 5], herbs: ['Zone Herbs', 0.1, 4], fiber: ['Fiberglass', 0.3, 7],
};

/* ---- Base items. cat: melee ranged armor food drink med chem ammo junk comp tool artifact schematic book quest ---- */
D.ITEMS = {};
function defItem(id, o) { o.id = id; D.ITEMS[id] = o; }
for (const k in D.COMP) { const c = D.COMP[k]; defItem(k, { name: c[0], cat: 'comp', w: c[1], v: c[2], tags: ['comp'], stack: true }); }
// tag hints per component (for loot tables)
['electronics','circuit','copper'].forEach(k => D.ITEMS[k].tags.push('elec'));
['chemicals','fuel','gunpowder'].forEach(k => D.ITEMS[k].tags.push('chem'));
['cloth','leather'].forEach(k => D.ITEMS[k].tags.push('cloth'));
['scrap','screws','springs','tape','glue','lead','wood','fiber','plastic','glass'].forEach(k => D.ITEMS[k].tags.push('hard'));
D.ITEMS.herbs.tags.push('nature'); D.ITEMS.hide.tags.push('mutant'); D.ITEMS.wood.tags.push('nature');

// Junk: scrap -> components
const J = (id, name, w, v, scrap, tags) => defItem(id, { name, cat: 'junk', w, v, scrap, tags: ['junk', ...(tags || [])], stack: true });
J('radio', 'Broken Radio', 1.5, 6, { electronics: 2, screws: 1 }, ['elec']);
J('tincan', 'Tin Can', 0.2, 1, { scrap: 1 });
J('toaster', 'Old Toaster', 2, 5, { scrap: 2, springs: 1, copper: 1 }, ['home']);
J('fan', 'Desk Fan', 2, 5, { copper: 1, screws: 1, plastic: 1 }, ['home']);
J('phone', 'Cracked Smartphone', 0.3, 9, { circuit: 1, glass: 1, electronics: 1 }, ['elec']);
J('teddy', 'Teddy Bear', 0.4, 2, { cloth: 2 }, ['home']);
J('bottle', 'Empty Bottle', 0.4, 1, { glass: 1 }, ['home', 'food']);
J('carbatt', 'Car Battery', 6, 12, { lead: 2, chemicals: 1, copper: 1 }, ['car']);
J('typewriter', 'Typewriter', 5, 8, { springs: 2, screws: 2, scrap: 1 }, ['office']);
J('clock', 'Pre-War Clock', 1, 6, { springs: 1, glass: 1, screws: 1 }, ['home']);
J('wrench', 'Rusty Wrench', 1.5, 4, { scrap: 2 }, ['tools']);
J('rope', 'Frayed Rope', 0.5, 2, { cloth: 1 });
J('plank', 'Plank', 2, 1, { wood: 2 }, ['nature']);
J('pipe', 'Steel Pipe', 2, 3, { scrap: 2 }, ['tools']);
J('extinguisher', 'Fire Extinguisher', 4, 6, { scrap: 2, chemicals: 1 }, ['tools']);
J('filter', 'Gas Mask Filter', 0.3, 7, { chemicals: 1, cloth: 1 }, ['mil']);
J('bulb', 'Light Bulb', 0.1, 2, { glass: 1, copper: 1 }, ['home', 'elec']);
J('toycar', 'Toy Car', 0.3, 2, { plastic: 1, screws: 1 }, ['home']);
J('laptop', 'Dead Laptop', 2.5, 18, { circuit: 2, electronics: 2, plastic: 1 }, ['elec', 'office']);
J('microscope', 'Microscope', 3, 15, { glass: 2, screws: 1, scrap: 1 }, ['med', 'science']);
J('sparkplug', 'Spark Plugs', 0.3, 4, { copper: 1, scrap: 1 }, ['car']);
J('tire', 'Old Tire', 7, 2, { plastic: 2 }, ['car']);
J('hubcap', 'Hubcap', 1, 2, { scrap: 2 }, ['car']);
J('syringe', 'Used Syringes', 0.1, 2, { plastic: 1, glass: 1 }, ['med']);
J('textbook', 'Water-Damaged Textbook', 1, 1, { cloth: 1 }, ['office']);
J('stapler', 'Stapler', 0.4, 2, { springs: 1, scrap: 1 }, ['office']);
J('fishtank', 'Cracked Fish Tank', 4, 2, { glass: 3 }, ['home']);
J('drill', 'Broken Power Drill', 2, 10, { electronics: 1, copper: 1, scrap: 1, screws: 1 }, ['tools']);
J('tvset', 'CRT Television', 9, 9, { electronics: 2, glass: 2, circuit: 1, lead: 1 }, ['elec', 'home']);
J('flare', 'Burnt Flare', 0.2, 1, { gunpowder: 1 }, ['mil']);
J('casing', 'Brass Casings', 0.2, 3, { scrap: 1, gunpowder: 1 }, ['mil']);
J('bones', 'Bones', 1, 1, { glue: 1 }, ['mutant']);
J('fertilizer', 'Bag of Fertilizer', 3, 4, { chemicals: 2 }, ['nature', 'chem']);
J('detergent', 'Detergent', 1, 4, { chemicals: 1, plastic: 1 }, ['home', 'chem']);
J('jacket_old', 'Moth-eaten Coat', 1.5, 2, { cloth: 3 }, ['cloth']);
// Valuables
const V = (id, name, w, v, scrap) => defItem(id, { name, cat: 'junk', w, v, scrap, tags: ['junk', 'valuable'], stack: true });
V('goldwatch', 'Gold Watch', 0.2, 60, { springs: 1, copper: 1 });
V('ring', 'Wedding Ring', 0.05, 45, { copper: 1 });
V('cash', 'Bundle of Pre-War Cash', 0.1, 15, { cloth: 1 });
V('silverware', 'Silverware Set', 1, 30, { scrap: 2 });
V('jewelbox', 'Jewelry Box', 0.8, 75, { wood: 1, copper: 1 });
V('icon', 'Gilded Icon', 0.6, 55, { wood: 1 });
V('goldbar', 'Gold Bar', 1, 250, { lead: 1 });

// Food & drink: hunger/thirst restore, rad, hp, fatigue
const F = (id, name, cat, w, v, eff, tags) => defItem(id, { name, cat, w, v, eff, tags: [cat, ...(tags || [])], stack: true });
F('beans', 'Canned Beans', 'food', 0.5, 6, { food: 25, rad: 1 });
F('tourist', "Tourist's Breakfast", 'food', 0.4, 8, { food: 30 });
F('bread', 'Stale Bread', 'food', 0.3, 3, { food: 15 });
F('noodles', 'Instant Noodles', 'food', 0.2, 4, { food: 20, water: -5 });
F('mre', 'Military MRE', 'food', 0.7, 18, { food: 45, hp: 5 }, ['mil']);
F('choco', 'Chocolate Bar', 'food', 0.1, 5, { food: 10, fatigue: -5 });
F('rawmeat', 'Raw Mutant Meat', 'food', 0.6, 3, { food: 15, rad: 8, hp: -3 }, ['mutant']);
F('steak', 'Mutant Steak', 'food', 0.5, 12, { food: 35, rad: 2, hp: 5 });
F('jerky', 'Mutant Jerky', 'food', 0.2, 10, { food: 25, water: -5 });
F('sausage', 'Smoked Sausage', 'food', 0.3, 9, { food: 22 });
F('apples', 'Wrinkled Apples', 'food', 0.3, 3, { food: 10, water: 5, rad: 1 }, ['nature']);
F('soup', 'Zone Herb Stew', 'food', 0.6, 16, { food: 40, water: 10, hp: 10 });
F('crisps', 'Pre-War Crisps', 'food', 0.1, 4, { food: 12, water: -3 });
F('honey', 'Jar of Honey', 'food', 0.5, 14, { food: 20, hp: 8 });
F('water', 'Clean Water', 'drink', 0.5, 6, { water: 35 });
F('dirtywater', 'Dirty Water', 'drink', 0.5, 1, { water: 25, rad: 6 });
F('purewater', 'Boiled Water', 'drink', 0.5, 5, { water: 30 });
F('cola', 'Fizz Cola', 'drink', 0.4, 7, { water: 20, food: 5 });
F('energy', 'Non-Stop Energy Drink', 'drink', 0.3, 10, { water: 10, fatigue: -25 });
F('vodka', 'Cossack Vodka', 'drink', 0.6, 12, { water: 5, rad: -15, fatigue: 10 });
F('tea', 'Herbal Tea', 'drink', 0.4, 9, { water: 30, fatigue: -10, hp: 5 });
F('beer', 'Flat Beer', 'drink', 0.5, 4, { water: 15, fatigue: 5 });
F('juice', 'Boxed Juice', 'drink', 0.3, 5, { water: 22, food: 3 });
// Meds
F('bandage', 'Bandage', 'med', 0.1, 6, { hp: 15, bleed: true });
F('firstaid', 'First Aid Kit', 'med', 0.4, 20, { hp: 40, bleed: true });
F('armymed', 'Army Medkit', 'med', 0.5, 45, { hp: 70, bleed: true }, ['mil']);
F('stimpak', 'Stimpak', 'med', 0.1, 40, { hp: 50 });
F('antirad', 'Anti-Rad Pills', 'med', 0.1, 25, { rad: -40 });
F('radaway', 'RadAway', 'med', 0.3, 50, { rad: -75, water: -10 });
F('painkiller', 'Painkillers', 'med', 0.1, 12, { hp: 10, buff: ['armor', 10, 120] });
F('antibio', 'Antibiotics', 'med', 0.1, 18, { hp: 25 });
F('sciencemed', 'Scientific Medkit', 'med', 0.4, 60, { hp: 50, rad: -30, bleed: true }, ['science']);
// Chems (buffs)
F('jet', 'Jet Inhaler', 'chem', 0.1, 25, { buff: ['crit', 15, 180], fatigue: -15 });
F('buffout', 'Buffout', 'chem', 0.1, 25, { buff: ['dmg', 25, 180] });
F('radx', 'Rad-X', 'chem', 0.1, 20, { buff: ['radRes', 40, 360] });
F('psyblock', 'Psy-Block', 'chem', 0.1, 30, { buff: ['anomRes', 50, 360] });
F('mentats', 'Mentats', 'chem', 0.1, 30, { buff: ['acc', 15, 180] });
// Throwables (combat only)
F('grenade', 'RGD-5 Grenade', 'throw', 0.4, 30, { dmg: [30, 50] }, ['mil']);
F('molotov', 'Molotov Cocktail', 'throw', 0.6, 15, { dmg: [18, 30], burn: true });
F('pipebomb', 'Pipe Bomb', 'throw', 0.8, 22, { dmg: [25, 45] });

// Ammo
const A = (id, name, v) => defItem(id, { name, cat: 'ammo', w: 0.01, v, tags: ['ammo'], stack: true });
A('ammo9', '9mm Rounds', 1); A('ammo545', '5.45mm Rounds', 2); A('ammo762', '7.62mm Rounds', 3);
A('shells', '12ga Shells', 2); A('bolts', 'Crossbow Bolts', 1); A('cells', 'Energy Cells', 4);

// Melee weapons
const M = (id, name, dmg, acc, crit, w, v, dur, tags, extra) => defItem(id, Object.assign({ name, cat: 'melee', dmg, acc, crit, w, v, dur, tags: ['weapon', 'melee', ...(tags || [])] }, extra || {}));
M('knife', 'Kitchen Knife', [3, 6], 85, 8, 0.5, 8, 60, ['home']);
M('combatknife', 'Combat Knife', [5, 9], 88, 12, 0.6, 30, 120, ['mil']);
M('machete', 'Machete', [7, 12], 80, 8, 1.2, 35, 100, ['tools']);
M('crowbar', 'Crowbar', [6, 11], 78, 5, 2.2, 20, 150, ['tools']);
M('bat', 'Baseball Bat', [6, 10], 80, 5, 1.5, 15, 90, ['home']);
M('fireaxe', 'Fire Axe', [10, 17], 72, 10, 3, 45, 120, ['tools']);
M('sledge', 'Sledgehammer', [14, 22], 62, 6, 6, 55, 160, ['tools']);
M('leadpipe', 'Lead Pipe', [5, 9], 78, 4, 2, 10, 120, ['tools']);
M('spikedclub', 'Spiked Club', [7, 12], 76, 8, 2, 18, 70, []);
M('knuckles', 'Brass Knuckles', [4, 8], 92, 10, 0.3, 20, 200, []);
M('rebarspear', 'Rebar Spear', [8, 14], 74, 9, 2.5, 22, 80, []);
M('baton', 'Police Baton', [5, 9], 84, 5, 1, 18, 140, ['police']);
M('katana', 'Collector Katana', [12, 20], 82, 15, 1.8, 120, 120, ['valuable']);
M('shockbaton', 'Shock Baton', [9, 14], 84, 6, 1.4, 90, 100, ['police', 'elec'], { elem: 'shock' });
// Ranged
const R = (id, name, dmg, acc, crit, w, v, dur, ammo, tags, extra) => defItem(id, Object.assign({ name, cat: 'ranged', dmg, acc, crit, w, v, dur, ammo, tags: ['weapon', 'ranged', ...(tags || [])] }, extra || {}));
R('pipepistol', 'Pipe Pistol', [6, 10], 62, 5, 1.5, 20, 60, 'ammo9', []);
R('pm', 'PM Pistol', [8, 12], 74, 7, 1, 50, 140, 'ammo9', ['police', 'mil']);
R('revolver', 'Old Revolver', [10, 15], 70, 10, 1.3, 60, 120, 'ammo9', ['home']);
R('smg', 'Viper SMG', [12, 18], 66, 6, 2.5, 120, 120, 'ammo9', ['police', 'mil'], { burst: 2 });
R('sawedoff', 'Sawed-off Shotgun', [16, 26], 60, 6, 2.5, 70, 90, 'shells', ['home']);
R('pumpgun', 'Pump Shotgun', [18, 28], 68, 6, 3.5, 110, 130, 'shells', ['police']);
R('hunting', 'Hunting Rifle', [18, 26], 80, 15, 3.8, 130, 130, 'ammo762', ['nature']);
R('ak74', 'AK-74', [16, 24], 72, 8, 3.6, 200, 160, 'ammo545', ['mil'], { burst: 2 });
R('sks', 'SKS Carbine', [18, 25], 78, 10, 3.9, 160, 150, 'ammo762', ['mil']);
R('svd', 'SVD Sniper Rifle', [28, 40], 85, 22, 4.5, 380, 140, 'ammo762', ['mil']);
R('crossbow', 'Crossbow', [14, 20], 78, 14, 3, 80, 100, 'bolts', ['nature']);
R('laserpistol', 'Laser Pistol', [15, 22], 85, 10, 1.5, 260, 120, 'cells', ['science'], { elem: 'fire' });
R('gauss', 'Gauss Rifle', [45, 65], 88, 20, 6, 900, 160, 'cells', ['science'], { elem: 'shock' });
R('nailgun', 'Modified Nailgun', [8, 13], 70, 6, 2, 40, 80, 'bolts', ['tools']);

// Armor: armor, radRes, anomRes, stealth, carry
const AR = (id, name, armor, radRes, anomRes, w, v, dur, tags, extra) => defItem(id, Object.assign({ name, cat: 'armor', armor, radRes, anomRes, w, v, dur, tags: ['armor', ...(tags || [])] }, extra || {}));
AR('hoodie', 'Padded Hoodie', 3, 5, 0, 1.5, 10, 60, ['cloth', 'home']);
AR('leatherjkt', 'Leather Jacket', 6, 5, 0, 3, 30, 100, ['cloth']);
AR('scraparmor', 'Scrap Armor', 12, 5, 0, 9, 45, 140, []);
AR('policevest', 'Police Vest', 14, 0, 0, 4, 80, 140, ['police']);
AR('stalkersuit', 'Stalker Suit', 12, 20, 15, 5, 140, 150, ['mil']);
AR('military', 'Military Armor', 22, 15, 5, 9, 260, 200, ['mil']);
AR('hazmat', 'Hazmat Suit', 4, 60, 25, 4, 160, 80, ['science', 'med']);
AR('seva', 'SEVA Scientific Suit', 15, 50, 45, 6, 420, 160, ['science']);
AR('exo', 'Exoskeleton', 32, 25, 15, 15, 1200, 250, ['mil'], { carry: 50 });
AR('raiderspikes', 'Raider Spike Armor', 10, 0, 0, 6, 35, 100, []);
AR('firesuit', 'Firefighter Suit', 9, 15, 20, 5, 70, 120, ['tools']);
AR('ghillie', 'Ghillie Suit', 4, 5, 5, 3, 90, 80, ['nature'], { stealth: 25 });
AR('hidecloak', 'Mutant Hide Cloak', 9, 10, 10, 4, 60, 110, ['mutant'], { stealth: 10 });
AR('combatarmor', 'Combat Armor', 26, 20, 10, 10, 500, 220, ['mil']);

// Tools (passive while carried, or usable)
const T = (id, name, w, v, desc, tags, extra) => defItem(id, Object.assign({ name, cat: 'tool', w, v, desc, tags: ['tool', ...(tags || [])], stack: true }, extra || {}));
T('repairkit', 'Repair Kit', 0.8, 30, 'Use: restores 50 durability to equipped weapon & armor.', ['tools']);
T('lockpick', 'Lockpick Set', 0.2, 20, 'Passive: +1 loot roll when searching.', ['police', 'tools']);
T('geiger', 'Geiger Counter', 0.6, 40, 'Passive: -15% radiation taken; warns of radiation.', ['science', 'mil']);
T('detector', 'Echo Anomaly Detector', 0.6, 80, 'Passive: +25% artifact find chance in anomalies.', ['science']);
T('sleepbag', 'Sleeping Bag', 2, 25, 'Passive: safer and better rest in the wild.', ['nature', 'cloth']);
T('matches', 'Matches', 0.05, 3, 'Needed with wood to make a campfire.', ['home']);
T('waterfilter', 'Water Filter', 0.8, 30, 'Passive: dirty water gives no radiation.', ['tools']);
T('backpack', 'Tourist Backpack', 1.5, 45, 'Passive: +20 carry capacity (one only).', ['nature', 'cloth']);
T('modkit', 'Weapon Mod Kit', 0.5, 50, 'Use: adds a random mod (affix) to equipped weapon.', ['tools']);
T('plating', 'Armor Plating', 2, 50, 'Use: +4 armor to equipped armor permanently.', ['tools']);
T('compass', 'Old Compass', 0.2, 15, 'Passive: +8% travel speed.', ['nature']);

// Skill books
const B = (id, name, skill, v) => defItem(id, { name, cat: 'book', w: 0.5, v, skill, tags: ['book', 'office'], stack: true });
B('bk_combat', 'Guns & Bullets Magazine', 'combat', 60); B('bk_survival', 'Wasteland Survival Guide', 'survival', 60);
B('bk_scav', "Scavenger's Almanac", 'scavenging', 60); B('bk_craft', "Tinker's Weekly", 'crafting', 60);
B('bk_med', 'Field Medicine Handbook', 'medicine', 60); B('bk_barter', 'Art of the Deal (Wasteland Ed.)', 'barter', 60);
B('bk_science', 'Notes on Anomalous Fields', 'science', 60);

// Artifacts
const AF = (id, name, mods, glyph) => defItem(id, { name, cat: 'artifact', w: 0.5, v: 0, mods, tags: ['artifact'] });
AF('jellyfish', 'Jellyfish', { radRes: 15, radEmit: 1 });
AF('stoneflower', 'Stone Flower', { armor: 4, anomRes: 10, radEmit: 1 });
AF('moonlight', 'Moonlight', { stealth: 15, radEmit: 1 });
AF('fireball', 'Fireball', { anomRes: 25, thirst: 20 });
AF('battery', 'Battery', { speed: 15, radEmit: 2 });
AF('meatchunk', 'Meat Chunk', { regen: 2, radEmit: 2 });
AF('nightstar', 'Night Star', { stealth: 20, carry: 5, radEmit: 2 });
AF('gravi', 'Gravi', { carry: 20, radEmit: 2 });
AF('goldfish', 'Goldfish', { carry: 35, radEmit: 3 });
AF('crystal', 'Crystal', { radRes: 25, anomRes: 15, radEmit: 1 });
AF('kolobok', 'Kolobok', { regen: 4, radEmit: 3 });
AF('bubble', 'Bubble', { radRes: 40, carry: -5 });
AF('spring', 'Spring', { armor: 6, speed: 5, radEmit: 1 });
AF('slime', 'Slime', { regen: 1, armor: 2, radEmit: 1 });
AF('thorn', 'Thorn', { dmg: 15, regen: -1 });
AF('flash', 'Flash', { acc: 10, anomRes: 10, radEmit: 1 });
AF('soul', 'Soul', { regen: 3, maxhp: 10, radEmit: 3 });
AF('compassart', 'Compass Artifact', { speed: 20, loot: 10, radEmit: 3 });
AF('eye', 'Eye', { loot: 25, crit: 5, radEmit: 2 });
AF('mamasbeads', "Mama's Beads", { maxhp: 25, regen: 1, radEmit: 4 });

// Schematics (teach a recipe)
D.SCHEMATICS = ['r_laser', 'r_cells', 'r_gauss', 'r_combatarmor', 'r_grenade', 'r_seva', 'r_svd', 'r_smg', 'r_sciencemed', 'r_pipebomb', 'r_shockbaton', 'r_exo', 'r_detector', 'r_radaway'];

D.MOD_NAMES = { dmg: '% damage', acc: ' accuracy', crit: '% crit', armor: ' armor', radRes: '% rad resist', anomRes: '% anomaly resist',
  stealth: ' stealth', carry: ' carry', regen: ' HP regen/h', speed: '% travel speed', loot: '% loot luck', maxhp: ' max HP',
  radEmit: ' rad emission/h', thirst: '% thirst rate', hunger: '% hunger rate', lifesteal: '% lifesteal', bleed: '% bleed chance',
  burn: '% burn chance', radDmg: ' rad damage', durab: '% durability', weight: '% weight', value: '% value', fear: '% intimidate' };
D.NEG_MODS = { radEmit: 1, thirst: 1, hunger: 1 }; // positive numbers are BAD for these

/* ---- Affixes ---- */
// [name, mods, weight]
D.WPN_PREFIX = [
  ['Rusty', { dmg: -15, durab: -30, value: -40 }, 8], ['Sturdy', { durab: 50 }, 6], ['Serrated', { bleed: 25 }, 5], ['Scoped', { acc: 10 }, 5],
  ['Irradiated', { radDmg: 6 }, 4], ['Balanced', { acc: 6, crit: 3 }, 5], ['Heavy', { dmg: 20, acc: -6, weight: 30 }, 5], ['Lightweight', { weight: -40 }, 5],
  ['Makeshift', { dmg: -8, value: -30 }, 6], ['Military', { dmg: 12, durab: 25 }, 3], ['Pre-War', { dmg: 8, acc: 5, value: 40 }, 3], ['Bone-Carved', { bleed: 15, crit: 4 }, 3],
  ['Electrified', { burn: 0, radDmg: 0, dmg: 15 }, 3], ['Incendiary', { burn: 30 }, 3], ['Silenced', { stealth: 10, crit: 5 }, 4], ['Vicious', { dmg: 18 }, 3],
  ['Precise', { acc: 12, crit: 6 }, 2], ['Jury-Rigged', { dmg: 10, durab: -40 }, 5], ['Polished', { value: 60, acc: 3 }, 4], ['Cursed', { dmg: 30, regen: -1 }, 2],
  ['Zone-Touched', { radDmg: 4, crit: 5 }, 2], ['Reinforced', { durab: 80, weight: 15 }, 4], ['Tactical', { acc: 8, dmg: 6 }, 3], ['Bloodthirsty', { lifesteal: 8 }, 2],
];
D.WPN_SUFFIX = [
  ['of the Wastes', { dmg: 8 }, 6], ['of Ruin', { dmg: 14, durab: -20 }, 4], ['of the Zone', { anomRes: 10, crit: 4 }, 3], ['of Fortune', { loot: 12 }, 4],
  ['of the Leech', { lifesteal: 10 }, 2], ['of the Stalker', { stealth: 10, acc: 5 }, 4], ['of Fury', { crit: 10 }, 3], ['of Precision', { acc: 12 }, 4],
  ['of Bleeding', { bleed: 30 }, 3], ['of Embers', { burn: 25 }, 3], ['of the Glow', { radDmg: 8, radEmit: 1 }, 3], ['of Terror', { fear: 15 }, 3],
  ['of the Hunter', { dmg: 10, acc: 4 }, 4], ['of Endurance', { durab: 60 }, 4], ['of the Duelist', { crit: 6, acc: 6 }, 3], ['of the Butcher', { bleed: 20, dmg: 6 }, 3],
  ['of Last Breath', { lifesteal: 6, crit: 6 }, 1], ['of the Old World', { value: 80, dmg: 5 }, 2],
];
D.ARM_PREFIX = [
  ['Tattered', { armor: -3, value: -40 }, 7], ['Padded', { armor: 3 }, 6], ['Reinforced', { armor: 6, weight: 20 }, 5], ['Lead-Lined', { radRes: 20, weight: 25 }, 4],
  ['Camouflaged', { stealth: 12 }, 4], ['Insulated', { anomRes: 15 }, 4], ['Lightweight', { weight: -35 }, 5], ['Military', { armor: 8, durab: 30 }, 3],
  ['Patched', { durab: -20, armor: 1 }, 6], ['Pre-War', { armor: 4, radRes: 8, value: 40 }, 3], ['Hide-Wrapped', { armor: 4, stealth: 5 }, 4], ['Rubberized', { anomRes: 20, radRes: 5 }, 3],
  ['Spiked', { fear: 10, armor: 2 }, 4], ['Sealed', { radRes: 15, anomRes: 10 }, 3], ['Ergonomic', { carry: 10 }, 4], ['Scavenged', { loot: 6, armor: -1 }, 4],
];
D.ARM_SUFFIX = [
  ['of the Bunker', { radRes: 15 }, 5], ['of Shadows', { stealth: 15 }, 4], ['of the Mule', { carry: 20 }, 4], ['of Vitality', { maxhp: 15 }, 4],
  ['of Mending', { regen: 1 }, 3], ['of the Wanderer', { speed: 8 }, 4], ['of the Anomaly', { anomRes: 25 }, 3], ['of the Wall', { armor: 8 }, 3],
  ['of the Scavenger', { loot: 10 }, 4], ['of Endurance', { durab: 60 }, 4], ['of the Camel', { thirst: -20 }, 3], ['of Plenty', { hunger: -20 }, 3],
];
D.ART_PREFIX = [['Dim', 0.7, 6], ['Faint', 0.85, 6], ['', 1, 10], ['Glowing', 1.2, 5], ['Pulsing', 1.4, 3], ['Unstable', 1.6, 2], ['Pristine', 1.9, 1]];
D.ART_EXTRA = [ // random extra artifact mods: [stat, min, max]
  ['radRes', 5, 20], ['anomRes', 5, 20], ['armor', 1, 6], ['stealth', 4, 15], ['carry', 5, 20], ['regen', 1, 2], ['speed', 3, 12], ['loot', 4, 15],
  ['dmg', 4, 12], ['crit', 2, 8], ['acc', 3, 10], ['maxhp', 5, 15], ['radEmit', 1, 3], ['thirst', 10, 25], ['hunger', 10, 25], ['regen', -2, -1], ['carry', -10, -5],
];

/* ---- Recipes ---- */
// out: [itemId, qty] ; needs comps/items ; req skills ; station: campfire|workbench ; schem: needs schematic
D.RECIPES = [
  { id: 'r_bandage', out: ['bandage', 2], needs: { cloth: 2 }, req: {} },
  { id: 'r_knife', out: ['knife', 1], needs: { scrap: 2, tape: 1 }, req: {} },
  { id: 'r_spikedclub', out: ['spikedclub', 1], needs: { wood: 2, screws: 2 }, req: {} },
  { id: 'r_purewater', out: ['purewater', 1], needs: { dirtywater: 1 }, req: {}, station: 'campfire' },
  { id: 'r_steak', out: ['steak', 1], needs: { rawmeat: 1 }, req: {}, station: 'campfire' },
  { id: 'r_tape', out: ['tape', 1], needs: { cloth: 1, glue: 1 }, req: {} },
  { id: 'r_glue', out: ['glue', 2], needs: { chemicals: 1, bones: 1 }, req: {}, station: 'campfire' },
  { id: 'r_matches', out: ['matches', 3], needs: { wood: 1, chemicals: 1 }, req: {} },
  { id: 'r_rebarspear', out: ['rebarspear', 1], needs: { scrap: 3, tape: 1, wood: 1 }, req: { crafting: 1 } },
  { id: 'r_pipepistol', out: ['pipepistol', 1], needs: { scrap: 3, springs: 1, screws: 2 }, req: { crafting: 1 }, station: 'workbench' },
  { id: 'r_ammo9', out: ['ammo9', 12], needs: { gunpowder: 1, scrap: 1 }, req: { crafting: 1 }, station: 'workbench' },
  { id: 'r_shells', out: ['shells', 6], needs: { gunpowder: 1, plastic: 1, scrap: 1 }, req: { crafting: 2 }, station: 'workbench' },
  { id: 'r_ammo762', out: ['ammo762', 8], needs: { gunpowder: 2, scrap: 1, copper: 1 }, req: { crafting: 3 }, station: 'workbench' },
  { id: 'r_ammo545', out: ['ammo545', 10], needs: { gunpowder: 2, scrap: 1 }, req: { crafting: 3 }, station: 'workbench' },
  { id: 'r_bolts', out: ['bolts', 8], needs: { wood: 1, scrap: 1 }, req: { crafting: 1 } },
  { id: 'r_gunpowder', out: ['gunpowder', 2], needs: { chemicals: 1, fertilizer: 1 }, req: { crafting: 1 }, station: 'workbench' },
  { id: 'r_gunpowder2', out: ['gunpowder', 1], needs: { casing: 2 }, req: {} },
  { id: 'r_crossbow', out: ['crossbow', 1], needs: { wood: 3, springs: 2, rope: 1, screws: 2 }, req: { crafting: 2 }, station: 'workbench' },
  { id: 'r_nailgun', out: ['nailgun', 1], needs: { drill: 1, springs: 2, tape: 2 }, req: { crafting: 2, science: 1 }, station: 'workbench' },
  { id: 'r_repairkit', out: ['repairkit', 1], needs: { scrap: 2, tape: 1, screws: 1, glue: 1 }, req: { crafting: 2 } },
  { id: 'r_lockpick', out: ['lockpick', 1], needs: { scrap: 1, springs: 1 }, req: { crafting: 1 } },
  { id: 'r_scraparmor', out: ['scraparmor', 1], needs: { scrap: 6, leather: 2, tape: 2 }, req: { crafting: 2 }, station: 'workbench' },
  { id: 'r_leather', out: ['leatherjkt', 1], needs: { leather: 3, cloth: 1 }, req: { crafting: 1 } },
  { id: 'r_raiderspikes', out: ['raiderspikes', 1], needs: { scrap: 4, leather: 2, screws: 3 }, req: { crafting: 2 }, station: 'workbench' },
  { id: 'r_modkit', out: ['modkit', 1], needs: { screws: 2, springs: 1, glue: 1, scrap: 2, circuit: 1 }, req: { crafting: 3 }, station: 'workbench' },
  { id: 'r_plating', out: ['plating', 1], needs: { scrap: 4, glue: 1, tape: 1, fiber: 1 }, req: { crafting: 3 }, station: 'workbench' },
  { id: 'r_sleepbag', out: ['sleepbag', 1], needs: { cloth: 5, tape: 1 }, req: { survival: 1 } },
  { id: 'r_backpack', out: ['backpack', 1], needs: { cloth: 4, leather: 2, tape: 1 }, req: { survival: 2 } },
  { id: 'r_waterfilter', out: ['waterfilter', 1], needs: { plastic: 2, cloth: 2, chemicals: 1 }, req: { survival: 2 } },
  { id: 'r_jerky', out: ['jerky', 2], needs: { rawmeat: 2 }, req: { survival: 1 }, station: 'campfire' },
  { id: 'r_tea', out: ['tea', 1], needs: { herbs: 2, water: 1 }, req: { survival: 1 }, station: 'campfire' },
  { id: 'r_soup', out: ['soup', 1], needs: { herbs: 2, rawmeat: 1, water: 1 }, req: { survival: 2 }, station: 'campfire' },
  { id: 'r_hidecloak', out: ['hidecloak', 1], needs: { hide: 3, cloth: 2 }, req: { survival: 3 }, station: 'workbench' },
  { id: 'r_ghillie', out: ['ghillie', 1], needs: { cloth: 4, herbs: 4, rope: 1 }, req: { survival: 4 } },
  { id: 'r_firstaid', out: ['firstaid', 1], needs: { bandage: 2, chemicals: 1 }, req: { medicine: 1 } },
  { id: 'r_antirad', out: ['antirad', 1], needs: { chemicals: 2, herbs: 1 }, req: { medicine: 2 } },
  { id: 'r_painkiller', out: ['painkiller', 2], needs: { chemicals: 1, herbs: 1 }, req: { medicine: 1 } },
  { id: 'r_antibio', out: ['antibio', 1], needs: { chemicals: 1, herbs: 2, glass: 1 }, req: { medicine: 2 } },
  { id: 'r_stimpak', out: ['stimpak', 1], needs: { chemicals: 2, syringe: 1, herbs: 1 }, req: { medicine: 3 }, station: 'workbench' },
  { id: 'r_jet', out: ['jet', 1], needs: { chemicals: 2, plastic: 1 }, req: { medicine: 3, science: 1 }, station: 'workbench' },
  { id: 'r_buffout', out: ['buffout', 1], needs: { chemicals: 2, hide: 1 }, req: { medicine: 3 }, station: 'workbench' },
  { id: 'r_radx', out: ['radx', 1], needs: { chemicals: 2, lead: 1 }, req: { medicine: 2, science: 1 } },
  { id: 'r_molotov', out: ['molotov', 1], needs: { bottle: 1, fuel: 1, cloth: 1 }, req: {} },
  { id: 'r_geiger', out: ['geiger', 1], needs: { electronics: 2, circuit: 1, glass: 1 }, req: { crafting: 2, science: 1 }, station: 'workbench' },
  { id: 'r_psyblock', out: ['psyblock', 1], needs: { chemicals: 2, circuit: 1 }, req: { science: 2, medicine: 2 }, station: 'workbench' },
  // Schematic-only
  { id: 'r_grenade', out: ['grenade', 1], needs: { gunpowder: 2, scrap: 1, tape: 1 }, req: { crafting: 2 }, station: 'workbench', schem: true },
  { id: 'r_pipebomb', out: ['pipebomb', 1], needs: { pipe: 1, gunpowder: 2, tape: 1 }, req: { crafting: 1 }, schem: true },
  { id: 'r_smg', out: ['smg', 1], needs: { scrap: 5, springs: 3, screws: 4, plastic: 2 }, req: { crafting: 4 }, station: 'workbench', schem: true },
  { id: 'r_svd', out: ['svd', 1], needs: { scrap: 6, wood: 2, springs: 3, glass: 2, screws: 4 }, req: { crafting: 6 }, station: 'workbench', schem: true },
  { id: 'r_shockbaton', out: ['shockbaton', 1], needs: { leadpipe: 1, electronics: 2, copper: 2, carbatt: 1 }, req: { crafting: 2, science: 2 }, station: 'workbench', schem: true },
  { id: 'r_laser', out: ['laserpistol', 1], needs: { electronics: 4, circuit: 3, glass: 2, scrap: 3 }, req: { science: 3, crafting: 3 }, station: 'workbench', schem: true },
  { id: 'r_cells', out: ['cells', 10], needs: { electronics: 1, chemicals: 1, lead: 1 }, req: { science: 2 }, station: 'workbench', schem: true },
  { id: 'r_gauss', out: ['gauss', 1], needs: { circuit: 6, electronics: 6, copper: 6, scrap: 8, fiber: 3 }, req: { science: 6, crafting: 6 }, station: 'workbench', schem: true },
  { id: 'r_combatarmor', out: ['combatarmor', 1], needs: { fiber: 4, scrap: 6, leather: 3, glue: 2 }, req: { crafting: 5 }, station: 'workbench', schem: true },
  { id: 'r_seva', out: ['seva', 1], needs: { fiber: 3, cloth: 4, lead: 3, glass: 2, circuit: 1 }, req: { science: 4, crafting: 4 }, station: 'workbench', schem: true },
  { id: 'r_exo', out: ['exo', 1], needs: { scrap: 15, circuit: 6, electronics: 6, fiber: 6, carbatt: 2 }, req: { crafting: 8, science: 5 }, station: 'workbench', schem: true },
  { id: 'r_sciencemed', out: ['sciencemed', 1], needs: { chemicals: 3, herbs: 2, bandage: 1 }, req: { medicine: 4, science: 2 }, station: 'workbench', schem: true },
  { id: 'r_radaway', out: ['radaway', 1], needs: { chemicals: 3, water: 1, plastic: 1 }, req: { medicine: 3 }, station: 'workbench', schem: true },
  { id: 'r_detector', out: ['detector', 1], needs: { circuit: 2, electronics: 2, copper: 2 }, req: { science: 2 }, station: 'workbench', schem: true },
];
/* ---- Skills & perks ---- */
D.SKILLS = {
  combat: ['Combat', '+5% damage, +2 accuracy per level'],
  survival: ['Survival', 'Slower hunger/thirst, +4% travel speed, better rest'],
  scavenging: ['Scavenging', 'More & rarer loot when searching'],
  crafting: ['Crafting', 'Unlocks recipes, better crafted quality, more scrap'],
  medicine: ['Medicine', '+10% healing per level, unlocks medical recipes'],
  barter: ['Barter', 'Better prices with traders, more quest caps'],
  science: ['Science', 'Anomaly & radiation resistance, artifact finding, tech recipes'],
};
// perk: id, name, desc, effect mods, optional req
D.PERKS = [
  ['toughness', 'Toughness', '+6 armor', { armor: 6 }], ['leadbelly', 'Lead Belly', 'Food & water give 60% less radiation', {}],
  ['packrat', 'Pack Rat', '+25 carry capacity', { carry: 25 }], ['ironfist', 'Iron Fist', '+30% melee damage', {}],
  ['sniper', 'Sniper', '+12 accuracy with ranged', {}], ['bloodymess', 'Bloody Mess', 'Crits deal x2.6 instead of x2', {}],
  ['lucky', 'Lucky', '+6% crit chance, +8 loot luck', { crit: 6, loot: 8 }], ['camel', 'Camel', 'Thirst -35%', { thirst: -35 }],
  ['ironstomach', 'Iron Stomach', 'Hunger -35%', { hunger: -35 }], ['regenerator', 'Regenerator', '+2 HP regen per hour', { regen: 2 }],
  ['quickfeet', 'Quick Feet', '+60% flee chance', {}], ['ninja', 'Ninja', '+20 stealth (fewer encounters)', { stealth: 20 }],
  ['mrfixit', 'Mr. Fixit', 'Gear loses durability 50% slower; repairs +50%', {}], ['chemist', 'Chemist', 'Medical recipes yield double', {}],
  ['anomalysense', 'Anomaly Sense', '+30% artifact find chance, +15 anomaly resist', { anomRes: 15 }], ['radchild', 'Rad Child', 'Heal 1 HP/h per 20 rad you carry', {}],
  ['scrounger', 'Scrounger', 'Find 50% more ammo', {}], ['silvertongue', 'Silver Tongue', '+15% better prices', {}],
  ['treasurehunter', 'Treasure Hunter', 'Stash encounters 2x more common & richer', {}], ['marathoner', 'Marathoner', '+15% travel speed', { speed: 15 }],
  ['adrenaline', 'Adrenaline', '+25% damage when below 35% HP', {}], ['vampire', 'Vampire', '+6% lifesteal', { lifesteal: 6 }],
  ['hardened', 'Hardened', '+25 max HP', { maxhp: 25 }], ['radres', 'Rad Resistant', '+20% radiation resistance', { radRes: 20 }],
  ['salvager', 'Salvager', 'Scrapping yields +1 random component', {}], ['nightowl', 'Night Owl', 'No night penalties, +10 acc at night', {}],
  ['gunslinger', 'Gunslinger', 'Pistols & SMGs +20% damage', {}], ['brute', 'Brute', '+15% damage, -5 accuracy', { dmg: 15, acc: -5 }],
  ['cautious', 'Cautious', 'Anomalies and traps deal 40% less damage', { anomRes: 25 }], ['leader', 'Natural Leader', '+25% quest rewards', {}],
  ['dualwield', 'Rapid Fire', '15% chance to attack twice', {}], ['butcher', 'Butcher', 'Mutants always drop meat/hide', {}],
  ['deadeye', 'Dead Eye', 'Aimed attacks +15 accuracy', {}], ['tinker', 'Tinker', 'Crafted gear one rarity higher chance +25%', {}],
  ['forager', 'Forager', 'Find herbs & food while travelling', {}], ['intimidate', 'Intimidating', '+20% chance enemies flee/avoid you', { fear: 20 }],
];

/* ---- Factions ---- */
D.FACTIONS = {
  loners:  { name: 'Free Stalkers', color: '#e3d36b', start: 10, enemies: [] },
  order:   { name: 'Iron Order',    color: '#ff5c5c', start: 0,  enemies: ['freedom', 'raiders'] },
  freedom: { name: 'Wild Cards',    color: '#5dff6a', start: 0,  enemies: ['order'] },
  science: { name: 'Ecologists',    color: '#4fb3ff', start: 0,  enemies: [] },
  raiders: { name: 'Rust Gang',     color: '#ff8c3a', start: -60, enemies: ['order', 'loners'] },
};

/* ---- POI types: label, glyph, color, loot [tag,weight], danger mod, workbench, settlement chance % ---- */
D.POI = {
  pharmacy:   { label: 'Pharmacy', g: '✚', c: '#5dff6a', loot: [['med', 7], ['chem', 3], ['junk:med', 2], ['drink', 1]], danger: 0, sc: 0 },
  hospital:   { label: 'Hospital', g: 'H', c: '#ff6b6b', loot: [['med', 7], ['chem', 2], ['comp:chem', 2], ['junk:med', 2], ['armor:med', 1], ['schematic', 0.5]], danger: 1, sc: 8 },
  clinic:     { label: 'Clinic', g: '+', c: '#ff9b9b', loot: [['med', 6], ['chem', 1], ['junk:med', 2]], danger: 0, sc: 0 },
  fuel:       { label: 'Gas Station', g: 'F', c: '#ffd166', loot: [['comp:chem', 4], ['food', 3], ['drink', 3], ['junk:car', 4], ['tool', 1]], danger: 0, sc: 10, bench: true },
  police:     { label: 'Police Station', g: 'P', c: '#4fb3ff', loot: [['weapon:police', 4], ['ammo', 5], ['armor:police', 2], ['med', 1], ['tool:police', 1]], danger: 1, sc: 12 },
  military:   { label: 'Military Site', g: '★', c: '#ff5c5c', loot: [['weapon:mil', 5], ['ammo', 6], ['armor:mil', 3], ['med:mil', 2], ['food:mil', 2], ['throw', 2], ['schematic', 1]], danger: 2.5, sc: 10, bench: true },
  industrial: { label: 'Industrial Zone', g: '⚙', c: '#c9a227', loot: [['comp:hard', 6], ['comp:chem', 3], ['junk', 4], ['tool', 2], ['comp:elec', 2], ['schematic', 0.7]], danger: 1.2, sc: 6, bench: true },
  factory:    { label: 'Factory', g: '⚒', c: '#d4a017', loot: [['comp:hard', 6], ['comp:elec', 3], ['junk', 3], ['tool', 2], ['schematic', 1]], danger: 1.5, sc: 6, bench: true },
  power:      { label: 'Power Facility', g: 'ϟ', c: '#f4f75e', loot: [['comp:elec', 6], ['junk:elec', 3], ['comp:hard', 2], ['artifact', 0.5]], danger: 2, sc: 0 },
  school:     { label: 'School', g: 'S', c: '#b5e48c', loot: [['junk:office', 4], ['book', 1.5], ['food', 2], ['comp:cloth', 2], ['drink', 1]], danger: 0.5, sc: 14 },
  university: { label: 'University', g: 'U', c: '#99d98c', loot: [['junk:office', 3], ['book', 2], ['junk:science', 2], ['comp:elec', 2], ['schematic', 1.2]], danger: 0.8, sc: 12 },
  supermarket:{ label: 'Supermarket', g: '$', c: '#90e0ef', loot: [['food', 7], ['drink', 6], ['junk:home', 2], ['med', 1], ['comp', 1]], danger: 0.6, sc: 12 },
  shop:       { label: 'Shop', g: '¤', c: '#a0c4ff', loot: [['junk', 4], ['food', 2], ['drink', 2], ['comp', 2]], danger: 0.2, sc: 4 },
  hardware:   { label: 'Hardware Store', g: '⚒', c: '#e9c46a', loot: [['comp:hard', 6], ['tool', 4], ['weapon:tools', 3], ['junk:tools', 2]], danger: 0.3, sc: 6, bench: true },
  carrepair:  { label: 'Auto Repair', g: '⛭', c: '#e76f51', loot: [['junk:car', 5], ['comp:hard', 4], ['comp:chem', 2], ['tool', 2]], danger: 0.4, sc: 5, bench: true },
  electronics:{ label: 'Electronics Store', g: 'Ω', c: '#80ffdb', loot: [['comp:elec', 6], ['junk:elec', 4], ['tool:science', 1]], danger: 0.3, sc: 3 },
  clothes:    { label: 'Clothing Store', g: '♠', c: '#cdb4db', loot: [['armor:cloth', 4], ['comp:cloth', 5], ['junk', 1]], danger: 0.2, sc: 3 },
  outdoor:    { label: 'Outdoor Store', g: '▲', c: '#52b788', loot: [['armor:nature', 3], ['tool:nature', 4], ['food', 2], ['weapon:nature', 2], ['ammo', 1]], danger: 0.3, sc: 6 },
  hunting:    { label: 'Gun Shop', g: '⌖', c: '#ff7b00', loot: [['weapon:ranged', 5], ['ammo', 7], ['tool', 1]], danger: 1, sc: 4 },
  food:       { label: 'Restaurant', g: '♨', c: '#f4a261', loot: [['food', 5], ['drink', 4], ['junk:home', 2]], danger: 0.2, sc: 4 },
  bar:        { label: 'Bar', g: '♣', c: '#e5989b', loot: [['drink', 6], ['food', 2], ['junk', 2], ['valuable', 0.5]], danger: 0.5, sc: 14 },
  bank:       { label: 'Bank', g: '₿', c: '#ffd700', loot: [['valuable', 6], ['junk:office', 3], ['weapon:police', 1]], danger: 0.8, sc: 4 },
  church:     { label: 'Church', g: '✝', c: '#ddd', loot: [['valuable', 2], ['food', 2], ['med', 2], ['junk:home', 2], ['comp:cloth', 1]], danger: 0.3, sc: 22 },
  firestation:{ label: 'Fire Station', g: '♦', c: '#ff4d4d', loot: [['weapon:tools', 3], ['armor:tools', 2], ['med', 3], ['junk:tools', 2], ['tool', 2]], danger: 0.4, sc: 15, bench: true },
  railway:    { label: 'Railway Station', g: '⊞', c: '#adb5bd', loot: [['junk', 4], ['comp:hard', 3], ['food', 1], ['weapon', 1], ['valuable', 0.5]], danger: 0.8, sc: 25 },
  museum:     { label: 'Museum', g: 'M', c: '#ffb4a2', loot: [['valuable', 3], ['weapon:melee', 2], ['junk', 2], ['artifact', 0.4], ['book', 1]], danger: 0.5, sc: 6 },
  hotel:      { label: 'Hotel', g: 'h', c: '#b8c0ff', loot: [['food', 2], ['drink', 2], ['junk:home', 3], ['valuable', 1], ['med', 1]], danger: 0.4, sc: 16 },
  prison:     { label: 'Prison', g: '#', c: '#6c757d', loot: [['weapon:melee', 3], ['weapon:police', 2], ['junk', 2], ['ammo', 2]], danger: 2, sc: 8 },
  townhall:   { label: 'Town Hall', g: '♜', c: '#ffe066', loot: [['junk:office', 4], ['valuable', 1], ['book', 1], ['schematic', 0.5]], danger: 0.5, sc: 30 },
  library:    { label: 'Library', g: 'L', c: '#c3a995', loot: [['book', 3], ['junk:office', 4], ['schematic', 0.8]], danger: 0.2, sc: 10 },
  post:       { label: 'Post Office', g: '✉', c: '#ffcad4', loot: [['junk', 4], ['valuable', 1], ['tool', 1], ['schematic', 0.4]], danger: 0.3, sc: 6 },
  water:      { label: 'Water Works', g: '≈', c: '#48cae4', loot: [['drink', 4], ['comp:chem', 3], ['comp:hard', 3]], danger: 1, sc: 4 },
  farm:       { label: 'Abandoned Farm', g: '¥', c: '#b5838d', loot: [['food', 4], ['junk:nature', 3], ['comp:nature', 3], ['weapon:nature', 1]], danger: 0.6, sc: 15 },
  ruin:       { label: 'Ruins', g: '▣', c: '#8d99ae', loot: [['junk', 5], ['comp', 3], ['food', 1], ['weapon', 0.6], ['valuable', 0.4]], danger: 0.8, sc: 6 },
  wreck:      { label: 'Vehicle Wreck', g: '⧉', c: '#9a8c98', loot: [['junk:car', 5], ['comp:chem', 2], ['comp:hard', 2], ['ammo', 1]], danger: 0.5, sc: 0 },
  camp:       { label: 'Abandoned Camp', g: '⛺', c: '#c9ada7', loot: [['food', 3], ['ammo', 2], ['tool', 2], ['weapon', 1], ['med', 1]], danger: 1, sc: 0 },
  bunker:     { label: 'Bunker', g: '⌂', c: '#5dff6a', loot: [['ammo', 3], ['food:mil', 3], ['med', 2], ['schematic', 1]], danger: 0, sc: 100, bench: true },
};

// Overpass tag -> POI type
D.tagToPoi = function (t) {
  const a = t.amenity, s = t.shop, m = t.military, lu = t.landuse;
  if (m || lu === 'military') return 'military';
  if (a === 'pharmacy' || s === 'chemist') return 'pharmacy';
  if (a === 'hospital') return 'hospital';
  if (a === 'clinic' || a === 'doctors' || a === 'dentist' || a === 'veterinary') return 'clinic';
  if (a === 'fuel' || s === 'gas') return 'fuel';
  if (a === 'police') return 'police';
  if (a === 'prison') return 'prison';
  if (a === 'fire_station') return 'firestation';
  if (a === 'school' || a === 'kindergarten') return 'school';
  if (a === 'university' || a === 'college') return 'university';
  if (a === 'bank') return 'bank';
  if (a === 'place_of_worship') return 'church';
  if (a === 'library') return 'library';
  if (a === 'post_office') return 'post';
  if (a === 'townhall') return 'townhall';
  if (a === 'bar' || a === 'pub') return 'bar';
  if (a === 'restaurant' || a === 'cafe' || a === 'fast_food') return 'food';
  if (a === 'marketplace') return 'supermarket';
  if (a === 'cinema' || a === 'theatre') return 'ruin';
  if (s === 'supermarket' || s === 'convenience' || s === 'mall' || s === 'department_store' || s === 'butcher' || s === 'bakery' || s === 'alcohol' || s === 'kiosk') return 'supermarket';
  if (s === 'hardware' || s === 'doityourself') return 'hardware';
  if (s === 'car_repair' || s === 'car_parts' || s === 'tyres') return 'carrepair';
  if (s === 'electronics' || s === 'mobile_phone' || s === 'computer') return 'electronics';
  if (s === 'clothes' || s === 'shoes') return 'clothes';
  if (s === 'outdoor' || s === 'sports') return 'outdoor';
  if (s === 'hunting' || s === 'weapons') return 'hunting';
  if (s) return 'shop';
  if (t.power) return 'power';
  if (t.man_made === 'works') return 'factory';
  if (t.man_made === 'wastewater_plant' || t.man_made === 'water_tower' || t.man_made === 'water_works') return 'water';
  if (t.man_made) return 'ruin';
  if (lu === 'industrial') return 'industrial';
  if (lu === 'farmyard') return 'farm';
  if (t.railway) return 'railway';
  if (t.tourism === 'museum') return 'museum';
  if (t.tourism) return 'hotel';
  return null;
};

/* ---- Enemies ---- */
// id,name,hp,dmg,acc,armor,xp,caps,loot tags,kind,minDanger,special
D.ENEMIES = [
  ['radrat', 'Rad Rat Swarm', 14, [2, 5], 70, 0, 6, [0, 0], ['mutant'], 'mutant', 0, 'rad'],
  ['dog', 'Blind Dog', 20, [3, 7], 72, 0, 9, [0, 0], ['mutant'], 'mutant', 0, 'bleed'],
  ['flesh', 'Flesh', 34, [4, 8], 60, 2, 12, [0, 0], ['mutant'], 'mutant', 0.5, null],
  ['ghoul', 'Feral Ghoul', 28, [4, 9], 70, 1, 14, [0, 8], ['mutant', 'junk'], 'mutant', 1, 'rad'],
  ['bandit', 'Bandit', 30, [5, 10], 65, 3, 15, [5, 25], ['human'], 'raider', 0, null],
  ['raider', 'Rust Gang Raider', 38, [6, 12], 68, 5, 20, [10, 35], ['human'], 'raider', 1, 'bleed'],
  ['snork', 'Snork', 40, [7, 13], 75, 2, 24, [0, 0], ['mutant'], 'mutant', 2, null],
  ['boar', 'Mutant Boar', 55, [7, 14], 62, 5, 26, [0, 0], ['mutant'], 'mutant', 1.5, null],
  ['zombie', 'Zombified Stalker', 45, [6, 12], 55, 6, 22, [0, 20], ['human'], 'mutant', 1.5, 'rad'],
  ['merc', 'Mercenary', 55, [9, 16], 75, 9, 35, [20, 60], ['human'], 'raider', 3, null],
  ['bloodsucker', 'Bloodsucker', 80, [10, 18], 78, 4, 50, [0, 0], ['mutant'], 'mutant', 3, 'drain'],
  ['sentry', 'Rogue Sentry Bot', 75, [9, 15], 70, 14, 45, [0, 0], ['robot'], 'robot', 2.5, 'shock'],
  ['burer', 'Burer', 70, [8, 14], 85, 4, 55, [0, 0], ['mutant'], 'mutant', 4, 'psy'],
  ['controller', 'Controller', 90, [10, 16], 90, 3, 80, [0, 0], ['mutant'], 'mutant', 5, 'psy'],
  ['chimera', 'Chimera', 130, [14, 24], 76, 8, 110, [0, 0], ['mutant'], 'mutant', 6, 'bleed'],
  ['pseudogiant', 'Pseudogiant', 180, [16, 30], 60, 14, 140, [0, 0], ['mutant'], 'mutant', 7, null],
  ['exomerc', 'Exo-Mercenary', 140, [14, 24], 80, 22, 150, [60, 160], ['human'], 'raider', 7, null],
];
D.ENEMY_VARIANTS = [
  ['', {}, 30], ['Rabid', { dmg: 1.2 }, 6], ['Starving', { hp: 0.75, dmg: 1.1, xp: 0.9 }, 6], ['Alpha', { hp: 1.5, dmg: 1.3, xp: 1.7, caps: 1.5 }, 3],
  ['Irradiated', { special: 'rad', xp: 1.15 }, 5], ['Armored', { armor: 6, xp: 1.2 }, 4], ['Glowing', { hp: 1.2, special: 'rad', xp: 1.3 }, 3], ['Veteran', { acc: 10, dmg: 1.15, xp: 1.3, caps: 1.4 }, 4],
  ['Crippled', { hp: 0.7, acc: -10, xp: 0.8 }, 4], ['Frenzied', { dmg: 1.4, acc: -8, xp: 1.2 }, 3], ['Elder', { hp: 1.8, dmg: 1.4, xp: 2, caps: 2 }, 1], ['Toxic', { special: 'poison', xp: 1.15 }, 3],
];
D.BOSS_NAMES = ['Butcher', 'Rotgut', 'Ivan the Mad', 'Scar', 'Grinder', 'Old Viktor', 'Tusk', 'Hollow-Eye', 'Red Mara', 'Kostya Crowbar', 'Mother Rust', 'Gnashjaw', 'The Doctor', 'Lame Pyotr'];

/* ---- Names ---- */
D.FIRST = ['Sasha', 'Viktor', 'Oleg', 'Mila', 'Yuri', 'Kat', 'Anton', 'Lena', 'Boris', 'Dima', 'Ivo', 'Marta', 'Tõnu', 'Kalev', 'Liis', 'Jaan', 'Kristo', 'Hanna', 'Pavel', 'Nika', 'Grigor', 'Sven', 'Ott', 'Mari'];
D.NICK = ['Wolf', 'Fang', 'Doc', 'Ghost', 'Sparrow', 'Rat', 'Tinker', 'Grumpy', 'Owl', 'Bolt', 'Dagger', 'Smiley', 'Hermit', 'Rusty', 'Professor', 'Lucky', 'Crow', 'Bear', 'Fox', 'Mole', 'Stitch', 'Sarge', 'Gecko', 'Kettle'];
D.ZONE_ADJ = ['Glowing', 'Rotten', 'Whispering', 'Burnt', 'Dead', 'Hollow', 'Black', 'Crimson', 'Silent', 'Weeping', 'Rusted', 'Shattered', 'Poisoned', 'Grey', 'Bleeding'];
D.ZONE_NOUN = ['Pit', 'Grove', 'Hollow', 'Field', 'Yard', 'Crater', 'Marsh', 'Sector', 'Ravine', 'Quarry', 'Basin', 'Spires', 'Graveyard', 'Swamp', 'Nest'];
D.SETTLE_NAMES = ['Haven', 'Outpost', 'Bastion', 'Refuge', 'Camp', 'Stronghold', 'Waypoint', 'Hideout', 'Enclave'];
