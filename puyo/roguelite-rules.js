(function (global) {
  'use strict';

  const VERSION = 11;
  const MAX_LEVEL = 3;
  const SCHOOLS = Object.freeze({
    chain: Object.freeze({ id: 'chain', name: '连锁' }),
    group: Object.freeze({ id: 'group', name: '大团' }),
    multicolor: Object.freeze({ id: 'multicolor', name: '多色' }),
    planning: Object.freeze({ id: 'planning', name: '规划' }),
    adversity: Object.freeze({ id: 'adversity', name: '逆境' }),
  });
  const DEFINITIONS = Object.freeze([
    { id: 'chainShield', name: '连锁护盾', school: 'chain', rarity: 'common', maxLevel: 3, tags: ['chain', 'defense'], synergies: ['chainEcho', 'chainCharge', 'palette'], effects: ['额外抵消 1 颗干扰', '额外抵消 2 颗干扰', '额外抵消 3 颗干扰'] },
    { id: 'chainEcho', name: '连锁回响', school: 'chain', rarity: 'common', maxLevel: 3, tags: ['chain', 'score'], synergies: ['chainShield', 'chainCharge'], effects: ['3 CHAIN 得分 +15%', '3 CHAIN 得分 +30%', '3 CHAIN 得分 +50%'] },
    { id: 'colorBurst', name: '彩色爆破', school: 'group', rarity: 'rare', maxLevel: 3, tags: ['largeGroup', 'garbage'], synergies: ['largeGroup'], effects: ['7 颗同消时远程爆破 1 颗干扰', '6 颗同消时远程爆破 1 颗干扰', '5 颗同消时远程爆破 1 颗干扰'] },
    { id: 'largeGroup', name: '大团奖励', school: 'group', rarity: 'common', maxLevel: 3, tags: ['largeGroup', 'defense'], synergies: ['colorBurst'], effects: ['9 颗同消抵消 2 颗', '8 颗同消抵消 2 颗', '7 颗同消抵消 2 颗'] },
    { id: 'cleaner', name: '清道夫', school: 'adversity', rarity: 'common', maxLevel: 3, tags: ['garbage', 'defense'], synergies: ['buffer', 'scrapValue'], effects: ['清除相邻干扰时，再清除附近 1 颗', '清除相邻干扰时，再清除附近 2 颗', '清除相邻干扰时，再清除附近 3 颗'] },
    { id: 'buffer', name: '缓冲层', school: 'adversity', rarity: 'rare', maxLevel: 3, tags: ['pressure', 'defense'], synergies: ['cleaner', 'lastStand'], effects: ['每个 Stage 首次干扰 -1', '每个 Stage 首次干扰 -2', '每个 Stage 首次干扰 -3'] },
    { id: 'steadyHands', name: '从容落子', school: 'planning', rarity: 'common', maxLevel: 3, tags: ['control', 'lock'], synergies: ['foresight'], effects: ['锁定时间 +10%', '锁定时间 +20%', '锁定时间 +30%'] },
    { id: 'foresight', name: '预知', school: 'planning', rarity: 'rare', maxLevel: 3, tags: ['next', 'information'], synergies: ['steadyHands', 'nextSwap'], effects: ['NEXT 对比更清晰', '标记下一组同色', '显示第 3 组 NEXT'] },
    { id: 'palette', name: '调色板', school: 'multicolor', rarity: 'common', maxLevel: 3, tags: ['multiColor', 'defense'], synergies: ['chainShield'], effects: ['双色同消额外抵消 1 颗干扰', '双色同消额外抵消 2 颗干扰', '双色同消额外抵消 3 颗干扰'] },
    { id: 'scrapValue', name: '废料利用', school: 'adversity', rarity: 'common', maxLevel: 3, tags: ['garbage', 'score'], synergies: ['cleaner'], effects: ['每清除 1 颗干扰额外 +20 分', '每清除 1 颗干扰额外 +35 分', '每清除 1 颗干扰额外 +50 分'] },
    { id: 'chainCharge', name: '连锁蓄能', school: 'chain', rarity: 'common', maxLevel: 3, tags: ['chain', 'defense', 'counter'], synergies: ['chainShield', 'chainEcho'], effects: ['空过落子蓄能，最多 2 层；2 CHAIN 时每层抵消 1 颗', '蓄能上限提高至 3 层', '蓄能上限提高至 4 层'] },
    { id: 'lastStand', name: '绝地反击', school: 'adversity', rarity: 'rare', maxLevel: 3, tags: ['danger', 'defense'], synergies: ['buffer'], effects: ['堆叠达到 8 行时，每 Stage 首次消除额外抵消 1 颗', '额外抵消提高至 2 颗', '额外抵消提高至 3 颗'] },
    { id: 'nextSwap', name: '交换预告', school: 'planning', rarity: 'rare', maxLevel: 3, tags: ['next', 'control'], synergies: ['foresight', 'steadyHands'], effects: ['每个 Stage 可交换 1 次 NEXT 1 / NEXT 2', '每个 Stage 可交换 2 次 NEXT 1 / NEXT 2', '每个 Stage 可交换 2 次；换出同色 NEXT 时锁定时间 +10%'] },
    { id: 'cohesion', name: '凝聚', school: 'group', rarity: 'common', maxLevel: 3, tags: ['largeGroup', 'next'], synergies: ['largeGroup', 'colorBurst'], effects: ['6 颗同色消除后，下一次补充组合会重抽一次并偏向该颜色', '下一次补充组合至少包含 1 颗该颜色', '下一次补充组合变为该色同色组合'] },
  ]);
  const BY_ID = Object.freeze(Object.fromEntries(DEFINITIONS.map((item) => [item.id, item])));
  const RELICS = Object.freeze([
    { id: 'echoBottle', name: '回声瓶', school: 'chain', rarity: 'relic', effect: '每个 Stage 第一次达到 2 CHAIN，额外抵消 2 颗干扰', synergies: ['chainShield', 'chainCharge'] },
    { id: 'moonPrism', name: '月光棱镜', school: 'multicolor', rarity: 'relic', effect: '每个 Stage 第一次双色同消，按颜色数抵消干扰并获得每色 100 分', synergies: ['palette'] },
  ]);
  const RELIC_BY_ID = Object.freeze(Object.fromEntries(RELICS.map((item) => [item.id, item])));

  function boundedInt(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
  }

  function normalize(source, completed) {
    const saved = source && typeof source === 'object' ? source : null;
    const upgrades = {};
    if (saved && saved.upgrades && typeof saved.upgrades === 'object') {
      Object.keys(saved.upgrades).forEach((id) => {
        if (BY_ID[id]) upgrades[id] = boundedInt(saved.upgrades[id], 0, 0, BY_ID[id].maxLevel);
      });
    }
    const pendingChoice = saved && Array.isArray(saved.pendingChoice)
      ? Array.from(new Set(saved.pendingChoice.filter((id) => BY_ID[id] && (upgrades[id] || 0) < BY_ID[id].maxLevel)).values()).slice(0, 3)
      : [];
    const relics = saved && Array.isArray(saved.relics) ? Array.from(new Set(saved.relics.filter((id) => RELIC_BY_ID[id]))) : [];
    const pendingRelicChoice = saved && Array.isArray(saved.pendingRelicChoice)
      ? Array.from(new Set(saved.pendingRelicChoice.filter((id) => RELIC_BY_ID[id] && !relics.includes(id)))).slice(0, 3)
      : [];
    return {
      version: VERSION,
      picks: saved ? boundedInt(saved.picks, 0, 0, 999999) : Math.floor(Math.max(0, Number(completed) || 0) / 3),
      upgrades,
      relics,
      pendingChoice,
      pendingRelicChoice,
      pendingKind: pendingChoice.length && saved && ['special', 'contract', 'specialBonus'].includes(saved.pendingKind) ? saved.pendingKind : (pendingChoice.length ? 'normal' : ''),
      specialPicks: saved ? boundedInt(saved.specialPicks, 0, 0, 999999) : 0,
      bonusChoices: saved ? boundedInt(saved.bonusChoices, 0, 0, 9) : 0,
      bonusSource: saved && saved.bonusSource === 'special' ? 'special' : 'contract',
      bufferedStage: saved ? boundedInt(saved.bufferedStage, 0, 0, 999999) : 0,
      lastContractStage: saved ? boundedInt(saved.lastContractStage, 0, 0, 999999) : 0,
      contract: saved && saved.contract && saved.contract.id === 'overload' && ['pending', 'active'].includes(saved.contract.status)
        ? { id: 'overload', status: saved.contract.status, stage: boundedInt(saved.contract.stage, 1, 1, 999999) }
        : null,
      counters: {
        chainCharge: saved && saved.counters ? boundedInt(saved.counters.chainCharge, 0, 0, 4) : 0,
        lastStandStage: saved && saved.counters ? boundedInt(saved.counters.lastStandStage, 0, 0, 999999) : 0,
        nextSwapStage: saved && saved.counters ? boundedInt(saved.counters.nextSwapStage, 0, 0, 999999) : 0,
        nextSwapUsed: saved && saved.counters ? boundedInt(saved.counters.nextSwapUsed, 0, 0, 2) : 0,
        nextSwapLock: saved && saved.counters ? boundedInt(saved.counters.nextSwapLock, 0, 0, 1) : 0,
        cohesionColor: saved && saved.counters ? boundedInt(saved.counters.cohesionColor, 0, 0, 5) : 0,
        echoBottleStage: saved && saved.counters ? boundedInt(saved.counters.echoBottleStage, 0, 0, 999999) : 0,
        moonPrismStage: saved && saved.counters ? boundedInt(saved.counters.moonPrismStage, 0, 0, 999999) : 0,
      },
    };
  }

  function levelOf(state, id) {
    const item = BY_ID[id];
    return boundedInt(state && state.upgrades && state.upgrades[id], 0, 0, item ? item.maxLevel : MAX_LEVEL);
  }

  function schoolFor(id) {
    const item = BY_ID[id];
    return item ? SCHOOLS[item.school] : null;
  }

  function buildProfile(source) {
    const state = normalize(source, 0);
    const schools = Object.keys(SCHOOLS).map((id) => {
      const items = DEFINITIONS.filter((item) => item.school === id && levelOf(state, item.id) > 0);
      return { id, name: SCHOOLS[id].name, count: items.length, levels: items.reduce((sum, item) => sum + levelOf(state, item.id), 0) };
    });
    const ranked = schools.slice().sort((a, b) => b.count - a.count || b.levels - a.levels);
    const primary = ranked[0].count >= 2 && (!ranked[1] || ranked[0].count > ranked[1].count || ranked[0].levels > ranked[1].levels) ? ranked[0] : null;
    return { primary, schools };
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
    const palette = levelOf(state, 'palette');
    const scrap = levelOf(state, 'scrapValue');
    const charge = levelOf(state, 'chainCharge');
    const lastStand = levelOf(state, 'lastStand');
    const nextSwap = levelOf(state, 'nextSwap');
    const cohesion = levelOf(state, 'cohesion');
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
      paletteDefense: palette,
      scrapScorePerGarbage: [0, 20, 35, 50][scrap],
      chainChargeMax: charge ? [0, 2, 3, 4][charge] : 0,
      lastStandDefense: lastStand,
      lastStandMinHeight: 8,
      nextSwapCount: [0, 1, 2, 2][nextSwap],
      nextSwapLockMultiplier: nextSwap >= 3 ? 1.1 : 1,
      cohesionLevel: cohesion,
    };
  }

  function resolveTurnUpgrades(source, stats, stage) {
    const state = normalize(source, 0);
    const nextStats = stats || {};
    const currentStage = boundedInt(stage, 1, 1, 999999);
    const values = modifiers(state);
    const triggered = [];
    let extraDefense = 0;
    let scoreBonus = 0;

    if ((nextStats.maxChain || 0) >= 2 && values.chainDefense) {
      extraDefense += values.chainDefense;
      triggered.push('chainShield');
    }
    if (values.largeGroupThreshold && (nextStats.largestGroup || 0) >= values.largeGroupThreshold) {
      extraDefense += values.largeGroupDefense;
      triggered.push('largeGroup');
    }
    if ((nextStats.maxColors || 0) >= 2 && values.paletteDefense) {
      extraDefense += values.paletteDefense;
      triggered.push('palette');
    }
    if ((nextStats.garbageCleared || 0) > 0 && values.scrapScorePerGarbage) {
      scoreBonus += nextStats.garbageCleared * values.scrapScorePerGarbage;
      triggered.push('scrapValue');
    }
    if (values.chainChargeMax) {
      if ((nextStats.maxChain || 0) >= 2 && state.counters.chainCharge > 0) {
        extraDefense += state.counters.chainCharge;
        state.counters.chainCharge = 0;
        triggered.push('chainCharge');
      } else if (!nextStats.clearedThisTurn) {
        const charged = Math.min(values.chainChargeMax, state.counters.chainCharge + 1);
        if (charged !== state.counters.chainCharge) triggered.push('chainCharge');
        state.counters.chainCharge = charged;
      }
    }
    if (values.lastStandDefense && nextStats.clearedThisTurn && (nextStats.boardHeight || 0) >= values.lastStandMinHeight && state.counters.lastStandStage !== currentStage) {
      extraDefense += values.lastStandDefense;
      state.counters.lastStandStage = currentStage;
      triggered.push('lastStand');
    }
    if (values.cohesionLevel && (nextStats.largestGroup || 0) >= 6 && (nextStats.largestGroupColor || 0) > 0) {
      state.counters.cohesionColor = nextStats.largestGroupColor;
      triggered.push('cohesion');
    }
    if (state.relics.includes('echoBottle') && (nextStats.maxChain || 0) >= 2 && state.counters.echoBottleStage !== currentStage) {
      extraDefense += 2;
      state.counters.echoBottleStage = currentStage;
      triggered.push('echoBottle');
    }
    if (state.relics.includes('moonPrism') && (nextStats.maxColors || 0) >= 2 && state.counters.moonPrismStage !== currentStage) {
      extraDefense += nextStats.maxColors;
      scoreBonus += nextStats.maxColors * 100;
      state.counters.moonPrismStage = currentStage;
      triggered.push('moonPrism');
    }
    return { state, extraDefense, scoreBonus, triggered };
  }

  function swapNext(source, queue, stage) {
    const state = normalize(source, 0);
    const currentStage = boundedInt(stage, 1, 1, 999999);
    const available = modifiers(state).nextSwapCount;
    if (state.counters.nextSwapStage !== currentStage) {
      state.counters.nextSwapStage = currentStage;
      state.counters.nextSwapUsed = 0;
    }
    if (!available || state.counters.nextSwapUsed >= available || !Array.isArray(queue) || queue.length < 2) {
      return { state, queue, swapped: false, remaining: Math.max(0, available - state.counters.nextSwapUsed) };
    }
    const nextQueue = queue.map((colors) => colors.slice());
    const first = nextQueue[0];
    nextQueue[0] = nextQueue[1];
    nextQueue[1] = first;
    state.counters.nextSwapUsed++;
    state.counters.nextSwapLock = levelOf(state, 'nextSwap') >= 3 && nextQueue[0][0] === nextQueue[0][1] ? 1 : 0;
    return { state, queue: nextQueue, swapped: true, remaining: available - state.counters.nextSwapUsed };
  }

  function consumeSwapLock(source) {
    const state = normalize(source, 0);
    const active = state.counters.nextSwapLock === 1;
    state.counters.nextSwapLock = 0;
    return { state, active };
  }

  function swapStatus(source, stage) {
    const state = normalize(source, 0);
    const available = modifiers(state).nextSwapCount;
    const used = state.counters.nextSwapStage === boundedInt(stage, 1, 1, 999999) ? state.counters.nextSwapUsed : 0;
    return { available, used, remaining: Math.max(0, available - used) };
  }

  function applyCohesion(source, pair, rerollPair) {
    const state = normalize(source, 0);
    const level = modifiers(state).cohesionLevel;
    const color = state.counters.cohesionColor;
    const original = Array.isArray(pair) ? pair.slice(0, 2) : [];
    if (!level || !color || original.length < 2) return { state, pair: original, applied: false };
    let next = original;
    if (level === 1 && !next.includes(color) && typeof rerollPair === 'function') {
      const candidate = rerollPair();
      if (Array.isArray(candidate) && candidate.length >= 2 && candidate.includes(color)) next = candidate.slice(0, 2);
    } else if (level === 2 && !next.includes(color)) {
      next[1] = color;
    } else if (level >= 3) {
      next = [color, color];
    }
    state.counters.cohesionColor = 0;
    return { state, pair: next, applied: true };
  }

  function statusFor(source, id) {
    const state = normalize(source, 0);
    if (id === 'chainCharge' && levelOf(state, id)) return '蓄能 ' + state.counters.chainCharge + ' / ' + modifiers(state).chainChargeMax;
    if (id === 'cohesion' && levelOf(state, id) && state.counters.cohesionColor) return '已锁定下一次补充颜色';
    return '';
  }

  function choicesFor(state, random, options) {
    const rng = typeof random === 'function' ? random : Math.random;
    const pool = DEFINITIONS.filter((item) => (state.upgrades[item.id] || 0) < item.maxLevel).slice();
    const choices = [];
    function take(candidates) {
      if (!candidates.length) return null;
      const selected = candidates[Math.floor(rng() * candidates.length) % candidates.length];
      const index = pool.findIndex((item) => item.id === selected.id);
      if (index >= 0) pool.splice(index, 1);
      choices.push(selected.id);
      return selected;
    }
    if (options && options.rare) {
      const rarePool = pool.filter((item) => item.rarity === 'rare');
      if (rarePool.length) take(rarePool);
    } else if ((state.picks || 0) >= 2) {
      const profile = buildProfile(state);
      if (profile.primary && rng() < 0.68) take(pool.filter((item) => item.school === profile.primary.id));
      if (profile.primary && choices.length < 2) take(pool.filter((item) => item.school !== profile.primary.id));
    }
    while (pool.length && choices.length < 3) take(pool);
    return choices;
  }

  function offer(source, completed, random) {
    const state = normalize(source, completed);
    if (state.pendingChoice.length) return state;
    const earned = Math.floor(Math.max(0, Number(completed) || 0) / 3);
    if (state.picks >= earned) return state;
    state.pendingChoice = choicesFor(state, random);
    state.pendingKind = state.pendingChoice.length ? 'normal' : '';
    return state;
  }

  function offerRelic(source, random) {
    const state = normalize(source, 0);
    if (state.pendingChoice.length || state.pendingRelicChoice.length) return state;
    const rng = typeof random === 'function' ? random : Math.random;
    const pool = RELICS.filter((item) => !state.relics.includes(item.id)).slice();
    if (!pool.length) {
      state.bonusChoices = Math.min(9, state.bonusChoices + 1);
      state.bonusSource = 'special';
      return state;
    }
    while (pool.length && state.pendingRelicChoice.length < 3) {
      const index = Math.floor(rng() * pool.length) % pool.length;
      state.pendingRelicChoice.push(pool.splice(index, 1)[0].id);
    }
    return state;
  }

  function offerBonus(source, completed, random) {
    const state = normalize(source, completed);
    if (state.pendingChoice.length || state.bonusChoices <= 0) return state;
    state.pendingChoice = choicesFor(state, random);
    state.pendingKind = state.pendingChoice.length ? (state.bonusSource === 'special' ? 'specialBonus' : 'contract') : '';
    if (!state.pendingChoice.length) state.bonusChoices = 0;
    return state;
  }

  function offerContract(source, stage, isSpecial) {
    const state = normalize(source, 0);
    const currentStage = boundedInt(stage, 1, 1, 999999);
    if (isSpecial || currentStage < 4 || currentStage % 4 !== 0 || state.lastContractStage >= currentStage || state.contract) return state;
    state.lastContractStage = currentStage;
    state.contract = { id: 'overload', status: 'pending', stage: currentStage };
    return state;
  }

  function decideContract(source, accept) {
    const state = normalize(source, 0);
    if (!state.contract || state.contract.status !== 'pending') return { state, accepted: false, skipped: false, garbage: 0 };
    if (!accept) {
      state.contract = null;
      return { state, accepted: false, skipped: true, garbage: 0 };
    }
    state.contract.status = 'active';
    return { state, accepted: true, skipped: false, garbage: 2 };
  }

  function resolveContract(source, stageBefore, completed) {
    const state = normalize(source, 0);
    const stage = boundedInt(stageBefore, 1, 1, 999999);
    if (!state.contract || state.contract.status !== 'active' || state.contract.stage !== stage || !completed) return { state, rewarded: false };
    state.contract = null;
    state.bonusChoices = Math.min(9, state.bonusChoices + 1);
    state.bonusSource = 'contract';
    return { state, rewarded: true };
  }

  function choose(source, id, completed) {
    const state = normalize(source, completed);
    if (!state.pendingChoice.includes(id) || !BY_ID[id]) return { state, selected: null };
    state.upgrades[id] = Math.min(BY_ID[id].maxLevel, (state.upgrades[id] || 0) + 1);
    if (state.pendingKind === 'special') state.specialPicks++;
    else if (state.pendingKind === 'contract' || state.pendingKind === 'specialBonus') {
      state.bonusChoices = Math.max(0, state.bonusChoices - 1);
      if (!state.bonusChoices) state.bonusSource = 'contract';
    }
    else state.picks++;
    state.pendingChoice = [];
    state.pendingKind = '';
    return { state, selected: BY_ID[id] };
  }

  function chooseRelic(source, id) {
    const state = normalize(source, 0);
    if (!state.pendingRelicChoice.includes(id) || !RELIC_BY_ID[id] || state.relics.includes(id)) return { state, selected: null };
    state.relics.push(id);
    state.specialPicks++;
    state.pendingRelicChoice = [];
    return { state, selected: RELIC_BY_ID[id] };
  }

  function cardFor(state, id) {
    const item = BY_ID[id];
    if (!item) return null;
    const current = state.upgrades[id] || 0;
    const next = Math.min(item.maxLevel, current + 1);
    const ownedSynergies = item.synergies.filter((synergyId) => levelOf(state, synergyId) > 0).map((synergyId) => BY_ID[synergyId].name);
    const profile = buildProfile(state);
    return Object.assign({}, item, {
      schoolName: SCHOOLS[item.school].name,
      currentLevel: current,
      nextLevel: next,
      effect: item.effects[next - 1],
      ownedSynergies,
      recommended: !!profile.primary && profile.primary.id === item.school,
      recommendationReason: profile.primary && profile.primary.id === item.school ? '延续' + profile.primary.name + '构筑' : '',
    });
  }

  function relicCardFor(state, id) {
    const item = RELIC_BY_ID[id];
    if (!item) return null;
    const ownedSynergies = item.synergies.filter((synergyId) => levelOf(state, synergyId) > 0).map((synergyId) => BY_ID[synergyId].name);
    return Object.assign({}, item, { schoolName: SCHOOLS[item.school].name, ownedSynergies });
  }

  global.PuyoRogueliteRules = Object.freeze({ VERSION, MAX_LEVEL, SCHOOLS, DEFINITIONS, BY_ID, RELICS, RELIC_BY_ID, normalize, levelOf, schoolFor, buildProfile, modifiers, resolveTurnUpgrades, swapNext, swapStatus, consumeSwapLock, applyCohesion, statusFor, choicesFor, offer, offerRelic, offerBonus, offerContract, decideContract, resolveContract, choose, chooseRelic, cardFor, relicCardFor });
})(window);
