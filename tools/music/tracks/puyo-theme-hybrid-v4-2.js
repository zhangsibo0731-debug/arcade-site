'use strict';

// V4.2：只修正约 3.3 秒处被误听为“突然降调”的第二短句入口。
const previous = require('./puyo-theme-hybrid-v4-1.js');
const chords = previous.chords.map((chord, index) => index === 2 ? [48,52,55,59] : chord.slice());
const bass = previous.bass.map((note, index) => index === 2 ? 36 : note);
const replacements = new Map([
  [8, 69],
  [8.75, 69],
  [9.5, 72],
  [10.5, 76],
]);
const melody = previous.melody.map(([at, note, length]) => [at, replacements.has(at) ? replacements.get(at) : note, length]);

module.exports = Object.freeze(Object.assign({}, previous, {
  id: 'puyo-theme-hybrid-v4-2',
  VERSION: 1,
  output: 'puyo/assets/puyo-theme-hybrid-v4-2.wav',
  chords,
  bass,
  melody,
}));
