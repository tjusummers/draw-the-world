// Animated stroke-by-stroke demo. Each path "draws itself" with a pencil
// tip following the line, one step at a time, with an optional read-aloud
// voice for kids who are still learning to read.

const NS = 'http://www.w3.org/2000/svg';

export class DemoPlayer {
  constructor(svg, level, { onStep, onEnd } = {}) {
    this.svg = svg;
    this.level = level;
    this.onStep = onStep || (() => {});
    this.onEnd = onEnd || (() => {});
    this.speed = 1;
    this.voice = false;
    this.playing = false;
    this.token = 0;
    this.build();
  }

  build() {
    const svg = this.svg;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 400 400');
    const ghost = document.createElementNS(NS, 'g');
    ghost.setAttribute('class', 'demo-ghost');
    const ink = document.createElementNS(NS, 'g');
    ink.setAttribute('class', 'demo-ink');
    svg.append(ghost, ink);
    this.steps = this.level.steps.map((step) => {
      const paths = step.paths.map((d) => {
        const g = document.createElementNS(NS, 'path');
        g.setAttribute('d', d);
        ghost.append(g);
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d);
        ink.append(p);
        const len = p.getTotalLength() + 1;
        p.style.strokeDasharray = `${len} ${len}`;
        p.style.strokeDashoffset = String(len);
        return { el: p, len };
      });
      return { ...step, paths };
    });
    this.tip = document.createElementNS(NS, 'g');
    this.tip.setAttribute('class', 'demo-tip');
    this.tip.innerHTML = '<circle r="7"/><text x="4" y="-6">✏️</text>';
    this.tip.style.display = 'none';
    svg.append(this.tip);
    this.current = -1;
  }

  // Show steps [0, upto) fully drawn and the rest hidden.
  showUpTo(upto, active = -1) {
    this.steps.forEach((s, i) => s.paths.forEach(({ el, len }) => {
      el.style.strokeDashoffset = i < upto ? '0' : String(len);
      el.classList.toggle('active', i === active);
    }));
  }

  async play(from = this.current >= this.steps.length - 1 || this.current < 0 ? 0 : this.current) {
    const token = ++this.token;
    this.playing = true;
    for (let i = from; i < this.steps.length; i++) {
      if (token !== this.token) return;
      await this.animateStep(i, token);
      if (token !== this.token) return;
      await this.wait(900 / this.speed, token);
    }
    if (token !== this.token) return;
    this.playing = false;
    this.tip.style.display = 'none';
    this.steps.forEach((s) => s.paths.forEach(({ el }) => el.classList.remove('active')));
    this.onEnd();
  }

  async animateStep(i, token) {
    this.current = i;
    this.showUpTo(i, i);
    this.onStep(i, this.steps[i]);
    this.say(this.steps[i].say);
    await this.wait(500 / this.speed, token);
    for (const { el, len } of this.steps[i].paths) {
      if (token !== this.token) return;
      await this.drawPath(el, len, token);
    }
  }

  drawPath(el, len, token) {
    const pxPerSec = 260 * this.speed;
    const duration = Math.max(250, (len / pxPerSec) * 1000);
    this.tip.style.display = '';
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        if (token !== this.token) return resolve();
        const t = Math.min(1, (now - start) / duration);
        const drawn = len * t;
        el.style.strokeDashoffset = String(len - drawn);
        const pt = el.getPointAtLength(Math.min(drawn, len - 1));
        this.tip.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  wait(ms, token) {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      if (token !== this.token) { clearTimeout(t); resolve(); }
    });
  }

  pause() {
    this.token++;
    this.playing = false;
    this.tip.style.display = 'none';
    if (this.current >= 0) this.showUpTo(this.current + 1, this.current);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  // Jump to a step and show it finished (used by the step buttons).
  goTo(i) {
    this.pause();
    const n = Math.max(0, Math.min(this.steps.length - 1, i));
    this.current = n;
    this.showUpTo(n + 1, n);
    this.onStep(n, this.steps[n]);
    this.say(this.steps[n].say);
  }

  showFinished() {
    this.pause();
    this.current = this.steps.length - 1;
    this.showUpTo(this.steps.length);
    this.steps.forEach((s) => s.paths.forEach(({ el }) => el.classList.remove('active')));
  }

  say(text) {
    if (!this.voice || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.1;
    speechSynthesis.speak(u);
  }

  destroy() {
    this.pause();
  }
}

// Static picture of a finished level, used on cards and the result screen.
export function referenceSVG(level, cls = '') {
  const paths = level.steps.flatMap((s) => s.paths).map((d) => `<path d="${d}"/>`).join('');
  return `<svg class="ref-svg ${cls}" viewBox="0 0 400 400" aria-hidden="true">${paths}</svg>`;
}
