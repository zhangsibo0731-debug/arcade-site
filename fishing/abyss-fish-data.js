(function (global) {
  'use strict';

  const SHEET = 'abyss-fish-sheet-v2.png';
  // Slightly zoom into each 4 × 2 cell so artwork near a cell edge cannot
  // bleed into the neighbouring fish card.
  const SPRITE_SIZE = '420% 210%';
  const SPRITE_X = Object.freeze([0, 32.03, 64.84, 100]);
  const RAW_ABYSS_FISH = [
    { id: 'lanternfish', name: '幽灯鱼', rarity: '常见', color: '#45cbea', min: 120, max: 520, behavior: 'calm', difficulty: .86, weight: 24, sprite: 0, spriteX: 0, spriteY: 0, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 全天', hint: '额前的小灯在黑暗中划出温柔光点。' },
    { id: 'hatchetfish', name: '银斧鱼', rarity: '常见', color: '#a9d4e5', min: 90, max: 420, behavior: 'active', difficulty: .91, weight: 20, sprite: 1, spriteX: SPRITE_X[1], spriteY: 0, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 全天', hint: '薄而闪亮的身体像一枚沉入海底的银币。' },
    { id: 'fangtooth', name: '尖牙鱼', rarity: '常见', color: '#7c604e', min: 240, max: 980, behavior: 'active', difficulty: .96, weight: 15, sprite: 2, spriteX: SPRITE_X[2], spriteY: 0, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 黄昏/夜晚', hint: '牙齿看起来吓人，游动却有自己的固定节奏。' },
    { id: 'barreleye', name: '桶眼鱼', rarity: '少见', color: '#4298c9', min: 380, max: 1560, behavior: 'calm', difficulty: 1, weight: 8, sprite: 3, spriteX: 100, spriteY: 0, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['day','night'], weathers: ['clear','rain'], habitat: '星渊 · 白天/夜晚', hint: '透明头部里，两枚绿色眼睛追随着微弱光线。' },
    { id: 'giant-isopod', name: '巨型等足虫', rarity: '少见', color: '#9c96b5', min: 620, max: 2800, behavior: 'calm', difficulty: .94, weight: 7, sprite: 4, spriteX: 0, spriteY: 100, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 海床全天', hint: '披着古老甲壳，在沉船附近缓慢爬行。' },
    { id: 'viperfish', name: '幽光蝰鱼', rarity: '稀有', color: '#6346b8', min: 520, max: 2400, behavior: 'dash', difficulty: 1.08, weight: 2.5, sprite: 5, spriteX: SPRITE_X[1], spriteY: 100, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['dusk','night'], weathers: ['rain'], habitat: '星渊 · 雨天黄昏/夜晚', hint: '先熄灭光芒停顿片刻，再突然冲向另一端。' },
    { id: 'oarfish', name: '皇带鱼', rarity: '稀有', color: '#b8cde1', min: 2800, max: 13800, behavior: 'dash', difficulty: 1.1, weight: 1.4, sprite: 6, spriteX: SPRITE_X[2], spriteY: 100, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['dusk','night'], weathers: ['clear'], habitat: '星渊 · 晴朗黄昏/夜晚远投', hint: '银色长躯像一条从海底升起的缎带。' },
    { id: 'luminous-coelacanth', name: '星纹腔棘鱼', rarity: '传说', color: '#2377bd', min: 4200, max: 21600, behavior: 'dash', difficulty: 1.15, weight: .24, sprite: 7, spriteX: 100, spriteY: 100, spriteSize: SPRITE_SIZE, sheet: SHEET, times: ['night'], weathers: ['clear','rain'], habitat: '星渊 · 深夜远投', hint: '古老鳞片亮起星纹，是这片深水最久远的回响。' },
  ];

  const ABYSS_FISH = global.FishingFishMetadata.decorate(RAW_ABYSS_FISH, {
    water: 'abyssal',
    sets: {
      lanternfish: ['abyss-base'], hatchetfish: ['abyss-base'], fangtooth: ['abyss-base'],
      barreleye: ['abyss-base'], 'giant-isopod': ['abyss-base'], viperfish: ['abyss-base'],
      oarfish: ['abyss-base'], 'luminous-coelacanth': ['abyss-base'],
    },
  });

  global.FishingAbyssFishData = Object.freeze({ ABYSS_FISH });
})(window);
