(function (global) {
  'use strict';

  const VERSION = 3;
  const CHAIN_POWER = Object.freeze([0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512]);
  const COLOR_BONUS = Object.freeze([0, 0, 3, 6, 12, 24]);
  const MAX_COEFFICIENT = 999;
  const ALL_CLEAR_SCORE = 2100;
  const ALL_CLEAR_MAX_DEFENSE = 5;

  function boundedInteger(value, minimum, maximum) {
    const number = Number.isFinite(value) ? Math.floor(value) : minimum;
    return Math.max(minimum, Math.min(maximum, number));
  }

  function chainPower(chain) {
    return CHAIN_POWER[boundedInteger(chain, 1, CHAIN_POWER.length) - 1];
  }

  function colorBonus(colorCount) {
    return COLOR_BONUS[boundedInteger(colorCount, 0, COLOR_BONUS.length - 1)];
  }

  function groupBonus(size) {
    if (size <= 4) return 0;
    if (size === 5) return 2;
    if (size === 6) return 3;
    if (size === 7) return 4;
    if (size === 8) return 5;
    if (size === 9) return 6;
    if (size === 10) return 7;
    return 10;
  }

  function dropScore(distance) {
    return Math.max(0, Math.floor(Number.isFinite(distance) ? distance : 0));
  }

  function allClearResult(options) {
    const board = Array.isArray(options.board) ? options.board : [];
    const empty = board.length > 0 && board.every((row) => Array.isArray(row) && row.every((cell) => cell === 0));
    const triggered = options.playerCleared === true && empty;
    const pendingGarbage = Math.max(0, Math.floor(options.pendingGarbage || 0));
    return Object.freeze({
      triggered,
      score: triggered ? ALL_CLEAR_SCORE : 0,
      defense: triggered && options.challenge ? Math.min(ALL_CLEAR_MAX_DEFENSE, pendingGarbage) : 0,
    });
  }

  function calculate(options) {
    const clearedCount = Math.max(0, Math.floor(options.clearedCount || 0));
    const groupSizes = Array.isArray(options.groupSizes) ? options.groupSizes : [];
    const sizeBonus = groupSizes.reduce((sum, size) => sum + groupBonus(size), 0);
    const coefficient = Math.min(MAX_COEFFICIENT, Math.max(1,
      chainPower(options.chain) + colorBonus(options.colorCount) + sizeBonus
    ));
    const scoreMultiplier = Number.isFinite(options.scoreMultiplier) && options.scoreMultiplier > 0
      ? options.scoreMultiplier
      : 1;

    return Object.freeze({
      chainPower: chainPower(options.chain),
      colorBonus: colorBonus(options.colorCount),
      sizeBonus,
      coefficient,
      baseScore: clearedCount * 10 * coefficient,
      score: Math.round(clearedCount * 10 * coefficient * scoreMultiplier),
    });
  }

  global.PuyoScoringRules = Object.freeze({
    VERSION,
    CHAIN_POWER,
    COLOR_BONUS,
    MAX_COEFFICIENT,
    ALL_CLEAR_SCORE,
    ALL_CLEAR_MAX_DEFENSE,
    chainPower,
    colorBonus,
    groupBonus,
    dropScore,
    allClearResult,
    calculate,
  });
})(typeof window !== 'undefined' ? window : globalThis);
