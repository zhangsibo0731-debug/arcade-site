'use strict';

const base = require('./puyo-theme.js');
const counterMelody = base.chords.flatMap((chord, barIndex) => {
  if (barIndex >= 20 && barIndex < 22) return [];
  const at = barIndex * 4;
  return barIndex % 2 === 0
    ? [[at + 1.5, chord[2] + 12, .28], [at + 3, chord[1] + 12, .34]]
    : [[at + 1, chord[1] + 12, .28], [at + 2.5, chord[3] + 12, .34]];
});

module.exports = Object.freeze({
  ...base,
  id: 'puyo-theme-pressure',
  output: 'puyo/assets/puyo-theme-pressure.wav',
  profile: 'pressure',
  counterMelody,
});
