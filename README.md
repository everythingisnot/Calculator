# Token Tycoons

An original AI-themed property-trading board game for two phones (or one phone passed around).
Buy tiles across the AI stack, upgrade them, collect rent, and be the first to reach the net-worth goal.

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
- `test/simulate.js` – `node test/simulate.js` plays 1,200 bot games to check rules and game length
