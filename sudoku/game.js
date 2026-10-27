(function () {
  'use strict';

  // ---------- 配置 ----------
  const rules = window.SudokuRules.create();
  const { LEVELS, SIZES } = rules;
  const STORAGE_KEY = 'sudoku_save_v1';
  const BEST_KEY = 'sudoku_best_v1';
  const session = window.SudokuSession.create(rules);
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
  const btnResumeOther = $('btnResumeOther');
  const toastEl = $('toast');
  const confettiEl = $('confetti');

  // ---------- 状态 ----------
  let state = null;       // { mode, size, level, board, givens, notes, solution, mistakes, elapsed, won, hintsLeft }
  let selected = null;    // { r, c }
  let notesMode = false;
  let invalidSave = null;
  let resumeImport = false;
  let resumeAlternative = null;
  let resumeSource = '';
  function syncSession() { const v = session.view(); state = v.state; selected = v.selected; notesMode = v.notesMode; }
  function setNotes(value) { session.setNotes(value); syncSession(); }
  let timerId = null;

  // Shared engine: no platform-specific copy of the generator.
  const { shuffle, findEmpty, isValidPlacement, solveGrid, countSolutions, lastEmptySolvable, generatePuzzle, buildUnits, ensureEasyEntry, clueCountFor, makeGame } = rules;

  // ---------- 计时 ----------
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }
  function startTimer() {
    if (timerId) return;
    session.resume();
    timerId = setInterval(tick, 1000);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }
  function tick() {
    if (!state || state.won) return;
    session.tick(1000); syncSession();
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
    if (!state || invalidSave !== null) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({
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
    })); } catch (_) { toast('暂时无法保存，请检查存储空间', 'soft'); }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      invalidSave = raw;
      const d = window.SudokuState.normalize(JSON.parse(raw), rules);
      if (!d) return null;
      invalidSave = null;
      return d;
    } catch (e) { return null; }
  }

  // Shared commands and validation; DOM is a presentation adapter only.
  function findDuplicates() { return session.duplicates(); }
  function isComplete() { return session.complete(); }
  function applyCommand(command) {
    if (!command()) return;
    syncSession(); render(); save();
    session.drainEvents().forEach(event => {
      if (event.type === 'entered' && state.mode === 'kids') {
        toast(event.correct ? pick(event.lineDone ? LINE_PRAISE : PRAISE) : '再想想～🤔', event.correct ? '' : 'soft');
        if (event.correct) {
          const el = boardEl.querySelector('.cell[data-r="' + event.r + '"][data-c="' + event.c + '"]');
          if (el) { el.classList.add('cell--pop'); setTimeout(() => el.classList.remove('cell--pop'), 450); }
        }
      }
      if (event.type === 'won') checkWin();
    });
  }
  function undo() { applyCommand(session.undo); }

  function checkWin() {
    if (!state.won) return;
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

  function lineJustDone(r, c) { return session.lineDone(r, c); }
  function enterNumber(n) { applyCommand(() => session.enter(n)); }
  function erase() { applyCommand(session.erase); }
  function hint() { applyCommand(session.hint); }
  function select(r, c) { session.select(r, c); syncSession(); render(); }

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
  function newGame(mode, size, level, preserveInvalid) {
    if (invalidSave !== null && !preserveInvalid) {
      try { localStorage.setItem(STORAGE_KEY + '_invalid_backup', invalidSave); invalidSave = null; }
      catch (_) { toast('无法备份原存档，请检查存储空间', 'soft'); return; }
    }
    session.start(mode, size, level);
    resumeImport = false;
    resumeAlternative = null;
    syncSession();
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

  function filledCount(saved) {
    return saved.board.reduce((count, row, r) => count + row.filter((n, c) => n && !saved.givens[r][c]).length, 0);
  }
  function hasProgress(saved) { return filledCount(saved) > 0 || saved.notes.some(row => row.some(Boolean)); }
  function readCanvasSave() {
    try { return window.SudokuState.normalize(JSON.parse(localStorage.getItem('sudoku_canvas_save_v1')), rules); }
    catch (_) { return null; }
  }
  function prepareResume(saved, source, alternative) {
    session.restore(saved);
    syncSession();
    resumeImport = source === 'canvas';
    resumeSource = resumeImport ? '试用界面进度' : '原版进度';
    resumeAlternative = alternative;
    buildNumpad(state.size);
    render();
    showResume();
  }
  function continueResume() {
    // The experimental Canvas entry deliberately has its own save. Import
    // only after an explicit Continue; preserve both original records.
    if (resumeImport) {
      try {
        const original = localStorage.getItem(STORAGE_KEY);
        if (original !== null) localStorage.setItem(STORAGE_KEY + '_before_canvas_import', original);
        if (invalidSave !== null) localStorage.setItem(STORAGE_KEY + '_invalid_backup', invalidSave);
      } catch (_) { toast('无法备份原版进度，暂未切换存档', 'soft'); return; }
      invalidSave = null;
      resumeImport = false;
    }
    resumeOverlayEl.hidden = true;
    startTimer();
    render();
    save();
  }
  function init() {
    const saved = load(), canvas = readCanvasSave();
    const other = canvas && !canvas.won && hasProgress(canvas) && (!saved || JSON.stringify([canvas.board, canvas.notes, canvas.solution]) !== JSON.stringify([saved.board, saved.notes, saved.solution])) ? canvas : null;
    if (other && (!saved || saved.won || !hasProgress(saved))) {
      prepareResume(other, 'canvas', saved && !saved.won ? {state: saved, source: 'legacy'} : null);
    } else if (saved && !saved.won) {
      prepareResume(saved, 'legacy', other ? {state: other, source: 'canvas'} : null);
    } else {
      newGame('classic', 9, 'easy', true);
      if (invalidSave !== null) toast('旧存档无法恢复，已保留；点击新局后才保存新题', 'soft');
    }
  }

  function showResume() {
    resumeMetaEl.textContent = (resumeImport || resumeAlternative ? resumeSource + ' · ' : '') + modeLabel() + ' · 已填 ' + filledCount(state) + ' 格 · 用时 ' + formatTime(state.elapsed);
    btnResumeContinue.textContent = resumeImport ? '继续已填写的进度' : '继续上次';
    btnResumeOther.hidden = !resumeAlternative;
    if (resumeAlternative) btnResumeOther.textContent = '继续' + (resumeAlternative.source === 'canvas' ? '试用界面' : '原版') + '进度（已填 ' + filledCount(resumeAlternative.state) + ' 格）';
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
    setNotes(!notesMode);
    btnNotes.classList.toggle('is-active', notesMode);
    btnNotes.setAttribute('aria-pressed', String(notesMode));
  });

  btnUndo.addEventListener('click', undo);
  btnErase.addEventListener('click', erase);
  btnHint.addEventListener('click', hint);
  btnNewTop.addEventListener('click', () => newGame(state.mode, state.size, state.level));
  btnPlayAgain.addEventListener('click', () => newGame(state.mode, state.size, state.level));

  btnResumeContinue.addEventListener('click', continueResume);
  btnResumeOther.addEventListener('click', () => {
    if (!resumeAlternative) return;
    const candidate = resumeAlternative;
    prepareResume(candidate.state, candidate.source, null);
    continueResume();
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
      setNotes(!notesMode);
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
