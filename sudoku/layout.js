(function (root) {
  'use strict';
  function create(width, height, safe, state, scroll = 0) {
    const top = Math.max(0, safe.top || 0), bottom = Math.min(height, safe.bottom == null ? height : safe.bottom);
    const left = Math.max(12, safe.left || 0), right = Math.min(width - 12, safe.right == null ? width - 12 : safe.right - 12);
    const w = Math.min(520, right - left), x = left + (right - left - w) / 2;
    const rows = Math.ceil(state.size / (state.size === 4 ? 2 : 3)), keyHeight = rows * 44 + (rows - 1) * 6;
    const side = Math.min(w, Math.max(Math.min(w, state.size * 26), bottom - top - 278 - keyHeight));
    const boxes = [], add = (action, label, xx, y, ww, h = 44) => boxes.push({action, label, x: xx, y, w: ww, h});
    let y = top + 8;
    add('back', '‹', x, y, 44); add('new', '新局', x + w - 96, y, 44); add('pause', '暂停', x + w - 48, y, 48);
    const title = {x: x + 54, y: y + 20}; y += 52;
    const half = (w - 8) / 2;
    add('mode:classic', '原版', x, y, half); add('mode:kids', '儿童版', x + half + 8, y, half); y += 50;
    const options = state.mode === 'kids' ? [['size:4', '4宫'], ['size:6', '6宫'], ['size:9', '9宫']] : [['level:easy', '简单'], ['level:medium', '中等'], ['level:hard', '困难']];
    options.forEach(([action, label], i) => add(action, label, x + i * (w + 6) / 3, y, (w - 12) / 3)); y += 52;
    const stats = {x, y: y + 14, w}; y += 38;
    const board = {x: x + (w - side) / 2, y, w: side, h: side}; y += side + 12;
    const cols = state.size === 4 ? 2 : 3;
    for (let i = 0; i < state.size; i++) add('number:' + (i + 1), String(i + 1), x + i % cols * (w + 6) / cols, y + Math.floor(i / cols) * 50, (w - (cols - 1) * 6) / cols);
    y += keyHeight + 8;
    ['notes', 'undo', 'erase', 'hint'].forEach((action, i) => add(action, ['笔记', '撤销', '擦除', '提示'][i], x + i * (w + 6) / 4, y, (w - 18) / 4));
    y += 58;
    const maxScroll = Math.max(0, y - bottom), offset = Math.max(0, Math.min(maxScroll, scroll));
    return {width, height, top, bottom, title, stats, board, boxes, maxScroll, scroll: offset, contentBottom: y};
  }
  function hit(layout, px, py) {
    if (py < layout.top || py > layout.bottom) return null;
    const y = py + layout.scroll;
    const button = layout.boxes.find(b => px >= b.x && px < b.x + b.w && y >= b.y && y < b.y + b.h);
    if (button) return button.action;
    const b = layout.board;
    if (px >= b.x && px < b.x + b.w && y >= b.y && y < b.y + b.h) return {x: (px - b.x) / b.w, y: (y - b.y) / b.h};
    return null;
  }
  const api = {create, hit}; root.SudokuLayout = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
