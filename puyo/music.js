(function (global) {
  'use strict';

  const VERSION = 1;
  const BPM = 132;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const A_CHORDS = [[48,52,55,60],[55,59,62,65],[57,60,64,69],[53,57,60,64],[48,52,55,60],[55,59,62,65],[57,60,64,69],[52,56,59,62],[53,57,60,64],[55,59,62,65],[50,53,57,60],[55,59,62,65]];
  const A_BASS = [36,43,45,41,36,43,45,40,41,43,38,43];
  const A_MELODY = [
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
    [44,74,.5],[44.5,72,.5],[45,71,.5],[45.5,69,.5],[46,67,.75],[47,67,1],
  ];
  const B_CHORDS = [[57,60,64,69],[52,55,59,64],[53,57,60,65],[48,52,55,60],[50,53,57,62],[57,60,64,69],[53,57,60,65],[55,59,62,65]];
  const B_BASS = [45,40,41,36,38,45,41,43];
  const B_MELODY = [
    [48,72,1],[49,71,.5],[49.5,69,.5],[50,76,1],[51,72,1],
    [52,71,1],[53,67,.5],[53.5,64,.5],[54,67,1.5],[55.5,71,.5],
    [56,69,1],[57,72,.5],[57.5,77,.5],[58,76,1],[59,72,1],
    [60,67,.75],[61,64,.75],[62,67,1],[63,72,1],
    [64,74,1],[65,72,.5],[65.5,69,.5],[66,65,1],[67,69,1],
    [68,72,.75],[69,76,.75],[70,81,1],[71,76,1],
    [72,77,1],[73,76,.5],[73.5,72,.5],[74,69,1],[75,72,1],
    [76,71,.5],[76.5,74,.5],[77,79,1],[78,76,.5],[78.5,74,.5],[79,71,1],
  ];
  const C_CHORDS = [[50,53,57,60],[52,55,59,62],[53,57,60,64],[55,59,62,65]];
  const C_BASS = [38,40,41,43];
  const C_MELODY = [
    [80,62,1.5],[82,65,1],[83,69,1],
    [84,64,1.5],[86,67,1],[87,71,1],
    [88,69,1],[89,72,1],[90,76,2],
    [92,74,.5],[92.5,72,.5],[93,71,1],[94,67,2],
  ];
  const RETURN_CHORDS = A_CHORDS.slice(0, 7).concat([[55,59,62,65]]);
  const RETURN_BASS = A_BASS.slice(0, 7).concat([43]);
  const RETURN_MELODY = A_MELODY.filter(([at]) => at < 28).map(([at, note, length]) => [at + 96, note, length]).concat([
    [124,74,.5],[124.5,72,.5],[125,71,.5],[125.5,69,.5],[126,67,.75],[127,67,1],
  ]);
  const CHORDS = A_CHORDS.concat(B_CHORDS, C_CHORDS, RETURN_CHORDS);
  const BASS = A_BASS.concat(B_BASS, C_BASS, RETURN_BASS);
  const MELODY = A_MELODY.concat(B_MELODY, C_MELODY, RETURN_MELODY);
  const LOOP_SECONDS = BAR * CHORDS.length;
  const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);

  function create(options) {
    const isMuted = options && options.isMuted ? options.isMuted : () => false;
    let context = null;
    let master = null;
    let nodes = [];
    let loopTimer = null;
    let nextStart = 0;
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
      osc.__puyoStopAt = time + duration + .12;
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
      source.__puyoStopAt = time + duration;
    }
    function kick(time) {
      const osc = keep(context.createOscillator());
      const gain = context.createGain();
      osc.frequency.setValueAtTime(125, time); osc.frequency.exponentialRampToValueAtTime(48, time + .12);
      gain.gain.setValueAtTime(.11, time); gain.gain.exponentialRampToValueAtTime(.0001, time + .16);
      osc.connect(gain).connect(master); osc.start(time); osc.stop(time + .18);
      osc.__puyoStopAt = time + .18;
    }
    function schedule(start) {
      CHORDS.forEach((chord, barIndex) => {
        const time = start + barIndex * BAR;
        const cadence = barIndex % 4 === 3;
        const bridge = barIndex >= 20 && barIndex < 24;
        const breakdown = barIndex >= 20 && barIndex < 22;
        const climax = barIndex >= 28 && barIndex < 31;
        [0,1,2,1,3,2,1,2].forEach((voice, step) => {
          if ((cadence && step >= 7) || (breakdown && step % 2)) return;
          tone(time + step * BEAT * .5, chord[voice], BEAT * (bridge ? .38 : .28), 'triangle', bridge ? .015 : .019, 1800);
        });
        tone(time, BASS[barIndex], BEAT * .65, 'triangle', climax ? .075 : .065, 1000);
        if (!breakdown) tone(time + BEAT * 2, BASS[barIndex] + 7, BEAT * .58, 'triangle', .038, 1000);
        if (barIndex === CHORDS.length - 1) {
          chord.slice(0, 3).forEach((note) => tone(time + BEAT * 3, note, BEAT * .9, 'sine', .014, 1400));
        }
        if (!breakdown) {
          kick(time);
          if (!cadence) kick(time + BEAT * 2);
          noise(time + BEAT, .11, .03, 1450, 'bandpass');
          if (!cadence) noise(time + BEAT * 3, .11, .032, 1450, 'bandpass');
          for (let part = 0; part < 8; part += 1) {
            if ((cadence && part >= 7) || (bridge && part % 2)) continue;
            noise(time + part * BEAT * .5, .025, part % 2 ? .007 : .011, 6200, 'highpass');
          }
        }
        if (climax) {
          tone(time + BEAT, BASS[barIndex] + 12, BEAT * .42, 'triangle', .035, 1300);
          tone(time + BEAT * 3, BASS[barIndex] + 12, BEAT * .42, 'triangle', .03, 1300);
        }
      });
      MELODY.forEach(([at, note, length]) => {
        const barIndex = Math.floor(at / 4);
        if (barIndex % 4 === 3 && barIndex !== CHORDS.length - 1 && at % 4 >= 3.5) return;
        const climax = barIndex >= 28 && barIndex < 31 && at % 1 === 0;
        lead(start + at * BEAT, note, length * BEAT * .92, climax);
      });
    }
    function clearScheduled() {
      clearTimeout(loopTimer); loopTimer = null;
      nodes.forEach((node) => { try { node.stop(); } catch (error) {} });
      nodes = [];
      nextStart = 0;
    }
    function queueNextBatch() {
      clearTimeout(loopTimer);
      if (!wanted || isMuted() || !context) return;
      if (context.state !== 'running') {
        loopTimer = setTimeout(queueNextBatch, 250);
        return;
      }
      nodes = nodes.filter((node) => !node.__puyoStopAt || node.__puyoStopAt > context.currentTime);
      schedule(nextStart);
      nextStart += LOOP_SECONDS;
      const wait = Math.max(250, (nextStart - context.currentTime - .8) * 1000);
      loopTimer = setTimeout(queueNextBatch, wait);
    }
    async function start() {
      wanted = true;
      if (isMuted() || !ensure()) return;
      if (context.state === 'suspended') await context.resume();
      clearScheduled();
      nextStart = context.currentTime + .08;
      queueNextBatch();
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

  const SCORE = Object.freeze({ bpm: BPM, beat: BEAT, bar: BAR, chords: CHORDS, bass: BASS, melody: MELODY, loopSeconds: LOOP_SECONDS });
  global.PuyoMusic = Object.freeze({ VERSION, SCORE, create });
})(typeof window !== 'undefined' ? window : globalThis);
