// ======================================================================
// Levels. Islands are visual; zones are walkable areas joined by links.
// Each link is opened by solving its target.
// ======================================================================
const LEVELS = [
  {
    id: 1, name: 'First Words', biome: 'meadow', seed: 3, ink: 8, par: 2,
    story: 'The Lumen sits on a grassy ledge, 3 metres up. Wren can’t jump that high. Write something to climb.',
    hints: ['Wren needs something to climb up a 3 m ledge.', 'Write “ladder”, then drag it onto the glowing dots by the ledge.'],
    start: [-6, 0.5], lumen: { x: 6, z: 0 },
    islands: [{ x0: -9, x1: 2, z0: -4, z1: 4, h: 0, trees: 0.06 }, { x0: 2, x1: 8, z0: -3.2, z1: 3.2, h: 3, trees: 0.05 }],
    zones: [{ id: 'A', x0: -9, x1: 2, z0: -4, z1: 4, h: 0 }, { id: 'B', x0: 2, x1: 8, z0: -3.2, z1: 3.2, h: 3 }],
    links: [{ a: 'A', b: 'B', kind: 'cliff', pa: [1.1, 0], pb: [2.8, 0], target: 'ledge' }],
    targets: [{ id: 'ledge', type: 'cliff', wallX: 2, dir: 1, lowH: 0, H: 3, z: 0, goal: 'Climb the 3 m ledge' }],
    cam: { target: [0, 1.2, 0], dist: 24 },
  },
  {
    id: 2, name: 'Cloudgap', biome: 'meadow', seed: 8, ink: 8, par: 2,
    story: 'Two isles drift 3.2 metres apart. Not every plank is long enough to cross. Tap any object to see how far it spans.',
    hints: ['Tap an object to see its stats. A bridge must span the 3.2 m gap plus a little extra on each side.', 'A log spans 3.8 m. So does a long plank.'],
    start: [-7, 0], lumen: { x: 5, z: 0 },
    islands: [{ x0: -10, x1: -2, z0: -4, z1: 4, h: 0, trees: 0.06 }, { x0: 1.2, x1: 8, z0: -3.5, z1: 3.5, h: 0, trees: 0.05 }],
    zones: [{ id: 'A', x0: -10, x1: -2, z0: -4, z1: 4, h: 0 }, { id: 'B', x0: 1.2, x1: 8, z0: -3.5, z1: 3.5, h: 0 }],
    links: [{ a: 'A', b: 'B', kind: 'gap', pa: [-2.3, 0], pb: [1.5, 0], target: 'gap' }],
    targets: [{ id: 'gap', type: 'gap', a: [-2, 0], b: [1.2, 0], h: 0, goal: 'Bridge the 3.2 m gap' }],
    cam: { target: [-0.5, 0.8, 0], dist: 24 },
  },
  {
    id: 3, name: 'Hearthfire', biome: 'golden', seed: 21, ink: 10, par: 3,
    story: 'A spark from the chimney set Mabel’s cottage alight. She will give Wren the Lumen if the fire goes out. Big fires need a lot of water, and fire spreads to anything wooden.',
    hints: ['One splash of water isn’t enough for a fire this big, and the flames grow back.', 'Try a fire extinguisher, a water bucket, a hose or a rain cloud.'],
    start: [-7, 0], lumen: { x: 7.2, z: -0.4, hidden: true },
    islands: [{ x0: -10, x1: 10, z0: -5, z1: 5, h: 0, trees: 0.04 }],
    zones: [{ id: 'A', x0: -10, x1: 10, z0: -5, z1: 5, h: 0 }],
    targets: [
      { id: 'fire', type: 'fire', x: 3.4, z: -1.8, r: 2.5, hp: 3, regen: 0.12, goal: 'Put out the cottage fire', reward: { lumen: [7.2, -0.4] }, solved: 'The fire is out! Mabel thanks Wren and hands over the Lumen.' },
      { id: 'mabel', type: 'npc', kind: 'person', v: { shirt: 0x8a5ad8, pants: 0x3a3048, hair: 0x8a8a96 }, x: 7.6, z: 1.8, face: -2.4, cheerOn: 'fire', worried: true },
    ],
    things: [{ w: 'hay', x: 5.4, z: -3.4 }, { w: 'barrel', x: 0.8, z: -3.6 }],
    cam: { target: [1, 1.5, 0], dist: 25 },
  },
  {
    id: 4, name: 'Bear Pass', biome: 'autumn', seed: 34, ink: 12, par: 4,
    story: 'A grumpy, hungry bear sits in the only pass through the woods. Past it, a 4 m ledge leads to the Lumen. Weapons only make bears angrier, unless they’re strong enough.',
    hints: ['Bears are always hungry. What do bears love to eat?', 'The ledge is 4 m. Stairs reach 3.6 m; a ladder reaches 4.2 m.'],
    start: [-7, 0], lumen: { x: 7.5, z: 0 },
    islands: [{ x0: -10, x1: 4, z0: -4, z1: 4, h: 0, trees: 0.08 }, { x0: 4, x1: 10, z0: -3, z1: 3, h: 4, trees: 0.05 }],
    zones: [{ id: 'A', x0: -10, x1: -0.8, z0: -4, z1: 4, h: 0 }, { id: 'B', x0: -0.8, x1: 4, z0: -4, z1: 4, h: 0 }, { id: 'C', x0: 4, x1: 10, z0: -3, z1: 3, h: 4 }],
    links: [{ a: 'A', b: 'B', kind: 'walk', pa: [-1.6, 0], pb: [0.6, 0], target: 'bear', flyable: true }, { a: 'B', b: 'C', kind: 'cliff', pa: [3.1, 0], pb: [4.8, 0], target: 'ledge' }],
    targets: [
      { id: 'bear', type: 'creature', kind: 'bear', x: -0.4, z: 0, power: 5, diet: ['fish', 'honey', 'fruit', 'meat'], minFood: 1, aside: [-0.4, 3.0], face: -Math.PI / 2, r: 2.3, label: 'Hungry bear · <b>power 5</b>', goal: 'Get past the hungry bear', block: 'A hungry bear blocks the pass.', dietHint: 'Bears like honey, fish, berries and meat.', labelY: 2.9 },
      { id: 'ledge', type: 'cliff', wallX: 4, dir: 1, lowH: 0, H: 4, z: 0, goal: 'Climb the 4 m ledge' },
    ],
    props: [{ p: 'boulders', x: -0.6, z: -2.9 }, { p: 'boulders', x: -0.6, z: 3.1 }],
    cam: { target: [0, 1.6, 0], dist: 26 },
  },
  {
    id: 5, name: 'Lantern Cave', biome: 'night', seed: 52, ink: 12, par: 4,
    story: 'The Lumen glows deep inside a cave, behind an iron gate. Wren won’t step into the dark without a light.',
    hints: ['Carry a light, or place one at the cave mouth. Anything that glows brightly works.', 'Gates open with keys. Explosives work too, but they’re loud.'],
    start: [-7, 0], lumen: { x: 8, z: 0 },
    islands: [{ x0: -10, x1: 10, z0: -4, z1: 4, h: 0, trees: 0.07 }],
    zones: [{ id: 'A', x0: -10, x1: -1, z0: -4, z1: 4, h: 0 }, { id: 'B', x0: -1, x1: 5, z0: -3.2, z1: 3.2, h: 0 }, { id: 'C', x0: 5, x1: 10, z0: -3.2, z1: 3.2, h: 0 }],
    links: [{ a: 'A', b: 'B', kind: 'walk', pa: [-1.7, 0], pb: [-0.2, 0], target: 'dark' }, { a: 'B', b: 'C', kind: 'walk', pa: [4.3, 0], pb: [5.7, 0], target: 'gate' }],
    targets: [
      { id: 'dark', type: 'dark', x: -1.7, z: 0, r: 2.2, area: [-1, 10, -3.6, 3.6], goal: 'Light the cave' },
      { id: 'gate', type: 'lock', x: 5, z: 0, span: 6.8, goal: 'Open the iron gate' },
    ],
    props: [{ p: 'cave', x0: -1, x1: 10, z0: -4, z1: 4 }],
    ambient: 'fireflies',
    cam: { target: [0, 1.2, 0], dist: 25 },
  },
  {
    id: 6, name: 'Frostgate', biome: 'frost', seed: 61, ink: 14, par: 6,
    story: 'A wall of ice seals the pass, and beyond it is a 4.5 m gap. An icy gale blows across the whole isle, so nothing can fly.',
    hints: ['Anything hot melts ice. It doesn’t have to be a flame.', 'The gap is 4.5 m. Check the span of each bridge word before you spend ink.'],
    rules: { noFly: 'An icy gale blows here. Anything that flies is pushed back.' },
    start: [-7, 0], lumen: { x: 8, z: 0 },
    islands: [{ x0: -10, x1: 1, z0: -4, z1: 4, h: 0, trees: 0.07 }, { x0: 5.5, x1: 10, z0: -3.5, z1: 3.5, h: 0, trees: 0.05 }],
    zones: [{ id: 'A', x0: -10, x1: -1.5, z0: -4, z1: 4, h: 0 }, { id: 'B', x0: -1.5, x1: 1, z0: -4, z1: 4, h: 0 }, { id: 'C', x0: 5.5, x1: 10, z0: -3.5, z1: 3.5, h: 0 }],
    links: [{ a: 'A', b: 'B', kind: 'walk', pa: [-2.4, 0], pb: [-0.6, 0], target: 'ice' }, { a: 'B', b: 'C', kind: 'gap', pa: [0.7, 0], pb: [5.8, 0], target: 'gap' }],
    targets: [
      { id: 'ice', type: 'ice', x: -1.5, z: 0, r: 1.9, span: 8, goal: 'Get through the ice wall' },
      { id: 'gap', type: 'gap', a: [1, 0], b: [5.5, 0], h: 0, goal: 'Bridge the 4.5 m gap' },
    ],
    ambient: 'snow',
    cam: { target: [0, 1.2, 0], dist: 25 },
  },
  {
    id: 7, name: 'Sunken Lumen', biome: 'lagoon', seed: 77, ink: 14, par: 3,
    story: 'The Lumen fell into the lagoon and is stuck in a heavy iron cage, 3 m down. A shark circles the water.',
    hints: ['The cage is made of iron. What sticks to iron?', 'Divers need protection from the shark. You could also deal with the shark first, or drain the lagoon.'],
    start: [-7, 1], lumen: { x: 3, z: 3.6, hidden: true },
    islands: [{ x0: -10, x1: 10, z0: -5, z1: 5, h: 0, trees: 0.05 }],
    zones: [{ id: 'A', x0: -10, x1: 10, z0: -5, z1: 5, h: 0 }],
    targets: [{ id: 'lake', type: 'lake', x: 3, z: -0.8, r: 3, shark: true, shore: [3, 3.4], pull: 3, goal: 'Raise the sunken Lumen' }],
    cam: { target: [0, 0.8, 0.5], dist: 24 },
  },
  {
    id: 8, name: 'Troll Toll', biome: 'highland', seed: 88, ink: 16, par: 4,
    story: 'A 5 m cliff, then a stone bridge guarded by a troll. The toll is 5 gold. The troll swats anything that flies, and loud noises make it angry.',
    hints: ['The cliff is 5 m. A ladder reaches only 4.2 m. A rope reaches 5 m.', 'Trolls love gold, big meals and lullabies.'],
    rules: { noFly: 'The troll swats anything that flies over the bridge.' },
    start: [-7, 0], lumen: { x: 8.5, z: 0 },
    islands: [{ x0: -10, x1: -4, z0: -4, z1: 4, h: 0, trees: 0.08 }, { x0: -4, x1: 2.5, z0: -3.5, z1: 3.5, h: 5, trees: 0.06 }, { x0: 6, x1: 10, z0: -3, z1: 3, h: 5, trees: 0.06 }],
    surfaces: [{ x0: 2.4, x1: 6.1, z0: -0.95, z1: 0.95, h: 5 }],
    zones: [{ id: 'A', x0: -10, x1: -4, z0: -4, z1: 4, h: 0 }, { id: 'B', x0: -4, x1: 2.5, z0: -3.5, z1: 3.5, h: 5 }, { id: 'C', x0: 6, x1: 10, z0: -3, z1: 3, h: 5 }],
    links: [{ a: 'A', b: 'B', kind: 'cliff', pa: [-4.9, 0], pb: [-3.2, 0], target: 'ledge' }, { a: 'B', b: 'C', kind: 'walk', pa: [2.1, 0], pb: [6.4, 0], target: 'troll' }],
    targets: [
      { id: 'ledge', type: 'cliff', wallX: -4, dir: 1, lowH: 0, H: 5, z: 0, goal: 'Climb the 5 m cliff' },
      { id: 'troll', type: 'creature', kind: 'troll', x: 4.2, z: 0, power: 6, diet: ['meat'], minFood: 2, toll: 5, sleepy: true, loud: 'anger', aside: [7.2, 2.2], face: -Math.PI / 2, r: 2.2, label: 'Bridge troll · <b>toll 5 gold</b>', goal: 'Get past the bridge troll', block: 'The troll blocks the bridge. “Toll’s five gold!”', dietHint: 'It only eats meat.', labelY: 3.6, fedMsg: 'The troll munches happily and waddles aside.' },
    ],
    props: [{ p: 'stonebridge', x0: 2.5, x1: 6, z: 0, h: 5 }],
    cam: { target: [0, 3, 0], dist: 28 },
  },
  {
    id: 9, name: 'Powder Mill', biome: 'golden', seed: 93, ink: 16, par: 5,
    story: 'A boulder blocks the road to the mill, right next to a stack of gunpowder barrels. Beyond it, a portcullis opens only when something heavy presses its plate.',
    hints: ['Fire or explosives near the gunpowder will end badly. Dig instead.', 'The plate needs weight 5. Tap an object to check what it weighs.'],
    start: [-7, 0], lumen: { x: 7.5, z: 1.6 },
    islands: [{ x0: -10, x1: 10, z0: -5, z1: 5, h: 0, trees: 0.05 }],
    zones: [{ id: 'A', x0: -10, x1: -2, z0: -5, z1: 5, h: 0 }, { id: 'B', x0: -2, x1: 4, z0: -5, z1: 5, h: 0 }, { id: 'C', x0: 4, x1: 10, z0: -5, z1: 5, h: 0 }],
    links: [{ a: 'A', b: 'B', kind: 'walk', pa: [-3.2, 0], pb: [-0.8, 0], target: 'boulder' }, { a: 'B', b: 'C', kind: 'walk', pa: [3.3, 0], pb: [4.7, 0], target: 'plate' }],
    targets: [
      { id: 'boulder', type: 'boulder', x: -2, z: 0, r: 2.2, goal: 'Clear the boulder' },
      { id: 'powder', type: 'powder', x: -0.6, z: -3.3, r: 3.8 },
      { id: 'plate', type: 'plate', x: 1, z: 2.6, mass: 5, gate: { x: 4, z: 0, span: 9.4 }, goal: 'Hold down the pressure plate' },
    ],
    props: [{ p: 'boulders', x: -2.2, z: -3.4 }, { p: 'boulders', x: -2.1, z: 3.4 }, { p: 'windmill', x: 7.6, z: -2.6 }],
    cam: { target: [0, 1.2, 0], dist: 26 },
  },
  {
    id: 10, name: 'Goat Terraces', biome: 'meadow', seed: 101, ink: 18, par: 6,
    story: 'Two ledges lead up to the Lumen. A hungry goat lives on the middle terrace and chews anything made of wood, plants or cloth, ladders included. Mountain winds make flying impossible.',
    hints: ['The goat eats wood, plants and cloth. Feed it first, or climb with something it can’t chew.', 'Try a metal ladder. Or drop some hay near the goat and wait for it to doze off.'],
    rules: { noFly: 'Strong mountain winds make flying impossible here.' },
    start: [-7, 0], lumen: { x: 6.5, z: 0 },
    islands: [{ x0: -10, x1: -3, z0: -4, z1: 4, h: 0, trees: 0.07 }, { x0: -3, x1: 3, z0: -4, z1: 4, h: 3.5, trees: 0.03 }, { x0: 3, x1: 9, z0: -3, z1: 3, h: 7.5, trees: 0.05 }],
    zones: [{ id: 'A', x0: -10, x1: -3, z0: -4, z1: 4, h: 0 }, { id: 'B', x0: -3, x1: 3, z0: -4, z1: 4, h: 3.5 }, { id: 'C', x0: 3, x1: 9, z0: -3, z1: 3, h: 7.5 }],
    links: [{ a: 'A', b: 'B', kind: 'cliff', pa: [-3.9, 0], pb: [-2.2, 0], target: 'c1' }, { a: 'B', b: 'C', kind: 'cliff', pa: [2.1, 0], pb: [3.8, 0], target: 'c2' }],
    targets: [
      { id: 'c1', type: 'cliff', wallX: -3, dir: 1, lowH: 0, H: 3.5, z: 0, goal: 'Climb to the middle terrace' },
      { id: 'c2', type: 'cliff', wallX: 3, dir: 1, lowH: 3.5, H: 4, z: 0, goal: 'Climb to the top terrace' },
      { id: 'goat', type: 'creature', kind: 'goat', x: 0, z: 1.5, h: 3.5, power: 2, diet: ['hay', 'veg', 'fruit', 'plant'], minFood: 1, eater: true, roam: [-2.5, 2.4, -3.2, 3.2], sleepAfterFood: true, face: 0, r: 1.8, label: 'Hungry goat', labelY: 1.9, retaliate: true, fedMsg: 'The goat finishes its snack and dozes off.' },
    ],
    cam: { target: [0, 3.5, 0], dist: 29 },
  },
  {
    id: 11, name: 'Dragon’s Roost', biome: 'ember', seed: 111, ink: 22, par: 8,
    story: 'A river of lava, then a dragon. Wood bursts into flames over the lava. The dragon is immune to fire, weak to cold, and never says no to a very big meal.',
    hints: ['A bridge over lava must not burn. Try a material that can’t catch fire.', 'Dragons sleep to soft music. They need a huge meal (food value 3+). Cold weapons hit them twice as hard.'],
    rules: { noFly: 'The dragon scorches anything that flies.' },
    start: [-7, 0], lumen: { x: 8.5, z: 0 },
    islands: [{ x0: -10, x1: -2, z0: -4, z1: 4, h: 0, trees: 0.06 }, { x0: 1.8, x1: 10, z0: -4, z1: 4, h: 0, trees: 0.04 }],
    lava: [{ x0: -2.2, x1: 2, z0: -4.5, z1: 4.5, y: -1.6 }],
    zones: [{ id: 'A', x0: -10, x1: -2, z0: -4, z1: 4, h: 0 }, { id: 'B', x0: 1.8, x1: 4.2, z0: -4, z1: 4, h: 0 }, { id: 'C', x0: 4.2, x1: 10, z0: -4, z1: 4, h: 0 }],
    links: [{ a: 'A', b: 'B', kind: 'gap', pa: [-2.3, 0], pb: [2.1, 0], target: 'gap' }, { a: 'B', b: 'C', kind: 'walk', pa: [3.4, 0], pb: [6.6, 0], target: 'dragon' }],
    targets: [
      { id: 'gap', type: 'gap', a: [-2, 0], b: [1.8, 0], h: 0, lava: true, goal: 'Cross the lava' },
      { id: 'dragon', type: 'creature', kind: 'dragon', x: 5.2, z: 0, power: 9, diet: ['meat'], minFood: 3, sleepy: true, fireproof: true, coldWeak: true, burnR: 2.6, breath: true, aside: [7.4, 3.0], scale: 1.25, face: -Math.PI / 2, r: 2.6, label: 'Dragon · <b>power 9</b>', goal: 'Get past the dragon', block: 'The dragon blocks the way, smoke curling from its nostrils.', dietHint: 'Dragons only eat meat.', labelY: 3.8, fedMsg: 'The dragon gulps it down, curls up and goes to sleep.', sleepAfterFood: true },
    ],
    cam: { target: [0, 1.2, 0], dist: 26 },
  },
  {
    id: 12, name: 'The Last Page', biome: 'night', seed: 121, ink: 26, par: 12,
    story: 'The final isle has everything: a dark tunnel, a wall of ice, a river of lava and a locked vault. Ink storms swirl overhead, so nothing can fly. Plan your words carefully.',
    hints: ['Four obstacles: darkness, ice, lava and a lock. Plan your ink before you write.', 'Some solutions do two jobs. A lantern gives light but doesn’t melt ice. A flaming object might burn a bridge.'],
    rules: { noFly: 'Ink storms swirl above the last isle. Nothing can fly here.' },
    start: [-8.5, 0], lumen: { x: 9.8, z: 0 },
    islands: [{ x0: -11, x1: 1, z0: -4, z1: 4, h: 0, trees: 0.06 }, { x0: 5, x1: 11, z0: -3.5, z1: 3.5, h: 0, trees: 0.02 }],
    lava: [{ x0: 0.8, x1: 5.2, z0: -4.5, z1: 4.5, y: -1.6 }],
    zones: [{ id: 'A', x0: -11, x1: -5, z0: -4, z1: 4, h: 0 }, { id: 'B', x0: -5, x1: -1, z0: -3.4, z1: 3.4, h: 0 }, { id: 'Cz', x0: -1, x1: 1, z0: -3.4, z1: 3.4, h: 0 }, { id: 'D', x0: 5, x1: 8, z0: -3.4, z1: 3.4, h: 0 }, { id: 'E', x0: 8, x1: 11, z0: -3.4, z1: 3.4, h: 0 }],
    links: [
      { a: 'A', b: 'B', kind: 'walk', pa: [-5.7, 0], pb: [-4.3, 0], target: 'dark' },
      { a: 'B', b: 'Cz', kind: 'walk', pa: [-1.8, 0], pb: [-0.3, 0], target: 'ice' },
      { a: 'Cz', b: 'D', kind: 'gap', pa: [0.7, 0], pb: [5.3, 0], target: 'gap' },
      { a: 'D', b: 'E', kind: 'walk', pa: [7.3, 0], pb: [8.7, 0], target: 'vault' },
    ],
    targets: [
      { id: 'dark', type: 'dark', x: -5.7, z: 0, r: 2.2, area: [-5, 11, -3.6, 3.6], goal: 'Light the tunnel' },
      { id: 'ice', type: 'ice', x: -1, z: 0, r: 1.9, span: 7, goal: 'Get through the ice' },
      { id: 'gap', type: 'gap', a: [1, 0], b: [5, 0], h: 0, lava: true, goal: 'Cross the lava' },
      { id: 'vault', type: 'lock', x: 8, z: 0, span: 6.8, label: 'Vault gate', goal: 'Open the vault' },
    ],
    props: [{ p: 'cave', x0: -5, x1: 1, z0: -4, z1: 4 }, { p: 'cave', x0: 5, x1: 11, z0: -3.5, z1: 3.5 }],
    ambient: 'fireflies',
    cam: { target: [0, 1.2, 0], dist: 29 },
  },
];
const SANDBOX = {
  id: 0, name: 'Free Write', biome: 'meadow', seed: 5, ink: Infinity, par: Infinity, sandbox: true,
  story: 'A big quiet isle with unlimited ink. Try out words, watch fire spread, feed animals and see what happens.',
  hints: ['Combine adjectives: “giant friendly dragon”, “tiny flaming sponge”, “metal flying cow”.', 'Drop gear onto Wren to equip it. Drop a medkit on Wren to heal.'],
  start: [-6, 2], lumen: null,
  islands: [{ x0: -12, x1: 6, z0: -7, z1: 7, h: 0, trees: 0.03 }, { x0: 6, x1: 12, z0: -6, z1: 6, h: 3, trees: 0.04 }],
  zones: [{ id: 'A', x0: -12, x1: 6, z0: -7, z1: 7, h: 0 }, { id: 'B', x0: 6, x1: 12, z0: -6, z1: 6, h: 3 }],
  links: [{ a: 'A', b: 'B', kind: 'cliff', pa: [5.1, 0], pb: [6.8, 0], target: 'ledge' }],
  targets: [{ id: 'ledge', type: 'cliff', wallX: 6, dir: 1, lowH: 0, H: 3, z: 0 }],
  decorLake: { x: -5, z: -3.5, r: 2.2 },
  cam: { target: [0, 1, 0], dist: 30 },
};

