(function (global) {
  'use strict';

  const ITEMS = Object.freeze([
    { id: 'old-boot', type: 'junk', name: '旧靴子', icon: '🥾', rarity: '普通杂物', locations: ['lake'], line: '湿漉漉的。至少今天不是空军。' },
    { id: 'empty-can', type: 'junk', name: '空罐头', icon: '🥫', rarity: '普通杂物', locations: ['lake', 'river'], line: '它在水底待得比鱼还久。' },
    { id: 'driftwood', type: 'junk', name: '烂木头', icon: '🪵', rarity: '普通杂物', locations: ['river'], line: '清溪送来了一小截旧故事。' },
    { id: 'message-bottle', type: 'treasure', name: '漂流瓶', icon: '🍾', rarity: '探索物品', locations: ['lake', 'river'], line: '瓶中纸条的字迹已经模糊了。' },
    { id: 'rusty-key', type: 'treasure', name: '生锈钥匙', icon: '🗝️', rarity: '探索物品', locations: ['lake'], line: '它似乎曾经打开过什么重要的东西。' },
    { id: 'old-compass', type: 'treasure', name: '旧指南针', icon: '🧭', rarity: '探索物品', locations: ['river'], line: '指针轻轻颤动，指向溪流下游。' },
  ]);

  const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

  function choose(locationId) {
    const treasure = Math.random() < .24;
    const pool = ITEMS.filter((item) => item.type === (treasure ? 'treasure' : 'junk') && item.locations.includes(locationId));
    return pool[Math.floor(Math.random() * pool.length)] || null;
  }

  global.FishingCatchables = Object.freeze({ ITEMS, ITEM_BY_ID, choose });
})(window);
