(function (global) {
  'use strict';

  const VERSION = 1;

  function create(options) {
    const storage = options.storage;
    const button = options.button;
    const soundOnIcon = options.soundOnIcon;
    const soundOffIcon = options.soundOffIcon;
    let muted = storage.readMuted();
    let context = null;

    function applyMuted() {
      soundOnIcon.hidden = muted;
      soundOffIcon.hidden = !muted;
      button.setAttribute('aria-label', muted ? '开启声音' : '关闭声音');
    }

    function ensure() {
      if (muted) return null;
      if (context) return context;
      try {
        const AudioContext = global.AudioContext || global.webkitAudioContext;
        if (!AudioContext) return null;
        context = new AudioContext();
        return context;
      } catch (e) { return null; }
    }

    function play(name, chain) {
      const audioContext = ensure();
      if (!audioContext) return;
      if (audioContext.state === 'suspended') audioContext.resume();
      const now = audioContext.currentTime;
      let freq = 240, dur = 0.06, type = 'sine', vol = 0.07;
      if (name === 'rotate') { freq = 430; dur = 0.07; type = 'triangle'; }
      else if (name === 'land') { freq = 120; dur = 0.06; type = 'square'; vol = 0.04; }
      else if (name === 'drop') { freq = 190; dur = 0.12; type = 'sawtooth'; }
      else if (name === 'clear') { freq = 560; dur = 0.16; type = 'triangle'; vol = 0.1; }
      else if (name === 'chain') { freq = 520 + Math.min(chain || 1, 10) * 75; dur = 0.22; type = 'triangle'; vol = 0.11; }
      else if (name === 'level') { freq = 520 + Math.min(chain || 1, 12) * 24; dur = 0.32; type = 'triangle'; vol = 0.1; }
      else if (name === 'start') { freq = 390; dur = 0.18; type = 'triangle'; vol = 0.09; }
      else if (name === 'over') { freq = 260; dur = 0.6; type = 'sawtooth'; vol = 0.1; }
      else if (name === 'move') { freq = 190; dur = 0.025; vol = 0.025; }
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, now);
      if (name === 'over') oscillator.frequency.exponentialRampToValueAtTime(70, now + dur);
      else if (name === 'chain') oscillator.frequency.exponentialRampToValueAtTime(freq * 1.45, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + dur + 0.02);
      if (name === 'chain' || name === 'level') {
        const upper = audioContext.createOscillator();
        const upperGain = audioContext.createGain();
        upper.type = 'sine';
        upper.frequency.setValueAtTime(freq * (name === 'chain' ? 1.5 : 1.25), now + 0.055);
        upperGain.gain.setValueAtTime(0.001, now);
        upperGain.gain.exponentialRampToValueAtTime(vol * 0.7, now + 0.06);
        upperGain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.08);
        upper.connect(upperGain);
        upperGain.connect(audioContext.destination);
        upper.start(now + 0.05);
        upper.stop(now + dur + 0.1);
      }
    }

    function haptic(pattern) {
      try { if (global.navigator && global.navigator.vibrate) global.navigator.vibrate(pattern); } catch (e) {}
    }

    function toggle() {
      muted = !muted;
      storage.writeMuted(muted);
      applyMuted();
      if (!muted) ensure();
      return muted;
    }

    applyMuted();
    return Object.freeze({ ensure, play, haptic, toggle, isMuted: () => muted });
  }

  global.PuyoAudio = Object.freeze({ VERSION, create });
})(typeof window !== 'undefined' ? window : globalThis);
