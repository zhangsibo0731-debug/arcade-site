'use strict';

// V6：保留 V5 的街机风格，但把主题压缩为五个音、两小节，并先原样重复。
const BPM = 150;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const chords = [
  [50,54,57,59], [43,47,50,52], // D6 G6
  [50,54,57,59], [43,47,50,52], // 原样重复
  [50,54,57,59], [43,47,50,52], // 第二轮
  [47,50,54,57], [45,49,52,55], // Bm7 A7 回转
];
const bass = [38,31,38,31,38,31,35,33];

const phrase = [
  [0,74,.5],[.5,78,.5],[1,81,1],[2.25,78,.5],[3,76,.75],
  [4,83,.75],[5,81,.75],[6,78,1],[7.25,76,.5],
];
const melody = [];
[0, 8, 16].forEach((offset) => phrase.forEach(([at,note,length]) => melody.push([at + offset,note,length])));
melody.push(
  [24,74,.5],[24.5,78,.5],[25,81,1],[26.25,83,.5],[27,81,.75],
  [28,78,.75],[29,76,.75],[30,81,1],[31.25,81,.5],
);

module.exports = Object.freeze({
  id: 'puyo-quirky-arcade-demo-v6',
  VERSION: 1,
  output: 'puyo/assets/puyo-quirky-arcade-demo-v6.wav',
  bpm: BPM,
  beat: BEAT,
  bar: BAR,
  chords,
  bass,
  melody,
  loopSeconds: BAR * chords.length,
  seed: 20260922,
  profile: 'toy-arcade',
  leadGain: 1.3,
  backingGain: .9,
  leadDurationScale: .65,
  autoHarmony: false,
  arrangement: { cadenceEvery: 8, climax: [6, 7] },
});
