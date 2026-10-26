'use strict';

const ROWS = 12;
const COLS = 6;
const ROTATIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const COLORS = ['#ff5d98', '#ffd647', '#57dc79', '#43c9ea', '#a879ee'];
const DARKS = ['#9d315d', '#a87813', '#248744', '#19758d', '#6746a0'];
const config = require('./config.js');
const createLeaderboard = require('./leaderboard.js').create;
const PuyoEffects = require('./puyo-effects.js');
const lobby = require('./lobby.js');
const puyoRenderer = require('./puyo-renderer.js');
const PuyoSessionController = require('./puyo-session-controller.js');
const overlays = require('./puyo-overlays.js');

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function inside(point, box) { return point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h; }

class PuyoGame {
  constructor(canvas, platform) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.platform = platform;
    this.storage = platform.storage();
    this.audio = platform.audio({ onInterrupted: () => {
      if (this.controller && ['playing', 'resolving'].includes(this.mode)) this.controller.pause();
    } });
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
    this.pointer = null;
    this.lobbyScroll = 0;
    this.lobbyMaxScroll = 0;
    this.last = 0;
    this.acc = 0;
    this.lockAcc = 0;
    this.lockResets = 0;
    this.message = '';
    this.messageUntil = 0;
    this.mode = 'lobby';
    this.gameType = 'challenge';
    this.resolveToken = 0;
    this.visual = new PuyoEffects();
    this.resetData();
    this.controller = new PuyoSessionController(this);
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
    wx.onTouchEnd((event) => this.touchEnd(event));
    if (wx.onTouchCancel) wx.onTouchCancel(() => { this.hold = null; this.pointer = null; });
    this.restoreOrMenu();
    if (this.audio.preload) this.audio.preload();
    requestAnimationFrame((time) => this.frame(time));
  }

  restoreOrMenu() {
    const saved = this.controller.saves.load();
    if (!saved || typeof saved !== 'object') return;
    this.resumeCandidate = saved;
  }

  newGame(type) { this.controller.start(type === 'classic' ? 'classic' : 'challenge'); }
  move(dx, dy) { return this.controller.dispatch(dy ? { type: 'softDrop' } : { type: 'move', direction: dx }); }
  rotate(direction) { return this.controller.dispatch({ type: 'rotate', direction }); }
  hardDrop() { return this.controller.dispatch({ type: 'hardDrop' }); }
  choose(id) { return this.controller.dispatch({ type: this.choiceKind === 'relic' ? 'chooseRelic' : 'chooseUpgrade', id }); }
  chooseContract(accept) { return this.controller.dispatch({ type: 'chooseContract', accept }); }
  save() { this.controller.save(); }
  restore() { if (this.resumeCandidate) this.controller.restore(this.resumeCandidate); }
  colorName(value) { return ['未知', '粉色', '黄色', '绿色', '蓝色', '紫色'][value] || '未知'; }
  onHide() {
    this.hold = null;
    this.pointer = null;
    if (['playing', 'resolving'].includes(this.mode)) this.controller.pause();
    this.controller.hidden = true;
    this.save();
    if (this.audio.hide) this.audio.hide(); else this.audio.pause();
  }
  onShow() {
    this.controller.hidden = false;
    this.last = 0;
    if (this.audio.show) this.audio.show();
    if (this.mode === 'paused') this.flash('游戏已暂停', 900);
  }
  flash(text, duration) { this.message = String(text || ''); this.messageUntil = Date.now() + (duration || 900); }
  frame(time) {
    const dt = Math.min(0.04, this.last ? (time - this.last) / 1000 : 0);
    this.last = time;
    this.update(dt);
    if (!this.controller.hidden) this.draw();
    requestAnimationFrame((next) => this.frame(next));
  }
  update(dt) { this.controller.update(dt); }

  layout() {
    return puyoRenderer.layout(this);
  }

  draw() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, this.w, this.h);
    gradient.addColorStop(0, '#25152f'); gradient.addColorStop(.52, '#15152a'); gradient.addColorStop(1, '#102033');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, this.w, this.h);
    this.drawAtmosphere();
    this.buttons = [];
    if (this.mode === 'audio') {
      if (this.audioReturnMode === 'lobby') this.drawLobby();
      else if (this.audioReturnMode === 'menu') this.drawMenu();
      else this.drawGame();
      this.buttons = [];
      ctx.fillStyle = 'rgba(10,8,24,.68)'; ctx.fillRect(0, 0, this.w, this.h);
      overlays.drawAudio(this);
      return;
    }
    if (this.mode === 'lobby') return this.drawLobby();
    if (this.mode === 'menu') return this.drawMenu();
    if (this.mode === 'leaderboard') return this.drawLeaderboard();
    this.drawGame();
    if (['paused', 'gameover', 'choice', 'build', 'mission'].includes(this.mode)) {
      this.buttons = [];
      ctx.fillStyle = 'rgba(10,8,24,.68)';
      ctx.fillRect(0, 0, this.w, this.h);
    }
    if (this.mode === 'paused') this.drawDialog('游戏暂停', '点击继续回到连锁现场', [{ label: '继续', action: 'resume' }, { label: '返回游戏厅', action: 'lobby' }]);
    else if (this.mode === 'gameover') overlays.drawGameOver(this);
    else if (this.mode === 'choice') this.drawChoice();
    else if (this.mode === 'build') this.drawBuild();
    else if (this.mode === 'mission') overlays.drawMission(this);
  }

  drawAtmosphere() {
    const ctx = this.ctx;
    ctx.save();
    for (let index = 0; index < 22; index++) {
      const x = (index * 83 + 31) % this.w;
      const y = (index * 137 + 19) % this.h;
      ctx.globalAlpha = .08 + (index % 4) * .035;
      ctx.fillStyle = index % 3 ? '#aaa4ff' : '#ffbd70';
      ctx.beginPath(); ctx.arc(x, y, index % 5 === 0 ? 1.6 : 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  drawLobby() {
    const view = lobby.draw({
      ctx: this.ctx,
      width: this.w,
      height: this.h,
      safe: this.safe,
      scroll: this.lobbyScroll,
      best: Number(this.storage.get('moonlit_puyo_best_challenge', 0)) || 0,
      hasSave: !!this.resumeCandidate,
      helpers: { text: this.text.bind(this), roundRect: this.roundRect.bind(this) },
    });
    this.lobbyScroll = view.scroll;
    this.lobbyMaxScroll = view.maxScroll;
    this.buttons = view.buttons;
    this.button({ x: this.w - 58, y: Math.max(this.safe.top + 8, 16), w: 40, h: 40 }, this.audio.isMuted() ? '静' : '声', 'sound', '#302847', '#fff', 11);
  }

  drawMenu() {
    const cx = this.w / 2;
    this.button({ x: 16, y: this.safe.top + 12, w: 44, h: 42 }, '←', 'lobby', '#302847', '#fff', 18);
    this.text('噗呦噗呦', cx, this.safe.top + 72, 30, '#fff', 'center', 800);
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
    puyoRenderer.drawGame(this);
  }

  drawConnections(l) {
    const ctx = this.ctx;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const value = this.board[y][x];
      const state = this.visual.cellState(x, y);
      if (!value || this.rules.isGarbage(value) || state.alpha < .99 || state.offsetRows !== 0 || state.recolor) continue;
      ctx.fillStyle = COLORS[value - 1];
      const right = x + 1 < COLS ? this.visual.cellState(x + 1, y) : null;
      const below = y + 1 < ROWS ? this.visual.cellState(x, y + 1) : null;
      if (right && this.board[y][x + 1] === value && right.alpha >= .99 && right.offsetRows === 0 && !right.recolor) ctx.fillRect(l.boardX + (x + .5) * l.cell, l.boardY + y * l.cell + l.cell * .16, l.cell, l.cell * .68);
      if (below && this.board[y + 1][x] === value && below.alpha >= .99 && below.offsetRows === 0 && !below.recolor) ctx.fillRect(l.boardX + x * l.cell + l.cell * .16, l.boardY + (y + .5) * l.cell, l.cell * .68, l.cell);
    }
  }

  drawParticles(l) {
    const ctx = this.ctx;
    this.visual.particles.forEach((particle) => {
      ctx.save(); ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife); ctx.fillStyle = particle.color;
      ctx.beginPath(); ctx.arc(l.boardX + particle.x * l.cell, l.boardY + particle.y * l.cell, Math.max(2, l.cell * .08), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
  }

  drawEffectBanner(l) {
    const banner = this.visual.banner;
    if (!banner) return;
    const progress = Math.min(1, banner.elapsed / banner.duration);
    const enter = Math.min(1, progress / .18);
    const leave = progress > .78 ? 1 - (progress - .78) / .22 : 1;
    const scale = (.72 + enter * .34) * Math.max(.84, leave);
    const y = l.boardY + l.boardH * .42;
    this.ctx.save(); this.ctx.globalAlpha = Math.max(0, leave); this.ctx.translate(l.boardX + l.boardW / 2, y); this.ctx.scale(scale, scale);
    this.text(banner.text, 0, 0, Math.min(34, 19 + banner.chain * 3), banner.chain >= 3 ? '#ffd867' : '#fff', 'center', 900);
    if (banner.sub) this.text(banner.sub, 0, 29, 12, '#b8f34a', 'center', 800);
    this.ctx.restore();
  }


  drawChoice() { overlays.drawChoice(this); }
  drawBuild() { overlays.drawBuild(this); }


  drawLeaderboard() {
    this.text('本周挑战榜', this.w / 2, this.safe.top + 52, 25, '#fff', 'center', 800);
    const current = this.leaderboard.profile();
    this.text(current.optedIn ? '昵称：' + current.nickname : '设置昵称后自动上传挑战成绩', this.w / 2, this.safe.top + 82, 11, '#aaa2bb', 'center', 500);
    if (this.leaderboardStatus) this.text(this.leaderboardStatus, this.w / 2, this.safe.top + 112, 11, '#56dced', 'center', 600);
    const footer = Math.min(this.safe.bottom, this.h) - 116;
    const listTop = this.safe.top + 142;
    const rowHeight = Math.min(38, (footer - 16 - listTop) / 9);
    this.leaderboardEntries.slice(0, 10).forEach((entry, index) => {
      const y = listTop + index * rowHeight;
      this.text(String(index + 1), 28, y, 12, index < 3 ? '#b8f34a' : '#aaa2bb', 'left', 800);
      const score = String(entry.score || 0);
      this.ctx.font = '800 12px sans-serif';
      const scoreWidth = this.ctx.measureText(score).width;
      const nameWidth = Math.max(20, this.w - 24 - scoreWidth - 12 - 58);
      this.text(entry.playerName || entry.nickname || '月夜玩家', 58, y, 12, '#fff', 'left', 700, nameWidth);
      this.text(score, this.w - 24, y, 12, '#fff', 'right', 800);
    });
    this.button({ x: 24, y: footer, w: (this.w - 58) / 2, h: 44 }, '设置昵称', 'nickname', '#24526a', '#fff', 12);
    this.button({ x: 34 + (this.w - 58) / 2, y: footer, w: (this.w - 58) / 2, h: 44 }, '刷新', 'leaderboardRefresh', '#302847', '#fff', 12);
    this.button({ x: 24, y: footer + 54, w: this.w - 48, h: 44 }, '返回', 'menu', '#b8f34a', '#162017', 13);
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

  cellColor(value) {
    if (this.rules.isGarbage(value)) return '#c8c3d2';
    return COLORS[value - 1] || '#fff';
  }

  drawCell(value, x, y, radius, visualState) {
    const ctx = this.ctx;
    const state = visualState || { scaleX: 1, scaleY: 1, alpha: 1, flash: 0 };
    ctx.save();
    ctx.globalAlpha = state.alpha == null ? 1 : state.alpha;
    ctx.translate(x, y);
    ctx.scale(state.scaleX || 1, state.scaleY || 1);
    if (this.rules.isGarbage(value)) {
      ctx.fillStyle = value === 7 ? '#b9dce7' : '#aaa5b6';
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = value === 7 ? '#effcff' : '#575161'; ctx.lineWidth = value === 7 ? 3 : 1.5; ctx.stroke();
      if (value === 8) { ctx.beginPath(); ctx.moveTo(2, -radius * .75); ctx.lineTo(-3, -2); ctx.lineTo(4, radius * .7); ctx.stroke(); }
      ctx.fillStyle = '#4d4758'; ctx.beginPath(); ctx.arc(-radius * .23, 0, radius * .1, 0, Math.PI * 2); ctx.arc(radius * .23, 0, radius * .1, 0, Math.PI * 2); ctx.fill();
      if (state.flash) { ctx.globalAlpha *= state.flash * .72; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, radius * 1.05, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      return;
    }
    ctx.fillStyle = COLORS[value - 1]; ctx.beginPath(); ctx.ellipse(0, 0, radius, radius * .93, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = DARKS[value - 1]; ctx.lineWidth = Math.max(1, radius * .07); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.24)'; ctx.beginPath(); ctx.ellipse(-radius * .3, -radius * .34, radius * .28, radius * .16, -.55, 0, Math.PI * 2); ctx.fill();
    if (radius >= 8) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-radius * .17, 0, radius * .16, radius * .21, 0, 0, Math.PI * 2); ctx.ellipse(radius * .17, 0, radius * .16, radius * .21, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#322742'; ctx.beginPath(); ctx.arc(-radius * .13, 1, radius * .07, 0, Math.PI * 2); ctx.arc(radius * .21, 1, radius * .07, 0, Math.PI * 2); ctx.fill();
    }
    if (state.flash) { ctx.globalAlpha *= state.flash * .72; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.05, radius, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
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

  text(value, x, y, size, color, align, weight, maxWidth) {
    const ctx = this.ctx; ctx.fillStyle = color || '#fff'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.font = (weight || 600) + ' ' + size + 'px sans-serif';
    let label = String(value);
    if (maxWidth && ctx.measureText(label).width > maxWidth) {
      const chars = Array.from(label);
      while (chars.length && ctx.measureText(chars.join('') + '…').width > maxWidth) chars.pop();
      label = chars.join('') + '…';
    }
    ctx.fillText(label, x, y);
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
    if (this.mode === 'lobby' || this.mode === 'build') {
      this.pointer = { startX: point.x, startY: point.y, lastY: point.y, moved: false };
      return;
    }
    const button = this.buttons.slice().reverse().find((item) => inside(point, item.box));
    if (!button) return;
    this.perform(button.action);
    if (['left', 'right', 'down'].includes(button.action) && this.mode === 'playing') this.hold = { action: button.action, elapsed: 0, next: button.action === 'down' ? window.PuyoInput.TIMINGS.downDas : window.PuyoInput.TIMINGS.horizontalDas };
  }
  touchMove(event) {
    if (!['lobby', 'build'].includes(this.mode) || !this.pointer) return;
    const touch = event.touches && event.touches[0]; if (!touch) return;
    const dy = touch.clientY - this.pointer.lastY;
    if (Math.abs(touch.clientY - this.pointer.startY) > 7) this.pointer.moved = true;
    this.pointer.lastY = touch.clientY;
    if (this.mode === 'build') this.buildScroll = clamp((this.buildScroll || 0) - dy, 0, this.buildMaxScroll || 0);
    else this.lobbyScroll = clamp(this.lobbyScroll - dy, 0, this.lobbyMaxScroll);
  }

  touchEnd(event) {
    this.hold = null;
    if (!['lobby', 'build'].includes(this.mode) || !this.pointer) return;
    const changed = event && event.changedTouches && event.changedTouches[0];
    const point = changed ? { x: changed.clientX, y: changed.clientY } : { x: this.pointer.startX, y: this.pointer.startY };
    const moved = this.pointer.moved;
    this.pointer = null;
    if (moved) return;
    const button = this.buttons.slice().reverse().find((item) => inside(point, item.box));
    if (button) this.perform(button.action);
  }

  perform(action) {
    if (action === 'openPuyo') { this.mode = 'menu'; return; }
    if (action === 'lobby') { this.controller.pause(); this.save(); this.mode = 'lobby'; this.audio.pause(); this.hold = null; return; }
    if (action === 'startChallenge') return this.newGame('challenge');
    if (action === 'startClassic') return this.newGame('classic');
    if (action === 'restore') return this.restore();
    if (action === 'left') return this.move(-1, 0);
    if (action === 'right') return this.move(1, 0);
    if (action === 'down') return this.move(0, 1);
    if (action === 'ccw') return this.rotate(-1);
    if (action === 'cw') return this.rotate(1);
    if (action === 'drop') return this.hardDrop();
    if (action === 'pause') return this.controller.pause();
    if (action === 'resume') return this.controller.resume();
    if (action === 'restart') return this.newGame(this.gameType);
    if (action === 'menu') { this.controller.pause(); this.save(); this.hold = null; this.mode = 'menu'; return; }
    if (action === 'leaderboard') return this.loadLeaderboard();
    if (action === 'leaderboardRefresh') return this.loadLeaderboard();
    if (action === 'nickname') return this.editNickname();
    if (action === 'sound') {
      this.audioReturnMode = this.mode; this.hold = null;
      if (['playing', 'resolving'].includes(this.mode)) this.controller.pause();
      this.mode = 'audio'; return;
    }
    if (action === 'closeAudio') { if (['playing', 'resolving'].includes(this.audioReturnMode)) this.controller.resume(); else this.mode = this.audioReturnMode || 'lobby'; return; }
    if (action === 'toggleSound') { this.audio.toggle(); return; }
    if (action === 'musicVolume') { this.audio.cycle('music'); return; }
    if (action === 'sfxVolume') { this.audio.cycle('sfx'); return; }
    if (action === 'vibration') { this.audio.toggleVibration(); return; }
    if (action === 'previewSound') { this.audio.play('chain', 3); return; }
    if (action === 'retryAudio') { this.audio.retry(); return; }
    if (action === 'bottle') {
      if (this.mode === 'playing') this.controller.dispatch({ type: 'toggleBottle' });
      return;
    }
    if (action === 'swapNext') return this.controller.dispatch({ type: 'swapNext' });
    if (action === 'build') { this.buildReturnMode = this.mode; this.hold = null; if (this.mode === 'playing') this.controller.pause(); this.mode = 'build'; return; }
    if (action === 'closeBuild') { if (this.buildReturnMode === 'playing') this.controller.resume(); else this.mode = this.buildReturnMode || 'paused'; return; }
    if (action === 'mission') { this.missionReturnMode = this.mode; this.hold = null; if (['playing', 'resolving'].includes(this.mode)) this.controller.pause(); this.mode = 'mission'; return; }
    if (action === 'closeMission') { if (['playing', 'resolving'].includes(this.missionReturnMode)) this.controller.resume(); else this.mode = this.missionReturnMode || 'paused'; return; }
    if (action === 'contractYes') return this.chooseContract(true);
    if (action === 'contractNo') return this.chooseContract(false);
    if (action.startsWith('choice:')) return this.choose(action.slice(7));
  }
}

module.exports = PuyoGame;
