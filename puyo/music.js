(function (global) {
  'use strict';

  const VERSION = 3;
  const MODULE_URL = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';

  function create(options) {
    const isMuted = options && options.isMuted ? options.isMuted : () => false;
    const audioUrl = options && options.url ? options.url : new URL('assets/puyo-theme-full-v2.wav', MODULE_URL || global.location.href).href;
    let context = null;
    let master = null;
    let buffer = null;
    let loadPromise = null;
    let source = null;
    let wanted = false;
    let requestToken = 0;
    let intensity = 0;

    function ensure() {
      if (context) return context;
      const AudioContext = global.AudioContext || global.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.ratio.value = 2.5;
      master.gain.value = .17;
      master.connect(compressor).connect(context.destination);
      return context;
    }

    function load() {
      if (buffer) return Promise.resolve(buffer);
      if (loadPromise) return loadPromise;
      loadPromise = fetch(audioUrl)
        .then((response) => {
          if (!response.ok) throw new Error('Music request failed: ' + response.status);
          return response.arrayBuffer();
        })
        .then((data) => context.decodeAudioData(data))
        .then((decoded) => { buffer = decoded; return decoded; })
        .catch((error) => { loadPromise = null; throw error; });
      return loadPromise;
    }

    function stopSource() {
      if (!source) return;
      try { source.stop(); } catch (error) {}
      try { source.disconnect(); } catch (error) {}
      source = null;
    }

    async function start() {
      wanted = true;
      const token = ++requestToken;
      if (isMuted() || !ensure()) return;
      if (context.state === 'suspended') await context.resume();
      try {
        const decoded = await load();
        if (!wanted || isMuted() || token !== requestToken) return;
        stopSource();
        source = context.createBufferSource();
        source.buffer = decoded;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = decoded.duration;
        source.connect(master);
        source.start(0);
      } catch (error) {
        console.warn('Puyo music could not start.', error);
      }
    }

    function pause() {
      if (context && context.state === 'running') context.suspend();
    }

    function resume() {
      wanted = true;
      if (isMuted()) return;
      if (source && context && context.state === 'suspended') context.resume();
      else if (!source) start();
    }

    function stop() {
      wanted = false;
      requestToken++;
      stopSource();
    }

    function setMuted(muted) {
      if (muted) pause();
      else if (wanted) resume();
    }

    function setIntensity(level) {
      intensity = Math.max(0, Math.min(2, Number(level) || 0));
      if (master && context) master.gain.setTargetAtTime(.17 + intensity * .018, context.currentTime, .08);
    }

    return Object.freeze({ start, pause, resume, stop, setMuted, setIntensity, isPlaying: () => wanted });
  }

  global.PuyoMusic = Object.freeze({ VERSION, create });
})(typeof window !== 'undefined' ? window : globalThis);
