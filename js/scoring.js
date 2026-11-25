// Drawing similarity scoring, fully in the browser (no uploads to a server).
//
// Pipeline
//   1. Ink detection: grayscale + adaptive threshold (local mean), so pencil
//      and marker both work and uneven phone-photo lighting is tolerated.
//   2. Clean-up: drop tiny specks, and drop big dark blobs touching the photo
//      edge (the table, a shadow, the paper border).
//   3. Normalise: crop to the ink's bounding box (ignoring outlier specks) and
//      fit it into a small square grid, so size and position on the paper
//      don't matter.
//   4. Align and compare: try small shifts, stretches and rotations; for each,
//      measure how much of the kid's ink lies near the reference lines
//      (precision) and how much of the reference is covered by the kid's ink
//      (recall), using distance transforms. The best F-score wins.
//   5. Map the raw F-score to a friendly 0-100 score.
//
// Limits (also in docs/scoring.md): it compares shape outlines, not artistic
// quality; big extra decorations lower the score; heavy shading or colouring
// in looks like extra lines; very faint pencil may not be detected; photos at
// a steep angle distort the drawing; mirror images and large rotations are
// not matched.

export const GRID = 128;
const PAD = 12;

export function toGray(img) {
  const { width: w, height: h, data } = img;
  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < g.length; i++, p += 4) {
    const a = data[p + 3] / 255;
    // Treat transparent pixels as white paper.
    g[i] = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) * a + 255 * (1 - a);
  }
  return g;
}

// Adaptive threshold: a pixel is ink when it is clearly darker than its
// neighbourhood. Returns Uint8Array mask (1 = ink).
export function inkMask(img, { windowFrac = 1 / 10, minContrast = 18, ratio = 0.86 } = {}) {
  const { width: w, height: h } = img;
  const g = toGray(img);
  const integ = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += g[y * w + x];
      integ[(y + 1) * (w + 1) + x + 1] = integ[y * (w + 1) + x + 1] + row;
    }
  }
  const r = Math.max(7, Math.round((Math.min(w, h) * windowFrac) / 2));
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const sum = integ[y1 * (w + 1) + x1] - integ[y0 * (w + 1) + x1] - integ[y1 * (w + 1) + x0] + integ[y0 * (w + 1) + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const v = g[y * w + x];
      if (v < mean * ratio && mean - v > minContrast) mask[y * w + x] = 1;
    }
  }
  return mask;
}

// Remove specks and dark blobs that touch the border.
export function cleanMask(mask, w, h) {
  const labels = new Int32Array(w * h).fill(-1);
  const out = new Uint8Array(w * h);
  const minArea = Math.max(4, Math.round(w * h * 0.00004));
  const stack = [];
  const comp = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start] !== -1) continue;
    comp.length = 0;
    stack.push(start);
    labels[start] = start;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      const x = i % w, y = (i / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const j = ny * w + nx;
          if (mask[j] && labels[j] === -1) { labels[j] = start; stack.push(j); }
        }
      }
    }
    if (comp.length < minArea) continue;
    const touchesBorder = minX === 0 || minY === 0 || maxX === w - 1 || maxY === h - 1;
    const density = comp.length / ((maxX - minX + 1) * (maxY - minY + 1));
    const big = comp.length > w * h * 0.02;
    if (touchesBorder && (density > 0.3 || big)) continue;
    for (const i of comp) out[i] = 1;
  }
  return out;
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
}

// Fit the ink into a GRID x GRID square. Returns { grid, count } or null if
// there is (almost) no ink.
export function normalize(mask, w, h, size = GRID) {
  const xs = [], ys = [];
  for (let i = 0; i < mask.length; i++) if (mask[i]) { xs.push(i % w); ys.push((i / w) | 0); }
  if (xs.length < 30) return null;
  const sx = Float32Array.from(xs).sort();
  const sy = Float32Array.from(ys).sort();
  const minX = percentile(sx, 0.004), maxX = percentile(sx, 0.996);
  const minY = percentile(sy, 0.004), maxY = percentile(sy, 0.996);
  const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
  const scale = (size - 2 * PAD) / Math.max(bw, bh);
  const ox = (size - bw * scale) / 2, oy = (size - bh * scale) / 2;
  const grid = new Uint8Array(size * size);
  let count = 0;
  for (let k = 0; k < xs.length; k++) {
    const gx = Math.round((xs[k] - minX) * scale + ox);
    const gy = Math.round((ys[k] - minY) * scale + oy);
    if (gx < 0 || gy < 0 || gx >= size || gy >= size) continue;
    const j = gy * size + gx;
    if (!grid[j]) { grid[j] = 1; count++; }
  }
  return { grid, count, size };
}

