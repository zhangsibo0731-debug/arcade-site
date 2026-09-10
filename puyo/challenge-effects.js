(function (global) {
  'use strict';

  const VERSION = 1;

  function create(options) {
    const challengeRules = options.challengeRules;
    const rogueliteRules = options.rogueliteRules;
    const boardRules = options.boardRules;
    const garbage = options.garbage;
    const rows = options.rows;

    function resolveClear(view) {
      if (!view.active) return { garbageCells: [], remoteLinks: [], triggered: [] };
      let garbageCells = challengeRules.adjacentGarbage(view.board, view.cells, garbage);
      const excluded = new Set(garbageCells.map((position) => position[0] + ',' + position[1]));
      const remoteLinks = [];
      const triggered = [];
      if (garbageCells.length && view.modifiers.cleanerClear) {
        const cleanerCells = boardRules.garbageCandidates(view.board, excluded, view.cells).slice(0, view.modifiers.cleanerClear);
        cleanerCells.forEach((position) => excluded.add(position[0] + ',' + position[1]));
        garbageCells = garbageCells.concat(cleanerCells);
        if (cleanerCells.length) triggered.push('cleaner');
      }
      if (view.modifiers.colorBurstThreshold && view.groups.some((group) => group.cells.length >= view.modifiers.colorBurstThreshold)) {
        const burstCells = boardRules.garbageCandidates(view.board, excluded, view.cells).slice(0, view.modifiers.colorBurstClear);
        if (burstCells.length) {
          const source = view.cells[Math.floor(view.cells.length / 2)];
          burstCells.forEach((target) => {
            excluded.add(target[0] + ',' + target[1]);
            remoteLinks.push({ from: source, to: target });
          });
          garbageCells = garbageCells.concat(burstCells);
          triggered.push('colorBurst');
        }
      }
      return { garbageCells, remoteLinks, triggered };
    }

    function settleTurn(view) {
      const stageBefore = view.challengeState.stage;
      const occupiedTop = view.board.findIndex((row) => row.some(Boolean));
      view.turnStats.boardHeight = occupiedTop < 0 ? 0 : rows - occupiedTop;
      const modifiers = rogueliteRules.modifiers(view.runBuild);
      const triggered = [];
      if (view.turnStats.maxChain >= 2 && modifiers.chainDefense) {
        view.turnStats.extraDefense += modifiers.chainDefense;
        triggered.push('chainShield');
      }
      if (modifiers.largeGroupThreshold && view.turnStats.largestGroup >= modifiers.largeGroupThreshold) {
        view.turnStats.extraDefense += modifiers.largeGroupDefense;
        triggered.push('largeGroup');
      }
      const outcome = challengeRules.resolveTurn(view.challengeState, view.turnStats);
      const challengeState = outcome.state;
      let runBuild = view.runBuild;
      if (outcome.specialCompleted) runBuild = rogueliteRules.offerSpecial(runBuild, challengeState.completed, view.random);
      else if (outcome.completed) runBuild = rogueliteRules.offer(runBuild, challengeState.completed, view.random);
      let removed = [];
      let scoreBonus = 0;
      if (outcome.reward) {
        removed = boardRules.garbageCandidates(view.board, new Set(), []).slice(0, outcome.reward);
        challengeState.garbageCleared += removed.length;
        scoreBonus = outcome.bonus;
      }
      let pressure = outcome.pressure;
      let buffered = 0;
      if (pressure && modifiers.bufferReduction && runBuild.bufferedStage !== challengeState.stage) {
        pressure = Math.max(0, pressure - modifiers.bufferReduction);
        buffered = outcome.pressure - pressure;
        runBuild.bufferedStage = challengeState.stage;
        if (buffered) triggered.push('buffer');
      }
      const incomingCount = pressure + (outcome.entryGarbage || 0);
      const placed = removed.length ? [] : (incomingCount ? challengeRules.placeGarbage(view.board, incomingCount, view.random, garbage) : []);
      const clearText = removed.length ? ' · 清障 ×' + removed.length : '';
      let message = null;
      if (outcome.enteredSpecial) message = { text: 'STAGE ' + stageBefore + ' 完成' + clearText + '\n特殊关：' + challengeState.special.title, complete: true, duration: 1650 };
      else if (outcome.specialCompleted) message = { text: '特殊关完成 → STAGE ' + challengeState.stage + clearText + '\n奖励 +' + outcome.bonus, complete: true, duration: 1650 };
      else if (outcome.completed) message = { text: 'STAGE ' + stageBefore + ' 完成 → STAGE ' + challengeState.stage + clearText + '\n奖励 +' + outcome.bonus + (outcome.canceled ? ' · 抵消 ×' + outcome.canceled : ''), complete: true, duration: 1550 };
      else if (outcome.specialFailed) message = { text: '特殊关失败 · STAGE ' + stageBefore + ' 保持不变\n惩罚干扰 ×' + outcome.specialPenalty, complete: false, duration: 1900 };
      else if (placed.length) message = { text: (outcome.canceled ? '抵消 × ' + outcome.canceled + ' · ' : '') + (buffered ? '缓冲 × ' + buffered + ' · ' : '') + '干扰落下 × ' + placed.length, complete: false };
      else if (buffered) message = { text: '缓冲层抵消 · × ' + buffered, complete: true };
      else if (outcome.canceled) message = { text: (outcome.pressureTriggered ? '干扰全部抵消!' : '干扰抵消') + ' · × ' + outcome.canceled, complete: outcome.pressureTriggered };
      else if (outcome.expired) message = { text: '任务失败 · STAGE ' + stageBefore + ' 保持不变\n已更换新任务', complete: false, duration: 1800 };
      return { challengeState, runBuild, outcome, modifiers, triggered, removed, placed, incomingCount, buffered, scoreBonus, message, defenseFlash: !!(outcome.canceled || buffered), waitsForBoard: removed.length > 0 || placed.length > 0 };
    }

    return Object.freeze({ resolveClear, settleTurn });
  }

  global.PuyoChallengeEffects = Object.freeze({ VERSION, create });
})(typeof window !== 'undefined' ? window : globalThis);
