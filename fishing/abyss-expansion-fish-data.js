(function (global) {
  'use strict';

  const RAW_ABYSS_EXPANSION_FISH = [
    { id: 'deepsea-cod', name: '深海鳕', rarity: '常见', color: '#658db8', min: 480, max: 2400, behavior: 'calm', difficulty: .88, weight: 15, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-deep-cod-v1.png', times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 全天', hint: '银蓝光点沿着身体缓缓流动，性情十分温和。' },
    { id: 'soft-spine-sculpin', name: '软隐棘杜父鱼', rarity: '常见', color: '#b5a6dc', min: 160, max: 780, behavior: 'calm', difficulty: .84, weight: 13, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-soft-sculpin-v1.png', times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 海床全天', hint: '圆润的小家伙喜欢贴着海床安静打盹。' },
    { id: 'lionfish', name: '狮子鱼', rarity: '少见', color: '#ed7650', min: 360, max: 1800, behavior: 'active', difficulty: .98, weight: 6.8, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-lionfish-v1.png', times: ['dusk','night'], weathers: ['clear','rain'], habitat: '星渊 · 黄昏/夜晚', hint: '扇形鱼鳍在暗流中舒展开来，像一朵珊瑚花。' },
    { id: 'amethyst-octopus', name: '紫晶章鱼', rarity: '少见', color: '#9364d8', min: 240, max: 1300, behavior: 'active', difficulty: .96, weight: 5.5, minCastDistance: .48, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-amethyst-octopus-v1.png', times: ['day','dusk'], weathers: ['clear','rain'], habitat: '星渊 · 白天/黄昏 · 中投', hint: '紫蓝腕足顺着暗流舒展，皮肤偶尔泛起细碎晶光。' },
    { id: 'crystal-jellyfish', name: '水晶水母', rarity: '稀有', color: '#9ecaf3', min: 180, max: 920, behavior: 'dash', difficulty: 1.07, weight: 1.7, minCastDistance: .62, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-jelly-v1.png', times: ['night'], weathers: ['rain'], habitat: '星渊 · 雨夜 · 远投', hint: '晶莹伞盖折射出淡紫光芒，会随暗流突然升沉。' },
    { id: 'starsea-whale', name: '星海鲸鱼', rarity: '传说', color: '#236fd0', min: 9200, max: 38600, behavior: 'dash', difficulty: 1.16, weight: .16, minCastDistance: .84, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'abyss-whale-v1.png', times: ['night'], weathers: ['clear'], habitat: '星渊 · 晴朗深夜 · 极远投', hint: '星图在深蓝背脊上依次亮起，回应抵达渊底的鱼钩。' },
  ];

  const ABYSS_EXPANSION_FISH = global.FishingFishMetadata.decorate(RAW_ABYSS_EXPANSION_FISH, {
    water: 'abyssal',
    sets: {
      'deepsea-cod': ['abyss-expansion-1'], 'soft-spine-sculpin': ['abyss-expansion-1'],
      lionfish: ['abyss-expansion-1'], 'amethyst-octopus': ['abyss-expansion-1'],
      'crystal-jellyfish': ['abyss-expansion-1'], 'starsea-whale': ['abyss-expansion-1'],
    },
  });

  global.FishingAbyssExpansionFishData = Object.freeze({ ABYSS_EXPANSION_FISH });
})(window);
