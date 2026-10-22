'use strict';

const ROWS = 12;
const COLS = 6;
const ROTATIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const COLORS = ['#ff5d98', '#ffd647', '#57dc79', '#43c9ea', '#a879ee'];
const DARKS = ['#9d315d', '#a87813', '#248744', '#19758d', '#6746a0'];
const SAVE_KEY = 'moonlit_puyo_minigame_v1';
const config = require('./config.js');
const createLeaderboard = require('./leaderboard.js').create;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function inside(point, box) { return point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h; }

class PuyoGame {
  constructor(canvas, platform) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.platform = platform;
    this.storage = platform.storage();
    this.audio = platform.audio();
    this.leaderboard = createLeaderboard(platform, this.storage, config.gameVersion);
    this.info = platform.systemInfo();
    this.dpr = this.info.pixelRatio;
    canvas.width = Math.round(this.info.width * this.dpr);
    canvas.height = Math.round(this.info.height * this.dpr);
    this.ctx.scale(this.dpr, this.dpr);
    this.w = this.info.width;
    this.h = this.info.height;
    this.safe = this.info.safeArea;
    this.rules = window.PuyoChallengeRules;
    this.rogue = window.PuyoRogueliteRules;
    this.items = window.PuyoActiveItemRules;
    this.boardRules = window.PuyoBoardRules.create({ rows: ROWS, cols: COLS, garbage: this.rules.GARBAGE, isGarbage: this.rules.isGarbage, rotations: ROTATIONS });
    this.effects = window.PuyoChallengeEffects.create({ challengeRules: this.rules, rogueliteRules: this.rogue, activeItemRules: this.items, boardRules: this.boardRules, garbage: this.rules.GARBAGE, rows: ROWS });
    this.buttons = [];
    this.hold = null;
    this.last = 0;
    this.acc = 0;
    this.message = '';
    this.messageUntil = 0;
    this.mode = 'menu';
    this.gameType = 'challenge';
    this.resetData();
  }

  resetData() {
    this.board = this.boardRules.emptyBoard();
    this.queue = [];
    this.pair = null;
    this.score = 0;
    this.best = Number(this.storage.get('moonlit_puyo_best_' + this.gameType, 0)) || 0;
    this.level = 1;
    this.cleared = 0;
    this.maxChain = 0;
    this.challenge = this.rules.normalize({});
    this.build = this.rogue.normalize({}, 0);
    this.itemState = this.gameType === 'challenge' ? this.items.initialState() : this.items.emptyState();
    this.turnStats = this.freshStats();
    this.choiceKind = '';
    this.activeMs = 0;
    this.leaderboardEntries = [];
    this.leaderboardStatus = '';
  }

  freshStats() {
    return { maxChain: 0, maxColors: 0, largestGroup: 0, largestGroupColor: 0, garbageCleared: 0, cleared: 0, scoreGained: 0, clearedThisTurn: false, colorClearedCount: 0, extraDefense: 0 };
  }

  start() {
    wx.onTouchStart((event) => this.touchStart(event));
    wx.onTouchMove((event) => this.touchMove(event));
    wx.onTouchEnd(() => { this.hold = null; });
    if (wx.onTouchCancel) wx.onTouchCancel(() => { this.hold = null; });
    this.restoreOrMenu();
    requestAnimationFrame((time) => this.frame(time));
  }

  restoreOrMenu() {
    const saved = this.storage.get(SAVE_KEY, null);
    if (!saved || typeof saved !== 'object') return;
    this.resumeCandidate = saved;
  }

  newGame(type) {
    this.gameType = type === 'classic' ? 'classic' : 'challenge';
    this.resetData();
    this.fillQueue();
    this.mode = 'playing';
    this.spawn();
    this.audio.start();
    this.save();
  }

  randomPair() { return [1 + Math.floor(Math.random() * 5), 1 + Math.floor(Math.random() * 5)]; }
  fillQueue() { while (this.queue.length < 3) this.queue.push(this.randomPair()); }

  spawn() {
    this.fillQueue();
    const colors = this.queue.shift();
    this.fillQueue();
    this.pair = { colors, x: 2, y: 0, rot: 0 };
    this.acc = 0;
    if (this.boardRules.collides(this.board, this.pair, this.pair.x, this.pair.y, this.pair.rot)) this.gameOver();
  }

  move(dx, dy) {
    if (this.mode !== 'playing' || !this.pair) return false;
    if (this.boardRules.collides(this.board, this.pair, this.pair.x + dx, this.pair.y + dy, this.pair.rot)) return false;
    this.pair.x += dx;
    this.pair.y += dy;
    return true;
  }

  rotate(dir) {
    if (this.mode !== 'playing' || !this.pair) return;
    const result = window.PuyoRotationRules.resolve({
      pair: this.pair,
      dir,
      rotations: ROTATIONS,
      now: Date.now(),
      pending: this.rotationPending,
      collides: (x, y, rot) => this.boardRules.collides(this.board, this.pair, x, y, rot),
    });
    this.rotationPending = result.pending;
    if (result.success) Object.assign(this.pair, result.pair);
  }

  hardDrop() {
    if (!this.pair || this.mode !== 'playing') return;
    let distance = 0;
    while (this.move(0, 1)) distance++;
    this.score += window.PuyoScoringRules.dropScore(distance);
    this.lock();
  }

  lock() {
    if (!this.pair) return;
    for (const cell of this.boardRules.pairCells(this.pair, this.pair.x, this.pair.y, this.pair.rot)) {
      if (cell.y < 0) return this.gameOver();
      this.board[cell.y][cell.x] = cell.color;
    }
    if (this.itemState.armedItem === this.items.MIX_BOTTLE && this.gameType === 'challenge') this.applyBottle();
    this.pair = null;
    this.mode = 'resolving';
    this.resolve(1, false);
  }

  applyBottle() {
    const result = this.items.applyMixBottle(this.itemState, this.board, COLORS.length, Math.random);
    this.itemState = result.state;
    this.board = result.board;
    if (result.applied) this.flash('混色瓶：' + result.sourceColor + ' → ' + result.targetColor, 1200);
  }

  resolve(chain, rewardChain) {
    const groups = this.boardRules.findClearGroups(this.board);
    if (!groups.length) return this.finishTurn(chain - 1, rewardChain);
    const colors = new Set(groups.map((group) => group.color));
    const cells = groups.flatMap((group) => group.cells);
    const modifiers = this.gameType === 'challenge' ? this.rogue.modifiers(this.build) : this.rogue.modifiers({});
    const clearEffects = this.effects.resolveClear({ active: this.gameType === 'challenge', board: this.board, cells, groups, modifiers, cleanerUsed: !!this.turnStats.cleanerUsed });
    this.turnStats.cleanerUsed = clearEffects.cleanerUsed;
    const gained = window.PuyoScoringRules.calculate({ clearedCount: cells.length, groupSizes: groups.map((g) => g.cells.length), colorCount: colors.size, chain, scoreMultiplier: modifiers.chainScoreMultiplier }).score;
    this.score += gained;
    this.cleared += cells.length;
    this.maxChain = Math.max(this.maxChain, chain);
    this.turnStats.maxChain = Math.max(this.turnStats.maxChain, chain);
    this.turnStats.maxColors = Math.max(this.turnStats.maxColors, colors.size);
    this.turnStats.cleared += cells.length;
    this.turnStats.clearedThisTurn = true;
    this.turnStats.scoreGained += gained;
    for (const group of groups) if (group.cells.length > this.turnStats.largestGroup) {
      this.turnStats.largestGroup = group.cells.length;
      this.turnStats.largestGroupColor = group.color;
    }
    for (const cell of cells) this.board[cell[1]][cell[0]] = 0;
    for (const hit of clearEffects.garbageHits || []) if (this.board[hit.cell[1]][hit.cell[0]] === hit.from) this.board[hit.cell[1]][hit.cell[0]] = hit.to;
    this.turnStats.garbageCleared += clearEffects.destroyedGarbage || 0;
    this.board = this.boardRules.applyGravity(this.board, false).board;
    this.flash((rewardChain ? '奖励 ' : '') + (chain > 1 ? chain + ' CHAIN' : '消除') + '  +' + gained, 650);
    setTimeout(() => this.resolve(chain + 1, rewardChain), 340);
  }

  finishTurn(chain, rewardChain) {
    this.level = Math.min(12, Math.floor(this.cleared / 35) + 1);
    if (this.gameType !== 'challenge') return this.continuePlay();
    // Stage 奖励触发的连锁属于上一回合结算的一部分，不能再次扣任务步数。
    if (rewardChain) {
      this.turnStats = this.freshStats();
      return this.openPendingChoice();
    }
    const result = this.effects.settleTurn({ challengeState: this.challenge, runBuild: this.build, itemState: this.itemState, turnStats: this.turnStats, board: this.board, random: Math.random });
    this.challenge = result.challengeState;
    this.build = result.runBuild;
    this.itemState = result.itemState;
    this.score += result.scoreBonus;
    for (const hit of result.rewardHits) if (this.board[hit.cell[1]][hit.cell[0]] === hit.from) this.board[hit.cell[1]][hit.cell[0]] = hit.to;
    if (result.rewardHits.length) {
      this.board = this.boardRules.applyGravity(this.board, false).board;
      this.turnStats = this.freshStats();
      if (result.message) this.flash(result.message.text, result.message.duration);
      return setTimeout(() => this.resolve(chain + 1, true), 480);
    }
    if (result.message) this.flash(result.message.text, result.message.duration);
    this.turnStats = this.freshStats();
    this.openPendingChoice();
  }

  openPendingChoice() {
    if (this.build.pendingRelicChoice && this.build.pendingRelicChoice.length) {
      this.choiceKind = 'relic'; this.mode = 'choice'; return;
    }
    if (this.build.pendingChoice && this.build.pendingChoice.length) {
      this.choiceKind = 'upgrade'; this.mode = 'choice'; return;
    }
    if (this.build.contract && this.build.contract.status === 'pending') {
      this.choiceKind = 'contract'; this.mode = 'choice'; return;
    }
    this.continuePlay();
  }

  choose(id) {
    if (this.choiceKind === 'upgrade') this.build = this.rogue.choose(this.build, id, this.challenge.completed).state;
    else if (this.choiceKind === 'relic') this.build = this.rogue.chooseRelic(this.build, id).state;
    this.choiceKind = '';
    this.openPendingChoice();
    this.save();
  }

  chooseContract(accept) {
    const result = this.rogue.decideContract(this.build, accept);
    this.build = result.state;
    if (result.garbage) this.challenge = this.rules.enqueueDeferred(this.challenge, result.garbage, 2);
    this.choiceKind = '';
    this.continuePlay();
  }

  continuePlay() {
    this.mode = 'playing';
    this.spawn();
    this.save();
  }

  gameOver() {
    this.mode = 'gameover';
    this.audio.stop();
    this.best = Math.max(this.best, this.score);
    this.storage.set('moonlit_puyo_best_' + this.gameType, this.best);
    this.storage.remove(SAVE_KEY);
    if (this.gameType === 'challenge') this.leaderboard.submit({ score: this.score, stage: this.challenge.stage, maxChain: this.maxChain, durationMs: this.activeMs }).catch(() => {});
  }

  save() {
    if (!['playing', 'paused', 'choice', 'resolving'].includes(this.mode)) return;
    this.storage.set(SAVE_KEY, { version: 1, gameType: this.gameType, board: this.board, queue: this.queue, pair: this.pair, score: this.score, level: this.level, cleared: this.cleared, maxChain: this.maxChain, activeMs: this.activeMs, challenge: this.challenge, build: this.build, itemState: this.itemState, mode: this.mode });
  }

  restore() {
    const saved = this.resumeCandidate;
    if (!saved) return;
    this.gameType = saved.gameType === 'classic' ? 'classic' : 'challenge';
    this.resetData();
    this.board = Array.isArray(saved.board) ? saved.board : this.board;
    this.queue = Array.isArray(saved.queue) ? saved.queue : [];
    this.pair = saved.pair || null;
    this.score = Number(saved.score) || 0;
    this.level = Number(saved.level) || 1;
    this.cleared = Number(saved.cleared) || 0;
    this.maxChain = Number(saved.maxChain) || 0;
    this.activeMs = Number(saved.activeMs) || 0;
    this.challenge = this.rules.normalize(saved.challenge || {});
    this.build = this.rogue.normalize(saved.build || {}, this.challenge.completed);
    this.itemState = this.items.normalize(saved.itemState || {});
    this.fillQueue();
    this.mode = saved.mode === 'choice' ? 'choice' : 'playing';
    if (!this.pair && this.mode === 'playing') this.spawn();
    if (this.mode === 'choice') this.openPendingChoice();
    this.resumeCandidate = null;
    this.audio.start();
  }

  onHide() { if (this.mode === 'playing') this.mode = 'paused'; this.save(); this.audio.pause(); }
  onShow() { if (this.mode === 'paused') this.flash('游戏已暂停', 900); }
  flash(text, duration) { this.message = String(text || ''); this.messageUntil = Date.now() + (duration || 900); }

  frame(time) {
    const dt = Math.min(0.05, this.last ? (time - this.last) / 1000 : 0);
    this.last = time;
    this.update(dt);
    this.draw();
    requestAnimationFrame((next) => this.frame(next));
  }

  update(dt) {
    if (this.mode !== 'playing' || !this.pair) return;
    this.activeMs += dt * 1000;
    this.acc += dt;
    if (this.hold && Date.now() - this.hold.started > 240) {
      this.hold.acc += dt;
      const interval = this.hold.action === 'down' ? 0.055 : 0.09;
      while (this.hold.acc >= interval) { this.hold.acc -= interval; this.perform(this.hold.action); }
    }
    if (this.acc >= Math.max(0.2, 0.9 - (this.level - 1) * 0.055)) {
      this.acc = 0;
      if (!this.move(0, 1)) this.lock();
    }
  }

  layout() {
    const top = Math.max(this.safe.top + 8, 18);
    const bottom = Math.min(this.safe.bottom, this.h) - 12;
    const controlsH = 62;
    const boardH = Math.min(ROWS * 34, bottom - top - controlsH - 92);
    const cell = Math.floor(Math.min((this.w - 106) / COLS, boardH / ROWS));
    const boardW = cell * COLS;
    return { top, bottom, cell, boardX: 14, boardY: top + 54, boardW, boardH: cell * ROWS, sideX: 24 + boardW, controlsY: bottom - controlsH };
  }

  draw() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, this.w, this.h);
    gradient.addColorStop(0, '#28152f'); gradient.addColorStop(1, '#111d32');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, this.w, this.h);
    this.buttons = [];
    if (this.mode === 'menu') return this.drawMenu();
    if (this.mode === 'leaderboard') return this.drawLeaderboard();
    this.drawGame();
    if (this.mode === 'paused') this.drawDialog('游戏暂停', '点击继续回到连锁现场', [{ label: '继续', action: 'resume' }]);
    else if (this.mode === 'gameover') this.drawDialog('游戏结束', '得分 ' + this.score + ' · 最高连锁 ' + this.maxChain, [{ label: '再来一局', action: 'restart' }, { label: '返回模式选择', action: 'menu' }]);
    else if (this.mode === 'choice') this.drawChoice();
  }

  drawMenu() {
    const cx = this.w / 2;
    this.text('月夜街机', cx, this.safe.top + 72, 30, '#fff', 'center', 800);
    this.text('PUYO · 果冻连锁挑战', cx, this.safe.top + 103, 12, '#a9a1bf', 'center', 600);
    this.text('选择模式', cx, this.safe.top + 172, 15, '#fff', 'center', 700);
    this.button({ x: 30, y: this.safe.top + 195, w: this.w - 60, h: 64 }, '挑战模式', 'startChallenge', '#b8f34a', '#162017');
    this.text('动态任务 · 干扰 · 肉鸽强化', cx, this.safe.top + 277, 12, '#a9a1bf', 'center', 500);
    this.button({ x: 30, y: this.safe.top + 306, w: this.w - 60, h: 58 }, '经典模式', 'startClassic', '#302847', '#fff');
    if (this.resumeCandidate) this.button({ x: 30, y: this.safe.top + 382, w: this.w - 60, h: 52 }, '继续上次游戏', 'restore', '#24526a', '#fff');
    this.button({ x: 30, y: this.safe.top + (this.resumeCandidate ? 450 : 382), w: this.w - 60, h: 48 }, '本周挑战榜', 'leaderboard', '#302847', '#56dced', 12);
    this.button({ x: this.w - 60, y: this.safe.top + 12, w: 42, h: 42 }, this.audio.isMuted() ? '🔇' : '🔊', 'sound', '#302847', '#fff');
  }

  drawGame() {
    const l = this.layout();
    this.text('噗呦噗呦', 16, l.top + 20, 22, '#fff', 'left', 800);
    this.text(this.gameType === 'challenge' ? '挑战' : '经典', this.w - 18, l.top + 18, 11, '#b8f34a', 'right', 700);
    this.roundRect(l.boardX, l.boardY, l.boardW, l.boardH, 14, '#201b3b', 'rgba(255,255,255,.14)');
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const value = this.board[y][x];
      if (value) this.drawCell(value, l.boardX + (x + .5) * l.cell, l.boardY + (y + .5) * l.cell, l.cell * .42);
    }
    if (this.pair) for (const cell of this.boardRules.pairCells(this.pair, this.pair.x, this.pair.y, this.pair.rot)) if (cell.y >= 0) this.drawCell(cell.color, l.boardX + (cell.x + .5) * l.cell, l.boardY + (cell.y + .5) * l.cell, l.cell * .42);
    this.text('得分', l.sideX, l.boardY + 14, 9, '#aaa2bb');
    this.text(String(this.score), this.w - 14, l.boardY + 35, 19, '#fff', 'right', 800);
    this.text('最高', l.sideX, l.boardY + 60, 9, '#aaa2bb');
    this.text(String(Math.max(this.best, this.score)), this.w - 14, l.boardY + 81, 17, '#fff', 'right', 800);
    this.text('NEXT', l.sideX, l.boardY + 112, 10, '#b8f34a', 'left', 700);
    if (this.queue[0]) {
      this.drawCell(this.queue[0][1], l.sideX + 27, l.boardY + 143, 14);
      this.drawCell(this.queue[0][0], l.sideX + 27, l.boardY + 171, 14);
    }
    if (this.gameType === 'challenge') this.drawChallenge(l);
    const gap = 6, count = 6, bw = (this.w - 20 - gap * (count - 1)) / count;
    ['左', '右', '逆转', '顺转', '下落', '落底'].forEach((label, index) => {
      const actions = ['left', 'right', 'ccw', 'cw', 'down', 'drop'];
      this.button({ x: 10 + index * (bw + gap), y: l.controlsY, w: bw, h: 56 }, label, actions[index], index === 5 ? '#b8f34a' : '#302847', index === 5 ? '#162017' : '#fff', 12);
    });
    this.button({ x: this.w - 58, y: l.top, w: 40, h: 38 }, 'Ⅱ', 'pause', '#302847', '#fff', 12);
    if (Date.now() < this.messageUntil) {
      this.roundRect(26, l.boardY + l.boardH * .36, this.w - 52, 64, 14, 'rgba(20,15,40,.92)', 'rgba(184,243,74,.35)');
      const lines = this.message.split('\n');
      lines.slice(0, 2).forEach((line, index) => this.text(line, this.w / 2, l.boardY + l.boardH * .36 + 26 + index * 20, index ? 10 : 15, index ? '#b9b2c8' : '#fff', 'center', 700));
    }
  }

  drawChallenge(l) {
    const y = l.boardY + 215;
    this.text('阶段 ' + this.challenge.stage, l.sideX, y, 11, '#ff79ae', 'left', 800);
    this.wrapText(this.challenge.mission.title, l.sideX, y + 24, this.w - l.sideX - 10, 12, '#fff');
    const presentation = this.rules.missionPresentation(this.challenge.mission, this.challenge.mission.progress);
    this.wrapText(presentation.progress, l.sideX, y + 61, this.w - l.sideX - 10, 9, '#aaa2bb');
    this.text('余 ' + this.challenge.turnsLeft + ' 组', l.sideX, y + 98, 9, this.challenge.turnsLeft <= 2 ? '#ff6f9f' : '#aaa2bb');
    this.text('干扰 ×' + (this.challenge.deferredGarbage || this.challenge.pendingGarbage || 0), l.sideX, y + 119, 9, '#ddd6e8');
    const bottleCount = this.items.count(this.itemState, this.items.MIX_BOTTLE);
    this.button({ x: l.sideX, y: y + 138, w: this.w - l.sideX - 10, h: 34 }, '🧪 ×' + bottleCount, 'bottle', bottleCount ? '#244855' : '#2b2838', '#fff', 9);
  }

  drawChoice() {
    if (this.choiceKind === 'contract') return this.drawDialog('超载契约', '立即增加 2 个干扰，完成阶段后多选一次强化', [{ label: '接受', action: 'contractYes' }, { label: '跳过', action: 'contractNo' }]);
    const ids = this.choiceKind === 'relic' ? this.build.pendingRelicChoice : this.build.pendingChoice;
    const cards = ids.map((id) => this.choiceKind === 'relic' ? this.rogue.relicCardFor(this.build, id) : this.rogue.cardFor(this.build, id));
    this.roundRect(18, this.safe.top + 60, this.w - 36, Math.min(430, this.h - this.safe.top - 100), 20, 'rgba(28,23,51,.98)', 'rgba(184,243,74,.35)');
    this.text(this.choiceKind === 'relic' ? '选择特殊遗物' : '选择一项强化', this.w / 2, this.safe.top + 94, 20, '#fff', 'center', 800);
    cards.forEach((card, index) => {
      const box = { x: 34, y: this.safe.top + 118 + index * 104, w: this.w - 68, h: 88 };
      this.roundRect(box.x, box.y, box.w, box.h, 13, '#30294e', 'rgba(255,255,255,.16)');
      this.text(card.name, box.x + 14, box.y + 27, 15, '#fff', 'left', 800);
      this.wrapText(card.effect, box.x + 14, box.y + 49, box.w - 28, 10, '#bdb5cd');
      this.buttons.push({ box, action: 'choice:' + card.id });
    });
  }

  drawLeaderboard() {
    this.text('本周挑战榜', this.w / 2, this.safe.top + 52, 25, '#fff', 'center', 800);
    const current = this.leaderboard.profile();
    this.text(current.optedIn ? '昵称：' + current.nickname : '设置昵称后自动上传挑战成绩', this.w / 2, this.safe.top + 82, 11, '#aaa2bb', 'center', 500);
    if (this.leaderboardStatus) this.text(this.leaderboardStatus, this.w / 2, this.safe.top + 112, 11, '#56dced', 'center', 600);
    this.leaderboardEntries.slice(0, 10).forEach((entry, index) => {
      const y = this.safe.top + 142 + index * 38;
      this.text(String(index + 1), 28, y, 12, index < 3 ? '#b8f34a' : '#aaa2bb', 'left', 800);
      this.text(entry.playerName || entry.nickname || '月夜玩家', 58, y, 12, '#fff', 'left', 700);
      this.text(String(entry.score || 0), this.w - 24, y, 12, '#fff', 'right', 800);
    });
    this.button({ x: 24, y: this.h - 126, w: (this.w - 58) / 2, h: 44 }, '设置昵称', 'nickname', '#24526a', '#fff', 12);
    this.button({ x: 34 + (this.w - 58) / 2, y: this.h - 126, w: (this.w - 58) / 2, h: 44 }, '刷新', 'leaderboardRefresh', '#302847', '#fff', 12);
    this.button({ x: 24, y: this.h - 72, w: this.w - 48, h: 44 }, '返回', 'menu', '#b8f34a', '#162017', 13);
  }

  loadLeaderboard() {
    this.mode = 'leaderboard';
    this.leaderboardStatus = '正在连接…';
    this.leaderboard.load().then((data) => {
      this.leaderboardEntries = Array.isArray(data) ? data : (data.entries || data.results || []);
      this.leaderboardStatus = this.leaderboardEntries.length ? '' : '本周暂无成绩';
    }).catch(() => { this.leaderboardStatus = '排行榜暂不可用'; });
  }

  editNickname() {
    const current = this.leaderboard.profile();
    wx.showModal({
      title: '排行榜昵称', editable: true, placeholderText: '最多 12 个字', content: current.nickname || '',
      success: (result) => {
        if (!result.confirm) return;
        this.leaderboardStatus = this.leaderboard.enable(result.content) ? '昵称已保存' : '请输入昵称';
      },
    });
  }

  drawDialog(title, sub, actions) {
    const box = { x: 28, y: this.h * .28, w: this.w - 56, h: 250 };
    this.roundRect(box.x, box.y, box.w, box.h, 22, 'rgba(31,25,56,.98)', 'rgba(255,255,255,.18)');
    this.text(title, this.w / 2, box.y + 58, 25, '#fff', 'center', 800);
    this.wrapText(sub, box.x + 28, box.y + 91, box.w - 56, 12, '#b9b2c8', 'center');
    actions.forEach((action, index) => this.button({ x: box.x + 24, y: box.y + 145 + index * 52, w: box.w - 48, h: 42 }, action.label, action.action, index ? '#302847' : '#b8f34a', index ? '#fff' : '#162017', 13));
  }

  drawCell(value, x, y, radius) {
    const ctx = this.ctx;
    if (this.rules.isGarbage(value)) {
      ctx.fillStyle = value === 7 ? '#b9dce7' : '#aaa5b6';
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = value === 7 ? '#effcff' : '#575161'; ctx.lineWidth = value === 7 ? 3 : 1.5; ctx.stroke();
      if (value === 8) { ctx.beginPath(); ctx.moveTo(x + 2, y - radius * .75); ctx.lineTo(x - 3, y - 2); ctx.lineTo(x + 4, y + radius * .7); ctx.stroke(); }
      ctx.fillStyle = '#4d4758'; ctx.beginPath(); ctx.arc(x - radius * .23, y, radius * .1, 0, Math.PI * 2); ctx.arc(x + radius * .23, y, radius * .1, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.fillStyle = COLORS[value - 1]; ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .93, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = DARKS[value - 1]; ctx.lineWidth = Math.max(1, radius * .07); ctx.stroke();
    if (radius < 8) return;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x - radius * .17, y, radius * .16, radius * .21, 0, 0, Math.PI * 2); ctx.ellipse(x + radius * .17, y, radius * .16, radius * .21, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#322742'; ctx.beginPath(); ctx.arc(x - radius * .13, y + 1, radius * .07, 0, Math.PI * 2); ctx.arc(x + radius * .21, y + 1, radius * .07, 0, Math.PI * 2); ctx.fill();
  }

  roundRect(x, y, w, h, radius, fill, stroke) {
    const ctx = this.ctx;
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  text(value, x, y, size, color, align, weight) {
    const ctx = this.ctx; ctx.fillStyle = color || '#fff'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.font = (weight || 600) + ' ' + size + 'px sans-serif'; ctx.fillText(String(value), x, y);
  }

  wrapText(value, x, y, width, size, color, align) {
    const chars = Array.from(String(value || '')); let line = '', lines = [];
    this.ctx.font = '600 ' + size + 'px sans-serif';
    for (const char of chars) { const next = line + char; if (this.ctx.measureText(next).width > width && line) { lines.push(line); line = char; } else line = next; }
    if (line) lines.push(line);
    lines.slice(0, 2).forEach((entry, index) => this.text(entry, align === 'center' ? x + width / 2 : x, y + index * (size + 4), size, color, align || 'left', 600));
  }

  button(box, label, action, fill, color, fontSize) {
    this.roundRect(box.x, box.y, box.w, box.h, 12, fill, 'rgba(255,255,255,.13)');
    this.text(label, box.x + box.w / 2, box.y + box.h / 2, fontSize || 14, color, 'center', 800);
    this.buttons.push({ box, action });
  }

  touchStart(event) {
    const touch = event.touches && event.touches[0]; if (!touch) return;
    const point = { x: touch.clientX, y: touch.clientY };
    const button = this.buttons.slice().reverse().find((item) => inside(point, item.box));
    if (!button) return;
    this.perform(button.action);
    if (['left', 'right', 'down'].includes(button.action)) this.hold = { action: button.action, started: Date.now(), acc: 0 };
  }
  touchMove() {}

  perform(action) {
    if (action === 'startChallenge') return this.newGame('challenge');
    if (action === 'startClassic') return this.newGame('classic');
    if (action === 'restore') return this.restore();
    if (action === 'left') return this.move(-1, 0);
    if (action === 'right') return this.move(1, 0);
    if (action === 'down') { if (!this.move(0, 1) && this.mode === 'playing') this.lock(); return; }
    if (action === 'ccw') return this.rotate(-1);
    if (action === 'cw') return this.rotate(1);
    if (action === 'drop') return this.hardDrop();
    if (action === 'pause') { if (this.mode === 'playing') { this.mode = 'paused'; this.audio.pause(); this.save(); } return; }
    if (action === 'resume') { this.mode = 'playing'; this.audio.resume(); return; }
    if (action === 'restart') return this.newGame(this.gameType);
    if (action === 'menu') { this.mode = 'menu'; return; }
    if (action === 'leaderboard') return this.loadLeaderboard();
    if (action === 'leaderboardRefresh') return this.loadLeaderboard();
    if (action === 'nickname') return this.editNickname();
    if (action === 'sound') { this.audio.toggle(); return; }
    if (action === 'bottle') {
      if (this.mode === 'playing') this.itemState = this.items.toggleMixBottle(this.itemState, !!this.pair).state;
      return;
    }
    if (action === 'contractYes') return this.chooseContract(true);
    if (action === 'contractNo') return this.chooseContract(false);
    if (action.startsWith('choice:')) return this.choose(action.slice(7));
  }
}

module.exports = PuyoGame;
