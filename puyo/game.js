(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const boardWrap = $('boardWrap');
  const boardArea = boardWrap.parentElement;
  const nextCanvas = $('nextCanvas');
  const nextCtx = nextCanvas.getContext('2d');
  const scoreEl = $('score');
  const hiEl = $('hi');
  const levelEl = $('level');
  const runChainEl = $('runChain');
  const overlayEl = $('overlay');
  const ovTitle = $('ovTitle');
  const ovSub = $('ovSub');
  const ovBtn = $('ovBtn');
  const ovBack = $('ovBack');
  const resumeOverlay = $('resumeOverlay');
  const resumeSub = $('resumeSub');
  const btnResumeNew = $('btnResumeNew');
  const btnResumeContinue = $('btnResumeContinue');
  const btnPause = $('btnPause');
  const btnSound = $('btnSound');
  const icSoundOn = $('icSoundOn');
  const icSoundOff = $('icSoundOff');
  const chainPop = $('chainPop');
  const chainValue = $('chainValue');
  const chainGain = $('chainGain');
  const chainResult = $('chainResult');
  const levelPop = $('levelPop');

  const COLS = 6;
  const ROWS = 12;
  const COLORS = ['#ff5d8f', '#f6cf45', '#65dc70', '#4fc9e8', '#a979f7'];
  const DARKS = ['#bc2858', '#b98912', '#269b42', '#1686ac', '#6740bc'];
  const ROT = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const CHAIN_POWER = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512];
  const HI_KEY = 'puyo_hi_v1';
  const CHAIN_KEY = 'puyo_chain_v1';
  const SAVE_KEY = 'puyo_save_v1';
  const MUTE_KEY = 'puyo_muted_v1';

  let board = [];
  let pair = null;
  let queue = [];
  let mode = 'menu';
  let score = 0;
  let hi = readNumber(HI_KEY);
  let level = 1;
  let clearedTotal = 0;
  let bestChain = readNumber(CHAIN_KEY);
  let runMaxChain = 0;
  let hiAtStart = hi;
  let bestChainAtStart = bestChain;
  let cell = 32;
  let lastT = 0;
  let gravityAcc = 0;
  let lockAcc = 0;
  let saveAcc = 0;
  let resolveToken = 0;
  let particles = [];
  let popCells = new Set();
  let popStartedAt = 0;
  let popDuration = 280;
  let fallOffsets = new Map();
  let fallStartedAt = 0;
  let fallDuration = 210;
  let muted = readMuted();
  let audioCtx = null;
  let touchStart = null;
  let chainPopTimer = null;
  let chainResultTimer = null;
  let levelPopTimer = null;
  let lockResets = 0;

  function readNumber(key) {
    try { return parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { return 0; }
  }

  function readMuted() {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
  }

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function colorCount() {
    return level >= 6 ? 5 : 4;
  }

  function randomPair() {
    const count = colorCount();
    return [1 + Math.floor(Math.random() * count), 1 + Math.floor(Math.random() * count)];
  }

  function fillQueue() {
    while (queue.length < 3) queue.push(randomPair());
  }

  function pairCells(p, x, y, rot) {
    const o = ROT[rot];
    return [
      { x: x, y: y, color: p.colors[0] },
      { x: x + o[0], y: y + o[1], color: p.colors[1] },
    ];
  }

  function currentCells() {
    return pair ? pairCells(pair, pair.x, pair.y, pair.rot) : [];
  }

  function collidesAt(x, y, rot) {
    if (!pair) return true;
    return pairCells(pair, x, y, rot).some((p) => {
      if (p.x < 0 || p.x >= COLS || p.y >= ROWS) return true;
      return p.y >= 0 && board[p.y][p.x] !== 0;
    });
  }

  function spawnPair() {
    fillQueue();
    pair = { x: 2, y: 0, rot: 0, colors: queue.shift() };
    fillQueue();
    gravityAcc = 0;
    lockAcc = 0;
    lockResets = 0;
    drawNext();
    if (collidesAt(pair.x, pair.y, pair.rot)) gameOver();
  }

  function tryMove(dx, dy) {
    if (mode !== 'playing' || !pair) return false;
    if (collidesAt(pair.x + dx, pair.y + dy, pair.rot)) return false;
    pair.x += dx;
    pair.y += dy;
    if (dx && collidesAt(pair.x, pair.y + 1, pair.rot)) {
      if (lockResets < 12) { lockAcc = 0; lockResets++; }
    } else {
      lockAcc = 0;
    }
    if (dx) play('move');
    return true;
  }

  function rotate(dir) {
    if (mode !== 'playing' || !pair) return false;
    const next = (pair.rot + dir + 4) % 4;
    const kicks = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
    for (const k of kicks) {
      if (!collidesAt(pair.x + k[0], pair.y + k[1], next)) {
        pair.x += k[0];
        pair.y += k[1];
        pair.rot = next;
        if (collidesAt(pair.x, pair.y + 1, pair.rot)) {
          if (lockResets < 12) { lockAcc = 0; lockResets++; }
        } else {
          lockAcc = 0;
        }
        play('rotate');
        haptic(7);
        return true;
      }
    }
    return false;
  }

  function softDrop() {
    if (tryMove(0, 1)) {
      score += 1;
      updateHud();
      return true;
    }
    return false;
  }

  function hardDrop() {
    if (mode !== 'playing' || !pair) return;
    let distance = 0;
    while (tryMove(0, 1)) distance++;
    score += distance * 2;
    updateHud();
    play('drop');
    haptic(16);
    lockPair();
  }

  function lockPair() {
    if (!pair || mode !== 'playing') return;
    const cells = currentCells();
    if (cells.some((p) => p.y < 0)) {
      gameOver();
      return;
    }
    for (const p of cells) board[p.y][p.x] = p.color;
    pair = null;
    mode = 'resolving';
    btnPause.hidden = true;
    // 横向组合落在高低不平处时，两颗噗呦应分别沉降到各自的支撑面。
    applyGravity(true);
    play('land');
    haptic(9);
    resolveStep(1, ++resolveToken);
  }

  function findClearGroups() {
    const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const groups = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const color = board[y][x];
        if (!color || seen[y][x]) continue;
        const group = [];
        const stack = [[x, y]];
        seen[y][x] = true;
        while (stack.length) {
          const p = stack.pop();
          group.push(p);
          for (const d of dirs) {
            const nx = p[0] + d[0], ny = p[1] + d[1];
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
            if (!seen[ny][nx] && board[ny][nx] === color) {
              seen[ny][nx] = true;
              stack.push([nx, ny]);
            }
          }
        }
        if (group.length >= 4) groups.push({ color: color, cells: group });
      }
    }
    return groups;
  }

  function groupBonus(size) {
    if (size <= 4) return 0;
    if (size === 5) return 2;
    if (size === 6) return 3;
    if (size === 7) return 4;
    if (size === 8) return 5;
    if (size === 9) return 6;
    if (size === 10) return 7;
    return 10;
  }

  function resolveStep(chain, token) {
    if (token !== resolveToken) return;
    const groups = findClearGroups();
    if (!groups.length) {
      popCells.clear();
      if (chain > 2) showChainResult(chain - 1);
      mode = 'playing';
      btnPause.hidden = false;
      spawnPair();
      saveState();
      return;
    }

    const colors = new Set(groups.map((g) => g.color));
    const cells = groups.flatMap((g) => g.cells);
    const chainPower = CHAIN_POWER[Math.min(chain - 1, CHAIN_POWER.length - 1)];
    const colorBonus = colors.size <= 1 ? 0 : Math.pow(2, colors.size + 1);
    const sizeBonus = groups.reduce((sum, g) => sum + groupBonus(g.cells.length), 0);
    const multiplier = Math.max(1, chainPower + colorBonus + sizeBonus);
    const gained = cells.length * 10 * multiplier;

    const previousLevel = level;
    score += gained;
    clearedTotal += cells.length;
    level = Math.min(12, Math.floor(clearedTotal / 35) + 1);
    runMaxChain = Math.max(runMaxChain, chain);
    if (chain > bestChain) {
      bestChain = chain;
      try { localStorage.setItem(CHAIN_KEY, String(bestChain)); } catch (e) {}
    }
    updateHud();
    showChain(chain, gained);
    if (level > previousLevel) showLevel(level);
    play(chain > 1 ? 'chain' : 'clear', chain);
    haptic(chain >= 3 ? [22, 28, 22 + chain * 2] : chain > 1 ? [16, 24, 16] : 10);
    if (chain >= 3) shakeBoard(chain);

    popCells = new Set(cells.map((p) => p[0] + ',' + p[1]));
    popStartedAt = performance.now();
    popDuration = Math.max(170, 300 - (chain - 1) * 22);

    setTimeout(() => {
      if (token !== resolveToken) return;
      for (const p of cells) {
        makeBurst(p[0], p[1], board[p[1]][p[0]]);
        board[p[1]][p[0]] = 0;
      }
      popCells.clear();
      applyGravity(true);
      const settleDelay = Math.max(120, 225 - (chain - 1) * 14);
      setTimeout(() => resolveStep(chain + 1, token), settleDelay);
    }, popDuration);
  }

  function applyGravity(animate) {
    const offsets = new Map();
    for (let x = 0; x < COLS; x++) {
      let write = ROWS - 1;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y][x]) {
          const distance = write - y;
          board[write][x] = board[y][x];
          if (write !== y) board[y][x] = 0;
          if (animate && distance > 0) offsets.set(x + ',' + write, distance);
          write--;
        }
      }
      while (write >= 0) board[write--][x] = 0;
    }
    fallOffsets = offsets;
    fallStartedAt = performance.now();
    fallDuration = 190;
  }

  function showChain(chain, gained) {
    if (chain < 2) return;
    clearTimeout(chainPopTimer);
    chainValue.textContent = chain;
    chainGain.textContent = '+' + gained;
    chainPop.style.setProperty('--chain-size', Math.min(72, 48 + (chain - 2) * 4) + 'px');
    chainPop.hidden = true;
    void chainPop.offsetWidth;
    chainPop.hidden = false;
    chainPopTimer = setTimeout(() => {
      chainPop.hidden = true;
      chainPopTimer = null;
    }, 760);
  }

  function showChainResult(chain) {
    clearTimeout(chainResultTimer);
    chainResult.textContent = '本次 ' + chain + ' CHAIN!';
    chainResult.hidden = true;
    void chainResult.offsetWidth;
    chainResult.hidden = false;
    chainResultTimer = setTimeout(() => { chainResult.hidden = true; }, 1120);
  }

  function showLevel(nextLevel) {
    clearTimeout(levelPopTimer);
    levelPop.textContent = 'LEVEL ' + nextLevel + '!';
    levelPop.hidden = true;
    void levelPop.offsetWidth;
    levelPop.hidden = false;
    play('level', nextLevel);
    haptic([16, 28, 24]);
    levelPopTimer = setTimeout(() => { levelPop.hidden = true; }, 980);
  }

  function shakeBoard(chain) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    boardWrap.style.setProperty('--shake', Math.min(6, chain) + 'px');
    boardWrap.classList.remove('is-shaking');
    void boardWrap.offsetWidth;
    boardWrap.classList.add('is-shaking');
    setTimeout(() => boardWrap.classList.remove('is-shaking'), 260);
  }

  function gravityInterval() {
    return Math.max(0.12, 0.72 - (level - 1) * 0.052);
  }

  function update(dt) {
    updateParticles(dt);
    if (mode !== 'playing' || !pair) return;
    gravityAcc += dt;
    if (gravityAcc >= gravityInterval()) {
      gravityAcc -= gravityInterval();
      tryMove(0, 1);
    }
    if (collidesAt(pair.x, pair.y + 1, pair.rot)) {
      lockAcc += dt;
      if (lockAcc >= 0.48) lockPair();
    } else {
      lockAcc = 0;
    }
  }

  function newGame() {
    resolveToken++;
    board = emptyBoard();
    queue = [];
    pair = null;
    score = 0;
    level = 1;
    clearedTotal = 0;
    runMaxChain = 0;
    hiAtStart = hi;
    bestChainAtStart = bestChain;
    particles = [];
    popCells.clear();
    fallOffsets.clear();
    clearTimeout(chainPopTimer);
    clearTimeout(chainResultTimer);
    clearTimeout(levelPopTimer);
    chainPopTimer = null;
    chainResultTimer = null;
    levelPopTimer = null;
    chainPop.hidden = true;
    chainResult.hidden = true;
    levelPop.hidden = true;
    fillQueue();
    mode = 'playing';
    overlayEl.hidden = true;
    resumeOverlay.hidden = true;
    btnPause.hidden = false;
    spawnPair();
    updateHud();
    saveState();
    play('start');
  }

  function gameOver() {
    resolveToken++;
    pair = null;
    setMode('gameover');
    clearState();
    play('over');
    haptic([70, 45, 90]);
    updateHud();
  }

  function setMode(next) {
    mode = next;
    resumeOverlay.hidden = true;
    if (next === 'menu' || next === 'paused' || next === 'gameover') {
      showOverlay(next);
      btnPause.hidden = true;
    } else {
      overlayEl.hidden = true;
      btnPause.hidden = false;
    }
  }

  function showOverlay(kind) {
    ovBack.hidden = true;
    if (kind === 'menu') {
      ovTitle.textContent = '噗呦噗呦';
      ovSub.textContent = '连接 4 颗同色噗呦即可消除\n连续坠落消除会形成高分连锁';
      ovBtn.textContent = '开始实验';
    } else if (kind === 'paused') {
      ovTitle.textContent = '实验暂停';
      ovSub.textContent = '按「继续」或 P 回到连锁现场';
      ovBtn.textContent = '继续';
    } else if (kind === 'gameover') {
      ovTitle.textContent = '容器装满了';
      const records = [];
      if (score > hiAtStart && score > 0) records.push('最高分新纪录');
      if (runMaxChain > bestChainAtStart && runMaxChain > 0) records.push('连锁新纪录');
      ovSub.textContent = 'SCORE  ' + score + '\nLEVEL  ' + level + '\nMAX CHAIN  ' + runMaxChain + '\nBEST CHAIN  ' + bestChain + '\n消除  ' + clearedTotal + ' 颗' + (records.length ? '\nNEW RECORD! · ' + records.join(' / ') : '');
      ovBtn.textContent = '再来一局';
      ovBack.hidden = false;
    }
    overlayEl.hidden = false;
  }

  function togglePause() {
    stopHold();
    if (mode === 'playing') {
      setMode('paused');
      saveState();
    } else if (mode === 'paused') {
      lastT = performance.now();
      setMode('playing');
    }
  }

  function updateHud() {
    scoreEl.textContent = score;
    if (score > hi) {
      hi = score;
      try { localStorage.setItem(HI_KEY, String(hi)); } catch (e) {}
    }
    hiEl.textContent = hi;
    levelEl.textContent = level;
    runChainEl.textContent = runMaxChain;
  }

  function saveState() {
    if (mode !== 'playing' && mode !== 'paused') return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        board: board,
        pair: pair,
        queue: queue,
        score: score,
        level: level,
        clearedTotal: clearedTotal,
        runMaxChain: runMaxChain,
        hiAtStart: hiAtStart,
        bestChainAtStart: bestChainAtStart,
      }));
    } catch (e) {}
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
  }

  function validBoard(value) {
    return Array.isArray(value) && value.length === ROWS && value.every((row) =>
      Array.isArray(row) && row.length === COLS && row.every((v) => Number.isInteger(v) && v >= 0 && v <= COLORS.length)
    );
  }

  function validColors(value) {
    return Array.isArray(value) && value.length === 2 && value.every((color) =>
      Number.isInteger(color) && color >= 1 && color <= COLORS.length
    );
  }

  function validPair(value) {
    return !!value &&
      Number.isInteger(value.x) && value.x >= 0 && value.x < COLS &&
      Number.isInteger(value.y) && value.y >= -1 && value.y < ROWS &&
      Number.isInteger(value.rot) && value.rot >= 0 && value.rot < ROT.length &&
      validColors(value.colors);
  }

  function restoreState(s) {
    board = validBoard(s.board) ? s.board : emptyBoard();
    pair = validPair(s.pair) ? s.pair : null;
    queue = Array.isArray(s.queue) ? s.queue.filter(validColors) : [];
    score = Number.isFinite(s.score) ? Math.max(0, s.score) : 0;
    level = Number.isFinite(s.level) ? Math.max(1, Math.min(12, s.level)) : 1;
    clearedTotal = Number.isFinite(s.clearedTotal) ? Math.max(0, s.clearedTotal) : 0;
    runMaxChain = Number.isFinite(s.runMaxChain) ? Math.max(0, s.runMaxChain) : 0;
    hiAtStart = Number.isFinite(s.hiAtStart) ? Math.max(0, s.hiAtStart) : hi;
    bestChainAtStart = Number.isFinite(s.bestChainAtStart) ? Math.max(0, s.bestChainAtStart) : bestChain;
    fillQueue();
    if (!pair || collidesAt(pair.x, pair.y, pair.rot)) spawnPair();
    updateHud();
    drawNext();
    return mode !== 'gameover' && !!pair;
  }

  function clearState() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  function ensureAudio() {
    if (muted) return null;
    if (audioCtx) return audioCtx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      return audioCtx;
    } catch (e) { return null; }
  }

  function play(name, chain) {
    const ac = ensureAudio();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;
    let freq = 240, dur = 0.06, type = 'sine', vol = 0.07;
    if (name === 'rotate') { freq = 430; dur = 0.07; type = 'triangle'; }
    else if (name === 'land') { freq = 120; dur = 0.06; type = 'square'; vol = 0.04; }
    else if (name === 'drop') { freq = 190; dur = 0.12; type = 'sawtooth'; }
    else if (name === 'clear') { freq = 560; dur = 0.16; type = 'triangle'; vol = 0.1; }
    else if (name === 'chain') { freq = 520 + Math.min(chain || 1, 10) * 75; dur = 0.22; type = 'triangle'; vol = 0.11; }
    else if (name === 'level') { freq = 520 + Math.min(chain || 1, 12) * 24; dur = 0.32; type = 'triangle'; vol = 0.1; }
    else if (name === 'start') { freq = 390; dur = 0.18; type = 'triangle'; vol = 0.09; }
    else if (name === 'over') { freq = 260; dur = 0.6; type = 'sawtooth'; vol = 0.1; }
    else if (name === 'move') { freq = 190; dur = 0.025; vol = 0.025; }
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (name === 'over') osc.frequency.exponentialRampToValueAtTime(70, now + dur);
    else if (name === 'chain') osc.frequency.exponentialRampToValueAtTime(freq * 1.45, now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
    if (name === 'chain' || name === 'level') {
      const upper = ac.createOscillator();
      const upperGain = ac.createGain();
      upper.type = 'sine';
      upper.frequency.setValueAtTime(freq * (name === 'chain' ? 1.5 : 1.25), now + 0.055);
      upperGain.gain.setValueAtTime(0.001, now);
      upperGain.gain.exponentialRampToValueAtTime(vol * 0.7, now + 0.06);
      upperGain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.08);
      upper.connect(upperGain);
      upperGain.connect(ac.destination);
      upper.start(now + 0.05);
      upper.stop(now + dur + 0.1);
    }
  }

  function haptic(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  function applyMuted() {
    icSoundOn.hidden = muted;
    icSoundOff.hidden = !muted;
    btnSound.setAttribute('aria-label', muted ? '开启声音' : '关闭声音');
  }

  function resize() {
    const rect = boardArea.getBoundingClientRect();
    cell = Math.max(18, Math.floor(Math.min(rect.width / COLS, rect.height / ROWS)));
    const w = cell * COLS, h = cell * ROWS;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    boardWrap.style.width = w + 'px';
    boardWrap.style.height = h + 'px';
    boardWrap.style.setProperty('--cell', cell + 'px');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nextCanvas.width = 144;
    nextCanvas.height = 248;
    nextCtx.setTransform(2, 0, 0, 2, 0, 0);
    drawNext();
  }

  function makeBurst(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 35 + Math.random() * 90;
      particles.push({
        x: (x + 0.5) * cell,
        y: (y + 0.5) * cell,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 20,
        life: 0.55 + Math.random() * 0.25,
        size: cell * (0.08 + Math.random() * 0.1),
        color: COLORS[color - 1],
      });
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 190 * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
  }

  function drawBlob(target, x, y, radius, color, alpha, eyes) {
    const base = COLORS[color - 1];
    const dark = DARKS[color - 1];
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

  function drawBridge(x, y, color, nx, ny) {
    ctx.fillStyle = COLORS[color - 1];
    const pad = cell * 0.12;
    if (nx !== x) ctx.fillRect(Math.min(x, nx) * cell + cell / 2, y * cell + pad, cell, cell - pad * 2);
    else ctx.fillRect(x * cell + pad, Math.min(y, ny) * cell + cell / 2, cell - pad * 2, cell);
  }

  function drawBoard() {
    const w = cell * COLS, h = cell * ROWS;
    const now = performance.now();
    const fallT = Math.min(1, Math.max(0, (now - fallStartedAt) / fallDuration));
    const fallEase = 1 - Math.pow(1 - fallT, 3);
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#272044');
    grad.addColorStop(1, '#1b1732');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, h); ctx.stroke(); }
    for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(w, y * cell); ctx.stroke(); }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const color = board[y][x];
        if (!color) continue;
        if (popCells.has(x + ',' + y)) continue;
        if (fallT < 1 && fallOffsets.has(x + ',' + y)) continue;
        if (x + 1 < COLS && board[y][x + 1] === color && !popCells.has((x + 1) + ',' + y) && !fallOffsets.has((x + 1) + ',' + y)) drawBridge(x, y, color, x + 1, y);
        if (y + 1 < ROWS && board[y + 1][x] === color && !popCells.has(x + ',' + (y + 1)) && !fallOffsets.has(x + ',' + (y + 1))) drawBridge(x, y, color, x, y + 1);
      }
    }
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const color = board[y][x];
        if (!color) continue;
        const popping = popCells.has(x + ',' + y);
        let scale = 1;
        let alpha = 1;
        let flash = 0;
        if (popping) {
          const t = Math.min(1, Math.max(0, (now - popStartedAt) / popDuration));
          if (t < 0.36) {
            scale = 1 + Math.sin(t * Math.PI * 5) * 0.1;
            flash = Math.max(0, Math.sin((t / 0.36) * Math.PI * 3)) * 0.32;
          }
          else {
            const shrink = (t - 0.36) / 0.64;
            scale = Math.max(0.08, 1 - shrink * 0.92);
            alpha = 1 - shrink * 0.72;
          }
        }
        const offset = fallOffsets.get(x + ',' + y) || 0;
        const drawY = y + 0.5 - offset * (1 - fallEase);
        drawBlob(ctx, (x + 0.5) * cell, drawY * cell, cell * 0.44 * scale, color, alpha, true);
        if (flash > 0) {
          ctx.fillStyle = 'rgba(255,255,255,' + flash.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc((x + 0.5) * cell, drawY * cell, cell * 0.42 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (pair && (mode === 'playing' || mode === 'paused')) {
      let gy = pair.y;
      while (!collidesAt(pair.x, gy + 1, pair.rot)) gy++;
      for (const p of pairCells(pair, pair.x, gy, pair.rot)) {
        if (p.y >= 0) drawBlob(ctx, (p.x + 0.5) * cell, (p.y + 0.5) * cell, cell * 0.39, p.color, 0.18, false);
      }
      for (const p of currentCells()) {
        if (p.y >= 0) drawBlob(ctx, (p.x + 0.5) * cell, (p.y + 0.5) * cell, cell * 0.43, p.color, 1, true);
      }
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.7);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (fallT >= 1 && fallOffsets.size) fallOffsets.clear();
  }

  function drawNext() {
    if (!nextCtx) return;
    nextCtx.clearRect(0, 0, 72, 124);
    const first = queue[0];
    const second = queue[1];
    if (first) {
      drawBlob(nextCtx, 36, 47, 19, first[0], 1, true);
      drawBlob(nextCtx, 36, 15, 19, first[1], 1, true);
    }
    if (second) {
      nextCtx.strokeStyle = 'rgba(255,255,255,.12)';
      nextCtx.beginPath(); nextCtx.moveTo(15, 68); nextCtx.lineTo(57, 68); nextCtx.stroke();
      drawBlob(nextCtx, 36, 105, 14, second[0], 0.82, true);
      drawBlob(nextCtx, 36, 80, 14, second[1], 0.82, true);
    }
  }

  function frame(now) {
    if (!lastT) lastT = now;
    const dt = Math.min((now - lastT) / 1000, 0.04);
    lastT = now;
    update(dt);
    saveAcc += dt;
    if (saveAcc >= 1) { saveAcc -= 1; saveState(); }
    drawBoard();
    requestAnimationFrame(frame);
  }

  function action(name) {
    ensureAudio();
    if (name === 'left') tryMove(-1, 0);
    else if (name === 'right') tryMove(1, 0);
    else if (name === 'down') softDrop();
    else if (name === 'cw') rotate(1);
    else if (name === 'ccw') rotate(-1);
    else if (name === 'drop') hardDrop();
  }

  let holdTimer = null;
  let repeatTimer = null;
  let heldButton = null;
  function stopHold() {
    clearTimeout(holdTimer);
    clearInterval(repeatTimer);
    holdTimer = null;
    repeatTimer = null;
    if (heldButton) heldButton.classList.remove('is-pressed');
    heldButton = null;
  }

  document.querySelectorAll('.ctl').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      stopHold();
      heldButton = btn;
      btn.classList.add('is-pressed');
      if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
      const name = btn.dataset.a;
      action(name);
      if (name === 'left' || name === 'right' || name === 'down') {
        holdTimer = setTimeout(() => {
          repeatTimer = setInterval(() => action(name), name === 'down' ? 42 : 76);
        }, 185);
      }
    });
    btn.addEventListener('pointerup', stopHold);
    btn.addEventListener('pointercancel', stopHold);
    btn.addEventListener('lostpointercapture', stopHold);
  });

  document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'z', 'Z', 'x', 'X'].includes(key)) e.preventDefault();
    if (e.repeat && !['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(key)) return;
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') action('left');
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') action('right');
    else if (key === 'ArrowDown' || key === 's' || key === 'S') action('down');
    else if (key === 'ArrowUp' || key === 'x' || key === 'X') action('cw');
    else if (key === 'z' || key === 'Z') action('ccw');
    else if (key === ' ') action('drop');
    else if (key === 'p' || key === 'P' || key === 'Escape') togglePause();
  });

  boardWrap.addEventListener('pointerdown', (e) => {
    touchStart = { x: e.clientX, y: e.clientY };
  });
  boardWrap.addEventListener('pointerup', (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) action('cw');
    else if (Math.abs(dx) > Math.abs(dy)) action(dx > 0 ? 'right' : 'left');
    else if (dy > 45) action('drop');
    else if (dy > 0) action('down');
    else action('cw');
  });

  btnPause.addEventListener('click', togglePause);
  btnSound.addEventListener('click', () => {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    applyMuted();
    if (!muted) ensureAudio();
  });
  ovBtn.addEventListener('click', () => {
    ensureAudio();
    if (mode === 'menu' || mode === 'gameover') newGame();
    else if (mode === 'paused') setMode('playing');
  });
  btnResumeContinue.addEventListener('click', () => {
    resumeOverlay.hidden = true;
    lastT = performance.now();
    mode = 'playing';
    btnPause.hidden = false;
    ensureAudio();
  });
  btnResumeNew.addEventListener('click', newGame);

  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', saveState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && mode === 'playing') togglePause();
  });

  board = emptyBoard();
  fillQueue();
  resize();
  applyMuted();
  updateHud();
  const saved = loadState();
  if (saved && validBoard(saved.board)) {
    if (restoreState(saved)) {
      mode = 'resume';
      resumeSub.textContent = '得分 ' + score + ' · 等级 ' + level + ' · 本局连锁 ' + runMaxChain;
      resumeOverlay.hidden = false;
      btnPause.hidden = true;
    } else {
      clearState();
      board = emptyBoard();
      queue = [];
      pair = null;
      fillQueue();
      drawNext();
      setMode('menu');
    }
  } else {
    setMode('menu');
  }
  requestAnimationFrame(frame);

  if (window.__DSH_TEST__ || new URLSearchParams(location.search).has('test')) {
    window.__puyoTest = {
      getState: () => ({ board: board.map((r) => r.slice()), pair: pair ? JSON.parse(JSON.stringify(pair)) : null, score, level, mode, runMaxChain, bestChain, clearedTotal }),
      setBoard: (next) => { if (validBoard(next)) board = next.map((r) => r.slice()); },
      setProgress: (cleared, nextScore) => {
        clearedTotal = Math.max(0, Number(cleared) || 0);
        level = Math.min(12, Math.floor(clearedTotal / 35) + 1);
        if (Number.isFinite(nextScore)) score = Math.max(0, nextScore);
        updateHud();
      },
      resolve: () => { mode = 'resolving'; pair = null; resolveStep(1, ++resolveToken); },
      newGame: newGame,
    };
  }
})();
