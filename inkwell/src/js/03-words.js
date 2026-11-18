// ======================================================================
// Words: the quill's dictionary, adjectives and the parser.
// Stats are what the puzzles read: climbH (m of ledge it reaches), len (m of gap it
// spans), mass, power (fighting), dig, water (fire-dousing), light, fv (food value), value (gold).
// ======================================================================
const DEFS = [];
const WORDS = new Map();
let CAT = '';
function D(names, cost, tags, b, o = {}) {
  const list = names.split('|');
  const d = { name: list[0], names: list, cost, tags: tags.split(' ').filter(Boolean), b, cat: CAT, ...o };
  DEFS.push(d);
  for (const n of list) WORDS.set(n, d);
  return d;
}

CAT = 'Climb & Cross';
D('ladder|stepladder', 2, 'wood climb bridge', 'ladder', { mass: 1.5, climbH: 4.2, len: 4, style: 'lean' });
D('stairs|staircase|steps|stair', 3, 'wood climb', 'stairs', { mass: 3, climbH: 3.6, style: 'stairs' });
D('rope|rope ladder', 1, 'cloth climb bridge', 'rope', { mass: 0.5, climbH: 5, len: 5, style: 'hang', bridgeB: 'ropeBridge' });
D('plank|board|wooden plank|wood plank', 1, 'wood bridge', 'plank', { mass: 1, len: 3.4 });
D('log|tree trunk', 1, 'wood bridge plant', 'log', { mass: 2.5, len: 3.8 });
D('bridge|footbridge', 4, 'wood bridge', 'bridge', { mass: 4, len: 6.6 });
D('stick|branch|pole', 1, 'wood bridge weapon', 'stick', { mass: 0.3, len: 2.2, power: 1 });
D('trampoline', 3, 'bounce metal', 'trampoline', { mass: 2, climbH: 7, style: 'bounce' });
D('beanstalk|vine|vines', 3, 'plant climb', 'beanstalk', { mass: 1, climbH: 8, style: 'grow' });
D('tree|oak|pine', 2, 'plant wood climb', 'tree', { mass: 4, climbH: 3.2, style: 'grow' });

CAT = 'Flight';
D('wings|wing', 4, 'fly cloth', 'wings', { equip: 'back' });
D('jetpack|jet pack|rocket pack', 5, 'fly metal hot', 'jetpack', { equip: 'back' });
D('balloon|balloons', 2, 'fly toy', 'balloon', { equip: 'hand' });
D('hot air balloon|hotairballoon|air balloon', 5, 'fly cloth', 'hotairballoon', { equip: 'ride', mass: 2 });
D('helicopter|chopper', 6, 'fly metal vehicle loud', 'helicopter', { equip: 'ride', mass: 5 });
D('plane|airplane|aeroplane|jet|aircraft', 6, 'fly metal vehicle loud', 'plane', { equip: 'ride', mass: 5 });
D('broom|broomstick', 3, 'fly wood', 'broom', { equip: 'ride' });
D('rocket|spaceship|rocket ship', 6, 'fly metal hot loud', 'rocket', { equip: 'ride', mass: 4 });
D('magic carpet|carpet|flying carpet|rug', 4, 'fly cloth', 'carpet', { equip: 'ride' });
D('cloud', 2, 'fly', 'cloud', { equip: 'ride', mass: 0.1 });

CAT = 'Water & Ice';
D('water|puddle|splash', 1, 'water', 'water', { water: 1 });
D('water bucket|bucket water|pail water|bucket full water', 2, 'water metal', 'bucket', { v: { full: true }, water: 2 });
D('bucket|pail', 1, 'metal', 'bucket');
D('rain cloud|raincloud|rain|storm|storm cloud|rainstorm|thundercloud', 4, 'water fly', 'raincloud', { water: 3, hover: 2.4, mass: 0.1 });
D('fire extinguisher|extinguisher', 3, 'extinguish metal', 'extinguisher', { water: 3, equip: 'hand' });
D('fire truck|firetruck|fire engine', 6, 'water metal vehicle heavy loud', 'firetruck', { water: 6, mass: 8 });
D('hose|garden hose|hosepipe', 2, 'water', 'hose', { water: 2 });
D('snowball|snow', 1, 'cold ice water', 'snowball', { water: 0.5 });
D('ice cube|ice|ice block|iceberg', 1, 'cold ice', 'iceblock', { water: 0.5, mass: 1 });
D('snowman', 2, 'cold ice', 'snowman', { water: 1, mass: 2 });
D('freeze ray|ice ray|freezeray', 5, 'cold weapon metal', 'freezeray', { power: 4, equip: 'hand' });
D('fridge|refrigerator|freezer', 4, 'cold metal heavy', 'fridge', { mass: 5 });
D('submarine|sub', 6, 'dive metal vehicle', 'submarine', { equip: 'ride', mass: 5 });
D('scuba gear|scuba|diving gear|wetsuit|oxygen tank|air tank|snorkel', 3, 'dive', 'scuba', { equip: 'back' });
D('boat|canoe|raft|rowboat|ship', 3, 'wood swim', 'boat', { mass: 3 });
D('sponge', 1, 'drain', 'sponge', { drain: 1 });
D('pump|water pump', 3, 'drain metal', 'pump', { drain: 2, mass: 2 });

