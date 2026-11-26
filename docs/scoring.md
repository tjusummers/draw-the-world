# How drawings are scored

Everything runs in the browser. Photos are never uploaded anywhere.

1. **Find the ink.** The photo (cropped by the kid) is shrunk to at most 600 px, turned grey,
   and each pixel is marked as ink if it is clearly darker than its neighbourhood (adaptive
   threshold). This copes with pencil or pen and with uneven phone-photo lighting.
2. **Clean up.** Tiny specks are dropped, and big dark blobs touching the photo edge (table,
   shadow, paper edge) are removed.
3. **Normalise.** The ink's bounding box (ignoring outlier specks) is scaled into a 128×128
   grid, so where and how big the kid drew on the page does not matter. The reference
   drawing is rendered from the level's paths and goes through the same step.
4. **Align and compare.** We try small rotations (±12°), stretches (±19%) and shifts, and for
   each one measure, with distance transforms:
   - *precision*: how much of the kid's ink sits near a reference line, and
   - *recall*: how much of the reference is covered by the kid's ink.
   A line only gets full credit if it runs in roughly the same direction as the nearby
   reference line, which stops scribbles from scoring well. The best F-score
   (balance of the two) wins.
5. **Friendly score.** The raw F-score is mapped to 0–100 (raw 0.55 → 50%, 0.70 → 80%,
   0.90+ → 100%).

The result screen shows an overlay: the guide in blue, the kid's matching lines in green,
lines that wander off in orange. The tip shown below 80% depends on whether precision
(extra/wandering lines) or recall (missing parts) was lower.

## Tuning and tests

`npm test` simulates photos of hand drawings (wobbly lines, each part slightly
moved and resized, random tilt and size, pencil grey on off-white paper, a lighting
gradient, specks, and sometimes a dark table edge), and checks that:

- neat and typical kid copies of each level pass (≥ 80%),
- sloppy copies score lower but still above the wrong picture,
- the other levels' pictures fail (< 70%), scribbles fail (< 80%),
- blank paper is rejected with a "can't find your drawing" message.

## Limits

- It checks **shape and placement**, not creativity, line quality or style.
- Extra doodles, colouring in, shading, or a busy background count as extra lines and
  lower the score. Kids are asked to draw just the lines.
- Very faint pencil, strong shadows, lined/squared paper, or a photo at a steep angle can
  confuse it. Perspective is not corrected; the crop box helps with backgrounds.
- Mirror images and rotations beyond about ±12° are not matched (the *Turn photo* button
  fixes sideways photos).
- A drawing that has the big parts right but misses small details can still pass,
  because small parts have little ink.
- The 80% line was tuned on simulated drawings, not yet on real children's photos. Expect
  to adjust the curve in `friendlyScore` (`js/scoring.js`) after trying real drawings.
