(function (root) {
  'use strict';
  function model(kind, m, layout, message, draft) {
    if (!kind) return null;
    const top = layout.overlayTop === undefined ? layout.top : layout.overlayTop;
    const w = Math.min(360, layout.width - 32);
    if (kind === 'settings') {
      const h = Math.min(350, layout.bottom - top - 24);
      const box = {x: (layout.width - w) / 2, y: top + (layout.bottom - top - h) / 2, w, h};
      const options = draft.mode === 'kids' ? [['draftSize:4','4宫'],['draftSize:6','6宫'],['draftSize:9','9宫']] : [['draftLevel:easy','简单'],['draftLevel:medium','中等'],['draftLevel:hard','困难']];
      const choices = (items, y, selected) => items.map(([action, label], i) => ({action, label, selected: action === selected, x: box.x + 20 + i * (w - 32) / items.length, y, w: (w - 40 - (items.length - 1) * 8) / items.length, h: 44, kind: 'choice'}));
      const groups = [
        {label:'模式', y:box.y + 91, buttons:choices([['draftMode:classic','原版'],['draftMode:kids','儿童版']],box.y + 105,'draftMode:' + draft.mode)},
        {label:draft.mode === 'kids' ? '棋盘大小' : '难度', y:box.y + 176, buttons:choices(options,box.y + 190,draft.mode === 'kids' ? 'draftSize:' + draft.size : 'draftLevel:' + draft.level)},
      ];
      const buttons = groups.reduce((all, group) => all.concat(group.buttons), []).concat([
        {action:'settingsClose',label:'取消',x:box.x+20,y:box.y+h-64,w:(w-48)/2,h:44},
        {action:'settingsApply',label:'应用设置',x:box.x+28+(w-48)/2,y:box.y+h-64,w:(w-48)/2,h:44,kind:'primary'},
      ]);
      return {kind,title:'游戏设置',body:'切换设置不会立即替换当前题目',draft:{...draft},box,buttons,groups};
    }
    const definitions = {
      resume: ['继续上次游戏？', m.configLabel + ' · 用时 ' + m.elapsedLabel, [['resume', '继续游戏'], ['confirmNew', '重新开始']]],
      paused: ['休息一下', '计时已暂停，继续后再开始计时。', [['resume', '继续游戏'], ['back', '返回游戏厅']]],
      confirm: ['开始新游戏？', '当前进度将被替换。取消可回到原来的题目。', [['confirmNew', '开始新游戏'], ['cancel', '取消']]],
      invalid: ['存档暂时无法恢复', '原始存档仍保留。开始新局前会备份，不会自动清空。', [['confirmNew', '开始新游戏'], ['back', '返回游戏厅']]],
      won: [m.state.mode === 'kids' ? '太棒了，你赢啦！' : '解出来了！', m.configLabel + '\n用时 ' + m.elapsedLabel + ' · ' + m.state.mistakes + ' 次失误', [['confirmNew', '再来一局'], ['back', '返回游戏厅']]],
    };
    const definition = definitions[kind];
    const h = Math.min(kind === 'invalid' ? 280 : kind === 'won' ? 260 : 248, layout.bottom - top - 24);
    const box = {x: (layout.width - w) / 2, y: top + (layout.bottom - top - h) / 2, w, h};
    const buttons = definition[2].map(([action, label], i) => ({action, label, x: box.x + 20, y: box.y + box.h - 16 - (definition[2].length - i) * 52, w: w - 40, h: 44, kind:i === 0 ? 'primary' : 'secondary'}));
    return {kind, title: definition[0], body: message || definition[1], box, buttons};
  }
  const api = {model}; root.SudokuOverlays = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
