(function (global) {
  "use strict";
  function create(options) {
    const random = options && typeof options.random === "function" ? options.random : Math.random;
    const HINT_LIMIT = 3;
  const LEVELS = {
    easy: { label: '简单', clues: 44 },
    medium: { label: '中等', clues: 36 },
    hard: { label: '困难', clues: 30 },
  };
  // 每种棋盘：宫的行数/列数、儿童版固定提示数
  const SIZES = {
    4: { br: 2, bc: 2, clues: 10 },
    6: { br: 2, bc: 3, clues: 24 },
    9: { br: 3, bc: 3, clues: 56 },
  };
  // ---------- 数独引擎（泛化 N×N）----------
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function findEmpty(grid) {
    const N = grid.length;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c] === 0) return [r, c];
      }
    }
    return null;
  }

  function isValidPlacement(grid, r, c, n, br, bc) {
    const N = grid.length;
    for (let i = 0; i < N; i++) {
      if (grid[r][i] === n || grid[i][c] === n) return false;
    }
    const R = Math.floor(r / br) * br;
    const C = Math.floor(c / bc) * bc;
    for (let rr = R; rr < R + br; rr++) {
      for (let cc = C; cc < C + bc; cc++) {
        if (grid[rr][cc] === n) return false;
      }
    }
    return true;
  }

  function solveGrid(grid, br, bc, randomize) {
    const N = grid.length;
    const pos = findEmpty(grid);
    if (!pos) return true;
    const r = pos[0], c = pos[1];
    const nums = [];
    for (let n = 1; n <= N; n++) nums.push(n);
    if (randomize) shuffle(nums);
    for (const n of nums) {
      if (isValidPlacement(grid, r, c, n, br, bc)) {
        grid[r][c] = n;
        if (solveGrid(grid, br, bc, randomize)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  function countSolutions(grid, br, bc, limit) {
    const N = grid.length;
    let count = 0;
    (function rec() {
      if (count >= limit) return;
      const pos = findEmpty(grid);
      if (!pos) { count++; return; }
      const r = pos[0], c = pos[1];
      for (let n = 1; n <= N; n++) {
        if (isValidPlacement(grid, r, c, n, br, bc)) {
          grid[r][c] = n;
          rec();
          grid[r][c] = 0;
          if (count >= limit) return;
        }
      }
    })();
    return count;
  }

  // 只用「某行/列/宫正好空 1 格」就能解完——最直观，最适合儿童
  function lastEmptySolvable(grid, size, br, bc) {
    const g = grid.map((row) => row.slice());
    for (;;) {
      let progress = false;
      const units = buildUnits(size, br, bc);
      for (const u of units) {
        const empties = u.filter((p) => g[p[0]][p[1]] === 0);
        if (empties.length === 1) {
          const used = new Set(u.filter((p) => g[p[0]][p[1]] !== 0).map((p) => g[p[0]][p[1]]));
          for (let n = 1; n <= size; n++) {
            if (!used.has(n)) { g[empties[0][0]][empties[0][1]] = n; break; }
          }
          progress = true;
        }
      }
      if (!progress) return findEmpty(g) === null;
    }
  }

  function generatePuzzle(size, br, bc, clues, easy) {
    const solution = Array.from({ length: size }, () => Array(size).fill(0));
    solveGrid(solution, br, bc, true);

    const puzzle = solution.map((row) => row.slice());
    const positions = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) positions.push([r, c]);
    }
    shuffle(positions);

    let removed = 0;
    const target = size * size - clues;
    for (const pos of positions) {
      if (removed >= target) break;
      const r = pos[0], c = pos[1];
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
      const copy = puzzle.map((row) => row.slice());
      const ok = easy
        ? lastEmptySolvable(copy, size, br, bc)
        : countSolutions(copy, br, bc, 2) === 1;
      if (ok) {
        removed++;
      } else {
        puzzle[r][c] = backup;
      }
    }
    return { puzzle, solution };
  }

  // 儿童版：保证开局有若干行/列/宫只空 1 格（多个明显落点，降低起步难度）
  function buildUnits(size, br, bc) {
    const units = [];
    for (let r = 0; r < size; r++) {
      const u = [];
      for (let c = 0; c < size; c++) u.push([r, c]);
      units.push(u);
    }
    for (let c = 0; c < size; c++) {
      const u = [];
      for (let r = 0; r < size; r++) u.push([r, c]);
      units.push(u);
    }
    for (let R = 0; R < size; R += br) {
      for (let C = 0; C < size; C += bc) {
        const u = [];
        for (let rr = R; rr < R + br; rr++) {
          for (let cc = C; cc < C + bc; cc++) u.push([rr, cc]);
        }
        units.push(u);
      }
    }
    return units;
  }

  function ensureEasyEntry(puzzle, solution, size, br, bc, target) {
    for (let pass = 0; pass < target; pass++) {
      const units = buildUnits(size, br, bc);
      let best = null, bestEmpty = Infinity;
      for (const u of units) {
        const empties = u.filter((p) => puzzle[p[0]][p[1]] === 0);
        if (empties.length >= 2 && empties.length < bestEmpty) { bestEmpty = empties.length; best = empties; }
      }
      if (!best) break;
      for (let i = 0; i < best.length - 1; i++) {
        const r = best[i][0], c = best[i][1];
        puzzle[r][c] = solution[r][c];
      }
    }
  }

  // ---------- 一局新游戏 ----------
  function clueCountFor(size, level) {
    return size === 9 ? LEVELS[level].clues : SIZES[size].clues;
  }

  function makeGame(mode, size, level) {
    const s = SIZES[size];
    const g = generatePuzzle(size, s.br, s.bc, clueCountFor(size, level), mode === 'kids');
    if (mode === 'kids') ensureEasyEntry(g.puzzle, g.solution, size, s.br, s.bc, size === 9 ? 3 : size === 6 ? 2 : 1);
    return {
      mode,
      size,
      level,
      board: g.puzzle.map((row) => row.slice()),
      givens: g.puzzle.map((row) => row.map((v) => v !== 0)),
      notes: Array.from({ length: size }, () => Array(size).fill(0)),
      solution: g.solution,
      mistakes: 0,
      elapsed: 0,
      won: false,
      hintsLeft: HINT_LIMIT,
    };
  }

    return Object.freeze({ LEVELS, SIZES, shuffle, findEmpty, isValidPlacement, solveGrid, countSolutions, lastEmptySolvable, generatePuzzle, buildUnits, ensureEasyEntry, clueCountFor, makeGame });
  }
  const api = Object.freeze({create});
  global.SudokuRules = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
