(function (global) {
  'use strict';

  const RAW_LAKE_EXPANSION_FISH = [
    { id: 'white-strip', name: '白条鱼', rarity: '常见', color: '#b9d2d3', min: 80, max: 420, behavior: 'active', difficulty: .78, weight: 12, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'lake-white-strip-v1.png', times: ['day','dusk'], weathers: ['clear','rain'], habitat: '月湖 · 白天/黄昏', hint: '银光贴着水面掠过，轻巧又机敏。' },
    { id: 'bitterling', name: '鳑鲏', rarity: '常见', color: '#d69aaa', min: 30, max: 160, behavior: 'active', difficulty: .82, weight: 10, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'lake-bitterling-v1.png', times: ['day'], weathers: ['clear'], habitat: '月湖 · 晴天白昼', hint: '小小的身影藏在浅水花影之间。' },
    { id: 'black-carp', name: '青鱼', rarity: '少见', color: '#526b59', min: 1800, max: 12500, behavior: 'calm', difficulty: .96, weight: 5.5, minCastDistance: .62, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'lake-black-carp-v1.png', times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '月湖 · 全天 · 中远投', hint: '沉稳的大鱼偏爱湖心更深的水域。' },
    { id: 'mandarin-fish', name: '鳜鱼', rarity: '少见', color: '#bf8735', min: 480, max: 3200, behavior: 'dash', difficulty: 1, weight: 4.5, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'lake-mandarin-fish-v1.png', times: ['dusk','night'], weathers: ['clear','rain'], habitat: '月湖 · 黄昏/夜晚', hint: '会先藏在斑驳水影中，再突然窜向别处。' },
    { id: 'rain-crucian', name: '雨纹鲫', rarity: '稀有', color: '#8aaed0', min: 360, max: 1680, behavior: 'active', difficulty: 1.05, weight: 1.3, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'lake-rain-crucian-v1.png', times: ['day','dusk','night'], weathers: ['rain'], habitat: '月湖 · 全天雨天', hint: '雨滴般的纹样会随着每次变向闪烁。' },
    { id: 'glass-koi', name: '琉璃鲤', rarity: '传说', color: '#71d9c6', min: 1600, max: 9200, behavior: 'dash', difficulty: 1.14, weight: .12, minCastDistance: .78, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'lake-glass-koi-v1.png', times: ['dusk'], weathers: ['clear'], habitat: '月湖 · 晴天黄昏 · 远投', hint: '会以短促假动作试探，随后拖出一道琉璃长影。' },
  ];

  const LAKE_EXPANSION_FISH = global.FishingFishMetadata.decorate(RAW_LAKE_EXPANSION_FISH, {
    water: 'freshwater',
    sets: {
      'white-strip': ['lake-expansion-1'], bitterling: ['lake-expansion-1'],
      'black-carp': ['lake-expansion-1'], 'mandarin-fish': ['lake-expansion-1'],
      'rain-crucian': ['lake-expansion-1'], 'glass-koi': ['lake-expansion-1'],
    },
  });

  global.FishingLakeExpansionFishData = Object.freeze({ LAKE_EXPANSION_FISH });
})(window);