CAT = 'Fire & Light';
D('torch', 2, 'flame hot light wood', 'torch', { light: 6, equip: 'hand', flameR: 1.1 });
D('lantern', 2, 'light metal', 'lantern', { light: 6, equip: 'hand' });
D('flashlight|torchlight|flash light', 2, 'light metal', 'flashlight', { light: 7, equip: 'hand' });
D('candle|candles', 1, 'flame hot light', 'candle', { light: 3, equip: 'hand', flameR: 0.7 });
D('lamp|lightbulb|light bulb', 2, 'light metal', 'lamp', { light: 6 });
D('firefly|fireflies|glowworm|lightning bug', 2, 'light creature bug', 'firefly', { light: 4, hover: 0.3, power: 0 });
D('sun', 7, 'flame hot light', 'sun', { light: 14, flameR: 3.2, mass: 0.1 });
D('moon', 5, 'light cold', 'moon', { light: 10, mass: 0.1 });
D('star', 3, 'light', 'star', { light: 5, mass: 0.3 });
D('glowstick|glow stick', 1, 'light', 'glowstick', { light: 4, equip: 'hand' });
D('fire|flame|campfire|bonfire|flames', 2, 'flame hot light', 'fire', { light: 6, flameR: 1.8 });
D('flamethrower|flame thrower', 4, 'flame hot weapon metal', 'flamethrower', { power: 4, equip: 'hand', flameR: 1.4 });
D('lava|magma', 4, 'flame hot', 'lava', { light: 4, flameR: 1.6, mass: 2 });
D('heater|radiator|space heater|furnace', 3, 'hot metal', 'heater', { mass: 2 });
D('hair dryer|hairdryer|blow dryer|hairdrier', 2, 'hot metal', 'hairdryer', { equip: 'hand' });
D('match|matches|matchstick|lighter', 1, 'flame hot wood', 'match', { light: 2, flameR: 0.7, equip: 'hand' });

CAT = 'Tools';
D('fishing rod|rod|fishing pole', 2, 'reach wood', 'fishingrod', { reach: 1, equip: 'hand' });
D('net|fishing net|butterfly net', 2, 'reach cloth', 'net', { reach: 1, equip: 'hand' });
D('grappling hook|hook|grapple', 2, 'reach metal', 'hook', { reach: 2 });
D('crane', 6, 'reach metal vehicle heavy', 'crane', { reach: 6, mass: 9 });
D('magnet', 2, 'magnet metal', 'magnet', { equip: 'hand' });
D('shovel|spade', 1, 'dig metal', 'shovel', { dig: 1, equip: 'hand' });
D('hammer|mallet|sledgehammer', 1, 'dig metal weapon', 'hammer', { dig: 1, power: 1, equip: 'hand' });
D('pickaxe|pick|pick axe', 2, 'dig metal weapon', 'pickaxe', { dig: 2, power: 2, equip: 'hand' });
D('drill|jackhammer', 4, 'dig metal loud', 'drill', { dig: 3, mass: 2 });
D('excavator|bulldozer|digger', 6, 'dig metal vehicle heavy loud', 'excavator', { dig: 5, mass: 9 });
D('axe|hatchet', 2, 'cut weapon metal', 'axe', { power: 2, equip: 'hand' });
D('saw', 1, 'cut metal', 'saw', { equip: 'hand' });
D('chainsaw', 3, 'cut weapon metal loud', 'chainsaw', { power: 3, equip: 'hand' });
D('knife|scissors|dagger', 1, 'cut weapon metal', 'knife', { power: 1, equip: 'hand' });
D('crowbar', 2, 'pry metal weapon', 'crowbar', { power: 1.5, equip: 'hand' });
D('key|skeleton key', 2, 'key metal', 'key', { equip: 'hand' });

CAT = 'Weapons & Armour';
D('sword|blade|sabre|saber', 3, 'weapon metal', 'sword', { power: 3, equip: 'hand' });
D('bow|crossbow|bow and arrow|arrow', 3, 'weapon wood', 'bow', { power: 3, equip: 'hand' });
D('spear|lance|trident', 2, 'weapon wood', 'spear', { power: 2, equip: 'hand' });
D('club|bat|baseball bat', 1, 'weapon wood', 'club', { power: 1.5, equip: 'hand' });
D('cannon', 6, 'weapon metal loud heavy', 'cannon', { power: 6, mass: 6 });
D('tank', 8, 'weapon metal vehicle heavy loud', 'tank', { power: 8, mass: 10 });
D('bomb', 4, 'explosive metal loud', 'bomb', { power: 7 });
D('dynamite|tnt', 4, 'explosive loud', 'dynamite', { power: 7 });
D('shield', 2, 'armor metal', 'shield', { armor: 1, equip: 'hand' });
D('armor|armour|suit armor|suit armour|breastplate', 4, 'armor metal', 'armor', { armor: 2, equip: 'back' });

