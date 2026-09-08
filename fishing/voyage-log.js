(function (global) {
  'use strict';

  const VERSION = 1;
  const CLUES = Object.freeze([
    Object.freeze({ id: 'message-bottle', icon: '🍾', title: '被水浸过的留言', text: '“顺着水流走。旧航线没有消失，只是没人再记得它。”' }),
    Object.freeze({ id: 'old-compass', icon: '🧭', title: '指向海风的针', text: '指南针越过清溪后不再指北，而是固执地指向潮声。' }),
    Object.freeze({ id: 'chart-fragment', icon: '🗺️', title: '海图之外', text: '残缺航线穿过潮汐湾，在墨迹尽头标出一片没有名字的深水。' }),
    Object.freeze({ id: 'rusty-key', icon: '🗝️', title: '旧箱子的钥匙', text: '锈迹下刻着细小星纹，正好能打开沉船里那只安静的旧箱子。' }),
  ]);
  const REQUIRED_IDS = Object.freeze(CLUES.map((entry) => entry.id));
  const REWARD = Object.freeze({ id: 'captains-star-chart', icon: '✨', title: '旧船长的星图', text: '星光在旧纸面上重新连成航线。故事到达终点，水面仍会等待下一竿。' });

  function normalize(source, itemCollection) {
    const saved = source && typeof source === 'object' ? source : {};
    const existing = Array.isArray(saved.recorded) ? saved.recorded.filter((id) => REQUIRED_IDS.includes(id)) : [];
    const recorded = REQUIRED_IDS.filter((id) => existing.includes(id) || Number(itemCollection && itemCollection[id]) > 0);
    const completed = recorded.length === REQUIRED_IDS.length;
    return Object.freeze({
      version: VERSION,
      recorded: Object.freeze(recorded),
      completed,
      completedAt: completed ? Math.max(0, Number(saved.completedAt) || Date.now()) : 0,
    });
  }

  function reconcile(previous, itemCollection) {
    const before = normalize(previous, {});
    const state = normalize(previous, itemCollection);
    return Object.freeze({
      state,
      newlyRecorded: Object.freeze(state.recorded.filter((id) => !before.recorded.includes(id))),
      justCompleted: state.completed && !before.completed,
    });
  }

  function render(container, state) {
    if (!container) return;
    const current = normalize(state, {});
    container.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'voyage-log__head';
    heading.innerHTML = '<span>CAPTAIN\'S NOTES</span><h3>航海日志</h3><p>线索 ' + current.recorded.length + ' / ' + REQUIRED_IDS.length + '</p>';
    const pages = document.createElement('div');
    pages.className = 'voyage-log__pages';
    CLUES.forEach((entry, index) => {
      const found = current.recorded.includes(entry.id);
      const page = document.createElement('article');
      page.className = 'voyage-page' + (found ? ' is-found' : ' is-locked');
      page.innerHTML = '<i>' + (found ? entry.icon : '？') + '</i><div><small>日志 ' + String(index + 1).padStart(2, '0') + '</small><h4>' + (found ? entry.title : '尚未记录') + '</h4><p>' + (found ? entry.text : '发现对应的探索物品后，内容会自动补录。') + '</p></div>';
      pages.appendChild(page);
    });
    const finale = document.createElement('article');
    finale.className = 'voyage-page voyage-reward' + (current.completed ? ' is-found' : ' is-locked');
    finale.innerHTML = '<i>' + (current.completed ? REWARD.icon : '🔒') + '</i><div><small>FINAL ENTRY</small><h4>' + (current.completed ? REWARD.title : '旧箱子仍然锁着') + '</h4><p>' + (current.completed ? REWARD.text : '集齐四件航路线索后开启。') + '</p></div>';
    container.append(heading, pages, finale);
  }

  global.FishingVoyageLog = Object.freeze({ VERSION, CLUES, REQUIRED_IDS, REWARD, normalize, reconcile, render });
})(window);
