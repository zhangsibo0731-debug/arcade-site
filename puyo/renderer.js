(function (global) {
  'use strict';

  const VERSION = 1;

  function create(options) {
    const canvas = options.canvas;
    const context = canvas.getContext('2d');
    const nextCanvas = options.nextCanvas;
    const nextContext = nextCanvas.getContext('2d');
    const boardWrap = options.boardWrap;
    const boardArea = options.boardArea;
    const nextPanel = options.nextPanel;
    const nextLabel = options.nextLabel;
    const colors = options.colors;
    const darks = options.darks;
    const rows = options.rows;
    const cols = options.cols;
    const garbage = options.garbage;
    let cell = 32;
    let particles = [];
    let popCells = new Set();
    let remoteClearLinks = [];
    let popStartedAt = 0;
    let popDuration = 280;
    let fallOffsets = new Map();
    let fallStartedAt = 0;
    let fallDuration = 210;
    let garbageFalls = new Map();
    let garbageFallStartedAt = 0;

    function drawBlob(target, x, y, radius, color, alpha, eyes) {
      const base = colors[color - 1];
      const dark = darks[color - 1];
      target.save();
      target.globalAlpha = alpha == null ? 1 : alpha;
      target.translate(x, y);
      target.fillStyle = base;
      target.beginPath();
      target.ellipse(0, radius * 0.05, radius, radius * 0.94, 0, 0, Math.PI * 2);
      target.fill();
      target.fillStyle = 'rgba(255,255,255,.24)';
      target.beginPath();
      target.ellipse(-radius * 0.3, -radius * 0.36, radius * 0.28, radius * 0.18, -0.6, 0, Math.PI * 2);
      target.fill();
      target.strokeStyle = dark;
      target.lineWidth = Math.max(1, radius * 0.07);
      target.stroke();
      if (eyes !== false && radius >= 8) {
        target.fillStyle = '#fff';
        target.beginPath();
        target.ellipse(-radius * 0.18, -radius * 0.04, radius * 0.17, radius * 0.22, 0, 0, Math.PI * 2);
        target.ellipse(radius * 0.18, -radius * 0.04, radius * 0.17, radius * 0.22, 0, 0, Math.PI * 2);
        target.fill();
        target.fillStyle = '#322742';
        target.beginPath();
        target.arc(-radius * 0.14, 0, radius * 0.075, 0, Math.PI * 2);
        target.arc(radius * 0.22, 0, radius * 0.075, 0, Math.PI * 2);
        target.fill();
      }
      target.restore();
    }

    function drawGarbage(target, x, y, radius, alpha, scale) {
      target.save();
      target.globalAlpha = alpha == null ? 1 : alpha;
      target.translate(x, y);
      target.scale(scale || 1, scale || 1);
      const gradient = target.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.08, 0, 0, radius);
      gradient.addColorStop(0, '#f0edf6');
      gradient.addColorStop(0.42, '#bdb7ca');
      gradient.addColorStop(1, '#716b80');
      target.fillStyle = gradient;
      target.beginPath();
      target.arc(0, 0, radius * 0.88, 0, Math.PI * 2);
      target.fill();
      target.strokeStyle = '#514b60';
      target.lineWidth = Math.max(1, radius * 0.08);
      target.stroke();
      target.fillStyle = '#514b60';
      target.beginPath();
      target.arc(-radius * 0.22, -radius * 0.02, radius * 0.09, 0, Math.PI * 2);
      target.arc(radius * 0.22, -radius * 0.02, radius * 0.09, 0, Math.PI * 2);
      target.fill();
      target.restore();
    }

    function resize() {
      const rect = boardArea.getBoundingClientRect();
      cell = Math.max(18, Math.floor(Math.min(rect.width / cols, rect.height / rows)));
      const width = cell * cols;
      const height = cell * rows;
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      boardWrap.style.width = width + 'px';
      boardWrap.style.height = height + 'px';
      boardWrap.style.setProperty('--cell', cell + 'px');
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      nextCanvas.width = 144;
      nextCanvas.height = 248;
      nextContext.setTransform(2, 0, 0, 2, 0, 0);
      return cell;
    }

    function drawNext(queue, foresight) {
      nextContext.clearRect(0, 0, 72, 124);
      nextPanel.classList.toggle('is-foresight', foresight >= 1);
      nextLabel.textContent = foresight >= 3 ? 'NEXT 1 · 2 · 3' : 'NEXT 1 · 2';
      const first = queue[0];
      const second = queue[1];
      if (first) {
        drawBlob(nextContext, 36, 47, 19, first[0], 1, true);
        drawBlob(nextContext, 36, 15, 19, first[1], 1, true);
      }
      if (second) {
        nextContext.strokeStyle = 'rgba(255,255,255,.12)';
        nextContext.beginPath();
        nextContext.moveTo(15, 68);
        nextContext.lineTo(57, 68);
        nextContext.stroke();
        drawBlob(nextContext, 36, 105, 14, second[0], 0.82, true);
        drawBlob(nextContext, 36, 80, 14, second[1], 0.82, true);
      }
      if (foresight >= 2 && first && first[0] === first[1]) {
        nextContext.strokeStyle = '#b8f34a';
        nextContext.lineWidth = 1.5;
        nextContext.beginPath();
        nextContext.arc(36, 31, 28, 0, Math.PI * 2);
        nextContext.stroke();
      }
      if (foresight >= 3 && queue[2]) {
        drawBlob(nextContext, 55, 115, 7, queue[2][0], 0.72, false);
        drawBlob(nextContext, 55, 102, 7, queue[2][1], 0.72, false);
      }
    }

    function bounceOut(t) {
      const n = 7.5625;
      const d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) { t -= 1.5 / d; return n * t * t + 0.75; }
      if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + 0.9375; }
      t -= 2.625 / d;
      return n * t * t + 0.984375;
    }

    function burst(x, y, color, chain) {
      const count = Math.min(16, 8 + Math.max(0, (chain || 1) - 1) * 2);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 90;
        particles.push({
          x: (x + 0.5) * cell,
          y: (y + 0.5) * cell,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20,
          life: 0.55 + Math.random() * 0.25,
          size: cell * (0.08 + Math.random() * 0.1),
          color: color === garbage ? '#b9b4c8' : colors[color - 1],
        });
      }
    }

    function update(dt) {
      particles.forEach((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 190 * dt;
        particle.life -= dt;
      });
      particles = particles.filter((particle) => particle.life > 0);
    }

    function startPop(cells, duration) {
      popCells = new Set(cells.map((position) => position[0] + ',' + position[1]));
      popStartedAt = performance.now();
      popDuration = duration;
    }

    function clearPop() { popCells.clear(); }
    function addRemoteLink(from, to) { remoteClearLinks.push({ from, to, startedAt: performance.now() }); }
    function clearRemoteLinks() { remoteClearLinks = []; }

    function startFall(offsets, duration) {
      fallOffsets = offsets;
      fallStartedAt = performance.now();
      fallDuration = duration;
    }

    function startGarbageFall(cells, duration) {
      garbageFalls = new Map(cells.map((position, index) => [position[0] + ',' + position[1], {
        startY: -1.1 - index * 0.28,
        delay: index * 55,
      }]));
      garbageFallStartedAt = performance.now();
      fallDuration = duration;
    }

    function resetEffects() {
      particles = [];
      popCells.clear();
      remoteClearLinks = [];
      fallOffsets.clear();
      garbageFalls.clear();
    }

    function drawBridge(x, y, color, nextX, nextY) {
      context.fillStyle = colors[color - 1];
      const padding = cell * 0.12;
      if (nextX !== x) context.fillRect(Math.min(x, nextX) * cell + cell / 2, y * cell + padding, cell, cell - padding * 2);
      else context.fillRect(x * cell + padding, Math.min(y, nextY) * cell + cell / 2, cell - padding * 2, cell);
    }

    function drawBoard(snapshot) {
      const board = snapshot.board;
      const width = cell * cols;
      const height = cell * rows;
      const now = performance.now();
      const fallProgress = Math.min(1, Math.max(0, (now - fallStartedAt) / fallDuration));
      const fallEase = 1 - Math.pow(1 - fallProgress, 3);
      context.clearRect(0, 0, width, height);
      const background = context.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, '#272044');
      background.addColorStop(1, '#1b1732');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      context.strokeStyle = 'rgba(255,255,255,.035)';
      context.lineWidth = 1;
      for (let x = 1; x < cols; x++) { context.beginPath(); context.moveTo(x * cell, 0); context.lineTo(x * cell, height); context.stroke(); }
      for (let y = 1; y < rows; y++) { context.beginPath(); context.moveTo(0, y * cell); context.lineTo(width, y * cell); context.stroke(); }

      if (remoteClearLinks.length && !(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        remoteClearLinks.forEach((link) => {
          const progress = Math.min(1, Math.max(0, (now - link.startedAt) / popDuration));
          context.save();
          context.globalAlpha = Math.sin(progress * Math.PI) * 0.9;
          context.strokeStyle = '#b8f34a';
          context.lineWidth = Math.max(2, cell * 0.09);
          context.setLineDash([cell * 0.2, cell * 0.12]);
          context.shadowColor = '#b8f34a';
          context.shadowBlur = cell * 0.35;
          context.beginPath();
          context.moveTo((link.from[0] + 0.5) * cell, (link.from[1] + 0.5) * cell);
          context.lineTo((link.to[0] + 0.5) * cell, (link.to[1] + 0.5) * cell);
          context.stroke();
          context.restore();
        });
      }

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const color = board[y][x];
          if (!color || popCells.has(x + ',' + y) || (fallProgress < 1 && fallOffsets.has(x + ',' + y))) continue;
          if (color !== garbage && x + 1 < cols && board[y][x + 1] === color && !popCells.has((x + 1) + ',' + y) && !fallOffsets.has((x + 1) + ',' + y)) drawBridge(x, y, color, x + 1, y);
          if (color !== garbage && y + 1 < rows && board[y + 1][x] === color && !popCells.has(x + ',' + (y + 1)) && !fallOffsets.has(x + ',' + (y + 1))) drawBridge(x, y, color, x, y + 1);
        }
      }

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const color = board[y][x];
          if (!color) continue;
          const popping = popCells.has(x + ',' + y);
          let scale = 1;
          let alpha = 1;
          let flash = 0;
          if (popping) {
            const progress = Math.min(1, Math.max(0, (now - popStartedAt) / popDuration));
            if (progress < 0.36) {
              scale = 1 + Math.sin(progress * Math.PI * 5) * 0.1;
              flash = Math.max(0, Math.sin((progress / 0.36) * Math.PI * 3)) * 0.32;
            } else {
              const shrink = (progress - 0.36) / 0.64;
              scale = Math.max(0.08, 1 - shrink * 0.92);
              alpha = 1 - shrink * 0.72;
            }
          }
          const key = x + ',' + y;
          const offset = fallOffsets.get(key) || 0;
          const garbageFall = color === garbage ? garbageFalls.get(key) : null;
          let drawY = y + 0.5 - offset * (1 - fallEase);
          let scaleX = scale;
          let scaleY = scale;
          if (garbageFall) {
            const elapsed = now - garbageFallStartedAt - garbageFall.delay;
            const progress = Math.min(1, Math.max(0, elapsed / 540));
            const bounced = bounceOut(progress);
            drawY = garbageFall.startY + (y + 0.5 - garbageFall.startY) * bounced;
            if (progress > 0.72 && progress < 1) {
              const squash = Math.sin(((progress - 0.72) / 0.28) * Math.PI) * 0.11;
              scaleX *= 1 + squash;
              scaleY *= 1 - squash;
            }
          }
          if (color === garbage) {
            context.save();
            context.translate((x + 0.5) * cell, drawY * cell);
            context.scale(scaleX, scaleY);
            drawGarbage(context, 0, 0, cell * 0.44, alpha, 1);
            context.restore();
          } else drawBlob(context, (x + 0.5) * cell, drawY * cell, cell * 0.44 * scale, color, alpha, true);
          if (flash > 0) {
            context.fillStyle = 'rgba(255,255,255,' + flash.toFixed(3) + ')';
            context.beginPath();
            context.arc((x + 0.5) * cell, drawY * cell, cell * 0.42 * scale, 0, Math.PI * 2);
            context.fill();
          }
        }
      }

      snapshot.ghostCells.forEach((position) => {
        if (position.y >= 0) drawBlob(context, (position.x + 0.5) * cell, (position.y + 0.5) * cell, cell * 0.39, position.color, 0.18, false);
      });
      snapshot.activeCells.forEach((position) => {
        if (position.y >= 0) drawBlob(context, (position.x + 0.5) * cell, (position.y + 0.5) * cell, cell * 0.43, position.color, 1, true);
      });
      particles.forEach((particle) => {
        context.globalAlpha = Math.max(0, particle.life / 0.7);
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
      if (fallProgress >= 1 && fallOffsets.size) fallOffsets.clear();
      if (garbageFalls.size && now - garbageFallStartedAt >= fallDuration) garbageFalls.clear();
    }

    return Object.freeze({ resize, drawNext, bounceOut, burst, update, startPop, clearPop, addRemoteLink, clearRemoteLinks, startFall, startGarbageFall, resetEffects, drawBoard });
  }

  global.PuyoRenderer = Object.freeze({ VERSION, create });
})(typeof window !== 'undefined' ? window : globalThis);
