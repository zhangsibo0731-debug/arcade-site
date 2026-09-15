'use strict';

const assert = require('assert');
require('./music.js');

const selectTrack = global.PuyoMusic.selectTrack;
assert.strictEqual(selectTrack(), 'base');
assert.strictEqual(selectTrack({ mode: 'classic', stage: 99 }), 'base');
assert.strictEqual(selectTrack({ mode: 'challenge', stage: 1 }), 'base');
assert.strictEqual(selectTrack({ mode: 'challenge', stage: 3 }), 'base');
assert.strictEqual(selectTrack({ mode: 'challenge', stage: 4 }), 'pressure');
assert.strictEqual(selectTrack({ mode: 'challenge', stage: 2, special: { id: 'rush' } }), 'pressure');

const sources = [];
class AudioParam {
  constructor() { this.value = 1; this.ramps = []; }
  setValueAtTime(value, time) { this.value = value; this.ramps.push(['set', value, time]); }
  linearRampToValueAtTime(value, time) { this.value = value; this.ramps.push(['linear', value, time]); }
  setTargetAtTime(value, time, duration) { this.value = value; this.ramps.push(['target', value, time, duration]); }
  cancelScheduledValues(time) { this.ramps.push(['cancel', time]); }
}
class AudioContext {
  constructor() { this.currentTime = 0; this.state = 'running'; }
  createGain() { return { gain: new AudioParam(), connect() { return this; }, disconnect() {} }; }
  createDynamicsCompressor() { return { threshold: { value: 0 }, ratio: { value: 0 }, connect() { return this; } }; }
  createBufferSource() {
    const source = { buffer: null, connect() { return this; }, disconnect() {}, start(when, offset) { this.started = [when, offset]; }, stop(when) { this.stopped = when; } };
    sources.push(source);
    return source;
  }
  decodeAudioData() { return Promise.resolve({ duration: 58.1818367347 }); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}

global.AudioContext = AudioContext;
global.fetch = () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });

(async () => {
  const music = global.PuyoMusic.create({ urls: { base: '/base.wav', pressure: '/pressure.wav' } });
  await music.start({ mode: 'challenge', stage: 1 });
  assert.strictEqual(music.currentTrack(), 'base');
  assert.strictEqual(sources.length, 1);
  await music.setSituation({ mode: 'challenge', stage: 4 });
  assert.strictEqual(music.currentTrack(), 'pressure');
  assert.strictEqual(sources.length, 2);
  assert.deepStrictEqual(sources[1].started, [.04, 0]);
  assert.ok(sources[0].stopped > sources[1].started[0]);
  assert.doesNotThrow(() => music.onChain(4));
  assert.doesNotThrow(() => music.onChainEnd({ chain: 4 }));
  assert.doesNotThrow(() => music.onAllClear());
  console.log('puyo music tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
