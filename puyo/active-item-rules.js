(function (global) {
  'use strict';

  const VERSION = 1;
  const MIX_BOTTLE = 'mixBottle';
  const MAX_MIX_BOTTLES = 2;
  const ITEMS = Object.freeze({
    [MIX_BOTTLE]: Object.freeze({ id: MIX_BOTTLE, name: '混色瓶', icon: '🧪', max: MAX_MIX_BOTTLES }),
  });

  function boundedInt(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
  }

  function normalize(source) {
    const saved = source && typeof source === 'object' ? source : null;
    const inventory = saved && saved.inventory && typeof saved.inventory === 'object' ? saved.inventory : {};
    const bottles = boundedInt(inventory[MIX_BOTTLE], 0, 0, MAX_MIX_BOTTLES);
    return {
      version: VERSION,
      inventory: { [MIX_BOTTLE]: bottles },
      armedItem: saved && saved.armedItem === MIX_BOTTLE && bottles > 0 ? MIX_BOTTLE : '',
    };
  }

  function initialState() {
    return normalize({ inventory: { [MIX_BOTTLE]: 1 } });
  }

  function emptyState() {
    return normalize({});
  }

  function count(source, id) {
    const state = normalize(source);
    return boundedInt(state.inventory[id], 0, 0, ITEMS[id] ? ITEMS[id].max : 0);
  }

  function grant(source, id, amount) {
    const state = normalize(source);
    const item = ITEMS[id];
    if (!item) return { state, granted: 0, full: false };
    const before = count(state, id);
    const next = Math.min(item.max, before + Math.max(0, Math.floor(Number(amount) || 0)));
    state.inventory[id] = next;
    return { state, granted: next - before, full: next >= item.max };
  }

  function toggleMixBottle(source, canArm) {
    const state = normalize(source);
    if (state.armedItem === MIX_BOTTLE) {
      state.armedItem = '';
      return { state, armed: false, changed: true };
    }
    if (!canArm || count(state, MIX_BOTTLE) <= 0) return { state, armed: false, changed: false };
    state.armedItem = MIX_BOTTLE;
    return { state, armed: true, changed: true };
  }

  function disarm(source) {
    const state = normalize(source);
    state.armedItem = '';
    return state;
  }

  function applyMixBottle(source, board, colorCount, random) {
    const state = normalize(source);
    const original = Array.isArray(board) ? board : [];
    if (state.armedItem !== MIX_BOTTLE || count(state, MIX_BOTTLE) <= 0) {
      return { state, board: original, applied: false, sourceColor: 0, targetColor: 0, changedCells: [] };
    }

    const maxColor = boundedInt(colorCount, 4, 2, 5);
    const eligible = [];
    original.forEach((row, y) => {
      if (!Array.isArray(row)) return;
      row.forEach((value, x) => {
        if (value >= 1 && value <= maxColor) eligible.push({ x, y, color: value });
      });
    });
    if (!eligible.length) {
      state.armedItem = '';
      return { state, board: original, applied: false, sourceColor: 0, targetColor: 0, changedCells: [] };
    }

    const rng = typeof random === 'function' ? random : Math.random;
    const sourceIndex = Math.min(eligible.length - 1, Math.floor(Math.max(0, rng()) * eligible.length));
    const sourceColor = eligible[sourceIndex].color;
    const targets = Array.from({ length: maxColor }, (_, index) => index + 1).filter((color) => color !== sourceColor);
    const targetIndex = Math.min(targets.length - 1, Math.floor(Math.max(0, rng()) * targets.length));
    const targetColor = targets[targetIndex];
    const changedCells = [];
    const nextBoard = original.map((row, y) => row.map((value, x) => {
      if (value !== sourceColor) return value;
      changedCells.push([x, y]);
      return targetColor;
    }));

    state.inventory[MIX_BOTTLE]--;
    state.armedItem = '';
    return { state, board: nextBoard, applied: true, sourceColor, targetColor, changedCells };
  }

  global.PuyoActiveItemRules = Object.freeze({
    VERSION,
    ITEMS,
    MIX_BOTTLE,
    MAX_MIX_BOTTLES,
    normalize,
    initialState,
    emptyState,
    count,
    grant,
    toggleMixBottle,
    disarm,
    applyMixBottle,
  });
})(typeof window !== 'undefined' ? window : globalThis);
