# Draw the World ✏️

A level-up drawing game for elementary-school kids. Each level shows an animated
step-by-step demo, the kid draws it on paper, snaps a photo, and the app scores how
closely it matches. 80% or more passes and unlocks the next level; below that the kid
gets a "Good job" and can try again or move on anyway. Unlocked levels can be replayed
to beat the best score.

The voyage starts with simple lines and shapes and ends with manga-style characters,
so kids can eventually draw their favourite heroes (like the *One Piece* crew) as fan art.

**Playable now:** Level 1 *Sunny Sea*, Level 2 *Little Sailboat*, Level 3 *Cartoon Pirate Kid*.
Levels 4–12 are designed and shown on the map as "coming soon".

## Run it

No build step and no dependencies. Serve the folder with any static server, e.g.

```sh
npm start            # http://localhost:8080
# or: python3 -m http.server 8080
```

It also works as-is on GitHub Pages. (Opening `index.html` directly from disk will not
work, because the app uses JavaScript modules.)

On a phone, *Take or choose a photo* opens the camera.

## Test

```sh
npm install          # installs Playwright (tests only)
npx playwright install chromium
npm test
```

## Docs

- [Level design](docs/level-design.md): the full 12-level progression and the fan-art plan
- [Scoring](docs/scoring.md): how the photo comparison works and its limits

## Code map

| File | What it does |
|------|--------------|
| `js/levels.js` | Level data: steps, captions and SVG paths (shared by demo and scoring) |
| `js/demo.js` | Animated stroke-by-stroke demo player with read-aloud |
| `js/scoring.js` | Photo → ink → normalise → align → score, all in the browser |
| `js/progress.js` | Unlocks and best scores, saved in localStorage |
| `js/app.js` | Map, level page, photo crop, results |
| `tests/` | Static server, simulated-photo scoring tests, end-to-end flow test |

## Artwork

All drawings are original. The app does not include official One Piece artwork, logos,
or traced character images.
