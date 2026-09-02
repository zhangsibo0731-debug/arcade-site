(function (global) {
  'use strict';

  const SHEET = 'coast-fish-sheet-v2.png';
  const SPRITE_SIZE = '400% 200%';
  const RAW_COAST_FISH = [
    { id: 'silver-sardine', name: '银沙丁鱼', rarity: '常见', color: '#b9d9dd', min: 90, max: 360, behavior: 'calm', difficulty: .78, weight: 22, sprite: 0, spriteX: 0, spriteY: 0, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '潮汐湾 · 全天', hint: '银亮的小鱼群会贴着潮线一起转向。' },
    { id: 'blue-mackerel', name: '蓝花鲭', rarity: '常见', color: '#5297bd', min: 280, max: 980, behavior: 'active', difficulty: .86, weight: 17, sprite: 1, spriteX: 33.33, spriteY: 0, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['day','dusk'], weathers: ['clear','rain'], habitat: '潮汐湾 · 白天/黄昏', hint: '蓝绿色背纹在浪花间一闪而过。' },
    { id: 'sand-flounder', name: '沙纹比目鱼', rarity: '常见', color: '#b89b6a', min: 360, max: 1680, behavior: 'calm', difficulty: .83, weight: 14, sprite: 2, spriteX: 66.67, spriteY: 0, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '潮汐湾 · 全天', hint: '藏在湾底细沙里，只露出机警的眼睛。' },
    { id: 'sea-bream', name: '赤鳍海鲷', rarity: '少见', color: '#e08373', min: 620, max: 2800, behavior: 'active', difficulty: .96, weight: 8, sprite: 3, spriteX: 100, spriteY: 0, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['day','dusk'], weathers: ['clear'], habitat: '潮汐湾 · 晴天白昼', hint: '赤红鳍缘像落在海面的晚霞。' },
    { id: 'sea-bass', name: '银背海鲈', rarity: '少见', color: '#8daab3', min: 780, max: 4200, behavior: 'active', difficulty: 1, weight: 7, sprite: 4, spriteX: 0, spriteY: 100, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['dusk','night'], weathers: ['clear','rain'], habitat: '潮汐湾 · 黄昏/夜晚', hint: '喜欢巡游礁石边缘，力气比外表更大。' },
    { id: 'reef-octopus', name: '礁岩章鱼', rarity: '稀有', color: '#d97850', min: 520, max: 3600, behavior: 'dash', difficulty: 1.06, weight: 2.8, sprite: 5, spriteX: 33.33, spriteY: 100, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['night'], weathers: ['rain'], habitat: '潮汐湾 · 雨夜', habitats: { abyss: '星渊 · 深夜沉船区' }, hint: '会突然缩进礁缝，再向相反方向冲刺。' },
    { id: 'bluefin-tuna', name: '蓝鳍金枪鱼', rarity: '稀有', color: '#4c82a9', min: 3200, max: 16800, behavior: 'dash', difficulty: 1.1, weight: 1.6, sprite: 6, spriteX: 66.67, spriteY: 100, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['day','dusk'], weathers: ['rain'], habitat: '潮汐湾 · 雨天远投', habitats: { abyss: '星渊 · 雨天上层远投' }, hint: '高速掠过外湾，第一下拉扯尤其猛烈。' },
    { id: 'starlit-sailfish', name: '星潮旗鱼', rarity: '传说', color: '#5e78d6', min: 5400, max: 24800, behavior: 'dash', difficulty: 1.16, weight: .28, sprite: 7, spriteX: 100, spriteY: 100, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['night'], weathers: ['clear'], habitat: '潮汐湾 · 晴朗深夜远投', hint: '高耸背鳍托着星光，只追随最远的潮声。' },
  ];

  const COAST_FISH = global.FishingFishMetadata.decorate(RAW_COAST_FISH, {
    water: 'saltwater',
    sets: {
      'silver-sardine': ['coast-base'], 'blue-mackerel': ['coast-base'],
      'sand-flounder': ['coast-base'], 'sea-bream': ['coast-base'], 'sea-bass': ['coast-base'],
      'reef-octopus': ['coast-base', 'abyss-base'], 'bluefin-tuna': ['coast-base', 'abyss-base'],
      'starlit-sailfish': ['coast-base'],
    },
  });

  global.FishingCoastFishData = Object.freeze({ COAST_FISH });
})(window);
