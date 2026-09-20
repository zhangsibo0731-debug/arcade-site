'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const projectRoot = path.resolve(__dirname, '..', '..');
const stems = process.argv.slice(2);
if (!stems.length) {
  console.error('用法: node tools/music/encode.js <WAV 相对路径> [...]');
  process.exitCode = 1;
} else {
  stems.forEach((inputArg) => {
    const input = path.resolve(projectRoot, inputArg);
    const parsed = path.parse(input);
    if (parsed.ext.toLowerCase() !== '.wav' || !fs.existsSync(input)) throw new Error('WAV 不存在: ' + input);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-c:a', 'vorbis', '-strict', '-2', '-b:a', '128k', path.join(parsed.dir, parsed.name + '.ogg')], { stdio: 'inherit' });
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-c:a', 'libmp3lame', '-b:a', '128k', path.join(parsed.dir, parsed.name + '.mp3')], { stdio: 'inherit' });
    console.log('encoded:', inputArg);
  });
}
