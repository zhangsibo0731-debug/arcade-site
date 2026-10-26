(function (global) {
  'use strict';

  const VERSION = 6;
  const CHAIN_NOTES = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];
  const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);

  function create(options) {
    const storage = options.storage;
    const button = options.button;
    const soundOnIcon = options.soundOnIcon;
    const soundOffIcon = options.soundOffIcon;
    let muted = storage.readMuted();
    let context = null;
    let destination = null;
    const voices = new Map();
    const isMuted = () => typeof options.isMuted === 'function' ? options.isMuted() : muted;

    function applyMuted() {
      if (soundOnIcon) soundOnIcon.hidden = isMuted();
      if (soundOffIcon) soundOffIcon.hidden = !isMuted();
      if (button) button.setAttribute('aria-label', isMuted() ? '开启声音' : '关闭声音');
    }

    function ensure() {
      if (isMuted()) return null;
      if (context) return context;
      try {
        const AudioContext = global.AudioContext || global.webkitAudioContext;
        if (!AudioContext && !options.createContext) return null;
        context = options.createContext ? options.createContext() : new AudioContext();
        if (!context) return null;
        destination = options.destinationFor ? options.destinationFor(context) : context.destination;
        return context;
      } catch (e) { context = null; return null; }
    }

    function release(voice) {
      const gain = voices.get(voice);
      voices.delete(voice);
      try { voice.disconnect(); } catch (e) {}
      try { if (gain) gain.disconnect(); } catch (e) {}
    }

    function route(voice, gain) {
      if (voices.size >= 64) {
        const oldest = voices.keys().next().value;
        try { oldest.stop(); } catch (e) {}
        release(oldest);
      }
      voice.connect(gain);
      gain.connect(destination);
      voices.set(voice, gain);
      voice.onended = () => release(voice);
    }

    function stop() {
      Array.from(voices.keys()).forEach((voice) => {
        try { voice.stop(); } catch (e) {}
        release(voice);
      });
    }

    function play(name, chain) {
      const audioContext = ensure();
      if (!audioContext) return;
      if (audioContext.state === 'suspended') {
        const resumed = audioContext.resume();
        if (resumed && resumed.catch) resumed.catch(() => {});
      }
      const now = audioContext.currentTime;
      const addNote = (note, delay, length, volume, wave) => {
        const voice = audioContext.createOscillator();
        const voiceGain = audioContext.createGain();
        voice.type = wave || 'triangle';
        voice.frequency.setValueAtTime(midi(note), now + delay);
        voiceGain.gain.setValueAtTime(0.001, now + delay);
        voiceGain.gain.exponentialRampToValueAtTime(volume, now + delay + .012);
        voiceGain.gain.exponentialRampToValueAtTime(.001, now + delay + length);
        route(voice, voiceGain);
        voice.start(now + delay);
        voice.stop(now + delay + length + .02);
      };
      let freq = 240, dur = 0.06, type = 'sine', vol = 0.07;
      if (name === 'rotate') { freq = 430; dur = 0.07; type = 'triangle'; }
      else if (name === 'land') { freq = 120; dur = 0.06; type = 'square'; vol = 0.04; }
      else if (name === 'drop') { freq = 190; dur = 0.12; type = 'sawtooth'; }
      else if (name === 'clear') { freq = 560; dur = 0.16; type = 'triangle'; vol = 0.1; }
      else if (name === 'allclear') { freq = midi(76); dur = 0.42; type = 'triangle'; vol = 0.1; }
      else if (name === 'chain') { freq = midi(CHAIN_NOTES[Math.min(Math.max(1, chain || 1), 10) - 1]); dur = 0.22; type = 'triangle'; vol = 0.11; }
      else if (name === 'chainEnd') { freq = midi(Math.min(chain || 2, 4) >= 4 ? 79 : 67); dur = 0.3; type = 'triangle'; vol = 0.085; }
      else if (name === 'chainBest') { freq = midi(79); dur = 0.48; type = 'triangle'; vol = 0.105; }
      else if (name === 'level') { freq = 520 + Math.min(chain || 1, 12) * 24; dur = 0.32; type = 'triangle'; vol = 0.1; }
      else if (name === 'start') { freq = 390; dur = 0.18; type = 'triangle'; vol = 0.09; }
      else if (name === 'over') { freq = 260; dur = 0.6; type = 'sawtooth'; vol = 0.1; }
      else if (name === 'move') { freq = 190; dur = 0.025; vol = 0.025; }
      else if (name === 'potion') { freq = midi(72); dur = 0.34; type = 'sine'; vol = 0.085; }
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, now);
      if (name === 'over') oscillator.frequency.exponentialRampToValueAtTime(70, now + dur);
      else if (name === 'chain') oscillator.frequency.exponentialRampToValueAtTime(freq * 1.45, now + dur);
      else if (name === 'chainEnd') oscillator.frequency.exponentialRampToValueAtTime(freq * 1.2, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      route(oscillator, gain);
      oscillator.start(now);
      oscillator.stop(now + dur + 0.02);
      if (name === 'chain' || name === 'chainEnd' || name === 'chainBest' || name === 'level' || name === 'allclear' || name === 'potion') {
        const upper = audioContext.createOscillator();
        const upperGain = audioContext.createGain();
        upper.type = 'sine';
        upper.frequency.setValueAtTime(freq * (name === 'chain' ? 1.5 : name === 'chainEnd' || name === 'chainBest' ? 1.5 : name === 'allclear' || name === 'potion' ? 1.5 : 1.25), now + 0.055);
        upperGain.gain.setValueAtTime(0.001, now);
        upperGain.gain.exponentialRampToValueAtTime(vol * 0.7, now + 0.06);
        upperGain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.08);
        route(upper, upperGain);
        upper.start(now + 0.05);
        upper.stop(now + dur + 0.1);
      }
      if (name === 'allclear') {
        addNote(79, .1, .2, .07);
        addNote(84, .2, .25, .08);
        addNote(88, .33, .34, .065, 'sine');
      } else if (name === 'chainBest') {
        addNote(84, .11, .22, .075);
        addNote(88, .23, .25, .07);
        addNote(91, .36, .38, .06, 'sine');
      } else if (name === 'potion') {
        addNote(76, .08, .18, .06, 'triangle');
        addNote(79, .17, .24, .055, 'sine');
      }
    }

    function haptic(pattern) {
      try { if (global.navigator && global.navigator.vibrate) global.navigator.vibrate(pattern); } catch (e) {}
    }

    function toggle() {
      muted = !muted;
      storage.writeMuted(muted);
      applyMuted();
      if (muted) stop();
      if (!muted) ensure();
      return muted;
    }

    applyMuted();
    return Object.freeze({ ensure, play, haptic, toggle, stop, isMuted });
  }

  global.PuyoAudio = Object.freeze({ VERSION, CHAIN_NOTES, create });
})(typeof window !== 'undefined' ? window : globalThis);
