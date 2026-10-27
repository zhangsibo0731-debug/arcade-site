(function (global) {
  'use strict';

  const VERSION = 1;
  const DEFAULT_ROWS = 12;
  const DEFAULT_COLS = 6;
  const DEFAULT_ROTATIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const LOCK_DELAY_MS = 480;
  const MAX_LOCK_RESETS = 12;

  function colorCountForLevel(level) {
    return Math.max(1, Number(level) || 1) >= 6 ? 5 : 4;
  }

  function gravityIntervalMsForLevel(level) {
    return Math.max(180, 900 - (Math.max(1, Number(level) || 1) - 1) * 55);
  }

  function lockDelayMsFor(modifiers, pair) {
    const values = modifiers || {};
    const steady = Number(values.lockDelayMultiplier) || 1;
    const swapped = pair && pair.swapLock ? (Number(values.nextSwapLockMultiplier) || 1) : 1;
    return LOCK_DELAY_MS * steady * swapped;
  }

  function copyPair(pair) {
    return pair ? Object.assign({}, pair, { colors: pair.colors.slice() }) : null;
  }

  function copyBoard(board) {
    return board.map((row) => row.slice());
  }

  function copyQueue(queue) {
    return queue.map((colors) => colors.slice());
  }

  function create(options) {
    const opts = options || {};
    const boardRules = opts.boardRules;
    const scoringRules = opts.scoringRules;
    const rotationRules = opts.rotationRules;
    const rogueliteRules = opts.rogueliteRules;
    const challengeRules = opts.challengeRules;
    const activeItemRules = opts.activeItemRules;
    const challengeEffects = opts.challengeEffects;
    const sessionState = opts.sessionState || null;
    const rotations = opts.rotations || DEFAULT_ROTATIONS;
    const random = typeof opts.random === 'function' ? opts.random : Math.random;
    const now = typeof opts.now === 'function' ? opts.now : Date.now;
    const rows = opts.rows || DEFAULT_ROWS;
    const cols = opts.cols || DEFAULT_COLS;

    if (!boardRules || !scoringRules || !rotationRules || !rogueliteRules || !challengeRules || !activeItemRules || !challengeEffects) {
      throw new Error('PuyoGameSession requires all shared rule modules');
    }

    let state = null;
    let events = [];
    let eventSequence = 0;

    function emit(type, payload) {
      const event = Object.assign({ id: ++eventSequence, type }, payload || {});
      events.push(event);
      return event;
    }

    function freshTurnStats() {
      return { maxChain: 0, cleared: 0, maxColors: 0, largestGroup: 0, largestGroupColor: 0, garbageCleared: 0, scoreGained: 0, clearedThisTurn: false, boardHeight: null, clearedColors: [], colorClearedCount: 0, extraDefense: 0, allClearDefense: 0, missionBaseProgress: null, cleanerUsed: false };
    }

    function beginEffect(type, payload, next) {
      const event = emit(type, Object.assign({ requiresAck: true }, payload || {}));
      state.waitingEffect = { id: event.id, type, next: next || null };
      return event;
    }

    function colorCount() {
      return colorCountForLevel(state.level);
    }

    function randomPair() {
      const count = colorCount();
      return [1 + Math.floor(random() * count), 1 + Math.floor(random() * count)];
    }

    function nextPair() {
      const generated = randomPair();
      if (state.gameType !== 'challenge') return generated;
      const result = rogueliteRules.applyCohesion(state.runBuild, generated, randomPair);
      state.runBuild = result.state;
      if (result.applied) emit('upgradeTriggered', { upgradeId: 'cohesion' });
      return result.pair;
    }

    function fillQueue() {
      while (state.queue.length < 3) state.queue.push(nextPair());
    }

    function collidesAt(x, y, rot) {
      return boardRules.collides(state.board, state.pair, x, y, rot);
    }

    function grounded() {
      return !!state.pair && collidesAt(state.pair.x, state.pair.y + 1, state.pair.rot);
    }

    function lockDelayMs() {
      const modifiers = state.gameType === 'challenge' ? rogueliteRules.modifiers(state.runBuild) : rogueliteRules.modifiers({});
      return lockDelayMsFor(modifiers, state.pair);
    }

    function endGame() {
      state.pair = null;
      state.mode = 'gameover';
      state.highScore = Math.max(state.highScore, state.score);
      state.bestChain = Math.max(state.bestChain, state.runMaxChain);
      emit('gameOver', {
        gameType: state.gameType,
        score: state.score,
        highScore: Math.max(state.highScore, state.score),
        bestChain: state.bestChain,
        highScore: state.highScore,
        maxChain: state.runMaxChain,
        bestChain: state.bestChain,
        level: state.level,
        clearedTotal: state.clearedTotal,
        durationMs: state.activeDurationMs,
        stage: state.challengeState.stage,
      });
    }

    function spawnPair() {
      fillQueue();
      state.pair = { x: 2, y: 0, rot: 0, colors: state.queue.shift() };
      if (state.gameType === 'challenge') {
        const swapLock = rogueliteRules.consumeSwapLock(state.runBuild);
        state.runBuild = swapLock.state;
        state.pair.swapLock = swapLock.active;
      }
      fillQueue();
      state.gravityMs = 0;
      state.lockMs = 0;
      state.lockResets = 0;
      state.quickTurnPending = null;
      if (collidesAt(state.pair.x, state.pair.y, state.pair.rot)) {
        endGame();
        return false;
      }
      emit('spawn', { pair: copyPair(state.pair) });
      return true;
    }

    function start(gameType, records) {
      const type = gameType === 'classic' ? 'classic' : 'challenge';
      const savedRecords = records || {};
      state = {
        schemaVersion: 1,
        gameType: type,
        mode: 'playing',
        board: boardRules.emptyBoard(),
        pair: null,
        queue: [],
        score: 0,
        level: 1,
        clearedTotal: 0,
        runMaxChain: 0,
        allClearCount: 0,
        activeDurationMs: 0,
        highScore: Math.max(0, Number(savedRecords.highScore) || 0),
        bestChain: Math.max(0, Number(savedRecords.bestChain) || 0),
        hiAtStart: Math.max(0, Number(savedRecords.highScore) || 0),
        bestChainAtStart: Math.max(0, Number(savedRecords.bestChain) || 0),
        challengeState: challengeRules.normalize({}, type === 'challenge' ? random : () => 0),
        runBuild: rogueliteRules.normalize({}, 0),
        itemState: type === 'challenge' ? activeItemRules.initialState() : activeItemRules.emptyState(),
        gravityMs: 0,
        lockMs: 0,
        lockResets: 0,
        quickTurnPending: null,
        turnStats: freshTurnStats(),
        chainFeedback: { score: 0, cleared: 0, garbage: 0, previousBest: Math.max(0, Number(savedRecords.bestChain) || 0), rewardChain: false },
        waitingEffect: null,
        resolveChain: 0,
        resolveTaskSettled: false,
        resumeResolution: false,
      };
      events = [];
      fillQueue();
      spawnPair();
      emit('stateChanged', { reason: 'start' });
      return view();
    }

    function restore(saved, records) {
      if (!sessionState || typeof sessionState.restore !== 'function') {
        throw new Error('PuyoGameSession restore requires the shared session-state module');
      }
      const restored = sessionState.restore(saved || {}, records || { highScore: 0, bestChain: 0 });
      state = {
        schemaVersion: VERSION,
        gameType: restored.gameType,
        mode: 'paused',
        board: copyBoard(restored.board),
        pair: copyPair(restored.pair),
        queue: copyQueue(restored.queue),
        score: restored.score,
        level: restored.level,
        clearedTotal: restored.clearedTotal,
        runMaxChain: restored.runMaxChain,
        allClearCount: restored.allClearCount,
        activeDurationMs: restored.activeDurationMs,
        highScore: Math.max(restored.hiAtStart, Number(records && records.highScore) || 0),
        bestChain: Math.max(restored.runMaxChain, restored.bestChainAtStart, Number(records && records.bestChain) || 0),
        hiAtStart: restored.hiAtStart,
        bestChainAtStart: restored.bestChainAtStart,
        challengeState: restored.challengeState,
        runBuild: restored.runBuild,
        itemState: restored.itemState,
        gravityMs: 0,
        lockMs: 0,
        lockResets: 0,
        quickTurnPending: null,
        turnStats: freshTurnStats(),
        chainFeedback: { score: 0, cleared: 0, garbage: 0, previousBest: Math.max(restored.runMaxChain, restored.bestChainAtStart, Number(records && records.bestChain) || 0), rewardChain: false },
        waitingEffect: null,
        resolveChain: 0,
        resolveTaskSettled: false,
        resumeResolution: !restored.pair,
      };
      events = [];
      fillQueue();
      if (state.pair && collidesAt(state.pair.x, state.pair.y, state.pair.rot)) {
        state.pair = null;
        state.resumeResolution = true;
      }
      emit('stateChanged', { reason: 'restore' });
      return view();
    }

    function tryMove(dx, dy) {
      if (!state || state.mode !== 'playing' || !state.pair) return false;
      if (collidesAt(state.pair.x + dx, state.pair.y + dy, state.pair.rot)) return false;
      state.pair.x += dx;
      state.pair.y += dy;
      if (dx) state.quickTurnPending = null;
      if (dx && grounded()) {
        if (state.lockResets < MAX_LOCK_RESETS) {
          state.lockMs = 0;
          state.lockResets++;
        }
      } else {
        state.lockMs = 0;
      }
      if (dx) emit('move', { direction: dx });
      return true;
    }

    function rotate(direction) {
      if (!state || state.mode !== 'playing' || !state.pair) return false;
      const result = rotationRules.resolve({
        pair: state.pair,
        dir: direction,
        rotations,
        now: now(),
        pending: state.quickTurnPending,
        collides: collidesAt,
      });
      state.quickTurnPending = result.pending;
      if (!result.success) {
        emit('quickTurnReady', { ready: !!result.pending });
        return false;
      }
      state.pair.x = result.pair.x;
      state.pair.y = result.pair.y;
      state.pair.rot = result.pair.rot;
      if (grounded()) {
        if (state.lockResets < MAX_LOCK_RESETS) {
          state.lockMs = 0;
          state.lockResets++;
        }
      } else {
        state.lockMs = 0;
      }
      state.quickTurnPending = null;
      emit('rotate', { direction, quickTurn: result.quickTurn });
      return true;
    }

    function lockPair() {
      if (!state || state.mode !== 'playing' || !state.pair) return false;
      const cells = boardRules.pairCells(state.pair, state.pair.x, state.pair.y, state.pair.rot);
      if (cells.some((cell) => cell.y < 0)) {
        endGame();
        return false;
      }
      cells.forEach((cell) => { state.board[cell.y][cell.x] = cell.color; });
      state.pair = null;
      state.quickTurnPending = null;
      state.mode = 'resolving';
      state.chainFeedback = { score: 0, cleared: 0, garbage: 0, previousBest: state.bestChain, rewardChain: false };
      const gravity = boardRules.applyGravity(state.board, true);
      state.board = gravity.board;
      emit('land', { cells, offsets: Array.from(gravity.offsets.entries()) });
      emit('stateChanged', { reason: 'locked' });
      if (state.gameType === 'challenge' && state.itemState.armedItem === activeItemRules.MIX_BOTTLE) {
        const bottle = activeItemRules.applyMixBottle(state.itemState, state.board, colorCount(), random);
        state.itemState = bottle.state;
        state.board = bottle.board;
        if (bottle.applied) {
          beginEffect('recolor', {
            cells: bottle.changedCells,
            sourceColor: bottle.sourceColor,
            targetColor: bottle.targetColor,
          }, { kind: 'resolve', chain: 1, taskSettled: false });
          return true;
        }
      }
      resolveStep(1, false);
      return true;
    }

    function applyClearMutation(effect) {
      const data = effect.next;
      data.cells.forEach((cell) => {
        if (state.board[cell[1]] && state.board[cell[1]][cell[0]] === cell[2]) state.board[cell[1]][cell[0]] = 0;
      });
      data.garbageHits.forEach((hit) => {
        if (state.board[hit.cell[1]] && state.board[hit.cell[1]][hit.cell[0]] === hit.from) state.board[hit.cell[1]][hit.cell[0]] = hit.to;
      });
      const gravity = boardRules.applyGravity(state.board, true);
      state.board = gravity.board;
      beginEffect('fall', { offsets: Array.from(gravity.offsets.entries()), chain: data.chain }, {
        kind: 'resolve', chain: data.chain + 1, taskSettled: data.taskSettled,
      });
    }

    function applyStageReward(effect) {
      const data = effect.next;
      data.hits.forEach((hit) => {
        if (state.board[hit.cell[1]] && state.board[hit.cell[1]][hit.cell[0]] === hit.from) state.board[hit.cell[1]][hit.cell[0]] = hit.to;
      });
      const gravity = boardRules.applyGravity(state.board, true);
      state.board = gravity.board;
      beginEffect('fall', { offsets: Array.from(gravity.offsets.entries()), reward: true }, {
        kind: 'resolve', chain: data.chain, taskSettled: true,
      });
    }

    function openPendingChoiceOrContinue() {
      if (state.gameType === 'challenge' && state.runBuild.bonusChoices > 0 && !state.runBuild.pendingChoice.length && !state.runBuild.pendingRelicChoice.length) {
        state.runBuild = rogueliteRules.offerBonus(state.runBuild, state.challengeState.completed, random);
      }
      if (state.runBuild.pendingRelicChoice && state.runBuild.pendingRelicChoice.length) {
        state.mode = 'choosing';
        emit('choiceOpened', { choiceKind: 'relic', ids: state.runBuild.pendingRelicChoice.slice() });
        return;
      }
      if (state.runBuild.pendingChoice && state.runBuild.pendingChoice.length) {
        state.mode = 'choosing';
        emit('choiceOpened', { choiceKind: 'upgrade', ids: state.runBuild.pendingChoice.slice() });
        return;
      }
      if (state.runBuild.contract && state.runBuild.contract.status === 'pending') {
        state.mode = 'contract';
        emit('choiceOpened', { choiceKind: 'contract', ids: [state.runBuild.contract.id] });
        return;
      }
      state.mode = 'playing';
      spawnPair();
      emit('stateChanged', { reason: 'turnComplete' });
    }

    function settleChallengeTurn(chain) {
      if (state.gameType !== 'challenge') return false;
      const stageBefore = state.challengeState.stage;
      const result = challengeEffects.settleTurn({
        challengeState: state.challengeState,
        runBuild: state.runBuild,
        itemState: state.itemState,
        turnStats: state.turnStats,
        board: state.board,
        random,
      });
      state.challengeState = result.challengeState;
      state.runBuild = result.runBuild;
      state.itemState = result.itemState;
      state.score += result.scoreBonus;
      result.triggered.forEach((upgradeId) => emit('upgradeTriggered', { upgradeId }));
      if (result.outcome && (result.outcome.completed || result.outcome.specialCompleted)) {
        emit('stageComplete', {
          stage: stageBefore,
          nextStage: state.challengeState.stage,
          special: !!result.outcome.specialCompleted,
          scoreBonus: result.scoreBonus,
          rewardCount: result.rewardCount,
        });
      }
      if (result.itemReward && result.itemReward.granted) {
        emit('itemGranted', { itemId: activeItemRules.MIX_BOTTLE, count: result.itemReward.granted });
      }
      if (result.message) emit('message', result.message);
      if (result.defenseFlash) emit('garbageDefense');
      state.turnStats = freshTurnStats();
      if (result.rewardHits.length) {
        beginEffect('stageReward', { hits: result.rewardHits, chain }, { kind: 'stageReward', hits: result.rewardHits, chain });
        return true;
      }
      if (result.placed.length) {
        beginEffect('garbageFall', { cells: result.placed }, { kind: 'finishTurn' });
        return true;
      }
      return false;
    }

    function resolveStep(chain, taskSettled) {
      if (!state || state.mode !== 'resolving' || state.waitingEffect) return;
      state.resolveChain = chain;
      state.resolveTaskSettled = !!taskSettled;
      const groups = boardRules.findClearGroups(state.board);
      if (!groups.length) {
        if (!taskSettled && chain > 1) {
          const allClear = scoringRules.allClearResult({
            board: state.board,
            playerCleared: true,
            challenge: state.gameType === 'challenge',
            pendingGarbage: state.challengeState.pendingGarbage,
          });
          if (allClear.triggered) {
            state.score += allClear.score;
            state.allClearCount++;
            state.turnStats.scoreGained += allClear.score;
            state.turnStats.allClearDefense += allClear.defense;
            emit('allClear', { score: allClear.score, defense: allClear.defense });
          }
        }
        if (!taskSettled && settleChallengeTurn(chain)) return;
        if (chain > 2) emit('chainResult', Object.assign({ chain: chain - 1 }, state.chainFeedback));
        openPendingChoiceOrContinue();
        return;
      }

      const colors = new Set(groups.map((group) => group.color));
      if (taskSettled) state.chainFeedback.rewardChain = true;
      const cells = groups.flatMap((group) => group.cells);
      const modifiers = state.gameType === 'challenge' ? rogueliteRules.modifiers(state.runBuild) : rogueliteRules.modifiers({});
      const clearEffects = challengeEffects.resolveClear({
        active: state.gameType === 'challenge',
        board: state.board,
        cells,
        groups,
        modifiers,
        cleanerUsed: state.turnStats.cleanerUsed,
        allowCleaner: !taskSettled,
      });
      state.turnStats.cleanerUsed = clearEffects.cleanerUsed;
      clearEffects.triggered.forEach((upgradeId) => emit('upgradeTriggered', { upgradeId }));
      const multiplier = chain >= 3 ? modifiers.chainScoreMultiplier : 1;
      if (multiplier > 1) emit('upgradeTriggered', { upgradeId: 'chainEcho' });
      const scoring = scoringRules.calculate({
        chain,
        colorCount: colors.size,
        groupSizes: groups.map((group) => group.cells.length),
        clearedCount: cells.length,
        scoreMultiplier: multiplier,
      });
      state.score += scoring.score;
      state.clearedTotal += cells.length;
      state.runMaxChain = Math.max(state.runMaxChain, chain);
      state.bestChain = Math.max(state.bestChain, chain);
      const previousLevel = state.level;
      state.level = Math.min(12, Math.floor(state.clearedTotal / 35) + 1);
      if (state.level > previousLevel) emit('levelUp', { level: state.level, previousLevel });
      state.chainFeedback.score += scoring.score;
      state.chainFeedback.cleared += cells.length;
      state.chainFeedback.garbage += clearEffects.destroyedGarbage || 0;
      if (state.gameType === 'challenge' && !taskSettled) {
        if (state.turnStats.missionBaseProgress == null) state.turnStats.missionBaseProgress = state.challengeState.mission.progress || 0;
        state.turnStats.maxChain = Math.max(state.turnStats.maxChain, chain);
        state.turnStats.cleared += cells.length;
        state.turnStats.maxColors = Math.max(state.turnStats.maxColors, colors.size);
        const largest = groups.reduce((best, group) => group.cells.length > best.cells.length ? group : best, { cells: [], color: 0 });
        if (largest.cells.length > state.turnStats.largestGroup) {
          state.turnStats.largestGroup = largest.cells.length;
          state.turnStats.largestGroupColor = largest.color;
        }
        state.turnStats.garbageCleared += clearEffects.destroyedGarbage || 0;
        state.turnStats.scoreGained += scoring.score;
        state.turnStats.clearedThisTurn = true;
        state.turnStats.clearedColors = Array.from(new Set(state.turnStats.clearedColors.concat(Array.from(colors))));
        if (state.challengeState.mission.type === 'targetColor') {
          state.turnStats.colorClearedCount += groups.filter((group) => group.color === state.challengeState.mission.color).reduce((sum, group) => sum + group.cells.length, 0);
        }
        state.challengeState.garbageCleared += clearEffects.destroyedGarbage || 0;
      }
      emit('chain', { chain, score: scoring.score, cells, remoteLinks: clearEffects.remoteLinks || [] });
      const encodedCells = cells.map((cell) => [cell[0], cell[1], state.board[cell[1]][cell[0]]]);
      beginEffect('pop', { cells: cells.concat(clearEffects.garbageCells || []), coloredCells: encodedCells, garbageHits: clearEffects.garbageHits || [], chain }, {
        kind: 'clear',
        cells: encodedCells,
        garbageHits: clearEffects.garbageHits || [],
        chain,
        taskSettled: !!taskSettled,
      });
    }

    function softDrop() {
      if (!tryMove(0, 1)) return false;
      state.score += 1;
      emit('scoreChanged', { score: state.score, source: 'softDrop' });
      return true;
    }

    function hardDrop() {
      if (!state || state.mode !== 'playing' || !state.pair) return false;
      let distance = 0;
      // A pair can never travel farther than the board height. The bound also
      // protects the shared runtime from a malformed platform rule adapter.
      while (distance <= rows && tryMove(0, 1)) distance++;
      state.score += scoringRules.dropScore(distance);
      emit('hardDrop', { distance, score: state.score });
      lockPair();
      return true;
    }

    function swapNext() {
      if (!state || state.mode !== 'playing' || state.gameType !== 'challenge' || !state.pair) return false;
      const result = rogueliteRules.swapNext(state.runBuild, state.queue, state.challengeState.stage);
      state.runBuild = result.state;
      if (!result.swapped) return false;
      state.queue = result.queue;
      emit('upgradeTriggered', { upgradeId: 'nextSwap' });
      emit('nextSwapped', { remaining: result.remaining });
      return true;
    }

    function toggleBottle() {
      if (!state || state.mode !== 'playing' || state.gameType !== 'challenge' || !state.pair) return false;
      const result = activeItemRules.toggleMixBottle(state.itemState, true);
      state.itemState = result.state;
      if (result.changed) emit('bottleToggled', { armed: result.armed });
      return result.changed;
    }

    function gravityIntervalMs() {
      return gravityIntervalMsForLevel(state.level);
    }

    function tick(deltaMs) {
      if (!state) return null;
      const dt = Math.max(0, Math.min(40, Number(deltaMs) || 0));
      if (state.mode === 'playing' || state.mode === 'resolving') {
        state.activeDurationMs = Math.min(86400000, state.activeDurationMs + dt);
      }
      if (state.mode !== 'playing' || !state.pair) return view();
      state.gravityMs += dt;
      const interval = gravityIntervalMs();
      if (state.gravityMs >= interval) {
        state.gravityMs -= interval;
        tryMove(0, 1);
      }
      if (grounded()) {
        state.lockMs += dt;
        const delay = lockDelayMs();
        if (delay > LOCK_DELAY_MS && state.lockMs >= LOCK_DELAY_MS && !state.pair.steadyNotified) {
          state.pair.steadyNotified = true;
          emit('upgradeTriggered', { upgradeId: state.pair.swapLock ? 'nextSwap' : 'steadyHands' });
        }
        if (state.lockMs >= delay) lockPair();
      } else {
        state.lockMs = 0;
      }
      return view();
    }

    function dispatch(command) {
      const action = command || {};
      if (action.type === 'start') return start(action.gameType, action.records);
      if (action.type === 'restore') return restore(action.saved, action.records);
      if (action.type === 'move') return tryMove(action.direction < 0 ? -1 : 1, 0);
      if (action.type === 'rotate') return rotate(action.direction < 0 ? -1 : 1);
      if (action.type === 'softDrop') return softDrop();
      if (action.type === 'hardDrop') return hardDrop();
      if (action.type === 'swapNext') return swapNext();
      if (action.type === 'toggleBottle') return toggleBottle();
      if (action.type === 'chooseUpgrade' && state && state.mode === 'choosing') {
        const result = rogueliteRules.choose(state.runBuild, action.id, state.challengeState.completed);
        state.runBuild = result.state;
        if (!result.selected) return false;
        emit('upgradeChosen', { upgradeId: action.id });
        openPendingChoiceOrContinue();
        return true;
      }
      if (action.type === 'chooseRelic' && state && state.mode === 'choosing') {
        const result = rogueliteRules.chooseRelic(state.runBuild, action.id);
        state.runBuild = result.state;
        if (!result.selected) return false;
        emit('relicChosen', { relicId: action.id });
        openPendingChoiceOrContinue();
        return true;
      }
      if (action.type === 'chooseContract' && state && state.mode === 'contract') {
        const result = rogueliteRules.decideContract(state.runBuild, !!action.accept);
        state.runBuild = result.state;
        if (result.garbage) state.challengeState = challengeRules.enqueueDeferred(state.challengeState, result.garbage, 2);
        emit('contractDecided', { accepted: result.accepted, skipped: result.skipped });
        openPendingChoiceOrContinue();
        return result.accepted || result.skipped;
      }
      if (action.type === 'pause' && state && state.mode === 'playing') { state.mode = 'paused'; emit('stateChanged', { reason: 'paused' }); return true; }
      if (action.type === 'resume' && state && state.mode === 'paused') {
        if (state.resumeResolution) {
          state.resumeResolution = false;
          state.mode = 'resolving';
          resolveStep(1, true);
        } else {
          state.mode = 'playing';
        }
        emit('stateChanged', { reason: 'resumed' });
        return true;
      }
      return false;
    }

    function view() {
      if (!state) return null;
      let ghostCells = [];
      let activeCells = [];
      if (state.pair) {
        activeCells = boardRules.pairCells(state.pair, state.pair.x, state.pair.y, state.pair.rot);
        let ghostY = state.pair.y;
        let ghostSteps = 0;
        while (ghostSteps++ <= rows && !collidesAt(state.pair.x, ghostY + 1, state.pair.rot)) ghostY++;
        ghostCells = boardRules.pairCells(state.pair, state.pair.x, ghostY, state.pair.rot);
      }
      return {
        gameType: state.gameType,
        mode: state.mode,
        board: copyBoard(state.board),
        pair: copyPair(state.pair),
        activeCells,
        ghostCells,
        queue: copyQueue(state.queue),
        score: state.score,
        level: state.level,
        clearedTotal: state.clearedTotal,
        runMaxChain: state.runMaxChain,
        allClearCount: state.allClearCount,
        activeDurationMs: state.activeDurationMs,
        challengeState: state.challengeState,
        runBuild: state.runBuild,
        itemState: state.itemState,
        lockMs: state.lockMs,
        lockResets: state.lockResets,
        lockDelayMs: state.pair ? lockDelayMs() : LOCK_DELAY_MS,
        turnStats: state.turnStats,
        chainFeedback: state.chainFeedback,
        waitingEffect: state.waitingEffect ? { id: state.waitingEffect.id, type: state.waitingEffect.type } : null,
        resumeResolution: !!state.resumeResolution,
      };
    }

    function snapshot() {
      if (!state) return null;
      return Object.assign({}, view(), {
        schemaVersion: state.schemaVersion,
        savedAt: now(),
        highScore: state.highScore,
        bestChain: state.bestChain,
        hiAtStart: state.hiAtStart,
        bestChainAtStart: state.bestChainAtStart,
        gravityMs: state.gravityMs,
        quickTurnPending: state.quickTurnPending,
      });
    }

    function drainEvents() {
      const drained = events;
      events = [];
      return drained;
    }

    function ackEffect(effectId) {
      if (!state || !state.waitingEffect || state.waitingEffect.id !== effectId) return false;
      const effect = state.waitingEffect;
      state.waitingEffect = null;
      if (!effect.next) return true;
      if (effect.next.kind === 'resolve') resolveStep(effect.next.chain, effect.next.taskSettled);
      else if (effect.next.kind === 'clear') applyClearMutation(effect);
      else if (effect.next.kind === 'stageReward') applyStageReward(effect);
      else if (effect.next.kind === 'finishTurn') openPendingChoiceOrContinue();
      return true;
    }

    return Object.freeze({ start, restore, dispatch, tick, ackEffect, view, snapshot, drainEvents });
  }

  global.PuyoGameSession = Object.freeze({ VERSION, LOCK_DELAY_MS, MAX_LOCK_RESETS, colorCountForLevel, gravityIntervalMsForLevel, lockDelayMsFor, create });
})(typeof window !== 'undefined' ? window : globalThis);
