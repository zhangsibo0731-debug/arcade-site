'use strict';

const assert = require('node:assert/strict');
global.window = global;
require('./challenge-rules.js');
require('./roguelite-rules.js');

const challenge = global.PuyoChallengeRules;
const roguelite = global.PuyoRogueliteRules;
const rows = [];

for (let stage = 1; stage <= 15; stage++) {
  const garbage = challenge.garbageForStage(stage);
  assert.ok(garbage >= 1 && garbage <= 5, 'garbage cap at stage ' + stage);
  const results = [1, 2, 3, 4, 5].map((chain) => {
    const outcome = challenge.resolveTurn({
      completed: stage - 1,
      pressureIn: 1,
      pendingGarbage: garbage,
      turnsLeft: 8,
      mission: { type: 'chain', target: 99, title: 'simulation', progress: 0 },
      specialAttemptedStage: stage,
    }, { maxChain: chain }, () => 0.5);
    assert.ok(outcome.state.pendingGarbage >= 0);
    assert.ok(outcome.pressure >= 0);
    return outcome.pressure;
  });
  assert.ok(results[2] <= results[1], '3-chain should defend at least as well as 2-chain');
  assert.equal(results[3], 0, '4-chain should fully defend capped pressure');
  rows.push({ stage, garbage, pressureAfter2Chain: results[1], pressureAfter3Chain: results[2] });
}

assert.deepEqual(rows.slice(7).map((row) => row.garbage), Array(8).fill(5));
const maxDefense = roguelite.modifiers({ upgrades: { chainShield: 3, largeGroup: 3, buffer: 3 } });
assert.equal(maxDefense.chainDefense, 3);
assert.equal(maxDefense.largeGroupDefense, 2);
assert.equal(maxDefense.bufferReduction, 3);
assert.ok(challenge.defenseForChain(2) + maxDefense.chainDefense < 6, 'defense build must not erase every future threat with only 2-chain');

console.table(rows);
console.log('balance simulation passed');
