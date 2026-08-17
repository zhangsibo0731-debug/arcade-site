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

  // ---------- 状态 ----------
  let W = 0, H = 0;
  let mode = 'menu'; // menu | ready | playing | paused | levelclear | gameover
  let score = 0, lives = LIVES_START, level = 1, hi = 0;
  let bricks = [];       // { row, col, hp }
  let brickRects = [];   // 每帧布局 { b, x, y, w, h }
  let balls = [];        // { x, y, vx, vy, r }
  let paddle = { x: 0, y: 0, w: 96, h: PADDLE_H };
  let powerups = [];
  let particles = [];
  let effects = { wideUntil: 0, slowUntil: 0, shrinkUntil: 0, triangleUntil: 0, fastUntil: 0, ironUntil: 0 };
  let keys = { left: false, right: false };
  let shake = 0, flash = 0;
  let combo = 0, wallBounceCount = 0, comboT = 0;
  let lastT = 0;
  let saveAcc = 0;
  let resumeTargetMode = 'paused';

  // ---------- 工具 ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function rowsForLevel(l) { return Math.min(5 + (l - 1), 8); }

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
    return '#ff4d6d'; // debuff（shrink / triangle / fast）统一红色
  }
  function powerLabel(t) {
    if (t === 'wide') return '宽';
    if (t === 'slow') return '慢';
    if (t === 'life') return '+1';
    if (t === 'multi') return '多';
    if (t === 'iron') return '铁';
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
    }
    freq *= (pitch || 1);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (name === 'life' || name === 'over' || name === 'debuff') osc.frequency.exponentialRampToValueAtTime(60, now + dur);
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

  // 每关不同的砖块排列
  function brickAt(r, c, rows, lv) {
    switch (lv % 4) {
      case 0: return true;                    // 满屏
      case 1: return (r + c) % 2 === 0;       // 棋盘格
      case 2: {                               // 菱形
        const cx = (COLS - 1) / 2, cy = (rows - 1) / 2;
        return Math.abs(c - cx) + Math.abs(r - cy) <= Math.floor(rows / 2) + 1;
      }
      case 3: return c % 2 === 0;             // 竖条
    }
    return true;
  }

  function computeBrickRects() {
    const rows = rowsForLevel(level);
    const top = 16, mx = 10, gap = 6;
    const bw = (W - mx * 2 - gap * (COLS - 1)) / COLS;
    const bh = 18;
    brickRects = [];
    for (const b of bricks) {
      if (b.hp <= 0) continue;
      brickRects.push({
        b,
        x: mx + b.col * (bw + gap),
        y: top + b.row * (bh + gap),
        w: bw,
        h: bh,
      });
    }
  }

  // ---------- 关卡 ----------
  function buildLevel(n) {
    level = n;
    const rows = rowsForLevel(n);
    bricks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!brickAt(r, c, rows, n)) continue;
        const hp = (n >= 2 && (r + c) % 5 === 0) ? 2 : 1;
        bricks.push({ row: r, col: c, hp });
      }
    }
    powerups = [];
    particles = [];
  }

  function allCleared() {
    return bricks.every((b) => b.hp <= 0);
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
    bricks = s.bricks || [];
    paddle.x = (typeof s.paddleX === 'number') ? s.paddleX : 0;
    powerups = s.powerups || [];
    particles = [];
    const now = performance.now();
    effects.wideUntil = (s.wideRemain > 0) ? now + s.wideRemain : 0;
    effects.slowUntil = (s.slowRemain > 0) ? now + s.slowRemain : 0;
    effects.shrinkUntil = (s.shrinkRemain > 0) ? now + s.shrinkRemain : 0;
    effects.triangleUntil = (s.triangleRemain > 0) ? now + s.triangleRemain : 0;
    effects.fastUntil = (s.fastRemain > 0) ? now + s.fastRemain : 0;
    effects.ironUntil = (s.ironRemain > 0) ? now + s.ironRemain : 0;
    balls = (s.balls && s.balls.length) ? s.balls : [makeBall(paddle.x + paddle.w / 2, paddle.y - BALL_R - 1)];
    updateHud();
  }

  function newGame() {
    score = 0;
    lives = LIVES_START;
    combo = 0;
    wallBounceCount = 0;
    effects = { wideUntil: 0, slowUntil: 0, shrinkUntil: 0, triangleUntil: 0, fastUntil: 0, ironUntil: 0 };
    powerups = [];
    particles = [];
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

  function loseLife() {
    lives--;
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
      ovSub.textContent = '移动挡板接住球，砸碎所有砖块';
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
    if (pierce) {
      b.hp = 0;
    } else {
      b.hp--;
    }
    if (b.hp <= 0) {
      combo++;
      comboT = performance.now();
      const rows = rowsForLevel(level);
      score += (rows - b.row) * 10 * combo;
      spawnParticles(b, r);
      maybeDrop(b, r);
      shake = Math.max(shake, 2.5);
      play('brick', 1 + Math.min(combo - 1, 8) * 0.06);
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

  function maybeDrop(b, r) {
    const roll = Math.random();
    let type = null;
    if (roll < 0.10) {
      type = pickType(['wide', 'slow', 'life', 'multi', 'iron'], [0.22, 0.18, 0.16, 0.2, 0.24]);
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
    const col = BRICK_COLORS[b.row % BRICK_COLORS.length];
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 140;
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
        combo = 0;
        wallBounceCount = 0;
        play('paddle');
      }

      // 砖块（按上一帧位置判断从哪一面撞入，反弹更自然，并推出避免卡进砖里）
      for (const r of brickRects) {
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

    // 粒子
    updateParticles(dt);

    // 保持速度恒定
    if (mode === 'playing') {
      const sp = ballSpeed();
      for (const b of balls) {
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
      const col = BRICK_COLORS[r.b.row % BRICK_COLORS.length];
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      roundRect(r.x, r.y, r.w, r.h, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (r.b.hp > 1) {
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      }
    }

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

    // 挡板（debuff 时变三角 / 变红，提示当前状态）
    const tri = performance.now() < effects.triangleUntil;
    const debuff = tri || performance.now() < effects.shrinkUntil;
    ctx.shadowColor = debuff ? '#ff7a59' : '#7fb4ff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = debuff ? '#ffd6cf' : '#eef0f8';
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
      ctx.font = '800 22px "Space Grotesk", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('连击 ×' + combo, 0, 0);
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
    paddle.x = clamp((e.clientX - rect.left) - paddle.w / 2, 0, W - paddle.w);
  });

  stage.addEventListener('pointerdown', (e) => {
    const rect = stage.getBoundingClientRect();
    paddle.x = clamp((e.clientX - rect.left) - paddle.w / 2, 0, W - paddle.w);
    if (mode === 'ready') launch();
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
