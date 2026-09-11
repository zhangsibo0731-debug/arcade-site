'use strict';

const assert = require('assert');
require('./ui.js');

function classList() {
  const values = new Set();
  return {
    toggle(name, force) { if (force) values.add(name); else values.delete(name); },
    add(...names) { names.forEach((name) => values.add(name)); },
    remove(...names) { names.forEach((name) => values.delete(name)); },
    contains(name) { return values.has(name); },
  };
}

function element() {
  return { hidden: false, textContent: '', innerHTML: '', offsetWidth: 10, listeners: {}, style: { setProperty() {} }, classList: classList(), setAttribute(name, value) { this[name] = value; }, addEventListener(name, handler) { this.listeners[name] = handler; } };
}

const elements = {};
['score','highScore','level','runChain','overlay','ovTitle','ovSub','ovBtn','ovBack','challengeCard','challengeStage','specialBadge','missionTitle','missionScope','missionProgress','missionDeadline','missionMeter','garbageQueue','garbageCount','garbageEta','buildSummary','buildCount','buildChips','buildDetails','upgradeKicker','upgradeChoices','chainResult','chainValue','chainLabel','chainGain','chainPop','levelPop','contractOverlay','contractSkip','contractAccept','contractStatus'].forEach((key) => { elements[key] = element(); });
const allClearDetail = element();
elements.allClearPop = element();
elements.allClearPop.querySelector = () => allClearDetail;
const modeButtons = [{ dataset: { mode: 'classic' }, setAttribute(name, value) { this[name] = value; } }, { dataset: { mode: 'challenge' }, setAttribute(name, value) { this[name] = value; } }];
elements.modePicker = element();
elements.modePicker.querySelectorAll = () => modeButtons;

const challengeRules = {
  missionProgress: (mission) => mission.progress,
  missionPresentation: (mission, progress) => ({ scope: '单回合', progress: progress + ' / ' + mission.target }),
};
const definitions = [{ id: 'cleaner', name: '清道夫', rarity: 'common', school: 'adversity', synergies: [], effects: ['清除 1 颗'] }];
const rogueliteRules = {
  SCHOOLS: { adversity: { id: 'adversity', name: '逆境' } },
  DEFINITIONS: definitions,
  BY_ID: { cleaner: definitions[0] },
  RELIC_BY_ID: { echoBottle: { id: 'echoBottle', name: '回声瓶', effect: '额外抵消', school: 'chain' } },
  statusFor: () => '',
  buildProfile: () => ({ primary: null, schools: [{ id: 'adversity', name: '逆境', count: 1, levels: 1 }] }),
  cardFor: () => ({ id: 'cleaner', name: '清道夫', rarity: 'common', school: 'adversity', schoolName: '逆境', synergies: [], ownedSynergies: [], recommended: true, recommendationReason: '延续逆境构筑', currentLevel: 0, nextLevel: 1, effect: '清除 1 颗' }),
  relicCardFor: () => ({ id: 'echoBottle', name: '回声瓶', rarity: 'relic', school: 'chain', schoolName: '连锁', synergies: [], ownedSynergies: [], effect: '每 Stage 触发一次' }),
};
const ui = global.PuyoUI.create({ elements, challengeRules, rogueliteRules });

ui.renderHud({ score: 120, highScore: 300, level: 2, runChain: 4 });
assert.deepStrictEqual([elements.score.textContent, elements.highScore.textContent, elements.level.textContent, elements.runChain.textContent], [120, 300, 2, 4]);
ui.selectGameType('challenge');
assert.strictEqual(modeButtons[1]['aria-pressed'], 'true');

const challengeState = { stage: 3, special: null, turnsLeft: 2, pendingGarbage: 4, pressureIn: 1, mission: { title: '完成 2 CHAIN', target: 2, progress: 1 } };
ui.renderChallenge({ active: true, challengeState, mode: 'playing', turnStats: { missionBaseProgress: null }, runBuild: { upgrades: { cleaner: 1 } }, triggeredUpgrades: new Set(['cleaner']) });
assert.strictEqual(elements.challengeStage.textContent, 3);
assert.strictEqual(elements.missionDeadline.classList.contains('is-urgent'), true);
assert.strictEqual(elements.buildCount.textContent, 1);
assert.ok(elements.buildChips.innerHTML.includes('is-triggered'));

ui.renderUpgradeChoices({ pendingKind: '', pendingChoice: ['cleaner'] });
assert.ok(elements.upgradeChoices.innerHTML.includes('清道夫'));
assert.ok(elements.upgradeChoices.innerHTML.includes('逆境'));
assert.ok(elements.upgradeChoices.innerHTML.includes('延续逆境构筑'));
ui.renderUpgradeChoices({ pendingKind: 'contract', pendingChoice: ['cleaner'] });
assert.ok(elements.upgradeKicker.textContent.includes('CONTRACT REWARD'));
ui.renderUpgradeChoices({ pendingKind: 'specialBonus', pendingChoice: ['cleaner'] });
assert.ok(elements.upgradeKicker.textContent.includes('遗物集齐补偿'));
ui.renderUpgradeChoices({ pendingKind: '', pendingChoice: [], pendingRelicChoice: ['echoBottle'] });
assert.ok(elements.upgradeKicker.textContent.includes('SPECIAL RELIC'));
assert.ok(elements.upgradeChoices.innerHTML.includes('回声瓶'));
ui.showContract();
assert.strictEqual(elements.contractOverlay.hidden, false);
ui.hideContract();
assert.strictEqual(elements.contractOverlay.hidden, true);
ui.renderBuildDetails({ upgrades: { cleaner: 1 } });
assert.ok(elements.buildDetails.innerHTML.includes('混合构筑'));
assert.ok(elements.buildDetails.innerHTML.includes('data-school="adversity"'));
ui.showOverlay('menu', { selectedGameType: 'challenge' });
assert.strictEqual(elements.ovBtn.textContent, '开始游戏');
assert.ok(elements.ovSub.textContent.includes('动态任务'));
ui.showOverlay('gameover', { gameType: 'classic', score: 2100, level: 1, runMaxChain: 1, bestChain: 1, clearedTotal: 4, allClearCount: 1, hiAtStart: 0, bestChainAtStart: 0, challengeState: { completed: 0, garbageCleared: 0 } });
assert.ok(elements.ovSub.textContent.includes('全消  1 次'));
ui.showChain(3, 480);
assert.strictEqual(elements.chainValue.textContent, 3);
ui.showAllClear(5);
assert.strictEqual(allClearDetail.textContent, '全消 +2100 · 额外防御 +5');
['btnPause','buildButton','buildClose','btnSound','btnResumeContinue','btnResumeNew'].forEach((key) => { elements[key] = element(); });
let paused = false;
ui.bindActions({ pause: () => { paused = true; }, openBuild() {}, closeBuild() {}, toggleSound() {}, selectMode() {}, primary() {}, resume() {}, resumeNew() {}, chooseUpgrade() {} });
elements.btnPause.listeners.click();
assert.strictEqual(paused, true);
ui.resetTransient();

console.log('puyo ui tests passed');
