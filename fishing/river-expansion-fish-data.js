(function (global) {
  'use strict';

  const RAW_RIVER_EXPANSION_FISH = [
    { id: 'horse-mouth', name: '马口鱼', rarity: '常见', color: '#9cbfc8', min: 100, max: 550, behavior: 'active', difficulty: .84, weight: 14, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'river-horse-mouth-v2.png', times: ['day','dusk'], weathers: ['clear','rain'], habitat: '清溪 · 白天/黄昏', hint: '贴着明亮水面快速穿行，银蓝侧线一闪即逝。' },
    { id: 'stone-grouper', name: '溪石斑鱼', rarity: '常见', color: '#a77b39', min: 80, max: 420, behavior: 'calm', difficulty: .8, weight: 12, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'river-stone-grouper-v3.png', times: ['day','dusk'], weathers: ['clear','rain'], habitat: '清溪 · 白天/黄昏', hint: '喜欢守在石缝附近，身上的横纹很适合隐蔽。' },
    { id: 'yellow-catfish', name: '黄颡鱼', rarity: '少见', color: '#dbad24', min: 250, max: 1600, behavior: 'active', difficulty: .96, weight: 7, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'river-yellow-catfish-v3.png', times: ['dusk','night'], weathers: ['clear','rain'], habitat: '清溪 · 黄昏/夜晚', hint: '柔软的长须会先感知水流，再突然改变方向。' },
    { id: 'river-bream', name: '鳊鱼', rarity: '少见', color: '#aebdc0', min: 600, max: 3800, behavior: 'calm', difficulty: .94, weight: 6, minCastDistance: .55, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'river-bream-v3.png', times: ['day','dusk'], weathers: ['clear','rain'], habitat: '清溪 · 白天/黄昏 · 中投', hint: '高而扁的身体会在较深的水道中缓缓转身。' },
    { id: 'cherry-rain-trout', name: '樱雨鳟', rarity: '稀有', color: '#d99ab5', min: 600, max: 3200, behavior: 'dash', difficulty: 1.08, weight: 1.8, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'river-cherry-rain-trout-v2.png', times: ['day','dusk'], weathers: ['rain'], habitat: '清溪 · 雨天白昼/黄昏', hint: '雨丝落下时，樱色纹样会随着冲刺亮起。' },
    { id: 'jade-sturgeon', name: '碧流鲟', rarity: '传说', color: '#62b99b', min: 2600, max: 14500, behavior: 'dash', difficulty: 1.15, weight: .18, minCastDistance: .8, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'river-jade-sturgeon-v2.png', times: ['night'], weathers: ['clear','rain'], habitat: '清溪 · 夜晚 · 极远投', hint: '古老骨板映着碧色水光，只会回应抵达深潭的鱼钩。' },
  ];

  const RIVER_EXPANSION_FISH = global.FishingFishMetadata.decorate(RAW_RIVER_EXPANSION_FISH, {
    water: 'freshwater',
    sets: {
      'horse-mouth': ['river-expansion-1'], 'stone-grouper': ['river-expansion-1'],
      'yellow-catfish': ['river-expansion-1'], 'river-bream': ['river-expansion-1'],
      'cherry-rain-trout': ['river-expansion-1'], 'jade-sturgeon': ['river-expansion-1'],
    },
  });

  global.FishingRiverExpansionFishData = Object.freeze({ RIVER_EXPANSION_FISH });
})(window);
