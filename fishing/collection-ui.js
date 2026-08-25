(function (global) {
  'use strict';

  const PAUSABLE = Object.freeze(['casting', 'waiting', 'bite', 'hooking', 'fishing']);

  function create(options) {
    const elements = options.elements;

    function recordFish(item, weight) {
      const current = options.getState();
      const collection = Object.assign({}, current.collection);
      const previous = collection[item.id] || { count: 0, best: 0 };
      const first = previous.count === 0;
      const speciesRecord = weight > previous.best;
      collection[item.id] = { count: previous.count + 1, best: Math.max(previous.best, weight) };
      options.updateState({ collection });
      options.storage.writeObject(options.keys.collection, collection);
      const newlyUnlocked = options.refreshLocations();
      return { first, speciesRecord, newlyUnlocked };
    }

    function recordItem(item) {
      const current = options.getState();
      const itemCollection = Object.assign({}, current.itemCollection);
      const first = !itemCollection[item.id];
      itemCollection[item.id] = (Number(itemCollection[item.id]) || 0) + 1;
      options.updateState({ itemCollection });
      options.storage.writeObject(options.keys.items, itemCollection);
      return { first, count: itemCollection[item.id], newlyUnlocked: options.refreshLocations() };
    }

    function renderCatalog() {
      const current = options.getState();
      const location = options.locations[current.currentLocationId] || options.locations.lake;
      const kicker = location.collectionLabel;
      options.ui.renderCatalog(current.collection, options.currentFishPool(), kicker);
    }

    function openCatalog() {
      if (PAUSABLE.includes(options.getState().mode)) options.pause();
      elements.locations.hidden = true;
      elements.items.hidden = true;
      elements.tackle.hidden = true;
      elements.basket.hidden = true;
      renderCatalog();
      elements.catalog.hidden = false;
    }

    function closeCatalog() {
      elements.catalog.hidden = true;
    }

    function openItems() {
      const current = options.getState();
      if (current.mode === 'ready' || PAUSABLE.includes(current.mode)) options.pause();
      elements.locations.hidden = true;
      elements.catalog.hidden = true;
      elements.tackle.hidden = true;
      elements.basket.hidden = true;
      options.ui.renderItems(options.items, current.itemCollection);
      elements.itemPanel.hidden = false;
    }

    function closeItems() {
      elements.itemPanel.hidden = true;
    }

    return Object.freeze({ recordFish, recordItem, renderCatalog, openCatalog, closeCatalog, openItems, closeItems });
  }

  global.FishingCollectionUI = Object.freeze({ create });
})(window);
