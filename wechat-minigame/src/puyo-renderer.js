'use strict';

const uiFactory = require('./canvas-ui.js');
const presentation = require('./puyo-presentation.js');
const ROWS = 12;
const COLS = 6;

function layout(game) {
  const top = Math.max(game.safe.top + 8, 18);
  const bottom = Math.min(game.safe.bottom, game.h) - 10;
  const headerH = 58;
  const controlsH = 58;
  const controlGap = game.gameType === 'challenge' ? 52 : 24;
  const usable = bottom - top - headerH - controlsH - controlGap;
  const sideW = game.w < 370 ? 92 : 108;
  const gap = 10;
  const cell = Math.floor(Math.min((game.w - 28 - sideW - gap) / COLS, usable / ROWS, 42));
  const boardW = cell * COLS;
  const controlsY = bottom - controlsH;
  const boardY = top + headerH + Math.max(0, Math.floor((controlsY - controlGap - top - headerH - cell * ROWS) / 2));
  return { top, bottom, cell, boardX: 14, boardY, boardW, boardH: cell * ROWS, sideX: 14 + boardW + gap, sideW, controlsY };
}

function stat(ui, box, label, value) {
  ui.panel(box, { radius: 11, fill: 'rgba(255,255,255,.055)' });
  if (box.h < 32) {
    ui.text(label, box.x + 7, box.y + box.h / 2, 8, ui.theme.soft, 'left', 600);
    ui.text(String(value), box.x + box.w - 7, box.y + box.h / 2, 13, ui.theme.text, 'right', 800, box.w * .5);
    return;
  }
  ui.text(label, box.x + 8, box.y + 12, 8, ui.theme.soft, 'left', 600);
  ui.text(String(value), box.x + box.w - 8, box.y + box.h - 13, 15, ui.theme.text, 'right', 800, box.w - 16);
}

function drawHeader(game, ui, l) {
  const back = { x: 14, y: l.top + 4, w: 40, h: 40 };
  ui.button(back, '←', { size: 20, radius: 13 }); game.buttons.push({ box: back, action: 'menu' });
  ui.text('噗呦噗呦', 66, l.top + 15, 25, ui.theme.text, 'left', 800);
  ui.text('PUYO · 果冻连锁挑战', 66, l.top + 38, 9, ui.theme.soft, 'left', 700);
  const pause = { x: game.w - 54, y: l.top + 4, w: 40, h: 40 };
  ui.button(pause, 'Ⅱ', { size: 12, radius: 13 }); game.buttons.push({ box: pause, action: 'pause' });
  const sound = { x: game.w - 100, y: l.top + 4, w: 40, h: 40 };
  ui.button(sound, game.audio && game.audio.isMuted() ? '静' : '声', { size: 11, radius: 13 }); game.buttons.push({ box: sound, action: 'sound' });
}

function drawBoard(game, ui, l) {
  const ctx = game.ctx;
  const gradient = ctx.createLinearGradient(0, l.boardY, 0, l.boardY + l.boardH);
  gradient.addColorStop(0, '#272043'); gradient.addColorStop(1, '#19162f');
  ui.roundRect(l.boardX, l.boardY, l.boardW, l.boardH, 20, gradient, 'rgba(255,255,255,.16)', 1.2);
  // The web board has its own canvas. On the shared screen canvas, explicitly
  // clip falling pieces to the same rounded board boundary.
  ctx.save(); ctx.clip();
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(l.boardX + x * l.cell, l.boardY); ctx.lineTo(l.boardX + x * l.cell, l.boardY + l.boardH); ctx.stroke(); }
  for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(l.boardX, l.boardY + y * l.cell); ctx.lineTo(l.boardX + l.boardW, l.boardY + y * l.cell); ctx.stroke(); }
  ctx.restore();
  game.drawConnections(l);
  (game.ghostCells || []).forEach((cell) => {
    if (cell.y >= 0 && !game.board[cell.y][cell.x]) game.drawCell(cell.color, l.boardX + (cell.x + .5) * l.cell, l.boardY + (cell.y + .5) * l.cell, l.cell * .42, { alpha: .17, scaleX: 1, scaleY: 1 });
  });
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const value = game.board[y][x]; if (!value) continue;
    const state = game.visual.cellState(x, y);
    const shown = state.recolor && state.recolor.progress < .52 ? state.recolor.source : value;
    game.drawCell(shown, l.boardX + (x + .5) * l.cell, l.boardY + (y + .5 + state.offsetRows) * l.cell, l.cell * .42, state);
  }
  if (game.pair) game.boardRules.pairCells(game.pair, game.pair.x, game.pair.y, game.pair.rot).forEach((cell) => {
    if (cell.y >= 0) game.drawCell(cell.color, l.boardX + (cell.x + .5) * l.cell, l.boardY + (cell.y + .5) * l.cell, l.cell * .42);
  });
  (game.visual.remoteLinks || []).forEach((link) => {
    const progress = Math.min(1, link.elapsed / link.duration);
    const x1 = l.boardX + (link.from[0] + .5) * l.cell;
    const y1 = l.boardY + (link.from[1] + .5) * l.cell;
    const x2 = l.boardX + (link.to[0] + .5) * l.cell;
    const y2 = l.boardY + (link.to[1] + .5) * l.cell;
    ctx.save(); ctx.globalAlpha = Math.sin(progress * Math.PI) * .9;
    ctx.strokeStyle = '#ffd867'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.fillStyle = '#fff3a5'; ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress, l.cell * .11, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });
  game.drawParticles(l);
  ctx.restore();
}

