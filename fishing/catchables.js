(function (global) {
  'use strict';

  const ITEMS = Object.freeze([
    { id: 'old-boot', type: 'junk', name: '旧靴子', icon: '🥾', rarity: '普通杂物', locations: ['lake'], line: '湿漉漉的。至少今天不是空军。' },
    { id: 'empty-can', type: 'junk', name: '空罐头', icon: '🥫', rarity: '普通杂物', locations: ['lake', 'river'], line: '它在水底待得比鱼还久。' },
    { id: 'driftwood', type: 'junk', name: '烂木头', icon: '🪵', rarity: '普通杂物', locations: ['river'], line: '清溪送来了一小截旧故事。' },
    { id: 'message-bottle', type: 'treasure', name: '漂流瓶', icon: '🍾', rarity: '探索物品', locations: ['lake', 'river'], line: '瓶中纸条的字迹已经模糊了。' },
    { id: 'rusty-key', type: 'treasure', name: '生锈钥匙', icon: '🗝️', rarity: '探索物品', locations: ['lake'], line: '它似乎曾经打开过什么重要的东西。' },
    { id: 'old-compass', type: 'treasure', name: '旧指南针', icon: '🧭', rarity: '探索物品', locations: ['river'], line: '指针轻轻颤动，指向溪流下游。' },
    { id: 'tangled-line', type: 'junk', name: '缠结鱼线', icon: '🧵', rarity: '普通杂物', locations: ['coast'], line: '打了很多结，看来前一位钓客也不太顺利。' },
    { id: 'weathered-float', type: 'junk', name: '褪色浮漂', icon: '⚪', rarity: '普通杂物', locations: ['coast'], line: '颜色已经被海风和盐粒磨淡。' },
    { id: 'seaweed-clump', type: 'junk', name: '海草团', icon: '🌿', rarity: '普通杂物', locations: ['coast'], line: '湿漉漉地缠在钩上，还带着一点海盐味。' },
    { id: 'rainbow-sea-glass', type: 'treasure', name: '彩虹海玻璃', icon: '🔷', rarity: '探索物品', locations: ['coast'], weathers: ['clear'], weight: 1.7, line: '磨圆的玻璃折出一小片彩虹。' },
    { id: 'spiral-shell', type: 'treasure', name: '潮音贝壳', icon: '🐚', rarity: '探索物品', locations: ['coast'], times: ['dusk', 'night'], weight: 1.55, line: '贴近耳边，仿佛还能听见潮水。' },
    { id: 'chart-fragment', type: 'treasure', name: '海图碎片', icon: '🗺️', rarity: '探索物品', locations: ['coast'], weathers: ['rain'], weight: 1.35, line: '残缺航线指向地图之外的深色水域。' },
    { id: 'broken-dive-lamp', type: 'junk', name: '潜水灯残片', icon: '🔦', rarity: '沉船杂物', locations: ['abyss'], line: '灯罩已经碎裂，开关却还停在亮起的位置。' },
    { id: 'corroded-rivet', type: 'junk', name: '锈蚀铆钉', icon: '🔩', rarity: '沉船杂物', locations: ['abyss'], line: '沉重的金属零件，曾固定着某艘远航船只。' },
    { id: 'torn-deep-net', type: 'junk', name: '深海破网', icon: '🕸️', rarity: '沉船杂物', locations: ['abyss'], line: '网绳被什么巨大的力量从中间扯断了。' },
    { id: 'abyssal-coin', type: 'treasure', name: '星渊古币', icon: '🪙', rarity: '古代遗物', locations: ['abyss'], times: ['dusk', 'night'], weight: 1.55, line: '陌生纹章被海水磨平，只剩边缘微微发亮。' },
    { id: 'crystal-compass', type: 'treasure', name: '晶化罗盘', icon: '💠', rarity: '古代遗物', locations: ['abyss'], weathers: ['clear'], weight: 1.35, line: '指针被晶体封住，却仍朝向更深的黑暗。' },
    { id: 'sealed-logbook', type: 'treasure', name: '密封航海日志', icon: '📕', rarity: '最终线索', locations: ['abyss'], times: ['night'], weathers: ['rain'], weight: .65, line: '最后一页写着：星光沉没之处，古老生命仍在呼吸。' },
  ]);

  const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

  function choose(locationId, options) {
    const random = options && options.random || Math.random;
    const environment = options && options.environment;
    const treasure = random() < (options && options.magnet ? .34 : .24);
    const pool = ITEMS.filter((item) => item.type === (treasure ? 'treasure' : 'junk') && item.locations.includes(locationId));
    const weighted = pool.map((item) => {
      let weight = Number(item.weight) || 1;
      if (environment && item.times && item.times.includes(environment.time)) weight *= 1.8;
      if (environment && item.weathers && item.weathers.includes(environment.weather)) weight *= 1.8;
      return weight;
    });
    let roll = random() * weighted.reduce((sum, weight) => sum + weight, 0);
    for (let index = 0; index < pool.length; index++) {
      roll -= weighted[index];
      if (roll <= 0) return pool[index];
    }
    return pool[0] || null;
  }

  global.FishingCatchables = Object.freeze({ ITEMS, ITEM_BY_ID, choose });
})(window);
