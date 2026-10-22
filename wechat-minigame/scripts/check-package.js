'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let total = 0;
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'scripts' || entry.name.startsWith('.')) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(target);
    else total += fs.statSync(target).size;
  }
}
visit(root);
const limit = 2 * 1024 * 1024;
console.log('微信小游戏首包：' + (total / 1024).toFixed(1) + ' KiB');
if (total > limit) {
  console.error('首包超过 2 MiB，请把音频或非运行资源移出包体。');
  process.exit(1);
}