function drawSide(game, ui, l) {
  const gap = 5; const cardH = game.h < 620 ? 20 : game.h < 740 ? 24 : 32;
  [['得分',game.score],['最高',Math.max(game.best,game.score)],['等级',game.level],['最高连锁',game.maxChain]].forEach((entry,index)=>{
    stat(ui, { x:l.sideX, y:l.boardY+index*(cardH+gap), w:l.sideW, h:cardH }, entry[0], entry[1]);
  });
  const nextY = l.boardY + 4 * (cardH + gap) + 3;
  ui.panel({ x: l.sideX, y: nextY, w: l.sideW, h: 106 }, { radius: 14, fill: 'rgba(22,25,42,.78)', stroke: 'rgba(184,243,74,.28)' });
  const foresight = game.rogue.levelOf(game.build, 'foresight');
  ui.text(foresight >= 3 ? 'NEXT 1 · 2 · 3' : 'NEXT 1 · 2', l.sideX + l.sideW / 2, nextY + 15, 9, ui.theme.lime, 'center', 800);
  game.queue.slice(0, foresight >= 3 ? 3 : 2).forEach((pair, index) => {
    const centers = foresight >= 3 ? [.2, .5, .8] : [.34, .73];
    const radius = foresight >= 3 ? (index ? 10 : 12) : (index ? 11 : 15);
    const x = l.sideX + l.sideW * centers[index];
    game.drawCell(pair[1], x, nextY + 43, radius);
    game.drawCell(pair[0], x, nextY + 43 + radius * 2, radius);
  });
  const swap = game.rogue.swapStatus(game.build, game.challenge.stage);
  if (swap.available) {
    const box = { x: l.sideX + 5, y: nextY + 83, w: l.sideW - 10, h: 20 };
    ui.button(box, '交换 ' + swap.remaining + '/' + swap.available, { size: 9, fill: 'rgba(36,72,85,.95)' });
    game.buttons.push({ box, action: 'swapNext' });
  }
  if (game.gameType === 'challenge') drawChallenge(game, ui, l, nextY + 114);
}

function drawChallenge(game, ui, l, y) {
  const h = Math.min(240, l.boardY + l.boardH - y);
  const task = presentation.mission(game);
  const defense = !!game.visual.defense;
  const complete = !!game.visual.stagePulse;
  const box = { x: l.sideX, y, w: l.sideW, h };
  ui.panel(box, { radius: 14, fill: defense ? 'rgba(25,65,71,.9)' : 'rgba(45,24,48,.76)', stroke: defense ? ui.theme.cyan : complete ? ui.theme.lime : task.imminent ? ui.theme.pink : 'rgba(255,111,174,.38)' });
  ui.text('阶段 ' + task.stage + '  ›', l.sideX + 9, y + 14, 10, ui.theme.pink, 'left', 800);
  if (h < 148) {
    ui.wrap(task.title, l.sideX + 9, y + 34, l.sideW - 18, 10, ui.theme.text, 'left', h >= 100 ? 2 : 1);
    ui.text(task.garbage, l.sideX + 9, y + h - 30, 9, task.imminent ? ui.theme.pink : ui.theme.soft, 'left', 700, l.sideW - 18);
    ui.text('任务详情 ›', l.sideX + 9, y + h - 12, 8, ui.theme.cyan, 'left', 600);
    game.buttons.push({ box, action: 'mission' });
    return;
  }
  ui.text(task.special || task.scope, l.sideX + 9, y + 30, 9, task.special ? ui.theme.gold : ui.theme.cyan, 'left', 700, l.sideW - 18);
  ui.wrap(task.title, l.sideX + 9, y + 48, l.sideW - 18, 10, ui.theme.text, 'left', 2);
  ui.wrap(task.progress, l.sideX + 9, y + 79, l.sideW - 18, 8, ui.theme.soft, 'left', 2);
  ui.roundRect(l.sideX + 9, y + 103, l.sideW - 18, 4, 2, 'rgba(255,255,255,.1)');
  if (task.ratio > 0) ui.roundRect(l.sideX + 9, y + 103, (l.sideW - 18) * task.ratio, 4, 2, ui.theme.lime);
  ui.text(task.deadline, l.sideX + 9, y + 121, 9, task.urgent ? ui.theme.pink : ui.theme.soft, 'left', 700);
  ui.text(task.garbage, l.sideX + 9, y + 140, 10, task.imminent ? ui.theme.pink : ui.theme.text, 'left', 700);
  if (h >= 165) ui.text(task.eta, l.sideX + 9, y + 156, 8, ui.theme.soft, 'left', 600, l.sideW - 18);
  if (h >= 185 && task.later) ui.text(task.later, l.sideX + 9, y + 173, 8, ui.theme.soft, 'left', 600, l.sideW - 18);
  if (h >= 205) ui.text(defense ? '防御生效！' : task.contract ? '超载契约生效' : '点击查看任务详情', l.sideX + 9, y + h - 14, 8, defense ? ui.theme.cyan : ui.theme.soft, 'left', 600, l.sideW - 18);
  game.buttons.push({ box, action: 'mission' });
}

