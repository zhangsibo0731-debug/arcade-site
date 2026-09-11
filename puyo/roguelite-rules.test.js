'use strict';

const assert = require('node:assert/strict');
global.window = global;
require('./roguelite-rules.js');

const rules = global.PuyoRogueliteRules;
const fresh = rules.normalize({}, 0);
assert.equal(fresh.picks, 0);
assert.deepEqual(fresh.pendingChoice, []);
assert.deepEqual(Object.keys(rules.SCHOOLS), ['chain', 'group', 'multicolor', 'planning', 'adversity']);
assert.equal(rules.schoolFor('chainShield').name, '连锁');
assert.ok(rules.BY_ID.chainShield.tags.includes('chain'));
assert.ok(rules.BY_ID.chainShield.synergies.includes('chainEcho'));

const notDue = rules.offer(fresh, 2, () => 0);
assert.deepEqual(notDue.pendingChoice, []);

const due = rules.offer(fresh, 3, () => 0);
assert.equal(due.pendingChoice.length, 3);
assert.equal(new Set(due.pendingChoice).size, 3);

const stable = rules.offer(due, 3, () => 0.99);
assert.deepEqual(stable.pendingChoice, due.pendingChoice);

const pickedId = due.pendingChoice[0];
const picked = rules.choose(due, pickedId, 3);
assert.equal(picked.state.picks, 1);
assert.equal(picked.state.upgrades[pickedId], 1);
assert.deepEqual(picked.state.pendingChoice, []);

let upgraded = picked.state;
for (let completed = 6; completed <= 9; completed += 3) {
  upgraded = rules.offer(upgraded, completed, () => 0);
  assert.ok(upgraded.pendingChoice.includes(pickedId));
  upgraded = rules.choose(upgraded, pickedId, completed).state;
}
assert.equal(upgraded.upgrades[pickedId], 3);

const maxed = rules.normalize({ picks: 3, upgrades: { chainShield: 3 }, pendingChoice: ['chainShield', 'bogus'] }, 9);
assert.equal(maxed.upgrades.chainShield, 3);
assert.deepEqual(maxed.pendingChoice, []);
assert.ok(!rules.choicesFor(maxed, () => 0).includes('chainShield'));

const legacy = rules.normalize(null, 8);
assert.equal(legacy.picks, 2);

const modifiers = rules.modifiers({ upgrades: { chainShield: 2, chainEcho: 3, colorBurst: 1, largeGroup: 2, cleaner: 3, buffer: 1, steadyHands: 2, foresight: 3 } });
assert.equal(modifiers.chainDefense, 2);
assert.equal(modifiers.chainScoreMultiplier, 1.5);
assert.equal(modifiers.colorBurstThreshold, 7);
assert.equal(modifiers.largeGroupThreshold, 8);
assert.equal(modifiers.cleanerClear, 3);
assert.equal(modifiers.bufferReduction, 1);
assert.equal(modifiers.lockDelayMultiplier, 1.2);
assert.equal(modifiers.foresightLevel, 3);

assert.equal(rules.normalize({ bufferedStage: 7 }, 0).bufferedStage, 7);
assert.deepEqual(rules.normalize({}, 0).counters, { chainCharge: 0, lastStandStage: 0, nextSwapStage: 0, nextSwapUsed: 0, nextSwapLock: 0, cohesionColor: 0, echoBottleStage: 0, moonPrismStage: 0 });

const chainBuild = { upgrades: { chainShield: 2, chainEcho: 1, cleaner: 1 } };
assert.equal(rules.buildProfile(chainBuild).primary.id, 'chain');
const chainCard = rules.cardFor(chainBuild, 'chainShield');
assert.equal(chainCard.schoolName, '连锁');
assert.deepEqual(chainCard.ownedSynergies, ['连锁回响']);
assert.equal(chainCard.recommended, true);
assert.equal(chainCard.recommendationReason, '延续连锁构筑');
assert.equal(rules.buildProfile({ upgrades: { chainShield: 1, cleaner: 1 } }).primary, null);

