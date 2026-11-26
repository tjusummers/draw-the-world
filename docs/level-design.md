# Level design

The game is a voyage across four worlds. Each level teaches one new idea and
reuses everything from earlier levels. Every level follows the same loop:

1. **Watch** an animated, stroke-by-stroke demo (with optional read-aloud and slow motion).
2. **Draw** it on paper.
3. **Photo**: upload or take a photo, line up the crop box, press *Check my drawing*.
4. **Score**: 80% or more passes, earns stars and unlocks the next level. Below 80% the kid
   gets a "Good job" with a tip, and can draw again or move on anyway (which also unlocks
   the next level). Unlocked levels can always be replayed; the best score is kept.

Stars: 80–87% ★, 88–94% ★★, 95%+ ★★★.

## World 1: Line Land (ages ~6+) — playable now

| # | Level | Skill | What's drawn |
|---|-------|-------|--------------|
| 1 | Sunny Sea | Straight lines, wavy lines, a circle | Horizon, waves, sun with rays |
| 2 | Little Sailboat | Combining shapes | Trapezoid hull, mast, two triangle sails, flag, round windows, waves |
| 3 | Cartoon Pirate Kid | A cartoon face with manga-style spiky hair | Round head, ears, spiky hair, zigzag fringe, oval eyes with shines, eyebrows, nose, big grin |

## World 2: Cartoon Cove (planned)

| # | Level | Skill |
|---|-------|-------|
| 4 | Feelings Faces | Happy, sad, angry, surprised: how eyebrows, eyes and mouths change |
| 5 | Bean Buddies | Bean-shaped bodies with stick arms and legs; 3-heads-tall chibi proportions |
| 6 | Hands and Feet | Mitten hands, simple fingers, boots and sandals |

## World 3: Manga Island (planned)

| # | Level | Skill |
|---|-------|-------|
| 7 | Manga Head | Cross guidelines, chin shapes, where eyes/nose/mouth sit |
| 8 | Big Manga Eyes | Eye shapes, shines, eyelashes; spiky, swept and messy hairstyles |
| 9 | Action Pose | The line of action: running, jumping, punching, stretching |
| 10 | Clothes and Props | Open shirts, shorts, sandals, hats, swords, cloth folds |

## World 4: Grand Voyage (planned)

| # | Level | Skill |
|---|-------|-------|
| 11 | My Pirate Crew | Design an original pirate character: silhouette, signature item, expression |
| 12 | Fan-Art Studio | Draw favourite manga heroes (e.g. from *One Piece*) in scenes: sailing, feasting, battling |

### About One Piece and fan art

The goal is that kids can draw the characters they love. The app teaches the
*style* (round faces, big grins, spiky hair, dynamic poses, bold outlines)
with **original** reference drawings only. It does not bundle official
One Piece artwork, logos, or traced character images. In the Fan-Art Studio,
kids use their own manga books as reference and the app guides the
construction (head shape → guidelines → features → hair → body pose). Since
there is no bundled target image, fan-art levels will be scored by a
step checklist and self-review rather than photo similarity, or by comparing
against the kid's own earlier construction sketch.

## Adding a level

Levels live in `js/levels.js`. A level is a list of steps; each step has a
sentence (`say`) and SVG paths on a 400×400 canvas. The same paths drive
both the demo animation and the scoring reference, so adding paths is all it
takes. Run `npm test` afterwards: the scoring tests check every playable level.
