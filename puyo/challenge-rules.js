(function (global) {
  'use strict';

  const VERSION = 6;
  const GARBAGE = 6;
  const MISSION_TYPES = Object.freeze(['chain', 'clear', 'colors', 'largeGroup', 'garbageClear', 'clearStreak', 'scoreTurn', 'lowBoard', 'targetColor']);
  const COLOR_NAMES = Object.freeze(['红色', '黄色', '绿色', '蓝色']);
  const SPECIAL_TYPES = Object.freeze(['storm', 'chainTrial', 'limitedClear', 'tower']);

  function boundedInt(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
  }

  function missionFor(stage, random, excludedType) {
    const rng = typeof random === 'function' ? random : Math.random;
    let pool = stage < 3 ? ['chain', 'clear', 'colors'] : ['chain', 'clear', 'colors', 'largeGroup', 'scoreTurn', 'lowBoard', 'targetColor'];
    if (stage >= 4) pool.push('clearStreak');
    if (stage >= 5) pool.push('garbageClear');
    if (excludedType && pool.length > 1) pool = pool.filter((id) => id !== excludedType);
    const type = pool[Math.floor(rng() * pool.length) % pool.length];
    if (type === 'chain') {
      const target = stage >= 5 ? 3 : 2;
      return { type, target, title: '完成 ' + target + ' CHAIN', progress: 0 };
    }
    if (type === 'colors') return { type, target: 2, title: '同时消除 2 种颜色', progress: 0 };
    if (type === 'largeGroup') {
      const target = stage >= 10 ? 7 : 6;
      return { type, target, title: '一次连接消除 ' + target + ' 颗同色', progress: 0 };
    }
    if (type === 'garbageClear') {
      const target = Math.min(6, 2 + Math.floor(stage / 4));
      return { type, target, title: '累计清除 ' + target + ' 颗干扰', progress: 0 };
    }
    if (type === 'clearStreak') {
      const target = stage >= 10 ? 3 : 2;
      return { type, target, title: '连续 ' + target + ' 回合发生消除', progress: 0 };
    }
    if (type === 'scoreTurn') {
      const target = Math.min(1800, 300 + stage * 70);
      return { type, target, title: '单回合获得 ' + target + ' 分', progress: 0 };
    }
    if (type === 'lowBoard') {
      const maxHeight = stage >= 9 ? 5 : 6;
      return { type, target: 1, maxHeight, title: '消除后将堆叠控制在 ' + maxHeight + ' 行以内', progress: 0 };
    }
    if (type === 'targetColor') {
      const color = 1 + Math.floor(rng() * COLOR_NAMES.length) % COLOR_NAMES.length;
      const target = stage >= 8 ? 6 : 4;
      return { type, target, color, title: '累计消除 ' + target + ' 颗' + COLOR_NAMES[color - 1] + '噗呦', progress: 0 };
    }
    const target = Math.min(14, 7 + stage);
    return { type, target, title: '一回合消除 ' + target + ' 颗', progress: 0 };
  }

  function specialFor(stage, random, excludedType) {
    const rng = typeof random === 'function' ? random : Math.random;
    let pool = SPECIAL_TYPES.filter((type) => type !== excludedType);
    if (!pool.length) pool = SPECIAL_TYPES.slice();
    const type = pool[Math.floor(rng() * pool.length) % pool.length];
    if (type === 'storm') return { type, title: '干扰风暴', mission: { type: 'garbageClear', target: 4, title: '风暴中清除 4 颗干扰', progress: 0 }, turns: 5 };
    if (type === 'chainTrial') return { type, title: '连锁试炼', mission: { type: 'chain', target: 3, title: '完成 3 CHAIN 通过试炼', progress: 0 }, turns: 6 };
    if (type === 'limitedClear') return { type, title: '限步清场', mission: { type: 'clear', target: 14, title: '限时一回合消除 14 颗', progress: 0 }, turns: 4 };
    return { type, title: '高塔危机', mission: { type: 'lowBoard', target: 1, maxHeight: 6, title: '消除后将高塔压到 6 行以内', progress: 0 }, turns: 6 };
  }

  function garbageForStage(stage) {
    return Math.min(5, 1 + Math.floor(Math.max(1, stage) / 2));
  }

  function defenseForChain(chain) {
    const value = boundedInt(chain, 0, 0, 99);
    if (value < 2) return 0;
    if (value === 2) return 1;
    if (value === 3) return 3;
    return 6 + Math.max(0, value - 4) * 2;
  }

  function normalize(source, random) {
    const saved = source && typeof source === 'object' ? source : {};
    const completed = boundedInt(saved.completed, 0, 0, 999999);
    const stage = Math.max(1, completed + 1);
    const mission = saved.mission && MISSION_TYPES.includes(saved.mission.type)
      ? {
          type: saved.mission.type,
          target: boundedInt(saved.mission.target, 2, 1, 99),
          title: String(saved.mission.title || ''),
          progress: boundedInt(saved.mission.progress, 0, 0, 999999),
          color: boundedInt(saved.mission.color, 1, 1, COLOR_NAMES.length),
          maxHeight: boundedInt(saved.mission.maxHeight, 6, 1, 11),
        }
      : missionFor(stage, random);
    return {
      version: VERSION,
      stage,
      completed,
      garbageCleared: boundedInt(saved.garbageCleared, 0, 0, 999999),
      turnsLeft: boundedInt(saved.turnsLeft, 8, 1, 12),
      pressureIn: boundedInt(saved.pressureIn, Math.max(6, 10 - Math.floor(stage / 2)), 1, 12),
      pendingGarbage: boundedInt(saved.pendingGarbage, garbageForStage(stage), 0, 99),
      clearStreak: boundedInt(saved.clearStreak, 0, 0, 99),
      lastMissionType: MISSION_TYPES.includes(saved.lastMissionType) ? saved.lastMissionType : '',
      sameMissionCount: boundedInt(saved.sameMissionCount, 0, 0, 2),
      special: saved.special && SPECIAL_TYPES.includes(saved.special.type) ? { type: saved.special.type, title: String(saved.special.title || '') } : null,
      lastSpecialType: SPECIAL_TYPES.includes(saved.lastSpecialType) ? saved.lastSpecialType : '',
      specialAttemptedStage: boundedInt(saved.specialAttemptedStage, saved.special ? stage : 0, 0, 999999),
      mission,
    };
  }

  function missionProgress(mission, stats) {
    if (mission.type === 'chain') return Math.max(mission.progress || 0, stats.maxChain || 0);
    if (mission.type === 'colors') return Math.max(mission.progress || 0, stats.maxColors || 0);
    if (mission.type === 'largeGroup') return Math.max(mission.progress || 0, stats.largestGroup || 0);
    if (mission.type === 'garbageClear') return (mission.progress || 0) + (stats.garbageCleared || 0);
    if (mission.type === 'clearStreak') return stats.clearStreak == null ? (mission.progress || 0) : stats.clearStreak;
    if (mission.type === 'scoreTurn') return Math.max(mission.progress || 0, stats.scoreGained || 0);
    if (mission.type === 'lowBoard') return stats.clearedThisTurn && Number.isFinite(stats.boardHeight) && stats.boardHeight <= (mission.maxHeight || 6) ? 1 : 0;
    if (mission.type === 'targetColor') return (mission.progress || 0) + (stats.colorClearedCount || 0);
    return Math.max(mission.progress || 0, stats.cleared || 0);
  }

  function missionPresentation(mission, progress) {
    const value = Math.max(0, Number(progress) || 0);
    const target = Math.max(1, Number(mission.target) || 1);
    if (mission.type === 'chain') return { scope: '单回合', progress: '最高 ' + value + ' / ' + target + ' CHAIN' };
    if (mission.type === 'colors') return { scope: '单次消除', progress: '最多同时 ' + value + ' / ' + target + ' 种颜色' };
    if (mission.type === 'largeGroup') return { scope: '单次连接', progress: '最大同色连接 ' + value + ' / ' + target + ' 颗' };
    if (mission.type === 'garbageClear') return { scope: '累计任务', progress: '已累计清除 ' + value + ' / ' + target + ' 颗' };
    if (mission.type === 'clearStreak') return { scope: '连续任务', progress: '当前连续 ' + value + ' / ' + target + ' 回合' };
    if (mission.type === 'scoreTurn') return { scope: '单回合', progress: '单回合最高 ' + value + ' / ' + target + ' 分' };
    if (mission.type === 'lowBoard') return { scope: '单回合', progress: value >= target ? '已达成低堆叠目标' : '目标：消除后不超过 ' + (mission.maxHeight || 6) + ' 行' };
    if (mission.type === 'targetColor') return { scope: '累计任务', progress: '已累计消除 ' + value + ' / ' + target + ' 颗' };
    return { scope: '单回合', progress: '单回合最多 ' + value + ' / ' + target + ' 颗' };
  }

  function advanceMission(state, random) {
    const previous = state.mission.type;
    state.sameMissionCount = previous === state.lastMissionType ? state.sameMissionCount + 1 : 1;
    state.lastMissionType = previous;
    if (state.stage % 5 === 0 && state.specialAttemptedStage !== state.stage) {
      const special = specialFor(state.stage, random, state.lastSpecialType);
      state.specialAttemptedStage = state.stage;
      state.special = { type: special.type, title: special.title };
      state.mission = special.mission;
      state.turnsLeft = special.turns;
      if (special.type === 'storm') {
        state.pressureIn = Math.min(state.pressureIn, 4);
        state.pendingGarbage += 2;
      }
      return { enteredSpecial: true, entryGarbage: special.type === 'tower' ? 5 : 0 };
    }
    state.special = null;
    state.mission = missionFor(state.stage, random, state.sameMissionCount >= 2 ? previous : '');
    return { enteredSpecial: false, entryGarbage: 0 };
  }

  function resolveTurn(source, stats, random) {
    const state = normalize(source, random);
    state.clearStreak = stats && stats.clearedThisTurn ? state.clearStreak + 1 : 0;
    if (stats) stats.clearStreak = state.clearStreak;
    state.mission.progress = missionProgress(state.mission, stats || {});
    state.turnsLeft--;
    state.pressureIn--;
    const defense = defenseForChain(stats && stats.maxChain) + boundedInt(stats && stats.extraDefense, 0, 0, 99);
    const canceled = Math.min(state.pendingGarbage, defense);
    state.pendingGarbage -= canceled;
    const completed = state.mission.progress >= state.mission.target;
    const expired = !completed && state.turnsLeft <= 0;
    const activeSpecial = state.special;
    let reward = 0;
    let bonus = 0;
    let enteredSpecial = false;
    let entryGarbage = 0;
    let specialCompleted = false;
    let specialFailed = false;
    let specialPenalty = 0;
    if (completed) {
      const completedStage = state.stage;
      specialCompleted = !!activeSpecial;
      if (activeSpecial) state.lastSpecialType = activeSpecial.type;
      state.completed++;
      state.stage = state.completed + 1;
      reward = Math.min(7, 2 + Math.floor(state.stage / 3) + (specialCompleted ? 2 : 0));
      bonus = 120 * completedStage * (specialCompleted ? 2 : 1);
      state.turnsLeft = Math.max(6, 9 - Math.floor(state.stage / 3));
      const next = advanceMission(state, random);
      enteredSpecial = next.enteredSpecial;
      entryGarbage = next.entryGarbage;
    } else if (expired) {
      state.turnsLeft = Math.max(6, 9 - Math.floor(state.stage / 3));
      if (activeSpecial) {
        specialFailed = true;
        specialPenalty = 3;
        state.lastSpecialType = activeSpecial.type;
        state.special = null;
        state.mission = missionFor(state.stage, random, state.mission.type);
      } else {
        advanceMission(state, random);
      }
    }
    let pressure = 0;
    let pressureTriggered = false;
    if (state.pressureIn <= 0) {
      pressureTriggered = true;
      pressure = state.pendingGarbage;
      state.pressureIn = Math.max(6, 10 - Math.floor(state.stage / 2));
      state.pendingGarbage = garbageForStage(state.stage);
    }
    pressure += specialPenalty;
    return { state, completed, expired, reward, bonus, pressure, pressureTriggered, canceled, enteredSpecial, entryGarbage, specialCompleted, specialFailed, specialPenalty };
  }

  function adjacentGarbage(board, cells, garbageValue) {
    const value = garbageValue || GARBAGE;
    const result = new Set();
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    cells.forEach((cell) => dirs.forEach((dir) => {
      const x = cell[0] + dir[0], y = cell[1] + dir[1];
      if (y >= 0 && y < board.length && x >= 0 && x < board[0].length && board[y][x] === value) result.add(x + ',' + y);
    }));
    return Array.from(result, (key) => key.split(',').map(Number));
  }

  function removeGarbage(board, count, garbageValue) {
    const value = garbageValue || GARBAGE;
    const cells = [];
    for (let y = board.length - 1; y >= 0; y--) {
      for (let x = 0; x < board[y].length; x++) if (board[y][x] === value) cells.push([x, y]);
    }
    const removed = cells.slice(0, Math.max(0, count));
    removed.forEach((cell) => { board[cell[1]][cell[0]] = 0; });
    return removed;
  }

  function placeGarbage(board, count, random, garbageValue) {
    const value = garbageValue || GARBAGE;
    const rng = typeof random === 'function' ? random : Math.random;
    const placed = [];
    for (let i = 0; i < count; i++) {
      const heights = board[0].map((_, x) => {
        const first = board.findIndex((row) => row[x] !== 0);
        return first < 0 ? board.length : first;
      });
      const available = heights.map((height, x) => ({ height, x })).filter((entry) => entry.height > 0);
      if (!available.length) break;
      const safest = Math.max.apply(null, available.map((entry) => entry.height));
      const choices = available.filter((entry) => entry.height >= safest - 1);
      const choice = choices[Math.floor(rng() * choices.length) % choices.length];
      const y = choice.height - 1;
      board[y][choice.x] = value;
      placed.push([choice.x, y]);
    }
    return placed;
  }

  global.PuyoChallengeRules = Object.freeze({ VERSION, GARBAGE, MISSION_TYPES, SPECIAL_TYPES, missionFor, specialFor, missionProgress, missionPresentation, garbageForStage, defenseForChain, normalize, resolveTurn, adjacentGarbage, removeGarbage, placeGarbage });
})(window);
