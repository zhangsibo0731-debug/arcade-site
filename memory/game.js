(function () {
  'use strict';

  const EMOJIS = ['🍎', '🍌', '🍇', '🍊', '🍓', '🐶', '🐱', '🐰', '🦊', '🐻'];
  const BEST_KEY = 'memory_best_v1';
  const COLS = { 4: 4, 6: 4, 8: 4, 10: 5 };

  const $ = (id) => document.getElementById(id);
  const boardEl = $('board');
  const difficultyEl = $('difficulty');
  const movesEl = $('moves');
  const timeEl = $('time');
  const bestEl = $('best');
  const overlayEl = $('overlay');
  const ovTitle = $('ovTitle');
  const ovSub = $('ovSub');
  const ovBtn = $('ovBtn');
  const btnNew = $('btnNew');
  const confettiEl = $('confetti');

  // ---------- 状态 ----------
  let pairs = 6;
  let cards = [];       // { id, emoji, matched, el }
  let first = null;
  let lock = false;
  let moves = 0;
  let elapsed = 0;
  let timerId = null;
  let won = false;

  // ---------- 工具 ----------
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function formatTime(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }
  function readBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { return {}; }
  }
  function getBest(p) { return readBest()[p] || null; }
  function setBest(p, m) {
    const all = readBest();
    all[p] = m;
    try { localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch (e) {}
  }

  function startTimer() {
    if (timerId) return;
    timerId = setInterval(() => { elapsed++; timeEl.textContent = formatTime(elapsed); }, 1000);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function burstConfetti() {
    const colors = ['#ff6b4a', '#ffd43b', '#22d3c5', '#4dabf7', '#f06595', '#69db7c'];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 50; i++) {
      const s = document.createElement('span');
      s.style.left = (Math.random() * 100) + '%';
      s.style.background = colors[i % colors.length];
      s.style.animation = 'confetti-fall ' + (1.6 + Math.random() * 1.4) + 's linear forwards';
      s.style.animationDelay = (Math.random() * 0.4) + 's';
      frag.appendChild(s);
    }
    confettiEl.appendChild(frag);
    setTimeout(() => { confettiEl.innerHTML = ''; }, 3400);
  }

  // ---------- 游戏 ----------
  function newGame(p) {
    pairs = p || pairs;
    const set = EMOJIS.slice(0, pairs);
    const deck = [];
    for (const e of set) { deck.push(e, e); }
    shuffle(deck);
    cards = deck.map((e, i) => ({ id: i, emoji: e, matched: false, el: null }));
    first = null;
    lock = false;
    moves = 0;
    elapsed = 0;
    won = false;
    stopTimer();
    overlayEl.hidden = true;
    renderBoard();
    updateHud();
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = 'repeat(' + COLS[pairs] + ', 1fr)';
    for (const c of cards) {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML =
        '<div class="card__inner">' +
        '<div class="card__face card__face--down"></div>' +
        '<div class="card__face card__face--up">' + c.emoji + '</div>' +
        '</div>';
      el.addEventListener('click', () => flip(c));
      boardEl.appendChild(el);
      c.el = el;
    }
  }

  function flip(c) {
    if (lock || c.matched || c === first || won) return;
    c.el.classList.add('flipped');
    if (!first) {
      first = c;
      startTimer();
      return;
    }
    moves++;
    updateHud();
    if (first.emoji === c.emoji) {
      first.matched = true;
      c.matched = true;
      c.el.classList.add('matched');
      first.el.classList.add('matched');
      first = null;
      checkWin();
    } else {
      lock = true;
      const a = first, b = c;
      setTimeout(() => {
        a.el.classList.remove('flipped');
        b.el.classList.remove('flipped');
        first = null;
        lock = false;
      }, 800);
    }
  }

  function checkWin() {
    if (!cards.every((c) => c.matched)) return;
    won = true;
    stopTimer();
    const prev = getBest(pairs);
    if (!prev || moves < prev) setBest(pairs, moves);
    burstConfetti();
    ovTitle.textContent = '全配对啦！';
    ovSub.textContent = '用了 ' + moves + ' 步 · 用时 ' + formatTime(elapsed);
    ovBtn.textContent = '再来一局';
    overlayEl.hidden = false;
    updateHud();
  }

  function updateHud() {
    movesEl.textContent = moves;
    timeEl.textContent = formatTime(elapsed);
    const b = getBest(pairs);
    bestEl.textContent = b ? b + ' 步' : '--';
    difficultyEl.querySelectorAll('.difficulty__btn').forEach((btn) => {
      const active = +btn.dataset.pairs === pairs;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
  }

  // ---------- 事件 ----------
  difficultyEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.difficulty__btn');
    if (!btn) return;
    newGame(+btn.dataset.pairs);
  });

  btnNew.addEventListener('click', () => newGame(pairs));
  ovBtn.addEventListener('click', () => newGame(pairs));

  // ---------- 启动 ----------
  newGame(6);
})();