// Two-pass chamfer distance transform (distance to nearest ink cell), also
// remembering which ink cell is nearest so we can compare line directions.
export function distanceTransform(grid, size) {
  const INF = 1e6, D = Math.SQRT2;
  const d = new Float32Array(size * size);
  const near = new Int32Array(size * size).fill(-1);
  for (let i = 0; i < d.length; i++) if (grid[i]) { d[i] = 0; near[i] = i; } else d[i] = INF;
  const relax = (i, j, cost) => { if (d[j] + cost < d[i]) { d[i] = d[j] + cost; near[i] = near[j]; } };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    if (x > 0) relax(i, i - 1, 1);
    if (y > 0) {
      relax(i, i - size, 1);
      if (x > 0) relax(i, i - size - 1, D);
      if (x < size - 1) relax(i, i - size + 1, D);
    }
  }
  for (let y = size - 1; y >= 0; y--) for (let x = size - 1; x >= 0; x--) {
    const i = y * size + x;
    if (x < size - 1) relax(i, i + 1, 1);
    if (y < size - 1) {
      relax(i, i + size, 1);
      if (x < size - 1) relax(i, i + size + 1, D);
      if (x > 0) relax(i, i + size - 1, D);
    }
  }
  d.near = near;
  return d;
}

// Local line direction at every ink cell (angle in [0, pi)), from the spread
// of nearby ink cells. NaN where there is no clear direction (blobs, dots).
export function orientations(grid, size, r = 3) {
  const out = new Float32Array(size * size).fill(NaN);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!grid[y * size + x]) continue;
    let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let dy = -r; dy <= r; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= size) continue;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx; if (xx < 0 || xx >= size || !grid[yy * size + xx]) continue;
        n++; sx += dx; sy += dy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
      }
    }
    if (n < 3) continue;
    const mx = sx / n, my = sy / n;
    const a = sxx / n - mx * mx, b = sxy / n - mx * my, c = syy / n - my * my;
    const diff = Math.sqrt((a - c) * (a - c) + 4 * b * b);
    if (diff < 0.25 * (a + c)) continue; // roughly round: no clear direction
    out[y * size + x] = (0.5 * Math.atan2(2 * b, a - c) + Math.PI) % Math.PI;
  }
  return out;
}

function points(grid, size, max = 1600) {
  const pts = [];
  for (let i = 0; i < grid.length; i++) if (grid[i]) pts.push([i % size, (i / size) | 0, i]);
  if (pts.length <= max) return pts;
  const step = pts.length / max, out = [];
  for (let k = 0; k < max; k++) out.push(pts[Math.floor(k * step)]);
  return out;
}

// Full credit within NEAR cells of a line, none beyond FAR.
export const TOL = { near: 1.5, far: 5 };
const credit = (d) => (d <= TOL.near ? 1 : d >= TOL.far ? 0 : 1 - (d - TOL.near) / (TOL.far - TOL.near));

// Average credit of pts (from grid A, with orientations oa) against grid B's
// distance transform dt and orientations ob, after mapping by matrix m.
// Lines that are close but running the wrong way earn less.
function meanCredit(pts, oa, dt, ob, size, m) {
  const c = size / 2, rot = Math.atan2(m[2], m[0]);
  let total = 0;
  for (const [x, y, i] of pts) {
    const px = x - c, py = y - c;
    const tx = Math.round(m[0] * px + m[1] * py + m[4] + c);
    const ty = Math.round(m[2] * px + m[3] * py + m[5] + c);
    if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
    const j = ty * size + tx;
    let k = credit(dt[j]);
    if (k > 0) {
      const a = oa[i], b = ob[dt.near[j]];
      if (a === a && b === b) k *= 0.25 + 0.75 * Math.abs(Math.cos(a + rot - b));
    }
    total += k;
  }
  return total / pts.length;
}

// Matrix mapping drawing -> reference: rotate(rot) * scale(sx, sy), then shift.
function makeMatrix(rot, sx, sy, dx, dy) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [c * sx, -s * sy, s * sx, c * sy, dx, dy];
}
function invert(m) {
  const det = m[0] * m[3] - m[1] * m[2];
  const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + b * m[5]), -(c * m[4] + d * m[5])];
}

