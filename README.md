# Token Tycoons

An original AI-themed set-collecting card game for two phones (or one phone passed around).
Draw 2, play up to 3 cards a turn: build asset stacks, bank funding, and hit your rival with invoices,
lawsuits, poaching and hostile takeovers (or block theirs with a Guardrail). First to 3 complete stacks wins.

## Play on two phones

The game is a static web page. Host it with GitHub Pages:

1. Repo **Settings → Pages → Build and deployment → Deploy from a branch**.
2. Pick this branch and the `/ (root)` folder, then **Save**.
3. After a minute the game is live at `https://<owner>.github.io/<repo>/`.

Then one player taps **Host a game** and shares the 4-character code (or the invite link); the other
opens the same page, types the code and taps **Join**.

The phones talk directly to each other over WebRTC (PeerJS). The free public PeerJS service is used
only to introduce the two phones. Game state is saved on each phone, so a reload or a locked screen
resumes the same game.

## Files

- `index.html` – page and styles
- `engine.js` – rules (pure functions, shared by both phones)
- `app.js` – interface and phone-to-phone sync
- `vendor/peerjs.min.js` – PeerJS 1.5.4 (MIT)
- `test/simulate.js` – `node test/simulate.js` plays 2,000 bot games to check the rules and game length
