'use strict';

const assert = require('assert');
let storedMuted = false;
let vibrated = null;
Object.defineProperty(global, 'navigator', {
  configurable: true,
  value: { vibrate: (pattern) => { vibrated = pattern; } },
});
require('./audio.js');

function element() {
  return { hidden: false, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
}

const button = element();
const soundOnIcon = element();
const soundOffIcon = element();
const storage = {
  readMuted: () => storedMuted,
  writeMuted: (value) => { storedMuted = value; },
};
const audio = global.PuyoAudio.create({ storage, button, soundOnIcon, soundOffIcon });

assert.strictEqual(audio.isMuted(), false);
assert.strictEqual(button.attrs['aria-label'], '关闭声音');
assert.strictEqual(soundOnIcon.hidden, false);
assert.strictEqual(soundOffIcon.hidden, true);
assert.strictEqual(audio.ensure(), null);
assert.doesNotThrow(() => audio.play('chain', 4));
audio.haptic([10, 20]);
assert.deepStrictEqual(vibrated, [10, 20]);
assert.strictEqual(audio.toggle(), true);
assert.strictEqual(storedMuted, true);
assert.strictEqual(button.attrs['aria-label'], '开启声音');
assert.strictEqual(soundOnIcon.hidden, true);
assert.strictEqual(soundOffIcon.hidden, false);

console.log('puyo audio tests passed');
