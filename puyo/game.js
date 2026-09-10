(function () {
  'use strict';

  if (!window.PuyoStorage || !window.PuyoAudio || !window.PuyoBoardRules || !window.PuyoRenderer || !window.PuyoUI || !window.PuyoInput || !window.PuyoSessionState || !window.PuyoChallengeEffects || !window.PuyoChallengeRules || !window.PuyoRogueliteRules) throw new Error('Puyo modules failed to load.');

  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const boardWrap = $('boardWrap');
  const boardArea = boardWrap.parentElement;
  const nextCanvas = $('nextCanvas');
  const scoreEl = $('score');
  const hiEl = $('hi');
  const levelEl = $('level');
  const runChainEl = $('runChain');
  const overlayEl = $('overlay');
  const ovTitle = $('ovTitle');
  const ovSub = $('ovSub');
  const ovBtn = $('ovBtn');
  const ovBack = $('ovBack');
  const resumeOverlay = $('resumeOverlay');
  const resumeSub = $('resumeSub');
  const btnResumeNew = $('btnResumeNew');
  const btnResumeContinue = $('btnResumeContinue');
  const btnPause = $('btnPause');
  const btnSound = $('btnSound');
  const icSoundOn = $('icSoundOn');
  const icSoundOff = $('icSoundOff');
  const chainPop = $('chainPop');
  const chainValue = $('chainValue');
  const chainLabel = $('chainLabel');
  const chainGain = $('chainGain');
  const chainResult = $('chainResult');
  const levelPop = $('levelPop');
  const modePicker = $('modePicker');
  const challengeCard = $('challengeCard');
  const challengeStage = $('challengeStage');
  const missionTitle = $('missionTitle');
  const missionScope = $('missionScope');
  const missionProgress = $('missionProgress');
  const missionDeadline = $('missionDeadline');
  const missionMeter = $('missionMeter');
  const garbageQueue = $('garbageQueue');
  const garbageCount = $('garbageCount');
  const garbageEta = $('garbageEta');
  const buildSummary = $('buildSummary');
  const buildButton = $('buildButton');
  const buildCount = $('buildCount');
  const buildChips = $('buildChips');
  const buildOverlay = $('buildOverlay');
  const buildDetails = $('buildDetails');
  const buildClose = $('buildClose');
  const nextPanel = nextCanvas.parentElement;
  const nextLabel = nextPanel.querySelector('.next-panel__label');
  const upgradeOverlay = $('upgradeOverlay');
  const upgradeChoices = $('upgradeChoices');
  const upgradeKicker = $('upgradeKicker');
  const specialBadge = $('specialBadge');

  const COLS = 6;
  const ROWS = 12;
  const COLORS = ['#ff5d8f', '#f6cf45', '#65dc70', '#4fc9e8', '#a979f7'];
  const DARKS = ['#bc2858', '#b98912', '#269b42', '#1686ac', '#6740bc'];
  const ROT = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const CHAIN_POWER = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512];
  const challengeRules = window.PuyoChallengeRules;
  const rogueliteRules = window.PuyoRogueliteRules;
  const GARBAGE = challengeRules.GARBAGE;
  const boardRules = window.PuyoBoardRules.create({ rows: ROWS, cols: COLS, garbage: GARBAGE, rotations: ROT });
  const challengeEffects = window.PuyoChallengeEffects.create({ challengeRules, rogueliteRules, boardRules, garbage: GARBAGE, rows: ROWS });
  const renderer = window.PuyoRenderer.create({ canvas, nextCanvas, boardWrap, boardArea, nextPanel, nextLabel, colors: COLORS, darks: DARKS, rows: ROWS, cols: COLS });
  const ui = window.PuyoUI.create({
    challengeRules,
    rogueliteRules,
    elements: {
      score: scoreEl, highScore: hiEl, level: levelEl, runChain: runChainEl,
      overlay: overlayEl, ovTitle, ovSub, ovBtn, ovBack, modePicker,
      challengeCard, challengeStage, specialBadge, missionTitle, missionScope,
      missionProgress, missionDeadline, missionMeter, garbageQueue, garbageCount,
      garbageEta, buildSummary, buildCount, buildChips, buildDetails,
      upgradeKicker, upgradeChoices, chainResult, chainValue, chainLabel,
      chainGain, chainPop, levelPop, btnPause, buildButton, buildClose,
      btnSound, btnResumeContinue, btnResumeNew,
    },
  });
  const HI_KEY = 'puyo_hi_v1';
  const CHALLENGE_HI_KEY = 'puyo_challenge_hi_v1';
  const CHAIN_KEY = 'puyo_chain_v1';
  const CHALLENGE_CHAIN_KEY = 'puyo_challenge_chain_v1';
  const SAVE_KEYS = { classic: 'puyo_save_v1', challenge: 'puyo_challenge_save_v1' };
  const MUTE_KEY = 'puyo_muted_v1';
  const storage = window.PuyoStorage.create({
    rows: ROWS,
    cols: COLS,
    garbage: GARBAGE,
    colorCount: COLORS.length,
    rotationCount: ROT.length,
    keys: {
      highScore: { classic: HI_KEY, challenge: CHALLENGE_HI_KEY },
      bestChain: { classic: CHAIN_KEY, challenge: CHALLENGE_CHAIN_KEY },
      save: SAVE_KEYS,
      muted: MUTE_KEY,
    },
  });
  const audio = window.PuyoAudio.create({ storage, button: btnSound, soundOnIcon: icSoundOn, soundOffIcon: icSoundOff });
  const sessionState = window.PuyoSessionState.create({ storage, challengeRules, rogueliteRules, emptyBoard: boardRules.emptyBoard });
  const ensureAudio = audio.ensure;
  const play = audio.play;
  const haptic = audio.haptic;

  let board = [];
  let pair = null;
  let queue = [];
  let mode = 'menu';
  let gameType = 'classic';
  let selectedGameType = 'challenge';
  let score = 0;
  let hi = storage.readHighScore('classic');
  let level = 1;
  let clearedTotal = 0;
  let bestChain = storage.readBestChain('classic');
  let runMaxChain = 0;
  let hiAtStart = hi;
  let bestChainAtStart = bestChain;
  let cell = 32;
  let lastT = 0;
  let gravityAcc = 0;
  let lockAcc = 0;
  let saveAcc = 0;
  let resolveToken = 0;
  let popDuration = 280;
  let fallDuration = 210;
  let input = null;
  let lockResets = 0;
  let resumeNeedsResolution = false;
  let challengeState = challengeRules.normalize({});
  let runBuild = rogueliteRules.normalize({}, 0);
  let turnStats = freshTurnStats();
  const triggeredUpgrades = new Set();
  const upgradeFlashTimers = new Map();
  let buildReturnMode = 'playing';

  function freshTurnStats() {
    return sessionState.freshTurnStats();
  }

  function hasUpgradeChoice() {
    return gameType === 'challenge' && runBuild.pendingChoice.length > 0;
  }

  function flashUpgrade(id) {
    if (!runBuild.upgrades[id]) return;
    triggeredUpgrades.add(id);
    clearTimeout(upgradeFlashTimers.get(id));
    updateChallengeHud();
    upgradeFlashTimers.set(id, setTimeout(() => {
      triggeredUpgrades.delete(id);
      upgradeFlashTimers.delete(id);
      updateChallengeHud();
    }, 720));
  }

  function flashGarbageDefense() {
    ui.flashGarbageDefense();
  }

  function renderUpgradeChoices() {
    ui.renderUpgradeChoices(runBuild);
  }

  function renderBuildDetails() {
    ui.renderBuildDetails(runBuild);
  }


  function openBuildOverlay() {
    if (gameType !== 'challenge' || !Object.keys(runBuild.upgrades).length || !['playing', 'paused'].includes(mode)) return;
    buildReturnMode = mode;
    mode = 'build';
    btnPause.hidden = true;
    renderBuildDetails();
    buildOverlay.hidden = false;
  }

  function closeBuildOverlay() {
    if (mode !== 'build') return;
    buildOverlay.hidden = true;
    mode = buildReturnMode === 'paused' ? 'paused' : 'playing';
    btnPause.hidden = mode !== 'playing';
    lastT = performance.now();
  }

  function openUpgradeChoice() {
    if (!hasUpgradeChoice()) return false;
    mode = 'choosing';
    btnPause.hidden = true;
    renderUpgradeChoices();
    upgradeOverlay.hidden = false;
    saveState();
    return true;
  }

  function selectGameType(type) {
    selectedGameType = type === 'classic' ? 'classic' : 'challenge';
    ui.selectGameType(selectedGameType);
  }

  function updateChallengeHud() {
    ui.renderChallenge({
      active: gameType === 'challenge' && ['playing', 'paused', 'resolving'].includes(mode),
      challengeState,
      mode,
      turnStats,
      runBuild,
      triggeredUpgrades,
    });
  }

  function showChallengeMessage(text, complete, duration) {
    ui.showChallengeMessage(text, complete, duration);
  }


  const emptyBoard = boardRules.emptyBoard;

  function colorCount() {
    return level >= 6 ? 5 : 4;
  }

  function randomPair() {
    const count = colorCount();
    return [1 + Math.floor(Math.random() * count), 1 + Math.floor(Math.random() * count)];
  }

  function fillQueue() {
    while (queue.length < 3) queue.push(randomPair());
  }

  function pairCells(p, x, y, rot) {
    return boardRules.pairCells(p, x, y, rot);
  }

  function currentCells() {
    return pair ? pairCells(pair, pair.x, pair.y, pair.rot) : [];
  }

  function collidesAt(x, y, rot) {
    return boardRules.collides(board, pair, x, y, rot);
  }

  function spawnPair() {
    fillQueue();
    pair = { x: 2, y: 0, rot: 0, colors: queue.shift() };
    fillQueue();
    gravityAcc = 0;
    lockAcc = 0;
    lockResets = 0;
    drawNext();
    if (collidesAt(pair.x, pair.y, pair.rot)) gameOver();
  }

  function tryMove(dx, dy) {
    if (mode !== 'playing' || !pair) return false;
    if (collidesAt(pair.x + dx, pair.y + dy, pair.rot)) return false;
    pair.x += dx;
    pair.y += dy;
    if (dx && collidesAt(pair.x, pair.y + 1, pair.rot)) {
      if (lockResets < 12) { lockAcc = 0; lockResets++; }
    } else {
      lockAcc = 0;
    }
    if (dx) play('move');
    return true;
  }

  function rotate(dir) {
    if (mode !== 'playing' || !pair) return false;
    const next = (pair.rot + dir + 4) % 4;
    const kicks = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
    for (const k of kicks) {
      if (!collidesAt(pair.x + k[0], pair.y + k[1], next)) {
        pair.x += k[0];
        pair.y += k[1];
        pair.rot = next;
        if (collidesAt(pair.x, pair.y + 1, pair.rot)) {
          if (lockResets < 12) { lockAcc = 0; lockResets++; }
        } else {
          lockAcc = 0;
        }
        play('rotate');
        haptic(7);
        return true;
      }
    }
    return false;
  }

  function softDrop() {
    if (tryMove(0, 1)) {
      score += 1;
      updateHud();
      return true;
    }
    return false;
  }

  function hardDrop() {
    if (mode !== 'playing' || !pair) return;
    let distance = 0;
    while (tryMove(0, 1)) distance++;
    score += distance * 2;
    updateHud();
    play('drop');
    haptic(16);
    lockPair();
  }

  function lockPair() {
    if (!pair || mode !== 'playing') return;
    const cells = currentCells();
    if (cells.some((p) => p.y < 0)) {
      gameOver();
      return;
    }
    for (const p of cells) board[p.y][p.x] = p.color;
    pair = null;
    mode = 'resolving';
    btnPause.hidden = true;
    // 横向组合落在高低不平处时，两颗噗呦应分别沉降到各自的支撑面。
    applyGravity(true);
    play('land');
    haptic(9);
    resolveStep(1, ++resolveToken);
  }

  function findClearGroups() {
    return boardRules.findClearGroups(board);
  }

  const groupBonus = boardRules.groupBonus;

  function animateStageReward(cells, incomingCount, token) {
    popDuration = 340;
    renderer.startPop(cells, popDuration);
    const incomingDuration = incomingCount ? 590 + Math.max(0, incomingCount - 1) * 55 : 0;
    fallDuration = popDuration + 220 + incomingDuration;
    setTimeout(() => {
      if (token !== resolveToken || mode !== 'resolving') return;
      cells.forEach((p) => {
        if (board[p[1]][p[0]] !== GARBAGE) return;
        renderer.burst(p[0], p[1], GARBAGE, 2);
        board[p[1]][p[0]] = 0;
      });
      renderer.clearPop();
      play('clear', 2);
      applyGravity(true);
      setTimeout(() => {
        if (token !== resolveToken || mode !== 'resolving') return;
        if (!incomingCount) return;
        const placed = challengeRules.placeGarbage(board, incomingCount, Math.random, GARBAGE);
        if (placed.length) startGarbageFall(placed);
      }, 210);
    }, popDuration);
  }

  function finishChallengeTurn(token) {
    if (gameType !== 'challenge') return;
    const result = challengeEffects.settleTurn({
      challengeState,
      runBuild,
      turnStats,
      board,
      random: Math.random,
    });
    challengeState = result.challengeState;
    runBuild = result.runBuild;
    result.triggered.forEach(flashUpgrade);
    score += result.scoreBonus;
    if (result.removed.length) animateStageReward(result.removed, result.incomingCount, token);
    else if (result.placed.length) startGarbageFall(result.placed);
    if (result.defenseFlash) flashGarbageDefense();
    if (result.message) showChallengeMessage(result.message.text, result.message.complete, result.message.duration);
    turnStats = freshTurnStats();
    updateChallengeHud();
    updateHud();
    return result.waitsForBoard;
  }


  function resolveStep(chain, token, taskSettled = false) {
    if (token !== resolveToken) return;
    const groups = findClearGroups();
    if (!groups.length) {
      renderer.clearPop();
      if (chain > 2) showChainResult(chain - 1);
      // Reward gravity may form another clear. Finish it before spawning,
      // without spending another turn or crediting the newly issued task.
      if (!taskSettled && finishChallengeTurn(token)) {
        setTimeout(() => resolveStep(chain, token, true), fallDuration);
        return;
      }
      if (openUpgradeChoice()) return;
      mode = 'playing';
      btnPause.hidden = false;
      spawnPair();
      saveState();
      return;
    }

    const colors = new Set(groups.map((g) => g.color));
    const cells = groups.flatMap((g) => g.cells);
    const modifiers = gameType === 'challenge' ? rogueliteRules.modifiers(runBuild) : rogueliteRules.modifiers({});
    const clearEffects = challengeEffects.resolveClear({ active: gameType === 'challenge', board, cells, groups, modifiers });
    const garbageCells = clearEffects.garbageCells;
    clearEffects.triggered.forEach(flashUpgrade);
    clearEffects.remoteLinks.forEach((link) => renderer.addRemoteLink(link.from, link.to));
    const clearingCells = cells.concat(garbageCells);
    const chainPower = CHAIN_POWER[Math.min(chain - 1, CHAIN_POWER.length - 1)];
    const colorBonus = colors.size <= 1 ? 0 : Math.pow(2, colors.size + 1);
    const sizeBonus = groups.reduce((sum, g) => sum + groupBonus(g.cells.length), 0);
    const multiplier = Math.max(1, chainPower + colorBonus + sizeBonus);
    const chainScoreMultiplier = chain >= 3 ? modifiers.chainScoreMultiplier : 1;
    if (chainScoreMultiplier > 1) flashUpgrade('chainEcho');
    const gained = Math.round(cells.length * 10 * multiplier * chainScoreMultiplier);

    const previousLevel = level;
    score += gained;
    clearedTotal += cells.length;
    if (gameType === 'challenge' && !taskSettled) {
      if (turnStats.missionBaseProgress == null) turnStats.missionBaseProgress = challengeState.mission.progress || 0;
      turnStats.maxChain = Math.max(turnStats.maxChain, chain);
      turnStats.cleared += cells.length;
      turnStats.maxColors = Math.max(turnStats.maxColors, colors.size);
      turnStats.largestGroup = Math.max(turnStats.largestGroup, ...groups.map((group) => group.cells.length));
      turnStats.garbageCleared += garbageCells.length;
      turnStats.scoreGained += gained;
      turnStats.clearedThisTurn = true;
      turnStats.clearedColors = Array.from(new Set(turnStats.clearedColors.concat(Array.from(colors))));
      if (challengeState.mission.type === 'targetColor') turnStats.colorClearedCount += groups.filter((group) => group.color === challengeState.mission.color).reduce((sum, group) => sum + group.cells.length, 0);
      updateChallengeHud();
    }
    if (gameType === 'challenge') challengeState.garbageCleared += garbageCells.length;
    level = Math.min(12, Math.floor(clearedTotal / 35) + 1);
    runMaxChain = Math.max(runMaxChain, chain);
    if (chain > bestChain) {
      bestChain = chain;
      storage.writeBestChain(gameType, bestChain);
    }
    updateHud();
    showChain(chain, gained);
    if (level > previousLevel) showLevel(level);
    play(chain > 1 ? 'chain' : 'clear', chain);
    haptic(chain >= 3 ? [22, 28, 22 + chain * 2] : chain > 1 ? [16, 24, 16] : 10);
    if (chain >= 2) shakeBoard(chain);

    popDuration = Math.max(170, 300 - (chain - 1) * 22);
    renderer.startPop(clearingCells, popDuration);

    setTimeout(() => {
      if (token !== resolveToken) return;
      for (const p of clearingCells) {
        renderer.burst(p[0], p[1], board[p[1]][p[0]], chain);
        board[p[1]][p[0]] = 0;
      }
      renderer.clearPop();
      renderer.clearRemoteLinks();
      applyGravity(true);
      const settleDelay = Math.max(120, 225 - (chain - 1) * 14);
      setTimeout(() => resolveStep(chain + 1, token, taskSettled), settleDelay);
    }, popDuration);
  }

  function applyGravity(animate) {
    const result = boardRules.applyGravity(board, animate);
    board = result.board;
    fallDuration = 190;
    renderer.startFall(result.offsets, fallDuration);
  }

  function startGarbageFall(cells) {
    fallDuration = 590 + Math.max(0, cells.length - 1) * 55;
    renderer.startGarbageFall(cells, fallDuration);
    play('drop', 0.72);
    haptic(18);
  }

  function showChain(chain, gained) {
    ui.showChain(chain, gained);
  }

  function showChainResult(chain) {
    ui.showChainResult(chain);
  }

  function showLevel(nextLevel) {
    ui.showLevel(nextLevel);
    play('level', nextLevel);
    haptic([16, 28, 24]);
  }


  function shakeBoard(chain) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const strength = Math.min(7, 2 + chain);
    boardWrap.style.setProperty('--shake', strength + 'px');
    boardWrap.style.setProperty('--shake-neg', -strength + 'px');
    boardWrap.style.setProperty('--shake-soft', Math.round(strength * 0.7) + 'px');
    boardWrap.style.setProperty('--shake-soft-neg', -Math.round(strength * 0.7) + 'px');
    boardWrap.classList.remove('is-shaking');
    void boardWrap.offsetWidth;
    boardWrap.classList.add('is-shaking');
    setTimeout(() => boardWrap.classList.remove('is-shaking'), 260);
  }

  function gravityInterval() {
    return Math.max(0.18, 0.9 - (level - 1) * 0.055);
  }

  function update(dt) {
    renderer.update(dt);
    if (mode !== 'playing' || !pair) return;
    gravityAcc += dt;
    if (gravityAcc >= gravityInterval()) {
      gravityAcc -= gravityInterval();
      tryMove(0, 1);
    }
    if (collidesAt(pair.x, pair.y + 1, pair.rot)) {
      lockAcc += dt;
      const lockMultiplier = gameType === 'challenge' ? rogueliteRules.modifiers(runBuild).lockDelayMultiplier : 1;
      if (lockMultiplier > 1 && lockAcc >= 0.48 && !pair.steadyNotified) {
        pair.steadyNotified = true;
        flashUpgrade('steadyHands');
      }
      if (lockAcc >= 0.48 * lockMultiplier) lockPair();
    } else {
      lockAcc = 0;
    }
  }

  function newGame() {
    resolveToken++;
    resumeNeedsResolution = false;
    gameType = selectedGameType;
    hi = storage.readHighScore(gameType);
    bestChain = storage.readBestChain(gameType);
    board = emptyBoard();
    queue = [];
    pair = null;
    score = 0;
    level = 1;
    clearedTotal = 0;
    runMaxChain = 0;
    hiAtStart = hi;
    bestChainAtStart = bestChain;
    challengeState = challengeRules.normalize({});
    runBuild = rogueliteRules.normalize({}, 0);
    turnStats = freshTurnStats();
    renderer.resetEffects();
    triggeredUpgrades.clear();
    upgradeFlashTimers.forEach((timer) => clearTimeout(timer));
    upgradeFlashTimers.clear();
    ui.resetTransient();
    fillQueue();
    mode = 'playing';
    overlayEl.hidden = true;
    resumeOverlay.hidden = true;
    upgradeOverlay.hidden = true;
    buildOverlay.hidden = true;
    btnPause.hidden = false;
    modePicker.hidden = true;
    spawnPair();
    updateHud();
    updateChallengeHud();
    saveState();
    play('start');
  }

  function gameOver() {
    resolveToken++;
    pair = null;
    setMode('gameover');
    clearState();
    play('over');
    haptic([70, 45, 90]);
    updateHud();
  }

  function setMode(next) {
    mode = next;
    resumeOverlay.hidden = true;
    if (next === 'menu' || next === 'paused' || next === 'gameover') {
      showOverlay(next);
      btnPause.hidden = true;
    } else {
      overlayEl.hidden = true;
      btnPause.hidden = false;
    }
  }

  function showOverlay(kind) {
    ui.showOverlay(kind, {
      selectedGameType,
      gameType,
      score,
      level,
      runMaxChain,
      bestChain,
      clearedTotal,
      hiAtStart,
      bestChainAtStart,
      challengeState,
    });
    selectGameType(kind === 'gameover' ? gameType : selectedGameType);
    updateChallengeHud();
  }


  function togglePause() {
    if (input) input.stop();
    if (mode === 'playing') {
      setMode('paused');
      saveState();
    } else if (mode === 'paused') {
      lastT = performance.now();
      setMode('playing');
    }
  }

  function updateHud() {
    if (score > hi) {
      hi = score;
      storage.writeHighScore(gameType, hi);
    }
    ui.renderHud({ score, highScore: hi, level, runChain: runMaxChain });
  }

  function saveState() {
    if (mode !== 'playing' && mode !== 'paused' && mode !== 'choosing' && mode !== 'build') return;
    storage.save(gameType, sessionState.snapshot({ gameType, board, pair, queue, score, level, clearedTotal, runMaxChain, hiAtStart, bestChainAtStart, challengeState, runBuild }));
  }

  function restoreState(s) {
    gameType = s.gameType === 'challenge' ? 'challenge' : 'classic';
    selectedGameType = gameType;
    hi = storage.readHighScore(gameType);
    bestChain = storage.readBestChain(gameType);
    const restored = sessionState.restore(s, { highScore: hi, bestChain });
    board = restored.board;
    pair = restored.pair;
    queue = restored.queue;
    score = restored.score;
    level = restored.level;
    clearedTotal = restored.clearedTotal;
    runMaxChain = restored.runMaxChain;
    hiAtStart = restored.hiAtStart;
    bestChainAtStart = restored.bestChainAtStart;
    challengeState = restored.challengeState;
    runBuild = restored.runBuild;
    turnStats = freshTurnStats();
    fillQueue();
    // Older builds could save a board after a delayed Stage reward changed it,
    // leaving an already-complete group underneath an active pair. Preserve the
    // pair by returning it to the queue, then finish that pending resolution when
    // the player chooses to continue.
    resumeNeedsResolution = findClearGroups().length > 0;
    if (resumeNeedsResolution && pair) {
      queue.unshift(pair.colors.slice());
      pair = null;
    }
    if (!resumeNeedsResolution && !hasUpgradeChoice() && (!pair || collidesAt(pair.x, pair.y, pair.rot))) spawnPair();
    updateHud();
    drawNext();
    updateChallengeHud();
    return mode !== 'gameover' && (!!pair || hasUpgradeChoice() || resumeNeedsResolution);
  }

  function clearState() {
    storage.clear(gameType);
  }

  function resize() {
    cell = renderer.resize();
    drawNext();
  }


  function drawBoard() {
    let ghostCells = [];
    let activeCells = [];
    if (pair && (mode === 'playing' || mode === 'paused')) {
      let ghostY = pair.y;
      while (!collidesAt(pair.x, ghostY + 1, pair.rot)) ghostY++;
      ghostCells = pairCells(pair, pair.x, ghostY, pair.rot).filter((position) => position.y >= 0);
      activeCells = currentCells().filter((position) => position.y >= 0);
    }
    renderer.drawBoard({ board, ghostCells, activeCells });
  }


  function drawNext() {
    const foresight = gameType === 'challenge' ? rogueliteRules.modifiers(runBuild).foresightLevel : 0;
    renderer.drawNext(queue, foresight);
  }

  function frame(now) {
    if (!lastT) lastT = now;
    const dt = Math.min((now - lastT) / 1000, 0.04);
    lastT = now;
    update(dt);
    saveAcc += dt;
    if (saveAcc >= 1) { saveAcc -= 1; saveState(); }
    drawBoard();
    requestAnimationFrame(frame);
  }

  function action(name) {
    ensureAudio();
    if (name === 'left') tryMove(-1, 0);
    else if (name === 'right') tryMove(1, 0);
    else if (name === 'down') softDrop();
    else if (name === 'cw') rotate(1);
    else if (name === 'ccw') rotate(-1);
    else if (name === 'drop') hardDrop();
  }

  input = window.PuyoInput.create({
    controls: document.querySelectorAll('.ctl'),
    boardWrap,
    document,
    onAction: action,
    onPause: togglePause,
    isBuildOpen: () => mode === 'build',
    onCloseBuild: closeBuildOverlay,
  });


  ui.bindActions({
    pause: togglePause,
    openBuild: openBuildOverlay,
    closeBuild: closeBuildOverlay,
    toggleSound: audio.toggle,
    selectMode(type) {
      selectGameType(type);
      hi = storage.readHighScore(selectedGameType);
      bestChain = storage.readBestChain(selectedGameType);
      ui.renderHud({ score, highScore: hi, level, runChain: runMaxChain });
      if (mode === 'menu') showOverlay('menu');
    },
    primary() {
      ensureAudio();
      if (mode === 'menu' || mode === 'gameover') newGame();
      else if (mode === 'paused') setMode('playing');
    },
    resume() {
      resumeOverlay.hidden = true;
      lastT = performance.now();
      if (resumeNeedsResolution) {
        resumeNeedsResolution = false;
        mode = 'resolving';
        btnPause.hidden = true;
        resolveStep(1, ++resolveToken, true);
      } else if (!openUpgradeChoice()) {
        mode = 'playing';
        btnPause.hidden = false;
      }
      updateChallengeHud();
      ensureAudio();
    },
    resumeNew() {
      resumeOverlay.hidden = true;
      selectedGameType = gameType;
      mode = 'menu';
      showOverlay('menu');
    },
    chooseUpgrade(id) {
      if (mode !== 'choosing') return;
      const result = rogueliteRules.choose(runBuild, id, challengeState.completed);
      if (!result.selected) return;
      runBuild = result.state;
      upgradeOverlay.hidden = true;
      mode = 'playing';
      btnPause.hidden = false;
      if (!pair) spawnPair();
      updateChallengeHud();
      drawNext();
      showChallengeMessage(result.selected.name + ' · 已强化', true);
      play('level', challengeState.stage);
      haptic([14, 30, 20]);
      saveState();
    },
  });


  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', saveState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && mode === 'playing') togglePause();
  });

  board = emptyBoard();
  fillQueue();
  resize();
  updateHud();
  const saved = storage.loadLatest();
  if (saved && storage.validBoard(saved.board)) {
    if (restoreState(saved)) {
      mode = 'resume';
      resumeSub.textContent = (gameType === 'challenge' ? '挑战模式' : '经典模式') + ' · 得分 ' + score + ' · 等级 ' + level + ' · 本局最高连锁 ' + runMaxChain;
      resumeOverlay.hidden = false;
      btnPause.hidden = true;
    } else {
      clearState();
      board = emptyBoard();
      queue = [];
      pair = null;
      fillQueue();
      drawNext();
      setMode('menu');
    }
  } else {
    setMode('menu');
  }
  requestAnimationFrame(frame);

  if (window.__DSH_TEST__ || new URLSearchParams(location.search).has('test')) {
    window.__puyoTest = {
      getState: () => ({ board: board.map((r) => r.slice()), pair: pair ? JSON.parse(JSON.stringify(pair)) : null, score, level, mode, gameType, runMaxChain, bestChain, clearedTotal, challengeState: JSON.parse(JSON.stringify(challengeState)), runBuild: JSON.parse(JSON.stringify(runBuild)) }),
      setBoard: (next) => { if (storage.validBoard(next)) board = next.map((r) => r.slice()); },
      setPair: (next) => {
        if (storage.validPair(next)) pair = JSON.parse(JSON.stringify(next));
      },
      setProgress: (cleared, nextScore) => {
        clearedTotal = Math.max(0, Number(cleared) || 0);
        level = Math.min(12, Math.floor(clearedTotal / 35) + 1);
        if (Number.isFinite(nextScore)) score = Math.max(0, nextScore);
        updateHud();
      },
      resolve: () => { mode = 'resolving'; pair = null; resolveStep(1, ++resolveToken); },
      hardDrop: hardDrop,
      newGame: (type) => { if (type) selectGameType(type); newGame(); },
      selectMode: selectGameType,
      resolveChallengeTurn: (stats) => challengeRules.resolveTurn(challengeState, stats || turnStats, () => 0),
      placeGarbage: (count) => {
        const placed = challengeRules.placeGarbage(board, count, () => 0, GARBAGE);
        startGarbageFall(placed);
        return placed;
      },
    };
  }
})();
