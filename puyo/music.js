(function (global) {
  'use strict';

  const VERSION = 1;
  const BPM = 132;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const CHORDS = [[48,52,55,60],[55,59,62,65],[57,60,64,69],[53,57,60,64],[48,52,55,60],[55,59,62,65],[57,60,64,69],[52,56,59,62],[53,57,60,64],[55,59,62,65],[50,53,57,60],[55,59,62,65]];
  const BASS = [36,43,45,41,36,43,45,40,41,43,38,43];
  const MELODY = [
    [0,64,.5],[.5,67,.5],[1,69,.5],[1.5,67,.5],[2,64,.5],[2.5,65,.5],[3,67,.5],[3.5,64,.5],
    [4,62,.5],[4.5,65,.5],[5,67,.5],[5.5,69,.5],[6,67,.5],[6.5,65,.5],[7,62,1],
    [8,64,.5],[8.5,67,.5],[9,69,.5],[9.5,72,.5],[10,71,.5],[10.5,69,.5],[11,67,.5],[11.5,64,.5],
    [12,65,.5],[12.5,69,.5],[13,67,.5],[13.5,65,.5],[14,64,.5],[14.5,62,.5],[15,60,1],
    [16,64,.5],[16.5,67,.5],[17,69,.5],[17.5,67,.5],[18,64,.5],[18.5,65,.5],[19,67,.5],[19.5,69,.5],
    [20,71,.5],[20.5,69,.5],[21,67,.5],[21.5,65,.5],[22,67,.5],[22.5,69,.5],[23,71,1],
    [24,72,.5],[24.5,71,.5],[25,69,.5],[25.5,67,.5],[26,69,.5],[26.5,72,.5],[27,76,1],
    [28,74,.5],[28.5,71,.5],[29,68,.5],[29.5,71,.5],[30,69,1],[31,68,.5],[31.5,64,.5],
    [32,65,.5],[32.5,67,.5],[33,69,.5],[33.5,72,.5],[34,74,.5],[34.5,72,.5],[35,69,1],
    [36,67,.5],[36.5,69,.5],[37,71,.5],[37.5,74,.5],[38,72,.5],[38.5,71,.5],[39,67,1],
    [40,69,.5],[40.5,67,.5],[41,65,.5],[41.5,64,.5],[42,65,.5],[42.5,69,.5],[43,72,1],
    [44,71,.5],[44.5,69,.5],[45,67,.5],[45.5,65,.5],[46,64,.5],[46.5,62,.5],[47,60,1],
  ];
  const LOOP_SECONDS = BAR * CHORDS.length * 2;
  const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);

  function create(options) {
    const isMuted = options && options.isMuted ? options.isMuted : () => false;
    let context = null;
    let master = null;
    let nodes = [];
    let loopTimer = null;
    let wanted = false;
    let intensity = 0;

    function ensure() {
      if (context) return context;
      const AudioContext = global.AudioContext || global.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 3;
      master.gain.value = .17;
      master.connect(compressor).connect(context.destination);
      return context;
    }
    function keep(node) { nodes.push(node); return node; }
    function env(gain, time, duration, peak, release) {
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.exponentialRampToValueAtTime(peak, time + .018);
      gain.gain.setValueAtTime(peak * .72, time + Math.min(duration * .42, .18));
      gain.gain.exponentialRampToValueAtTime(.0001, time + duration + release);
    }
    function tone(time, note, duration, type, peak, cutoff) {
      const osc = keep(context.createOscillator());
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      osc.type = type; osc.frequency.setValueAtTime(midi(note), time);
      filter.type = 'lowpass'; filter.frequency.value = cutoff;
      env(gain, time, duration, peak, .1);
      osc.connect(filter).connect(gain).connect(master);
      osc.start(time); osc.stop(time + duration + .12);
    }
    function lead(time, note, duration, harmony) {
      tone(time, note, duration * .66, 'triangle', .1, 3100);
      tone(time, note + 12, duration * .42, 'square', .008, 3800);
      tone(time + .008, note, duration * .55, 'sine', .022, 2400);
      if (harmony) tone(time, note - ([0,2,5,7,9].includes(note % 12) ? 3 : 4), duration * .55, 'sine', .028, 2700);
    }
    function noise(time, duration, peak, frequency, type) {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
      const source = keep(context.createBufferSource());
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer; filter.type = type; filter.frequency.value = frequency;
      gain.gain.setValueAtTime(peak, time); gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
      source.connect(filter).connect(gain).connect(master); source.start(time); source.stop(time + duration);
    }
    function kick(time) {
      const osc = keep(context.createOscillator());
      const gain = context.createGain();
      osc.frequency.setValueAtTime(125, time); osc.frequency.exponentialRampToValueAtTime(48, time + .12);
      gain.gain.setValueAtTime(.11, time); gain.gain.exponentialRampToValueAtTime(.0001, time + .16);
      osc.connect(gain).connect(master); osc.start(time); osc.stop(time + .18);
    }
    function schedule(start) {
      for (let loop = 0; loop < 2; loop += 1) {
        const offset = loop * CHORDS.length * BAR;
        CHORDS.forEach((chord, barIndex) => {
          const time = start + offset + barIndex * BAR;
          const cadence = barIndex % 4 === 3;
          const breakdown = loop === 1 && barIndex < 2;
          [0,1,2,1,3,2,1,2].forEach((voice, step) => {
            if ((cadence && step >= 6) || (breakdown && step % 2)) return;
            tone(time + step * BEAT * .5, chord[voice], BEAT * .28, 'triangle', .019, 1800);
          });
          tone(time, BASS[barIndex], BEAT * .65, 'triangle', .065, 1000);
          tone(time + BEAT * 2, BASS[barIndex] + 7, BEAT * .58, 'triangle', .038, 1000);
          if (!breakdown) {
            kick(time);
            if (!cadence) kick(time + BEAT * 2);
            noise(time + BEAT, .11, .03, 1450, 'bandpass');
            if (!cadence) noise(time + BEAT * 3, .11, .032, 1450, 'bandpass');
            for (let part = 0; part < 8; part += 1) {
              if (cadence && part >= 6) continue;
              noise(time + part * BEAT * .5, .025, part % 2 ? .007 : .011, 6200, 'highpass');
            }
          }
        });
        MELODY.forEach(([at, note, length]) => {
          const barIndex = Math.floor(at / 4);
          if (barIndex % 4 === 3 && at % 4 >= 3) return;
          const climax = loop === 1 && barIndex >= 8 && barIndex < 11 && at % 1 === 0;
          lead(start + offset + at * BEAT, note, length * BEAT * .92, climax);
        });
      }
    }
    function clearScheduled() {
      clearTimeout(loopTimer); loopTimer = null;
      nodes.forEach((node) => { try { node.stop(); } catch (error) {} });
      nodes = [];
    }
    async function start() {
      wanted = true;
      if (isMuted() || !ensure()) return;
      if (context.state === 'suspended') await context.resume();
      clearScheduled();
      schedule(context.currentTime + .08);
      loopTimer = setTimeout(() => { if (wanted && !isMuted()) start(); }, (LOOP_SECONDS - .08) * 1000);
    }
    function pause() {
      if (context && context.state === 'running') context.suspend();
    }
    function resume() {
      wanted = true;
      if (!isMuted() && context && context.state === 'suspended') context.resume();
      else if (!isMuted() && !context) start();
    }
    function stop() { wanted = false; clearScheduled(); }
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
