'use strict';

const assert = require('assert');
const { create, SETTINGS_KEY } = require('./puyo-audio.js');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fixture(options) {
  const config = options || {};
  const values = new Map();
  const callbacks = {};
  const gains = [], oscillators = [], sources = [], native = [];
  const param = () => ({ value: 1, setValueAtTime(value) { this.value = value; }, exponentialRampToValueAtTime(value) { this.target = value; } });
  const ctx = {
    currentTime: 0, state: 'running', destination: {},
    createGain() { const node = { gain: param(), connect(target) { this.target = target; }, disconnect() {} }; gains.push(node); return node; },
    createOscillator() {
      const node = { frequency: param(), connect(target) { this.target = target; }, disconnect() { this.disconnected = true; }, start(time) { this.startAt = time; }, stop(time) { this.stopAt = time; if (time == null && this.onended) this.onended(); } };
      oscillators.push(node); return node;
    },
    createBufferSource() {
      const node = { connect(target) { this.target = target; }, disconnect() {}, start(time, offset) { this.startAt = time; this.offset = offset; }, stop() { this.stopped = true; } };
      sources.push(node); return node;
    },
    decodeAudioData(data, resolve) { if (config.delayed) callbacks.decode = () => resolve({ duration: 160.22225 }); else resolve({ duration: 160.22225 }); },
    resume() { if(config.delayedResume)return new Promise(resolve=>{callbacks.resume=()=>{this.state='running';resolve();};});this.state = 'running'; return Promise.resolve(); },
    close() { this.closed = true; return Promise.resolve(); },
  };
  const wx = {
    createWebAudioContext: config.native ? undefined : () => ctx,
    getFileSystemManager: () => ({ readFile({ success, fail }) { if (config.failRead) fail(new Error('read failed')); else success({ data: new ArrayBuffer(8) }); } }),
    createInnerAudioContext() {
      const player = { play() { this.plays = (this.plays || 0) + 1; }, pause() { this.paused = true; this.pauseCalls = (this.pauseCalls || 0) + 1; }, stop() { this.stopped = true; this.stopCalls = (this.stopCalls || 0) + 1; }, destroy() { this.destroyed = true; }, onPlay(fn) { this.started = fn; }, onError(fn) { this.error = fn; }, onCanplay(fn) { this.ready = fn; } };
      native.push(player); return player;
    },
    onAudioInterruptionBegin: (fn) => { callbacks.begin = fn; },
    onAudioInterruptionEnd: (fn) => { callbacks.end = fn; },
    offAudioInterruptionBegin: () => { callbacks.begin = null; },
    offAudioInterruptionEnd: () => { callbacks.end = null; },
    vibrateShort() { callbacks.vibrated = true; },
  };
  const storage = { get: (key, fallback) => values.has(key) ? values.get(key) : fallback, set: (key, value) => values.set(key, value) };
  const audio = create({ wx, storage, bgmUrl: 'assets/puyo-bgm.mp3', onInterrupted: () => { callbacks.interrupted = true; } });
  return { audio, ctx, gains, oscillators, sources, native, callbacks, values, wx, storage };
}

