'use strict';

const assert = require('node:assert/strict');
global.window = global;
require('./challenge-rules.js');
require('./roguelite-rules.js');

const challenge = global.PuyoChallengeRules;
const rogue = global.PuyoRogueliteRules;

let seed = 20260911;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

// A passive defense build must not erase capped late-game pressure with a
// routine single-color 2-chain. One-shot danger/relic effects may rescue it.
const defenseBuild = rogue.normalize({
  upgrades: { chainShield: 3, cleaner: 3, buffer: 3, lastStand: 3 },
}, 0);
const routineDefense = rogue.resolveTurnUpgrades(defenseBuild, {
  maxChain: 2, maxColors: 1, clearedThisTurn: true, boardHeight: 5,
}, 12);
assert.equal(challenge.defenseForChain(2) + routineDefense.extraDefense, 4);
assert.ok(challenge.garbageForStage(12) > challenge.defenseForChain(2) + routineDefense.extraDefense);
const dangerRescue = rogue.resolveTurnUpgrades(routineDefense.state, {
  maxChain: 2, maxColors: 1, clearedThisTurn: true, boardHeight: 8,
}, 12);
assert.equal(dangerRescue.extraDefense, 6);
const dangerSpent = rogue.resolveTurnUpgrades(dangerRescue.state, {
  maxChain: 2, maxColors: 1, clearedThisTurn: true, boardHeight: 9,
}, 12);
assert.equal(dangerSpent.extraDefense, 3);

// Planning lowers variance, but never exposes arbitrary color selection.
const planning = rogue.normalize({ upgrades: { nextSwap: 3, cohesion: 3 } }, 0);
let swap = rogue.swapNext(planning, [[1, 2], [3, 4], [2, 2]], 8);
swap = rogue.swapNext(swap.state, swap.queue, 8);
assert.equal(rogue.swapNext(swap.state, swap.queue, 8).swapped, false);
const forced = rogue.applyCohesion({ upgrades: { cohesion: 3 }, counters: { cohesionColor: 4 } }, [1, 2], () => [5, 5]);
assert.deepEqual(forced.pair, [4, 4]);
assert.equal(forced.state.counters.cohesionColor, 0);

// Directed choices should noticeably favor the main route without excluding
// any route over repeated seeded offers.
const guidedBuild = rogue.normalize({ picks: 2, upgrades: { chainShield: 1, chainEcho: 1 } }, 6);
let primaryFirst = 0;
const schools = new Set();
for (let index = 0; index < 1000; index++) {
  const choices = rogue.choicesFor(guidedBuild, random);
  if (rogue.BY_ID[choices[0]].school === 'chain') primaryFirst++;
  choices.forEach((id) => schools.add(rogue.BY_ID[id].school));
}
assert.ok(primaryFirst >= 620 && primaryFirst <= 740, 'primary route rate: ' + primaryFirst / 10 + '%');
assert.deepEqual(Array.from(schools).sort(), Object.keys(rogue.SCHOOLS).sort());

// Stage schedule remains bounded and special rewards never go blank after all
// currently registered relics have been collected.
const schedule = [];
for (let stage = 1; stage <= 20; stage++) {
  schedule.push({ stage, garbage: challenge.garbageForStage(stage), contract: !!rogue.offerContract({}, stage, stage % 5 === 0).contract });
}
assert.deepEqual(schedule.filter((item) => item.contract).map((item) => item.stage), [4, 8, 12, 16]);
assert.ok(schedule.every((item) => item.garbage >= 1 && item.garbage <= 5));
const specialFallback = rogue.offerBonus(rogue.offerRelic({ relics: rogue.RELICS.map((item) => item.id) }, random), 15, random);
assert.equal(specialFallback.pendingKind, 'specialBonus');
assert.equal(specialFallback.pendingChoice.length, 3);

console.log('puyo roguelite V2 simulation passed', {
  primaryRouteFirstPercent: primaryFirst / 10,
  seenSchools: schools.size,
  maxRoutineTwoChainDefense: challenge.defenseForChain(2) + routineDefense.extraDefense,
});
