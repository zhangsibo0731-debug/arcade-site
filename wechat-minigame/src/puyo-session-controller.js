'use strict';

const createSave = require('./puyo-save.js').create;

class PuyoSessionController {
  constructor(game) {
    this.game = game;
    this.hidden = false;
    this.effect = null;
    this.elapsed = 0;
    this.checkpoint = null;
    this.recordCache = this.records(game.gameType);
    const validators = window.PuyoStorage.create({ rows: 12, cols: 6, garbage: 6, maxCell: 8, colorCount: 5, rotationCount: 4 });
    this.saves = createSave(game.storage, validators);
    const sessionState = window.PuyoSessionState.create({ storage: validators, challengeRules: game.rules, rogueliteRules: game.rogue, activeItemRules: game.items, emptyBoard: game.boardRules.emptyBoard });
    this.session = window.PuyoGameSession.create({
      boardRules: game.boardRules,
      scoringRules: window.PuyoScoringRules,
      rotationRules: window.PuyoRotationRules,
      rogueliteRules: game.rogue,
      challengeRules: game.rules,
      activeItemRules: game.items,
      challengeEffects: game.effects,
      sessionState,
      random: game.platform.random,
      now: game.platform.now,
    });
  }

  records(type) {
    return { highScore: Number(this.game.storage.get('moonlit_puyo_best_' + type, 0)) || 0, bestChain: Number(this.game.storage.get('moonlit_puyo_chain_' + type, 0)) || 0 };
  }

  start(type) {
    this.effect = null;
    this.checkpoint = null;
    this.game.visual.reset();
    this.game.hold = null;
    this.game.pointer = null;
    this.game.messageUntil = 0;
    this.game.result = null;
    this.game.mode = 'playing';
    this.recordCache = this.records(type);
    this.session.start(type, this.recordCache);
    this.pump();
    this.game.audio.start();
    this.game.audio.play('start');
    this.save();
  }

  sync(view) {
    if (!view) return;
    const game = this.game;
    game.board = view.board;
    game.pair = view.pair;
    game.ghostCells = view.ghostCells;
    game.queue = view.queue;
    game.score = view.score;
    game.level = view.level;
    game.cleared = view.clearedTotal;
    game.maxChain = view.runMaxChain;
    game.allClearCount = view.allClearCount;
    game.bestChain = Math.max(this.recordCache.bestChain, view.runMaxChain);
    game.activeMs = view.activeDurationMs;
    game.gameType = view.gameType;
    game.challenge = view.challengeState;
    game.build = view.runBuild;
    game.itemState = view.itemState;
    game.best = this.recordCache.highScore;
    game.turnStats = view.turnStats;
    game.choiceKind = view.mode === 'contract' ? 'contract' : view.runBuild.pendingRelicChoice.length ? 'relic' : 'upgrade';
    if (!['lobby', 'menu', 'leaderboard', 'build', 'mission', 'audio'].includes(game.mode) && !this.hidden && !(game.mode === 'paused' && view.mode === 'resolving')) {
      game.mode = ['choosing', 'contract'].includes(view.mode) ? 'choice' : view.mode;
    }
    if (game.mode !== 'playing') game.hold = null;
    if (view.mode !== 'resolving' && view.mode !== 'gameover') this.checkpoint = this.session.snapshot();
  }

  pump(view) {
    this.sync(view || this.session.view());
    const events = this.session.drainEvents();
    for (const event of events) this.handle(event);
    if (events.some((event) => event.type === 'stateChanged' || event.type === 'choiceOpened' || event.type === 'bottleToggled' || event.type === 'nextSwapped')) this.save();
    return events;
  }

