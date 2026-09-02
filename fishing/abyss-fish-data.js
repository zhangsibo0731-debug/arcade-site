(function (global) {
  'use strict';

  const RAW_ABYSS_FISH = [
    { id: 'lanternfish', name: '幽灯鱼', rarity: '常见', color: '#45cbea', min: 120, max: 520, behavior: 'calm', difficulty: .86, weight: 24, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-lanternfish-v1.png', times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 全天', hint: '额前的小灯在黑暗中划出温柔光点。' },
    { id: 'hatchetfish', name: '银斧鱼', rarity: '常见', color: '#a9d4e5', min: 90, max: 420, behavior: 'active', difficulty: .91, weight: 20, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-hatchetfish-v1.png', times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 全天', hint: '薄而闪亮的身体像一枚沉入海底的银币。' },
    { id: 'fangtooth', name: '尖牙鱼', rarity: '常见', color: '#6e5292', min: 240, max: 980, behavior: 'active', difficulty: .96, weight: 15, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-fangtooth-v1.png', times: ['dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 黄昏/夜晚', hint: '深紫鳞片掠过微光，短短的齿尖只是捕食工具。' },
    { id: 'barreleye', name: '晶鳍鱼', rarity: '少见', color: '#8cbbed', min: 380, max: 1560, behavior: 'calm', difficulty: 1, weight: 8, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-crystalfin-v1.png', times: ['day','night'], weathers: ['clear','rain'], habitat: '星渊 · 白天/夜晚', hint: '半透明鱼鳍折射出紫蓝微光，像缓缓展开的薄晶。' },
    { id: 'giant-isopod', name: '巨型等足虫', rarity: '少见', color: '#b7a7de', min: 620, max: 2800, behavior: 'calm', difficulty: .94, weight: 7, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-giant-isopod-v1.png', times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 海床全天', hint: '披着珍珠般的古老甲壳，在沉船附近缓慢爬行。' },
    { id: 'viperfish', name: '幽光蝰鱼', rarity: '稀有', color: '#6346b8', min: 520, max: 2400, behavior: 'dash', difficulty: 1.08, weight: 2.5, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-viperfish-v1.png', times: ['dusk','night'], weathers: ['rain'], habitat: '星渊 · 雨天黄昏/夜晚', hint: '先熄灭侧线光点停顿片刻，再突然冲向另一端。' },
    { id: 'oarfish', name: '皇带鱼', rarity: '稀有', color: '#d3dcec', min: 2800, max: 13800, behavior: 'dash', difficulty: 1.1, weight: 1.4, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-oarfish-v1.png', times: ['dusk','night'], weathers: ['clear'], habitat: '星渊 · 晴朗黄昏/夜晚远投', hint: '银色长躯与珊瑚红背鳍像海底升起的缎带。' },
    { id: 'luminous-coelacanth', name: '星纹腔棘鱼', rarity: '传说', color: '#2377bd', min: 4200, max: 21600, behavior: 'dash', difficulty: 1.15, weight: .24, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-luminous-coelacanth-v1.png', times: ['night'], weathers: ['clear','rain'], habitat: '星渊 · 深夜远投', hint: '古老鳞片泛起星点微光，是这片深水最久远的回响。' },
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
