(function (global) {
  'use strict';

  const VERSION = 7;

  function create(options) {
    const elements = options.elements;
    const challengeRules = options.challengeRules;
    const rogueliteRules = options.rogueliteRules;
    let chainTimer = null;
    let resultTimer = null;
    let levelTimer = null;
    const levels = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'];

    function synergyText(card) {
      if (card.ownedSynergies && card.ownedSynergies.length) return '已联动 · ' + card.ownedSynergies.join(' / ');
      const names = (card.synergies || []).map((id) => rogueliteRules.BY_ID[id] && rogueliteRules.BY_ID[id].name).filter(Boolean);
      return names.length ? '可联动 · ' + names.join(' / ') : '';
    }

    function selectGameType(type) {
      elements.modePicker.querySelectorAll('button').forEach((button) => {
        button.setAttribute('aria-pressed', button.dataset.mode === type ? 'true' : 'false');
      });
    }

    function renderHud(state) {
      elements.score.textContent = state.score;
      elements.highScore.textContent = state.highScore;
      elements.level.textContent = state.level;
      elements.runChain.textContent = state.runChain;
    }

    function renderChallenge(view) {
      elements.challengeCard.hidden = !view.active;
      if (!view.active) return;
      const state = view.challengeState;
      const mission = state.mission;
      elements.challengeStage.textContent = state.stage;
      elements.specialBadge.hidden = !state.special;
      elements.specialBadge.textContent = state.special ? state.special.title : 'SPECIAL';
      elements.challengeCard.classList.toggle('is-special', !!state.special);
      elements.missionTitle.textContent = mission.title;
      const preview = view.turnStats.missionBaseProgress == null ? mission : Object.assign({}, mission, { progress: view.turnStats.missionBaseProgress });
      const progress = view.mode === 'resolving' ? challengeRules.missionProgress(preview, view.turnStats) : mission.progress;
      const presentation = challengeRules.missionPresentation(mission, progress);
      elements.missionScope.textContent = presentation.scope;
      elements.missionProgress.textContent = presentation.progress;
      elements.missionDeadline.textContent = '任务期限：还可放 ' + state.turnsLeft + ' 组';
      elements.missionDeadline.classList.toggle('is-urgent', state.turnsLeft <= 2);
      const activeContract = view.runBuild.contract && view.runBuild.contract.status === 'active' && view.runBuild.contract.stage === state.stage;
      elements.contractStatus.hidden = !activeContract;
      elements.missionMeter.style.width = Math.min(100, progress / mission.target * 100) + '%';
      const pending = state.pendingGarbage || 0;
      elements.garbageQueue.innerHTML = Array.from({ length: Math.min(6, pending) }, () => '<i></i>').join('');
      elements.garbageCount.textContent = '×' + pending;
      elements.garbageEta.textContent = state.pressureIn + ' 组后落下';
      elements.challengeCard.classList.toggle('is-imminent', pending > 0 && state.pressureIn <= 2);
      elements.challengeCard.classList.toggle('is-safe', pending === 0);
      const active = rogueliteRules.DEFINITIONS.filter((item) => view.runBuild.upgrades[item.id]);
      const relics = (view.runBuild.relics || []).map((id) => rogueliteRules.RELIC_BY_ID[id]).filter(Boolean);
      const profile = rogueliteRules.buildProfile(view.runBuild);
      elements.buildSummary.hidden = !active.length && !relics.length;
      elements.buildCount.textContent = active.length + relics.length;
      elements.buildChips.innerHTML = (profile.primary ? '<b class="build-school" data-school="' + profile.primary.id + '">' + profile.primary.name + '构筑</b> · ' : '') + relics.map((item) => '<span data-relic="' + item.id + '" class="is-relic ' + (view.triggeredUpgrades.has(item.id) ? 'is-triggered' : '') + '">◆ ' + item.name + '</span>').concat(active.map((item) => {
        const status = rogueliteRules.statusFor(view.runBuild, item.id);
        return '<span data-school="' + item.school + '" data-upgrade="' + item.id + '" class="' + (view.triggeredUpgrades.has(item.id) ? 'is-triggered' : '') + '">' + item.name + levels[view.runBuild.upgrades[item.id]] + (status ? ' · ' + status : '') + '</span>';
      })).join(' · ');
    }

    function renderUpgradeChoices(runBuild) {
      if (runBuild.pendingRelicChoice && runBuild.pendingRelicChoice.length) {
        elements.upgradeKicker.textContent = 'SPECIAL RELIC · 唯一遗物';
        elements.upgradeChoices.innerHTML = runBuild.pendingRelicChoice.map((id) => {
          const card = rogueliteRules.relicCardFor(runBuild, id);
          if (!card) return '';
          const synergy = synergyText(card);
          return '<button type="button" data-relic="' + card.id + '" class="upgrade-card relic-card" data-rarity="relic" data-school="' + card.school + '">' +
            '<span><em>' + card.schoolName + '遗物</em><b>唯一</b></span><strong>◆ ' + card.name + '</strong><small>' + card.effect + '</small>' +
            (synergy ? '<small class="synergy' + (card.ownedSynergies.length ? ' is-active' : '') + '">' + synergy + '</small>' : '') + '</button>';
        }).join('');
        return;
      }
      elements.upgradeKicker.textContent = runBuild.pendingKind === 'special' ? 'SPECIAL REWARD · 稀有保底' : (runBuild.pendingKind === 'specialBonus' ? 'SPECIAL REWARD · 遗物集齐补偿' : (runBuild.pendingKind === 'contract' ? 'CONTRACT REWARD · 额外强化' : 'STAGE REWARD'));
      elements.upgradeChoices.innerHTML = runBuild.pendingChoice.map((id) => {
        const card = rogueliteRules.cardFor(runBuild, id);
        if (!card) return '';
        const levelText = card.currentLevel ? '升级至 ' + levels[card.nextLevel] : '获得 Ⅰ';
        const synergy = synergyText(card);
        return '<button type="button" data-upgrade="' + card.id + '" class="upgrade-card" data-rarity="' + card.rarity + '" data-school="' + card.school + '">' +
          '<span><em>' + card.schoolName + '</em><b>' + levelText + '</b></span><strong>' + card.name + '</strong><small>' + card.effect + '</small>' +
          (synergy ? '<small class="synergy' + (card.ownedSynergies.length ? ' is-active' : '') + '">' + synergy + '</small>' : '') +
          (card.recommended ? '<mark>' + card.recommendationReason + '</mark>' : '') + '</button>';
      }).join('');
    }

    function renderBuildDetails(runBuild) {
      const profile = rogueliteRules.buildProfile(runBuild);
      const active = rogueliteRules.DEFINITIONS.filter((item) => runBuild.upgrades[item.id]);
      const relics = (runBuild.relics || []).map((id) => rogueliteRules.RELIC_BY_ID[id]).filter(Boolean);
      const groups = Object.keys(rogueliteRules.SCHOOLS).map((schoolId) => ({
        school: rogueliteRules.SCHOOLS[schoolId],
        items: active.filter((item) => item.school === schoolId),
      })).filter((group) => group.items.length);
      elements.buildDetails.innerHTML = '<div class="build-direction">' + (profile.primary ? '<span>当前方向</span><strong data-school="' + profile.primary.id + '">' + profile.primary.name + '构筑</strong>' : '<span>当前方向</span><strong>混合构筑</strong>') + '</div>' + (relics.length ? '<section class="build-group relic-group"><h3>特殊遗物</h3>' + relics.map((item) => '<article class="build-detail relic-detail"><span><em>唯一遗物</em><b>◆</b></span><strong>' + item.name + '</strong><small>' + item.effect + '</small></article>').join('') + '</section>' : '') + groups.map((group) =>
        '<section class="build-group" data-school="' + group.school.id + '"><h3>' + group.school.name + '</h3>' + group.items.map((item) => {
          const level = runBuild.upgrades[item.id];
          const card = rogueliteRules.cardFor(runBuild, item.id);
          const synergy = synergyText(card);
          const status = rogueliteRules.statusFor(runBuild, item.id);
          return '<article class="build-detail" data-rarity="' + item.rarity + '" data-school="' + item.school + '"><span><em>' + group.school.name + '</em><b>' + levels[level] + '</b></span><strong>' + item.name + '</strong><small>' + item.effects[level - 1] + '</small>' + (status ? '<small class="build-status">当前：' + status + '</small>' : '') + (synergy ? '<small class="synergy' + (card.ownedSynergies.length ? ' is-active' : '') + '">' + synergy + '</small>' : '') + '</article>';
        }).join('') + '</section>'
      ).join('');
    }

    function showContract() {
      elements.contractOverlay.hidden = false;
    }

    function hideContract() {
      elements.contractOverlay.hidden = true;
    }

    function showOverlay(kind, view) {
      elements.ovBack.hidden = true;
      elements.modePicker.hidden = kind === 'paused';
      if (kind === 'menu') {
        elements.ovTitle.textContent = '噗呦噗呦';
        elements.ovSub.textContent = view.selectedGameType === 'challenge' ? '完成动态任务，清除不断出现的干扰噗呦' : '连接 4 颗同色噗呦，挑战纯粹的高分连锁';
        elements.ovBtn.textContent = '开始游戏';
      } else if (kind === 'paused') {
        elements.ovTitle.textContent = '游戏暂停';
        elements.ovSub.textContent = '按「继续」或 P 回到连锁现场';
        elements.ovBtn.textContent = '继续';
      } else if (kind === 'gameover') {
        elements.ovTitle.textContent = '游戏结束';
        const records = [];
        if (view.score > view.hiAtStart && view.score > 0) records.push('最高分新纪录');
        if (view.runMaxChain > view.bestChainAtStart && view.runMaxChain > 0) records.push('连锁新纪录');
        elements.ovSub.textContent = (view.gameType === 'challenge' ? '挑战模式\n' : '经典模式\n') + 'SCORE  ' + view.score + '\nLEVEL  ' + view.level + '\nMAX CHAIN  ' + view.runMaxChain + '\nBEST CHAIN  ' + view.bestChain + '\n消除  ' + view.clearedTotal + ' 颗' + (view.gameType === 'challenge' ? '\n完成任务  ' + view.challengeState.completed + ' · 清除干扰  ' + view.challengeState.garbageCleared : '') + (records.length ? '\nNEW RECORD! · ' + records.join(' / ') : '');
        elements.ovBtn.textContent = '再来一局';
        elements.ovBack.hidden = false;
      }
      elements.overlay.hidden = false;
    }

    function showChallengeMessage(text, complete, duration) {
      clearTimeout(resultTimer);
      elements.chainResult.textContent = text;
      elements.chainResult.hidden = true;
      void elements.chainResult.offsetWidth;
      elements.chainResult.hidden = false;
      elements.challengeCard.classList.toggle('is-complete', !!complete);
      resultTimer = setTimeout(() => {
        elements.chainResult.hidden = true;
        elements.challengeCard.classList.remove('is-complete');
      }, duration || 1120);
    }

    function showChain(chain, gained) {
      clearTimeout(chainTimer);
      elements.chainValue.textContent = chain === 1 ? '消除' : chain;
      elements.chainLabel.textContent = chain === 1 ? 'CLEAR' : 'CHAIN';
      elements.chainGain.textContent = '+' + gained;
      elements.chainPop.style.setProperty('--chain-size', (chain === 1 ? 36 : Math.min(92, 50 + (chain - 2) * 7)) + 'px');
      elements.chainPop.style.setProperty('--chain-hue', String(Math.max(0, 82 - Math.max(0, chain - 2) * 13)));
      elements.chainPop.style.setProperty('--chain-tilt', (chain <= 1 ? -4 : Math.min(8, chain) * (chain % 2 ? 1 : -1)) + 'deg');
      elements.chainPop.hidden = true;
      void elements.chainPop.offsetWidth;
      elements.chainPop.hidden = false;
      chainTimer = setTimeout(() => { elements.chainPop.hidden = true; }, 760);
    }

    function showChainResult(chain) {
      clearTimeout(resultTimer);
      elements.chainResult.textContent = '本次 ' + chain + ' CHAIN!';
      elements.chainResult.hidden = true;
      void elements.chainResult.offsetWidth;
      elements.chainResult.hidden = false;
      resultTimer = setTimeout(() => { elements.chainResult.hidden = true; }, 1120);
    }

    function showLevel(level) {
      clearTimeout(levelTimer);
      elements.levelPop.textContent = 'LEVEL UP! · ' + level;
      elements.levelPop.hidden = true;
      void elements.levelPop.offsetWidth;
      elements.levelPop.hidden = false;
      levelTimer = setTimeout(() => { elements.levelPop.hidden = true; }, 980);
    }

    function flashGarbageDefense() {
      elements.challengeCard.classList.remove('is-defending');
      void elements.challengeCard.offsetWidth;
      elements.challengeCard.classList.add('is-defending');
      setTimeout(() => elements.challengeCard.classList.remove('is-defending'), 520);
    }

    function resetTransient() {
      clearTimeout(chainTimer);
      clearTimeout(resultTimer);
      clearTimeout(levelTimer);
      elements.chainPop.hidden = true;
      elements.chainResult.hidden = true;
      elements.levelPop.hidden = true;
      elements.challengeCard.classList.remove('is-complete', 'is-defending');
      elements.contractOverlay.hidden = true;
    }

    function bindActions(actions) {
      elements.btnPause.addEventListener('click', actions.pause);
      elements.buildButton.addEventListener('click', actions.openBuild);
      elements.buildClose.addEventListener('click', actions.closeBuild);
      elements.btnSound.addEventListener('click', actions.toggleSound);
      elements.modePicker.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-mode]');
        if (button) actions.selectMode(button.dataset.mode);
      });
      elements.ovBtn.addEventListener('click', actions.primary);
      elements.btnResumeContinue.addEventListener('click', actions.resume);
      elements.btnResumeNew.addEventListener('click', actions.resumeNew);
      elements.upgradeChoices.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-upgrade], button[data-relic]');
        if (button) actions.chooseUpgrade(button.dataset.upgrade || button.dataset.relic);
      });
      elements.contractSkip.addEventListener('click', () => actions.decideContract(false));
      elements.contractAccept.addEventListener('click', () => actions.decideContract(true));
    }

    return Object.freeze({ selectGameType, renderHud, renderChallenge, renderUpgradeChoices, renderBuildDetails, showContract, hideContract, showOverlay, showChallengeMessage, showChain, showChainResult, showLevel, flashGarbageDefense, resetTransient, bindActions });
  }

  global.PuyoUI = Object.freeze({ VERSION, create });
})(typeof window !== 'undefined' ? window : globalThis);