export function compare(ref, draw) {
  const size = ref.size;
  const refDT = distanceTransform(ref.grid, size);
  const drawDT = distanceTransform(draw.grid, size);
  const refO = orientations(ref.grid, size);
  const drawO = orientations(draw.grid, size);
  const refPts = points(ref.grid, size);
  const drawPts = points(draw.grid, size);
  const evalM = (m) => {
    const precision = meanCredit(drawPts, drawO, refDT, refO, size, m);
    const recall = meanCredit(refPts, refO, drawDT, drawO, size, invert(m));
    const f = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return { f, precision, recall, m };
  };
  // Coarse search, then refine around the best.
  let best = evalM(makeMatrix(0, 1, 1, 0, 0));
  const deg = Math.PI / 180;
  for (const rot of [-10, -5, 0, 5, 10]) for (const sx of [0.85, 0.93, 1, 1.07, 1.15]) for (const sy of [0.85, 0.93, 1, 1.07, 1.15])
    for (const dx of [-8, -4, 0, 4, 8]) for (const dy of [-8, -4, 0, 4, 8]) {
      const r = evalM(makeMatrix(rot * deg, sx, sy, dx, dy));
      if (r.f > best.f) best = { ...r, p: [rot, sx, sy, dx, dy] };
    }
  if (best.p) {
    const [rot, sx, sy, dx, dy] = best.p;
    for (const dr of [-2.5, 0, 2.5]) for (const dsx of [-0.04, 0, 0.04]) for (const dsy of [-0.04, 0, 0.04])
      for (const ddx of [-2, 0, 2]) for (const ddy of [-2, 0, 2]) {
        const r = evalM(makeMatrix((rot + dr) * deg, sx + dsx, sy + dsy, dx + ddx, dy + ddy));
        if (r.f > best.f) best = { ...r, p: best.p };
      }
  }
  return best;
}

// Raw F-score -> kid-facing score. Tuned on simulated hand copies
// (tests/scoring.test.mjs): a careful copy lands around raw 0.75-0.95, a
// different picture around 0.35-0.55, a scribble up to about 0.6.
const CURVE = [[0, 5], [0.4, 20], [0.55, 50], [0.7, 80], [0.9, 100], [1, 100]];
export function friendlyScore(f) {
  for (let k = 1; k < CURVE.length; k++) {
    const [x0, y0] = CURVE[k - 1], [x1, y1] = CURVE[k];
    if (f <= x1) return Math.round(y0 + ((Math.max(f, x0) - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 100;
}

// --- Browser helpers -------------------------------------------------------

export function renderReference(paths, { size = 400, lineWidth = 5 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const d of paths) ctx.stroke(new Path2D(d));
  return ctx.getImageData(0, 0, size, size);
}

export function referenceGrid(paths) {
  const img = renderReference(paths);
  const mask = new Uint8Array(img.width * img.height);
  for (let i = 0; i < mask.length; i++) mask[i] = img.data[i * 4] < 128 ? 1 : 0;
  return normalize(mask, img.width, img.height);
}

export function photoGrid(img) {
  const mask = cleanMask(inkMask(img), img.width, img.height);
  return normalize(mask, img.width, img.height);
}

// Score an ImageData photo of a drawing against a level's paths.
export function scoreDrawing(img, paths) {
  const ref = referenceGrid(paths);
  const draw = photoGrid(img);
  if (!draw) return { ok: false, reason: 'no-ink' };
  const r = compare(ref, draw);
  return { ok: true, score: friendlyScore(r.f), raw: r.f, precision: r.precision, recall: r.recall, matrix: r.m, ref, draw };
}

// Picture of the match: reference in soft blue, the kid's lines on top in
// green where they match and orange where they wander off.
export function drawOverlay(canvas, result) {
  const { ref, draw, matrix: m } = result;
  const size = ref.size, s = canvas.width / size, c = size / 2;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const refDT = distanceTransform(ref.grid, size);
  ctx.fillStyle = 'rgba(80,140,255,0.45)';
  for (let i = 0; i < ref.grid.length; i++) if (ref.grid[i]) ctx.fillRect((i % size) * s - s, ((i / size) | 0) * s - s, s * 3, s * 3);
  for (let i = 0; i < draw.grid.length; i++) {
    if (!draw.grid[i]) continue;
    const px = (i % size) - c, py = ((i / size) | 0) - c;
    const tx = m[0] * px + m[1] * py + m[4] + c, ty = m[2] * px + m[3] * py + m[5] + c;
    const rx = Math.round(tx), ry = Math.round(ty);
    const d = rx < 0 || ry < 0 || rx >= size || ry >= size ? TOL.far : refDT[ry * size + rx];
    ctx.fillStyle = d <= TOL.near + 1 ? '#1a9e55' : '#ff7b00';
    ctx.fillRect(tx * s - s / 2, ty * s - s / 2, s * 1.6, s * 1.6);
  }
}
