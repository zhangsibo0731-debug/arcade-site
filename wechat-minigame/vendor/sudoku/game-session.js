(function (root) {
  'use strict';
  const stateRules = typeof module !== 'undefined' && module.exports ? require('./session-state.js') : root.SudokuState;
  function create(rules) {
    let state = null, selected = null, notesMode = false, paused = false, fraction = 0;
    const history = [], events = [];
    const clone = stateRules.clone;
    function start(mode = 'classic', size = 9, level = 'easy') {
      if (!['classic', 'kids'].includes(mode) || ![4, 6, 9].includes(size) || !['easy', 'medium', 'hard'].includes(level) || (mode === 'classic' && size !== 9)) return false;
      state = rules.makeGame(mode, size, level); reset(); paused = false; return true;
    }
    function reset() { selected = null; notesMode = false; history.length = 0; events.length = 0; fraction = 0; }
    function restore(value) { const valid = stateRules.normalize(value, rules); if (!valid) return false; state = valid; reset(); paused = true; return true; }
    function snapshot() { return state ? clone(state) : null; }
    function view() { return {state: snapshot(), selected: selected && {...selected}, notesMode, paused, historyLength: history.length}; }
    function push() { history.push(clone({board: state.board, notes: state.notes})); if (history.length > 250) history.shift(); }
    const playable = () => state && !state.won && !paused;
    function complete() { return !!state && state.board.every((row, r) => row.every((v, c) => v === state.solution[r][c])); }
    function finish() { if (complete()) {state.won = true; events.push({type: 'won'});} }
    function select(r, c) { if (!state || !Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0 || r >= state.size || c >= state.size) return false; selected = {r, c}; return true; }
    function setNotes(value) { notesMode = !!value; }
    function lineDone(r, c) {
      const {br, bc} = rules.SIZES[state.size];
      return rules.buildUnits(state.size, br, bc).filter(unit => unit.some(([rr, cc]) => rr === r && cc === c))
        .some(unit => unit.every(([rr, cc]) => state.board[rr][cc] === state.solution[rr][cc]));
    }
    function enter(n) {
      if (!playable() || !selected || !Number.isInteger(n) || n < 1 || n > state.size) return false;
      const {r, c} = selected;
      if (state.givens[r][c] || (notesMode && state.board[r][c])) return false;
      push();
      if (notesMode) state.notes[r][c] ^= 1 << (n - 1);
      else {
        state.notes[r][c] = 0; state.board[r][c] = n;
        const correct = n === state.solution[r][c];
        if (!correct) state.mistakes++;
        events.push({type: 'entered', r, c, correct, lineDone: correct && lineDone(r, c)});
        finish();
      }
      return true;
    }
    function erase() {
      if (!playable() || !selected) return false;
      const {r, c} = selected;
      if (state.givens[r][c] || (!state.board[r][c] && !state.notes[r][c])) return false;
      push(); state.board[r][c] = 0; state.notes[r][c] = 0; return true;
    }
    function hint() {
      if (!playable() || state.hintsLeft <= 0) return false;
      let target = selected && !state.givens[selected.r][selected.c] && state.board[selected.r][selected.c] !== state.solution[selected.r][selected.c] ? selected : null;
      for (let r = 0; !target && r < state.size; r++) for (let c = 0; c < state.size; c++) if (!state.board[r][c]) {target = {r, c}; break;}
      if (!target) return false;
      push(); const {r, c} = target; state.board[r][c] = state.solution[r][c]; state.notes[r][c] = 0; state.hintsLeft--; selected = {r, c}; finish(); return true;
    }
    function undo() { if (!playable() || !history.length) return false; const snap = history.pop(); state.board = snap.board; state.notes = snap.notes; return true; }
    function tick(ms) { if (!playable() || !Number.isFinite(ms) || ms < 0) return; fraction += ms; const seconds = Math.floor(fraction / 1000); fraction %= 1000; state.elapsed += seconds; }
    function duplicates() {
      const result = new Set(); if (!state) return result;
      const {br, bc} = rules.SIZES[state.size];
      rules.buildUnits(state.size, br, bc).forEach(unit => {
        const seen = new Map(); unit.forEach(([r, c]) => {
          const v = state.board[r][c]; if (!v) return;
          if (seen.has(v)) {result.add(seen.get(v)); result.add(r + ',' + c);} else seen.set(v, r + ',' + c);
        });
      }); return result;
    }
    return {start, restore, snapshot, view, select, setNotes, enter, erase, hint, undo, tick, complete, duplicates, lineDone,
      pause: () => {paused = true;}, resume: () => {paused = false;}, drainEvents: () => events.splice(0)};
  }
  const api = {create}; root.SudokuSession = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
