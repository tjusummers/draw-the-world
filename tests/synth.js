// Browser-side helpers that fake a "photo of a kid's drawing" from a level's
// paths: wobbly hand lines, random size/position/tilt, pencil grey on
// off-white paper, uneven lighting, specks, and sometimes a dark table edge.
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function fakePhoto(paths, opts = {}) {
  const R = rng(opts.seed ?? 1);
  const W = opts.w ?? 480, H = opts.h ?? 600;
  const wobble = opts.wobble ?? 6;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  // Paper with a lighting gradient.
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#f4f1ea');
  grad.addColorStop(1, opts.dark ? '#9a978f' : '#d9d5cc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  if (opts.table) { ctx.fillStyle = '#4a3b2c'; ctx.fillRect(0, H - 40, W, 40); ctx.fillRect(0, 0, 25, H); }
  const scale = (opts.scale ?? (0.75 + R() * 0.3)) * Math.min(W, H) / 400;
  const sx = scale * (1 + (R() - 0.5) * 0.16), sy = scale * (1 + (R() - 0.5) * 0.16);
  const rot = ((R() - 0.5) * 2 * (opts.tilt ?? 5)) * Math.PI / 180;
  const cx = W / 2 + (R() - 0.5) * 30, cy = H / 2 + (R() - 0.5) * 30;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  document.body.appendChild(svg);
  ctx.strokeStyle = opts.ink ?? '#555';
  ctx.lineWidth = opts.lineWidth ?? 2 + R() * 3;
  ctx.lineCap = ctx.lineJoin = 'round';
  // Smooth wobble field.
  const ph = [R() * 6, R() * 6, R() * 6, R() * 6];
  const wob = (x, y) => [
    wobble * Math.sin(x / 37 + ph[0]) + wobble * 0.6 * Math.sin(y / 23 + ph[1]),
    wobble * Math.sin(y / 41 + ph[2]) + wobble * 0.6 * Math.sin(x / 29 + ph[3]),
  ];
  const jitter = opts.jitter ?? 0;
  for (const d of paths) {
    // Kids place and size each part a bit differently.
    const ox = (R() - 0.5) * 2 * jitter, oy = (R() - 0.5) * 2 * jitter;
    const ps = 1 + (R() - 0.5) * jitter / 50;
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    const len = p.getTotalLength();
    const n = Math.max(2, Math.ceil(len / 3));
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const pt = p.getPointAtLength((i / n) * len);
      const [wx, wy] = wob(pt.x, pt.y);
      let x = (pt.x - 200 + wx + ox) * sx * ps, y = (pt.y - 200 + wy + oy) * sy * ps;
      const X = cx + x * Math.cos(rot) - y * Math.sin(rot);
      const Y = cy + x * Math.sin(rot) + y * Math.cos(rot);
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();
  }
  svg.remove();
  // Specks.
  ctx.fillStyle = '#777';
  for (let i = 0; i < 25; i++) ctx.fillRect(R() * W, R() * H, 1.5, 1.5);
  return ctx.getImageData(0, 0, W, H);
}

export function scribble(seed) {
  const R = rng(seed);
  const paths = [];
  for (let k = 0; k < 6; k++) {
    let d = `M${40 + R() * 320} ${40 + R() * 320}`;
    for (let i = 0; i < 6; i++) d += ` L${40 + R() * 320} ${40 + R() * 320}`;
    paths.push(d);
  }
  return paths;
}
