'use strict';

const assert = require('assert');
require('./input.js');

assert.strictEqual(global.PuyoInput.actionForKey('ArrowLeft'), 'left');
assert.strictEqual(global.PuyoInput.actionForKey('X'), 'cw');
assert.strictEqual(global.PuyoInput.actionForKey('z'), 'ccw');
assert.strictEqual(global.PuyoInput.actionForKey(' '), 'drop');
assert.strictEqual(global.PuyoInput.actionForKey('C'), 'swap');
assert.strictEqual(global.PuyoInput.actionForKey('q'), null);
assert.strictEqual(global.PuyoInput.swipeAction({ x: 0, y: 0 }, { x: 5, y: 4 }), 'cw');
assert.strictEqual(global.PuyoInput.swipeAction({ x: 40, y: 0 }, { x: 0, y: 5 }), 'left');
assert.strictEqual(global.PuyoInput.swipeAction({ x: 0, y: 0 }, { x: 2, y: 60 }), 'drop');
assert.strictEqual(global.PuyoInput.swipeAction({ x: 0, y: 0 }, { x: 2, y: 25 }), 'down');

assert.deepStrictEqual(global.PuyoInput.TIMINGS, { horizontalDas: 170, horizontalArr: 60, downDas: 185, downArr: 42 });

function target(extra) {
  const listeners = {};
  return Object.assign({
    listeners,
    addEventListener(name, handler) { listeners[name] = handler; },
  }, extra || {});
}

const scheduled = { timeouts: [], intervals: [], clearedTimeouts: [], clearedIntervals: [] };
const timers = {
  setTimeout(fn, delay) { const timer = { fn, delay }; scheduled.timeouts.push(timer); return timer; },
  setInterval(fn, delay) { const timer = { fn, delay }; scheduled.intervals.push(timer); return timer; },
  clearTimeout(timer) { if (timer) scheduled.clearedTimeouts.push(timer); },
  clearInterval(timer) { if (timer) scheduled.clearedIntervals.push(timer); },
};
const pressed = new Set();
const leftButton = target({ dataset: { a: 'left' }, classList: { add: (name) => pressed.add(name), remove: (name) => pressed.delete(name) }, setPointerCapture() {} });
const rightButton = target({ dataset: { a: 'right' }, classList: { add: (name) => pressed.add(name), remove: (name) => pressed.delete(name) }, setPointerCapture() {} });
const documentTarget = target({ visibilityState: 'visible' });
const boardTarget = target();
const windowTarget = target();
const actions = [];
const input = global.PuyoInput.create({
  controls: [leftButton, rightButton],
  document: documentTarget,
  boardWrap: boardTarget,
  global: windowTarget,
  timers,
  onAction: (action) => actions.push(action),
  onPause() {},
  isBuildOpen: () => false,
  onCloseBuild() {},
});

leftButton.listeners.pointerdown({ pointerId: 1, preventDefault() {} });
assert.deepStrictEqual(actions, ['left']);
assert.strictEqual(scheduled.timeouts.at(-1).delay, 170);
scheduled.timeouts.at(-1).fn();
assert.deepStrictEqual(actions, ['left', 'left']);
assert.strictEqual(scheduled.intervals.at(-1).delay, 60);
scheduled.intervals.at(-1).fn();
assert.deepStrictEqual(actions, ['left', 'left', 'left']);

rightButton.listeners.pointerdown({ pointerId: 2, preventDefault() {} });
assert.strictEqual(actions.at(-1), 'right');
assert.ok(scheduled.clearedIntervals.length > 0);
leftButton.listeners.pointerup({ pointerId: 1 });
assert.strictEqual(pressed.has('is-pressed'), true);
rightButton.listeners.pointerup({ pointerId: 2 });
assert.strictEqual(pressed.has('is-pressed'), false);

documentTarget.listeners.keydown({ key: 'ArrowDown', repeat: false, preventDefault() {} });
assert.strictEqual(actions.at(-1), 'down');
assert.strictEqual(scheduled.timeouts.at(-1).delay, 185);
documentTarget.listeners.keyup({ key: 'ArrowDown' });
documentTarget.listeners.keydown({ key: 'ArrowLeft', repeat: false, preventDefault() {} });
documentTarget.visibilityState = 'hidden';
documentTarget.listeners.visibilitychange();
assert.ok(scheduled.clearedTimeouts.length > 0);
windowTarget.listeners.blur();
input.stop();

console.log('puyo input tests passed');
