(function (global) {
  'use strict';

  function formatWeight(grams) {
    return grams >= 1000 ? (grams / 1000).toFixed(2) + ' kg' : grams + ' g';
  }

  function create(options) {
    const elements = options.elements;
    const fish = options.fish;

    function setFishSprite(element, item) {
      if (!element || !item) return;
      const column = item.sprite % 4;
      const row = Math.floor(item.sprite / 4);
      const sheets = ['common', 'uncommon', 'rare'];
      element.style.backgroundImage = 'url("assets/moonlake-fish-' + sheets[row] + '-v1.png")';
      element.style.setProperty('--fish-x', (column * 100 / 3) + '%');
    }

    function renderCatalog(collection) {
      const found = fish.filter((item) => collection[item.id] && collection[item.id].count > 0).length;
      elements.catalogProgress.textContent = '已发现 ' + found + ' / ' + fish.length;
      elements.catalogGrid.innerHTML = '';
      fish.forEach((item) => {
        const record = collection[item.id];
        const discovered = record && record.count > 0;
        const card = document.createElement('article');
        card.className = 'fish-card' + (discovered ? '' : ' is-locked');
        card.dataset.rarity = item.rarity;
        const art = document.createElement('div');
        art.className = 'fish-card__art fish-sprite';
        setFishSprite(art, item);
        const name = document.createElement('h3');
        name.textContent = discovered ? item.name : '？？？';
        const rarity = document.createElement('p');
        rarity.className = 'fish-card__rarity';
        rarity.textContent = discovered ? item.rarity : '尚未发现';
        const detail = document.createElement('p');
        detail.textContent = discovered ? item.habitat + '\n捕获 ' + record.count + ' 次 · 最大 ' + formatWeight(record.best) : item.hint;
        card.append(art, name, rarity, detail);
        elements.catalogGrid.appendChild(card);
      });
    }

    function renderHud(stats) {
      elements.totalCaught.textContent = String(stats.totalCaught);
      elements.bestWeight.textContent = stats.bestWeight ? formatWeight(stats.bestWeight) : '--';
      elements.streak.textContent = String(stats.streak);
      elements.bestStreak.textContent = String(stats.bestStreak);
    }

    function renderMuted(muted) {
      elements.soundOn.hidden = muted;
      elements.soundOff.hidden = !muted;
      elements.soundButton.setAttribute('aria-label', muted ? '开启声音' : '关闭声音');
    }

    function renderEnvironment(environment) {
      elements.environmentLabel.textContent = environment.label;
    }

    return Object.freeze({ setFishSprite, renderCatalog, renderHud, renderMuted, renderEnvironment });
  }

  global.FishingUI = Object.freeze({ formatWeight, create });
})(window);