CAT = 'Creatures';
const QV = {
  dog: { c: 0xc48a52, c2: 0xf1dcc0, len: 0.95, h: 0.42, w: 0.4, bh: 0.42, head: 0.27, ears: 'floppy', earC: 0x8a5a34, tail: 'up' },
  cat: { c: 0xe59a4a, c2: 0xf8e0c0, len: 0.8, h: 0.34, w: 0.32, bh: 0.34, head: 0.25, ears: 'pointy', tail: 'long', snoutR: 0.4, snoutL: 0.7, stripes: 0xb86a2a, noseC: 0xf08a9a },
  mouse: { c: 0x9a98a0, c2: 0xe0dde6, s: 0.42, len: 0.8, h: 0.25, w: 0.4, bh: 0.4, head: 0.3, ears: 'round', earR: 0.5, earC: 0xf4b6c5, tail: 'thin', noseC: 0xf08a9a },
  wolf: { c: 0x7c818c, c2: 0xd8d8de, len: 1.3, h: 0.6, w: 0.46, bh: 0.48, head: 0.31, ears: 'pointy', tail: 'bushy', snoutL: 1.5 },
  bear: { c: 0x6b4426, c2: 0xa87a52, s: 1.6, len: 1.15, h: 0.42, w: 0.72, bh: 0.72, head: 0.36, ears: 'round', tail: 'short', thick: 0.14, snoutR: 0.5 },
  lion: { c: 0xd9a24a, c2: 0xf0d090, s: 1.3, len: 1.25, h: 0.55, w: 0.5, bh: 0.5, head: 0.32, ears: 'round', mane: 0x8a4b1f, tail: 'long', tuft: 0x8a4b1f, thick: 0.1 },
  tiger: { c: 0xf08a24, c2: 0xfbe6c8, s: 1.3, len: 1.3, h: 0.52, w: 0.5, bh: 0.5, head: 0.32, ears: 'round', tail: 'long', stripes: 0x1d1e24, thick: 0.1 },
  cow: { c: 0xf4f1ea, c2: 0xf4b6c5, s: 1.4, len: 1.3, h: 0.55, w: 0.62, bh: 0.62, head: 0.3, ears: 'round', horns: 'cow', spots: 0x1d1e24, tail: 'long', tuft: 0x1d1e24, udder: true, thick: 0.1, snoutC: 0xf4b6c5 },
  pig: { c: 0xf4a6b5, c2: 0xf8c4cf, s: 0.9, len: 1.0, h: 0.32, w: 0.6, bh: 0.6, head: 0.3, ears: 'pointy', tail: 'curly', snoutR: 0.45, snoutL: 0.6, noseC: 0xd87a8a },
  sheep: { c: 0x3a3430, wool: true, s: 1.0, len: 1.0, h: 0.42, w: 0.6, bh: 0.6, head: 0.25, ears: 'floppy', earC: 0x3a3430, tail: 'short', legC: 0x3a3430, snout: false },
  goat: { c: 0xe9e3d6, c2: 0xd8d0c0, s: 1.0, len: 1.0, h: 0.55, w: 0.42, bh: 0.45, head: 0.25, ears: 'floppy', horns: 'goat', beard: true, tail: 'short', snoutL: 1.2 },
  horse: { c: 0x8b5a2b, c2: 0x6b4422, s: 1.5, len: 1.3, h: 0.75, w: 0.45, bh: 0.5, head: 0.24, neck: 0.45, ears: 'pointy', mane: 0x2a1a10, tail: 'hair', snoutL: 1.7, thick: 0.08 },
  unicorn: { c: 0xf8f4ff, c2: 0xf0e8ff, s: 1.5, len: 1.3, h: 0.75, w: 0.45, bh: 0.5, head: 0.24, neck: 0.45, ears: 'pointy', mane: 0xd08aff, tail: 'hair', snoutL: 1.7, horns: 'uni', thick: 0.08, paw: 0xffd34d },
  elephant: { c: 0x9aa0a8, c2: 0x8a9098, s: 2.0, len: 1.3, h: 0.6, w: 0.85, bh: 0.85, head: 0.42, ears: 'big', trunk: true, tail: 'short', snout: false, thick: 0.18 },
};
D('dog|puppy|hound|doggy', 2, 'creature animal pet', 'quad', { v: QV.dog, power: 1.5, diet: ['meat', 'bone'], speed: 3.2 });
D('cat|kitten|kitty', 2, 'creature animal pet', 'quad', { v: QV.cat, power: 1, diet: ['meat', 'fish'], speed: 3 });
D('mouse|rat|hamster', 1, 'creature animal prey', 'quad', { v: QV.mouse, power: 0.2, fv: 0.5, diet: ['dairy', 'grain'] });
D('wolf|wolves', 3, 'creature animal hostile predator', 'quad', { v: QV.wolf, power: 3, diet: ['meat'], speed: 3.4 });
D('bear|grizzly', 4, 'creature animal hostile predator', 'quad', { v: QV.bear, power: 5, mass: 5, diet: ['meat', 'fish', 'honey', 'fruit'], speed: 2.4 });
D('lion', 4, 'creature animal hostile predator', 'quad', { v: QV.lion, power: 5, mass: 3, diet: ['meat'], speed: 3.4 });
D('tiger', 4, 'creature animal hostile predator', 'quad', { v: QV.tiger, power: 5, mass: 3, diet: ['meat'], speed: 3.4 });
D('cow|bull|ox', 2, 'creature animal prey heavy', 'quad', { v: QV.cow, power: 2, mass: 6, fv: 4, diet: ['hay', 'veg', 'plant'] });
D('pig|piglet|hog', 2, 'creature animal prey', 'quad', { v: QV.pig, power: 1, mass: 2.5, fv: 3, diet: ['veg', 'fruit', 'grain', 'sweet'] });
D('sheep|lamb', 2, 'creature animal prey', 'quad', { v: QV.sheep, power: 1, mass: 2.5, fv: 3, diet: ['hay', 'veg', 'plant'] });
D('goat', 2, 'creature animal prey', 'quad', { v: QV.goat, power: 2, mass: 2, fv: 3, diet: ['hay', 'veg', 'fruit', 'plant'] });
D('horse|pony|stallion', 3, 'creature animal', 'quad', { v: QV.horse, power: 2, mass: 5, fv: 4, ride: true, speed: 6, diet: ['hay', 'veg', 'fruit'] });
D('unicorn', 5, 'creature animal light magic', 'quad', { v: QV.unicorn, power: 3, mass: 5, light: 3, ride: true, speed: 6, diet: ['sweet', 'fruit'] });
D('elephant', 5, 'creature animal heavy', 'quad', { v: QV.elephant, power: 6, mass: 10, diet: ['hay', 'veg', 'fruit'] });
D('chicken|hen|rooster', 1, 'creature animal prey', 'bird', { v: { c: 0xf6f3ea, c2: 0xffffff, comb: true, s: 0.8 }, fv: 1, diet: ['grain'] });
D('duck|duckling|goose', 1, 'creature animal prey', 'bird', { v: { c: 0xf6f3ea, headC: 0x2f8a4a, flat: true, s: 0.8 }, fv: 1, diet: ['grain'] });
D('bird|songbird|bluebird|sparrow|robin', 2, 'creature animal fly', 'bird', { v: { c: 0x3f7be0, c2: 0xffd8a8, s: 0.6 }, hover: 1.8, diet: ['grain', 'fruit'] });
D('eagle|hawk|falcon', 3, 'creature animal fly predator', 'bird', { v: { c: 0x6b4426, headC: 0xf4f2ee, beak: 0xffcc3a, hook: true, s: 1.5 }, power: 2, ride: true, hover: 1.8, diet: ['meat', 'fish'] });
D('owl', 2, 'creature animal fly', 'bird', { v: { c: 0x9a7a52, c2: 0xe8d8b8, owl: true, s: 0.8 }, hover: 1.8, diet: ['meat'] });
D('parrot|macaw', 2, 'creature animal fly', 'bird', { v: { c: 0xe0402b, c2: 0xffd34d, wingC: 0x3f7be0, hook: true, crest: 0xffd34d, s: 0.7 }, hover: 1.8, diet: ['fruit', 'grain'] });
D('shark', 4, 'creature animal hostile predator', 'fishy', { v: { c: 0x7a8a9a, belly: 0xf4f2ee, fin: 0x6a7a8a, teeth: true, s: 2.4 }, power: 4, mass: 3, diet: ['meat', 'fish'] });
D('snake|python|cobra|serpent', 2, 'creature animal hostile', 'snake', { power: 2, diet: ['meat'] });
D('spider|tarantula', 2, 'creature animal hostile', 'spider', { power: 1, diet: ['bug'] });
D('frog|toad', 1, 'creature animal prey', 'frog', { fv: 0.5, diet: ['bug'] });
D('dragon', 7, 'creature flame hot fly hostile predator', 'dragon', { v: { s: 0.9 }, power: 9, mass: 6, flameR: 1.6, ride: true, hover: 0, diet: ['meat'] });
D('zombie', 3, 'creature hostile', 'person', { v: { skin: 0x8fbf7a, shirt: 0x6a7a5a, pants: 0x4a4a5a, hair: 0x3a3a2a, zombie: true }, power: 2, speed: 1.3, diet: ['meat'] });
D('ghost|spirit|phantom', 3, 'creature hostile', 'ghost', { power: 1, hover: 0.6, speed: 1.8 });
D('monster|beast|ogre', 4, 'creature hostile', 'monster', { power: 5, mass: 3, diet: ['meat', 'sweet'] });
D('troll', 5, 'creature hostile heavy', 'person', { v: { skin: 0x7a9a6a, shirt: 0x6a5a3a, pants: 0x4a3a2a, hair: false, nose: true, hold: 'club', scale: 1.6 }, power: 6, mass: 6, diet: ['meat'] });
D('robot|android|droid', 5, 'creature metal', 'robot', { power: 5, mass: 4 });

