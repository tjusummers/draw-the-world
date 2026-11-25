import { LEVELS, WORLDS, PASS_SCORE, getLevel, allPaths } from './levels.js';
import { DemoPlayer, referenceSVG } from './demo.js';
import { scoreDrawing, drawOverlay } from './scoring.js';
import * as progress from './progress.js';

const app = document.getElementById('app');
let cleanup = () => {};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stars = (n, of = 3) => '★'.repeat(n) + '☆'.repeat(of - n);

function route() {
  cleanup();
  cleanup = () => {};
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/level\/(\d+)/);
  if (m) renderLevel(Number(m[1]));
  else if (hash.startsWith('#/about')) renderAbout();
  else renderMap();
  document.getElementById('star-total').textContent = `⭐ ${progress.totalStars()}`;
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}

// ---------------------------------------------------------------- Map

function renderMap() {
  document.title = 'Draw the World';
  const worlds = WORLDS.map((w) => {
    const cards = LEVELS.filter((l) => l.world === w.id).map(levelCard).join('');
    return `<section class="world world-${w.id}">
      <h2><span class="world-emoji">${w.emoji}</span> ${esc(w.name)} <small>${esc(w.blurb)}</small></h2>
      <div class="level-path">${cards}</div>
    </section>`;
  }).join('');
  app.innerHTML = `
    <section class="hero">
      <h1>Draw the World</h1>
      <p>Set sail on a drawing voyage! Watch how, draw it on paper, snap a photo and level up.
      Start with simple lines and finish by drawing your own manga pirate heroes.</p>
    </section>
    ${worlds}`;
}

function levelCard(l) {
  const unlocked = l.playable && progress.isUnlocked(l.id);
  const best = progress.bestScore(l.id);
  const passed = progress.hasPassed(l.id);
  let status;
  if (!l.playable) status = '<span class="badge soon">Coming soon</span>';
  else if (!unlocked) status = '<span class="badge locked">🔒 Locked</span>';
  else if (best == null) status = '<span class="badge new">▶ Play</span>';
  else status = `<span class="badge ${passed ? 'passed' : 'tried'}"><span class="stars">${stars(progress.starsFor(best))}</span> Best ${best}%</span>`;
  const inner = `
    <span class="level-num" style="${l.color ? `--c:${l.color}` : ''}">${l.id}</span>
    <span class="level-info"><strong>${esc(l.title)}</strong><span>${esc(l.skill)}</span></span>
    ${l.playable ? `<span class="level-thumb">${referenceSVG(l)}</span>` : ''}
    ${status}`;
  return unlocked
    ? `<a class="level-card open" href="#/level/${l.id}">${inner}</a>`
    : `<div class="level-card closed" aria-disabled="true">${inner}</div>`;
}

// ---------------------------------------------------------------- Level

