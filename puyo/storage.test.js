'use strict';

const assert = require('assert');

const data = new Map();
global.localStorage = {
  getItem: (key) => data.has(key) ? data.get(key) : null,
  setItem: (key, value) => data.set(key, String(value)),
  removeItem: (key) => data.delete(key),
};
require('./storage.js');

const storage = global.PuyoStorage.create({
  rows: 2,
  cols: 2,
  garbage: 6,
  colorCount: 5,
  rotationCount: 4,
  keys: {
    highScore: { classic: 'hi', challenge: 'challenge-hi' },
    bestChain: { classic: 'chain', challenge: 'challenge-chain' },
    save: { classic: 'save', challenge: 'challenge-save' },
    muted: 'muted',
  },
});

assert.strictEqual(storage.readHighScore('classic'), 0);
storage.writeHighScore('challenge', 420);
assert.strictEqual(storage.readHighScore('challenge'), 420);
storage.writeBestChain('classic', 7);
assert.strictEqual(storage.readBestChain('classic'), 7);
storage.writeMuted(true);
assert.strictEqual(storage.readMuted(), true);

assert.strictEqual(storage.validBoard([[0, 1], [5, 6]]), true);
assert.strictEqual(storage.validBoard([[0, 1], [5, 7]]), false);
assert.strictEqual(storage.validColors([1, 5]), true);
assert.strictEqual(storage.validColors([0, 5]), false);
assert.strictEqual(storage.validPair({ x: 1, y: -1, rot: 3, colors: [1, 5] }), true);
assert.strictEqual(storage.validPair({ x: 2, y: 0, rot: 0, colors: [1, 2] }), false);

storage.save('classic', { savedAt: 10, board: [[0, 0], [1, 2]] });
storage.save('challenge', { savedAt: 20, board: [[0, 6], [1, 2]] });
assert.strictEqual(storage.loadLatest().gameType, 'challenge');
assert.strictEqual(storage.loadLatest().savedAt, 20);

data.set('save', JSON.stringify({ savedAt: 30, board: [[0, 6], [1, 2]] }));
assert.strictEqual(storage.loadLatest().gameType, 'challenge');
data.set('challenge-save', '{bad json');
assert.strictEqual(storage.loadLatest(), null);

storage.save('classic', { savedAt: 40, board: [[0, 0], [1, 2]] });
storage.clear('classic');
assert.strictEqual(data.has('save'), false);

console.log('puyo storage tests passed');
