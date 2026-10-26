'use strict';

function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function easeOutCubic(value) { return 1 - Math.pow(1 - clamp01(value), 3); }
function garbageFallOffset(distance, progress) {
  // Contact is the lowest point. Rebounds go upward by a fixed fraction of a
  // cell, independent of how far the ball fell; never overshoot through floor.
  if (progress < .72) return -distance * (1 - Math.pow(progress / .72, 2));
  if (progress < .90) return -.24 * Math.sin((progress - .72) / .18 * Math.PI);
  return -.06 * Math.sin((progress - .90) / .10 * Math.PI);
}

class PuyoEffects {
  constructor() { this.reset(); }

  reset() {
    this.pop = null;
    this.fall = null;
    this.garbageFall = null;
    this.recolor = null;
    this.banner = null;
    this.shake = null;
    this.particles = [];
    this.landing = null;
    this.bannerQueue = [];
    this.notice = null;
    this.noticeQueue = [];
    this.remoteLinks = [];
    this.triggers = [];
    this.defense = null;
    this.stagePulse = null;
  }

  update(dt) {
    ['pop', 'fall', 'garbageFall', 'recolor', 'banner', 'shake', 'landing', 'notice', 'defense', 'stagePulse'].forEach((name) => {
      const item = this[name];
      if (!item) return;
      item.elapsed += dt * 1000;
      if (item.elapsed >= item.duration) this[name] = null;
    });
    if (!this.banner && this.bannerQueue.length) this.banner = this.bannerQueue.shift();
    if (!this.notice && this.noticeQueue.length) this.notice = this.noticeQueue.shift();
    this.remoteLinks.forEach((link) => { link.elapsed += dt * 1000; });
    this.remoteLinks = this.remoteLinks.filter((link) => link.elapsed < link.duration);
    this.triggers.forEach((item) => { item.elapsed += dt * 1000; });
    this.triggers = this.triggers.filter((item) => item.elapsed < item.duration);
    this.particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      // Positions and velocities are measured in board cells, not pixels.
      particle.vy += 5 * dt;
      particle.life -= dt;
    });
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  startPop(cells, duration) {
    this.pop = { cells: new Set(cells.map((cell) => cell[0] + ',' + cell[1])), elapsed: 0, duration: duration || 320 };
  }

  startFall(offsets, duration) {
    if (!offsets || !offsets.size) { this.fall = null; return; }
    this.fall = { offsets: new Map(offsets), elapsed: 0, duration: duration || 220 };
  }

  startGarbageFall(cells, duration) {
    if (!cells || !cells.length) return;
    const entries = new Map(cells.map((cell, index) => [cell[0] + ',' + cell[1], { delay: index * 55, startRows: cell[1] + 1.6 + index * .28 }]));
    this.garbageFall = { entries, elapsed: 0, duration: duration || 620 };
  }

  startRecolor(cells, duration, sourceColor, targetColor) {
    const ordered = (cells || []).slice().sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    this.recolor = {
      cells: new Map(ordered.map((cell, index) => [cell[0] + ',' + cell[1], index])),
      elapsed: 0,
      duration: duration || 1120,
      sourceColor,
      targetColor,
    };
  }

  showBanner(text, sub, chain, duration) {
    this.banner = { text, sub: sub || '', chain: chain || 1, elapsed: 0, duration: duration || 820 };
  }

  queueBanner(text, sub, chain, duration) {
    const entry = { text, sub: sub || '', chain: chain || 1, elapsed: 0, duration: duration || 1100 };
    if (!this.banner) this.banner = entry;
    else this.bannerQueue.push(entry);
    if (this.bannerQueue.length > 6) this.bannerQueue.shift();
  }

  showNotice(text, duration, complete) {
    const entry = { text: String(text || ''), elapsed: 0, duration: duration || 1550, complete: !!complete };
    if (!this.notice) this.notice = entry;
    else this.noticeQueue.push(entry);
    if (this.noticeQueue.length > 6) this.noticeQueue.shift();
  }

  addRemoteLinks(links) {
    this.remoteLinks = this.remoteLinks.concat(links.map((link) => ({ from: link.from.slice(), to: link.to.slice(), elapsed: 0, duration: 540 }))).slice(-12);
  }

  trigger(id, name) {
    this.triggers = this.triggers.filter((entry) => entry.id !== id);
    this.triggers.push({ id, name, elapsed: 0, duration: 1200 });
    this.triggers = this.triggers.slice(-4);
  }

  startShake(chain) {
    this.shake = { strength: Math.min(7, 1.5 + Math.max(0, chain - 1) * 1.25), elapsed: 0, duration: Math.min(360, 150 + chain * 35) };
  }

  startLanding(cells) {
    this.landing = { cells: new Set((cells || []).map((cell) => cell.x + ',' + cell.y)), elapsed: 0, duration: 170 };
  }

  burst(cells, colorForCell, chain) {
    (cells || []).forEach((cell) => {
      const color = colorForCell(cell);
      const count = Math.min(13, 7 + Math.max(0, chain - 1));
      for (let index = 0; index < count; index++) {
        const angle = Math.PI * 2 * index / count + Math.random() * 0.35;
        const speed = 1.3 + Math.random() * 2.4;
        this.particles.push({
          x: cell[0] + 0.5,
          y: cell[1] + 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          life: 0.42 + Math.random() * 0.28,
          maxLife: 0.7,
          color,
        });
      }
    });
    if (this.particles.length > 512) this.particles.splice(0, this.particles.length - 512);
  }

  boardOffset() {
    if (!this.shake) return { x: 0, y: 0 };
    const remaining = 1 - clamp01(this.shake.elapsed / this.shake.duration);
    const wave = this.shake.elapsed * 0.085;
    return { x: Math.sin(wave) * this.shake.strength * remaining, y: Math.cos(wave * 1.31) * this.shake.strength * 0.45 * remaining };
  }

  cellState(x, y) {
    const key = x + ',' + y;
    let offsetRows = 0;
    let scaleX = 1;
    let scaleY = 1;
    let alpha = 1;
    let flash = 0;
    let recolor = null;

    if (this.pop && this.pop.cells.has(key)) {
      const p = clamp01(this.pop.elapsed / this.pop.duration);
      flash = Math.sin(Math.min(1, p * 2.1) * Math.PI);
      const vanish = clamp01((p - 0.34) / 0.66);
      scaleX = 1 + Math.sin(p * Math.PI) * 0.18 - vanish * 0.9;
      scaleY = 1 + Math.sin(p * Math.PI) * 0.1 - vanish * 0.9;
      alpha = 1 - vanish;
    }

    if (this.fall && this.fall.offsets.has(key)) {
      const p = clamp01(this.fall.elapsed / this.fall.duration);
      offsetRows -= this.fall.offsets.get(key) * (1 - easeOutCubic(p));
      if (p > 0.72) {
        const impact = Math.sin((p - 0.72) / 0.28 * Math.PI);
        scaleX += impact * 0.12;
        scaleY -= impact * 0.1;
      }
    }

    if (this.garbageFall && this.garbageFall.entries.has(key)) {
      const entry = this.garbageFall.entries.get(key);
      const usable = Math.max(1, this.garbageFall.duration - entry.delay);
      const p = clamp01((this.garbageFall.elapsed - entry.delay) / usable);
      offsetRows = garbageFallOffset(entry.startRows, p);
      if (this.garbageFall.elapsed < entry.delay) alpha = 0;
      if (p >= .72 && p < .8) {
        const impact = Math.sin((p - .72) / .08 * Math.PI);
        scaleX += impact * 0.16;
        scaleY -= impact * 0.13;
      }
    }

    if (this.recolor && this.recolor.cells.has(key)) {
      const index = this.recolor.cells.get(key);
      const stagger = Math.min(0.48, index * 0.055);
      const p = clamp01((this.recolor.elapsed / this.recolor.duration - stagger) / (1 - stagger));
      recolor = { progress: p, source: this.recolor.sourceColor, target: this.recolor.targetColor };
      const pulse = Math.sin(p * Math.PI);
      scaleX += pulse * 0.18;
      scaleY += pulse * 0.18;
      flash = Math.max(flash, pulse * 0.75);
    }

    if (this.landing && this.landing.cells.has(key)) {
      const p = clamp01(this.landing.elapsed / this.landing.duration);
      const squash = Math.sin(p * Math.PI);
      scaleX += squash * 0.13;
      scaleY -= squash * 0.12;
    }

    return { offsetRows, scaleX, scaleY, alpha, flash, recolor };
  }
}

module.exports = PuyoEffects;
