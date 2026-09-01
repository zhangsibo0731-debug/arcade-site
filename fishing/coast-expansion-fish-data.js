(function (global) {
  'use strict';

  const RAW_COAST_EXPANSION_FISH = [
    { id: 'pacific-saury', name: '秋刀鱼', rarity: '常见', color: '#739fc4', min: 120, max: 520, behavior: 'active', difficulty: .84, weight: 15, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'coast-pacific-saury-v1.png', times: ['day','dusk'], weathers: ['clear','rain'], habitat: '潮汐湾 · 白天/黄昏', hint: '细长的银蓝身影会沿着潮线快速游过。' },
    { id: 'horse-mackerel-coast', name: '竹荚鱼', rarity: '常见', color: '#4d9ca4', min: 180, max: 860, behavior: 'active', difficulty: .88, weight: 12, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'coast-horse-mackerel-v1.png', times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '潮汐湾 · 全天', hint: '成群巡游在近岸，侧线的棱鳞闪着金色微光。' },
    { id: 'coastal-grouper', name: '石斑鱼', rarity: '少见', color: '#d77a42', min: 700, max: 5200, behavior: 'calm', difficulty: .96, weight: 6.5, minCastDistance: .5, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'coast-grouper-v1.png', times: ['dusk','night'], weathers: ['clear','rain'], habitat: '潮汐湾 · 黄昏/夜晚 · 中投', hint: '守在礁石底部，偶尔才会离开熟悉的缝隙。' },
    { id: 'flying-fish', name: '飞鱼', rarity: '少见', color: '#8fc8e1', min: 260, max: 1300, behavior: 'dash', difficulty: 1.02, weight: 4.8, minCastDistance: .58, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'coast-flying-fish-v1.png', times: ['day','dusk'], weathers: ['clear'], habitat: '潮汐湾 · 晴天白昼/黄昏 · 远投', hint: '展开宽大的胸鳍，下一瞬就会冲向水面。' },
    { id: 'sunset-ray', name: '霞光鳐', rarity: '稀有', color: '#d88fc3', min: 1800, max: 9800, behavior: 'active', difficulty: 1.08, weight: 1.55, minCastDistance: .68, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'coast-sunset-ray-v1.png', times: ['dusk'], weathers: ['clear','rain'], habitat: '潮汐湾 · 黄昏 · 远投', hint: '宽阔双翼拖着霞色光点，在深水中缓慢滑翔。' },
    { id: 'sunwheel-sunfish', name: '日轮翻车鱼', rarity: '传说', color: '#f2a637', min: 8200, max: 32800, behavior: 'dash', difficulty: 1.15, weight: .2, minCastDistance: .82, sprite: 0, spriteX: 50, spriteY: 50, spriteSize: 'contain', standalone: true, sheet: 'coast-sunwheel-sunfish-v1.png', times: ['day'], weathers: ['clear'], habitat: '潮汐湾 · 晴天白昼 · 极远投', hint: '金色日纹随浪涌亮起，只在外湾最明亮的时刻现身。' },
  ];

  const COAST_EXPANSION_FISH = global.FishingFishMetadata.decorate(RAW_COAST_EXPANSION_FISH, {
    water: 'saltwater',
    sets: {
      'pacific-saury': ['coast-expansion-1'], 'horse-mackerel-coast': ['coast-expansion-1'],
      'coastal-grouper': ['coast-expansion-1'], 'flying-fish': ['coast-expansion-1'],
      'sunset-ray': ['coast-expansion-1'], 'sunwheel-sunfish': ['coast-expansion-1'],
    },
  });

  global.FishingCoastExpansionFishData = Object.freeze({ COAST_EXPANSION_FISH });
})(window);