CAT = 'People';
D('person|human|man|woman|villager|friend|guy|lady', 2, 'creature person', 'person', { v: { shirt: 0x4f7be0 } });
D('kid|child|boy|girl|baby', 2, 'creature person', 'person', { v: { shirt: 0xffb14a, pants: 0x3a7bff, scale: 0.68 } });
D('firefighter|fireman|firewoman|firefighters', 4, 'creature person extinguish', 'person', { v: { shirt: 0xd8a02a, pants: 0x2a2e38, hat: 'fire', hold: 'hose', belt: 0x2a2e38 }, water: 3 });
D('knight|paladin', 5, 'creature person weapon armor', 'person', { v: { armor: true, hat: 'knight', hold: 'sword', pants: 0x6a7480 }, power: 4, armor: 2 });
D('wizard|mage|witch|sorcerer|warlock', 6, 'creature person weapon light magic', 'person', { v: { shirt: 0x6a3ad8, robe: true, hat: 'wizard', beard: true, hold: 'staff' }, power: 5, light: 4 });
D('diver|scuba diver|frogman', 3, 'creature person dive', 'person', { v: { shirt: 0x1d1e24, pants: 0x1d1e24, hat: 'mask', tank: true } });
D('chef|cook|baker', 3, 'creature person', 'person', { v: { shirt: 0xffffff, pants: 0x2a2e38, hat: 'chef' } });
D('police officer|police|cop|policeman|policewoman|officer|sheriff', 3, 'creature person weapon', 'person', { v: { shirt: 0x23305a, pants: 0x1a1f30, hat: 'cap', belt: 0x1d1e24 }, power: 3 });
D('pirate|captain', 3, 'creature person weapon', 'person', { v: { shirt: 0xf4f2ee, pants: 0x2a2e38, hat: 'tricorn', patch: true, hold: 'cutlass', belt: 0xd8302b }, power: 2.5 });
D('farmer', 2, 'creature person', 'person', { v: { shirt: 0xd8302b, pants: 0x3a6ad8, hat: 'straw' } });
D('doctor|nurse|medic|surgeon', 3, 'creature person heal', 'person', { v: { shirt: 0x7ad8c8, pants: 0x7ad8c8, coat: true } });
D('ninja|samurai', 4, 'creature person weapon', 'person', { v: { shirt: 0x1d1e24, pants: 0x1d1e24, hat: 'hood', hold: 'sword' }, power: 4 });
D('king|queen|prince|princess', 4, 'creature person', 'person', { v: { shirt: 0x8a2be2, robe: true, hat: 'crown' }, value: 2 });

