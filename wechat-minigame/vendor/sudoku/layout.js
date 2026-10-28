(function (root) {
  'use strict';
  function create(width, height, safe, state, scroll = 0) {
    const top = Math.max(0, safe.top || 0), bottom = Math.min(height, safe.bottom == null ? height : safe.bottom);
    const left = Math.max(12, safe.left || 0), right = Math.min(width - 12, safe.right == null ? width - 12 : safe.right - 12);
    const w = Math.min(520, right - left), x = left + (right - left - w) / 2;
    const obstruction = safe.obstruction || null;
    const boxes = [], add = (action, label, xx, y, ww, h = 44, fixed = false) => boxes.push({action, label, x: xx, y, w: ww, h, fixed});
    const headerY = top + 8;
    add('back', '‹', x, headerY, 44, 44, true);
    const title = {x: x + 50, y: headerY + 22};
    // Only the right-hand capsule is excluded. The left title never inherits
    // its height; full-width controls start safely below it.
    const configY = Math.max(headerY + 56, obstruction ? obstruction.y + obstruction.h + 12 : 0);
    const configLabel = state.mode === 'kids' ? '儿童版 · ' + state.size + '宫' : '原版 · ' + ({easy:'简单',medium:'中等',hard:'困难'}[state.level]);
    add('settings', configLabel, x, configY, w - 132, 44, true);
    add('new', '新局', x + w - 120, configY, 56, 44, true);
    add('pause', '暂停', x + w - 56, configY, 56, 44, true);
    const stats = {x, y: configY + 58, w};
    let y = stats.y + 42;
    const bodyTop = y;
    const rows = Math.ceil(state.size / (state.size === 4 ? 2 : 3)), keyHeight = rows * 50 + (rows - 1) * 6;
    const side = Math.min(w, Math.max(Math.min(w, state.size * 26), bottom - bodyTop - keyHeight - 86));
    const board = {x: x + (w - side) / 2, y, w: side, h: side}; y += side + 14;
    const cols = state.size === 4 ? 2 : 3;
    for (let i = 0; i < state.size; i++) add('number:' + (i + 1), String(i + 1), x + i % cols * (w + 6) / cols, y + Math.floor(i / cols) * 56, (w - (cols - 1) * 6) / cols, 50);
    y += keyHeight + 10;
    ['notes', 'undo', 'erase', 'hint'].forEach((action, i) => add(action, ['笔记', '撤销', '擦除', '提示'][i], x + i * (w + 6) / 4, y, (w - 18) / 4, 46));
    y += 62;
    const maxScroll = Math.max(0, y - bottom), offset = Math.max(0, Math.min(maxScroll, scroll));
    return {width, height, top, bottom, title, stats, board, boxes, bodyTop, obstruction, overlayTop: Math.max(top, obstruction ? obstruction.y + obstruction.h + 12 : top), maxScroll, scroll: offset, contentBottom: y};
  }
  function hit(layout, px, py) {
    if (py < layout.top || py > layout.bottom) return null;
    const o = layout.obstruction;
    if (o && px >= o.x && px < o.x + o.w && py >= o.y && py < o.y + o.h) return null;
    const fixed = layout.boxes.find(b => b.fixed && px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h);
    if (fixed) return fixed.action;
    if (py < layout.bodyTop) return null;
    const y = py + layout.scroll;
    const button = layout.boxes.find(b => !b.fixed && px >= b.x && px < b.x + b.w && y >= b.y && y < b.y + b.h);
    if (button) return button.action;
    const b = layout.board;
    if (px >= b.x && px < b.x + b.w && y >= b.y && y < b.y + b.h) return {x: (px - b.x) / b.w, y: (y - b.y) / b.h};
    return null;
  }
  const api = {create, hit}; root.SudokuLayout = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
