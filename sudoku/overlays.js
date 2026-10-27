(function (root) {
  'use strict';
  function model(kind, m, layout, message) {
    if (!kind) return null;
    const definitions = {
      resume: ['继续上次游戏？', m.configLabel + ' · 用时 ' + m.elapsedLabel, [['resume', '继续游戏'], ['confirmNew', '重新开始']]],
      paused: ['休息一下', '计时已暂停，继续后再开始计时。', [['resume', '继续游戏'], ['back', '返回游戏厅']]],
      confirm: ['开始新游戏？', '当前进度将被替换。取消可回到原来的题目。', [['confirmNew', '开始新游戏'], ['cancel', '取消']]],
      invalid: ['存档暂时无法恢复', '原始存档仍保留。开始新局前会备份，不会自动清空。', [['confirmNew', '开始新游戏'], ['back', '返回游戏厅']]],
      won: [m.state.mode === 'kids' ? '太棒了，你赢啦！' : '解出来了！', m.configLabel + '\n用时 ' + m.elapsedLabel + ' · ' + m.state.mistakes + ' 次失误', [['confirmNew', '再来一局'], ['back', '返回游戏厅']]],
    };
    const definition = definitions[kind];
    const w = Math.min(360, layout.width - 32), h = Math.min(300, layout.bottom - layout.top - 24);
    const box = {x: (layout.width - w) / 2, y: layout.top + (layout.bottom - layout.top - h) / 2, w, h};
    const buttons = definition[2].map(([action, label], i) => ({action, label, x: box.x + 16, y: box.y + box.h - 16 - (definition[2].length - i) * 52, w: w - 32, h: 44}));
    return {kind, title: definition[0], body: message || definition[1], box, buttons};
  }
  const api = {model}; root.SudokuOverlays = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
