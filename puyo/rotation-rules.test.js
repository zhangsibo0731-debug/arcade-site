'use strict';

const assert = require('assert');
require('./rotation-rules.js');

const rules = global.PuyoRotationRules;
const rotations = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const pair = { x: 2, y: 5, rot: 0 };

const normal = rules.resolve({ pair, dir: 1, rotations, now: 0, pending: null, collides: () => false });
assert.deepStrictEqual(normal, { success: true, quickTurn: false, pair: { x: 2, y: 5, rot: 1 }, pending: null });

const narrowCollision = (x, y, rot) => !(x === 2 && y === 4 && rot === 2);
const blocked = rules.resolve({ pair, dir: 1, rotations, now: 1000, pending: null, collides: narrowCollision });
assert.strictEqual(blocked.success, false);
assert.deepStrictEqual(blocked.pending, { dir: 1, rot: 0, at: 1000 });

const quick = rules.resolve({ pair, dir: 1, rotations, now: 1170, pending: blocked.pending, collides: narrowCollision });
assert.deepStrictEqual(quick, { success: true, quickTurn: true, pair: { x: 2, y: 4, rot: 2 }, pending: null });

assert.strictEqual(rules.resolve({ pair, dir: -1, rotations, now: 1170, pending: blocked.pending, collides: narrowCollision }).success, false);
assert.strictEqual(rules.resolve({ pair, dir: 1, rotations, now: 1201, pending: blocked.pending, collides: narrowCollision }).success, false);
assert.strictEqual(rules.resolve({ pair: { x: 2, y: 5, rot: 1 }, dir: 1, rotations, now: 1170, pending: { dir: 1, rot: 1, at: 1000 }, collides: () => true }).success, false);
assert.strictEqual(rules.resolve({ pair, dir: 1, rotations, now: 1170, pending: blocked.pending, collides: () => true }).success, false);

console.log('puyo rotation rules tests passed');
