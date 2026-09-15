'use strict';

const fs = require('node:fs');
const path = require('node:path');

function renderTrack(score, output, options = {}) {
const sampleRate = options.sampleRate || 44100;
const frames = Math.ceil(score.loopSeconds * sampleRate);
const mixLeft = new Float32Array(frames);
const mixRight = new Float32Array(frames);
let seed = score.seed || 1;
const arrangement = score.arrangement || {};
const cadenceEvery = arrangement.cadenceEvery || 4;
const pressure = score.profile === 'pressure';
const inRange = (index, range) => Array.isArray(range) && index >= range[0] && index < range[1];

const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function addSample(index, value, pan = 0) {
  const boundedPan = Math.max(-1, Math.min(1, pan));
  const left = boundedPan > 0 ? 1 - boundedPan * .35 : 1;
  const right = boundedPan < 0 ? 1 + boundedPan * .35 : 1;
  mixLeft[index] += value * left;
  mixRight[index] += value * right;
}

function addTone(start, note, duration, type, level, pan = 0) {
  const from = Math.max(0, Math.floor(start * sampleRate));
  const count = Math.min(frames - from, Math.ceil((duration + .1) * sampleRate));
  const frequency = midi(note);
  for (let index = 0; index < count; index += 1) {
    const time = index / sampleRate;
    const attack = Math.min(1, time / .018);
    const release = Math.max(0, Math.min(1, (duration + .08 - time) / .1));
    const envelope = attack * release * Math.exp(-time * 1.15);
    const phase = Math.PI * 2 * frequency * time;
    let wave = Math.sin(phase);
    if (type === 'triangle') wave = 2 / Math.PI * Math.asin(Math.sin(phase));
    else if (type === 'square') wave = Math.sin(phase) >= 0 ? 1 : -1;
    addSample(from + index, wave * envelope * level, pan);
  }
}

function addLead(start, note, duration, harmony) {
  addTone(start, note, duration * .66, 'triangle', pressure ? .092 : .1);
  addTone(start, note + 12, duration * .42, 'square', pressure ? .024 : .008, .08);
  addTone(start + .008, note, duration * .55, 'sine', pressure ? .027 : .022, -.06);
  if (harmony) addTone(start, note - ([0,2,5,7,9].includes(note % 12) ? 3 : 4), duration * .55, 'sine', .028, .14);
}

function addKick(start) {
  const from = Math.floor(start * sampleRate);
  const count = Math.min(frames - from, Math.ceil(.18 * sampleRate));
  let phase = 0;
  for (let index = 0; index < count; index += 1) {
    const time = index / sampleRate;
    const frequency = 48 + 77 * Math.exp(-time * 27);
    phase += Math.PI * 2 * frequency / sampleRate;
    addSample(from + index, Math.sin(phase) * Math.exp(-time * 25) * .11);
  }
}

function addNoise(start, duration, level, bright, pan = 0) {
  const from = Math.floor(start * sampleRate);
  const count = Math.min(frames - from, Math.ceil(duration * sampleRate));
  let previous = 0;
  for (let index = 0; index < count; index += 1) {
    const raw = random() * 2 - 1;
    const filtered = bright ? raw - previous * .78 : raw * .55 + previous * .45;
    previous = raw;
    addSample(from + index, filtered * Math.exp(-index / count * 5) * level, pan);
  }
}

score.chords.forEach((chord, barIndex) => {
  const time = barIndex * score.bar;
  const cadence = barIndex % cadenceEvery === cadenceEvery - 1;
  const bridge = inRange(barIndex, arrangement.bridge);
  const breakdown = inRange(barIndex, arrangement.breakdown);
  const climax = inRange(barIndex, arrangement.climax);
  [0,1,2,1,3,2,1,2].forEach((voice, step) => {
    if ((cadence && step >= 7) || (breakdown && step % 2)) return;
    const pan = step % 2 ? .2 : -.2;
    addTone(time + step * score.beat * .5, chord[voice], score.beat * (bridge ? .38 : .28), 'triangle', bridge ? .015 : (pressure ? .022 : .019), pan);
  });
  addTone(time, score.bass[barIndex], score.beat * .65, 'triangle', climax ? .075 : .065);
  if (!breakdown) addTone(time + score.beat * 2, score.bass[barIndex] + 7, score.beat * .58, 'triangle', .038);
  if (pressure && !breakdown) {
    addTone(time + score.beat, score.bass[barIndex] + 12, score.beat * .32, 'triangle', .026, -.08);
    addTone(time + score.beat * 3, score.bass[barIndex] + 12, score.beat * .32, 'triangle', .023, .08);
    addTone(time + score.beat * 1.5, chord[2] + 12, score.beat * .2, 'square', .007, .24);
    if (!cadence) addTone(time + score.beat * 3.5, chord[1] + 12, score.beat * .2, 'square', .006, -.24);
    addTone(time + score.beat * .5, chord[1] + 12, score.beat * .16, 'square', .012, -.18);
    if (!cadence) addTone(time + score.beat * 2.5, chord[2] + 12, score.beat * .16, 'square', .011, .18);
  }
  if (barIndex === score.chords.length - 1) chord.slice(0, 3).forEach((note) => addTone(time + score.beat * 3, note, score.beat * .9, 'sine', .014));
  if (!breakdown) {
    addKick(time);
    if (!cadence) addKick(time + score.beat * 2);
    if (pressure && !cadence) addKick(time + score.beat * 2.5);
    addNoise(time + score.beat, .11, .03, false, -.1);
    if (!cadence) addNoise(time + score.beat * 3, .11, .032, false, .1);
    for (let part = 0; part < 8; part += 1) {
      if ((cadence && part >= 7) || (bridge && part % 2)) continue;
      addNoise(time + part * score.beat * .5, .025, part % 2 ? (pressure ? .009 : .007) : (pressure ? .013 : .011), true, part % 2 ? .22 : -.22);
    }
  }
  if (climax) {
    addTone(time + score.beat, score.bass[barIndex] + 12, score.beat * .42, 'triangle', .035);
    addTone(time + score.beat * 3, score.bass[barIndex] + 12, score.beat * .42, 'triangle', .03);
  }
});

score.melody.forEach(([at, note, length]) => {
  const barIndex = Math.floor(at / 4);
  if (barIndex % cadenceEvery === cadenceEvery - 1 && barIndex !== score.chords.length - 1 && at % 4 >= 3.5) return;
  const harmony = (inRange(barIndex, arrangement.climax) && at % 1 === 0) || (pressure && at % 4 === 0);
  addLead(at * score.beat, note, length * score.beat * .92, harmony);
});

if (pressure && Array.isArray(score.counterMelody)) {
  score.counterMelody.forEach(([at, note, length], index) => {
    const pan = index % 2 ? .3 : -.3;
    addTone(at * score.beat, note, length * score.beat, 'square', .018, pan);
    addTone((at + .035) * score.beat, note - 12, length * score.beat * .8, 'triangle', .015, -pan);
  });
}

const edgeFadeFrames = Math.min(Math.floor(sampleRate * .006), Math.floor(frames / 2));
for (let index = 0; index < edgeFadeFrames; index += 1) {
  const gain = index / edgeFadeFrames;
  const tailIndex = frames - 1 - index;
  mixLeft[index] *= gain;
  mixRight[index] *= gain;
  mixLeft[tailIndex] *= gain;
  mixRight[tailIndex] *= gain;
}

let peak = 0;
for (let index = 0; index < frames; index += 1) {
  peak = Math.max(peak, Math.abs(mixLeft[index]), Math.abs(mixRight[index]));
}
const scale = peak > 0 ? .88 / peak : 1;
const dataSize = frames * 4;
const wav = Buffer.alloc(44 + dataSize);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataSize, 4); wav.write('WAVE', 8);
wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 4, 28);
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(dataSize, 40);
for (let index = 0; index < frames; index += 1) {
  const left = Math.max(-1, Math.min(1, mixLeft[index] * scale));
  const right = Math.max(-1, Math.min(1, mixRight[index] * scale));
  wav.writeInt16LE(Math.round(left * 32767), 44 + index * 4);
  wav.writeInt16LE(Math.round(right * 32767), 46 + index * 4);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, wav);
return { output, seconds: frames / sampleRate, sampleRate, channels: 2, peak: Number(peak.toFixed(4)), bytes: wav.length };
}

module.exports = { renderTrack };
