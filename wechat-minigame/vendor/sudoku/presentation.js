(function (root) {
  'use strict';
  function time(seconds) { return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0'); }
  function model(session, rules, best) {
    const view = session.view(), state = view.state;
    if (!state) return null;
    const {size: n, board, givens, notes} = state, {br, bc} = rules.SIZES[n];
    const duplicates = session.duplicates(), sel = view.selected, selectedValue = sel ? board[sel.r][sel.c] : 0;
    const counts = Array(n).fill(0), cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const value = board[r][c]; if (value) counts[value - 1]++;
      const selected = !!sel && sel.r === r && sel.c === c;
      cells.push({r, c, value, given: givens[r][c], notes: notes[r][c], selected,
        same: !selected && !!selectedValue && value === selectedValue,
        peer: !!sel && !selected && (sel.r === r || sel.c === c || (Math.floor(sel.r / br) === Math.floor(r / br) && Math.floor(sel.c / bc) === Math.floor(c / bc))),
        error: duplicates.has(r + ',' + c)});
    }
    return {...view, cells, remaining: counts.map(v => n - v), br, bc,
      elapsedLabel: time(state.elapsed), bestLabel: best == null ? '--:--' : time(best),
      configLabel: state.mode === 'kids' ? '儿童版 · ' + n + '宫' : '原版 · ' + rules.LEVELS[state.level].label};
  }
  const api = {model, time}; root.SudokuPresentation = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
