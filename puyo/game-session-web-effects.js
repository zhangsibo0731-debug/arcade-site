(function (global) {
  'use strict';

  const FALL_BASE_MS = 190;
  const RECOLOR_MS = 1120;
  const STAGE_REWARD_MS = 340;

  function popDuration(chain) {
    return chain === 1 ? 300 : Math.min(430, 330 + (chain - 2) * 30);
  }

  function fallDuration(chain) {
    return Math.min(250, FALL_BASE_MS + Math.max(0, chain - 1) * 18);
  }

  function create(options) {
    const session = options.session;
    const renderer = options.renderer;
    const ui = options.ui || {};
    const play = typeof options.play === 'function' ? options.play : function () {};
    const haptic = typeof options.haptic === 'function' ? options.haptic : function () {};
    const music = options.music || {};
    const setTimer = options.setTimeout || global.setTimeout.bind(global);
    const clearTimer = options.clearTimeout || global.clearTimeout.bind(global);
    const onState = typeof options.onState === 'function' ? options.onState : function () {};
    let generation = 0;
    let timers = new Set();

    function later(callback, delay) {
      const current = generation;
      const timer = setTimer(function () {
        timers.delete(timer);
        if (current === generation) callback();
      }, delay);
      timers.add(timer);
      return timer;
    }

    function acknowledge(event, delay) {
      later(function () {
        session.ackEffect(event.id);
        pump();
      }, delay);
    }

    function handle(event) {
      if (event.type === 'recolor') {
        renderer.startRecolor(event.cells, RECOLOR_MS, event.sourceColor, event.targetColor);
        if (ui.showBottleTransform) ui.showBottleTransform(event.sourceColor, event.targetColor, RECOLOR_MS);
        later(function () { play('potion'); haptic([10, 22, 14]); }, 310);
        acknowledge(event, RECOLOR_MS);
        return;
      }
      if (event.type === 'pop') {
        const duration = popDuration(event.chain);
        renderer.startPop(event.cells, duration);
        later(function () {
          if (renderer.burst) (event.coloredCells || []).forEach((cell) => renderer.burst(cell[0], cell[1], cell[2], event.chain));
          session.ackEffect(event.id);
          pump();
        }, duration);
        return;
      }
      if (event.type === 'fall') {
        const duration = fallDuration(event.chain || 1);
        if (renderer.clearPop) renderer.clearPop();
        if (renderer.clearRemoteLinks) renderer.clearRemoteLinks();
        renderer.startFall(new Map(event.offsets || []), duration);
        acknowledge(event, duration + Math.min(90, 35 + Math.max(0, (event.chain || 1) - 1) * 12));
        return;
      }
      if (event.type === 'stageReward') {
        renderer.startPop((event.hits || []).map((hit) => hit.cell), STAGE_REWARD_MS);
        acknowledge(event, STAGE_REWARD_MS);
        return;
      }
      if (event.type === 'garbageFall') {
        const duration = 590 + Math.max(0, (event.cells || []).length - 1) * 55;
        renderer.startGarbageFall(event.cells || [], duration);
        play('drop', 0.72);
        haptic(18);
        acknowledge(event, duration);
        return;
      }
      if (event.type === 'chain') {
        if (renderer.addRemoteLink) (event.remoteLinks || []).forEach((link) => renderer.addRemoteLink(link.from, link.to));
        if (ui.showChain) ui.showChain(event.chain, event.score);
        if (music.onChain) music.onChain(event.chain);
        play(event.chain > 1 ? 'chain' : 'clear', event.chain);
        haptic(event.chain >= 3 ? [22, 28, 22 + event.chain * 2] : event.chain > 1 ? [16, 24, 16] : 10);
      } else if (event.type === 'move') {
        play('move');
      } else if (event.type === 'rotate') {
        play('rotate');
      } else if (event.type === 'hardDrop') {
        play('drop');
        haptic(16);
      } else if (event.type === 'land') {
        play('land');
        haptic(9);
      } else if (event.type === 'levelUp') {
        if (ui.showLevel) ui.showLevel(event.level);
        play('level', event.level);
      } else if (event.type === 'allClear') {
        if (ui.showAllClear) ui.showAllClear(event.defense || 0, 0);
        if (music.onAllClear) music.onAllClear();
        play('allclear');
        haptic([22, 28, 36, 28, 48]);
      } else if (event.type === 'message' && ui.showChallengeMessage) {
        ui.showChallengeMessage(event.text, event.complete, event.duration);
      } else if (event.type === 'chainResult' && ui.showChainResult) {
        ui.showChainResult(event);
        if (music.onChainEnd) music.onChainEnd(event.chain);
      } else if (event.type === 'stateChanged' && event.reason === 'turnComplete') {
        if (music.setIntensity) music.setIntensity(0);
      } else if (event.type === 'gameOver') {
        play('over');
        haptic([70, 45, 90]);
      }
    }

    function pump(currentView) {
      const events = session.drainEvents();
      events.forEach(handle);
      onState(currentView || session.view(), events);
      return events;
    }

    function cancel() {
      generation++;
      timers.forEach(clearTimer);
      timers.clear();
    }

    return Object.freeze({ pump, cancel, popDuration, fallDuration });
  }

  global.PuyoGameSessionWebEffects = Object.freeze({ create, popDuration, fallDuration });
})(typeof window !== 'undefined' ? window : globalThis);