(async () => {
  const f = fixture();
  await f.audio.preload();
  assert.strictEqual(f.sources.length, 0, 'preloading never starts music');
  f.audio.start(); await flush();
  assert.strictEqual(f.sources.length, 1);
  assert.strictEqual(f.sources[0].loop, true);
  assert.strictEqual(f.sources[0].loopEnd, 160.22225);
  f.ctx.currentTime = 12.5;
  f.audio.pause();
  assert.strictEqual(f.sources[0].stopped, true);
  f.audio.show(); await flush();
  assert.strictEqual(f.sources.length, 1, 'returning to foreground does not autoplay');
  f.audio.resume(); await flush();
  assert.strictEqual(f.sources[1].offset, 12.5, 'resume continues at the paused position');
  const sfxVolume = f.gains[1].gain.value;
  f.audio.cycle('music');
  assert.ok(f.gains[0].gain.value < .17);
  assert.strictEqual(f.gains[1].gain.value, sfxVolume, 'music volume does not change SFX gain');
  f.audio.play('chain', 3);
  assert.strictEqual(f.oscillators.length, 2, 'the original chain SFX includes its upper voice');
  assert.ok(Math.abs(f.oscillators[0].frequency.value - 659.255) < .01, 'chain 3 uses the original MIDI melody');
  assert.strictEqual(f.oscillators[0].target.target, f.gains[1], 'SFX route to their own bus');
  for (let index = 0; index < 100; index++) f.audio.play('move');
  assert.ok(f.oscillators.filter((voice) => !voice.disconnected).length <= 64, 'held controls cannot accumulate unlimited voices');
  for (let index = 0; index < 4; index++) f.audio.cycle('sfx');
  const silentCount = f.oscillators.length;
  f.audio.play('chain', 4);
  assert.strictEqual(f.oscillators.length, silentCount, 'SFX can be muted without disabling music');
  f.audio.cycle('sfx');
  f.audio.pause(); f.audio.toggle(); f.audio.toggle(); await flush();
  assert.strictEqual(f.sources.length, 2, 'unmuting inside a paused game does not start music');
  f.audio.resume(); await flush();
  f.audio.hide();
  const afterHide = f.sources.length;
  const afterSfx = f.oscillators.length;
  f.audio.play('allclear'); f.audio.show(); await flush();
  assert.strictEqual(f.sources.length, afterHide);
  assert.strictEqual(f.oscillators.length, afterSfx, 'no new SFX may start in the background');
  f.audio.resume(); await flush();
  f.callbacks.begin();
  assert.strictEqual(f.callbacks.interrupted, true);
  const afterInterruption = f.sources.length;
  f.callbacks.end(); await flush();
  assert.strictEqual(f.sources.length, afterInterruption, 'interruption end waits for explicit resume');
  f.audio.resume(); await flush();
  assert.strictEqual(f.sources.length, afterInterruption + 1);
  f.audio.toggleVibration(); f.audio.haptic('light');
  assert.strictEqual(f.callbacks.vibrated, undefined);
  assert.strictEqual(f.values.get(SETTINGS_KEY).vibration, false);
  f.audio.destroy();
  assert.strictEqual(f.ctx.closed, true);
  assert.strictEqual(f.callbacks.begin, null);

  const pending = fixture({ delayed: true });
  pending.audio.start(); await flush();
  pending.audio.pause(); pending.callbacks.decode(); await flush();
  assert.strictEqual(pending.sources.length, 0, 'late decoding cannot restart paused music');
  pending.audio.resume(); await flush();
  assert.strictEqual(pending.sources.length, 1);
  pending.audio.destroy();

  const disposed = fixture({ delayed: true });
  disposed.audio.start(); await flush();
  disposed.audio.destroy(); disposed.callbacks.decode(); await flush();
  assert.strictEqual(disposed.sources.length, 0, 'a late decoder cannot resurrect a destroyed player');

  const restored = fixture();
  restored.audio.resume(); await flush();
  assert.strictEqual(restored.sources.length, 1, 'resuming a restored run works even without an earlier start call');
  restored.audio.destroy();

  const stoppedWhileLoading = fixture({delayed: true});
  stoppedWhileLoading.audio.start(); await flush();
  stoppedWhileLoading.audio.stop(); stoppedWhileLoading.callbacks.decode(); await flush();
  stoppedWhileLoading.audio.show(); stoppedWhileLoading.audio.toggle(); stoppedWhileLoading.audio.toggle();
  stoppedWhileLoading.audio.cycle('music'); await flush();
  assert.strictEqual(stoppedWhileLoading.sources.length, 0, 'leaving while decoding cannot restart music through late decode, foreground or settings');
  stoppedWhileLoading.audio.resume(); await flush();
  assert.strictEqual(stoppedWhileLoading.sources.length, 1, 'explicitly continuing a saved game can start music again');
  assert.strictEqual(stoppedWhileLoading.sources[0].offset, 0, 'leaving clears the previous BGM position');
  stoppedWhileLoading.audio.destroy();

  const suspended = fixture({delayedResume: true});
  suspended.ctx.state = 'suspended'; suspended.audio.start(); await flush();
  suspended.audio.stop(); suspended.callbacks.resume(); await flush();
  assert.strictEqual(suspended.sources.length, 0, 'late WebAudio context resume cannot play after leaving');
  suspended.audio.destroy();

  const nativeLate = fixture({native: true});
  nativeLate.audio.start(); await flush();
  const player = nativeLate.native[0];
  nativeLate.audio.pause(); const pauseCalls = player.pauseCalls;
  player.started();
  assert.strictEqual(player.pauseCalls, pauseCalls + 1, 'late native onPlay is paused again without losing its player');
  assert.strictEqual(player.destroyed, undefined, 'normal pause retains the native player');
  nativeLate.audio.resume(); await flush();
  nativeLate.audio.stop();
  assert.strictEqual(player.destroyed, true, 'leaving destroys the native player and its queued playback');
  const stopCalls = player.stopCalls;
  player.started();
  assert.strictEqual(player.stopCalls, stopCalls + 1, 'retired native onPlay is explicitly silenced');
  nativeLate.audio.show(); nativeLate.audio.toggle(); nativeLate.audio.toggle(); await flush();
  assert.strictEqual(nativeLate.native.length, 1, 'foreground and unmute cannot recreate playback in the lobby');
  nativeLate.audio.resume(); await flush();
  const replacement = nativeLate.native[1];
  assert.strictEqual(replacement.plays, 1, 'explicit continue uses a fresh native player');
  player.error();
  assert.strictEqual(nativeLate.audio.settings().error, '', 'retired player errors cannot poison a new run');
  player.started();
  assert.strictEqual(replacement.destroyed, undefined, 'late old callbacks do not stop the current player');
  nativeLate.audio.destroy();

  for (const options of [{ native: true }, { failRead: true }]) {
    const fallback = fixture(options);
    fallback.audio.start(); await flush();
    assert.strictEqual(fallback.native[0].plays, 1, 'unsupported Web Audio/failed decoding falls back without blocking');
    fallback.audio.pause(); fallback.audio.toggle(); fallback.audio.toggle(); await flush();
    assert.strictEqual(fallback.native[0].plays, 1);
    fallback.audio.resume(); await flush();
    assert.strictEqual(fallback.native[0].plays, 2);
    fallback.audio.destroy();
    assert.strictEqual(fallback.native[0].destroyed, true);
  }
  const persistence = fixture();
  persistence.audio.cycle('music'); persistence.audio.cycle('sfx'); persistence.audio.toggleVibration();
  const savedPlayer = create({ wx: persistence.wx, storage: persistence.storage, bgmUrl: 'assets/puyo-bgm.mp3' });
  assert.strictEqual(savedPlayer.settings().music, 75);
  assert.strictEqual(savedPlayer.settings().sfx, 75);
  assert.strictEqual(savedPlayer.settings().vibration, false);
  savedPlayer.destroy(); persistence.audio.destroy();
  console.log('wechat audio buses and lifecycle tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
