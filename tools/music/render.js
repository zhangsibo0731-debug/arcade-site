'use strict';

const path = require('node:path');
const { renderTrack } = require('./synth-renderer.js');

const tracks = {
  'puyo-theme': () => require('./tracks/puyo-theme.js'),
  'puyo-theme-pressure': () => require('./tracks/puyo-theme-pressure.js'),
  'puyo-moonlit-toyshop-demo': () => require('./tracks/puyo-moonlit-toyshop-demo.js'),
  'puyo-moonlit-toyshop-demo-v2': () => require('./tracks/puyo-moonlit-toyshop-demo-v2.js'),
  'puyo-toy-arcade-demo-v3': () => require('./tracks/puyo-toy-arcade-demo-v3.js'),
  'puyo-theme-audition-a': () => require('./tracks/puyo-theme-audition-a.js'),
  'puyo-theme-audition-b': () => require('./tracks/puyo-theme-audition-b.js'),
  'puyo-theme-audition-c': () => require('./tracks/puyo-theme-audition-c.js'),
  'puyo-theme-hybrid-v4': () => require('./tracks/puyo-theme-hybrid-v4.js'),
  'puyo-theme-hybrid-v4-1': () => require('./tracks/puyo-theme-hybrid-v4-1.js'),
  'puyo-theme-hybrid-v4-2': () => require('./tracks/puyo-theme-hybrid-v4-2.js'),
  'puyo-theme-hybrid-v4-3': () => require('./tracks/puyo-theme-hybrid-v4-3.js'),
  'puyo-quirky-arcade-demo-v5': () => require('./tracks/puyo-quirky-arcade-demo-v5.js'),
  'puyo-quirky-arcade-demo-v6': () => require('./tracks/puyo-quirky-arcade-demo-v6.js'),
};

function usage() {
  const names = Object.keys(tracks).join(', ');
  console.error(`用法: node tools/music/render.js <曲目> [输出路径]\n可用曲目: ${names}`);
}

const trackId = process.argv[2];
if (!trackId || !tracks[trackId]) {
  usage();
  process.exitCode = 1;
} else {
  const track = tracks[trackId]();
  const projectRoot = path.resolve(__dirname, '..', '..');
  const output = path.resolve(projectRoot, process.argv[3] || track.output);
  console.log(JSON.stringify({ track: track.id, ...renderTrack(track, output) }));
}
