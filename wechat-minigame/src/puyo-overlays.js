'use strict';

const createUI = require('./canvas-ui.js').create;
const presentation = require('./puyo-presentation.js');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function drawChoice(game) {
  if (game.choiceKind === 'contract') return game.drawDialog('超载契约', '增加 2 颗近期干扰；完成阶段后额外选择一次强化。可以跳过。', [{ label: '接受契约', action: 'contractYes' }, { label: '跳过', action: 'contractNo' }]);
  const ui = createUI(game.ctx);
  const cards = presentation.choiceCards(game);
  const gap = 10;
  const safeBottom = Math.min(game.safe.bottom, game.h);
  const available = safeBottom - game.safe.top - 40;
  const header = 102;
  const height = Math.min(128, Math.floor((available - header - 16 - gap * Math.max(0, cards.length - 1)) / Math.max(1, cards.length)));
  const panelHeight = header + 16 + cards.length * height + gap * Math.max(0, cards.length - 1);
  const panelY = game.safe.top + (safeBottom - game.safe.top - panelHeight) / 2;
  const top = panelY + 23;
  ui.panel({ x: 18, y: panelY, w: game.w - 36, h: panelHeight }, { fill: '#211b3b' });
  ui.text(presentation.rewardTitle(game), game.w / 2, top, 11, ui.theme.lime, 'center', 700);
  ui.text(game.choiceKind === 'relic' ? '选择特殊遗物' : '选择一项强化', game.w / 2, top + 28, 22, ui.theme.text, 'center', 800);
  ui.text('点击任一卡片选择 · 本局生效', game.w / 2, top + 53, 10, ui.theme.soft, 'center');
  cards.forEach((card, index) => {
    const box = { x: 30, y: panelY + header + index * (height + gap), w: game.w - 60, h: height };
    const color = card.rarity === 'relic' ? ui.theme.gold : card.recommended ? ui.theme.cyan : ui.theme.soft;
    ui.panel(box, { fill: '#2a2444', stroke: card.recommended ? 'rgba(86,220,237,.55)' : ui.theme.line, radius: 14 });
    ui.text(card.schoolName + (card.rarity === 'rare' ? ' · 稀有' : ''), box.x + 12, box.y + 17, 10, color, 'left', 700);
    ui.text(card.levelText, box.x + box.w - 12, box.y + 17, 10, ui.theme.lime, 'right', 700);
    ui.text(card.name, box.x + 12, box.y + 38, 16, ui.theme.text, 'left', 800);
    ui.wrap(card.effect, box.x + 12, box.y + 59, box.w - 24, 11, ui.theme.text, 'left', 2);
    ui.wrap(card.synergyText, box.x + 12, box.y + height - (card.recommended ? 28 : 17), box.w - 24, 9, card.ownedSynergies.length ? ui.theme.cyan : ui.theme.soft, 'left', 1);
    if (card.recommended) ui.text(card.recommendationReason, box.x + 12, box.y + height - 12, 9, ui.theme.cyan, 'left', 600, box.w - 24);
    game.buttons.push({ box, action: 'choice:' + card.id });
  });
}

function drawBuild(game) {
  const ui = createUI(game.ctx);
  const entries = presentation.buildCards(game);
  const availableTop = game.safe.top + 24;
  const availableBottom = Math.min(game.safe.bottom, game.h) - 20;
  const panelHeight = Math.min(availableBottom - availableTop, entries.length ? 166 + entries.length * 132 : 300);
  const panelY = availableTop + (availableBottom - availableTop - panelHeight) / 2;
  const top = panelY + 30;
  const buttonY = panelY + panelHeight - 56;
  ui.panel({ x: 18, y: panelY, w: game.w - 36, h: panelHeight }, { fill: '#211b3b', stroke: 'rgba(86,220,237,.3)' });
  ui.text('本局强化', game.w / 2, top, 23, ui.theme.text, 'center', 800);
  const profile = game.rogue.buildProfile(game.build);
  ui.text(!entries.length ? '尚未获得强化' : profile.primary ? profile.primary.name + '构筑' : '混合构筑', game.w / 2, top + 29, 11, ui.theme.cyan, 'center');
  const entryHeight = 132;
  const viewport = buttonY - 16 - (top + 51);
  game.buildMaxScroll = Math.max(0, entries.length * entryHeight - viewport);
  game.buildScroll = clamp(game.buildScroll || 0, 0, game.buildMaxScroll);
  game.ctx.save(); game.ctx.beginPath(); game.ctx.rect(28, top + 51, game.w - 56, viewport); game.ctx.clip();
  entries.forEach((entry, index) => {
    const y = top + 67 + index * entryHeight - game.buildScroll;
    ui.text(entry.school + ' · ' + entry.title, 34, y, 13, ui.theme.text, 'left', 800, game.w - 68);
    ui.wrap(entry.effect, 34, y + 25, game.w - 68, 11, ui.theme.text, 'left', 2);
    if (entry.status) ui.wrap('当前：' + entry.status, 34, y + 61, game.w - 68, 10, ui.theme.gold, 'left', 1);
    ui.wrap(entry.synergy, 34, y + 82, game.w - 68, 10, ui.theme.cyan, 'left', 2);
  });
  if (!entries.length) ui.wrap('完成阶段后选择强化，已选能力和遗物会显示在这里。', 38, top + 90, game.w - 76, 13, ui.theme.soft);
  game.ctx.restore();
  game.button({ x: 32, y: buttonY, w: game.w - 64, h: 40 }, '返回对局', 'closeBuild', ui.theme.lime, ui.theme.ink);
}

