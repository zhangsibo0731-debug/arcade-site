(function () {
  'use strict';

  // ---------- 配置 ----------
  const LEVELS = {
    easy: { label: '简单', clues: 44 },
    medium: { label: '中等', clues: 36 },
    hard: { label: '困难', clues: 30 },
  };
  // 每种棋盘：宫的行数/列数、儿童版固定提示数
  const SIZES = {
    4: { br: 2, bc: 2, clues: 10 },
    6: { br: 2, bc: 3, clues: 24 },
    9: { br: 3, bc: 3, clues: 44 },
  };
  const STORAGE_KEY = 'sudoku_save_v1';
  const BEST_KEY = 'sudoku_best_v1';
  const MAX_UNDO = 250;
  const HINT_LIMIT = 3;
  const PRAISE = ['真棒！😊', '太厉害了！👏', '继续加油！💪', '你真聪明！🌟', '对啦！✨'];
  const LINE_PRAISE = ['连成一条线啦！🎉', '完成一排啦！⭐', '哇，好厉害！🥳'];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const boardEl = $('board');
  const numpadEl = $('numpad');
  const timerEl = $('timer');
  const mistakesEl = $('mistakes');
  const bestTimeEl = $('bestTime');
  const overlayEl = $('overlay');
  const modalTitleEl = $('modalTitle');
  const modalTimeEl = $('modalTime');
  const modalMetaEl = $('modalMeta');
  const modeEl = $('modeSwitch');
  const difficultyEl = $('difficulty');
  const sizeEl = $('sizeSwitch');
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
  const toastEl = $('toast');
  const confettiEl = $('confetti');

  // ---------- 状态 ----------
  let state = null;       // { mode, size, level, board, givens, notes, solution, mistakes, elapsed, won, hintsLeft }
  let selected = null;    // { r, c }
  let notesMode = false;
  let history = [];       // 撤销栈（board/notes 快照）
  let timerId = null;

  // ---------- 数独引擎（泛化 N×N）----------
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
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

  function generatePuzzle(size, br, bc, clues) {
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
      if (countSolutions(copy, br, bc, 2) === 1) {
        removed++;
      } else {
        puzzle[r][c] = backup;
      }
    }
    return { puzzle, solution };
  }

  // 儿童版：保证开局至少有一行/列/宫只空 1 格（让第一步有明确落点）
  function ensureEasyEntry(puzzle, solution, size, br, bc) {
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
    let best = null, bestEmpty = Infinity;
    for (const u of units) {
      const empties = u.filter((p) => puzzle[p[0]][p[1]] === 0);
      if (empties.length === 1) return; // 已有正好空 1 格的单元
      if (empties.length >= 2 && empties.length < bestEmpty) { bestEmpty = empties.length; best = empties; }
    }
    if (best) {
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
    const g = generatePuzzle(size, s.br, s.bc, clueCountFor(size, level));
    if (mode === 'kids') ensureEasyEntry(g.puzzle, g.solution, size, s.br, s.bc);
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
  function bestKey() { return state.size + '-' + state.level; }
  function getBest() { return readBest()[bestKey()] || null; }
  function setBest(t) {
    const all = readBest();
    all[bestKey()] = t;
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
  }

  // ---------- 持久化 ----------
  function save() {
    if (!state) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: state.mode,
      size: state.size,
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
    const N = state.size;
    const s = SIZES[N];
    const dup = new Set();
    const b = state.board;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = b[r][c];
        if (!v) continue;
        for (let i = 0; i < N; i++) {
          if (i !== c && b[r][i] === v) { dup.add(r + ',' + c); dup.add(r + ',' + i); }
          if (i !== r && b[i][c] === v) { dup.add(r + ',' + c); dup.add(i + ',' + c); }
        }
        const R = Math.floor(r / s.br) * s.br, C = Math.floor(c / s.bc) * s.bc;
        for (let rr = R; rr < R + s.br; rr++) {
          for (let cc = C; cc < C + s.bc; cc++) {
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
    const N = state.size;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (state.board[r][c] !== state.solution[r][c]) return false;
      }
    }
    return true;
  }

  function checkWin() {
    if (!isComplete()) return;
    state.won = true;
    stopTimer();
    const prev = getBest();
    if (!prev || state.elapsed < prev) setBest(state.elapsed);
    modalTitleEl.textContent = state.mode === 'kids' ? '太棒了，你赢啦！' : '解出来了！';
    if (state.mode === 'kids') burstConfetti();
    showOverlay();
    save();
  }

  // ---------- 儿童激励 ----------
  function toast(text, kind) {
    if (!text) return;
    toastEl.textContent = text;
    toastEl.className = 'toast' + (kind === 'soft' ? ' toast--soft' : '');
    toastEl.hidden = false;
    toastEl.style.animation = 'none';
    void toastEl.offsetWidth;
    toastEl.style.animation = '';
  }
  function burstConfetti() {
    const colors = ['#ff6b4a', '#ffd43b', '#22d3c5', '#4dabf7', '#f06595', '#69db7c'];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 50; i++) {
      const s = document.createElement('span');
      s.style.left = (Math.random() * 100) + '%';
      s.style.background = colors[i % colors.length];
      s.style.animation = 'confetti-fall ' + (1.8 + Math.random() * 1.4) + 's linear forwards';
      s.style.animationDelay = (Math.random() * 0.4) + 's';
      frag.appendChild(s);
    }
    confettiEl.appendChild(frag);
    setTimeout(() => { confettiEl.innerHTML = ''; }, 3400);
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function lineJustDone(r, c) {
    const N = state.size;
    const s = SIZES[N];
    let rowDone = true, colDone = true, boxDone = true;
    for (let i = 0; i < N; i++) {
      if (state.board[r][i] !== state.solution[r][i]) rowDone = false;
      if (state.board[i][c] !== state.solution[i][c]) colDone = false;
    }
    const R = Math.floor(r / s.br) * s.br, C = Math.floor(c / s.bc) * s.bc;
    for (let rr = R; rr < R + s.br; rr++) {
      for (let cc = C; cc < C + s.bc; cc++) {
        if (state.board[rr][cc] !== state.solution[rr][cc]) boxDone = false;
      }
    }
    return rowDone || colDone || boxDone;
  }

  // ---------- 输入操作 ----------
  function enterNumber(n) {
    if (!selected || !state || state.won) return;
    if (n > state.size) return;
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
      if (n !== state.solution[r][c]) {
        state.mistakes++;
        if (state.mode === 'kids') toast('再想想～🤔', 'soft');
      } else if (state.mode === 'kids') {
        toast(lineJustDone(r, c) ? pick(LINE_PRAISE) : pick(PRAISE));
        const cellEl = boardEl.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]');
        if (cellEl) {
          cellEl.classList.add('cell--pop');
          setTimeout(() => cellEl.classList.remove('cell--pop'), 450);
        }
      }
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
    const N = state.size;
    let target = null;
    if (selected && !state.givens[selected.r][selected.c] &&
        state.board[selected.r][selected.c] !== state.solution[selected.r][selected.c]) {
      target = selected;
    }
    if (!target) {
      outer:
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
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
    const N = state.size;
    let r = selected.r, c = selected.c;
    if (key === 'ArrowUp') r = (r + N - 1) % N;
    else if (key === 'ArrowDown') r = (r + 1) % N;
    else if (key === 'ArrowLeft') c = (c + N - 1) % N;
    else if (key === 'ArrowRight') c = (c + 1) % N;
    select(r, c);
  }

  // ---------- 渲染 ----------
  function modeLabel() {
    if (state.mode === 'kids') return state.size + '宫';
    return LEVELS[state.level].label;
  }

  function render() {
    if (!state) return;

    // 模式
    modeEl.querySelectorAll('.mode__btn').forEach((btn) => {
      const active = btn.dataset.mode === state.mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    // 原版显示难度，儿童版显示棋盘大小
    difficultyEl.hidden = (state.mode !== 'classic');
    sizeEl.hidden = (state.mode !== 'kids');
    if (state.mode === 'classic') {
      difficultyEl.querySelectorAll('.difficulty__btn').forEach((btn) => {
        const active = btn.dataset.level === state.level;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', String(active));
      });
    } else {
      sizeEl.querySelectorAll('.difficulty__btn').forEach((btn) => {
        const active = +btn.dataset.size === state.size;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', String(active));
      });
    }

    // 儿童卡通皮肤
    document.body.classList.toggle('kids-mode', state.mode === 'kids');

    // 统计
    timerEl.textContent = formatTime(state.elapsed);
    mistakesEl.textContent = String(state.mistakes);
    const best = getBest();
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

  function noteCols(N) { return Math.ceil(Math.sqrt(N)); }

  function renderBoard() {
    const N = state.size;
    const s = SIZES[N];

    // 网格 + 字体随格数自适应（9 宫保持原默认）
    boardEl.style.gridTemplateColumns = 'repeat(' + N + ', 1fr)';
    boardEl.style.gridTemplateRows = 'repeat(' + N + ', 1fr)';
    if (N === 9) {
      boardEl.style.removeProperty('--cell-font');
      boardEl.style.removeProperty('--cell-font-given');
      boardEl.style.removeProperty('--note-font');
    } else {
      boardEl.style.setProperty('--cell-font', (45 / N) + 'cqw');
      boardEl.style.setProperty('--cell-font-given', (48 / N) + 'cqw');
      boardEl.style.setProperty('--note-font', (16 / N) + 'cqw');
    }

    const dup = findDuplicates();
    const sel = selected;
    const selVal = sel ? state.board[sel.r][sel.c] : 0;
    let html = '';

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const value = state.board[r][c];
        const isGiven = state.givens[r][c];
        const cls = ['cell'];
        if (r % s.br === s.br - 1 && r !== N - 1) cls.push('cell--box-b');
        if (c % s.bc === s.bc - 1 && c !== N - 1) cls.push('cell--box-r');
        if (r === N - 1) cls.push('cell--last-r');
        if (c === N - 1) cls.push('cell--last-c');
        if (value && isGiven) cls.push('cell--given');
        if (value && !isGiven) cls.push('cell--user');

        const isSel = sel && sel.r === r && sel.c === c;
        const isPeer = sel && !isSel && (
          sel.r === r || sel.c === c ||
          (Math.floor(sel.r / s.br) === Math.floor(r / s.br) && Math.floor(sel.c / s.bc) === Math.floor(c / s.bc))
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
          const cols = noteCols(N);
          const rows = Math.ceil(N / cols);
          let spans = '';
          for (let n = 1; n <= N; n++) {
            const on = (state.notes[r][c] & (1 << (n - 1))) ? ' is-on' : '';
            spans += '<span class="' + on.trim() + '">' + n + '</span>';
          }
          inner = '<div class="cell__notes" style="grid-template-columns:repeat(' + cols + ',1fr);grid-template-rows:repeat(' + rows + ',1fr)">' + spans + '</div>';
        }

        html += '<div class="' + cls.join(' ') + '" data-r="' + r + '" data-c="' + c +
          '" role="gridcell" aria-label="' + (r + 1) + ' 行 ' + (c + 1) + ' 列">' + inner + '</div>';
      }
    }
    boardEl.innerHTML = html;
  }

  function buildNumpad(N) {
    let html = '';
    for (let n = 1; n <= N; n++) {
      html += '<button class="numpad__btn" type="button" data-n="' + n + '" aria-label="填入 ' + n + '">' +
        '<span class="numpad__num">' + n + '</span>' +
        '<span class="numpad__rem">0</span></button>';
    }
    numpadEl.innerHTML = html;
    numpadEl.style.gridTemplateColumns = 'repeat(' + N + ', 1fr)';
  }

  function renderNumpad() {
    const N = state.size;
    const counts = Array(N).fill(0);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = state.board[r][c];
        if (v) counts[v - 1]++;
      }
    }
    numpadEl.querySelectorAll('.numpad__btn').forEach((btn) => {
      const n = +btn.dataset.n;
      const rem = N - counts[n - 1];
      btn.querySelector('.numpad__rem').textContent = String(rem);
      btn.classList.toggle('is-done', rem === 0);
    });
  }

  function showOverlay() {
    modalTimeEl.textContent = formatTime(state.elapsed);
    modalMetaEl.textContent = modeLabel() + ' · ' + state.mistakes + ' 失误';
    overlayEl.hidden = false;
  }

  // ---------- 新游戏 / 初始化 ----------
  function newGame(mode, size, level) {
    state = makeGame(mode, size, level);
    history = [];
    selected = null;
    notesMode = false;
    overlayEl.hidden = true;
    resumeOverlayEl.hidden = true;
    buildNumpad(state.size);
    stopTimer();
    startTimer();
    render();
    save();
  }

  function switchMode(m) {
    newGame(m, m === 'kids' ? 4 : 9, 'easy');
  }

  function switchSize(size) {
    newGame('kids', size, 'easy');
  }

  function switchLevel(level) {
    newGame('classic', 9, level);
  }

  function init() {
    const saved = load();
    if (saved && !saved.won) {
      state = saved;
      if (typeof state.hintsLeft !== 'number') state.hintsLeft = HINT_LIMIT;
      if (typeof state.size !== 'number') state.size = 9;
      if (typeof state.level !== 'string') state.level = 'easy';
      if (state.mode !== 'kids') state.mode = 'classic';
      history = [];
      selected = null;
      notesMode = false;
      buildNumpad(state.size);
      render();
      showResume();
    } else {
      newGame('classic', 9, 'easy');
    }
  }

  function showResume() {
    resumeMetaEl.textContent = modeLabel() + ' · 用时 ' + formatTime(state.elapsed);
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

  modeEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode__btn');
    if (!btn) return;
    switchMode(btn.dataset.mode);
  });

  difficultyEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.difficulty__btn');
    if (!btn) return;
    switchLevel(btn.dataset.level);
  });

  sizeEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.difficulty__btn');
    if (!btn) return;
    switchSize(+btn.dataset.size);
  });

  btnNotes.addEventListener('click', () => {
    notesMode = !notesMode;
    btnNotes.classList.toggle('is-active', notesMode);
    btnNotes.setAttribute('aria-pressed', String(notesMode));
  });

  btnUndo.addEventListener('click', undo);
  btnErase.addEventListener('click', erase);
  btnHint.addEventListener('click', hint);
  btnNewTop.addEventListener('click', () => newGame(state.mode, state.size, state.level));
  btnPlayAgain.addEventListener('click', () => newGame(state.mode, state.size, state.level));

  btnResumeContinue.addEventListener('click', () => {
    resumeOverlayEl.hidden = true;
    startTimer();
    render();
  });

  btnResumeNew.addEventListener('click', () => {
    resumeOverlayEl.hidden = true;
    newGame(state.mode, state.size, state.level);
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