function renderLevel(id) {
  const level = getLevel(id);
  if (!level || !level.playable || !progress.isUnlocked(id)) { location.hash = '#/'; return; }
  document.title = `Level ${id}: ${level.title} · Draw the World`;
  const best = progress.bestScore(id);
  app.innerHTML = `
    <nav class="crumbs"><a href="#/" class="btn small ghost">← Map</a></nav>
    <header class="level-head" style="--c:${level.color}">
      <span class="level-num big">${id}</span>
      <div>
        <h1>${esc(level.title)}</h1>
        <p>${esc(level.goal)}</p>
      </div>
      <div class="best">${best == null ? 'No score yet' : `Best <b>${best}%</b><br><span class="stars">${stars(progress.starsFor(best))}</span>`}</div>
    </header>

    <section class="panel" id="watch">
      <h2><span class="step-badge">1</span> Watch how to draw it</h2>
      <div class="demo-wrap">
        <div class="demo-stage">
          <svg class="demo" id="demo" role="img" aria-label="Step by step drawing of ${esc(level.title)}"></svg>
        </div>
        <div class="demo-side">
          <div class="bubble" id="caption" aria-live="polite">Press <b>Play</b> to watch!</div>
          <div class="controls">
            <button class="btn" id="play">▶ Play</button>
            <button class="btn ghost" id="prev" aria-label="Previous step">⏮</button>
            <button class="btn ghost" id="next" aria-label="Next step">⏭</button>
            <button class="btn ghost toggle" id="slow" aria-pressed="false" title="Slow motion">🐢 Slow</button>
            <button class="btn ghost toggle" id="voice" aria-pressed="false" title="Read the steps out loud">🔊 Read aloud</button>
          </div>
          <ol class="steps" id="steps">
            ${level.steps.map((s, i) => `<li><button data-step="${i}">${esc(s.say)}</button></li>`).join('')}
          </ol>
        </div>
      </div>
    </section>

    <section class="panel" id="draw">
      <h2><span class="step-badge">2</span> Draw it on paper</h2>
      <ul class="tips">
        <li>✏️ Use a <b>dark pencil or a black pen</b> on plain white paper.</li>
        <li>📏 Draw it <b>big</b>, so it fills most of the page.</li>
        <li>🚫 Just the lines, please: no colouring in or extra doodles (you can add those after!).</li>
        ${level.tips.map((t) => `<li>💡 ${esc(t)}</li>`).join('')}
      </ul>
    </section>

    <section class="panel" id="upload">
      <h2><span class="step-badge">3</span> Show me your drawing</h2>
      <p class="hint">Take a photo from straight above, in good light, so the paper fills the picture.</p>
      <label class="btn big file-btn">📷 Take or choose a photo
        <input type="file" id="file" accept="image/*" hidden>
      </label>
      <div id="editor" class="editor" hidden>
        <p class="hint">Drag the corners so the box goes around your drawing.</p>
        <div class="crop-stage"><canvas id="crop"></canvas></div>
        <div class="controls">
          <button class="btn ghost" id="rotate">↻ Turn photo</button>
          <button class="btn big go" id="check">✨ Check my drawing!</button>
        </div>
      </div>
      <div id="result" class="result" hidden aria-live="polite"></div>
    </section>`;

  // Demo player wiring
  const caption = document.getElementById('caption');
  const stepButtons = [...document.querySelectorAll('#steps button')];
  const playBtn = document.getElementById('play');
  const player = new DemoPlayer(document.getElementById('demo'), level, {
    onStep: (i, step) => {
      caption.innerHTML = `<b>Step ${i + 1} of ${level.steps.length}</b><br>${esc(step.say)}`;
      stepButtons.forEach((b, k) => b.parentElement.classList.toggle('current', k === i));
    },
    onEnd: () => {
      playBtn.textContent = '↺ Watch again';
      caption.innerHTML = '<b>All done!</b><br>Now grab your pencil and draw it on paper. 🎨';
      stepButtons.forEach((b) => b.parentElement.classList.remove('current'));
    },
  });
  player.showFinished();
  playBtn.onclick = () => {
    if (player.playing) { player.pause(); playBtn.textContent = '▶ Play'; }
    else { playBtn.textContent = '⏸ Pause'; player.play(); }
  };
  const stepTo = (i) => { player.goTo(i); playBtn.textContent = '▶ Play'; };
  document.getElementById('prev').onclick = () => stepTo((player.current < 0 ? 0 : player.current) - 1);
  document.getElementById('next').onclick = () => stepTo(player.current + 1 >= level.steps.length ? 0 : player.current + 1);
  stepButtons.forEach((b) => (b.onclick = () => stepTo(Number(b.dataset.step))));
  const toggle = (btn, fn) => (btn.onclick = () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    fn(on);
  });
  toggle(document.getElementById('slow'), (on) => (player.speed = on ? 0.5 : 1));
  toggle(document.getElementById('voice'), (on) => { player.voice = on; if (on && player.current >= 0) player.say(level.steps[player.current].say); });

  const photo = setupPhoto(level);
  cleanup = () => { player.destroy(); photo.destroy(); };
}

// ---------------------------------------------------------------- Photo + crop

