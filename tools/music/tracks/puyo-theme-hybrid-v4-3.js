'use strict';

// V4.3：将所有明显下坠的长回答统一改为向上展开。
const previous = require('./puyo-theme-hybrid-v4-2.js');
const chords = previous.chords.map((chord, index) => index === 5 ? [48,52,55,60] : chord.slice());
const bass = previous.bass.map((note, index) => index === 5 ? 36 : note);
const replacements = new Map([
  [4,69], [5,72], [6.25,74],
  [12,68], [13,71], [14.25,74],
  [20,72], [21,76], [22.25,79],
  [28,68], [29,71], [30.25,76],
  [36,72], [37,76], [38,77],
  [40,65], [40.75,69], [41.5,72], [42.5,74],
]);
const melody = previous.melody.map(([at, note, length]) => [at, replacements.has(at) ? replacements.get(at) : note, length]);

module.exports = Object.freeze(Object.assign({}, previous, {
  id: 'puyo-theme-hybrid-v4-3',
  VERSION: 1,
  output: 'puyo/assets/puyo-theme-hybrid-v4-3.wav',
  chords,
  bass,
  melody,
}));
