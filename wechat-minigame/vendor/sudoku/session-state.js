(function (root) {
  'use strict';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function normalize(value, rules) {
    if (!value || typeof value !== 'object') return null;
    const size = value.size === undefined ? 9 : value.size;
    const mode = value.mode === undefined ? 'classic' : value.mode;
    const level = value.level === undefined ? 'easy' : value.level;
    if (![4, 6, 9].includes(size) || !['classic', 'kids'].includes(mode) || !['easy', 'medium', 'hard'].includes(level) || (mode === 'classic' && size !== 9)) return null;
    const matrix = (a, test) => Array.isArray(a) && a.length === size && a.every(row => Array.isArray(row) && row.length === size && row.every(test));
    const digit = n => Number.isInteger(n) && n >= 0 && n <= size;
    if (!matrix(value.board, digit) || !matrix(value.solution, n => digit(n) && n > 0) || !matrix(value.givens, n => typeof n === 'boolean')) return null;
    const solution = value.solution;
    const {br, bc} = rules.SIZES[size];
    const units = rules.buildUnits(size, br, bc);
    if (units.some(unit => new Set(unit.map(([r, c]) => solution[r][c])).size !== size)) return null;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (value.givens[r][c] && value.board[r][c] !== solution[r][c]) return null;
    }
    const notes = value.notes === undefined ? Array.from({length: size}, () => Array(size).fill(0)) : value.notes;
    if (!matrix(notes, n => Number.isInteger(n) && n >= 0 && n < (1 << size))) return null;
    const integer = (n, fallback, max) => n === undefined ? fallback : Number.isInteger(n) && n >= 0 && n <= max ? n : null;
    const elapsed = integer(value.elapsed, 0, 315360000), mistakes = integer(value.mistakes, 0, 10000000), hintsLeft = integer(value.hintsLeft, 3, 3);
    if (elapsed === null || mistakes === null || hintsLeft === null) return null;
    const complete = value.board.every((row, r) => row.every((n, c) => n === solution[r][c]));
    return clone({mode, size, level, board: value.board, solution, givens: value.givens, notes, elapsed, mistakes, hintsLeft, won: complete});
  }
  const api = {normalize, clone};
  root.SudokuState = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