function drawControls(game, ui, l) {
  if (game.gameType === 'challenge') {
    const count = game.items.count(game.itemState, game.items.MIX_BOTTLE);
    const armed = game.itemState.armedItem === game.items.MIX_BOTTLE;
    const utilityY = l.controlsY - 38;
    const width = (game.w - 26) / 2;
    const bottle = { x: 10, y: utilityY, w: width, h: 30 };
    const build = { x: 16 + width, y: utilityY, w: width, h: 30 };
    ui.button(bottle, armed ? '混色瓶已装备 · 点击取消' : '使用混色瓶 ×' + count, { size: 10, fill: armed ? 'rgba(86,220,237,.28)' : 'rgba(36,72,85,.9)', color: count ? ui.theme.cyan : ui.theme.soft });
    const total = Object.values(game.build.upgrades).filter((level) => level > 0).length + game.build.relics.length;
    const triggers = game.visual.triggers || [];
    ui.button(build, triggers.length ? triggers[triggers.length - 1].name + ' · 已触发！' : '本局强化 ' + total + ' · 查看效果 ›', { size: 10, color: triggers.length ? ui.theme.lime : ui.theme.cyan, stroke: triggers.length ? ui.theme.lime : ui.theme.line });
    game.buttons.push({ box: bottle, action: 'bottle' }, { box: build, action: 'build' });
  }
  const labels = ['左', '右', '逆转', '顺转', '下落', '落底'];
  const actions = ['left', 'right', 'ccw', 'cw', 'down', 'drop'];
  const gap = 6; const x = 10; const bw = (game.w - x * 2 - gap * 5) / 6;
  labels.forEach((label, i) => {
    const box = { x: x + i * (bw + gap), y: l.controlsY + 4, w: bw, h: 50 };
    const held = game.hold && game.hold.action === actions[i];
    ui.button(box, label, { size: 11, radius: 13, fill: i === 5 ? ui.theme.lime : held ? 'rgba(86,220,237,.22)' : 'rgba(48,40,71,.94)', color: i === 5 ? ui.theme.ink : ui.theme.text, stroke: i === 5 ? ui.theme.lime : held ? ui.theme.cyan : ui.theme.line });
    game.buttons.push({ box, action: actions[i] });
  });
}

function drawGame(game) {
  const ui = uiFactory.create(game.ctx); const l = layout(game); const offset = game.visual.boardOffset();
  drawHeader(game, ui, l);
  game.ctx.save(); game.ctx.translate(offset.x, offset.y); drawBoard(game, ui, l); game.ctx.restore();
  drawSide(game, ui, l); drawControls(game, ui, l);
  if (Date.now() < game.messageUntil) {
    ui.panel({ x: l.boardX + 18, y: l.boardY + l.boardH * .37, w: l.boardW - 36, h: 62 }, { fill: 'rgba(20,15,40,.94)', stroke: 'rgba(184,243,74,.38)' });
    game.message.split('\n').slice(0, 2).forEach((line, i) => ui.text(line, l.boardX + l.boardW / 2, l.boardY + l.boardH * .37 + 24 + i * 20, i ? 10 : 15, i ? ui.theme.soft : ui.theme.text, 'center', 800));
  }
  const notice = game.visual.notice;
  if (notice) {
    const y = l.boardY - (l.top + 58) >= 54 ? l.boardY - 54 : l.boardY + 8;
    ui.panel({ x: l.boardX + 6, y, w: l.boardW - 12, h: 48 }, { fill: 'rgba(24,18,43,.96)', stroke: notice.complete ? ui.theme.lime : ui.theme.line, radius: 10 });
    notice.text.split('\n').slice(0, 2).forEach((line, index) => ui.text(line, l.boardX + l.boardW / 2, y + 16 + index * 18, 10, index ? ui.theme.soft : ui.theme.text, 'center', 700, l.boardW - 26));
  }
  game.drawEffectBanner(l);
  return l;
}

module.exports = { layout, drawGame };