CAT = 'Food';
D('apple|apples', 1, 'food fruit plant', 'apple', { food: 'fruit' });
D('banana|bananas', 1, 'food fruit plant', 'banana', { food: 'fruit' });
D('berries|berry|blueberries|strawberry|strawberries|grapes', 1, 'food fruit plant', 'berries', { food: 'fruit' });
D('carrot|carrots', 1, 'food veg plant', 'carrot', { food: 'veg' });
D('cheese', 1, 'food dairy', 'cheese', { food: 'dairy' });
D('bread|loaf|baguette|sandwich', 1, 'food grain', 'bread', { food: 'grain' });
D('cake|cupcake|birthday cake', 2, 'food sweet', 'cake', { food: 'sweet', fv: 1.5 });
D('pie|tart', 2, 'food sweet grain', 'pie', { food: 'sweet', fv: 1.5 });
D('cookie|cookies|biscuit|donut|doughnut', 1, 'food sweet grain', 'cookie', { food: 'sweet' });
D('ice cream|icecream|gelato', 2, 'food sweet cold', 'icecream', { food: 'sweet' });
D('honey|honey pot|honeypot|honey jar|honeycomb', 2, 'food honey sweet', 'honey', { food: 'honey' });
D('meat|steak|ham|bacon|sausage|drumstick|chicken leg|burger|hamburger', 2, 'food meat', 'meat', { food: 'meat' });
D('pizza', 2, 'food grain dairy', 'pizza', { food: 'grain', fv: 1.5 });
D('hay|haystack|hay bale|straw|grass', 1, 'food hay plant', 'hay', { food: 'hay', fv: 1.5, mass: 1.5 });
D('salad|lettuce|cabbage|vegetables|veggies|broccoli', 1, 'food veg plant', 'salad', { food: 'veg' });
D('bone|bones', 1, 'food bone', 'bone', { food: 'bone' });
D('egg|eggs', 1, 'food', 'egg', { food: 'egg' });
D('watermelon|melon|pumpkin', 2, 'food fruit plant', 'watermelon', { food: 'fruit', fv: 2, mass: 1.5 });
D('mushroom|mushrooms|toadstool', 1, 'food veg plant', 'mushroom', { food: 'veg' });
D('candy|sweets|lollipop|chocolate', 1, 'food sweet', 'candy', { food: 'sweet' });
D('fish|goldfish|salmon|trout|tuna|sardine', 1, 'food fish', 'fishfood', { food: 'fish' });

