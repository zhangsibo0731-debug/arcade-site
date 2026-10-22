'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const output = path.join(root, 'wechat-minigame', 'vendor', 'puyo');
const files = [
  'board-rules.js',
  'scoring-rules.js',
  'rotation-rules.js',
  'challenge-rules.js',
  'roguelite-rules.js',
  'active-item-rules.js',
  'challenge-effects.js',
];

const checkOnly = process.argv.includes('--check');
if (!checkOnly) fs.mkdirSync(output, { recursive: true });
const stale = [];
for (const file of files) {
  const source = path.join(root, 'puyo', file);
  const target = path.join(output, file);
  if (checkOnly) {
    if (!fs.existsSync(target) || !fs.readFileSync(source).equals(fs.readFileSync(target))) stale.push(file);
  } else fs.copyFileSync(source, target);
}
if (stale.length) {
  console.error('微信小游戏规则副本未同步：' + stale.join(', '));
  process.exit(1);
}
console.log(checkOnly ? 'Puyo rule copies are current.' : 'Synced ' + files.length + ' Puyo rule modules.');
