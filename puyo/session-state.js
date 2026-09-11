(function (global) {
  'use strict';

  const VERSION = 5;

  function create(options) {
    const storage = options.storage;
    const challengeRules = options.challengeRules;
    const rogueliteRules = options.rogueliteRules;
    const emptyBoard = options.emptyBoard;

    function freshTurnStats() {
      return { maxChain: 0, cleared: 0, maxColors: 0, largestGroup: 0, largestGroupColor: 0, garbageCleared: 0, scoreGained: 0, clearedThisTurn: false, boardHeight: null, clearedColors: [], colorClearedCount: 0, extraDefense: 0, allClearDefense: 0, missionBaseProgress: null };
    }

    function snapshot(state) {
      return {
        savedAt: Date.now(),
        gameType: state.gameType,
        board: state.board,
        pair: state.pair,
        queue: state.queue,
        score: state.score,
        level: state.level,
        clearedTotal: state.clearedTotal,
        runMaxChain: state.runMaxChain,
        allClearCount: state.allClearCount,
        hiAtStart: state.hiAtStart,
        bestChainAtStart: state.bestChainAtStart,
        challengeState: state.gameType === 'challenge' ? state.challengeState : null,
        runBuild: state.gameType === 'challenge' ? state.runBuild : null,
      };
    }

    function restore(saved, records) {
      const gameType = saved.gameType === 'challenge' ? 'challenge' : 'classic';
      const challengeState = challengeRules.normalize(gameType === 'challenge' ? saved.challengeState : {});
      return {
        gameType,
        board: storage.validBoard(saved.board) ? saved.board : emptyBoard(),
        pair: storage.validPair(saved.pair) ? saved.pair : null,
        queue: Array.isArray(saved.queue) ? saved.queue.filter(storage.validColors) : [],
        score: Number.isFinite(saved.score) ? Math.max(0, saved.score) : 0,
        level: Number.isFinite(saved.level) ? Math.max(1, Math.min(12, saved.level)) : 1,
        clearedTotal: Number.isFinite(saved.clearedTotal) ? Math.max(0, saved.clearedTotal) : 0,
        runMaxChain: Number.isFinite(saved.runMaxChain) ? Math.max(0, saved.runMaxChain) : 0,
        allClearCount: Number.isFinite(saved.allClearCount) ? Math.max(0, Math.floor(saved.allClearCount)) : 0,
        hiAtStart: Number.isFinite(saved.hiAtStart) ? Math.max(0, saved.hiAtStart) : records.highScore,
        bestChainAtStart: Number.isFinite(saved.bestChainAtStart) ? Math.max(0, saved.bestChainAtStart) : records.bestChain,
        challengeState,
        runBuild: rogueliteRules.normalize(gameType === 'challenge' ? saved.runBuild : null, challengeState.completed),
      };
    }

    function prepareResume(state, needsResolution) {
      const queue = Array.isArray(state.queue) ? state.queue.map((colors) => colors.slice()) : [];
      let pair = state.pair;
      if (needsResolution && pair) {
        queue.unshift(pair.colors.slice());
        pair = null;
      }
      return { pair, queue, needsResolution: !!needsResolution };
    }

    return Object.freeze({ freshTurnStats, snapshot, restore, prepareResume });
  }

  global.PuyoSessionState = Object.freeze({ VERSION, create });
})(typeof window !== 'undefined' ? window : globalThis);