CAT = 'Treasure';
D('coin|coins|penny', 1, 'money metal', 'coin', { value: 1 });
D('gold|gold bar|gold bars|ingot|gold ingot', 3, 'money metal heavy', 'goldbar', { value: 5, mass: 3 });
D('gem|jewel|crystal|gemstone|emerald', 3, 'money stone light', 'gem', { value: 5, light: 2, v: { c: 0x3affa0 } });
D('diamond', 3, 'money stone light', 'gem', { value: 6, light: 2, v: { c: 0xeaf6ff } });
D('ruby', 3, 'money stone light', 'gem', { value: 5, light: 2, v: { c: 0xff2a4a } });
D('sapphire', 3, 'money stone light', 'gem', { value: 5, light: 2, v: { c: 0x3a6aff } });
D('treasure|treasure chest|chest|loot', 5, 'money wood heavy', 'treasure', { value: 10, mass: 4, light: 2 });
D('money|cash|dollars|banknotes|bills', 2, 'money cloth', 'cash', { value: 3 });
D('crown|tiara', 4, 'money metal', 'crown', { value: 6 });

CAT = 'Music & Toys';
D('ball|beach ball|football|soccer ball|basketball', 1, 'toy', 'ball');
D('teddy bear|teddy|plushie|stuffed animal|doll', 2, 'toy cloth', 'teddy');
D('kite', 2, 'toy cloth', 'kite');
D('flute|recorder|pan flute|whistle', 2, 'music wood', 'flute', { music: 'soft' });
D('guitar|lute|banjo|ukulele', 2, 'music wood', 'guitar', { music: 'soft' });
D('harp|lyre', 3, 'music wood', 'harp', { music: 'soft' });
D('violin|fiddle|cello', 2, 'music wood', 'violin', { music: 'soft' });
D('music box|lullaby|musicbox', 2, 'music toy', 'musicbox', { music: 'soft' });
D('piano|keyboard', 5, 'music wood heavy', 'piano', { music: 'soft', mass: 6 });
D('drum|drums|drum kit', 2, 'music loud', 'drum', { music: 'loud' });
D('trumpet|horn|trombone|tuba|bugle', 2, 'music metal loud', 'trumpet', { music: 'loud' });
D('bell|bells', 1, 'music metal loud', 'bell', { music: 'loud' });

CAT = 'Heavy Things';
D('anvil', 3, 'metal heavy', 'anvil', { mass: 6 });
D('rock|stone|pebble', 1, 'stone', 'rock', { mass: 2.5 });
D('boulder', 3, 'stone heavy', 'boulder', { mass: 7 });
D('car|automobile|truck|van|jeep', 5, 'metal vehicle heavy', 'car', { mass: 7, equip: 'ride' });
D('safe|strongbox', 4, 'metal heavy', 'safe', { mass: 7 });
D('crate|box|cardboard box', 1, 'wood', 'crate', { mass: 2 });
D('barrel|keg', 1, 'wood', 'barrel', { mass: 2.5 });
D('brick|bricks', 1, 'stone', 'brick', { mass: 1.5 });
D('statue|sculpture', 4, 'stone heavy', 'statue', { mass: 6 });
D('weight|weights|dumbbell|kettlebell', 2, 'metal heavy', 'weight', { mass: 4 });

CAT = 'Everyday';
D('tent', 3, 'shelter cloth', 'tent', { mass: 2 });
D('house|hut|cabin|cottage|home', 5, 'shelter wood heavy', 'house', { mass: 9 });
D('umbrella|parasol', 2, 'shelter cloth', 'umbrella', { equip: 'hand' });
D('flower|flowers|rose|tulip|daisy|sunflower', 1, 'plant', 'flower', { food: 'plant' });
D('bush|shrub|hedge', 1, 'plant', 'bush', { food: 'plant', mass: 1 });
D('cactus', 1, 'plant', 'cactus', { mass: 1 });
D('table|desk', 1, 'wood', 'table', { mass: 2 });
D('chair|stool|bench', 1, 'wood', 'chair', { mass: 1.5 });
D('bed', 2, 'wood cloth', 'bed', { mass: 3 });
D('first aid kit|medkit|bandage|first aid|medicine|bandages', 2, 'heal', 'medkit', { heal: 1 });
D('potion|elixir|health potion', 3, 'heal magic', 'potion', { heal: 2 });