const guidedBuild = rules.normalize({ picks: 2, upgrades: { chainShield: 1, chainEcho: 1 } }, 6);
const guided = rules.choicesFor(guidedBuild, () => 0);
assert.equal(rules.BY_ID[guided[0]].school, 'chain');
assert.notEqual(rules.BY_ID[guided[1]].school, 'chain');
assert.equal(new Set(guided).size, 3);
const unguided = rules.choicesFor(rules.normalize({ picks: 1, upgrades: { chainShield: 1, chainEcho: 1 } }, 3), () => 0);
assert.deepEqual(unguided, ['chainShield', 'chainEcho', 'colorBurst']);

let seed = 17;
const seededRandom = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const seenSchools = new Set();
for (let index = 0; index < 80; index++) {
  rules.choicesFor(guidedBuild, seededRandom).forEach((id) => seenSchools.add(rules.BY_ID[id].school));
}
assert.deepEqual(Array.from(seenSchools).sort(), Object.keys(rules.SCHOOLS).sort());

const contractOffered = rules.offerContract(rules.normalize({}, 0), 4, false);
assert.deepEqual(contractOffered.contract, { id: 'overload', status: 'pending', stage: 4 });
assert.equal(rules.offerContract(contractOffered, 4, false).lastContractStage, 4);
assert.equal(rules.offerContract(rules.normalize({}, 0), 5, true).contract, null);
const skippedContract = rules.decideContract(contractOffered, false);
assert.equal(skippedContract.skipped, true);
assert.equal(skippedContract.state.contract, null);
const acceptedContract = rules.decideContract(contractOffered, true);
assert.equal(acceptedContract.garbage, 2);
assert.equal(acceptedContract.state.contract.status, 'active');
assert.equal(rules.resolveContract(acceptedContract.state, 4, false).rewarded, false);
const rewardedContract = rules.resolveContract(acceptedContract.state, 4, true);
assert.equal(rewardedContract.rewarded, true);
assert.equal(rewardedContract.state.bonusChoices, 1);
const bonusOffer = rules.offerBonus(rewardedContract.state, 4, () => 0);
assert.equal(bonusOffer.pendingKind, 'contract');
const bonusPick = rules.choose(bonusOffer, bonusOffer.pendingChoice[0], 4).state;
assert.equal(bonusPick.bonusChoices, 0);
assert.equal(bonusPick.picks, 0);

const relicOffer = rules.offerRelic(rules.normalize({}, 0), () => 0);
assert.deepEqual(relicOffer.pendingRelicChoice, ['echoBottle', 'moonPrism']);
const relicPick = rules.chooseRelic(relicOffer, 'echoBottle');
assert.equal(relicPick.selected.name, '回声瓶');
assert.deepEqual(relicPick.state.relics, ['echoBottle']);
assert.deepEqual(relicPick.state.pendingRelicChoice, []);
const secondRelicOffer = rules.offerRelic(relicPick.state, () => 0);
assert.deepEqual(secondRelicOffer.pendingRelicChoice, ['moonPrism']);
assert.equal(rules.chooseRelic(secondRelicOffer, 'echoBottle').selected, null);
const allRelics = rules.normalize({ relics: ['echoBottle', 'moonPrism'] }, 0);
const fallbackRelic = rules.offerRelic(allRelics, () => 0);
assert.equal(fallbackRelic.bonusChoices, 1);
assert.equal(fallbackRelic.bonusSource, 'special');
const fallbackOffer = rules.offerBonus(fallbackRelic, 15, () => 0);
assert.equal(fallbackOffer.pendingKind, 'specialBonus');

let relicEffects = rules.resolveTurnUpgrades({ relics: ['echoBottle', 'moonPrism'] }, { maxChain: 2, maxColors: 3 }, 6);
assert.equal(relicEffects.extraDefense, 5);
assert.equal(relicEffects.scoreBonus, 300);
assert.deepEqual(relicEffects.triggered, ['echoBottle', 'moonPrism']);
relicEffects = rules.resolveTurnUpgrades(relicEffects.state, { maxChain: 3, maxColors: 2 }, 6);
assert.equal(relicEffects.extraDefense, 0);
assert.equal(relicEffects.scoreBonus, 0);
relicEffects = rules.resolveTurnUpgrades(relicEffects.state, { maxChain: 2, maxColors: 2 }, 7);
assert.equal(relicEffects.extraDefense, 4);

