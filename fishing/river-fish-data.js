(function (global) {
  'use strict';

  const RAW_RIVER_FISH = [
    { id: 'ayu', name: '香鱼', rarity: '常见', color: '#b9ad62', min: 180, max: 620, behavior: 'calm', difficulty: .76, weight: 22, sprite: 0, spriteX: .3, spriteSize: '400%', sheet: 'clearstream-fish-common-v2.png', times: ['day','dusk'], weathers: ['clear','rain'], habitat: '清溪 · 白天/黄昏', hint: '身上带着淡淡瓜香，喜欢清澈的流水。' },
    { id: 'pale-chub', name: '溪哥', rarity: '常见', color: '#b7a88a', min: 120, max: 480, behavior: 'active', difficulty: .82, weight: 18, sprite: 1, spriteX: 34.6, spriteSize: '400%', sheet: 'clearstream-fish-common-v2.png', times: ['day','dusk'], weathers: ['clear','rain'], habitat: '清溪 · 白天/黄昏', hint: '总在浅滩成群穿梭，动作轻快。' },
    { id: 'yamame', name: '山女鳟', rarity: '少见', color: '#7d9baa', min: 320, max: 1280, behavior: 'active', difficulty: .94, weight: 9, sprite: 2, spriteX: 67.4, spriteSize: '400%', sheet: 'clearstream-fish-common-v2.png', times: ['day','dusk'], weathers: ['clear','rain'], habitat: '清溪 · 白天/黄昏', hint: '侧面的椭圆斑纹像山谷投下的影子。' },
    { id: 'silver-minnow', name: '银鲦', rarity: '常见', color: '#b8d2d8', min: 90, max: 360, behavior: 'active', difficulty: .8, weight: 16, sprite: 3, spriteX: 98.9, spriteSize: '426%', sheet: 'clearstream-fish-common-v2.png', times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '清溪 · 全天', hint: '银光一闪而过，是溪流里最灵巧的小家伙。' },
    { id: 'stone-loach', name: '花鳅', rarity: '少见', color: '#a78656', min: 160, max: 720, behavior: 'active', difficulty: .92, weight: 8, sprite: 0, spriteX: 0, spriteSize: '445%', sheet: 'clearstream-fish-rare-v2.png', times: ['dusk','night'], weathers: ['clear','rain'], habitat: '清溪 · 黄昏/夜晚', hint: '贴着石缝逆流而上，斑纹很适合藏身。' },
    { id: 'cherry-salmon', name: '樱鳟', rarity: '稀有', color: '#d07e91', min: 720, max: 3400, behavior: 'dash', difficulty: 1.04, weight: 3.2, sprite: 1, spriteX: 29.4, spriteSize: '426%', sheet: 'clearstream-fish-rare-v2.png', times: ['dusk'], weathers: ['rain'], habitat: '清溪 · 雨天黄昏', hint: '雨幕中会浮现一条樱色的光带。' },
    { id: 'torrent-catfish', name: '石爬鮡', rarity: '稀有', color: '#657477', min: 540, max: 2600, behavior: 'dash', difficulty: 1.07, weight: 2.2, sprite: 2, spriteX: 61.3, spriteSize: '426%', sheet: 'clearstream-fish-rare-v2.png', times: ['night'], weathers: ['rain'], habitat: '清溪 · 雨夜', hint: '扁平的身体能牢牢贴住湍急的岩面。' },
    { id: 'taimen', name: '巨型哲罗鱼', rarity: '传说', color: '#8c6a45', min: 2400, max: 11800, behavior: 'dash', difficulty: 1.14, weight: .35, sprite: 0, spriteX: 50, spriteSize: 'contain', standalone: true, sheet: 'clearstream-taimen-v1.png', times: ['night'], weathers: ['clear','rain'], habitat: '清溪 · 深夜远投', hint: '古老溪谷的主人，只在最深的水声中现身。' },
  ];

  const RIVER_FISH = global.FishingFishMetadata.decorate(RAW_RIVER_FISH, {
    water: 'freshwater',
    sets: {
      ayu: ['river-base'], 'pale-chub': ['river-base'], yamame: ['river-base'],
      'silver-minnow': ['river-base'], 'stone-loach': ['river-base'],
      'cherry-salmon': ['river-base'], 'torrent-catfish': ['river-base'], taimen: ['river-base'],
    },
  });

  global.FishingRiverFishData = Object.freeze({ RIVER_FISH });
})(window);
