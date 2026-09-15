'use strict';

const fs = require('node:fs');
const path = require('node:path');
require('./music.js');

const score = global.PuyoMusic.SCORE;
const sampleRate = 44100;
const frames = Math.ceil(score.loopSeconds * sampleRate);
const mix = new Float32Array(frames);
let seed = 20260915;

const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function addTone(start, note, duration, type, level) {
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
    mix[from + index] += wave * envelope * level;
  }
}

function addLead(start, note, duration, harmony) {
  addTone(start, note, duration * .66, 'triangle', .1);
  addTone(start, note + 12, duration * .42, 'square', .008);
  addTone(start + .008, note, duration * .55, 'sine', .022);
  if (harmony) addTone(start, note - ([0,2,5,7,9].includes(note % 12) ? 3 : 4), duration * .55, 'sine', .028);
}

function addKick(start) {
  const from = Math.floor(start * sampleRate);
  const count = Math.min(frames - from, Math.ceil(.18 * sampleRate));
  let phase = 0;
  for (let index = 0; index < count; index += 1) {
    const time = index / sampleRate;
    const frequency = 48 + 77 * Math.exp(-time * 27);
    phase += Math.PI * 2 * frequency / sampleRate;
    mix[from + index] += Math.sin(phase) * Math.exp(-time * 25) * .11;
  }
}

function addNoise(start, duration, level, bright) {
  const from = Math.floor(start * sampleRate);
  const count = Math.min(frames - from, Math.ceil(duration * sampleRate));
  let previous = 0;
  for (let index = 0; index < count; index += 1) {
    const raw = random() * 2 - 1;
    const filtered = bright ? raw - previous * .78 : raw * .55 + previous * .45;
    previous = raw;
    mix[from + index] += filtered * Math.exp(-index / count * 5) * level;
  }
}

score.chords.forEach((chord, barIndex) => {
  const time = barIndex * score.bar;
  const cadence = barIndex % 4 === 3;
  const bridge = barIndex >= 20 && barIndex < 24;
  const breakdown = barIndex >= 20 && barIndex < 22;
  const climax = barIndex >= 28 && barIndex < 31;
  [0,1,2,1,3,2,1,2].forEach((voice, step) => {
    if ((cadence && step >= 7) || (breakdown && step % 2)) return;
    addTone(time + step * score.beat * .5, chord[voice], score.beat * (bridge ? .38 : .28), 'triangle', bridge ? .015 : .019);
  });
  addTone(time, score.bass[barIndex], score.beat * .65, 'triangle', climax ? .075 : .065);
  if (!breakdown) addTone(time + score.beat * 2, score.bass[barIndex] + 7, score.beat * .58, 'triangle', .038);
  if (barIndex === score.chords.length - 1) chord.slice(0, 3).forEach((note) => addTone(time + score.beat * 3, note, score.beat * .9, 'sine', .014));
  if (!breakdown) {
    addKick(time);
    if (!cadence) addKick(time + score.beat * 2);
    addNoise(time + score.beat, .11, .03, false);
    if (!cadence) addNoise(time + score.beat * 3, .11, .032, false);
    for (let part = 0; part < 8; part += 1) {
      if ((cadence && part >= 7) || (bridge && part % 2)) continue;
      addNoise(time + part * score.beat * .5, .025, part % 2 ? .007 : .011, true);
    }
  }
  if (climax) {
    addTone(time + score.beat, score.bass[barIndex] + 12, score.beat * .42, 'triangle', .035);
    addTone(time + score.beat * 3, score.bass[barIndex] + 12, score.beat * .42, 'triangle', .03);
  }
});

score.melody.forEach(([at, note, length]) => {
  const barIndex = Math.floor(at / 4);
  if (barIndex % 4 === 3 && barIndex !== score.chords.length - 1 && at % 4 >= 3.5) return;
  addLead(at * score.beat, note, length * score.beat * .92, barIndex >= 28 && barIndex < 31 && at % 1 === 0);
});

let peak = 0;
for (const value of mix) peak = Math.max(peak, Math.abs(value));
const scale = peak > 0 ? .88 / peak : 1;
const dataSize = frames * 4;
const wav = Buffer.alloc(44 + dataSize);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataSize, 4); wav.write('WAVE', 8);
wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 4, 28);
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(dataSize, 40);
for (let index = 0; index < frames; index += 1) {
  const value = Math.max(-1, Math.min(1, mix[index] * scale));
  const pcm = Math.round(value * 32767);
  wav.writeInt16LE(pcm, 44 + index * 4);
  wav.writeInt16LE(pcm, 46 + index * 4);
}

const output = path.join(__dirname, 'assets', 'puyo-theme-full-v2.wav');
fs.writeFileSync(output, wav);
console.log(JSON.stringify({ output, seconds: frames / sampleRate, sampleRate, channels: 2, peak: Number(peak.toFixed(4)), bytes: wav.length }));
