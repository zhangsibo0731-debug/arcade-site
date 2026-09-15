'use strict';

const path = require('node:path');
const { renderTrack } = require('./synth-renderer.js');

const tracks = {
  'puyo-theme': () => require('./tracks/puyo-theme.js'),
  'puyo-theme-pressure': () => require('./tracks/puyo-theme-pressure.js'),
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
