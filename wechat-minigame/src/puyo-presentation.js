'use strict';

const amount = (value) => Math.max(0, Math.floor(Number(value) || 0)) > 99 ? '99+' : String(Math.max(0, Math.floor(Number(value) || 0)));

function mission(game) {
  const state = game.challenge;
  const task = state.mission;
  const stats = game.turnStats || {};
  const preview = stats.missionBaseProgress == null ? task : Object.assign({}, task, { progress: stats.missionBaseProgress });
  const progress = game.mode === 'resolving' || stats.missionBaseProgress != null ? game.rules.missionProgress(preview, stats) : task.progress;
  const text = game.rules.missionPresentation(task, progress);
  const deferred = state.deferredGarbage || 0;
  const pending = state.pendingGarbage || 0;
  const nearest = deferred || pending;
  const eta = deferred ? state.deferredIn : state.pressureIn;
  const contract = game.build.contract;
  return {
    stage: state.stage, title: task.title, scope: text.scope, progress: text.progress,
    ratio: Math.max(0, Math.min(1, (Number(progress) || 0) / Math.max(1, task.target))),
    deadline: '还可放 ' + state.turnsLeft + ' 组', urgent: state.turnsLeft <= 2,
    garbage: '待落 ×' + amount(nearest), eta: nearest ? (deferred ? '近期 · ' : '') + eta + ' 组后落下' : '暂无待落干扰',
    later: deferred && pending ? '后续 ×' + amount(pending) + ' · ' + state.pressureIn + ' 组后' : '',
    imminent: nearest > 0 && eta <= 2,
    special: state.special ? state.special.title : '',
    contract: contract && contract.status === 'active' && contract.stage === state.stage ? '超载契约生效 · 完成阶段额外选一次强化' : '',
  };
}

function synergy(card, rogue) {
  const owned = card.ownedSynergies || [];
  const names = owned.length ? owned : (card.synergies || []).map((id) => rogue.BY_ID[id] && rogue.BY_ID[id].name).filter(Boolean);
  return names.length ? (owned.length ? '已联动 · ' : '可联动 · ') + names.join(' / ') : '';
}

function choiceCards(game) {
  const relic = game.choiceKind === 'relic';
  const ids = relic ? game.build.pendingRelicChoice : game.build.pendingChoice;
  return ids.map((id) => relic ? game.rogue.relicCardFor(game.build, id) : game.rogue.cardFor(game.build, id)).filter(Boolean).map((card) => Object.assign({}, card, {
    levelText: relic ? '唯一遗物' : card.currentLevel ? '升级至 ' + card.nextLevel + ' 级' : '获得 1 级',
    synergyText: synergy(card, game.rogue),
  }));
}

function rewardTitle(game) {
  if (game.choiceKind === 'relic') return '特殊遗物 · 唯一遗物';
  return ({ special: '特殊奖励 · 稀有保底', specialBonus: '特殊奖励 · 遗物集齐补偿', contract: '契约奖励 · 额外强化' })[game.build.pendingKind] || '阶段奖励';
}

function buildCards(game) {
  const entries = game.rogue.DEFINITIONS.filter((item) => game.rogue.levelOf(game.build, item.id) > 0).map((item) => {
    const level = game.rogue.levelOf(game.build, item.id);
    const card = game.rogue.cardFor(game.build, item.id);
    return { id: item.id, title: item.name + ' · ' + level + ' 级', school: card.schoolName, effect: item.effects[level - 1], status: game.rogue.statusFor(game.build, item.id), synergy: synergy(card, game.rogue) };
  });
  return game.build.relics.map((id) => {
    const card = game.rogue.relicCardFor(game.build, id);
    return { id, title: card.name + ' · 唯一遗物', school: card.schoolName, effect: card.effect, status: '', synergy: synergy(card, game.rogue) };
  }).concat(entries);
}

function resultRows(game) {
  return [
    ['SCORE', game.score], ['LEVEL', game.level], ['本局最高连锁', game.maxChain],
    ['历史最高连锁', game.bestChain || game.maxChain], ['消除数量', game.cleared + ' 颗'], ['全消次数', (game.allClearCount || 0) + ' 次'],
  ].concat(game.gameType === 'challenge' ? [['完成任务', game.challenge.completed], ['清除干扰', game.challenge.garbageCleared + ' 颗']] : []);
}

module.exports = { amount, mission, synergy, choiceCards, rewardTitle, buildCards, resultRows };