  handle(event) {
    const game = this.game;
    const visual = game.visual;
    if (event.requiresAck) {
      let duration;
      if (event.type === 'pop' || event.type === 'stageReward') {
        duration = event.type === 'pop' ? (event.chain === 1 ? 300 : Math.min(430, 330 + (event.chain - 2) * 30)) : 340;
        visual.startPop(event.cells || event.hits.map((hit) => hit.cell), duration);
      } else if (event.type === 'fall') {
        duration = Math.min(250, 190 + Math.max(0, (event.chain || 1) - 1) * 18);
        visual.startFall(new Map(event.offsets || []), duration);
        duration += Math.min(90, 35 + Math.max(0, (event.chain || 1) - 1) * 12);
      } else if (event.type === 'garbageFall') {
        duration = 590 + Math.max(0, event.cells.length - 1) * 55;
        visual.startGarbageFall(event.cells, duration);
        game.audio.play('drop');
        game.audio.haptic('medium');
      } else if (event.type === 'recolor') {
        duration = 1120;
        visual.startRecolor(event.cells, duration, event.sourceColor, event.targetColor);
        visual.showBanner('混色瓶', game.colorName(event.sourceColor) + ' → ' + game.colorName(event.targetColor), 1, duration);
        game.audio.play('potion');
      } else duration = 0;
      this.effect = { event, remaining: duration };
      return;
    }
    if (event.type === 'spawn') {
      game.hold = null;
      game.pointer = null;
    } else if (event.type === 'chain') {
      visual.addRemoteLinks(event.remoteLinks || []);
      visual.showBanner(event.chain > 1 ? event.chain + ' 连锁' : '消除', '+' + event.score, event.chain, 800 + event.chain * 60);
      if (event.chain >= 2) visual.startShake(event.chain);
      game.audio.play(event.chain > 1 ? 'chain' : 'clear', event.chain);
      game.audio.haptic(event.chain >= 4 ? 'strong' : event.chain >= 2 ? 'medium' : 'light');
    } else if (event.type === 'land') {
      visual.startFall(new Map(event.offsets || []), 190);
      visual.startLanding(event.cells);
      game.audio.play('land');
      game.audio.haptic('light');
    } else if (event.type === 'move' || event.type === 'rotate') game.audio.play(event.type);
    else if (event.type === 'hardDrop') { game.audio.play('drop'); game.audio.haptic('medium'); }
    else if (event.type === 'allClear') {
      visual.queueBanner('全消！', '+' + event.score + (event.defense ? ' · 抵消 ' + event.defense : ''), 4, 1450);
      visual.startShake(4);
      game.audio.play('allclear');
    } else if (event.type === 'chainResult') {
      visual.queueBanner(event.chain + ' 连锁完成', '消除 ' + event.cleared + ' 颗 · +' + event.score + (event.garbage ? ' · 清障 ' + event.garbage : ''), event.chain, 1100);
      game.audio.play(event.chain > (event.previousBest || 0) ? 'chainBest' : 'chainEnd', event.chain);
    } else if (event.type === 'levelUp') {
      visual.showNotice('等级提升！· LEVEL ' + event.level, 1000);
      game.audio.play('level', event.level);
    }
    else if (event.type === 'message') visual.showNotice(event.text, event.duration, event.complete);
    else if (event.type === 'stageComplete') visual.stagePulse = { elapsed: 0, duration: 1000 };
    else if (event.type === 'garbageDefense') visual.defense = { elapsed: 0, duration: 850 };
    else if (event.type === 'upgradeTriggered') {
      const item = game.rogue.BY_ID[event.upgradeId] || game.rogue.RELIC_BY_ID[event.upgradeId];
      if (item) visual.trigger(item.id, item.name);
    }
    else if (event.type === 'gameOver') {
      game.audio.stop();
      game.audio.play('over');
      game.storage.set('moonlit_puyo_best_' + event.gameType, event.highScore);
      game.storage.set('moonlit_puyo_chain_' + event.gameType, event.bestChain);
      game.best = event.highScore;
      const result = game.result = Object.assign({}, event, { newHighScore: event.score > this.recordCache.highScore, newBestChain: event.maxChain > this.recordCache.bestChain, uploadStatus: '' });
      this.recordCache = { highScore: event.highScore, bestChain: event.bestChain };
      this.saves.clear(event.gameType);
      game.resumeCandidate = null;
      if (event.gameType === 'challenge') {
        result.uploadStatus = '正在提交挑战成绩…';
        game.leaderboard.submit(event).then((response) => {
          if (game.result === result) result.uploadStatus = response && response.skipped ? '设置周榜昵称后可参与排名 · 本地纪录已保存' : '挑战成绩已提交 · 本地纪录已保存';
        }).catch(() => { if (game.result === result) result.uploadStatus = '提交失败 · 本地纪录已保存，可稍后查看周榜'; });
      }
    }
  }

  dispatch(command) {
    const result = this.session.dispatch(command);
    this.pump();
    return result;
  }

  update(dt) {
    const game = this.game;
    if (this.hidden || !['playing', 'resolving'].includes(game.mode)) return;
    game.visual.update(dt);
    if (this.effect) {
      this.effect.remaining -= dt * 1000;
      if (this.effect.remaining <= 0) {
        const event = this.effect.event;
        this.effect = null;
        if (event.type === 'pop') {
          const colored = new Map((event.coloredCells || []).map((cell) => [cell[0] + ',' + cell[1], cell[2]]));
          game.visual.burst(event.cells, (cell) => game.cellColor(colored.get(cell[0] + ',' + cell[1]) || 6), event.chain);
        }
        this.session.ackEffect(event.id);
        this.pump();
      }
    }
    const hold = game.hold;
    if (hold && game.mode === 'playing') {
      const timings = window.PuyoInput.TIMINGS;
      const das = hold.action === 'down' ? timings.downDas : timings.horizontalDas;
      const arr = hold.action === 'down' ? timings.downArr : timings.horizontalArr;
      hold.elapsed += dt * 1000;
      while (game.hold === hold && game.mode === 'playing' && hold.elapsed >= hold.next) {
        hold.next = Math.max(das, hold.next) + arr;
        game.perform(hold.action);
      }
    }
    this.pump(this.session.tick(dt * 1000));
    this.elapsed += dt;
    if (this.elapsed >= 2) { this.elapsed = 0; this.save(); }
  }

  pause() {
    const mode = this.session.view() && this.session.view().mode;
    if (!['playing', 'resolving'].includes(mode)) return;
    if (mode === 'playing') this.dispatch({ type: 'pause' });
    this.game.mode = 'paused';
    this.game.hold = null;
    this.game.audio.pause();
    this.save();
  }

  resume() {
    this.game.mode = 'playing';
    if (this.session.view().mode === 'paused') this.dispatch({ type: 'resume' });
    else this.pump();
    this.game.audio.resume();
  }

  save() {
    const view = this.session.view();
    if (!view || view.mode === 'gameover') return;
    // Replaying a stable active pair is safer than saving half a clear/reward.
    const saved = view.mode === 'resolving' ? this.checkpoint : this.session.snapshot();
    if (saved && this.saves.save(saved)) this.game.resumeCandidate = saved;
  }

  restore(saved) {
    const converted = this.saves.convert(saved);
    if (!converted) return false;
    this.effect = null;
    this.game.visual.reset();
    this.game.mode = 'paused';
    this.recordCache = this.records(converted.gameType);
    this.session.restore(converted, this.recordCache);
    this.pump();
    this.save();
    return true;
  }
}

module.exports = PuyoSessionController;