function setupPhoto(level) {
  const file = document.getElementById('file');
  const editor = document.getElementById('editor');
  const canvas = document.getElementById('crop');
  const result = document.getElementById('result');
  const ctx = canvas.getContext('2d');
  let source = null; // canvas holding the (rotated) photo
  let crop = null; // in source pixels
  let drag = null;
  let objectUrl = null;

  const view = () => canvas.width / source.width;

  function draw() {
    const s = view();
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(20,30,60,0.55)';
    const { x, y, w, h } = crop;
    ctx.fillRect(0, 0, canvas.width, y * s);
    ctx.fillRect(0, (y + h) * s, canvas.width, canvas.height - (y + h) * s);
    ctx.fillRect(0, y * s, x * s, h * s);
    ctx.fillRect((x + w) * s, y * s, canvas.width - (x + w) * s, h * s);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(x * s, y * s, w * s, h * s);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd166';
    for (const [cx, cy] of corners()) {
      ctx.beginPath();
      ctx.arc(cx * s, cy * s, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const corners = () => [[crop.x, crop.y], [crop.x + crop.w, crop.y], [crop.x, crop.y + crop.h], [crop.x + crop.w, crop.y + crop.h]];

  function setSource(img, rotation) {
    const rot = ((rotation % 360) + 360) % 360;
    const max = 1400; // plenty for scoring, keeps memory small
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * k), h = Math.round(img.height * k);
    const c = document.createElement('canvas');
    const swap = rot === 90 || rot === 270;
    c.width = swap ? h : w;
    c.height = swap ? w : h;
    const g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2);
    g.rotate((rot * Math.PI) / 180);
    g.drawImage(img, -w / 2, -h / 2, w, h);
    source = c;
    const inset = 0.04;
    crop = { x: c.width * inset, y: c.height * inset, w: c.width * (1 - 2 * inset), h: c.height * (1 - 2 * inset) };
    const displayW = Math.min(editor.clientWidth || 520, 560);
    canvas.width = displayW;
    canvas.height = Math.round(displayW * (c.height / c.width));
    draw();
  }

  let img = null, rotation = 0;
  file.onchange = () => {
    const f = file.files && file.files[0];
    if (!f) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      img = im;
      rotation = 0;
      editor.hidden = false;
      result.hidden = true;
      setSource(img, rotation);
      editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    im.onerror = () => {
      result.hidden = false;
      result.innerHTML = '<p class="oops">Hmm, I could not open that picture. Try taking the photo again.</p>';
    };
    im.src = objectUrl;
    file.value = '';
  };
  document.getElementById('rotate').onclick = () => { if (img) { rotation += 90; setSource(img, rotation); } };

  const toSource = (e) => {
    const r = canvas.getBoundingClientRect();
    const s = (canvas.width / r.width) / view();
    return [(e.clientX - r.left) * s, (e.clientY - r.top) * s];
  };
  canvas.onpointerdown = (e) => {
    if (!source) return;
    const [px, py] = toSource(e);
    const reach = 34 / view() * (canvas.width / canvas.getBoundingClientRect().width);
    const ci = corners().findIndex(([cx, cy]) => Math.hypot(cx - px, cy - py) < reach);
    if (ci >= 0) drag = { corner: ci };
    else if (px > crop.x && px < crop.x + crop.w && py > crop.y && py < crop.y + crop.h) drag = { move: [px - crop.x, py - crop.y] };
    else return;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  canvas.onpointermove = (e) => {
    if (!drag) return;
    let [px, py] = toSource(e);
    px = Math.max(0, Math.min(source.width, px));
    py = Math.max(0, Math.min(source.height, py));
    const min = Math.min(source.width, source.height) * 0.1;
    if (drag.move) {
      crop.x = Math.max(0, Math.min(source.width - crop.w, px - drag.move[0]));
      crop.y = Math.max(0, Math.min(source.height - crop.h, py - drag.move[1]));
    } else {
      let x1 = crop.x, y1 = crop.y, x2 = crop.x + crop.w, y2 = crop.y + crop.h;
      if (drag.corner % 2 === 0) x1 = Math.min(px, x2 - min); else x2 = Math.max(px, x1 + min);
      if (drag.corner < 2) y1 = Math.min(py, y2 - min); else y2 = Math.max(py, y1 + min);
      crop = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    draw();
  };
  canvas.onpointerup = canvas.onpointercancel = () => (drag = null);

  document.getElementById('check').onclick = () => {
    if (!source) return;
    const btn = document.getElementById('check');
    btn.disabled = true;
    btn.textContent = '🔍 Checking...';
    result.hidden = false;
    result.innerHTML = '<div class="checking"><span class="spinner"></span> Looking closely at your lines...</div>';
    // Let the browser paint the "checking" message before the heavy work.
    setTimeout(() => {
      const maxSide = 600;
      const k = Math.min(1, maxSide / Math.max(crop.w, crop.h));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(crop.w * k));
      c.height = Math.max(1, Math.round(crop.h * k));
      c.getContext('2d').drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, c.width, c.height);
      const data = c.getContext('2d').getImageData(0, 0, c.width, c.height);
      const r = scoreDrawing(data, allPaths(level));
      btn.disabled = false;
      btn.textContent = '✨ Check my drawing!';
      showResult(level, r, result);
    }, 60);
  };

  return { destroy: () => { if (objectUrl) URL.revokeObjectURL(objectUrl); } };
}

// ---------------------------------------------------------------- Result

function showResult(level, r, el) {
  if (!r.ok) {
    el.innerHTML = `<div class="result-card oops">
      <h3>Hmm, I can't find your drawing 🔍</h3>
      <p>Try a darker pencil or pen, take the photo in brighter light, and make sure the box goes around your drawing.</p>
    </div>`;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const score = r.score;
  const passed = score >= PASS_SCORE;
  const { isNewBest, previousBest } = progress.recordScore(level.id, score, PASS_SCORE);
  const next = getLevel(level.id + 1);
  const nextPlayable = next && next.playable;
  const best = progress.bestScore(level.id);
  const n = progress.starsFor(score);

  let advice = '';
  if (!passed) {
    if (r.recall < r.precision - 0.08) advice = 'Some parts are missing. Watch the steps again and check you drew every part.';
    else if (r.precision < r.recall - 0.08) advice = 'Some lines wander off, or there are extra lines. Try to draw just the parts from the video, nice and big.';
    else advice = 'Go slowly and look at the example after each line. Shapes and their places matter most.';
  }

  const nextBtn = nextPlayable
    ? `<a class="btn big go" id="next-level" href="#/level/${next.id}">${passed ? 'Next level ▶' : 'Move to next level anyway ▶'}</a>`
    : next ? `<span class="soon-note">Level ${next.id}, ${esc(next.title)}, is coming soon!</span>` : '';

  el.innerHTML = `<div class="result-card ${passed ? 'pass' : 'try'}">
    <div class="score-ring" style="--p:${score}"><span>${score}%</span></div>
    <div class="result-text">
      ${passed
        ? `<h3>Amazing! You passed! 🎉</h3><p class="stars big">${stars(n)}</p>
           <p>${nextPlayable ? `Level ${next.id} is unlocked.` : 'You finished every level that is ready so far!'}</p>`
        : `<h3>Good job! 👏</h3>
           <p>You scored ${score}%. You need ${PASS_SCORE}% to pass. Every drawing makes your hand stronger!</p>
           <p class="advice">💡 ${esc(advice)}</p>`}
      ${isNewBest && previousBest != null ? `<p class="new-best">🏅 New best score! (was ${previousBest}%)</p>` : ''}
      ${!isNewBest ? `<p class="muted">Your best is still ${best}%.</p>` : ''}
    </div>
    <div class="compare">
      <figure><canvas id="overlay" width="256" height="256"></canvas>
        <figcaption><span class="dot blue"></span>guide <span class="dot green"></span>your matching lines <span class="dot orange"></span>lines that wander off</figcaption></figure>
    </div>
    <div class="controls result-actions">
      <button class="btn big" id="again">✏️ Draw it again</button>
      ${nextBtn}
      <a class="btn ghost" href="#/">🗺️ Map</a>
    </div>
  </div>`;
  drawOverlay(document.getElementById('overlay'), r);
  document.getElementById('again').onclick = () => document.getElementById('watch').scrollIntoView({ behavior: 'smooth' });
  // "Move on anyway" unlocks the next level when the kid chooses it.
  const nextLink = document.getElementById('next-level');
  if (nextLink) nextLink.onclick = () => progress.unlock(next.id);
  document.getElementById('star-total').textContent = `⭐ ${progress.totalStars()}`;
  const headBest = document.querySelector('.level-head .best');
  if (headBest) headBest.innerHTML = `Best <b>${best}%</b><br><span class="stars">${stars(progress.starsFor(best))}</span>`;
  if (passed) confetti();
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.getElementById('confetti');
  const bits = ['⭐', '✨', '🎉', '✏️', '🌟'];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('span');
    s.textContent = bits[i % bits.length];
    s.style.left = `${Math.random() * 100}vw`;
    s.style.animationDelay = `${Math.random() * 0.6}s`;
    s.style.fontSize = `${18 + Math.random() * 18}px`;
    box.append(s);
    setTimeout(() => s.remove(), 3200);
  }
}

// ---------------------------------------------------------------- About

function renderAbout() {
  document.title = 'For grown-ups · Draw the World';
  app.innerHTML = `
    <nav class="crumbs"><a href="#/" class="btn small ghost">← Map</a></nav>
    <section class="panel prose">
      <h1>For grown-ups</h1>
      <h2>How the game works</h2>
      <p>Each level shows an animated, step-by-step demo. Your child draws it on paper, takes a photo, and the
      app compares the lines with the example. ${PASS_SCORE}% or more passes and unlocks the next level. Below that,
      they get encouragement and can try again or move on anyway. Unlocked levels can be replayed any time, and
      the best score is kept.</p>
      <h2>How the score works</h2>
      <p>Everything happens on this device. The photo is never uploaded. The app finds the dark lines in the
      photo, resizes them to the same size as the example, nudges them around (shift, stretch, small tilt) to
      line them up, then measures how much of the drawing sits on the example lines and how much of the example
      is covered.</p>
      <p><b>What it can't do:</b> it checks shape and placement, not creativity or line quality. Extra doodles,
      colouring in, shading or a busy background lower the score. Very faint pencil, dark shadows, or a photo
      taken at a steep angle can confuse it. Mirror-image drawings and big rotations are not matched. The
      ${PASS_SCORE}% line was tuned on simulated hand drawings, so treat the number as a friendly guide and
      celebrate effort.</p>
      <h2>Where the voyage goes</h2>
      <p>Line Land (lines and shapes), Cartoon Cove (faces, feelings, simple bodies), Manga Island (manga heads,
      eyes, hair, action poses, clothes) and the Grand Voyage, where kids design their own pirate crew and practise
      fan art of their favourite manga characters, like the heroes of <i>One Piece</i>. The app teaches the style
      with original drawings only. For fan art, use your own manga books as reference; keep fan art for personal
      practice.</p>
      <h2>Progress</h2>
      <p>Progress is saved in this browser only.</p>
      <button class="btn ghost" id="reset">Start over (clear progress)</button>
      <p id="reset-done" class="muted" hidden>Progress cleared.</p>
    </section>`;
  let armed = false;
  const btn = document.getElementById('reset');
  btn.onclick = () => {
    if (!armed) { armed = true; btn.textContent = 'Tap again to clear all progress'; return; }
    progress.reset();
    btn.hidden = true;
    document.getElementById('reset-done').hidden = false;
    document.getElementById('star-total').textContent = '⭐ 0';
  };
}

window.addEventListener('hashchange', route);
route();
