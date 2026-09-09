(function (global) {
  'use strict';

  const VERSION = 2;
  const MAX_LEVEL = 3;
  const DEFINITIONS = Object.freeze([
    { id: 'chainShield', name: '连锁护盾', school: '连锁', rarity: 'common', effects: ['额外抵消 1 颗干扰', '额外抵消 2 颗干扰', '额外抵消 3 颗干扰'] },
    { id: 'chainEcho', name: '连锁回响', school: '连锁', rarity: 'common', effects: ['3 CHAIN 得分 +15%', '3 CHAIN 得分 +30%', '3 CHAIN 得分 +50%'] },
    { id: 'colorBurst', name: '彩色爆破', school: '消除', rarity: 'rare', effects: ['7 颗同消额外爆破 1 颗干扰', '6 颗同消额外爆破 1 颗干扰', '5 颗同消额外爆破 1 颗干扰'] },
    { id: 'largeGroup', name: '大团奖励', school: '消除', rarity: 'common', effects: ['9 颗同消抵消 2 颗', '8 颗同消抵消 2 颗', '7 颗同消抵消 2 颗'] },
    { id: 'cleaner', name: '清道夫', school: '防御', rarity: 'common', effects: ['额外清除 1 颗干扰', '额外清除 2 颗干扰', '额外清除 3 颗干扰'] },
    { id: 'buffer', name: '缓冲层', school: '防御', rarity: 'rare', effects: ['每个 Stage 首次干扰 -1', '每个 Stage 首次干扰 -2', '每个 Stage 首次干扰 -3'] },
    { id: 'steadyHands', name: '从容落子', school: '操作', rarity: 'common', effects: ['锁定时间 +10%', '锁定时间 +20%', '锁定时间 +30%'] },
    { id: 'foresight', name: '预知', school: '操作', rarity: 'rare', effects: ['NEXT 对比更清晰', '标记下一组同色', '显示第 3 组 NEXT'] },
  ]);
  const BY_ID = Object.freeze(Object.fromEntries(DEFINITIONS.map((item) => [item.id, item])));

  function boundedInt(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
  }

  function normalize(source, completed) {
    const saved = source && typeof source === 'object' ? source : null;
    const upgrades = {};
    if (saved && saved.upgrades && typeof saved.upgrades === 'object') {
      Object.keys(saved.upgrades).forEach((id) => {
        if (BY_ID[id]) upgrades[id] = boundedInt(saved.upgrades[id], 0, 0, MAX_LEVEL);
      });
    }
    const pendingChoice = saved && Array.isArray(saved.pendingChoice)
      ? Array.from(new Set(saved.pendingChoice.filter((id) => BY_ID[id] && (upgrades[id] || 0) < MAX_LEVEL)).values()).slice(0, 3)
      : [];
    return {
      version: VERSION,
      picks: saved ? boundedInt(saved.picks, 0, 0, 999999) : Math.floor(Math.max(0, Number(completed) || 0) / 3),
      upgrades,
      pendingChoice,
      bufferedStage: saved ? boundedInt(saved.bufferedStage, 0, 0, 999999) : 0,
    };
  }

  function levelOf(state, id) {
    return boundedInt(state && state.upgrades && state.upgrades[id], 0, 0, MAX_LEVEL);
  }

  function modifiers(source) {
    const state = normalize(source, 0);
    const shield = levelOf(state, 'chainShield');
    const echo = levelOf(state, 'chainEcho');
    const burst = levelOf(state, 'colorBurst');
    const group = levelOf(state, 'largeGroup');
    const cleaner = levelOf(state, 'cleaner');
    const buffer = levelOf(state, 'buffer');
    const steady = levelOf(state, 'steadyHands');
    const foresight = levelOf(state, 'foresight');
    return {
      chainDefense: shield,
      chainScoreMultiplier: [1, 1.15, 1.3, 1.5][echo],
      colorBurstThreshold: burst ? [0, 7, 6, 5][burst] : 0,
      colorBurstClear: burst ? 1 : 0,
      largeGroupThreshold: group ? [0, 9, 8, 7][group] : 0,
      largeGroupDefense: group ? 2 : 0,
      cleanerClear: cleaner,
      bufferReduction: buffer,
      lockDelayMultiplier: [1, 1.1, 1.2, 1.3][steady],
      foresightLevel: foresight,
    };
  }

  function choicesFor(state, random) {
    const rng = typeof random === 'function' ? random : Math.random;
    const pool = DEFINITIONS.filter((item) => (state.upgrades[item.id] || 0) < MAX_LEVEL).slice();
    const choices = [];
    while (pool.length && choices.length < 3) {
      const index = Math.floor(rng() * pool.length) % pool.length;
      choices.push(pool.splice(index, 1)[0].id);
    }
    return choices;
  }

  function offer(source, completed, random) {
    const state = normalize(source, completed);
    if (state.pendingChoice.length) return state;
    const earned = Math.floor(Math.max(0, Number(completed) || 0) / 3);
    if (state.picks >= earned) return state;
    state.pendingChoice = choicesFor(state, random);
    return state;
  }

  function choose(source, id, completed) {
    const state = normalize(source, completed);
    if (!state.pendingChoice.includes(id) || !BY_ID[id]) return { state, selected: null };
    state.upgrades[id] = Math.min(MAX_LEVEL, (state.upgrades[id] || 0) + 1);
    state.picks++;
    state.pendingChoice = [];
    return { state, selected: BY_ID[id] };
  }

  function cardFor(state, id) {
    const item = BY_ID[id];
    if (!item) return null;
    const current = state.upgrades[id] || 0;
    const next = Math.min(MAX_LEVEL, current + 1);
    return Object.assign({}, item, { currentLevel: current, nextLevel: next, effect: item.effects[next - 1] });
  }

  global.PuyoRogueliteRules = Object.freeze({ VERSION, MAX_LEVEL, DEFINITIONS, BY_ID, normalize, modifiers, choicesFor, offer, choose, cardFor });
})(window);
