(function (global) {
  'use strict';

  const ITEMS = Object.freeze([
    Object.freeze({ id: 'moon-blade', slot: 'weapon', weapon: 'sword', name: '月牙剑', icon: '⚔', color: '#f2e9ff', description: '近距离扇形挥砍，命中会击退敌人。' }),
    Object.freeze({ id: 'star-bow', slot: 'weapon', weapon: 'bow', name: '星辉弓', icon: '➶', color: '#d8fa61', description: '自动射击最近的远处敌人。' }),
    Object.freeze({ id: 'tide-staff', slot: 'weapon', weapon: 'staff', name: '潮汐法杖', icon: '✦', color: '#72dcf0', description: '发射缓慢法球，命中产生范围爆炸。' }),
    Object.freeze({ id: 'moon-guard', slot: 'armor', name: '守月甲', icon: '⬡', color: '#85a9ff', description: '最大生命增加 2 点。', maxHp: 2 }),
    Object.freeze({ id: 'night-coat', slot: 'armor', name: '夜行衣', icon: '◈', color: '#c28bea', description: '闪避冷却缩短 0.25 秒。', dashReduction: .25 }),
    Object.freeze({ id: 'ice-crystal', slot: 'charm', name: '冰晶', icon: '❄', color: '#9eefff', description: '攻击命中后短暂减慢敌人。', effect: 'slow' }),
    Object.freeze({ id: 'thunder-core', slot: 'charm', name: '雷核', icon: 'ϟ', color: '#ffe06a', description: '远程命中时电击附近另一名敌人。', effect: 'chain' }),
    Object.freeze({ id: 'blood-ring', slot: 'charm', name: '吸血戒指', icon: '●', color: '#ff6c91', description: '每击杀 3 名敌人恢复 1 点生命。', effect: 'leech' }),
  ]);
  const BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

  function candidates(slot, currentId) {
    return ITEMS.filter((item) => (!slot || item.slot === slot) && item.id !== currentId);
  }
  function roll(random, slot, currentId) {
    const pool = candidates(slot, currentId);
    return pool[Math.floor((random || Math.random)() * pool.length)] || null;
  }
  function rarity(random) { return (random || Math.random)() < .24 ? 'rare' : 'common'; }

  global.DungeonEquipment = Object.freeze({ ITEMS, BY_ID, candidates, roll, rarity });
})(typeof window !== 'undefined' ? window : globalThis);

