(function (global) {
  'use strict';

  const VERSION = 2;
  const GARBAGE = 6;

  function boundedInt(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
  }

  function missionFor(stage, random) {
    const rng = typeof random === 'function' ? random : Math.random;
    const pool = ['chain', 'clear', 'colors'];
    const type = pool[Math.floor(rng() * pool.length) % pool.length];
    if (type === 'chain') {
      const target = stage >= 5 ? 3 : 2;
      return { type, target, title: '完成 ' + target + ' CHAIN', progress: 0 };
    }
    if (type === 'colors') return { type, target: 2, title: '同时消除 2 种颜色', progress: 0 };
    const target = Math.min(14, 7 + stage);
    return { type, target, title: '一回合消除 ' + target + ' 颗', progress: 0 };
  }

  function normalize(source, random) {
    const saved = source && typeof source === 'object' ? source : {};
    const completed = boundedInt(saved.completed, 0, 0, 999999);
    const stage = Math.max(1, completed + 1);
    const mission = saved.mission && ['chain', 'clear', 'colors'].includes(saved.mission.type)
      ? {
          type: saved.mission.type,
          target: boundedInt(saved.mission.target, 2, 1, 99),
          title: String(saved.mission.title || ''),
          progress: boundedInt(saved.mission.progress, 0, 0, 99),
        }
      : missionFor(stage, random);
    return {
      version: VERSION,
      stage,
      completed,
      garbageCleared: boundedInt(saved.garbageCleared, 0, 0, 999999),
      turnsLeft: boundedInt(saved.turnsLeft, 8, 1, 12),
      pressureIn: boundedInt(saved.pressureIn, Math.max(6, 10 - Math.floor(stage / 2)), 1, 12),
      mission,
    };
  }

  function missionProgress(mission, stats) {
    if (mission.type === 'chain') return Math.max(mission.progress || 0, stats.maxChain || 0);
    if (mission.type === 'colors') return Math.max(mission.progress || 0, stats.maxColors || 0);
    return Math.max(mission.progress || 0, stats.cleared || 0);
  }

  function resolveTurn(source, stats, random) {
    const state = normalize(source, random);
    state.mission.progress = missionProgress(state.mission, stats || {});
    state.turnsLeft--;
    state.pressureIn--;
    const completed = state.mission.progress >= state.mission.target;
    const expired = !completed && state.turnsLeft <= 0;
    let reward = 0;
    let bonus = 0;
    if (completed) {
      const completedStage = state.stage;
      state.completed++;
      state.stage = state.completed + 1;
      reward = Math.min(5, 2 + Math.floor(state.stage / 3));
      bonus = 120 * completedStage;
      state.turnsLeft = Math.max(6, 9 - Math.floor(state.stage / 3));
      state.mission = missionFor(state.stage, random);
    } else if (expired) {
      state.turnsLeft = Math.max(6, 9 - Math.floor(state.stage / 3));
      state.mission = missionFor(state.stage, random);
    }
    let pressure = 0;
    if (state.pressureIn <= 0) {
      pressure = Math.min(5, 1 + Math.floor(state.stage / 2));
      state.pressureIn = Math.max(6, 10 - Math.floor(state.stage / 2));
    }
    return { state, completed, expired, reward, bonus, pressure };
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

  global.PuyoChallengeRules = Object.freeze({ VERSION, GARBAGE, missionFor, normalize, resolveTurn, adjacentGarbage, removeGarbage, placeGarbage });
})(window);
