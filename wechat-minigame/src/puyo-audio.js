'use strict';

require('../vendor/puyo/audio.js');
const root = typeof window !== 'undefined' ? window : globalThis;
const SETTINGS_KEY = 'moonlit_puyo_audio_v1';
const LEVEL_DB = [-Infinity, -18, -12, -6, 0];
const gainFor = (level) => level <= 0 ? 0 : Math.pow(10, LEVEL_DB[level] / 20);
const validLevel = (value) => Number.isInteger(value) && value >= 0 && value <= 4 ? value : 4;

function create(options) {
  const wxApi = options.wx;
  const storage = options.storage;
  const saved = storage.get(SETTINGS_KEY, {}) || {};
  const settings = { music: validLevel(saved.music), sfx: validLevel(saved.sfx), vibration: saved.vibration !== false };
  let muted = !!storage.get('moonlit_muted_v1', false);
  let context = null, musicBus = null, sfxBus = null;
  let source = null, nativePlayer = null, buffer = null, loadPromise = null;
  let offset = 0, startedAt = 0, wanted = false, paused = true, background = false;
  let interrupted = false, disposed = false, fallback = false, requestId = 0;
  let contextUnavailable = false;
  let musicError = '';
  let nativePlaying = false;

  function persist() { storage.set(SETTINGS_KEY, Object.assign({}, settings)); }
  function canPlayMusic() { return wanted && !paused && !muted && settings.music > 0 && !background && !interrupted && !disposed; }
  function setGain(bus, value) {
    if (!bus) return;
    try { bus.gain.setValueAtTime(value, context.currentTime); } catch (_) { bus.gain.value = value; }
  }
  function applyVolumes() {
    setGain(musicBus, muted ? 0 : .17 * gainFor(settings.music));
    setGain(sfxBus, muted ? 0 : .8 * gainFor(settings.sfx));
    if (nativePlayer) nativePlayer.volume = muted ? 0 : .17 * gainFor(settings.music);
  }
  function ensureContext() {
    if (disposed || contextUnavailable) return null;
    if (context) return context;
    try {
      if (typeof wxApi.createWebAudioContext !== 'function') { contextUnavailable = true; return null; }
      context = wxApi.createWebAudioContext();
      musicBus = context.createGain(); sfxBus = context.createGain();
      musicBus.connect(context.destination); sfxBus.connect(context.destination);
      applyVolumes();
      return context;
    } catch (_) {
      try { if (context && context.close) { const closing = context.close(); if (closing && closing.catch) closing.catch(() => {}); } } catch (_) {}
      context = null; musicBus = null; sfxBus = null; contextUnavailable = true;
      return null;
    }
  }
  const sfx = root.PuyoAudio.create({
    storage: { readMuted: () => false, writeMuted() {} },
    isMuted: () => muted || settings.sfx === 0 || background || interrupted || disposed,
    createContext: ensureContext,
    destinationFor: () => sfxBus,
  });

  function ensureNative() {
    if (nativePlayer || disposed || !options.bgmUrl) return nativePlayer;
    try {
      nativePlayer = wxApi.createInnerAudioContext();
      nativePlayer.loop = true;
      nativePlayer.autoplay = false;
      nativePlayer.volume = .17 * gainFor(settings.music);
      if (nativePlayer.onError) nativePlayer.onError(() => { musicError = '音乐暂不可用，可点击重试'; nativePlaying = false; });
      if (nativePlayer.onCanplay) nativePlayer.onCanplay(() => { musicError = ''; });
      nativePlayer.src = options.bgmUrl;
    } catch (_) { nativePlayer = null; musicError = '当前环境无法播放音乐'; }
    return nativePlayer;
  }

  function loadBgm() {
    if (disposed || !options.bgmUrl) return Promise.resolve(null);
    if (buffer) return Promise.resolve(buffer);
    if (loadPromise) return loadPromise;
    const ctx = ensureContext();
    if (!ctx || typeof ctx.decodeAudioData !== 'function' || typeof ctx.createBufferSource !== 'function' || typeof wxApi.getFileSystemManager !== 'function') {
      fallback = true; ensureNative(); return Promise.resolve(null);
    }
    const decoding = new Promise((resolve, reject) => {
      wxApi.getFileSystemManager().readFile({ filePath: options.bgmUrl, success: (result) => resolve(result.data), fail: reject });
    }).then((data) => new Promise((resolve, reject) => {
      if (disposed) { resolve(null); return; }
      // Some WeChat versions expose callbacks, others also return a Promise.
      const decoded = ctx.decodeAudioData(data, resolve, reject);
      if (decoded && typeof decoded.then === 'function') decoded.then(resolve, reject);
    }));
    let timeout;
    const limit = new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('BGM load timeout')), 8000); });
    loadPromise = Promise.race([decoding, limit]).finally(() => clearTimeout(timeout)).then((decoded) => {
      if (!disposed) buffer = decoded;
      return decoded;
    }).catch(() => {
      if (!disposed) { fallback = true; ensureNative(); }
      return null;
    });
    return loadPromise;
  }

  function stopMusic(keepPosition) {
    requestId++;
    if (source) {
      if (keepPosition && buffer) offset = (offset + Math.max(0, context.currentTime - startedAt)) % buffer.duration;
      const previous = source; source = null;
      try { previous.stop(); } catch (_) {}
      try { previous.disconnect(); } catch (_) {}
    }
    if (nativePlayer) {
      try { if (keepPosition) nativePlayer.pause(); else nativePlayer.stop(); } catch (_) {}
      nativePlaying = false;
    }
    if (!keepPosition) offset = 0;
  }

  async function playMusic() {
    if (!canPlayMusic() || source || nativePlaying) return;
    const token = ++requestId;
    const decoded = await loadBgm();
    if (token !== requestId || !canPlayMusic()) return;
    if (fallback || !decoded) {
      const player = ensureNative();
      if (player) {
        try { player.play(); nativePlaying = true; } catch (_) { musicError = '音乐暂不可用，可点击重试'; }
      }
      return;
    }
    let voice;
    try {
      if (context.state === 'suspended' && context.resume) await context.resume();
      if (token !== requestId || !canPlayMusic()) return;
      voice = context.createBufferSource();
      voice.buffer = decoded;
      voice.loop = true; voice.loopStart = 0; voice.loopEnd = decoded.duration;
      voice.connect(musicBus);
      voice.start(context.currentTime, offset % decoded.duration);
      startedAt = context.currentTime; source = voice;
      musicError = '';
    } catch (_) {
      try { if (voice) { voice.stop(); voice.disconnect(); } } catch (_) {}
      fallback = true;
      const player = ensureNative();
      if (player && canPlayMusic()) {
        try { player.play(); nativePlaying = true; musicError = ''; } catch (_) { musicError = '音乐暂不可用，可点击重试'; }
      }
    }
  }

  function pause() { paused = true; stopMusic(true); sfx.stop(); }
  function start() { stopMusic(false); wanted = true; paused = false; playMusic(); }
  function resume() { wanted = true; paused = false; playMusic(); }
  function stop() { wanted = false; paused = true; stopMusic(false); sfx.stop(); }
  function play(name, chain) {
    try { sfx.play(name, chain); } catch (_) { /* Audio must not block gameplay. */ }
  }
  function haptic(type) {
    if (!settings.vibration || background || interrupted || disposed) return;
    try {
      if (type === 'strong' && wxApi.vibrateLong) wxApi.vibrateLong({ type: 'heavy' });
      else if (wxApi.vibrateShort) wxApi.vibrateShort({ type: type === 'medium' ? 'medium' : 'light' });
    } catch (_) {}
  }
  function toggle() {
    muted = !muted; storage.set('moonlit_muted_v1', muted);
    if (muted) { stopMusic(true); sfx.stop(); }
    applyVolumes(); if (!muted) playMusic();
    return muted;
  }
  function cycle(channel) {
    if (channel !== 'music' && channel !== 'sfx') return;
    settings[channel] = (settings[channel] + 4) % 5;
    persist(); applyVolumes();
    if (channel === 'music') { if (!settings.music) stopMusic(true); else playMusic(); }
    else if (!settings.sfx) sfx.stop();
  }
  const onInterruptionBegin = () => {
    interrupted = true; pause();
    if (options.onInterrupted) options.onInterrupted();
  };
  const onInterruptionEnd = () => { interrupted = false; };
  if (wxApi.onAudioInterruptionBegin) wxApi.onAudioInterruptionBegin(onInterruptionBegin);
  if (wxApi.onAudioInterruptionEnd) wxApi.onAudioInterruptionEnd(onInterruptionEnd);

  return {
    isMuted: () => muted,
    settings: () => ({ muted, music: settings.music * 25, sfx: settings.sfx * 25, vibration: settings.vibration, error: musicError, engine: fallback ? 'native' : 'webAudio' }),
    preload: loadBgm,
    toggle, cycle, play, haptic, start, resume, pause, stop,
    toggleVibration() { settings.vibration = !settings.vibration; persist(); },
    hide() { background = true; pause(); },
    show() { background = false; },
    retry() {
      musicError = ''; loadPromise = null; fallback = false; contextUnavailable = false;
      if (nativePlayer) { try { nativePlayer.destroy(); } catch (_) {} nativePlayer = null; nativePlaying = false; }
      return loadBgm().then(() => playMusic());
    },
    destroy() {
      stop(); disposed = true;
      if (wxApi.offAudioInterruptionBegin) wxApi.offAudioInterruptionBegin(onInterruptionBegin);
      if (wxApi.offAudioInterruptionEnd) wxApi.offAudioInterruptionEnd(onInterruptionEnd);
      if (nativePlayer) { try { nativePlayer.destroy(); } catch (_) {} nativePlayer = null; }
      if (context && context.close) { try { const closing = context.close(); if (closing && closing.catch) closing.catch(() => {}); } catch (_) {} }
      buffer = null; loadPromise = null; context = null; musicBus = null; sfxBus = null;
    },
  };
}

module.exports = { create, gainFor, SETTINGS_KEY };