// --------------------------------------------------------------- level props
function buildProp(world, pr) {
  const g = world.group, pal = world.pal;
  if (pr.p === 'boulders') { for (let i = 0; i < 3; i++) P(dode(0.7 - i * 0.15), M(pal.rock2, { r: 0.9, flat: 1 }), pr.x + (i - 1) * 0.5, 0.5 - i * 0.1, pr.z + (i % 2 ? 0.4 : -0.3), g, i, i * 2, 0, [1.1, 0.9, 1.2]); return [[pr.x, pr.z, 1.2]]; }
  if (pr.p === 'cave') {
    const m = M(pal.rock2, { r: 0.9, flat: 1 }), m2 = M(pal.rock, { r: 0.9, flat: 1 });
    const len = pr.x1 - pr.x0, n = Math.ceil(len / 1.4);
    for (const z of [pr.z0 + 0.2, pr.z1 - 0.2]) for (let i = 0; i <= n; i++) P(dode(0.9 + Math.sin(i * 3.1) * 0.25), i % 2 ? m : m2, pr.x0 + i * len / n, 1.0 + Math.cos(i * 2.3) * 0.4, z, g, i, i * 1.3, 0, [1, 1.7, 0.8]);
    for (const z of [pr.z0 + 0.4, pr.z1 - 0.4]) P(dode(1.1), m, pr.x0, 2.0, z, g, 0.4, 0.2, 0, [0.9, 2.2, 0.9]);
    P(box(1.2, 0.9, pr.z1 - pr.z0, 0.35), m2, pr.x0, 3.9, (pr.z0 + pr.z1) / 2, g);
    for (let i = 0; i < 6; i++) P(octa(0.25 + (i % 3) * 0.1), M(0xffffff, { e: [0x7af0ff, 0xc89aff][i % 2], ei: 2 }), pr.x0 + 1 + i * (len - 2) / 6, 0.3, (i % 2 ? pr.z0 + 0.9 : pr.z1 - 0.9), g, 0.3, i, 0.2, [1, 1.8, 1]);
    return [[pr.x0, (pr.z0 + pr.z1) / 2, 0.1]];
  }
  if (pr.p === 'stonebridge') {
    const m = M(0xa8a29a, { r: 0.85, flat: 1 }), len = pr.x1 - pr.x0, cx = (pr.x0 + pr.x1) / 2;
    P(box(len + 0.4, 0.5, 1.9, 0.08), m, cx, pr.h - 0.25, pr.z, g);
    for (const z of [-0.85, 0.85]) for (let i = 0; i <= 5; i++) P(box(0.3, 0.45, 0.3, 0.06), m, pr.x0 + i * len / 5, pr.h + 0.22, pr.z + z, g);
    P(cyl(1.2, 1.2, 1.7, 24, false), m, cx, pr.h - 1.0, pr.z, g, Math.PI / 2, 0, 0, [1.2, 1, 0.5]);
    return [];
  }
  if (pr.p === 'windmill') {
    const w = new THREE.Group(); w.position.set(pr.x, 0, pr.z); g.add(w);
    P(cyl(1.0, 1.4, 4.2, 10), M(0xf0e2c8, { r: 0.85 }), 0, 2.1, 0, w);
    P(cone(1.3, 1.3, 10), M(0xb8483a, { r: 0.7 }), 0, 4.85, 0, w);
    P(box(0.5, 0.9, 0.1, 0.03), M(0x7a4a2a, {}), 0, 0.45, 1.25, w);
    const blades = new THREE.Group(); blades.position.set(0, 3.6, 1.25); w.add(blades);
    for (let i = 0; i < 4; i++) { const b = new THREE.Group(); b.rotation.z = i * Math.PI / 2; blades.add(b); P(box(0.12, 3.0, 0.06, 0.02), M(C.woodD, {}), 0, 1.6, 0, b); P(box(0.6, 2.4, 0.03, 0.01), M(0xf6f0e4, { r: 0.9 }), 0.36, 1.8, 0, b); }
    world.anims.push((t, dt) => { blades.rotation.z += dt * 0.8; });
    return [[pr.x, pr.z, 1.8]];
  }
  return [];
}
