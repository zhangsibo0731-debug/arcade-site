'use strict';

const assert = require('node:assert/strict');
global.window = global;
require('./roguelite-rules.js');

const rules = global.PuyoRogueliteRules;
const fresh = rules.normalize({}, 0);
assert.equal(fresh.picks, 0);
assert.deepEqual(fresh.pendingChoice, []);

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

console.log('roguelite-rules tests passed');
