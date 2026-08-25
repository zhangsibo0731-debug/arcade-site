(function (global) {
  'use strict';

  const SOUNDS = Object.freeze({
    start: [420, .16, 'triangle'],
    cast: [250, .18, 'sine'],
    bite: [760, .22, 'triangle'],
    hook: [520, .13, 'square'],
    success: [610, .32, 'triangle'],
    rare: [780, .5, 'sine'],
    reel: [185, .48, 'triangle'],
    splash: [330, .18, 'sine'],
    junk: [150, .3, 'triangle'],
    treasure: [660, .56, 'sine'],
    wave: [235, .42, 'sine'],
    lose: [190, .35, 'sawtooth'],
  });

  function create(options) {
    let muted = !!(options && options.muted);
    let audioCtx = null;

    function ensureContext() {
      if (muted) return null;
      if (!audioCtx) {
        try {
          const AudioContext = global.AudioContext || global.webkitAudioContext;
          if (AudioContext) audioCtx = new AudioContext();
        } catch (e) { return null; }
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }

    function play(name) {
      const context = ensureContext();
      if (!context) return;
      const settings = SOUNDS[name] || [320, .08, 'sine'];
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = settings[2];
      oscillator.frequency.setValueAtTime(settings[0], now);
      if (name === 'success' || name === 'rare') oscillator.frequency.exponentialRampToValueAtTime(settings[0] * 1.7, now + settings[1]);
      if (name === 'treasure') oscillator.frequency.exponentialRampToValueAtTime(settings[0] * 2.05, now + settings[1]);
      if (name === 'junk') oscillator.frequency.exponentialRampToValueAtTime(105, now + settings[1]);
      if (name === 'wave') oscillator.frequency.exponentialRampToValueAtTime(92, now + settings[1]);
      if (name === 'reel') oscillator.frequency.linearRampToValueAtTime(290, now + settings[1]);
      if (name === 'splash') oscillator.frequency.exponentialRampToValueAtTime(120, now + settings[1]);
      if (name === 'lose') oscillator.frequency.exponentialRampToValueAtTime(90, now + settings[1]);
      gain.gain.setValueAtTime(.08, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + settings[1]);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + settings[1] + .02);
    }

    function vibrate(pattern) {
      try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
    }

    function setMuted(value) {
      muted = !!value;
      return muted;
    }

    function toggleMuted() {
      return setMuted(!muted);
    }

    return Object.freeze({
      play,
      vibrate,
      setMuted,
      toggleMuted,
      isMuted: () => muted,
    });
  }

  global.FishingAudio = Object.freeze({ SOUNDS, create });
})(window);