const reactiveBuild = rules.normalize({
  upgrades: { palette: 2, scrapValue: 2, chainCharge: 1, lastStand: 3 },
  counters: { chainCharge: 2, lastStandStage: 0 },
}, 0);
const reactive = rules.resolveTurnUpgrades(reactiveBuild, {
  maxChain: 2,
  maxColors: 2,
  garbageCleared: 2,
  clearedThisTurn: true,
  boardHeight: 8,
}, 4);
assert.equal(reactive.extraDefense, 7);
assert.equal(reactive.scoreBonus, 70);
assert.deepEqual(reactive.triggered, ['palette', 'scrapValue', 'chainCharge', 'lastStand']);
assert.equal(reactive.state.counters.chainCharge, 0);
assert.equal(reactive.state.counters.lastStandStage, 4);

let charging = rules.resolveTurnUpgrades({ upgrades: { chainCharge: 2 }, counters: {} }, { clearedThisTurn: false }, 1).state;
assert.equal(charging.counters.chainCharge, 1);
charging = rules.resolveTurnUpgrades(charging, { clearedThisTurn: true, maxChain: 1 }, 1).state;
assert.equal(charging.counters.chainCharge, 1);
charging = rules.resolveTurnUpgrades(charging, { clearedThisTurn: false }, 1).state;
charging = rules.resolveTurnUpgrades(charging, { clearedThisTurn: false }, 1).state;
charging = rules.resolveTurnUpgrades(charging, { clearedThisTurn: false }, 1).state;
assert.equal(charging.counters.chainCharge, 3);
assert.equal(rules.statusFor(charging, 'chainCharge'), '蓄能 3 / 3');

const noRepeatStand = rules.resolveTurnUpgrades(reactive.state, { clearedThisTurn: true, boardHeight: 10 }, 4);
assert.ok(!noRepeatStand.triggered.includes('lastStand'));
const nextStageStand = rules.resolveTurnUpgrades(noRepeatStand.state, { clearedThisTurn: true, boardHeight: 10 }, 5);
assert.ok(nextStageStand.triggered.includes('lastStand'));

const swappable = rules.normalize({ upgrades: { nextSwap: 2 } }, 0);
let swapped = rules.swapNext(swappable, [[1, 2], [3, 4], [2, 2]], 3);
assert.equal(swapped.swapped, true);
assert.deepEqual(swapped.queue, [[3, 4], [1, 2], [2, 2]]);
assert.equal(swapped.remaining, 1);
swapped = rules.swapNext(swapped.state, swapped.queue, 3);
assert.equal(swapped.remaining, 0);
assert.equal(rules.swapNext(swapped.state, swapped.queue, 3).swapped, false);
assert.equal(rules.swapStatus(swapped.state, 4).remaining, 2);
const lockSwap = rules.swapNext({ upgrades: { nextSwap: 3 } }, [[1, 2], [4, 4]], 2);
assert.equal(lockSwap.state.counters.nextSwapLock, 1);
const consumedLock = rules.consumeSwapLock(lockSwap.state);
assert.equal(consumedLock.active, true);
assert.equal(consumedLock.state.counters.nextSwapLock, 0);

const cohesionTurn = rules.resolveTurnUpgrades({ upgrades: { cohesion: 2 } }, { largestGroup: 6, largestGroupColor: 3 }, 1);
assert.ok(cohesionTurn.triggered.includes('cohesion'));
assert.equal(cohesionTurn.state.counters.cohesionColor, 3);
const cohesive = rules.applyCohesion(cohesionTurn.state, [1, 2], () => [4, 5]);
assert.deepEqual(cohesive.pair, [1, 3]);
assert.equal(cohesive.state.counters.cohesionColor, 0);
const cohesiveMax = rules.applyCohesion({ upgrades: { cohesion: 3 }, counters: { cohesionColor: 4 } }, [1, 2]);
assert.deepEqual(cohesiveMax.pair, [4, 4]);
const cohesiveReroll = rules.applyCohesion({ upgrades: { cohesion: 1 }, counters: { cohesionColor: 5 } }, [1, 2], () => [3, 5]);
assert.deepEqual(cohesiveReroll.pair, [3, 5]);

console.log('roguelite-rules tests passed');
