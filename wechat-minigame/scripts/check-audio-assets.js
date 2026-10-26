'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..', '..');
const metadata = require('../assets/puyo-bgm.meta.json');
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if (sha(path.join(root, metadata.source)) !== metadata.sourceSha256 || sha(path.join(root, 'wechat-minigame/assets/puyo-bgm.mp3')) !== metadata.targetSha256) {
  console.error('BGM source/export changed: verify the mobile export and update puyo-bgm.meta.json before release.');
  process.exit(1);
}
console.log('Wechat BGM matches the verified compressed export of the web master.');
