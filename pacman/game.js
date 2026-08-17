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

  // ---------- 迷宫（经典 28×31） ----------
  const COLS = 28, ROWS = 31;
  // # 墙 | . 豆 | o 能量豆 | 空格 空路径 | = 幽灵屋门 | G 幽灵屋
  const LAYOUT = [
    '############################',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#o####.#####.##.#####.####o#',
    '#.####.#####.##.#####.####.#',
    '#..........................#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#......##....##....##......#',
    '######.#####.##.#####.######',
    '######.#####.##.#####.######',
    '######.##..........##.######',
    '######.##.###==###.##.######',
    '######.##.#GGGGGG#.##.######',
    '      .   #GGGGGG#   .      ',
    '######.##.#GGGGGG#.##.######',
    '######.##.########.##.######',
    '######.##..........##.######',
    '######.##.########.##.######',
    '######.##.########.##.######',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#.####.#####.##.#####.####.#',
    '#o..##.......  .......##..o#',
    '###.##.##.########.##.##.###',
    '###.##.##.########.##.##.###',
    '#......##....##....##......#',
    '#.##########.##.##########.#',
    '#.##########.##.##########.#',
    '#..........................#',
    '############################',
  ];

  // tile 类型
  const WALL = 0, PELLET = 1, POWER = 2, PATH = 3, DOOR = 4, HOUSE = 5;

  // 方向
  const NONE = 0, RIGHT = 1, LEFT = 2, UP = 3, DOWN = 4;
  const DXY = { 1: [1, 0], 2: [-1, 0], 3: [0, -1], 4: [0, 1] };

  const HI_KEY = 'pacman_hi_v1';
  const MUTE_KEY = 'pacman_muted_v1';
  const SAVE_KEY = 'pacman_save_v1';
  const LIVES_START = 3;
  const MAX_LIVES = 6;
  const GHOST_COLORS = { blinky: '#ff3b30', pinky: '#ff9ff3', inky: '#22d3ee', clyde: '#ffa94d' };
  const SCATTER_SPOTS = { blinky: [25, 1], pinky: [2, 1], inky: [25, 29], clyde: [2, 29] };
  const EXIT_DELAY = { blinky: 0, pinky: 3, inky: 6, clyde: 9 };

  // ---------- 状态 ----------
  let W = 0, H = 0, cell = 12;
  let mode = 'menu'; // menu | playing | paused | dying | levelclear | gameover
  let grid = [];     // ROWS × COLS tile 类型
  let pelletsLeft = 0;
  let score = 0, lives = LIVES_START, level = 1, hi = 0;
  let extraLifeAt = 10000;
  let pac = null;
  let ghosts = [];
  let modeTimer = 0;      // scatter/chase 交替计时
  let scatter = true;
  let frightUntil = 0;    // 恐惧剩余
  let eatenCombo = 0;     // 连吃幽灵计数
  let dyeT = 0;           // 死亡动画计时
  let lastT = 0;
  let pauseAt = 0;        // 暂停时刻（用于平移幽灵出屋倒计时）
  let saveAcc = 0;        // 自动存档计时

  // ---------- 工具 ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function readHi() {
    try { return parseInt(localStorage.getItem(HI_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function readMuted() {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
  }
  function tileAt(tx, ty) {
    if (tx < 0) tx += COLS;
    if (tx >= COLS) tx -= COLS;
    if (ty < 0 || ty >= ROWS) return WALL;
    return grid[ty][tx];
  }
  function pacWalkable(t) { return t === PELLET || t === POWER || t === PATH; }
  function ghostWalkable(t) { return t === PELLET || t === POWER || t === PATH || t === DOOR || t === HOUSE; }

  function parseGrid() {
    grid = [];
    pelletsLeft = 0;
    for (let y = 0; y < ROWS; y++) {
      const row = [];
      for (let x = 0; x < COLS; x++) {
        const ch = LAYOUT[y][x];
        let t = WALL;
        if (ch === '.') { t = PELLET; pelletsLeft++; }
        else if (ch === 'o') { t = POWER; pelletsLeft++; }
        else if (ch === ' ') t = PATH;
        else if (ch === '=') t = DOOR;
        else if (ch === 'G') t = HOUSE;
        row.push(t);
      }
      grid.push(row);
    }
  }

  function cx(tx) { return tx * cell + cell / 2; }
  function cy(ty) { return ty * cell + cell / 2; }
  function tileOf(ch) { return { x: Math.round(ch.px), y: Math.round(ch.py) }; }
  // 是否位于格点上（双轴对齐）——只有格点才能转向
  function aligned(ch) {
    return Math.abs(ch.px - Math.round(ch.px)) < 1e-6 && Math.abs(ch.py - Math.round(ch.py)) < 1e-6;
  }
  function dist(ch, g) {
    return Math.hypot(ch.px - g.px, ch.py - g.py);
  }
  function tileAhead(n) {
    const t = tileOf(pac);
    const d = DXY[pac.dir] || [0, 0];
    return { x: t.x + d[0] * n, y: t.y + d[1] * n };
  }

  // ---------- 音效 ----------
  let audioCtx = null;
  let muted = readMuted();
  let wakaHi = false;

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

  function play(name) {
    const ac = ensureAudio();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;
    let freq = 220, dur = 0.06, type = 'square', vol = 0.14;
    switch (name) {
      case 'waka': freq = wakaHi ? 300 : 180; dur = 0.07; type = 'square'; vol = 0.07; wakaHi = !wakaHi; break;
      case 'power': freq = 420; dur = 0.25; type = 'triangle'; vol = 0.16; break;
      case 'eatghost': freq = 700; dur = 0.1; type = 'square'; vol = 0.14; break;
      case 'death': freq = 320; dur = 0.7; type = 'sawtooth'; vol = 0.18; break;
      case 'clear': freq = 523; dur = 0.14; type = 'triangle'; vol = 0.16; break;
      case 'start': freq = 392; dur = 0.1; type = 'triangle'; vol = 0.14; break;
      case 'extra': freq = 660; dur = 0.1; type = 'triangle'; vol = 0.14; break;
    }
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (name === 'death') osc.frequency.exponentialRampToValueAtTime(60, now + dur);
    else if (name === 'eatghost') osc.frequency.exponentialRampToValueAtTime(freq * 2.2, now + dur);
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

  // ---------- 角色 ----------
  function makePac() {
    return { px: 14, py: 23, dir: LEFT, nextDir: LEFT, speed: 7.2, mouth: 0 };
  }
  function makeGhost(type, px, py) {
    return {
      type: type,
      px: px, py: py,
      dir: type === 'blinky' ? LEFT : UP,
      nextDir: NONE,
      mode: 'scatter',
      house: type !== 'blinky',
      leaving: false,
      spawnAt: performance.now() + EXIT_DELAY[type] * 1000,
    };
  }

  function resetPositions() {
    pac = makePac();
    ghosts = [
      makeGhost('blinky', 14, 11),
      makeGhost('pinky', 12, 14),
      makeGhost('inky', 14, 14),
      makeGhost('clyde', 16, 14),
    ];
    for (const g of ghosts) g.mode = scatter ? 'scatter' : 'chase';
    frightUntil = 0;
    eatenCombo = 0;
    modeTimer = 0;
    scatter = true;
  }

  // ---------- 关卡 ----------
  function newLevel(n) {
    level = n;
    parseGrid();
    resetPositions();
    setMode('playing');
    play('start');
    updateHud();
  }

  function newGame() {
    score = 0;
    lives = LIVES_START;
    extraLifeAt = 10000;
    newLevel(1);
  }

  // ---------- 存档 / 继续 ----------
  function saveState() {
    if (mode !== 'playing' && mode !== 'paused') return;
    if (lives <= 0) return;
    const now = performance.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        score: score,
        lives: lives,
        level: level,
        extraLifeAt: extraLifeAt,
        grid: grid,
        pelletsLeft: pelletsLeft,
        pac: pac,
        ghosts: ghosts.map(function (g) {
          return {
            type: g.type, px: g.px, py: g.py,
            dir: g.dir, nextDir: g.nextDir,
            mode: g.mode, house: g.house, leaving: g.leaving,
            spawnRemain: Math.max(0, g.spawnAt - now),
          };
        }),
        modeTimer: modeTimer,
        scatter: scatter,
        frightRemain: frightUntil > now ? frightUntil - now : 0,
        eatenCombo: eatenCombo,
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
    lives = s.lives || LIVES_START;
    level = s.level || 1;
    extraLifeAt = s.extraLifeAt || 10000;
    grid = s.grid || (parseGrid(), grid);
    pelletsLeft = (typeof s.pelletsLeft === 'number') ? s.pelletsLeft : 0;
    pac = s.pac || makePac();
    const now = performance.now();
    ghosts = (s.ghosts || []).map(function (g) {
      return {
        type: g.type, px: g.px, py: g.py,
        dir: g.dir, nextDir: g.nextDir || NONE,
        mode: g.mode, house: !!g.house, leaving: !!g.leaving,
        spawnAt: now + (g.spawnRemain || 0),
      };
    });
    modeTimer = s.modeTimer || 0;
    scatter = s.scatter !== false;
    frightUntil = s.frightRemain ? now + s.frightRemain : 0;
    eatenCombo = s.eatenCombo || 0;
    updateHud();
  }

  function ghostSpeedMult() {
    return Math.min(1 + (level - 1) * 0.05, 1.35);
  }
  function frightDuration() {
    return Math.max(2.5, 6 - (level - 1) * 0.3);
  }

  // ---------- 幽灵 AI ----------
  function ghostTarget(g) {
    if (g.leaving) return { x: 14, y: 11 }; // 门上方通道
    if (g.mode === 'eyes') return { x: 14, y: 13 }; // 屋中心（整数格点，否则到达判定永不成立）
    if (g.mode === 'frightened') return null;
    if (g.mode === 'scatter') {
      const s = SCATTER_SPOTS[g.type];
      return { x: s[0], y: s[1] };
    }
    const p = tileOf(pac);
    if (g.type === 'blinky') return p;
    if (g.type === 'pinky') return tileAhead(4);
    if (g.type === 'inky') {
      const a = tileAhead(2);
      const b = tileOf(ghosts[0]);
      return { x: a.x * 2 - b.x, y: a.y * 2 - b.y };
    }
    if (dist(g, pac) > 8) return p;
    const s = SCATTER_SPOTS.clyde;
    return { x: s[0], y: s[1] };
  }

  function canGo(ch, d) {
    const t = tileOf(ch);
    const dx = DXY[d][0], dy = DXY[d][1];
    const nt = tileAt(t.x + dx, t.y + dy);
    if (ch === pac) return pacWalkable(nt);
    // 出屋中的幽灵可走门与屋内；其余幽灵不能进幽灵屋（门单向）
    if (ch.leaving) return ghostWalkable(nt);
    return nt === PELLET || nt === POWER || nt === PATH;
  }

  // 幽灵能否穿越某格（moveChar 防穿墙用，与 canGo 一致）
  function ghostCanTraverse(ch, nt) {
    if (ch.leaving) return ghostWalkable(nt);
    return nt === PELLET || nt === POWER || nt === PATH;
  }

  function opp(d) {
    if (d === RIGHT) return LEFT;
    if (d === LEFT) return RIGHT;
    if (d === UP) return DOWN;
    if (d === DOWN) return UP;
    return NONE;
  }

  function ghostPickDir(g) {
    const t = tileOf(g);
    const opts = [];
    for (const d of [RIGHT, LEFT, UP, DOWN]) {
      // 只禁止掉头（恐惧/眼睛形态可掉头），直行与转弯都允许
      if (d === opp(g.dir) && g.mode !== 'frightened' && g.mode !== 'eyes') continue;
      if (canGo(g, d)) opts.push(d);
    }
    if (opts.length === 0) {
      return canGo(g, opp(g.dir)) ? opp(g.dir) : g.dir;
    }
    if (g.mode === 'frightened') {
      return opts[Math.floor(Math.random() * opts.length)];
    }
    const target = ghostTarget(g);
    if (!target) return opts[Math.floor(Math.random() * opts.length)];
    let best = opts[0], bestD = Infinity;
    for (const d of opts) {
      const dx = DXY[d][0], dy = DXY[d][1];
      const nd = Math.hypot(t.x + dx - target.x, t.y + dy - target.y);
      if (nd < bestD) { bestD = nd; best = d; }
    }
    return best;
  }

  // ---------- 移动 ----------
  function moveChar(ch, dt, spd) {
    // 格点转向决策
    if (aligned(ch)) {
      const want = ch.nextDir !== NONE ? ch.nextDir : ch.dir;
      if (want !== NONE && canGo(ch, want)) {
        ch.dir = want;
        ch.nextDir = NONE;
      } else if (ch.dir !== NONE && !canGo(ch, ch.dir)) {
        ch.dir = NONE;
      }
    }
    if (ch.dir === NONE) return;

    const step = spd * dt;
    const d = DXY[ch.dir];
    ch.px += d[0] * step;
    ch.py += d[1] * step;

    // 隧道 wrap（r14 开放边缘）
    if (ch.py >= 13.5 && ch.py <= 14.5) {
      if (ch.px < -0.5) ch.px = COLS - 0.5;
      else if (ch.px > COLS - 0.5) ch.px = -0.5;
    }

    // 吸附格线，消除漂移
    if (Math.abs(ch.px - Math.round(ch.px)) < step * 0.9) ch.px = Math.round(ch.px);
    if (Math.abs(ch.py - Math.round(ch.py)) < step * 0.9) ch.py = Math.round(ch.py);

    // 防穿墙：前方是墙时贴住格线
    const t = tileOf(ch);
    const nt = tileAt(t.x + d[0], t.y + d[1]);
    const walk = (ch === pac) ? pacWalkable(nt) : ghostCanTraverse(ch, nt);
    if (!walk) {
      // 已贴墙：吸附回格点（避免嵌入墙内）
      ch.px = Math.round(ch.px);
      ch.py = Math.round(ch.py);
      ch.dir = NONE;
    }
  }

  // ---------- 交互 ----------
  function eatAtPac() {
    const t = tileOf(pac);
    const tile = grid[t.y][t.x];
    if (tile === PELLET) {
      grid[t.y][t.x] = PATH;
      pelletsLeft--;
      score += 10;
      play('waka');
      updateHud();
    } else if (tile === POWER) {
      grid[t.y][t.x] = PATH;
      pelletsLeft--;
      score += 50;
      frightUntil = performance.now() + frightDuration() * 1000;
      eatenCombo = 0;
      for (const g of ghosts) {
        if (!g.house && g.mode !== 'eyes') {
          g.mode = 'frightened';
          g.dir = opp(g.dir) || g.dir;
        }
      }
      play('power');
      updateHud();
    }
  }

  function collision(a, b) {
    return Math.abs(a.px - b.px) < 0.55 && Math.abs(a.py - b.py) < 0.55;
  }

  function killGhost(g) {
    eatenCombo++;
    // 连吃翻倍，但封顶 1600（第 4 只后不再涨，与原版一致）
    const mult = Math.min(eatenCombo, 4);
    score += 200 * Math.pow(2, mult - 1);
    g.mode = 'eyes';
    g.dir = UP;
    g.leaving = false;
    play('eatghost');
    updateHud();
  }

  function die() {
    lives--;
    updateHud();
    setMode('dying');
    dyeT = 0;
    play('death');
  }

  // ---------- 更新 ----------
  function update(dt, now) {
    if (mode === 'dying') {
      dyeT += dt;
      if (dyeT > 1.1) {
        if (lives <= 0) {
          setMode('gameover');
          clearState();
        } else {
          resetPositions();
          setMode('playing');
        }
      }
      return;
    }
    if (mode !== 'playing') return;

    // 每 10000 分加一条命
    if (score >= extraLifeAt) {
      extraLifeAt += 10000;
      if (lives < MAX_LIVES) {
        lives++;
        play('extra');
        updateHud();
      }
    }

    // scatter/chase 交替（7s / 20s）
    modeTimer += dt;
    const period = scatter ? 7 : 20;
    if (modeTimer >= period) {
      modeTimer = 0;
      scatter = !scatter;
      for (const g of ghosts) {
        if (g.mode !== 'frightened' && g.mode !== 'eyes' && !g.house) {
          g.mode = scatter ? 'scatter' : 'chase';
        }
      }
    }

    // 恐惧结束
    if (frightUntil > 0 && now >= frightUntil) {
      frightUntil = 0;
      for (const g of ghosts) {
        if (g.mode === 'frightened') g.mode = scatter ? 'scatter' : 'chase';
      }
    }

    // 玩家移动 + 吃豆
    moveChar(pac, dt, pac.speed);
    pac.mouth += dt * 8;
    eatAtPac();

    // 幽灵
    const gm = ghostSpeedMult();
    for (const g of ghosts) {
      // 屋里：出屋前上下浮动
      if (g.house) {
        if (now < g.spawnAt) {
          const step = 1.6 * dt;
          g.py += (g.dir === UP ? -1 : 1) * step;
          if (g.py < 13.2) { g.py = 13.2; g.dir = DOWN; }
          if (g.py > 14.8) { g.py = 14.8; g.dir = UP; }
          continue;
        }
        // 到出屋时间：走向门口
        g.house = false;
        g.leaving = true;
        // 先吸附到整数格点（屋里浮动位置非格点，不吸附无法转向选路）
        g.px = Math.round(g.px);
        g.py = Math.round(g.py);
        g.dir = UP;
        // 继续走 leaving 逻辑（不 continue）
      }
      if (g.leaving) {
        const t = tileOf(g);
        if (Math.abs(t.x - 14) <= 1 && Math.abs(t.y - 11) <= 1 && aligned(g)) {
          g.leaving = false;
          // 能量豆生效期间出屋的幽灵也是蓝色恐惧状态（经典行为）
          g.mode = (frightUntil > performance.now()) ? 'frightened' : (scatter ? 'scatter' : 'chase');
        } else {
          if (aligned(g)) g.dir = ghostPickDir(g);
          moveChar(g, dt, 6.5 * gm);
          continue;
        }
      }
      if (g.mode === 'eyes') {
        // 经典行为：眼睛形态无视墙壁，直线飞回幽灵屋
        const t = ghostTarget(g); // 屋中心 (14,13)
        const dx = t.x - g.px, dy = t.y - g.py;
        const d = Math.hypot(dx, dy);
        const step = 10 * dt;
        if (d < step + 0.01) {
          const spot = { pinky: 12, inky: 14, clyde: 16 }[g.type] || 14;
          g.px = spot; g.py = 14;
          g.dir = UP;
          g.house = true;
          g.leaving = false;
          g.spawnAt = now + 2500; // 重生后在屋里稍候再出
          g.mode = (frightUntil > now) ? 'frightened' : (scatter ? 'scatter' : 'chase');
        } else {
          g.px += dx / d * step;
          g.py += dy / d * step;
        }
        continue;
      }
      // 正常（scatter/chase/frightened）
      if (aligned(g)) {
        g.dir = ghostPickDir(g);
      }
      const sp = g.mode === 'frightened' ? 3.4 : 6.5 * gm;
      moveChar(g, dt, sp);
    }

    // 幽灵碰撞
    for (const g of ghosts) {
      if (g.house || g.leaving || g.mode === 'eyes') continue;
      if (!collision(pac, g)) continue;
      if (g.mode === 'frightened') killGhost(g);
      else { die(); break; }
    }

    // 过关
    if (pelletsLeft <= 0) {
      score += 1000;
      updateHud();
      setMode('levelclear');
      play('clear');
    }
  }

  // ---------- 流程 ----------
  function setMode(m) {
    const prev = mode;
    mode = m;
    resumeOverlay.hidden = true;
    // 暂停期间幽灵出屋倒计时应停止流逝：恢复时平移 spawnAt
    if (m === 'paused' && prev === 'playing') pauseAt = performance.now();
    else if (m === 'playing' && prev === 'paused') {
      const gap = performance.now() - pauseAt;
      for (const g of ghosts) g.spawnAt += gap;
    }
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
      ovTitle.textContent = '吃豆人';
      ovSub.textContent = '吃光所有豆子，避开幽灵\n吃能量豆反吃幽灵：200 分起，连吃翻倍（封顶 1600）';
      ovBtn.textContent = '开始游戏';
    } else if (m === 'paused') {
      ovTitle.textContent = '已暂停';
      ovSub.textContent = '按「继续」或空格回到游戏';
      ovBtn.textContent = '继续';
    } else if (m === 'levelclear') {
      ovTitle.textContent = '第 ' + level + ' 关通过';
      ovSub.textContent = '过关奖励 +1000 · 当前得分 ' + score + ' · 生命 ×' + lives;
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
    cell = Math.floor(Math.min(W / COLS, H / ROWS));
  }

  // ---------- 绘制 ----------
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d0f1e';
    ctx.fillRect(0, 0, W, H);
    const ox = (W - COLS * cell) / 2;
    const oy = (H - ROWS * cell) / 2;
    drawMaze(ox, oy, now);
    if (mode === 'dying') { if (pac) drawPac(ox, oy, true); return; }
    if (!pac) return; // 菜单等 pac 未就绪时不绘制角色
    for (const g of ghosts) drawGhost(g, ox, oy, now);
    drawPac(ox, oy, false);
  }

  function drawMaze(ox, oy, now) {
    // 豆
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = grid[y][x];
        if (t === PELLET) {
          ctx.fillStyle = 'rgba(255, 205, 120, .9)';
          ctx.beginPath();
          ctx.arc(ox + cx(x), oy + cy(y), Math.max(1.6, cell * 0.09), 0, Math.PI * 2);
          ctx.fill();
        } else if (t === POWER) {
          const blink = Math.sin(now / 200) > 0;
          ctx.fillStyle = blink ? '#ffd43b' : 'rgba(255, 212, 59, .35)';
          ctx.beginPath();
          ctx.arc(ox + cx(x), oy + cy(y), cell * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // 墙：连通线段（蓝色圆管）
    ctx.strokeStyle = '#2b4bd8';
    ctx.lineWidth = Math.max(2, cell * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y][x] !== WALL) continue;
        const px = ox + x * cell, py = oy + y * cell;
        ctx.beginPath();
        if (tileAt(x, y - 1) === WALL) { ctx.moveTo(px, py); ctx.lineTo(px + cell, py); }
        if (tileAt(x, y + 1) === WALL) { ctx.moveTo(px, py + cell); ctx.lineTo(px + cell, py + cell); }
        if (tileAt(x - 1, y) === WALL) { ctx.moveTo(px, py); ctx.lineTo(px, py + cell); }
        if (tileAt(x + 1, y) === WALL) { ctx.moveTo(px + cell, py); ctx.lineTo(px + cell, py + cell); }
        ctx.stroke();
      }
    }
    // 幽灵屋底色
    ctx.fillStyle = 'rgba(255, 120, 200, .16)';
    ctx.fillRect(ox + 11 * cell, oy + 12.5 * cell, 6 * cell, 3 * cell);
  }

  function drawPac(ox, oy, dying) {
    const x = ox + cx(pac.px), y = oy + cy(pac.py);
    const r = cell * 0.42;
    ctx.save();
    ctx.translate(x, y);
    if (dying) {
      const k = Math.max(0, 1 - dyeT * 0.6);
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath();
      ctx.arc(0, 0, r * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const open = (Math.sin(pac.mouth) + 1) / 2;
    const angle = { 1: 0, 2: Math.PI, 3: -Math.PI / 2, 4: Math.PI / 2 }[pac.dir] || 0;
    ctx.rotate(angle);
    const a = 0.12 + open * 0.85;
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.arc(0, 0, r, a, Math.PI * 2 - a);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGhost(g, ox, oy, now) {
    if (g.house) ctx.globalAlpha = 0.5;
    const x = ox + cx(g.px), y = oy + cy(g.py);
    const r = cell * 0.4;
    let body, eyes = true;
    if (g.mode === 'eyes') {
      body = '#ffffff';
    } else if (g.mode === 'frightened') {
      const blink = frightUntil - now < 1500 && Math.sin(now / 90) > 0;
      body = blink ? '#e8e8ff' : '#4d7cff';
      eyes = false;
    } else {
      body = GHOST_COLORS[g.type];
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.25, r, Math.PI, 0);
    const waves = 3;
    const ww = (2 * r) / waves;
    for (let i = 0; i < waves; i++) {
      const wx = x - r + i * ww;
      ctx.lineTo(wx, y + r * 0.8);
      ctx.quadraticCurveTo(wx + ww / 2, y + r * 0.35, wx + ww, y + r * 0.8);
    }
    ctx.closePath();
    ctx.fill();
    if (eyes) {
      const eo = { 1: 2, 2: -2, 3: 0, 4: 0 }[g.dir] || 0;
      const eyo = { 1: 0, 2: 0, 3: -2, 4: 2 }[g.dir] || 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x - r * 0.35 + eo, y - r * 0.15 + eyo, r * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.35 + eo, y - r * 0.15 + eyo, r * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2a55';
      ctx.beginPath(); ctx.arc(x - r * 0.35 + eo * 1.6, y - r * 0.15 + eyo * 1.6, r * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.35 + eo * 1.6, y - r * 0.15 + eyo * 1.6, r * 0.13, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - r * 0.5, y + r * 0.15, r * 0.3, r * 0.12);
      ctx.fillRect(x + r * 0.2, y + r * 0.15, r * 0.3, r * 0.12);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- 主循环 ----------
  function frame(now) {
    if (!lastT) lastT = now;
    let dt = (now - lastT) / 1000;
    lastT = now;
    dt = Math.min(dt, 0.04);
    update(dt, now);
    saveAcc += dt;
    if (saveAcc >= 1) { saveAcc -= 1; saveState(); }
    draw(now);
    requestAnimationFrame(frame);
  }

  // ---------- 控制 ----------
  function setPacDir(d) {
    if (mode !== 'playing' && mode !== 'dying') return;
    pac.nextDir = d;
  }

  function swipeDir(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return 0;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? RIGHT : LEFT;
    return dy > 0 ? DOWN : UP;
  }

  let touchX = 0, touchY = 0;
  stage.addEventListener('pointerdown', (e) => {
    touchX = e.clientX; touchY = e.clientY;
  });
  stage.addEventListener('pointerup', (e) => {
    const d = swipeDir(touchX, touchY, e.clientX, e.clientY);
    if (d) setPacDir(d);
  });

  document.querySelectorAll('.dpad-btn').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (mode === 'playing') {
        setPacDir(parseInt(btn.dataset.d, 10));
        ensureAudio();
      }
    });
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
    else if (mode === 'levelclear') newLevel(level + 1);
  });

  btnResumeContinue.addEventListener('click', () => {
    resumeOverlay.hidden = true;
    setMode('playing');
    ensureAudio();
  });

  btnResumeNew.addEventListener('click', () => {
    resumeOverlay.hidden = true;
    newGame();
  });

  document.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') setPacDir(LEFT);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') setPacDir(RIGHT);
    else if (k === 'ArrowUp' || k === 'w' || k === 'W') setPacDir(UP);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') setPacDir(DOWN);
    else if (k === ' ') {
      e.preventDefault();
      ensureAudio();
      if (mode === 'playing') setMode('paused');
      else if (mode === 'paused') setMode('playing');
    } else if (k === 'p' || k === 'P' || k === 'Escape') togglePause();
  });

  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', saveState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (mode === 'playing') {
        saveState();
        setMode('paused');
      } else {
        saveState();
      }
    }
  });

  // ---------- 启动 ----------
  hi = readHi();
  resize();
  applyMuted();
  const saved = loadState();
  if (saved && saved.lives > 0 && typeof saved.pelletsLeft === 'number') {
    restoreState(saved);
    mode = 'resume';
    resumeSub.textContent = '得分 ' + saved.score + ' · 第 ' + saved.level + ' 关 · 生命 ×' + saved.lives;
    resumeOverlay.hidden = false;
    btnPause.hidden = true;
  } else {
    parseGrid();
    resetPositions(); // 菜单画面也显示角色（pac/幽灵就绪，避免绘制空指针）
    setMode('menu');
  }
  updateHud();
  requestAnimationFrame(frame);

  // 调试钩子（仅测试沙箱使用；生产环境无 window.__DSH_TEST__ 不生效）
  if (window.__DSH_TEST__) {
    window.__getState = function () {
      return {
        mode: mode,
        pac: pac ? { px: pac.px, py: pac.py, dir: pac.dir } : null,
        ghosts: ghosts.map(function (g) {
          return { type: g.type, px: g.px, py: g.py, house: g.house, leaving: g.leaving, mode: g.mode };
        }),
        pelletsLeft: pelletsLeft,
      };
    };
    window.__forcePower = function () {
      frightUntil = performance.now() + 6000;
      eatenCombo = 0;
      for (const g of ghosts) {
        if (!g.house && g.mode !== 'eyes') g.mode = 'frightened';
      }
    };
    window.__forceCollide = function (type) {
      const g = ghosts.find(function (x) { return x.type === type; });
      if (g && !g.house && g.mode !== 'eyes' && pac) {
        g.px = pac.px;
        g.py = pac.py;
      }
    };
  }
})();
