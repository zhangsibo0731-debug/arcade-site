'use strict';

const assert = require('node:assert/strict');
global.window = global;
require('./game-session-web-effects.js');

const queued = [];
const acknowledged = [];
const calls = [];
const eventBatches = [[
  { id: 1, type: 'pop', chain: 2, cells: [[1, 2]], requiresAck: true },
], [
  { id: 2, type: 'fall', chain: 2, offsets: [['1,2', 3]], requiresAck: true },
], []];
const session = {
  drainEvents: () => eventBatches.shift() || [],
  ackEffect: (id) => acknowledged.push(id),
  view: () => ({ mode: 'resolving' }),
};
const adapter = global.PuyoGameSessionWebEffects.create({
  session,
  renderer: {
    startPop: (cells, duration) => calls.push(['pop', cells, duration]),
    startFall: (offsets, duration) => calls.push(['fall', Array.from(offsets.entries()), duration]),
    startRecolor: () => {},
    startGarbageFall: () => {},
  },
  setTimeout: (callback, delay) => { queued.push({ callback, delay }); return queued.length; },
  clearTimeout: () => {},
});

adapter.pump();
assert.deepEqual(calls[0], ['pop', [[1, 2]], 330]);
assert.equal(queued[0].delay, 330);
queued.shift().callback();
assert.deepEqual(acknowledged, [1]);
assert.deepEqual(calls[1], ['fall', [['1,2', 3]], 208]);
assert.equal(queued[0].delay, 255);
queued.shift().callback();
assert.deepEqual(acknowledged, [1, 2]);

assert.equal(global.PuyoGameSessionWebEffects.popDuration(1), 300);
assert.equal(global.PuyoGameSessionWebEffects.popDuration(8), 430);
assert.equal(global.PuyoGameSessionWebEffects.fallDuration(1), 190);
assert.equal(global.PuyoGameSessionWebEffects.fallDuration(8), 250);

console.log('puyo shared web effect adapter tests passed');
