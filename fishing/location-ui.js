(function (global) {
  'use strict';

  const PAUSABLE_MODES = Object.freeze(['ready', 'casting', 'waiting', 'bite', 'hooking', 'fishing']);

  function create(options) {
    const rules = options.rules;
    const locations = rules.locations;
    const elements = options.elements;

    function present() {
      const current = options.getState().currentLocationId;
      elements.stage.dataset.location = current;
      elements.stage.classList.remove('is-sonar-active');
      elements.indicator.hidden = current === 'lake';
      elements.indicator.classList.remove('is-surge', 'is-sonar', 'is-warning', 'is-active');
      if (current === 'river') elements.indicator.textContent = '水流 ≋';
      else if (current === 'coast') {
        elements.indicator.textContent = '浪涌平静';
        elements.indicator.classList.add('is-surge');
      } else if (current === 'abyss') {
        elements.indicator.textContent = '声呐待机';
        elements.indicator.classList.add('is-sonar');
      }
    }

    function refreshUnlocks() {
      const current = options.getState();
      const next = rules.resolveUnlocked(current.collection, current.itemCollection, current.unlockedLocations);
      const newlyUnlocked = next.filter((id) => !current.unlockedLocations.includes(id));
      options.updateState({ unlockedLocations: next });
      options.storage.writeObject(options.keys.unlocked, next);
      options.storage.writeString(options.keys.current, current.currentLocationId);
      return newlyUnlocked;
    }

    function viewModels() {
      const current = options.getState();
      const discovered = rules.discoveredFishCount(current.collection);
      return Object.values(locations).filter((location) => {
        return !location.hiddenUntilItemId || current.unlockedLocations.includes(location.id) || Number(current.itemCollection[location.hiddenUntilItemId]) > 0;
      }).map((location) => {
        const progress = rules.progressFor(location, current.collection);
        const unlockProgress = rules.unlockProgressFor(location, current.collection, current.itemCollection);
        const unlocked = current.unlockedLocations.includes(location.id);
        const available = unlocked && location.fishIds.length > 0;
        const needed = location.unlock === 'default' ? 0 : Math.max(0, location.unlock.discoveredFish - discovered);
        const lockedProgress = location.id === 'coast'
          ? '鱼类 ' + Math.min(unlockProgress.fish, unlockProgress.fishNeeded) + '/' + unlockProgress.fishNeeded + ' · 稀有鱼 ' + (unlockProgress.rare ? '✓' : '0/1') + ' · 线索 ' + (unlockProgress.clue ? '✓' : '0/1')
          : location.id === 'abyss'
            ? '海图 ' + (unlockProgress.required ? '✓' : '0/1') + ' · 指引 ' + (unlockProgress.clue ? '✓' : '0/1') + ' · 传说鱼 ' + (unlockProgress.rare ? '✓' : '0/1')
            : '再发现 ' + needed + ' 种鱼即可解锁';
        const concealed = !!location.lockedName && !unlocked;
        return {
          id: location.id,
          name: concealed ? location.lockedName : location.name,
          icon: concealed ? location.lockedIcon : location.icon,
          subtitle: concealed ? location.lockedSubtitle : location.subtitle,
          unlocked,
          available,
          current: current.currentLocationId === location.id,
          progressText: unlocked ? (location.prototype ? '场景原型 · 完整海鱼图鉴准备中' : '图鉴 ' + progress.found + ' / ' + progress.total) : lockedProgress,
          actionText: available ? (current.currentLocationId === location.id ? '继续在这里钓鱼' : '前往' + location.name) : (unlocked ? '即将开放' : '🔒 未解锁'),
        };
      });
    }

    function open() {
      if (PAUSABLE_MODES.includes(options.getState().mode)) options.pause();
      elements.catalog.hidden = true;
      elements.items.hidden = true;
      elements.tackle.hidden = true;
      elements.basket.hidden = true;
      options.ui.renderLocations(viewModels());
      elements.panel.hidden = false;
    }

    function close() {
      elements.panel.hidden = true;
    }

    function select(id) {
      const current = options.getState();
      if (!locations[id] || !locations[id].fishIds.length || !current.unlockedLocations.includes(id)) return false;
      options.updateState({ currentLocationId: id });
      options.storage.writeString(options.keys.current, id);
      present();
      options.updateEnvironment();
      close();
      options.startSession();
      return true;
    }

    return Object.freeze({ present, refreshUnlocks, viewModels, open, close, select });
  }

  global.FishingLocationUI = Object.freeze({ create });
})(window);