// ---------------------------------------------------------------- adjectives
const ADJ = new Map();
const ADJ_LIST = [];
function A(names, cost, eff) {
  const list = names.split('|');
  const a = { name: list[0], names: list, cost, ...eff };
  ADJ_LIST.push(a);
  for (const n of list) ADJ.set(n, a);
}
const NONBURN = ['wood', 'plant', 'cloth', 'flammable'];
A('giant|huge|big|enormous|massive|gigantic|large|colossal', 2, { scale: 1.8, mul: { len: 1.8, climbH: 1.8, mass: 4, power: 2, dig: 2, drain: 2, water: 2, fv: 3, value: 2, reach: 2, light: 1.4, armor: 1.5, flameR: 1.5 } });
A('tiny|small|little|mini|miniature|teeny', 1, { scale: 0.55, mul: { len: 0.55, climbH: 0.55, mass: 0.25, power: 0.5, dig: 0.5, drain: 0.5, water: 0.5, fv: 0.4, value: 0.5, reach: 0.5, flameR: 0.6 } });
A('long|tall|extended|extra long|lengthy', 1, { stretch: 1.5, mul: { len: 1.5, climbH: 1.5 } });
A('short|stubby', 0, { stretch: 0.65, mul: { len: 0.65, climbH: 0.65 } });
A('metal|iron|steel|metallic|tin|aluminium|aluminum', 1, { mat: 'metal', add: ['metal'], rem: NONBURN.concat(['stone']), mul: { mass: 2, power: 1.25 } });
A('stone|rocky|marble|concrete|granite', 1, { mat: 'stone', add: ['stone'], rem: NONBURN.concat(['metal']), mul: { mass: 3 } });
A('wooden|wood|timber', 1, { mat: 'wood', add: ['wood'], rem: ['metal', 'stone', 'ice', 'fireproof'] });
A('golden|gold|gilded', 2, { mat: 'gold', add: ['metal', 'money'], rem: NONBURN.concat(['stone']), addv: { value: 5 }, mul: { mass: 2 } });
A('fireproof|nonflammable|heatproof|flameproof', 1, { add: ['fireproof'], rem: ['flammable'] });
A('flaming|burning|fiery|blazing|lit', 1, { add: ['flame', 'hot', 'light'], rem: ['cold', 'ice'], set: { light: 4 }, burn: true });
A('frozen|icy|frosty|ice', 1, { mat: 'ice', add: ['cold', 'ice'], rem: ['hot', 'flame', 'flammable', 'wood', 'cloth', 'plant'] });
A('glowing|shiny|bright|luminous|radiant|sparkly|sparkling|neon', 1, { add: ['light'], glow: true, set: { light: 5 } });
A('friendly|tame|kind|nice|gentle|happy|good|cute|peaceful|calm', 1, { rem: ['hostile'], add: ['friendly'] });
A('angry|evil|mean|hostile|scary|wild|vicious|fierce|mad|grumpy', 1, { add: ['hostile'], rem: ['friendly'], mul: { power: 1.5 } });
A('strong|mighty|powerful|super|tough|muscular', 2, { mul: { power: 2, dig: 2, reach: 2, drain: 2 } });
A('flying|winged|floating', 2, { add: ['fly'], wings: true });
A('heavy|weighted', 1, { mul: { mass: 3 } });
A('lightweight|feather|featherweight', 1, { mul: { mass: 0.3 } });
A('hot|warm|heated', 1, { add: ['hot'], rem: ['cold'] });
A('cold|chilly|freezing|cool', 1, { add: ['cold'], rem: ['hot'] });
A('electric|electrified|charged', 2, { add: ['electric', 'light'], glow: 0x9ff0ff, mul: { power: 1.5 }, set: { light: 3 } });
A('magic|magical|enchanted', 1, { add: ['magic', 'light'], glow: 0xd08aff, set: { light: 3 } });
A('sleepy|tired|lazy|drowsy', 1, { add: ['sleepy'] });
A('fast|quick|speedy|swift', 1, { mul: { speed: 1.8 } });
A('fat|plump|chubby', 1, { mul: { fv: 2, mass: 2 } });
A('loud|noisy', 0, { add: ['loud'] });
A('quiet|silent|soft|hushed', 0, { rem: ['loud'] });
A('baby|young', 1, { scale: 0.6, mul: { power: 0.4, mass: 0.3, fv: 0.5 }, rem: ['hostile'] });
const COLORS = { red: 0xe24a3b, orange: 0xf08a24, yellow: 0xffd34d, green: 0x4fb25a, blue: 0x3f7be0, purple: 0x8b5cf6, violet: 0x8b5cf6, pink: 0xff8fb1, black: 0x26272e, white: 0xf6f4f0, brown: 0x7a5233, gray: 0x8a8f98, grey: 0x8a8f98, silver: 0xc8d0da, teal: 0x2ab8a8, cyan: 0x3ad8f0, rainbow: 0xff6fd8 };
A(Object.keys(COLORS).join('|'), 0, { colour: true });

