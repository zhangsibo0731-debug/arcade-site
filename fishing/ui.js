(function (global) {
  'use strict';

  function formatWeight(grams) {
    return grams >= 1000 ? (grams / 1000).toFixed(2) + ' kg' : grams + ' g';
  }

  function create(options) {
    const elements = options.elements;
    const fish = options.fish;
    const fishById = new Map(fish.map((item) => [item.id, item]));

    function setFishSprite(element, item) {
      if (!element || !item) return;
      element.classList.remove('catchable-art');
      element.classList.add('fish-sprite');
      element.textContent = '';
      const column = item.sprite % 4;
      if (item.sheet) {
        element.style.backgroundImage = 'url("assets/' + item.sheet + '")';
      } else {
        const row = Math.floor(item.sprite / 4);
        const sheets = ['common', 'uncommon', 'rare'];
        element.style.backgroundImage = 'url("assets/moonlake-fish-' + sheets[row] + '-v1.png")';
      }
      element.style.setProperty('--fish-x', (typeof item.spriteX === 'number' ? item.spriteX : column * 100 / 3) + '%');
      element.style.setProperty('--fish-size', item.spriteSize || '400%');
      element.style.backgroundSize = item.standalone ? 'contain' : '';
    }

    function renderCatalog(collection, visibleFish, kicker) {
      const catalogFish = visibleFish || fish;
      const found = catalogFish.filter((item) => collection[item.id] && collection[item.id].count > 0).length;
      elements.catalogKicker.textContent = kicker;
      elements.catalogProgress.textContent = '已发现 ' + found + ' / ' + catalogFish.length;
      elements.catalogGrid.innerHTML = '';
      catalogFish.forEach((item) => {
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

    function renderLocations(locations) {
      elements.locationsGrid.innerHTML = '';
      locations.forEach((location) => {
        const card = document.createElement('article');
        card.className = 'location-card' + (location.unlocked ? ' is-unlocked' : ' is-locked') + (location.current ? ' is-current' : '');
        card.dataset.location = location.id;
        const art = document.createElement('div');
        art.className = 'location-card__art location-card__art--' + location.id;
        art.innerHTML = '<span>' + location.icon + '</span>';
        const copy = document.createElement('div');
        copy.className = 'location-card__copy';
        const status = document.createElement('span');
        status.className = 'location-card__status';
        status.textContent = location.current ? '当前钓场' : (location.unlocked ? '已解锁' : '尚未解锁');
        const title = document.createElement('h3');
        title.textContent = location.name;
        const subtitle = document.createElement('p');
        subtitle.textContent = location.subtitle;
        const progress = document.createElement('p');
        progress.className = 'location-card__progress';
        progress.textContent = location.progressText;
        const button = document.createElement('button');
        button.className = 'location-card__button';
        button.type = 'button';
        button.dataset.location = location.id;
        button.disabled = !location.available;
        button.textContent = location.actionText;
        copy.append(status, title, subtitle, progress, button);
        card.append(art, copy);
        elements.locationsGrid.appendChild(card);
      });
    }

    function setCatchableArt(element, item) {
      element.classList.remove('fish-sprite');
      element.classList.add('catchable-art');
      element.style.backgroundImage = '';
      element.textContent = item.icon;
    }

    function renderItems(items, records) {
      const treasures = items.filter((item) => item.type === 'treasure');
      const foundTreasures = treasures.filter((item) => records[item.id]).length;
      elements.itemsProgress.textContent = '已发现 ' + foundTreasures + ' / ' + treasures.length + ' 件探索物品';
      elements.itemsGrid.innerHTML = '';
      items.forEach((item) => {
        const count = Number(records[item.id]) || 0;
        const discovered = count > 0;
        const card = document.createElement('article');
        card.className = 'fish-card item-card' + (discovered ? '' : ' is-locked');
        card.dataset.rarity = item.type === 'treasure' ? '稀有' : '常见';
        const art = document.createElement('div');
        art.className = 'fish-card__art catchable-art';
        art.textContent = discovered ? item.icon : '？';
        const name = document.createElement('h3');
        name.textContent = discovered ? item.name : '？？？';
        const rarity = document.createElement('p');
        rarity.className = 'fish-card__rarity';
        rarity.textContent = discovered ? item.rarity : (item.type === 'treasure' ? '尚未发现' : '水底杂物');
        const detail = document.createElement('p');
        detail.textContent = discovered ? item.line + '\n获得 ' + count + ' 次' : (item.type === 'treasure' ? '似乎沉在某片水域里。' : '继续垂钓就可能遇见。');
        card.append(art, name, rarity, detail);
        elements.itemsGrid.appendChild(card);
      });
    }

    function renderTackle(tackle) {
      elements.tacklePanel.querySelectorAll('[data-bait]').forEach((button) => {
        const active = button.dataset.bait === tackle.selectedBait;
        button.classList.toggle('is-active', active);
        button.disabled = button.dataset.bait === 'premium' && tackle.premiumBait <= 0;
        if (button.dataset.bait === 'normal') button.querySelector('em').textContent = active ? '使用中' : '选择';
      });
      const premium = elements.tacklePanel.querySelector('[data-bait="premium"]');
      premium.classList.toggle('is-active', tackle.selectedBait === 'premium');
      elements.premiumBaitCount.textContent = tackle.selectedBait === 'premium' ? '使用中 · × ' + tackle.premiumBait : '× ' + tackle.premiumBait;
      elements.tacklePanel.querySelectorAll('[data-gear]').forEach((button) => {
        const active = !!tackle[button.dataset.gear];
        button.classList.toggle('is-active', active);
        button.querySelector('em').textContent = active ? '已开启' : '已关闭';
      });
    }

    function renderEconomyBar(stats) {
      elements.coinCount.textContent = String(stats.coins);
      elements.bagCount.textContent = stats.bagCount + ' / ' + stats.capacity;
    }

    function renderBasket(bag, coins, config) {
      const total = config.total;
      elements.basketSummary.textContent = bag.length ? bag.length + ' / ' + config.capacity + ' 条鱼 · 预计价值 ' + total + ' 🪙' : '鱼篓还是空的 · 容量 ' + config.capacity;
      elements.basketList.innerHTML = '';
      if (!bag.length) {
        const empty = document.createElement('p');
        empty.className = 'basket-empty';
        empty.textContent = '下一条收获会安静地躺在这里。';
        elements.basketList.appendChild(empty);
      } else {
        bag.slice().reverse().forEach((entry) => {
          const item = fishById.get(entry.id);
          if (!item) return;
          const row = document.createElement('article');
          row.className = 'basket-row';
          const art = document.createElement('div');
          art.className = 'basket-row__art fish-sprite';
          setFishSprite(art, item);
          const copy = document.createElement('span');
          const name = document.createElement('b');
          name.textContent = item.name;
          const detail = document.createElement('small');
          detail.textContent = formatWeight(entry.weight) + ' · ' + item.rarity;
          copy.append(name, detail);
          const value = document.createElement('em');
          value.textContent = entry.value + ' 🪙';
          row.append(art, copy, value);
          elements.basketList.appendChild(row);
        });
      }
      elements.sellAllBtn.disabled = !bag.length;
      elements.sellAllBtn.textContent = bag.length ? '全部出售 · +' + total + ' 🪙' : '全部出售';
      elements.buyBaitBtn.disabled = coins < config.packPrice;
      elements.buyBaitBtn.textContent = config.packPrice + ' 🪙';
    }

    return Object.freeze({ setFishSprite, setCatchableArt, renderCatalog, renderItems, renderTackle, renderEconomyBar, renderBasket, renderHud, renderMuted, renderEnvironment, renderLocations });
  }

  global.FishingUI = Object.freeze({ formatWeight, create });
})(window);
