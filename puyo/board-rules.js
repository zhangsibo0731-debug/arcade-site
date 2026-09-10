(function (global) {
  'use strict';

  const VERSION = 1;

  function create(options) {
    const rows = options.rows;
    const cols = options.cols;
    const garbage = options.garbage;
    const rotations = options.rotations;
    const clearSize = options.clearSize || 4;

    function emptyBoard() {
      return Array.from({ length: rows }, () => Array(cols).fill(0));
    }

    function pairCells(pair, x, y, rotation) {
      const offset = rotations[rotation];
      return [
        { x: x, y: y, color: pair.colors[0] },
        { x: x + offset[0], y: y + offset[1], color: pair.colors[1] },
      ];
    }

    function collides(board, pair, x, y, rotation) {
      if (!pair) return true;
      return pairCells(pair, x, y, rotation).some((cell) => {
        if (cell.x < 0 || cell.x >= cols || cell.y >= rows) return true;
        return cell.y >= 0 && board[cell.y][cell.x] !== 0;
      });
    }

    function findClearGroups(board) {
      const seen = emptyBoard().map((row) => row.map(() => false));
      const groups = [];
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const color = board[y][x];
          if (!color || color === garbage || seen[y][x]) continue;
          const group = [];
          const stack = [[x, y]];
          seen[y][x] = true;
          while (stack.length) {
            const cell = stack.pop();
            group.push(cell);
            directions.forEach((direction) => {
              const nextX = cell[0] + direction[0];
              const nextY = cell[1] + direction[1];
              if (nextX < 0 || nextX >= cols || nextY < 0 || nextY >= rows) return;
              if (!seen[nextY][nextX] && board[nextY][nextX] === color) {
                seen[nextY][nextX] = true;
                stack.push([nextX, nextY]);
              }
            });
          }
          if (group.length >= clearSize) groups.push({ color: color, cells: group });
        }
      }
      return groups;
    }

    function applyGravity(board, animate) {
      const next = emptyBoard();
      const offsets = new Map();
      for (let x = 0; x < cols; x++) {
        let write = rows - 1;
        for (let y = rows - 1; y >= 0; y--) {
          if (!board[y][x]) continue;
          next[write][x] = board[y][x];
          const distance = write - y;
          if (animate && distance > 0) offsets.set(x + ',' + write, distance);
          write--;
        }
      }
      return { board: next, offsets: offsets };
    }

    function garbageCandidates(board, excluded, sources) {
      const blocked = excluded || new Set();
      const origins = sources && sources.length ? sources : [[cols / 2, rows / 2]];
      const candidates = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (board[y][x] !== garbage || blocked.has(x + ',' + y)) continue;
          const distance = Math.min(...origins.map((cell) => Math.abs(x - cell[0]) + Math.abs(y - cell[1])));
          candidates.push({ cell: [x, y], distance: distance });
        }
      }
      return candidates.sort((a, b) => a.distance - b.distance || b.cell[1] - a.cell[1]).map((item) => item.cell);
    }

    function groupBonus(size) {
      if (size <= 4) return 0;
      if (size === 5) return 2;
      if (size === 6) return 3;
      if (size === 7) return 4;
      if (size === 8) return 5;
      if (size === 9) return 6;
      if (size === 10) return 7;
      return 10;
    }

    return Object.freeze({ emptyBoard, pairCells, collides, findClearGroups, applyGravity, garbageCandidates, groupBonus });
  }

  global.PuyoBoardRules = Object.freeze({ VERSION, create });
})(typeof window !== 'undefined' ? window : globalThis);
