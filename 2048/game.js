(function () {
  'use strict';

  const SIZE = 4;
  const BEST_KEY = 'g2048_best_v1';
  const WIN_VALUE = 2048;

  const $ = (id) => document.getElementById(id);
  const boardEl = $('board');
  const scoreEl = $('score');
  const bestEl = $('best');
  const overlayEl = $('overlay');
  const ovTitle = $('ovTitle');
  const ovSub = $('ovSub');
  const ovBtn = $('ovBtn');
  const btnNew = $('btnNew');
  const btnUndo = $('btnUndo');

  // ---------- 状态 ----------
  let grid;          // SIZE×SIZE，元素为 {id,value,row,col,el,merged,spawned} 或 null
  let score = 0;
  let best = readBest();
  let over = false;
  let won = false;
  let keepPlaying = false;
  let prev = null;   // {grid: 二维 value 数组, score}
  let nextId = 1;
  let removing = []; // 待移除（被合并掉）的 tile
  let CELL = 60, GAP = 10;

  // ---------- 工具 ----------
  function readBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function saveBest() {
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
    }
  }

  // ---------- 尺寸 ----------
  function resize() {
    const w = boardEl.clientWidth || 360;
    GAP = Math.max(6, Math.round(w * 0.03));
    CELL = Math.round((w - 5 * GAP) / 4);
    boardEl.style.setProperty('--gap', GAP + 'px');
    boardEl.style.setProperty('--cell', CELL + 'px');
    // 重新摆放所有 tile
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const t = grid && grid[r][c];
        if (t && t.el) positionTile(t.el, t.row, t.col);
      }
    }
  }

  function positionTile(el, r, c) {
    el.style.left = (GAP + c * (CELL + GAP)) + 'px';
    el.style.top = (GAP + r * (CELL + GAP)) + 'px';
  }

  function tileFontSize(value) {
    const digits = String(value).length;
    if (digits <= 2) return Math.round(CELL * 0.44);
    if (digits === 3) return Math.round(CELL * 0.34);
    if (digits === 4) return Math.round(CELL * 0.27);
    return Math.round(CELL * 0.22);
  }

  // ---------- 逻辑 ----------
  function emptyCells() {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) cells.push([r, c]);
      }
    }
    return cells;
  }

  function addRandomTile() {
    const cells = emptyCells();
    if (!cells.length) return;
    const p = cells[Math.floor(Math.random() * cells.length)];
    grid[p[0]][p[1]] = { id: nextId++, value: Math.random() < 0.9 ? 2 : 4, row: p[0], col: p[1], el: null, merged: false, spawned: true };
  }

  function lineCells(direction) {
    const lines = [];
    if (direction === 'left') {
      for (let r = 0; r < SIZE; r++) { const l = []; for (let c = 0; c < SIZE; c++) l.push({ r, c }); lines.push(l); }
    } else if (direction === 'right') {
      for (let r = 0; r < SIZE; r++) { const l = []; for (let c = SIZE - 1; c >= 0; c--) l.push({ r, c }); lines.push(l); }
    } else if (direction === 'up') {
      for (let c = 0; c < SIZE; c++) { const l = []; for (let r = 0; r < SIZE; r++) l.push({ r, c }); lines.push(l); }
    } else {
      for (let c = 0; c < SIZE; c++) { const l = []; for (let r = SIZE - 1; r >= 0; r--) l.push({ r, c }); lines.push(l); }
    }
    return lines;
  }

  function move(direction) {
    if (over) return false;
    // 撤销快照
    prev = { grid: grid.map((row) => row.map((t) => (t ? t.value : 0))), score: score };

    let moved = false;
    let gained = 0;
    const dead = [];

    for (const cells of lineCells(direction)) {
      const tiles = cells.map((p) => grid[p.r][p.c]).filter(Boolean);
      const result = [];
      for (let i = 0; i < tiles.length; i++) {
        const a = tiles[i];
        if (i + 1 < tiles.length && tiles[i + 1].value === a.value) {
          const b = tiles[i + 1];
          a.value *= 2;
          gained += a.value;
          a.merged = true;
          dead.push(b);
          result.push(a);
          moved = true;
          i++;
        } else {
          result.push(a);
        }
      }
      for (let k = 0; k < cells.length; k++) {
        const p = cells[k];
        if (k < result.length) {
          const t = result[k];
          if (t.row !== p.r || t.col !== p.c) moved = true;
          t.row = p.r;
          t.col = p.c;
          grid[p.r][p.c] = t;
        } else {
          grid[p.r][p.c] = null;
        }
      }
    }

    if (!moved) { prev = null; return false; }

    score += gained;
    removing = dead;
    addRandomTile();
    saveBest();
    render();
    checkState();
    return true;
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) return true;
        const v = grid[r][c].value;
        if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].value === v) return true;
        if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].value === v) return true;
      }
    }
    return false;
  }

  function checkState() {
    if (!won && !keepPlaying) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (grid[r][c] && grid[r][c].value >= WIN_VALUE) {
            won = true;
            showOverlay('win');
            return;
          }
        }
      }
    }
    if (!canMove()) {
      over = true;
      showOverlay('lose');
    }
  }

  function undo() {
    if (!prev || over) return;
    const values = prev.grid;
    // 移除当前所有 tile 的 DOM
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const t = grid[r][c];
        if (t && t.el) { t.el.remove(); t.el = null; }
      }
    }
    // 重建 grid（新 tile 对象，无动画）
    const newGrid = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      for (let c = 0; c < SIZE; c++) {
        const v = values[r][c];
        row.push(v ? { id: nextId++, value: v, row: r, col: c, el: null, merged: false, spawned: false } : null);
      }
      newGrid.push(row);
    }
    grid = newGrid;
    score = prev.score;
    prev = null;
    removing = [];
    over = false;
    won = false;
    keepPlaying = false;
    overlayEl.hidden = true;
    render();
  }

  // ---------- 渲染 ----------
  function render() {
    // 移除被合并掉的 tile
    for (const t of removing) {
      if (t.el) {
        t.el.classList.add('tile--gone');
        const el = t.el;
        setTimeout(() => { el.remove(); }, 140);
        t.el = null;
      }
    }
    removing = [];

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const t = grid[r][c];
        if (!t) continue;
        if (!t.el) {
          t.el = document.createElement('div');
          boardEl.appendChild(t.el);
        }
        t.el.className = 'tile ' + (t.value > 2048 ? 'tile-super' : 'tile-' + t.value);
        if (t.spawned) t.el.classList.add('tile--spawn');
        if (t.merged) t.el.classList.add('tile--merge');
        t.el.textContent = t.value;
        t.el.style.fontSize = tileFontSize(t.value) + 'px';
        positionTile(t.el, t.row, t.col);
      }
    }

    // 清除本次动画标记（下个动画周期后）
    setTimeout(() => {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const t = grid[r][c];
          if (t) { t.spawned = false; t.merged = false; if (t.el) t.el.classList.remove('tile--spawn', 'tile--merge'); }
        }
      }
    }, 200);

    scoreEl.textContent = score;
    bestEl.textContent = best;
  }

  function showOverlay(kind) {
    if (kind === 'win') {
      ovTitle.textContent = '你赢了！';
      ovSub.textContent = '成功凑出 2048 · 得分 ' + score;
      ovBtn.textContent = '继续挑战';
    } else {
      ovTitle.textContent = '游戏结束';
      ovSub.textContent = '本局得分 ' + score + (score >= best && score > 0 ? ' · 新纪录！' : '');
      ovBtn.textContent = '再来一局';
    }
    overlayEl.hidden = false;
  }

  function newGame() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    score = 0;
    over = false;
    won = false;
    keepPlaying = false;
    prev = null;
    removing = [];
    overlayEl.hidden = true;
    // 清空旧 tile DOM
    boardEl.querySelectorAll('.tile').forEach((el) => el.remove());
    addRandomTile();
    addRandomTile();
    render();
  }

  // ---------- 事件 ----------
  function handleKey(dir) {
    if (dir) move(dir);
  }

  document.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); move('left'); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); move('right'); }
    else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); move('up'); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); move('down'); }
  });

  let touchStart = null;
  boardEl.addEventListener('pointerdown', (e) => {
    touchStart = { x: e.clientX, y: e.clientY };
  });
  boardEl.addEventListener('pointerup', (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  });

  btnNew.addEventListener('click', newGame);
  btnUndo.addEventListener('click', undo);
  ovBtn.addEventListener('click', () => {
    if (won && !keepPlaying) {
      keepPlaying = true;
      overlayEl.hidden = true;
    } else {
      newGame();
    }
  });

  window.addEventListener('resize', resize);

  // ---------- 启动 ----------
  bestEl.textContent = best;
  resize();
  newGame();
})();