const STOP = new Set(['a', 'an', 'the', 'some', 'very', 'really', 'my', 'one', 'of', 'extra', 'please', 'with', 'made']);
function singulars(w) {
  const out = [w];
  if (w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ves')) out.push(w.slice(0, -3) + 'f');
  if (w.endsWith('es')) out.push(w.slice(0, -2));
  if (w.endsWith('s')) out.push(w.slice(0, -1));
  return out;
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function suggest(w) {
  let best = null, bd = 3;
  for (const k of [...WORDS.keys(), ...ADJ.keys()]) { if (k.length < 3) continue; const d = lev(w, k); if (d < bd) { bd = d; best = k; } }
  return w.length > 3 ? best : (bd <= 1 ? best : null);
}

function parse(text) {
  const raw = String(text || '').toLowerCase().replace(/[^a-z\s'-]/g, ' ').replace(/-/g, ' ').replace(/'/g, '').trim();
  if (!raw) return { error: 'Write a word first.' };
  const toks = raw.split(/\s+/).filter((w) => !STOP.has(w));
  if (!toks.length) return { error: 'Write a noun, like “ladder”.' };
  let def = null, nounLen = 0, nounText = '';
  for (let k = Math.min(4, toks.length); k >= 1 && !def; k--) {
    const head = toks.slice(toks.length - k, -1), last = toks[toks.length - 1];
    for (const s of singulars(last)) { const ph = [...head, s].join(' '); if (WORDS.has(ph)) { def = WORDS.get(ph); nounLen = k; nounText = ph; break; } }
  }
  if (!def) {
    const last = toks[toks.length - 1];
    if (ADJ.has(last)) return { error: `“${last}” describes something. Add a noun after it, like “${last} ladder”.` };
    const s = suggest(last);
    return { error: `The quill doesn’t know “${last}”.` + (s ? ` Did you mean “${s}”?` : ' Try a simpler everyday word.'), unknown: last };
  }
  const adjWords = toks.slice(0, toks.length - nounLen);
  const adjs = [];
  for (let i = 0; i < adjWords.length; i++) {
    let w = adjWords[i];
    if (i + 1 < adjWords.length && ADJ.has(w + ' ' + adjWords[i + 1])) { w = w + ' ' + adjWords[i + 1]; i++; }
    const a = ADJ.get(w);
    if (!a) { const s = suggest(w); return { error: `The quill doesn’t know the describing word “${w}”.` + (s ? ` Did you mean “${s}”?` : ''), unknown: w }; }
    adjs.push({ ...a, said: w });
  }
  if (adjs.length > 3) return { error: 'Use at most three describing words at once.' };
  const cost = def.cost + adjs.reduce((s, a) => s + a.cost, 0);
  const label = [...adjs.map((a) => a.said), nounText].join(' ');
  return { def, adjs, cost, label };
}

function makeProps(def, adjs) {
  const p = {
    name: def.name, tags: new Set(def.tags), scale: 1, stretch: 1, mass: def.mass ?? 1, len: def.len ?? 0, climbH: def.climbH ?? 0,
    power: def.power ?? 0, dig: def.dig ?? 0, water: def.water ?? 0, light: def.light ?? 0, fv: def.fv ?? (def.tags.includes('food') ? 1 : 0),
    value: def.value ?? 0, reach: def.reach ?? 0, drain: def.drain ?? 0, armor: def.armor ?? 0, speed: def.speed ?? 2.2, flameR: def.flameR ?? 1.2,
    heal: def.heal ?? 0, mat: null, colour: null, glow: false, wings: false, ignite: false, hover: def.hover, music: def.music ?? null, food: def.food ?? null,
  };
  for (const a of adjs) {
    if (a.scale) p.scale *= a.scale;
    if (a.stretch) p.stretch *= a.stretch;
    if (a.mul) for (const k in a.mul) p[k] *= a.mul[k];
    if (a.set) for (const k in a.set) p[k] = Math.max(p[k], a.set[k]);
    if (a.addv) for (const k in a.addv) p[k] += a.addv[k];
    if (a.add) a.add.forEach((t) => p.tags.add(t));
    if (a.rem) a.rem.forEach((t) => p.tags.delete(t));
    if (a.mat) p.mat = a.mat;
    if (a.colour) p.colour = COLORS[a.said] ?? COLORS[a.name];
    if (a.glow) p.glow = typeof a.glow === 'number' ? a.glow : true;
    if (a.wings) p.wings = true;
    if (a.burn) p.ignite = true;
  }
  const t = p.tags;
  if (t.has('loud') && p.music) p.music = 'loud';
  if (!t.has('loud') && p.music === 'loud' && adjs.some((a) => a.name === 'quiet')) p.music = 'soft';
  t.delete('flammable');
  if ((t.has('wood') || t.has('plant') || t.has('cloth')) && !t.has('metal') && !t.has('stone') && !t.has('ice') && !t.has('fireproof') && !t.has('creature')) t.add('flammable');
  if (t.has('flame') && !p.ignite) t.delete('flammable');
  if (p.ignite && t.has('flammable')) t.delete('flame');
  else if (p.ignite) p.ignite = false;
  if (t.has('light') && !p.light) p.light = 4;
  if (t.has('money') && !p.value) p.value = 1;
  if (t.has('ice') && !p.water) p.water = 0.5;
  p.equip = def.equip ?? null;
  if (t.has('fly') && !p.equip && !t.has('creature')) p.equip = (t.has('vehicle') || p.mass > 3) ? 'ride' : 'back';
  if (t.has('creature') && def.ride && !t.has('hostile')) p.equip = 'ride';
  if (t.has('fly') && p.hover == null) p.hover = t.has('creature') ? 1.8 : 1.2;
  if (p.mat === 'ice') { t.delete('flame'); }
  return p;
}
