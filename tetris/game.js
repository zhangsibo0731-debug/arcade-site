(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const boardEl = $('board');
  const ctx = boardEl.getContext('2d');
  const holdCanvas = $('holdCanvas');
  const nextCanvas = $('nextCanvas');
  const boardWrap = $('boardWrap');

  const scoreEl = $('score');
  const hiEl = $('hi');
  const levelEl = $('level');
  const linesEl = $('lines');
  const overlayEl = $('overlay');
  const ovTitle = $('ovTitle');
  const ovSub = $('ovSub');
  const ovBtn = $('ovBtn');
  const btnPause = $('btnPause');
  const btnSound = $('btnSound');
  const icSoundOn = $('icSoundOn');
  const icSoundOff = $('icSoundOff');
  const holdPanel = $('holdPanel');
  const resumeOverlay = $('resumeOverlay');
  const resumeSub = $('resumeSub');
  const btnResumeNew = $('btnResumeNew');
  const btnResumeContinue = $('btnResumeContinue');

  // ---------- 常量 ----------
  const COLS = 10;
  const ROWS = 20;
  const HI_KEY = 'tetris_hi_v1';
  const MUTE_KEY = 'tetris_muted_v1';
  const SAVE_KEY = 'tetris_save_v1';
  const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const COLORS = {
    I: '#22d3ee', O: '#ffd43b', T: '#b784f6', S: '#69db7c',
    Z: '#ff6b6b', J: '#4dabf7', L: '#ffa94d',
  };
  const CLEAR_PTS = [0, 100, 300, 500, 800];
  const LOCK_DELAY = 0.5;       // 落地缓冲（秒）：触底后仍可移动/旋转
  const MAX_LOCK_RESETS = 4;    // 缓冲最多重置次数，防止无限滑

  // ---------- 方块定义 ----------
  function rotateCW(m) {
    const N = m.length;
    const out = Array.from({ length: N }, () => Array(N).fill(0));
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        out[x][N - 1 - y] = m[y][x];
      }
    }
    return out;
  }
  function makePiece(matrix) {
    const states = [];
    let m = matrix.map((r) => r.slice());
    for (let k = 0; k < 4; k++) {
      const cells = [];
      for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
          if (m[y][x]) cells.push([x, y]);
        }
      }
      states.push(cells);
      m = rotateCW(m);
    }
    return { states, size: matrix.length };
  }

  const PIECES = {
    I: makePiece([[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]]),
    O: makePiece([[1, 1], [1, 1]]),
    T: makePiece([[0, 1, 0], [1, 1, 1], [0, 0, 0]]),
    S: makePiece([[0, 1, 1], [1, 1, 0], [0, 0, 0]]),
    Z: makePiece([[1, 1, 0], [0, 1, 1], [0, 0, 0]]),
    J: makePiece([[1, 0, 0], [1, 1, 1], [0, 0, 0]]),
    L: makePiece([[0, 0, 1], [1, 1, 1], [0, 0, 0]]),
  };

  // ---------- 状态 ----------
  let W = 0, H = 0, cell = 24;
  let mode = 'menu'; // menu | playing | paused | gameover
  let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let current = null; // { type, stateIndex, x, y }
  let holdType = null;
  let canHold = true;
  let bag = [];
  let nextType = null;
  let score = 0, lines = 0, level = 1, hi = 0;
  let gravityAcc = 0;
  let leftAcc = 0, rightAcc = 0, downAcc = 0;
  let keys = { left: false, right: false, down: false };
  let lastT = 0;
  let spawnHold = 0;
  let saveAcc = 0;
  // 消行视觉反馈：行闪烁 + 浮动得分
  let fx = { text: '', text2: '', big: false, until: 0, rows: [], rowsUntil: 0 };
  // 触屏长按重复
  let ctlHold = null; // { action: left|right|down, t, acc }
  // 落地缓冲
  let lockDelay = 0, lockResets = 0;
  // 粒子 & 冲击环（消行碎片 / 硬降轨迹）
  let particles = [];
  let rings = [];

  // ---------- 音效 ----------
  let audioCtx = null;
  let muted = readMuted();

  function readMuted() {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
  }
  function readHi() {
    try { return parseInt(localStorage.getItem(HI_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function ensureAudio() {
    if (muted) return null;
    if (audioCtx) return audioCtx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    } catch (e) { return null; }
    return audioCtx;
  }
  function play(name, pitch) {
    const ac = ensureAudio();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;
    let freq = 220, dur = 0.05, type = 'square', vol = 0.12;
    switch (name) {
      case 'move': freq = 320; dur = 0.03; type = 'square'; vol = 0.05; break;
      case 'rotate': freq = 360; dur = 0.04; type = 'square'; vol = 0.08; break;
      case 'lock': freq = 160; dur = 0.05; type = 'triangle'; vol = 0.12; break;
      case 'clear': freq = 500; dur = 0.12; type = 'triangle'; vol = 0.15; break;
      case 'tetris': freq = 660; dur = 0.2; type = 'triangle'; vol = 0.16; break;
      case 'hold': freq = 280; dur = 0.04; type = 'square'; vol = 0.08; break;
      case 'drop': freq = 200; dur = 0.08; type = 'sawtooth'; vol = 0.1; break;
      case 'over': freq = 140; dur = 0.5; type = 'sawtooth'; vol = 0.18; break;
    }
    freq *= (pitch || 1);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (name === 'over') osc.frequency.exponentialRampToValueAtTime(50, now + dur);
    else if (name === 'tetris') osc.frequency.exponentialRampToValueAtTime(freq * 1.6, now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }
  function applyMuted() {
    icSoundOn.hidden = muted;
    icSoundOff.hidden = !muted;
    btnSound.setAttribute('aria-label', muted ? '开启声音' : '关闭声音');
  }

  // ---------- 工具 ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function spawnXFor(type) {
    return Math.floor((COLS - PIECES[type].size) / 2);
  }
  function gravityInterval() {
    return Math.max(90, 760 * Math.pow(0.85, level - 1));
  }

  // ---------- 7-bag ----------
  function refillBag() { bag = shuffle(TYPES); }
  function nextFromBag() {
    if (bag.length === 0) refillBag();
    return bag.shift();
  }

  // ---------- 落地缓冲 ----------
  function startLock() {
    if (mode !== 'playing' || lockDelay > 0) return;
    lockDelay = LOCK_DELAY;
    lockResets = 0;
  }
  function resetLock() { lockDelay = 0; lockResets = 0; }
  // 移动/旋转成功后调用：若方块已不触底则取消缓冲继续下落；否则重置缓冲（有限次）
  function onPieceMoved() {
    if (lockDelay <= 0) return;
    if (!collidesAt(current.x, current.y + 1, current.type, current.stateIndex)) {
      resetLock();
    } else if (lockResets < MAX_LOCK_RESETS) {
      lockDelay = LOCK_DELAY;
      lockResets++;
    }
  }

  // ---------- 粒子 ----------
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt * (p.decay || 2);
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += r.speed * dt;
      r.life -= dt * 3;
      if (r.life <= 0) rings.splice(i, 1);
    }
  }

  // ---------- 碰撞 ----------
  function cellsOf(p) {
    return PIECES[p.type].states[p.stateIndex];
  }
  function collidesAt(px, py, type, stateIndex) {
    const st = PIECES[type].states[stateIndex];
    for (const o of st) {
      const x = px + o[0], y = py + o[1];
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && board[y][x]) return true;
    }
    return false;
  }
  function collides() {
    return collidesAt(current.x, current.y, current.type, current.stateIndex);
  }

  // ---------- 操作 ----------
  function tryMove(dx, dy) {
    current.x += dx;
    current.y += dy;
    if (collides()) {
      current.x -= dx;
      current.y -= dy;
      return false;
    }
    onPieceMoved();
    return true;
  }
  function rotate(dir) {
    const next = (current.stateIndex + dir + 4) % 4;
    const kicks = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]];
    for (const k of kicks) {
      if (!collidesAt(current.x + k[0], current.y + k[1], current.type, next)) {
        current.x += k[0];
        current.y += k[1];
        current.stateIndex = next;
        onPieceMoved();
        play('rotate');
        return;
      }
    }
  }
  function hardDrop() {
    if (mode !== 'playing' || !current) return;
    const startY = current.y;
    let dist = 0;
    while (tryMove(0, 1)) dist++;
    score += dist * 2;
    updateHud();
    // 下落轨迹粒子（沿路径撒色块残影）
    for (let i = 1; i < dist; i += 2) {
      for (const o of cellsOf(current)) {
        const px = (current.x + o[0] + 0.5) * cell;
        const py = (startY + i + o[1] + 0.5) * cell;
        particles.push({ x: px, y: py, vx: 0, vy: 260, life: 0.3, size: cell * 0.4, color: COLORS[current.type], decay: 3 });
      }
    }
    // 落点冲击环
    rings.push({ x: W / 2, y: (current.y + 0.5) * cell, r: cell, speed: 460, life: 1, color: '#ffffff' });
    play('drop');
    lock();
  }
  function softDropOnce() {
    if (!tryMove(0, 1)) startLock();
  }
  function hold() {
    if (mode !== 'playing' || !canHold || !current) return;
    const t = current.type;
    if (holdType) {
      current = { type: holdType, stateIndex: 0, x: spawnXFor(holdType), y: 0 };
      holdType = t;
    } else {
      holdType = t;
      current = { type: nextType, stateIndex: 0, x: spawnXFor(nextType), y: 0 };
      nextType = nextFromBag();
    }
    canHold = false;
    if (collides()) gameOver();
    play('hold');
  }

  function lock() {
    const st = cellsOf(current);
    for (const o of st) {
      const x = current.x + o[0], y = current.y + o[1];
      if (y < 0) { gameOver(); return; }
      board[y][x] = COLORS[current.type];
    }
    clearLines();
    play('lock');
    spawn();
    saveState();
  }

  function clearLines() {
    let cleared = 0;
    const clearedRows = [];
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every((c) => c)) {
        // 消行碎片：每格两片色块向上飞散
        for (let x = 0; x < COLS; x++) {
          const col = board[y][x];
          const cx = (x + 0.5) * cell, cy = (y + 0.5) * cell;
          for (let k = 0; k < 2; k++) {
            const a = -Math.PI / 2 + (Math.random() * 2 - 1) * 1.3;
            const sp = 70 + Math.random() * 130;
            particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, size: cell * 0.5, color: col, decay: 2.4 });
          }
        }
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        clearedRows.push(y);
        cleared++;
        y++;
      }
    }
    if (cleared > 0) {
      const pts = CLEAR_PTS[Math.min(cleared, 4)] * level; // 防御：cleared 超 4 时封顶
      score += pts;
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      play(cleared === 4 ? 'tetris' : 'clear', 1 + (cleared - 1) * 0.12);
      updateHud();
      // 可见奖励：被消行白闪 + 浮动得分大字
      const now = performance.now();
      fx.rows = clearedRows;
      fx.rowsUntil = now + 240;
      const labels = { 1: '单消', 2: '双消', 3: '三消', 4: '四消' };
      fx.big = cleared >= 3;
      if (cleared === 4) {
        fx.text = 'TETRIS!';
        fx.text2 = '+' + pts + ' ' + labels[cleared];
      } else {
        fx.text = '+' + pts + ' ' + labels[cleared];
        fx.text2 = '';
      }
      fx.until = now + 1100;
    }
  }

  function spawn() {
    current = { type: nextType, stateIndex: 0, x: spawnXFor(nextType), y: 0 };
    nextType = nextFromBag();
    canHold = true;
    resetLock();
    if (collides()) gameOver();
  }

  function saveState() {
    if (mode !== 'playing' && mode !== 'paused') return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        score: score, lines: lines, level: level,
        board: board, current: current,
        holdType: holdType, canHold: canHold,
        nextType: nextType, bag: bag,
      }));
    } catch (e) {}
  }

  function clearState() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
  }

  function restoreState(s) {
    score = s.score || 0;
    lines = s.lines || 0;
    level = s.level || 1;
    board = (s.board && s.board.length === ROWS) ? s.board : Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    bag = (Array.isArray(s.bag) && s.bag.length) ? s.bag : [];
    if (!bag.length) refillBag();
    nextType = s.nextType || nextFromBag();
    holdType = s.holdType || null;
    canHold = s.canHold !== false;
    current = s.current || null;
    ctlHold = null;
    resetLock();
    particles = [];
    rings = [];
    updateHud();
  }

  // ---------- 流程 ----------
  function newGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0; lines = 0; level = 1;
    holdType = null; canHold = true;
    bag = [];
    nextType = nextFromBag();
    gravityAcc = 0; leftAcc = 0; rightAcc = 0; downAcc = 0;
    keys = { left: false, right: false, down: false };
    ctlHold = null;
    resetLock();
    particles = [];
    rings = [];
    spawn();
    setMode('playing');
    updateHud();
    saveState();
  }

  function gameOver() {
    setMode('gameover');
    play('over');
    clearState();
    if (score > hi) {
      hi = score;
      try { localStorage.setItem(HI_KEY, String(hi)); } catch (e) {}
    }
    updateHud();
  }

  function setMode(m) {
    mode = m;
    resumeOverlay.hidden = true;
    if (m === 'menu' || m === 'paused' || m === 'gameover') {
      showOverlay(m);
      btnPause.hidden = true;
    } else {
      overlayEl.hidden = true;
      btnPause.hidden = false;
    }
  }

  function showOverlay(m) {
    if (m === 'menu') {
      ovTitle.textContent = '俄罗斯方块';
      ovSub.textContent = '消除整行得分\n一次消 2/3/4 行，奖励更高（四消 TETRIS!）';
      ovBtn.textContent = '开始游戏';
    } else if (m === 'paused') {
      ovTitle.textContent = '已暂停';
      ovSub.textContent = '按「继续」或 P 回到游戏';
      ovBtn.textContent = '继续';
    } else if (m === 'gameover') {
      ovTitle.textContent = '游戏结束';
      ovSub.textContent = '得分 ' + score + ' · 消行 ' + lines + (score >= hi && score > 0 ? ' · 新纪录！' : '');
      ovBtn.textContent = '再来一局';
    }
    overlayEl.hidden = false;
  }

  function togglePause() {
    if (mode === 'playing') setMode('paused');
    else if (mode === 'paused') setMode('playing');
  }

  function updateHud() {
    scoreEl.textContent = score;
    if (score > hi) {
      hi = score;
      try { localStorage.setItem(HI_KEY, String(hi)); } catch (e) {}
    }
    hiEl.textContent = hi;
    levelEl.textContent = level;
    linesEl.textContent = lines;
  }

  // ---------- 布局 ----------
  function resize() {
    // 用父容器（.board-area，有确定的 flex 尺寸）计算，避免测量包裹画布自身的循环依赖
    const area = boardWrap.parentElement.getBoundingClientRect();
    const availW = area.width;
    const availH = area.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.max(1, Math.floor(Math.min(availW, availH / 2)));
    const bh = bw * 2;
    boardEl.style.width = bw + 'px';
    boardEl.style.height = bh + 'px';
    boardEl.width = Math.round(bw * dpr);
    boardEl.height = Math.round(bh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = bw; H = bh;
    cell = bw / COLS;

    sizePreview(holdCanvas);
    sizePreview(nextCanvas);
  }

  function sizePreview(c) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = c.clientWidth || 48;
    c.width = Math.round(s * dpr);
    c.height = Math.round(s * dpr);
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------- 绘制 ----------
  function drawBlockOn(g, px, py, s, color, alpha) {
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.fillRect(px + 1, py + 1, s - 2, s - 2);
    g.fillStyle = 'rgba(255,255,255,.3)';
    const e = Math.max(2, s * 0.16);
    g.fillRect(px + 1, py + 1, s - 2, e);
    g.fillRect(px + 1, py + 1, e, s - 2);
    g.fillStyle = 'rgba(0,0,0,.28)';
    g.fillRect(px + 1, py + s - 1 - e, s - 2, e);
    g.fillRect(px + s - 1 - e, py + 1, e, s - 2);
    g.globalAlpha = 1;
  }

  function ghostY() {
    let y = current.y;
    while (!collidesAt(current.x, y + 1, current.type, current.stateIndex)) y++;
    return y;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // 网格
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, H);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(W, y * cell + 0.5);
      ctx.stroke();
    }

    // 已锁定方块
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) drawBlockOn(ctx, x * cell, y * cell, cell, board[y][x], 1);
      }
    }

    // 幽灵
    if (current && mode === 'playing') {
      const gy = ghostY();
      for (const o of cellsOf(current)) {
        const x = current.x + o[0], y = gy + o[1];
        if (y < 0) continue;
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = COLORS[current.type];
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
        ctx.globalAlpha = 1;
      }
    }

    // 当前方块
    if (current) {
      for (const o of cellsOf(current)) {
        const x = current.x + o[0], y = current.y + o[1];
        if (y < 0) continue;
        drawBlockOn(ctx, x * cell, y * cell, cell, COLORS[current.type], 1);
      }
    }

    // 粒子（消行碎片 / 硬降轨迹）
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      const s = p.size || cell * 0.5;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;

    // 冲击环（硬降落点）
    for (const r of rings) {
      ctx.globalAlpha = Math.max(0, r.life);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 消行白闪
    if (fx.rowsUntil > performance.now()) {
      const t = Math.max(0, (fx.rowsUntil - performance.now()) / 240);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.75 * t).toFixed(3) + ')';
      for (const y of fx.rows) {
        ctx.fillRect(0, y * cell, W, cell);
      }
    }

    // 浮动得分（字号按棋盘宽度自动缩放，四消拆两行，保证不超出屏幕）
    if (fx.until > performance.now()) {
      const total = 1100;
      const t = 1 - (fx.until - performance.now()) / total; // 0..1
      const pop = t < 0.12 ? 0.5 + (t / 0.12) * 0.6 : 1.1 - Math.min(0.12, (t - 0.12) * 0.25);
      const fade = Math.max(0, Math.min(1, (fx.until - performance.now()) / 320));
      ctx.save();
      ctx.translate(W / 2, H * 0.28);
      ctx.scale(pop, pop);
      ctx.globalAlpha = fade;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (fx.big && fx.text2) {
        // 两行：金色 TETRIS! + 白色得分
        ctx.fillStyle = '#ffd43b';
        ctx.shadowColor = '#ffd43b';
        ctx.shadowBlur = 18;
        ctx.font = fitFont('800 30px', fx.text, W * 0.92);
        ctx.fillText(fx.text, 0, -13);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.font = fitFont('700 20px', fx.text2, W * 0.92);
        ctx.fillText(fx.text2, 0, 15);
      } else {
        ctx.fillStyle = fx.big ? '#ffd43b' : '#ffffff';
        ctx.shadowColor = '#ffd43b';
        ctx.shadowBlur = fx.big ? 18 : 10;
        ctx.font = fitFont(fx.big ? '800 26px' : '700 24px', fx.text, W * 0.9);
        ctx.fillText(fx.text, 0, 0);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // 字号自动缩小到文字宽度不超过 maxW（防止超出棋盘）
  function fitFont(base, text, maxW) {
    const m = base.match(/(\d+)px/);
    const size = m ? parseInt(m[1], 10) : 20;
    const weight = base.split(' ')[0] || '700';
    let s = size;
    for (; s > 10; s--) {
      ctx.font = weight + ' ' + s + 'px "Space Grotesk", "PingFang SC", sans-serif';
      if (ctx.measureText(text).width <= maxW) break;
    }
    return weight + ' ' + s + 'px "Space Grotesk", "PingFang SC", sans-serif';
  }

  function drawPreview(canvasEl, type) {
    const g = canvasEl.getContext('2d');
    const s = canvasEl.clientWidth || 48;
    g.clearRect(0, 0, s, s);
    if (!type) return;
    const cells = PIECES[type].states[0];
    let minX = 9, maxX = 0, minY = 9, maxY = 0;
    for (const o of cells) {
      minX = Math.min(minX, o[0]); maxX = Math.max(maxX, o[0]);
      minY = Math.min(minY, o[1]); maxY = Math.max(maxY, o[1]);
    }
    const bw = (maxX - minX + 1), bh = (maxY - minY + 1);
    const cs = Math.floor(s / Math.max(bw, bh) * 0.72);
    const ox = (s - bw * cs) / 2 - minX * cs;
    const oy = (s - bh * cs) / 2 - minY * cs;
    for (const o of cells) {
      drawBlockOn(g, ox + o[0] * cs, oy + o[1] * cs, cs, COLORS[type], 1);
    }
  }

  // ---------- 主循环 ----------
  function frame(now) {
    if (!lastT) lastT = now;
    let dt = (now - lastT) / 1000;
    lastT = now;
    dt = Math.min(dt, 0.05);
    update(dt);
    saveAcc += dt;
    if (saveAcc >= 1) { saveAcc -= 1; saveState(); }
    draw();
    drawPreview(holdCanvas, holdType);
    drawPreview(nextCanvas, nextType);
    requestAnimationFrame(frame);
  }

  function update(dt) {
    if (mode !== 'playing' || !current) return;

    // 落地缓冲倒计时：超时仍未重新下落 → 锁定
    if (lockDelay > 0) {
      lockDelay -= dt;
      if (lockDelay <= 0) { lock(); return; }
    }

    // 触屏长按重复：按住 250ms 后开始连移 / 连降
    if (ctlHold) {
      ctlHold.t += dt;
      if (ctlHold.t >= 0.25) {
        ctlHold.acc += dt;
        const iv = ctlHold.action === 'down' ? 0.04 : 0.09;
        while (ctlHold.acc >= iv) {
          ctlHold.acc -= iv;
          if (ctlHold.action === 'left') { if (!tryMove(-1, 0)) { ctlHold.acc = 0; break; } play('move'); }
          else if (ctlHold.action === 'right') { if (!tryMove(1, 0)) { ctlHold.acc = 0; break; } play('move'); }
          else if (ctlHold.action === 'down') softDropOnce();
        }
      }
    }

    // 左右重复移动
    if (keys.left) {
      leftAcc += dt;
      while (leftAcc >= 0.09) { leftAcc -= 0.09; if (!tryMove(-1, 0)) break; }
    }
    if (keys.right) {
      rightAcc += dt;
      while (rightAcc >= 0.09) { rightAcc -= 0.09; if (!tryMove(1, 0)) break; }
    }

    // 软降 / 重力
    if (keys.down) {
      downAcc += dt;
      while (downAcc >= 0.03) { downAcc -= 0.03; if (!tryMove(0, 1)) { startLock(); break; } }
      gravityAcc = 0;
    } else {
      gravityAcc += dt;
      if (gravityAcc >= gravityInterval() / 1000) {
        gravityAcc = 0;
        if (!tryMove(0, 1)) startLock();
      }
    }

    // 粒子 & 冲击环
    updateParticles(dt);
  }

  // ---------- 事件 ----------
  boardWrap.addEventListener('pointerdown', (e) => {
    const rect = boardWrap.getBoundingClientRect();
    spawnHold = { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.clientX, u: e.clientY };
  });
  boardWrap.addEventListener('pointerup', (e) => {
    if (!spawnHold) return;
    const dx = e.clientX - spawnHold.t;
    const dy = e.clientY - spawnHold.u;
    spawnHold = null;
    if (mode !== 'playing') return;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) { rotate(1); return; }       // 点按旋转
    if (Math.abs(dx) > Math.abs(dy)) {
      const n = Math.max(1, Math.round(Math.abs(dx) / 28));
      for (let i = 0; i < n; i++) { if (!tryMove(dx > 0 ? 1 : -1, 0)) break; }
    } else if (dy > 0) {
      hardDrop();
    } else {
      rotate(1);
    }
  });

  btnPause.addEventListener('click', togglePause);

  btnSound.addEventListener('click', () => {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    applyMuted();
    if (!muted) ensureAudio();
  });

  holdPanel.addEventListener('click', hold);

  ovBtn.addEventListener('click', () => {
    ensureAudio();
    if (mode === 'menu' || mode === 'gameover') newGame();
    else if (mode === 'paused') setMode('playing');
  });

  btnResumeContinue.addEventListener('click', () => {
    resumeOverlay.hidden = true;
    setMode('paused');
  });

  btnResumeNew.addEventListener('click', () => {
    resumeOverlay.hidden = true;
    newGame();
  });

  // 触控按钮：按下立即执行一次；按住 250ms 后自动连续移动/下落
  const controlsEl = document.querySelector('.controls');
  controlsEl.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.ctl');
    if (!btn) return;
    e.preventDefault();
    if (mode !== 'playing') return;
    const a = btn.dataset.a;
    if (a === 'left') { if (tryMove(-1, 0)) play('move'); ctlHold = { action: 'left', t: 0, acc: 0 }; }
    else if (a === 'right') { if (tryMove(1, 0)) play('move'); ctlHold = { action: 'right', t: 0, acc: 0 }; }
    else if (a === 'rotate') rotate(1);
    else if (a === 'down') { softDropOnce(); ctlHold = { action: 'down', t: 0, acc: 0 }; }
    else if (a === 'drop') hardDrop();
  });
  function endCtlHold() { ctlHold = null; }
  controlsEl.addEventListener('pointerleave', endCtlHold);
  document.addEventListener('pointerup', endCtlHold);
  document.addEventListener('pointercancel', endCtlHold);
  window.addEventListener('blur', endCtlHold);

  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; leftAcc = 0; tryMove(-1, 0); play('move'); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; rightAcc = 0; tryMove(1, 0); play('move'); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { keys.down = true; downAcc = 0; }
    else if (k === 'ArrowUp' || k === 'x' || k === 'X') { if (mode === 'playing') rotate(1); }
    else if (k === 'z' || k === 'Z') { if (mode === 'playing') rotate(-1); }
    else if (k === ' ') { e.preventDefault(); if (mode === 'playing') hardDrop(); }
    else if (k === 'c' || k === 'C') hold();
    else if (k === 'p' || k === 'P' || k === 'Escape') togglePause();
  });

  document.addEventListener('keyup', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
    if (k === 'ArrowDown' || k === 's' || k === 'S') keys.down = false;
  });

  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', saveState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveState();
  });

  // ---------- 启动 ----------
  hi = readHi();
  resize();
  applyMuted();
  // 字体加载会改变头部/HUD 高度 → 棋盘可用空间变化，加载完重测一次
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => setTimeout(resize, 60));
  }
  setTimeout(resize, 350);
  const saved = loadState();
  if (saved && saved.board && saved.current) {
    restoreState(saved);
    mode = 'resume';
    resumeSub.textContent = '得分 ' + saved.score + ' · 等级 ' + saved.level + ' · 行数 ' + saved.lines;
    resumeOverlay.hidden = false;
    btnPause.hidden = true;
  } else {
    setMode('menu');
  }
  updateHud();
  requestAnimationFrame(frame);
})();