function drawMission(game) {
  const ui = createUI(game.ctx);
  const task = presentation.mission(game);
  const safeBottom = Math.min(game.safe.bottom, game.h);
  const availableHeight = safeBottom - game.safe.top;
  const height = Math.min(480, availableHeight - 48);
  const top = game.safe.top + (availableHeight - height) / 2;
  ui.panel({ x: 20, y: top, w: game.w - 40, h: height }, { fill: '#211b3b', stroke: 'rgba(255,111,174,.4)' });
  ui.text('阶段 ' + task.stage + ' · 任务详情', game.w / 2, top + 32, 21, ui.theme.text, 'center', 800);
  const sections = [
    [task.special || task.scope, (task.special ? task.scope + '：' : '') + task.title], ['当前进度', task.progress + '\n' + task.deadline],
    ['干扰预告', task.garbage + ' · ' + task.eta + (task.later ? '\n' + task.later : '')],
    [task.contract ? '契约生效' : '任务说明', task.contract || '单回合目标需在一组噗呦落地引发的整次连锁中完成；累计任务可分多回合完成。'],
  ];
  const spacing = (height - 130) / sections.length;
  sections.forEach(([label, text], index) => {
    const y = top + 75 + index * spacing;
    ui.text(label, 38, y, 11, ui.theme.cyan, 'left', 800);
    const lines = String(text).split('\n');
    lines.forEach((line, i) => ui.wrap(line, 38, y + 21 + i * 17, game.w - 76, 11, ui.theme.text, 'left', lines.length > 1 ? 1 : 3));
  });
  game.button({ x: 36, y: top + height - 53, w: game.w - 72, h: 38 }, '返回对局', 'closeMission', ui.theme.lime, ui.theme.ink);
}

function drawGameOver(game) {
  const ui = createUI(game.ctx);
  const top = game.safe.top + 40;
  const height = Math.min(490, game.safe.bottom - top - 20);
  const result = game.result || {};
  ui.panel({ x: 22, y: top, w: game.w - 44, h: height }, { fill: '#211b3b' });
  ui.text('游戏结束', game.w / 2, top + 34, 25, ui.theme.text, 'center', 800);
  ui.text(game.gameType === 'challenge' ? '挑战模式' : '经典模式', game.w / 2, top + 64, 11, ui.theme.soft, 'center');
  const rows = presentation.resultRows(game);
  const rowCount = Math.ceil(rows.length / 2);
  const rowGap = Math.min(48, (height - 304) / Math.max(1, rowCount - 1));
  rows.forEach(([label, value], index) => {
    const x = 38 + index % 2 * (game.w - 76) / 2;
    const y = top + 101 + Math.floor(index / 2) * rowGap;
    ui.text(label, x, y, 10, ui.theme.soft, 'left');
    ui.text(String(value), x, y + 21, 18, ui.theme.text, 'left', 800);
  });
  const record = [result.newHighScore ? '最高分新纪录' : '', result.newBestChain ? '连锁新纪录' : ''].filter(Boolean).join(' / ');
  const noteY = top + height - 158;
  if (record) ui.text('新纪录！· ' + record, game.w / 2, noteY, 12, ui.theme.lime, 'center', 800, game.w - 72);
  if (game.gameType === 'challenge') ui.wrap(result.uploadStatus || '本地纪录已保存', 38, noteY + 25, game.w - 76, 10, ui.theme.soft, 'left', 2);
  game.button({ x: 38, y: top + height - 96, w: game.w - 76, h: 38 }, '再来一局', 'restart', ui.theme.lime, ui.theme.ink);
  game.button({ x: 38, y: top + height - 49, w: game.w - 76, h: 36 }, '返回游戏厅', 'lobby', '#302847', ui.theme.text);
}

function drawAudio(game) {
  const ui = createUI(game.ctx);
  const settings = game.audio.settings();
  const top = game.safe.top + 46;
  const height = Math.min(446, game.safe.bottom - top - 20);
  ui.panel({ x: 22, y: top, w: game.w - 44, h: height }, { fill: '#211b3b' });
  ui.text('声音与反馈', game.w / 2, top + 33, 23, ui.theme.text, 'center', 800);
  ui.text('点击音量切换档位，设置自动保存', game.w / 2, top + 63, 10, ui.theme.soft, 'center');
  const entries = [
    ['总声音 · ' + (settings.muted ? '已静音' : '已开启'), 'toggleSound'],
    ['背景音乐 · ' + settings.music + '%', 'musicVolume'],
    ['游戏音效 · ' + settings.sfx + '%', 'sfxVolume'],
    ['震动反馈 · ' + (settings.vibration ? '开启' : '关闭'), 'vibration'],
    [settings.error ? '音乐加载异常 · 点击重试' : '试听连锁音效', settings.error ? 'retryAudio' : 'previewSound'],
  ];
  const rowHeight = Math.min(47, (height - 135) / entries.length);
  entries.forEach(([label, action], index) => {
    const box = { x: 38, y: top + 86 + index * rowHeight, w: game.w - 76, h: rowHeight - 7 };
    ui.button(box, label, { size: 12, color: action === 'retryAudio' ? ui.theme.pink : ui.theme.text });
    game.buttons.push({ box, action });
  });
  game.button({ x: 38, y: top + height - 51, w: game.w - 76, h: 37 }, '完成', 'closeAudio', ui.theme.lime, ui.theme.ink);
}

module.exports = { drawChoice, drawBuild, drawMission, drawGameOver, drawAudio };
