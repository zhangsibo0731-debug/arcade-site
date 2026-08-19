(function (global) {
  'use strict';

  const FISH = [
    { id: 'crucian', name: '小鲫鱼', rarity: '常见', color: '#b9c5ca', min: 220, max: 760, behavior: 'calm', difficulty: .7, weight: 24, sprite: 0, times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '全天 · 晴雨皆有', hint: '湖中随处可见，性情温和。' },
    { id: 'carp', name: '红鲤鱼', rarity: '常见', color: '#e58a42', min: 520, max: 2400, behavior: 'calm', difficulty: .78, weight: 17, sprite: 1, times: ['day','dusk'], weathers: ['clear','rain'], habitat: '白天/黄昏 · 晴雨皆有', hint: '喜欢水草丰盛的浅水区域。' },
    { id: 'loach', name: '湖鳅', rarity: '常见', color: '#a58b54', min: 180, max: 620, behavior: 'active', difficulty: .76, weight: 13, sprite: 2, times: ['day','dusk','night'], weathers: ['clear','rain'], habitat: '全天 · 晴雨皆有', hint: '细长灵活，常贴着湖底游动。' },
    { id: 'catfish', name: '蓝鲶鱼', rarity: '常见', color: '#6686a8', min: 760, max: 3600, behavior: 'calm', difficulty: .84, weight: 11, sprite: 3, times: ['dusk','night'], weathers: ['clear','rain'], habitat: '黄昏/夜晚 · 晴雨皆有', hint: '长着胡须，偏爱安静的夜晚。' },
    { id: 'perch', name: '翡翠河鲈', rarity: '常见', color: '#54a99b', min: 420, max: 1380, behavior: 'active', difficulty: .9, weight: 10, sprite: 4, times: ['day','dusk'], weathers: ['clear','rain'], habitat: '白天/黄昏 · 晴雨皆有', hint: '条纹鲜明，游动十分活跃。' },
    { id: 'trout', name: '彩虹鳟', rarity: '少见', color: '#87b9c7', min: 680, max: 2800, behavior: 'active', difficulty: .96, weight: 8, sprite: 5, times: ['day','dusk','night'], weathers: ['rain'], habitat: '全天 · 雨天', hint: '雨后常在清凉水域出现。' },
    { id: 'eel', name: '金鳗', rarity: '少见', color: '#bd813e', min: 540, max: 2200, behavior: 'active', difficulty: 1, weight: 6, sprite: 6, times: ['dusk','night'], weathers: ['clear','rain'], habitat: '黄昏/夜晚 · 晴雨皆有', hint: '动作流畅，却很擅长突然变向。' },
    { id: 'puffer', name: '珊瑚河豚', rarity: '少见', color: '#ef8b73', min: 360, max: 1200, behavior: 'active', difficulty: 1.02, weight: 5, sprite: 7, times: ['day','dusk'], weathers: ['clear'], habitat: '白天/黄昏 · 晴天', hint: '圆滚滚的身体会随水流跳动。' },
    { id: 'icefin', name: '冰鳍鱼', rarity: '稀有', color: '#8ed4ee', min: 920, max: 4200, behavior: 'dash', difficulty: 1.04, weight: 3, sprite: 8, times: ['night'], weathers: ['rain'], habitat: '夜晚 · 雨天', hint: '据说会在冰凉的雨幕下现身。' },
    { id: 'starlight', name: '星辉鱼', rarity: '稀有', color: '#8d6ce3', min: 780, max: 3400, behavior: 'dash', difficulty: 1.08, weight: 2, sprite: 9, times: ['night'], weathers: ['clear','rain'], habitat: '夜晚 · 晴雨皆有', hint: '鳞片只在深夜映出星光。' },
    { id: 'koi', name: '红白锦鲤', rarity: '稀有', color: '#efaa73', min: 1100, max: 5600, behavior: 'dash', difficulty: 1.09, weight: .8, sprite: 10, spriteX: 63.8, spriteSize: '426%', times: ['dusk'], weathers: ['clear','rain'], habitat: '黄昏 · 晴雨皆有', hint: '红白纹样独一无二，十分珍贵。' },
    { id: 'moon', name: '月光锦鲤', rarity: '传说', color: '#d7f3e8', min: 1800, max: 8260, behavior: 'dash', difficulty: 1.12, weight: .2, sprite: 11, spriteX: 98.8, spriteSize: '390%', times: ['night'], weathers: ['clear','rain'], habitat: '夜晚 · 远投更易遇见', hint: '只回应最有耐心的湖畔来客。' },
  ];

  const RARITY_RANK = { '常见': 0, '少见': 1, '稀有': 2, '传说': 3 };

  global.FishingFishData = Object.freeze({ FISH, RARITY_RANK });
})(window);
