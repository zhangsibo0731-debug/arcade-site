(function (global) {
  'use strict';

  const ICON_INDEX = Object.freeze({
    fish: 0, book: 1, 'moon-fish': 2, 'four-waters': 3, hook: 4,
    'flame-hook': 5, 'large-fish': 6, 'crown-fish': 7, 'bare-hook': 8,
    'legend-hook': 9, treasure: 10, river: 11, lighthouse: 12, 'abyss-map': 13,
    relic: 14, coin: 15, coins: 16, bait: 17, scale: 18, 'broken-line': 19,
    almost: 20, bobber: 21, 'shrug-bait': 22, boot: 23, mystery: 24,
  });
  const PAUSABLE = Object.freeze(['ready', 'casting', 'waiting', 'bite', 'hooking', 'fishing']);

  function create(options) {
    const elements = options.elements;
    const definitions = options.definitions;
    const categories = options.categories;
    let activeCategory = 'all';
    let toastTimer = 0;
    const toastQueue = [];

    function unlockedState() { return options.engine.getState().unlocked; }
    function context() { return options.getContext(); }
    function iconMarkup(icon, hidden) {
      if (hidden) return '<span class="achievement-icon is-mystery" aria-hidden="true"></span>';
      const index = Object.prototype.hasOwnProperty.call(ICON_INDEX, icon) ? ICON_INDEX[icon] : ICON_INDEX.mystery;
      const column = index % 5;
      const row = Math.floor(index / 5);
      return '<span class="achievement-icon" style="--icon-x:' + (column * 25) + '%;--icon-y:' + (row * 25) + '%" aria-hidden="true"></span>';
    }

    function renderFilters() {
      const entries = [['all', '全部']].concat(Object.entries(categories).map(([id, item]) => [id, item.label]));
      elements.filters.innerHTML = entries.map(([id, label]) => '<button type="button" role="tab" data-achievement-filter="' + id + '" aria-selected="' + (id === activeCategory) + '">' + label + '</button>').join('');
    }

    function render() {
      const unlocked = unlockedState();
      const visible = activeCategory === 'all' ? definitions : definitions.filter((item) => item.category === activeCategory);
      elements.progress.textContent = '已解锁 ' + Object.keys(unlocked).length + ' / ' + definitions.length;
      elements.grid.innerHTML = visible.map((item) => {
        const record = unlocked[item.id];
        const progress = options.engine.progress(item, context());
        const category = categories[item.category];
        const lockedTitle = item.hidden && !record ? '？？？' : item.title;
        const lockedText = item.hidden && !record ? '继续探索，也许会发生奇怪的事情。' : item.description;
        const progressText = !record && progress && progress.target ? '<small>' + Math.min(progress.value, progress.target) + ' / ' + progress.target + '</small>' : '';
        const date = record && record.unlockedAt ? '<time>' + new Date(record.unlockedAt).toLocaleDateString('zh-CN') + ' 解锁</time>' : progressText;
        return '<article class="achievement-card is-' + (record ? 'unlocked' : 'locked') + '" data-category="' + item.category + '">' +
          '<div class="achievement-badge frame-' + item.frame + ' accent-' + category.accent + '">' + iconMarkup(item.icon, item.hidden && !record) + '</div>' +
          '<div><em>' + category.label + '</em><h3>' + lockedTitle + '</h3><p>' + lockedText + '</p>' + date + '</div></article>';
      }).join('');
      elements.dot.hidden = options.engine.getState().unseen.length === 0;
    }

    function open() {
      const mode = options.getMode();
      if (PAUSABLE.includes(mode)) options.pause();
      options.hidePanels();
      renderFilters();
      render();
      elements.panel.hidden = false;
      options.store.markSeen();
      elements.dot.hidden = true;
    }

    function close() { elements.panel.hidden = true; }

    function showNextToast() {
      if (!toastQueue.length) return;
      const next = toastQueue.shift();
      elements.toastTitle.textContent = next.title;
      elements.toastText.textContent = next.text;
      elements.toast.hidden = false;
      elements.toast.classList.remove('is-visible');
      void elements.toast.offsetWidth;
      elements.toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        elements.toast.classList.remove('is-visible');
        setTimeout(() => { elements.toast.hidden = true; showNextToast(); }, 220);
      }, 2600);
    }

    function notify(definition) {
      const wasEmpty = toastQueue.length === 0 && elements.toast.hidden;
      toastQueue.push({ title: '成就解锁 · ' + definition.title, text: definition.description });
      elements.dot.hidden = false;
      if (wasEmpty) showNextToast();
    }

    function notifyRetroactive(count) {
      if (!count) return;
      const wasEmpty = toastQueue.length === 0 && elements.toast.hidden;
      toastQueue.push({ title: '既有记录已整理', text: '为你补发了 ' + count + ' 项成就' });
      elements.dot.hidden = false;
      if (wasEmpty) showNextToast();
    }

    elements.filters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-achievement-filter]');
      if (!button) return;
      activeCategory = button.dataset.achievementFilter;
      renderFilters();
      render();
    });
    elements.toast.addEventListener('click', open);

    return Object.freeze({ open, close, render, notify, notifyRetroactive });
  }

  global.FishingAchievementUI = Object.freeze({ create });
})(window);
