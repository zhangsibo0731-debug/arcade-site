(function (global) {
  'use strict';

  const ENVIRONMENTS = [
    { time: 'night', weather: 'clear', label: '🌙 夜晚 · ☀️ 晴天' },
    { time: 'dusk', weather: 'clear', label: '🌇 黄昏 · ☀️ 晴天' },
    { time: 'day', weather: 'clear', label: '☀️ 白天 · ☀️ 晴天' },
    { time: 'night', weather: 'rain', label: '🌙 夜晚 · 🌧️ 雨天' },
    { time: 'dusk', weather: 'rain', label: '🌇 黄昏 · 🌧️ 雨天' },
    { time: 'day', weather: 'rain', label: '☁️ 白天 · 🌧️ 雨天' },
  ];

  function environmentForStep(step) {
    return ENVIRONMENTS[Math.floor(Math.max(0, step) / 4) % ENVIRONMENTS.length];
  }

  function chooseFish(options) {
    const fish = options.fish;
    const rarityRank = options.rarityRank;
    const environment = options.environment;
    const rareBoost = Math.max(0, options.castDistance - .55) * 1.7;
    const streakBonus = Math.min(10, options.streak * 2);
    const baitBoost = options.premiumBait ? .34 : 0;
    const weighted = fish.map((item) => {
      if (!item.times.includes(environment.time) || !item.weathers.includes(environment.weather)) return 0;
      let environmentBoost = 1;
      if (item.id === 'catfish' && environment.time === 'night') environmentBoost = 1.7;
      if (item.id === 'trout' && environment.weather === 'rain') environmentBoost = 1.8;
      if (item.id === 'icefin') environmentBoost = 2.2;
      if (item.id === 'starlight' && environment.weather === 'clear') environmentBoost = 1.5;
      if (item.id === 'moon' && environment.weather === 'rain') environmentBoost = 1.35;
      const streakFactor = rarityRank[item.rarity] > 0 ? 1 + streakBonus / 100 : 1;
      const baitFactor = rarityRank[item.rarity] > 0 ? 1 + rarityRank[item.rarity] * baitBoost : 1;
      return item.weight * environmentBoost * streakFactor * baitFactor * (1 + rarityRank[item.rarity] * rareBoost);
    });
    let roll = (options.random || Math.random)() * weighted.reduce((sum, value) => sum + value, 0);
    for (let i = 0; i < fish.length; i++) {
      roll -= weighted[i];
      if (roll <= 0) return fish[i];
    }
    return fish[0];
  }

  global.FishingEnvironments = Object.freeze({ ENVIRONMENTS, environmentForStep, chooseFish });
})(window);
