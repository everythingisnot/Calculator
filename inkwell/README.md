# Inkwell Isles

An original 3D word-puzzle game. Wren carries a quill that turns written words into real objects.
Write a noun (with up to three adjectives), then drag what appears onto the world to reach the Lumen on each floating isle.

- 12 isles plus a sandbox, 185 nouns (plus synonyms and plurals) and 29 adjective families
- Ink budget and par per isle, three hearts, star ratings saved in the browser
- Side effects: fire spreads, lava burns wood, goats eat ladders, gunpowder explodes, hostile animals chase you

## Run

Open `index.html` in a modern browser (WebGL required). Three.js r160 loads from jsDelivr.

## Edit

Source lives in `src/`: `shell.html` (markup and styles) and `src/js/*.js` (engine, models, dictionary, world,
entities, puzzle targets, levels, game). Run `./build.sh` to regenerate `index.html`.
