(function () {
  'use strict';

  const phrase = (start, notes) => notes.map(([at, note, length]) => [start + at, note, length]);
  const SONGS = {
    moon: {
      bpm: 112,
      chords: [[53,57,60,64],[55,59,62,65],[52,55,59,62],[57,60,64,67],[53,57,60,64],[55,59,62,65],[48,52,55,59],[52,56,59,62],[53,57,60,64],[55,59,62,65],[50,53,57,60],[48,52,55,59]],
      bass: [41,43,40,45,41,43,36,40,41,43,38,36],
      melody: [
        ...phrase(0,[[0,69,.5],[.5,67,.5],[1,65,1],[2,67,.5],[2.5,69,.5],[3,72,1]]),
        ...phrase(4,[[0,71,.5],[.5,69,.5],[1,67,1],[2,69,.5],[2.5,67,.5],[3,62,1]]),
        ...phrase(8,[[0,64,.5],[.5,67,.5],[1,71,1],[2,69,.5],[2.5,67,.5],[3,64,1]]),
        ...phrase(12,[[0,64,.5],[.5,65,.5],[1,67,1],[2,69,1],[3,67,1]]),
        ...phrase(16,[[0,69,.5],[.5,67,.5],[1,65,1],[2,67,.5],[2.5,69,.5],[3,72,1]]),
        ...phrase(20,[[0,74,.5],[.5,72,.5],[1,71,1],[2,69,.5],[2.5,67,.5],[3,62,1]]),
        ...phrase(24,[[0,64,.5],[.5,67,.5],[1,72,1],[2,71,.5],[2.5,69,.5],[3,67,1]]),
        ...phrase(28,[[0,68,.5],[.5,71,.5],[1,76,1],[2,74,.5],[2.5,71,.5],[3,68,1]]),
        ...phrase(32,[[0,72,.5],[.5,74,.5],[1,76,1],[2,74,.5],[2.5,72,.5],[3,69,1]]),
        ...phrase(36,[[0,71,.5],[.5,72,.5],[1,74,1],[2,72,.5],[2.5,71,.5],[3,67,1]]),
        ...phrase(40,[[0,65,.5],[.5,69,.5],[1,72,1],[2,69,.5],[2.5,67,.5],[3,65,1]]),
        ...phrase(44,[[0,64,1],[1,62,.5],[1.5,64,.5],[2,60,2]]),
      ],
    },
    parade: {
      bpm: 120,
      chords: [[55,59,62,67],[50,54,57,62],[52,55,59,64],[48,52,55,59],[55,59,62,67],[50,54,57,62],[48,52,55,59],[50,54,57,60],[52,55,59,64],[48,52,55,60],[50,54,57,62],[55,59,62,67]],
      bass: [43,38,40,36,43,38,36,38,40,36,38,43],
      melody: [
        ...phrase(0,[[0,67,.5],[.5,69,.5],[1,71,.5],[1.5,74,.5],[2,71,1],[3,67,1]]),
        ...phrase(4,[[0,66,.5],[.5,69,.5],[1,74,1],[2,72,.5],[2.5,69,.5],[3,66,1]]),
        ...phrase(8,[[0,64,.5],[.5,67,.5],[1,71,1],[2,69,.5],[2.5,67,.5],[3,64,1]]),
        ...phrase(12,[[0,67,.5],[.5,64,.5],[1,60,1],[2,62,.5],[2.5,64,.5],[3,67,1]]),
        ...phrase(16,[[0,67,.5],[.5,69,.5],[1,71,.5],[1.5,74,.5],[2,79,1],[3,76,1]]),
        ...phrase(20,[[0,74,.5],[.5,72,.5],[1,69,1],[2,66,.5],[2.5,69,.5],[3,74,1]]),
        ...phrase(24,[[0,76,.5],[.5,74,.5],[1,72,1],[2,71,.5],[2.5,69,.5],[3,67,1]]),
        ...phrase(28,[[0,69,.5],[.5,67,.5],[1,66,1],[2,62,2]]),
        ...phrase(32,[[0,71,.5],[.5,72,.5],[1,74,1],[2,71,.5],[2.5,67,.5],[3,64,1]]),
        ...phrase(36,[[0,67,.5],[.5,69,.5],[1,72,1],[2,76,.5],[2.5,74,.5],[3,72,1]]),
        ...phrase(40,[[0,69,.5],[.5,71,.5],[1,74,1],[2,72,.5],[2.5,69,.5],[3,66,1]]),
        ...phrase(44,[[0,67,.5],[.5,69,.5],[1,71,1],[2,67,2]]),
      ],
    },
    capsule: {
      bpm: 116,
      chords: [[57,60,64,69],[55,59,62,67],[53,57,60,64],[52,56,59,64],[57,60,64,69],[55,59,62,67],[53,57,60,64],[52,56,59,62],[50,53,57,60],[52,55,59,62],[53,57,60,64],[52,56,59,64]],
      bass: [45,43,41,40,45,43,41,40,38,40,41,40],
      melody: [
        ...phrase(0,[[0,72,.75],[1,69,.5],[1.5,71,.5],[2.25,72,.75],[3.25,76,.75]]),
        ...phrase(4,[[0,74,.75],[1,71,.5],[1.5,69,.5],[2.25,67,.75],[3.25,71,.75]]),
        ...phrase(8,[[0,69,.75],[1,65,.5],[1.5,67,.5],[2.25,69,.75],[3.25,72,.75]]),
        ...phrase(12,[[0,71,.5],[.5,68,.5],[1,64,1],[2.25,68,.5],[2.75,71,.5],[3.25,76,.75]]),
        ...phrase(16,[[0,72,.75],[1,76,.5],[1.5,74,.5],[2.25,72,.75],[3.25,69,.75]]),
        ...phrase(20,[[0,71,.75],[1,74,.5],[1.5,72,.5],[2.25,71,.75],[3.25,67,.75]]),
        ...phrase(24,[[0,69,.5],[.5,72,.5],[1,77,1],[2.25,76,.5],[2.75,72,.5],[3.25,69,.75]]),
        ...phrase(28,[[0,68,.5],[.5,71,.5],[1,76,1],[2.25,74,.5],[2.75,71,.5],[3.25,68,.75]]),
        ...phrase(32,[[0,69,.75],[1,72,.5],[1.5,74,.5],[2.25,72,.75],[3.25,69,.75]]),
        ...phrase(36,[[0,67,.75],[1,71,.5],[1.5,72,.5],[2.25,71,.75],[3.25,67,.75]]),
        ...phrase(40,[[0,65,.5],[.5,69,.5],[1,72,1],[2.25,69,.5],[2.75,67,.5],[3.25,65,.75]]),
        ...phrase(44,[[0,64,.75],[1,68,.5],[1.5,71,.5],[2.25,64,1.75]]),
      ],
    },
    starlight: {
      bpm: 104,
      chords: [[48,52,55,59],[52,55,59,62],[45,48,52,55],[53,57,60,64],[48,52,55,59],[52,55,59,62],[50,53,57,60],[55,59,62,65],[48,52,55,59],[45,48,52,55],[53,57,60,64],[48,52,55,59]],
      bass: [36,40,33,41,36,40,38,43,36,33,41,36],
      melody: [
        ...phrase(0,[[0,67,1],[1,64,.5],[1.5,67,.5],[2,71,1.5],[3.5,72,.5]]),
        ...phrase(4,[[0,71,1],[1,67,.5],[1.5,64,.5],[2,62,2]]),
        ...phrase(8,[[0,64,1],[1,60,.5],[1.5,64,.5],[2,67,1],[3,69,1]]),
        ...phrase(12,[[0,65,1],[1,69,.5],[1.5,72,.5],[2,69,2]]),
        ...phrase(16,[[0,67,1],[1,64,.5],[1.5,67,.5],[2,72,1.5],[3.5,74,.5]]),
        ...phrase(20,[[0,71,1],[1,67,.5],[1.5,71,.5],[2,76,2]]),
        ...phrase(24,[[0,74,1],[1,72,.5],[1.5,69,.5],[2,67,1],[3,65,1]]),
        ...phrase(28,[[0,62,.5],[.5,65,.5],[1,69,1],[2,67,2]]),
        ...phrase(32,[[0,72,1],[1,71,.5],[1.5,67,.5],[2,64,1],[3,67,1]]),
        ...phrase(36,[[0,69,1],[1,67,.5],[1.5,64,.5],[2,60,2]]),
        ...phrase(40,[[0,65,1],[1,69,.5],[1.5,72,.5],[2,74,1],[3,72,1]]),
        ...phrase(44,[[0,71,1],[1,67,1],[2,64,.5],[2.5,62,.5],[3,60,1]]),
      ],
    },
    fusion: {
      bpm: 116,
      swing: .055,
      chords: [[48,52,55,59],[55,59,62,65],[57,60,64,67],[53,57,60,64],[48,52,55,59],[55,59,62,65],[57,60,64,67],[52,56,59,62],[53,57,60,64],[55,59,62,65],[50,53,57,60],[48,52,55,59]],
      bass: [36,43,45,41,36,43,45,40,41,43,38,36],
      melody: [
        ...phrase(0,[[0,67,.75],[1,69,.5],[1.5,71,.5],[2,72,1],[3,67,1]]),
        ...phrase(4,[[0,69,.5],[.5,67,.5],[1,65,1],[2,67,.5],[2.5,69,.5],[3,71,1]]),
        ...phrase(8,[[0,72,.75],[1,71,.5],[1.5,69,.5],[2,67,1],[3,64,1]]),
        ...phrase(12,[[0,65,.5],[.5,69,.5],[1,72,1],[2,69,.5],[2.5,67,.5],[3,65,1]]),
        ...phrase(16,[[0,67,.75],[1,69,.5],[1.5,71,.5],[2,72,.5],[2.5,74,.5],[3,76,1]]),
        ...phrase(20,[[0,74,.5],[.5,72,.5],[1,71,1],[2,67,.5],[2.5,69,.5],[3,71,1]]),
        ...phrase(24,[[0,72,.5],[.5,76,.5],[1,81,1],[2,79,.5],[2.5,76,.5],[3,72,1]]),
        ...phrase(28,[[0,71,.75],[1,68,.5],[1.5,71,.5],[2,76,2]]),
        ...phrase(32,[[0,72,.75],[1,69,.5],[1.5,72,.5],[2,77,1],[3,76,1]]),
        ...phrase(36,[[0,74,.5],[.5,72,.5],[1,71,1],[2,69,.5],[2.5,67,.5],[3,65,1]]),
        ...phrase(40,[[0,65,.5],[.5,69,.5],[1,72,1],[2,74,.5],[2.5,72,.5],[3,69,1]]),
        ...phrase(44,[[0,67,.75],[1,64,.5],[1.5,62,.5],[2,60,2]]),
      ],
    },
    poploop: {
      bpm: 132,
      puzzle: true,
      chords: [[48,52,55,60],[55,59,62,65],[57,60,64,69],[53,57,60,64],[48,52,55,60],[55,59,62,65],[57,60,64,69],[52,56,59,62],[53,57,60,64],[55,59,62,65],[50,53,57,60],[55,59,62,65]],
      bass: [36,43,45,41,36,43,45,40,41,43,38,43],
      melody: [
        ...phrase(0,[[0,72,.5],[.5,76,.5],[1,79,.5],[1.5,76,.5],[2,74,.5],[2.5,72,.5],[3,67,.5],[3.5,69,.5]]),
        ...phrase(4,[[0,71,.5],[.5,74,.5],[1,79,.5],[1.5,74,.5],[2,72,.5],[2.5,71,.5],[3,67,1]]),
        ...phrase(8,[[0,72,.5],[.5,76,.5],[1,81,.5],[1.5,76,.5],[2,74,.5],[2.5,72,.5],[3,69,.5],[3.5,72,.5]]),
        ...phrase(12,[[0,77,.5],[.5,76,.5],[1,74,.5],[1.5,72,.5],[2,69,.5],[2.5,67,.5],[3,65,1]]),
        ...phrase(16,[[0,72,.5],[.5,76,.5],[1,79,.5],[1.5,76,.5],[2,74,.5],[2.5,72,.5],[3,67,.5],[3.5,69,.5]]),
        ...phrase(20,[[0,71,.5],[.5,74,.5],[1,79,.5],[1.5,81,.5],[2,79,.5],[2.5,76,.5],[3,74,1]]),
        ...phrase(24,[[0,76,.5],[.5,79,.5],[1,84,1],[2,81,.5],[2.5,79,.5],[3,76,1]]),
        ...phrase(28,[[0,74,.5],[.5,71,.5],[1,68,.5],[1.5,71,.5],[2,76,1],[3,74,.5],[3.5,71,.5]]),
        ...phrase(32,[[0,77,.5],[.5,76,.5],[1,74,.5],[1.5,72,.5],[2,69,.5],[2.5,72,.5],[3,77,1]]),
        ...phrase(36,[[0,79,.5],[.5,77,.5],[1,76,.5],[1.5,74,.5],[2,71,.5],[2.5,74,.5],[3,79,1]]),
        ...phrase(40,[[0,81,.5],[.5,79,.5],[1,77,.5],[1.5,76,.5],[2,74,.5],[2.5,72,.5],[3,69,1]]),
        ...phrase(44,[[0,71,.5],[.5,74,.5],[1,79,.5],[1.5,77,.5],[2,76,.5],[2.5,74,.5],[3,72,1]]),
      ],
    },
    popmelody: {
      bpm: 132,
      puzzle: true,
      chords: [[48,52,55,60],[55,59,62,65],[57,60,64,69],[53,57,60,64],[48,52,55,60],[55,59,62,65],[57,60,64,69],[52,56,59,62],[53,57,60,64],[55,59,62,65],[50,53,57,60],[55,59,62,65]],
      bass: [36,43,45,41,36,43,45,40,41,43,38,43],
      melody: [
        ...phrase(0,[[0,64,.5],[.5,67,.5],[1,69,.5],[1.5,67,.5],[2,64,.5],[2.5,65,.5],[3,67,.5],[3.5,64,.5]]),
        ...phrase(4,[[0,62,.5],[.5,65,.5],[1,67,.5],[1.5,69,.5],[2,67,.5],[2.5,65,.5],[3,62,1]]),
        ...phrase(8,[[0,64,.5],[.5,67,.5],[1,69,.5],[1.5,72,.5],[2,71,.5],[2.5,69,.5],[3,67,.5],[3.5,64,.5]]),
        ...phrase(12,[[0,65,.5],[.5,69,.5],[1,67,.5],[1.5,65,.5],[2,64,.5],[2.5,62,.5],[3,60,1]]),
        ...phrase(16,[[0,64,.5],[.5,67,.5],[1,69,.5],[1.5,67,.5],[2,64,.5],[2.5,65,.5],[3,67,.5],[3.5,69,.5]]),
        ...phrase(20,[[0,71,.5],[.5,69,.5],[1,67,.5],[1.5,65,.5],[2,67,.5],[2.5,69,.5],[3,71,1]]),
        ...phrase(24,[[0,72,.5],[.5,71,.5],[1,69,.5],[1.5,67,.5],[2,69,.5],[2.5,72,.5],[3,76,1]]),
        ...phrase(28,[[0,74,.5],[.5,71,.5],[1,68,.5],[1.5,71,.5],[2,69,1],[3,68,.5],[3.5,64,.5]]),
        ...phrase(32,[[0,65,.5],[.5,67,.5],[1,69,.5],[1.5,72,.5],[2,74,.5],[2.5,72,.5],[3,69,1]]),
        ...phrase(36,[[0,67,.5],[.5,69,.5],[1,71,.5],[1.5,74,.5],[2,72,.5],[2.5,71,.5],[3,67,1]]),
        ...phrase(40,[[0,69,.5],[.5,67,.5],[1,65,.5],[1.5,64,.5],[2,65,.5],[2.5,69,.5],[3,72,1]]),
        ...phrase(44,[[0,71,.5],[.5,69,.5],[1,67,.5],[1.5,65,.5],[2,64,.5],[2.5,62,.5],[3,60,1]]),
      ],
    },
  };
  SONGS.finalmix = Object.assign({}, SONGS.popmelody, { loops: 2, arranged: true });
  SONGS.breathmix = Object.assign({}, SONGS.popmelody, { loops: 2, arranged: true, breathing: true });
  SONGS.climaxmix = Object.assign({}, SONGS.popmelody, { loops: 2, arranged: true, breathing: true, climax: true });
  Object.freeze(SONGS);

  let context;
  let master;
  let active = [];
  let finishTimer;
  let activeButton;
  let volume = .75;
  const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);

  function ensureAudio() {
    if (context) return context;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 3;
    master.gain.value = volume * .52;
    master.connect(compressor).connect(context.destination);
    return context;
  }

  function remember(node) { active.push(node); return node; }
  function envelope(gain, time, duration, peak, release) {
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + .018);
    gain.gain.setValueAtTime(peak * .72, time + Math.min(duration * .42, .18));
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration + release);
  }
  function tone(time, note, duration, type, peak, cutoff) {
    const osc = remember(context.createOscillator());
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(midi(note), time);
    filter.type = 'lowpass'; filter.frequency.value = cutoff;
    envelope(gain, time, duration, peak, .1);
    osc.connect(filter).connect(gain).connect(master);
    osc.start(time); osc.stop(time + duration + .12);
  }
  function leadTone(time, note, duration, puzzle, arranged) {
    tone(time, note, duration * (puzzle ? .66 : 1), 'triangle', puzzle ? .112 : .1, 3100);
    tone(time, note + 12, duration * (puzzle ? .42 : .68), puzzle ? 'square' : 'sine', puzzle ? .009 : .014, 3800);
    if (arranged) tone(time + .008, note, duration * .55, 'sine', .025, 2400);
  }
  function kick(time) {
    const osc = remember(context.createOscillator());
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + .12);
    gain.gain.setValueAtTime(.12, time);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .16);
    osc.connect(gain).connect(master); osc.start(time); osc.stop(time + .18);
  }
  function noiseHit(time, duration, peak, frequency, type) {
    const frames = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;
    const source = remember(context.createBufferSource());
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer; filter.type = type; filter.frequency.value = frequency;
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(time); source.stop(time + duration);
  }
  function drums(time, beat, barIndex, full, cadence) {
    kick(time);
    if (!cadence) kick(time + beat * (barIndex % 4 === 3 ? 2.5 : 2));
    noiseHit(time + beat, .11, .035, 1450, 'bandpass');
    if (!cadence) noiseHit(time + beat * 3, .11, .038, 1450, 'bandpass');
    for (let part = 0; part < 8; part += 1) {
      if (!full && part % 2) continue;
      if (cadence && part >= 6) continue;
      noiseHit(time + part * beat * .5, .025, part % 2 ? .009 : .014, 6200, 'highpass');
    }
  }
  function thirdBelow(note) {
    return note - ([0, 2, 5, 7, 9].includes(note % 12) ? 3 : 4);
  }
  function tick(time, strong) {
    const osc = remember(context.createOscillator());
    const gain = context.createGain();
    osc.type = 'sine'; osc.frequency.value = strong ? 880 : 1280;
    gain.gain.setValueAtTime(strong ? .012 : .006, time);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .035);
    osc.connect(gain).connect(master); osc.start(time); osc.stop(time + .04);
  }
  function stop() {
    clearTimeout(finishTimer);
    active.forEach((node) => { try { node.stop(); } catch (error) {} });
    active = [];
    if (activeButton) activeButton.classList.remove('is-playing');
    activeButton = null;
    document.getElementById('status').textContent = '选择一版试听';
  }
  async function play(id, button) {
    const song = SONGS[id];
    if (!song || !ensureAudio()) return;
    if (context.state === 'suspended') await context.resume();
    stop();
    activeButton = button; button.classList.add('is-playing');
    const beat = 60 / song.bpm;
    const bar = beat * 4;
    const start = context.currentTime + .08;
    const loops = song.loops || 1;
    for (let loop = 0; loop < loops; loop += 1) {
      const loopOffset = loop * song.chords.length * bar;
      song.chords.forEach((chord, index) => {
        const time = start + loopOffset + index * bar;
        const cadence = !!song.breathing && index % 4 === 3;
        const breakdown = !!song.breathing && loop === 1 && index < 2;
        const climax = !!song.climax && loop === 1 && index >= 8 && index < 11;
        if (song.puzzle) {
          [0,1,2,1,3,2,1,2].forEach((voice, step) => {
            if ((cadence && step >= 6) || (breakdown && step % 2)) return;
            tone(time + step * beat * .5, chord[voice], beat * .28, 'triangle', song.arranged ? .021 : .026, 1800);
          });
        } else {
          chord.forEach((note) => tone(time, note, bar * .86, 'sine', .024, 1500));
        }
        tone(time, song.bass[index], beat * .65, 'triangle', song.arranged ? .076 : .068, 1000);
        tone(time + beat * 2, song.bass[index] + 7, beat * .58, 'triangle', .045, 1000);
        if (climax) {
          tone(time + beat, song.bass[index] + 12, beat * .42, 'triangle', .04, 1300);
          tone(time + beat * 3, song.bass[index] + 12, beat * .42, 'triangle', .035, 1300);
        }
        if (song.arranged && !breakdown) drums(time, beat, index, loop === 1 || index >= 4, cadence);
        else for (let part = 0; part < 4; part += 1) tick(time + part * beat, part === 0);
        if (song.arranged && loop === 1 && index >= 4) {
          tone(time + beat * 1.5, chord[3] + 12, beat * .24, 'sine', .018, 3900);
          tone(time + beat * 3.5, chord[2] + 12, beat * .24, 'sine', .014, 3900);
        }
      });
      song.melody.forEach(([at, note, length]) => {
        if (song.breathing && Math.floor(at / 4) % 4 === 3 && at % 4 >= 3) return;
        const swing = song.swing && at % 1 !== 0 ? song.swing * beat : 0;
        const time = start + loopOffset + at * beat + swing;
        leadTone(time, note, length * beat * .92, song.puzzle, song.arranged);
        const barIndex = Math.floor(at / 4);
        if (song.climax && loop === 1 && barIndex >= 8 && barIndex < 11 && at % 1 === 0) {
          tone(time, thirdBelow(note), length * beat * .7, 'sine', .032, 2800);
        }
      });
    }
    const seconds = bar * song.chords.length * loops;
    document.getElementById('status').textContent = `正在播放 ${button.dataset.number} 号 · 约 ${Math.round(seconds)} 秒`;
    finishTimer = setTimeout(stop, (seconds + .4) * 1000);
  }

  document.querySelectorAll('[data-song]').forEach((button) => button.addEventListener('click', () => play(button.dataset.song, button)));
  document.getElementById('stop').addEventListener('click', stop);
  const volumeInput = document.getElementById('volume');
  const volumeValue = document.getElementById('volumeValue');
  volumeInput.addEventListener('input', () => {
    volume = Number(volumeInput.value) / 100;
    volumeValue.value = `${volumeInput.value}%`;
    if (master && context) master.gain.setTargetAtTime(volume * .52, context.currentTime, .05);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
})();
