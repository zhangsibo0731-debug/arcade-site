(function () {
  'use strict';

  // ---------- 配置 ----------
  const LEVELS = {
    easy: { label: '简单', clues: 44 },
    medium: { label: '中等', clues: 36 },
    hard: { label: '困难', clues: 30 },
  };
  const STORAGE_KEY = 'sudoku_save_v1';
  const BEST_KEY = 'sudoku_best_v1';
  const MAX_UNDO = 250;
  const HINT_LIMIT = 3;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const boardEl = $('board');
  const numpadEl = $('numpad');
  const timerEl = $('timer');
  const mistakesEl = $('mistakes');
  const bestTimeEl = $('bestTime');
  const overlayEl = $('overlay');
  const modalTimeEl = $('modalTime');
  const modalMetaEl = $('modalMeta');
  const difficultyEl = $('difficulty');
  const btnNotes = $('btnNotes');
  const btnUndo = $('btnUndo');
  const btnErase = $('btnErase');
  const btnHint = $('btnHint');
  const hintCountEl = $('hintCount');
  const btnNewTop = $('btnNewTop');
  const btnPlayAgain = $('btnPlayAgain');
  const resumeOverlayEl = $('resumeOverlay');
  const resumeMetaEl = $('resumeMeta');
  const btnResumeNew = $('btnResumeNew');
  const btnResumeContinue = $('btnResumeContinue');

  // ---------- 状态 ----------
  let state = null;       // { level, board, givens, notes, solution, mistakes, elapsed, won }
  let selected = null;    // { r, c }
  let notesMode = false;
  let history = [];       // 撤销栈（board/notes 快照）
  let timerId = null;

  // ---------- 数独引擎 ----------
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function findEmpty(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) return [r, c];
      }
    }
    return null;
  }

  function isValidPlacement(grid, r, c, n) {
    for (let i = 0; i < 9; i++) {
      if (grid[r][i] === n || grid[i][c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) {
      for (let cc = bc; cc < bc + 3; cc++) {
        if (grid[rr][cc] === n) return false;
      }
    }
    return true;
  }

  function solveGrid(grid, randomize) {
    const pos = findEmpty(grid);
    if (!pos) return true;
    const r = pos[0], c = pos[1];
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    if (randomize) shuffle(nums);
    for (const n of nums) {
      if (isValidPlacement(grid, r, c, n)) {
        grid[r][c] = n;
        if (solveGrid(grid, randomize)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  function countSolutions(grid, limit) {
    let count = 0;
    (function rec() {
      if (count >= limit) return;
      const pos = findEmpty(grid);
      if (!pos) { count++; return; }
      const r = pos[0], c = pos[1];
      for (let n = 1; n <= 9; n++) {
        if (isValidPlacement(grid, r, c, n)) {
          grid[r][c] = n;
          rec();
          grid[r][c] = 0;
          if (count >= limit) return;
        }
      }
    })();
    return count;
  }

  // 生成一个具有唯一解的谜题
  function generatePuzzle(level) {
    const clues = LEVELS[level].clues;
    const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    solveGrid(solution, true);

    const puzzle = solution.map((row) => row.slice());
    const positions = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) positions.push([r, c]);
    }
    shuffle(positions);

    let removed = 0;
    const target = 81 - clues;
    for (const pos of positions) {
      if (removed >= target) break;
      const r = pos[0], c = pos[1];
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
      const copy = puzzle.map((row) => row.slice());
      if (countSolutions(copy, 2) === 1) {
        removed++;
      } else {
        puzzle[r][c] = backup;
      }
    }
    return { puzzle, solution };
  }

  // ---------- 一局新游戏 ----------
  function makeGame(level) {
    const g = generatePuzzle(level);
    return {
      level,
      board: g.puzzle.map((row) => row.slice()),
      givens: g.puzzle.map((row) => row.map((v) => v !== 0)),
      notes: Array.from({ length: 9 }, () => Array(9).fill(0)),
      solution: g.solution,
      mistakes: 0,
      elapsed: 0,
      won: false,
      hintsLeft: HINT_LIMIT,
    };
  }

  // ---------- 计时 ----------
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }
  function startTimer() {
    if (timerId) return;
    timerId = setInterval(tick, 1000);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }
  function tick() {
    if (!state || state.won) return;
    state.elapsed++;
    timerEl.textContent = formatTime(state.elapsed);
    save();
  }

  // ---------- 最佳成绩 ----------
  function readBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function getBest(level) { return readBest()[level] || null; }
  function setBest(level, t) {
    const all = readBest();
    all[level] = t;
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
  }

  // ---------- 持久化 ----------
  function save() {
    if (!state) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      level: state.level,
      board: state.board,
      givens: state.givens,
      notes: state.notes,
      solution: state.solution,
      mistakes: state.mistakes,
      elapsed: state.elapsed,
      won: state.won,
      hintsLeft: state.hintsLeft,
    }));
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || !d.board || !d.solution || !d.givens) return null;
      return d;
    } catch (e) { return null; }
  }

  // ---------- 撤销 ----------
  function pushUndo() {
    history.push({
      board: state.board.map((r) => r.slice()),
      notes: state.notes.map((r) => r.slice()),
    });
    if (history.length > MAX_UNDO) history.shift();
  }
  function undo() {
    const snap = history.pop();
    if (!snap || state.won) return;
    state.board = snap.board;
    state.notes = snap.notes;
    render();
    save();
  }

  // ---------- 判定 ----------
  function findDuplicates() {
    const dup = new Set();
    const b = state.board;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const v = b[r][c];
        if (!v) continue;
        for (let i = 0; i < 9; i++) {
          if (i !== c && b[r][i] === v) { dup.add(r + ',' + c); dup.add(r + ',' + i); }
          if (i !== r && b[i][c] === v) { dup.add(r + ',' + c); dup.add(i + ',' + c); }
        }
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let rr = br; rr < br + 3; rr++) {
          for (let cc = bc; cc < bc + 3; cc++) {
            if ((rr !== r || cc !== c) && b[rr][cc] === v) {
              dup.add(r + ',' + c); dup.add(rr + ',' + cc);
            }
          }
        }
      }
    }
    return dup;
  }

  function isComplete() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (state.board[r][c] !== state.solution[r][c]) return false;
      }
    }
    return true;
  }

  function checkWin() {
    if (!isComplete()) return;
    state.won = true;
    stopTimer();
    const prev = getBest(state.level);
    if (!prev || state.elapsed < prev) setBest(state.level, state.elapsed);
    showOverlay();
    save();
  }

  // ---------- 输入操作 ----------
  function enterNumber(n) {
    if (!selected || !state || state.won) return;
    const r = selected.r, c = selected.c;
    if (state.givens[r][c]) return;
    if (notesMode) {
      if (state.board[r][c] !== 0) return; // 有数字时不做笔记
      pushUndo();
      state.notes[r][c] ^= (1 << (n - 1));
    } else {
      pushUndo();
      state.notes[r][c] = 0;
      state.board[r][c] = n;
      if (n !== state.solution[r][c]) state.mistakes++;
    }
    render();
    save();
    checkWin();
  }

  function erase() {
    if (!selected || !state || state.won) return;
    const r = selected.r, c = selected.c;
    if (state.givens[r][c]) return;
    if (state.board[r][c] === 0 && state.notes[r][c] === 0) return;
    pushUndo();
    state.board[r][c] = 0;
    state.notes[r][c] = 0;
    render();
    save();
  }

  function hint() {
    if (!state || state.won) return;
    if (state.hintsLeft <= 0) return;
    let target = null;
    if (selected && !state.givens[selected.r][selected.c] &&
        state.board[selected.r][selected.c] !== state.solution[selected.r][selected.c]) {
      target = selected;
    }
    if (!target) {
      outer:
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (state.board[r][c] === 0) { target = { r, c }; break outer; }
        }
      }
    }
    if (!target) return;
    const r = target.r, c = target.c;
    pushUndo();
    state.notes[r][c] = 0;
    state.board[r][c] = state.solution[r][c];
    state.hintsLeft--;
    selected = { r, c };
    render();
    save();
    checkWin();
  }

  function select(r, c) {
    selected = { r, c };
    render();
  }

  function moveSelection(key) {
    if (!state) return;
    if (!selected) { select(0, 0); return; }
    let r = selected.r, c = selected.c;
    if (key === 'ArrowUp') r = (r + 8) % 9;
    else if (key === 'ArrowDown') r = (r + 1) % 9;
    else if (key === 'ArrowLeft') c = (c + 8) % 9;
    else if (key === 'ArrowRight') c = (c + 1) % 9;
    select(r, c);
  }

  // ---------- 渲染 ----------
  function render() {
    if (!state) return;

    // 难度
    difficultyEl.querySelectorAll('.difficulty__btn').forEach((btn) => {
      const active = btn.dataset.level === state.level;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    // 统计
    timerEl.textContent = formatTime(state.elapsed);
    mistakesEl.textContent = String(state.mistakes);
    const best = getBest(state.level);
    bestTimeEl.textContent = best ? formatTime(best) : '--:--';

    // 笔记按钮态
    btnNotes.classList.toggle('is-active', notesMode);
    btnNotes.setAttribute('aria-pressed', String(notesMode));

    // 提示按钮态
    hintCountEl.textContent = String(state.hintsLeft);
    btnHint.disabled = state.hintsLeft <= 0;

    renderBoard();
    renderNumpad();
  }

  function renderBoard() {
    const dup = findDuplicates();
    const sel = selected;
    const selVal = sel ? state.board[sel.r][sel.c] : 0;
    let html = '';

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const value = state.board[r][c];
        const isGiven = state.givens[r][c];
        const cls = ['cell'];
        if (r % 3 === 2 && r !== 8) cls.push('cell--box-b');
        if (c % 3 === 2 && c !== 8) cls.push('cell--box-r');
        if (r === 8) cls.push('cell--last-r');
        if (c === 8) cls.push('cell--last-c');
        if (value && isGiven) cls.push('cell--given');
        if (value && !isGiven) cls.push('cell--user');

        const isSel = sel && sel.r === r && sel.c === c;
        const isPeer = sel && !isSel && (
          sel.r === r || sel.c === c ||
          (Math.floor(sel.r / 3) === Math.floor(r / 3) && Math.floor(sel.c / 3) === Math.floor(c / 3))
        );
        const isSame = !isSel && selVal && value === selVal;

        if (isSel) cls.push('cell--selected');
        else if (isSame) cls.push('cell--same');
        else if (isPeer) cls.push('cell--peer');

        if (dup.has(r + ',' + c)) cls.push('cell--error');

        let inner = '';
        if (value) {
          inner = '<span class="cell__num">' + value + '</span>';
        } else if (state.notes[r][c]) {
          let spans = '';
          for (let n = 1; n <= 9; n++) {
            const on = (state.notes[r][c] & (1 << (n - 1))) ? ' is-on' : '';
            spans += '<span class="' + on.trim() + '">' + n + '</span>';
          }
          inner = '<div class="cell__notes">' + spans + '</div>';
        }

        html += '<div class="' + cls.join(' ') + '" data-r="' + r + '" data-c="' + c +
          '" role="gridcell" aria-label="' + (r + 1) + ' 行 ' + (c + 1) + ' 列">' + inner + '</div>';
      }
    }
    boardEl.innerHTML = html;
  }

  function renderNumpad() {
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const v = state.board[r][c];
        if (v) counts[v - 1]++;
      }
    }
    numpadEl.querySelectorAll('.numpad__btn').forEach((btn) => {
      const n = +btn.dataset.n;
      const rem = 9 - counts[n - 1];
      btn.querySelector('.numpad__rem').textContent = String(rem);
      btn.classList.toggle('is-done', rem === 0);
    });
  }

  function buildNumpad() {
    let html = '';
    for (let n = 1; n <= 9; n++) {
      html += '<button class="numpad__btn" type="button" data-n="' + n + '" aria-label="填入 ' + n + '">' +
        '<span class="numpad__num">' + n + '</span>' +
        '<span class="numpad__rem">0</span></button>';
    }
    numpadEl.innerHTML = html;
  }

  function showOverlay() {
    modalTimeEl.textContent = formatTime(state.elapsed);
    modalMetaEl.textContent = LEVELS[state.level].label + ' · ' + state.mistakes + ' 失误';
    overlayEl.hidden = false;
  }

  // ---------- 新游戏 / 初始化 ----------
  function newGame(level) {
    state = makeGame(level);
    history = [];
    selected = null;
    notesMode = false;
    overlayEl.hidden = true;
    resumeOverlayEl.hidden = true;
    stopTimer();
    startTimer();
    render();
    save();
  }

  function init() {
    buildNumpad();
    const saved = load();
    if (saved && !saved.won) {
      state = saved;
      if (typeof state.hintsLeft !== 'number') state.hintsLeft = HINT_LIMIT;
      history = [];
      selected = null;
      notesMode = false;
      render();
      showResume();
    } else {
      newGame(saved ? saved.level : 'easy');
    }
  }

  function showResume() {
    resumeMetaEl.textContent = LEVELS[state.level].label + ' · 用时 ' + formatTime(state.elapsed);
    resumeOverlayEl.hidden = false;
  }

  // ---------- 事件绑定 ----------
  boardEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    select(+cell.dataset.r, +cell.dataset.c);
  });

  numpadEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.numpad__btn');
    if (!btn) return;
    enterNumber(+btn.dataset.n);
  });

  difficultyEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.difficulty__btn');
    if (!btn) return;
    newGame(btn.dataset.level);
  });

  btnNotes.addEventListener('click', () => {
    notesMode = !notesMode;
    btnNotes.classList.toggle('is-active', notesMode);
    btnNotes.setAttribute('aria-pressed', String(notesMode));
  });

  btnUndo.addEventListener('click', undo);
  btnErase.addEventListener('click', erase);
  btnHint.addEventListener('click', hint);
  btnNewTop.addEventListener('click', () => newGame(state.level));
  btnPlayAgain.addEventListener('click', () => newGame(state.level));

  btnResumeContinue.addEventListener('click', () => {
    resumeOverlayEl.hidden = true;
    startTimer();
    render();
  });

  btnResumeNew.addEventListener('click', () => {
    resumeOverlayEl.hidden = true;
    newGame(state.level);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') {
      enterNumber(+e.key);
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      erase();
    } else if (e.key === 'n' || e.key === 'N') {
      notesMode = !notesMode;
      btnNotes.classList.toggle('is-active', notesMode);
      btnNotes.setAttribute('aria-pressed', String(notesMode));
    } else if (e.key === 'h' || e.key === 'H') {
      hint();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      moveSelection(e.key);
    }
  });

  init();
})();
