(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const stage = $('stage');

  const scoreEl = $('score');
  const hiEl = $('hi');
  const livesEl = $('lives');
  const levelEl = $('level');
  const overlayEl = $('overlay');
  const ovTitle = $('ovTitle');
  const ovSub = $('ovSub');
  const ovBtn = $('ovBtn');
  const btnPause = $('btnPause');
  const btnSound = $('btnSound');
  const icSoundOn = $('icSoundOn');
  const icSoundOff = $('icSoundOff');
  const resumeOverlay = $('resumeOverlay');
  const resumeSub = $('resumeSub');
  const btnResumeNew = $('btnResumeNew');
  const btnResumeContinue = $('btnResumeContinue');

  // ---------- 常量 ----------
  const COLS = 10;
  const BALL_R = 7;
  const PADDLE_H = 14;
  const LIVES_START = 3;
  const MAX_BALLS = 4;
  const HI_KEY = 'breakout_hi_v1';
  const MUTE_KEY = 'breakout_muted_v1';
  const SAVE_KEY = 'breakout_save_v1';
  const BRICK_COLORS = ['#8b7cf6', '#4dabf7', '#22d3c5', '#ffc24b', '#ff7a59', '#f06595'];

  // 阵型：每 8 关一轮（1 满屏 → 8 笑脸）
  const FORMATIONS = ['full', 'checker', 'diamond', 'stripes', 'heart', 'maze', 'invader', 'smiley'];

  // 像素阵型表
  const HEART = ['..XXXXXX..', '.XXXXXXXX.', 'XX.XXXX.XX', 'XXXXXXXXXX', '.XXXXXXXX.', '..XXXXXX..', '...XXXX...'];
  const INVADER = ['.X......X.', '..X....X..', '.XXXXXXXX.', 'XX.XXXX.XX', 'XXXXXXXXXX', 'X.XXXXXX.X', '.X......X.'];
  const SMILEY = ['..XXXXXX..', '.XXXXXXXX.', '.XX....XX.', '.XXXXXXXX.', '...XXXX...', '....XX....'];

  // ---------- 状态 ----------
  let W = 0, H = 0;
  let mode = 'menu'; // menu | ready | playing | paused | levelclear | gameover
  let score = 0, lives = LIVES_START, level = 1, hi = 0;
  let levelRows = 5; // 当前关卡砖块行数（用于计分）
  let bricks = [];       // { row, col, hp, maxHp, type: normal|hard|bomb|steel }
  let brickRects = [];   // 每帧布局 { b, x, y, w, h }
  let balls = [];        // { x, y, vx, vy, r, stuck?, offX? }
  let paddle = { x: 0, y: 0, w: 96, h: PADDLE_H };
  let powerups = [];
  let particles = [];
  let shockwaves = [];   // 爆炸冲击波 { x, y, r, life }
  let effects = { wideUntil: 0, slowUntil: 0, shrinkUntil: 0, triangleUntil: 0, fastUntil: 0, ironUntil: 0, magnetUntil: 0 };
  let keys = { left: false, right: false };
  let shake = 0, flash = 0;
  let combo = 0, wallBounceCount = 0, comboT = 0;
  let lastT = 0;
  let saveAcc = 0;
  let resumeTargetMode = 'paused';
  let downX = 0, downY = 0, downT = 0, movedDist = 0;

  // ---------- 工具 ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function rowsForLevel(l) { return Math.min(5 + (l - 1), 8); }

  // 确定性伪随机（用于裂纹、特殊砖位置）
  function mulberry(seed) {
    let x = seed >>> 0;
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  }

  function hash3(a, b, c) {
    let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
    return Math.abs(h) % 100000;
  }

  function basePaddleW() { return clamp(W * 0.24, 72, 120); }

  function paddleW() {
    let w = basePaddleW();
    if (performance.now() < effects.wideUntil) w *= 1.55;
    if (performance.now() < effects.shrinkUntil) w *= 0.55;
    return w;
  }

  function ballSpeed() {
    const base = 260 + (level - 1) * 24;
    let sp = base;
    if (performance.now() < effects.slowUntil) sp *= 0.62;
    if (performance.now() < effects.fastUntil) sp *= 1.3;
    return Math.min(sp, 500);
  }

  function readHi() {
    try { return parseInt(localStorage.getItem(HI_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function readMuted() {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function powerColor(t) {
    if (t === 'wide') return '#22d3c5';
    if (t === 'slow') return '#4dabf7';
    if (t === 'life') return '#ff7a59';
    if (t === 'multi') return '#f06595';
    if (t === 'iron') return '#ffc24b';
    if (t === 'magnet') return '#c9a2ff';
    return '#ff4d6d'; // debuff（shrink / triangle / fast）统一红色
  }
  function powerLabel(t) {
    if (t === 'wide') return '宽';
    if (t === 'slow') return '慢';
    if (t === 'life') return '+1';
    if (t === 'multi') return '多';
    if (t === 'iron') return '铁';
    if (t === 'magnet') return '磁';
    if (t === 'shrink') return '窄';
    if (t === 'triangle') return '尖';
    return '快'; // fast
  }
  function pickType(types, w) {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < types.length; i++) { acc += w[i]; if (r < acc) return types[i]; }
    return types[types.length - 1];
  }

  // ---------- 音效（WebAudio 合成，无外部素材）----------
  let audioCtx = null;
  let muted = readMuted();

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
    let freq = 220, dur = 0.06, type = 'square', vol = 0.16;
    switch (name) {
      case 'paddle': freq = 190; dur = 0.05; type = 'square'; vol = 0.14; break;
      case 'brick': freq = 540; dur = 0.06; type = 'square'; vol = 0.15; break;
      case 'hard': freq = 250; dur = 0.05; type = 'sawtooth'; vol = 0.12; break;
      case 'powerup': freq = 620; dur = 0.14; type = 'triangle'; vol = 0.16; break;
      case 'life': freq = 200; dur = 0.4; type = 'sawtooth'; vol = 0.18; break;
      case 'clear': freq = 523; dur = 0.16; type = 'triangle'; vol = 0.16; break;
      case 'over': freq = 150; dur = 0.5; type = 'sawtooth'; vol = 0.18; break;
      case 'debuff': freq = 320; dur = 0.3; type = 'sawtooth'; vol = 0.18; break;
      case 'bomb': freq = 110; dur = 0.28; type = 'sawtooth'; vol = 0.22; break;
      case 'magnet': freq = 480; dur = 0.1; type = 'sine'; vol = 0.14; break;
    }
    freq *= (pitch || 1);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (name === 'life' || name === 'over' || name === 'debuff' || name === 'bomb') osc.frequency.exponentialRampToValueAtTime(60, now + dur);
    else if (name === 'powerup' || name === 'clear') osc.frequency.exponentialRampToValueAtTime(freq * 1.8, now + dur);
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

  // ---------- 布局 ----------
  function resize() {
    const rect = stage.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paddle.w = basePaddleW();
    paddle.y = H - 56;
  }

  // ---------- 阵型 ----------
  function formationFor(lv) { return FORMATIONS[(lv - 1) % FORMATIONS.length]; }

  function rowsForFormation(f) {
    if (f === 'smiley') return 6;
    if (f === 'heart' || f === 'maze' || f === 'invader') return 7;
    return rowsForLevel(level);
  }

  function brickAt(r, c, f, rows) {
    switch (f) {
      case 'full': return true;
      case 'checker': return (r + c) % 2 === 0;
      case 'diamond': {
        const cx = (COLS - 1) / 2, cy = (rows - 1) / 2;
        return Math.abs(c - cx) + Math.abs(r - cy) <= Math.floor(rows / 2) + 1;
      }
      case 'stripes': return c % 2 === 0;
      case 'heart': return HEART[r] ? HEART[r][c] === 'X' : false;
      case 'invader': return INVADER[r] ? INVADER[r][c] === 'X' : false;
      case 'smiley': return SMILEY[r] ? SMILEY[r][c] === 'X' : false;
      case 'maze': {
        // 蛇形走廊：偶数行横条交替开口，奇数行全空作通道
        if (r % 2 === 0) {
          const gapAtRight = (r / 2) % 2 === 0;
          return gapAtRight ? c !== 9 : c !== 0;
        }
        return false;
      }
    }
    return true;
  }

  function brickRect(b) {
    const top = 16, mx = 10, gap = 6;
    const bw = (W - mx * 2 - gap * (COLS - 1)) / COLS;
    const bh = 18;
    return { b, x: mx + b.col * (bw + gap), y: top + b.row * (bh + gap), w: bw, h: bh };
  }

  function computeBrickRects() {
    brickRects = [];
    for (const b of bricks) {
      if (b.hp <= 0) continue;
      brickRects.push(brickRect(b));
    }
  }

  // ---------- 关卡 ----------
  function buildLevel(n) {
    level = n;
    const f = formationFor(n);
    const rows = rowsForFormation(f);
    levelRows = rows;
    bricks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!brickAt(r, c, f, rows)) continue;
        const h = hash3(n, r, c);
        let type = 'normal', hp = 1;
        if (n >= 2 && h % 37 === 0) {
          type = 'bomb'; // 爆炸砖
        } else if (n >= 4 && h % 29 === 0) {
          type = 'steel'; // 不可摧毁砖（铁球/爆炸可破）
        } else if (n >= 2 && (r + c) % 5 === 0) {
          hp = 2; type = 'hard'; // 硬砖
        }
        bricks.push({ row: r, col: c, hp, maxHp: hp, type });
      }
    }
    powerups = [];
    particles = [];
    shockwaves = [];
  }

  function allCleared() {
    // 不可摧毁砖不参与通关判定
    return bricks.every((b) => b.hp <= 0 || b.type === 'steel');
  }

  // ---------- 游戏流程 ----------
  function makeBall(x, y) {
    return { x, y, vx: 0, vy: 0, r: BALL_R };
  }

  function saveState() {
    if (mode !== 'playing' && mode !== 'ready' && mode !== 'paused') return;
    if (lives <= 0) return;
    const now = performance.now();
    const snap = {
      mode: mode,
      score: score,
      lives: lives,
      level: level,
      bricks: bricks,
      balls: balls,
      paddleX: paddle.x,
      powerups: powerups,
      wideRemain: effects.wideUntil > now ? effects.wideUntil - now : 0,
      slowRemain: effects.slowUntil > now ? effects.slowUntil - now : 0,
      shrinkRemain: effects.shrinkUntil > now ? effects.shrinkUntil - now : 0,
      triangleRemain: effects.triangleUntil > now ? effects.triangleUntil - now : 0,
      fastRemain: effects.fastUntil > now ? effects.fastUntil - now : 0,
      ironRemain: effects.ironUntil > now ? effects.ironUntil - now : 0,
      magnetRemain: effects.magnetUntil > now ? effects.magnetUntil - now : 0,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch (e) {}
  }

  function clearState() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
  }

  function restoreState(s) {
    score = s.score || 0;
    lives = s.lives || LIVES_START;
    level = s.level || 1;
    bricks = (s.bricks || []).map((b) => ({
      row: b.row, col: b.col,
      hp: b.hp, maxHp: b.maxHp || b.hp, type: b.type || 'normal',
    }));
    paddle.x = (typeof s.paddleX === 'number') ? s.paddleX : 0;
    powerups = s.powerups || [];
    particles = [];
    shockwaves = [];
    levelRows = bricks.length ? Math.max(...bricks.map((b) => b.row)) + 1 : 5;
    const now = performance.now();
    effects.wideUntil = (s.wideRemain > 0) ? now + s.wideRemain : 0;
    effects.slowUntil = (s.slowRemain > 0) ? now + s.slowRemain : 0;
    effects.shrinkUntil = (s.shrinkRemain > 0) ? now + s.shrinkRemain : 0;
    effects.triangleUntil = (s.triangleRemain > 0) ? now + s.triangleRemain : 0;
    effects.fastUntil = (s.fastRemain > 0) ? now + s.fastRemain : 0;
    effects.ironUntil = (s.ironRemain > 0) ? now + s.ironRemain : 0;
    effects.magnetUntil = (s.magnetRemain > 0) ? now + s.magnetRemain : 0;
    balls = (s.balls && s.balls.length) ? s.balls : [makeBall(paddle.x + paddle.w / 2, paddle.y - BALL_R - 1)];
    updateHud();
  }

  function newGame() {
    score = 0;
    lives = LIVES_START;
    combo = 0;
    wallBounceCount = 0;
    effects = { wideUntil: 0, slowUntil: 0, shrinkUntil: 0, triangleUntil: 0, fastUntil: 0, ironUntil: 0, magnetUntil: 0 };
    powerups = [];
    particles = [];
    shockwaves = [];
    buildLevel(1);
    resetBall();
    setMode('ready');
    updateHud();
    saveState();
  }

  function nextLevel() {
    buildLevel(level + 1);
    resetBall();
    combo = 0;
    setMode('ready');
    updateHud();
    saveState();
  }

  function resetBall() {
    balls = [makeBall(paddle.x + paddle.w / 2, paddle.y - BALL_R - 1)];
  }

  function launch() {
    if (mode !== 'ready') return;
    ensureAudio();
    const sp = ballSpeed();
    const ang = Math.random() * 0.9 - 0.45;
    for (const b of balls) {
      b.vx = Math.sin(ang) * sp;
      b.vy = -Math.cos(ang) * sp;
    }
    setMode('playing');
  }

  // 磁吸板：松开粘在板上的球
  function launchStuck() {
    const sp = ballSpeed();
    let any = false;
    for (const b of balls) {
      if (!b.stuck) continue;
      const rel = clamp((b.offX || 0) / (paddle.w / 2), -1, 1);
      const ang = rel * (Math.PI / 3.6); // 最大约 50°
      b.vx = Math.sin(ang) * sp;
      b.vy = -Math.cos(ang) * sp;
      b.stuck = false;
      b.offX = 0;
      any = true;
    }
    if (any) play('paddle');
  }

  function loseLife() {
    lives--;
    combo = 0;
    flash = 1;
    shake = 8;
    if (lives <= 0) {
      setMode('gameover');
      play('over');
      clearState();
    } else {
      play('life');
      resetBall();
      setMode('ready');
      saveState();
    }
    updateHud();
  }

  function setMode(m) {
    mode = m;
    resumeOverlay.hidden = true;
    if (m === 'menu' || m === 'paused' || m === 'levelclear' || m === 'gameover') {
      showOverlay(m);
      btnPause.hidden = true;
    } else {
      overlayEl.hidden = true;
      btnPause.hidden = false;
    }
  }

  function showOverlay(m) {
    if (m === 'menu') {
      ovTitle.textContent = '打砖块';
      ovSub.textContent = '移动挡板接住球，砸碎所有砖块\n橙砖会爆炸 · 灰砖打不碎（铁球可破）';
      ovBtn.textContent = '开始游戏';
    } else if (m === 'paused') {
      ovTitle.textContent = '已暂停';
      ovSub.textContent = '按「继续」或空格回到游戏';
      ovBtn.textContent = '继续';
    } else if (m === 'levelclear') {
      ovTitle.textContent = '第 ' + level + ' 关通过';
      ovSub.textContent = '当前得分 ' + score + ' · 生命 ×' + lives;
      ovBtn.textContent = '下一关';
    } else if (m === 'gameover') {
      ovTitle.textContent = '游戏结束';
      ovSub.textContent = '本局得分 ' + score + (score >= hi && score > 0 ? ' · 新纪录！' : '');
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
    livesEl.textContent = lives;
    levelEl.textContent = level;
  }

  // ---------- 碰撞与道具 ----------
  function hitBrick(b, r, pierce) {
    if (b.type === 'steel') {
      if (!pierce) {
        // 不可摧毁：只弹开，闪火花
        spawnSpark(b, r);
        shake = Math.max(shake, 2);
        play('hard');
        wallBounceCount = 0;
        return;
      }
      // 铁球可破
      b.hp = 0;
      awardBrick(b, r, true);
      wallBounceCount = 0;
      updateHud();
      if (allCleared()) {
        setMode('levelclear');
        play('clear');
      }
      return;
    }
    if (pierce) {
      b.hp = 0;
    } else {
      b.hp--;
    }
    if (b.hp <= 0) {
      awardBrick(b, r, false);
      if (b.type === 'bomb') triggerExplosion(b, r);
      wallBounceCount = 0;
      updateHud();
      if (allCleared()) {
        setMode('levelclear');
        play('clear');
      }
    } else {
      shake = Math.max(shake, 4);
      play('hard');
    }
    wallBounceCount = 0;
    updateHud();
  }

  function awardBrick(b, r, isSteel) {
    combo++;
    comboT = performance.now();
    score += (levelRows - b.row) * 10 * Math.min(combo, 8);
    if (!isSteel) {
      spawnParticles(b, r);
      maybeDrop(b, r);
    }
    shake = Math.max(shake, 2.5);
    play('brick', 1 + Math.min(combo - 1, 8) * 0.06);
  }

  // 爆炸砖：波及相邻（含对角）一圈的砖，可连锁
  function triggerExplosion(seedB, seedR) {
    const stack = [{ b: seedB, r: seedR }];
    const destroyed = [];
    while (stack.length) {
      const cur = stack.pop();
      spawnExplosion(cur.r);
      play('bomb');
      for (const o of brickRects) {
        const ob = o.b;
        if (ob === cur.b) continue;
        if (ob.hp <= 0) continue;
        if (Math.abs(ob.row - cur.b.row) > 1 || Math.abs(ob.col - cur.b.col) > 1) continue;
        if (ob.type === 'steel') {
          ob.hp = 0;
          destroyed.push({ b: ob, r: o, steel: true });
        } else {
          ob.hp--;
          if (ob.hp <= 0) {
            destroyed.push({ b: ob, r: o, steel: false });
            if (ob.type === 'bomb') stack.push({ b: ob, r: o }); // 连锁爆炸
          }
        }
      }
    }
    for (const d of destroyed) {
      combo++;
      comboT = performance.now();
      score += (levelRows - d.b.row) * 10 * Math.min(combo, 8);
      if (!d.steel) {
        spawnParticles(d.b, d.r);
        maybeDrop(d.b, d.r);
      }
    }
    shake = Math.max(shake, 7);
    play('brick', 1 + Math.min(combo - 1, 8) * 0.06);
    updateHud();
    if (allCleared()) {
      setMode('levelclear');
      play('clear');
    }
  }

  function maybeDrop(b, r) {
    const roll = Math.random();
    let type = null;
    if (roll < 0.10) {
      type = pickType(['wide', 'slow', 'life', 'multi', 'iron', 'magnet'], [0.19, 0.15, 0.14, 0.17, 0.18, 0.17]);
    } else if (roll < 0.20) {
      type = pickType(['shrink', 'triangle', 'fast'], [0.4, 0.3, 0.3]);
    }
    if (type) {
      powerups.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, type: type, vy: 92 });
    }
  }

  function applyPowerup(type) {
    const now = performance.now();
    if (type === 'wide') { effects.wideUntil = now + 12000; effects.shrinkUntil = 0; }
    else if (type === 'slow') { effects.slowUntil = now + 10000; effects.fastUntil = 0; }
    else if (type === 'life') lives = Math.min(lives + 1, 6);
    else if (type === 'multi') {
      const src = balls.slice();
      for (const b of src) {
        if (balls.length >= MAX_BALLS) break;
        const a = (Math.random() * 0.5 - 0.25);
        const cur = Math.atan2(b.vy, b.vx);
        const sp = ballSpeed();
        balls.push({
          x: b.x, y: b.y, r: BALL_R,
          vx: Math.cos(cur + a) * sp,
          vy: Math.sin(cur + a) * sp,
        });
      }
    } else if (type === 'iron') {
      effects.ironUntil = now + 8000;
    } else if (type === 'magnet') {
      effects.magnetUntil = now + 10000;
    } else if (type === 'shrink') {
      effects.shrinkUntil = now + 8000;
      effects.wideUntil = 0;
    } else if (type === 'triangle') {
      effects.triangleUntil = now + 6000;
    } else if (type === 'fast') {
      effects.fastUntil = now + 10000;
      effects.slowUntil = 0;
    }
    play(type === 'shrink' || type === 'triangle' || type === 'fast' ? 'debuff' : 'powerup');
    updateHud();
  }

  // ---------- 粒子 ----------
  function spawnParticles(b, r) {
    const col = b.type === 'bomb' ? '#ff9f43' : BRICK_COLORS[b.row % BRICK_COLORS.length];
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 140;
      particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color: col });
    }
  }

  function spawnSpark(b, r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 50 + Math.random() * 120;
      particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, color: '#dfe6f5' });
    }
  }

  function spawnExplosion(r) {
    shockwaves.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, r: 4, life: 1 });
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 180;
      const col = Math.random() < 0.5 ? '#ff9f43' : '#ff6b35';
      particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color: col });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt * 2.2;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function updateShockwaves(dt) {
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const s = shockwaves[i];
      s.r += 160 * dt;
      s.life -= dt * 2.4;
      if (s.life <= 0) shockwaves.splice(i, 1);
    }
  }

  // ---------- 更新 ----------
  function update(dt, now) {
    const pw = paddleW();
    paddle.w = pw;

    const v = 460 * dt;
    if (keys.left) paddle.x -= v;
    if (keys.right) paddle.x += v;
    paddle.x = clamp(paddle.x, 0, W - pw);

    if (mode === 'ready') {
      if (balls.length === 0) balls = [makeBall(0, 0)];
      balls[0].x = paddle.x + pw / 2;
      balls[0].y = paddle.y - BALL_R - 1;
    }

    if (mode !== 'playing') return;

    // 逐个球更新
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];

      // 磁吸状态：粘在板上，跟随挡板
      if (b.stuck) {
        if (performance.now() >= effects.magnetUntil) {
          // 磁力过期：自动发射，避免球永远粘在板上无法操作
          launchStuck();
        } else {
          b.x = paddle.x + paddle.w / 2 + (b.offX || 0);
          b.y = paddle.y - b.r - 1;
        }
        continue;
      }

      const prevX = b.x, prevY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // 墙（左右墙连续反弹时注入垂直分量，避免水平死循环）
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); wallBounceCount++; }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); wallBounceCount++; }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }
      if (wallBounceCount >= 4) {
        b.vy = (Math.random() < 0.5 ? -1 : 1) * ballSpeed() * 0.35;
        wallBounceCount = 0;
      }

      // 挡板
      if (b.vy > 0 &&
          b.y + b.r >= paddle.y &&
          b.y - b.r <= paddle.y + paddle.h &&
          b.x >= paddle.x && b.x <= paddle.x + paddle.w) {
        // 磁吸：吸住球，等玩家瞄准后松开
        if (performance.now() < effects.magnetUntil) {
          b.stuck = true;
          b.offX = clamp(b.x - (paddle.x + paddle.w / 2), -paddle.w / 2, paddle.w / 2);
          b.vx = 0; b.vy = 0;
          play('magnet');
          continue;
        }
        const sp = ballSpeed();
        if (performance.now() < effects.triangleUntil) {
          // 三角形挡板：只有左/右两个固定出射角
          const side = (b.x < paddle.x + paddle.w / 2) ? -1 : 1;
          const ang = side * (Math.PI / 4);
          b.vx = Math.sin(ang) * sp;
          b.vy = -Math.cos(ang) * sp;
        } else {
          const rel = clamp((b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), -1, 1);
          const ang = rel * (Math.PI / 3.6); // 最大约 50°
          b.vx = Math.sin(ang) * sp;
          b.vy = -Math.cos(ang) * sp;
        }
        b.y = paddle.y - b.r - 0.5;
        wallBounceCount = 0;
        play('paddle');
      }

      // 砖块（按上一帧位置判断从哪一面撞入，反弹更自然，并推出避免卡进砖里）
      for (const r of brickRects) {
        if (r.b.hp <= 0) continue; // 本帧内已被爆炸/铁球清掉的砖不再处理
        const cx = clamp(b.x, r.x, r.x + r.w);
        const cy = clamp(b.y, r.y, r.y + r.h);
        const dx = b.x - cx, dy = b.y - cy;
        if (dx * dx + dy * dy <= b.r * b.r) {
          if (performance.now() < effects.ironUntil) {
            // 铁球：打穿砖块、不反弹，继续前进
            hitBrick(r.b, r, true);
            break;
          }
          const fromTop = prevY + b.r <= r.y + 0.5;
          const fromBottom = prevY - b.r >= r.y + r.h - 0.5;
          const fromLeft = prevX + b.r <= r.x + 0.5;
          const fromRight = prevX - b.r >= r.x + r.w - 0.5;
          if (fromTop) { b.vy = -Math.abs(b.vy); b.y = r.y - b.r - 0.5; }
          else if (fromBottom) { b.vy = Math.abs(b.vy); b.y = r.y + r.h + b.r + 0.5; }
          else if (fromLeft) { b.vx = -Math.abs(b.vx); b.x = r.x - b.r - 0.5; }
          else if (fromRight) { b.vx = Math.abs(b.vx); b.x = r.x + r.w + b.r + 0.5; }
          else if (Math.abs(dx) > Math.abs(dy)) { b.vx = -b.vx; }
          else { b.vy = -b.vy; }
          hitBrick(r.b, r);
          break;
        }
      }

      // 掉出底部
      if (b.y - b.r > H) balls.splice(i, 1);
    }

    // 所有球都掉了 → 扣一条命
    if (balls.length === 0) loseLife();

    // 道具
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.vy * dt;
      const inPaddleX = p.x > paddle.x && p.x < paddle.x + paddle.w;
      const inPaddleY = p.y > paddle.y - 6 && p.y < paddle.y + paddle.h + 6;
      if (inPaddleX && inPaddleY) {
        applyPowerup(p.type);
        powerups.splice(i, 1);
      } else if (p.y > H + 24) {
        powerups.splice(i, 1);
      }
    }

    // 粒子 & 冲击波
    updateParticles(dt);
    updateShockwaves(dt);

    // 保持速度恒定
    if (mode === 'playing') {
      const sp = ballSpeed();
      for (const b of balls) {
        if (b.stuck) continue;
        const m = Math.hypot(b.vx, b.vy);
        if (m > 0.001) { b.vx = b.vx / m * sp; b.vy = b.vy / m * sp; }
      }
    }

    shake = Math.max(0, shake - dt * 22);
    flash = Math.max(0, flash - dt * 1.6);
  }

  // ---------- 绘制 ----------
  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#11162e');
    g.addColorStop(1, '#1a2040');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    // 砖块
    for (const r of brickRects) {
      const b = r.b;

      // 不可摧毁砖：金属质感
      if (b.type === 'steel') {
        const mg = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
        mg.addColorStop(0, '#c9d2e8');
        mg.addColorStop(0.5, '#9aa6bf');
        mg.addColorStop(1, '#7c87a0');
        ctx.fillStyle = mg;
        ctx.shadowColor = 'rgba(170,190,230,.45)';
        ctx.shadowBlur = 8;
        roundRect(r.x, r.y, r.w, r.h, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
        // 铆钉
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.arc(r.x + 5, r.y + 5, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r.x + r.w - 5, r.y + r.h - 5, 1.6, 0, Math.PI * 2); ctx.fill();
        continue;
      }

      let col = BRICK_COLORS[b.row % BRICK_COLORS.length];
      let glow = col;
      if (b.type === 'bomb') { col = '#ff6b35'; glow = '#ff9f43'; }
      ctx.fillStyle = col;
      ctx.shadowColor = glow;
      ctx.shadowBlur = b.type === 'bomb' ? 14 + Math.sin(now / 260) * 6 : 12;
      roundRect(r.x, r.y, r.w, r.h, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (b.type === 'bomb') {
        // 炸弹引信点
        ctx.fillStyle = 'rgba(40,12,0,.6)';
        roundRect(r.x + r.w / 2 - 3, r.y + r.h / 2 - 3, 6, 6, 2);
        ctx.fill();
      }

      // 硬砖裂纹（随受击次数加深）
      if (b.hp < b.maxHp) drawCracks(b, r.x, r.y, r.w, r.h);
    }

    // 爆炸冲击波
    for (const s of shockwaves) {
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.strokeStyle = '#ffb26b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 道具
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 12px "Space Grotesk", "PingFang SC", sans-serif';
    for (const p of powerups) {
      const c = powerColor(p.type);
      ctx.fillStyle = c;
      ctx.shadowColor = c;
      ctx.shadowBlur = 14;
      roundRect(p.x - 16, p.y - 10, 32, 20, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0e1226';
      ctx.fillText(powerLabel(p.type), p.x, p.y + 0.5);
    }

    // 挡板（磁吸变紫 / debuff 变红 / 三角）
    const magnet = performance.now() < effects.magnetUntil;
    const tri = performance.now() < effects.triangleUntil;
    const debuff = tri || performance.now() < effects.shrinkUntil;
    ctx.shadowColor = magnet ? '#c9a2ff' : (debuff ? '#ff7a59' : '#7fb4ff');
    ctx.shadowBlur = magnet ? 22 : 16;
    ctx.fillStyle = magnet ? '#efe6ff' : (debuff ? '#ffd6cf' : '#eef0f8');
    if (tri) {
      ctx.beginPath();
      ctx.moveTo(paddle.x + paddle.w / 2, paddle.y);
      ctx.lineTo(paddle.x + paddle.w, paddle.y + paddle.h);
      ctx.lineTo(paddle.x, paddle.y + paddle.h);
      ctx.closePath();
      ctx.fill();
    } else {
      roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 7);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 球（多球，铁球带金色尾迹）
    const iron = performance.now() < effects.ironUntil;
    ctx.shadowBlur = 20;
    for (const b of balls) {
      if (iron) {
        const m = Math.hypot(b.vx, b.vy) || 1;
        for (let k = 3; k >= 1; k--) {
          ctx.globalAlpha = 0.3 - k * 0.07;
          ctx.fillStyle = '#ffc24b';
          ctx.beginPath();
          ctx.arc(b.x - (b.vx / m) * k * 9, b.y - (b.vy / m) * k * 9, b.r * (1 - k * 0.2), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = iron ? '#ffe08a' : '#ffffff';
      ctx.shadowColor = iron ? '#ffc24b' : '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 粒子
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // 连击显示
    if (combo >= 2) {
      const t = (performance.now() - comboT) / 1000;
      const pop = t < 0.2 ? 1 + (0.2 - t) * 1.2 : 1;
      ctx.save();
      ctx.translate(W / 2, H * 0.42);
      ctx.scale(pop, pop);
      ctx.fillStyle = '#ffd43b';
      ctx.shadowColor = '#ffd43b';
      ctx.shadowBlur = 14;
      ctx.font = '800 26px "Space Grotesk", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('连击 ×' + combo, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // 发射提示
    if (mode === 'ready') {
      ctx.fillStyle = 'rgba(237,239,247,.92)';
      ctx.font = '600 15px "Space Grotesk", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('点击或按空格发射', W / 2, H * 0.7);
    }

    // 受伤红闪
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,70,70,' + (flash * 0.32).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // 硬砖裂纹
  function drawCracks(b, x, y, w, h) {
    const n = Math.min(b.maxHp - b.hp, 3);
    ctx.strokeStyle = 'rgba(18,10,34,.45)';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const s = mulberry((b.row * 131 + b.col * 17 + k * 97 + 13) >>> 0);
      const edge = Math.floor(s * 4);
      const t = mulberry(((s * 7919 + b.row * 3 + b.col) >>> 0));
      let x0, y0;
      if (edge === 0) { x0 = x + t * w; y0 = y; }
      else if (edge === 1) { x0 = x + w; y0 = y + t * h; }
      else if (edge === 2) { x0 = x + t * w; y0 = y + h; }
      else { x0 = x; y0 = y + t * h; }
      const cx0 = x + w / 2 + (mulberry((k * 31 + b.row * 7 + b.col * 3 + 1) >>> 0) - 0.5) * w * 0.6;
      const cy0 = y + h / 2 + (mulberry((k * 37 + b.row * 5 + b.col * 11 + 2) >>> 0) - 0.5) * h * 0.6;
      const jx = x0 + (cx0 - x0) * 0.5 + (mulberry((k * 41 + b.row + 7) >>> 0) - 0.5) * 5;
      const jy = y0 + (cy0 - y0) * 0.5 + (mulberry((k * 43 + b.col + 11) >>> 0) - 0.5) * 3;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(jx, jy);
      ctx.lineTo(cx0, cy0);
      ctx.stroke();
    }
  }

  // ---------- 主循环 ----------
  function frame(now) {
    if (!lastT) lastT = now;
    let dt = (now - lastT) / 1000;
    lastT = now;
    dt = Math.min(dt, 0.035);
    computeBrickRects();
    update(dt, now);
    saveAcc += dt;
    if (saveAcc >= 1) { saveAcc -= 1; saveState(); }
    draw(now);
    requestAnimationFrame(frame);
  }

  // ---------- 事件 ----------
  stage.addEventListener('pointermove', (e) => {
    const rect = stage.getBoundingClientRect();
    movedDist = Math.max(movedDist, Math.hypot(e.clientX - downX, e.clientY - downY));
    paddle.x = clamp((e.clientX - rect.left) - paddle.w / 2, 0, W - paddle.w);
  });

  stage.addEventListener('pointerdown', (e) => {
    downX = e.clientX; downY = e.clientY; downT = performance.now(); movedDist = 0;
    const rect = stage.getBoundingClientRect();
    paddle.x = clamp((e.clientX - rect.left) - paddle.w / 2, 0, W - paddle.w);
    if (mode === 'ready') launch();
  });

  // 磁吸板：松开手指发射粘住的球（不依赖磁力剩余时间，粘住即可发射）
  stage.addEventListener('pointerup', (e) => {
    if (mode === 'playing' && balls.some((b) => b.stuck)) {
      launchStuck();
    }
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
    else if (mode === 'levelclear') nextLevel();
  });

  btnResumeContinue.addEventListener('click', () => {
    resumeOverlay.hidden = true;
    setMode(resumeTargetMode);
  });

  btnResumeNew.addEventListener('click', () => {
    resumeOverlay.hidden = true;
    newGame();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.key === ' ') {
      e.preventDefault();
      ensureAudio();
      if (mode === 'ready') launch();
      else if (mode === 'playing' && balls.some((b) => b.stuck)) launchStuck();
      else if (mode === 'playing') setMode('paused');
      else if (mode === 'paused') setMode('playing');
    }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (mode === 'playing') setMode('paused');
      else if (mode === 'paused') setMode('playing');
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
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
  const saved = loadState();
  if (saved && saved.lives > 0 && saved.bricks) {
    restoreState(saved);
    resumeTargetMode = (saved.mode === 'ready') ? 'ready' : 'paused';
    mode = 'resume';
    resumeSub.textContent = '得分 ' + saved.score + ' · 第 ' + saved.level + ' 关 · 生命 ×' + saved.lives;
    resumeOverlay.hidden = false;
    btnPause.hidden = true;
  } else {
    setMode('menu');
  }
  updateHud();
  requestAnimationFrame(frame);
})();
