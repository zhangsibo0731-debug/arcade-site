(function (global) {
  'use strict';

  const VERSION = 1;
  const QUICK_TURN_WINDOW = 200;
  const KICKS = Object.freeze([[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]].map((kick) => Object.freeze(kick)));

  function resolve(options) {
    const pair = options.pair;
    const dir = options.dir < 0 ? -1 : 1;
    const rotations = options.rotations;
    const next = (pair.rot + dir + rotations.length) % rotations.length;
    for (const kick of KICKS) {
      const candidate = { x: pair.x + kick[0], y: pair.y + kick[1], rot: next };
      if (!options.collides(candidate.x, candidate.y, candidate.rot)) {
        return { success: true, quickTurn: false, pair: candidate, pending: null };
      }
    }

    const now = Number.isFinite(options.now) ? options.now : 0;
    const pending = options.pending;
    const eligible = pair.rot % 2 === 0
      && pending
      && pending.dir === dir
      && pending.rot === pair.rot
      && now - pending.at >= 0
      && now - pending.at <= QUICK_TURN_WINDOW;
    if (eligible) {
      const offset = rotations[pair.rot];
      const candidate = {
        x: pair.x + offset[0],
        y: pair.y + offset[1],
        rot: (pair.rot + 2) % rotations.length,
      };
      if (!options.collides(candidate.x, candidate.y, candidate.rot)) {
        return { success: true, quickTurn: true, pair: candidate, pending: null };
      }
    }

    return { success: false, quickTurn: false, pair: null, pending: { dir, rot: pair.rot, at: now } };
  }

  global.PuyoRotationRules = Object.freeze({ VERSION, QUICK_TURN_WINDOW, KICKS, resolve });
})(typeof window !== 'undefined' ? window : globalThis);
