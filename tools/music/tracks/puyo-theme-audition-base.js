'use strict';

const BPM = 146;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const chords = [
  [45, 48, 52, 57], [41, 45, 48, 53], [48, 52, 55, 60], [43, 47, 50, 55],
  [45, 48, 52, 57], [41, 45, 48, 53], [38, 41, 45, 50], [40, 44, 47, 52],
];
const bass = [33, 29, 36, 31, 33, 29, 26, 28];

module.exports = function createAudition(id, melody) {
  return Object.freeze({
    id,
    VERSION: 1,
    output: 'puyo/assets/' + id + '.wav',
    bpm: BPM,
    beat: BEAT,
    bar: BAR,
    chords,
    bass,
    melody,
    loopSeconds: BAR * chords.length,
    seed: 20260919,
    profile: 'toy-arcade',
    leadGain: 1.35,
    arrangement: { cadenceEvery: 8, climax: [4, 7] },
  });
};
