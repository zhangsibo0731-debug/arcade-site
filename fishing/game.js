(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('scene');
  const ctx = canvas.getContext('2d');
  const stage = $('stage');
  const overlay = $('overlay');
  const modalEyebrow = $('modalEyebrow');
  const modalTitle = $('modalTitle');
  const modalText = $('modalText');
  const modalBtn = $('modalBtn');
  const modalBack = $('modalBack');
  const actionBtn = $('actionBtn');
  const actionHint = $('actionHint');
  const powerWrap = $('powerWrap');
  const powerFill = $('powerFill');
  const catchGame = $('catchGame');
  const catchTrack = $('catchTrack');
  const fishMarker = $('fishMarker');
  const catchZone = $('catchZone');
  const progressFill = $('progressFill');
  const notice = $('notice');
  const noticeTitle = $('noticeTitle');
  const noticeSub = $('noticeSub');
  const soundBtn = $('soundBtn');
  const pauseBtn = $('pauseBtn');
  const totalCaughtEl = $('totalCaught');
  const bestWeightEl = $('bestWeight');
  const streakEl = $('streak');
  const bestStreakEl = $('bestStreak');

  const TOTAL_KEY = 'fishing_total_v1';
  const WEIGHT_KEY = 'fishing_best_weight_v1';
  const STREAK_KEY = 'fishing_best_streak_v1';
  const MUTE_KEY = 'fishing_muted_v1';
  const FISH = [
    { id: 'crucian', name: '小鲫鱼', icon: '🐟', rarity: '常见', color: '#8fd3c7', min: 220, max: 760, behavior: 'calm', difficulty: .72 },
    { id: 'perch', name: '河鲈', icon: '🐠', rarity: '少见', color: '#ffd06b', min: 420, max: 1380, behavior: 'active', difficulty: 1 },
    { id: 'moon', name: '月光鱼', icon: '🐡', rarity: '稀有', color: '#b7a8ff', min: 680, max: 2180, behavior: 'dash', difficulty: 1.18 },
  ];

  let mode = 'menu';
  let beforePause = 'ready';
  let lastTime = 0;
  let held = false;
  let power = 0;
  let powerDir = 1;
  let castDistance = .55;
  let castTime = 0;
  let waitLeft = 0;
  let biteLeft = 0;
  let fish = null;
  let fishY = .5;
  let fishTarget = .5;
  let fishMoveLeft = 0;
  let fishWarning = 0;
  let dashPending = false;
  let zoneY = .22;
  let zoneV = 0;
  let catchProgress = .24;
  let totalCaught = readInt(TOTAL_KEY);
  let bestWeight = readInt(WEIGHT_KEY);
  let streak = 0;
  let bestStreak = readInt(STREAK_KEY);
  let muted = readInt(MUTE_KEY) === 1;
  let audioCtx = null;
  let ripple = 0;
  let caughtFlash = 0;
  let finishLeft = 0;

  function readInt(key) {
    try { return parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { return 0; }
  }

  function saveStats() {
    try {
      localStorage.setItem(TOTAL_KEY, String(totalCaught));
      localStorage.setItem(WEIGHT_KEY, String(bestWeight));
      localStorage.setItem(STREAK_KEY, String(bestStreak));
    } catch (e) {}
  }

  function updateHud() {
    totalCaughtEl.textContent = String(totalCaught);
    bestWeightEl.textContent = bestWeight ? formatWeight(bestWeight) : '--';
    streakEl.textContent = String(streak);
    bestStreakEl.textContent = String(bestStreak);
  }

  function formatWeight(grams) {
    return grams >= 1000 ? (grams / 1000).toFixed(2) + ' kg' : grams + ' g';
  }

  function setMode(next) {
    mode = next;
    held = false;
    actionBtn.classList.remove('is-held');
    overlay.hidden = true;
    notice.hidden = true;
    catchGame.hidden = next !== 'fishing' && next !== 'finishing';
    powerWrap.hidden = next !== 'casting';
    pauseBtn.hidden = !['ready', 'casting', 'waiting', 'bite', 'fishing'].includes(next);
    actionBtn.disabled = next === 'waiting';

    if (next === 'ready') {
      actionBtn.textContent = '按住蓄力';
      actionHint.textContent = '按住按钮蓄力，松开抛竿';
    } else if (next === 'casting') {
      actionBtn.textContent = '松开抛竿';
      actionHint.textContent = '越接近右端，抛得越远';
    } else if (next === 'waiting') {
      actionBtn.textContent = '等待鱼儿…';
      actionHint.textContent = '看好浮标，咬钩时立即提竿';
    } else if (next === 'bite') {
      actionBtn.disabled = false;
      actionBtn.textContent = '立即提竿！';
      actionHint.textContent = '鱼咬钩了，别让它跑掉';
      notice.hidden = false;
    } else if (next === 'fishing') {
      actionBtn.disabled = false;
      actionBtn.textContent = '按住向上';
      actionHint.textContent = '按住上升 · 松开下沉 · 让鱼留在捕获区';
    }
  }

  function startSession() {
    overlay.hidden = true;
    modalBack.hidden = true;
    setMode('ready');
    play('start');
  }

  function beginCast() {
    if (mode !== 'ready') return;
    power = 0;
    powerDir = 1;
    held = true;
    setMode('casting');
    held = true;
    actionBtn.classList.add('is-held');
  }

  function releaseCast() {
    if (mode !== 'casting') return;
    held = false;
    actionBtn.classList.remove('is-held');
    castDistance = .3 + power * .62;
    castTime = .72;
    waitLeft = 1.15 + Math.random() * 1.75;
    ripple = 0;
    setMode('waiting');
    play('cast');
    vibrate(10);
  }

  function beginBite() {
    biteLeft = 1.35;
    noticeTitle.textContent = '鱼咬钩了！';
    noticeSub.textContent = '快提竿';
    notice.hidden = false;
    setMode('bite');
    notice.hidden = false;
    play('bite');
    vibrate([20, 35, 35]);
  }

  function chooseFish() {
    const r = Math.random();
    const rareBoost = Math.max(0, castDistance - .55) * .32;
    if (r < .1 + rareBoost) return FISH[2];
    if (r < .43 + rareBoost) return FISH[1];
    return FISH[0];
  }

  function hookFish() {
    if (mode !== 'bite') return;
    fish = chooseFish();
    fishMarker.querySelector('span').textContent = fish.icon;
    fishY = .5;
    fishTarget = .5;
    fishMoveLeft = .45;
    fishWarning = 0;
    dashPending = false;
    zoneY = .2;
    zoneV = 0;
    catchProgress = fish.id === 'crucian' && totalCaught === 0 ? .38 : .25;
    setMode('fishing');
    play('hook');
    vibrate(22);
  }

  function missBite() {
    streak = 0;
    updateHud();
    showResult(false, '反应慢了一点', '鱼儿吃掉鱼饵，溜走了。');
  }

  function updateFish(dt) {
    fishMoveLeft -= dt;
    fishWarning = Math.max(0, fishWarning - dt);
    if (fishMoveLeft <= 0) {
      if (fish.behavior === 'calm') {
        fishTarget = .16 + Math.random() * .68;
        fishMoveLeft = .75 + Math.random() * .75;
      } else if (fish.behavior === 'active') {
        fishTarget = .08 + Math.random() * .84;
        fishMoveLeft = .32 + Math.random() * .48;
      } else if (!dashPending) {
        fishWarning = .34;
        fishMoveLeft = .34;
        fishTarget = fishY;
        dashPending = true;
      } else {
        fishTarget = fishY > .5 ? .08 + Math.random() * .18 : .74 + Math.random() * .2;
        fishMoveLeft = .42 + Math.random() * .28;
        dashPending = false;
      }
    }
    const speed = (fish.behavior === 'calm' ? .62 : fish.behavior === 'active' ? 1.1 : 1.3) * fish.difficulty;
    fishY += (fishTarget - fishY) * Math.min(1, dt * speed * 3.2);
    fishY += Math.sin(performance.now() / 180) * dt * .018;
    fishY = Math.max(.04, Math.min(.96, fishY));
    fishMarker.classList.toggle('is-warning', fishWarning > 0);
  }

  function updateFishing(dt) {
    updateFish(dt);
    const accel = held ? 2.12 : -1.48;
    zoneV += accel * dt;
    zoneV *= Math.pow(.28, dt);
    zoneV = Math.max(-.88, Math.min(.84, zoneV));
    zoneY += zoneV * dt;
    const zoneHalf = fish.id === 'crucian' && totalCaught === 0 ? .19 : .16;
    if (zoneY < zoneHalf) { zoneY = zoneHalf; zoneV = Math.abs(zoneV) * .22; }
    if (zoneY > 1 - zoneHalf) { zoneY = 1 - zoneHalf; zoneV = -Math.abs(zoneV) * .28; }
    const inside = Math.abs(fishY - zoneY) <= zoneHalf;
    catchZone.classList.toggle('is-catching', inside);
    catchProgress += dt * (inside ? .27 / fish.difficulty : -.105 * fish.difficulty);
    catchProgress = Math.max(0, Math.min(1, catchProgress));
    if (catchProgress >= 1) beginCatchFinish();
    else if (catchProgress <= 0) loseFish();
  }

  function beginCatchFinish() {
    catchProgress = 1;
    finishLeft = .38;
    mode = 'finishing';
    held = false;
    actionBtn.classList.remove('is-held');
    actionBtn.disabled = true;
    actionBtn.textContent = '收线中…';
    actionHint.textContent = '捕获进度已满！';
    progressFill.style.transition = 'none';
    progressFill.style.width = '100%';
    void progressFill.offsetWidth;
    progressFill.style.removeProperty('transition');
  }

  function catchFish() {
    const weight = Math.round(fish.min + Math.random() * (fish.max - fish.min));
    const isRecord = weight > bestWeight;
    totalCaught++;
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    bestWeight = Math.max(bestWeight, weight);
    saveStats();
    updateHud();
    caughtFlash = 1;
    play(fish.id === 'moon' ? 'rare' : 'success');
    vibrate([24, 40, 55]);
    showResult(true, fish.icon + ' 钓到了！', fish.name + ' · ' + fish.rarity + '\n' + formatWeight(weight) + (isRecord ? '\n🏆 新重量纪录！' : ''));
  }

  function loseFish() {
    streak = 0;
    updateHud();
    play('lose');
    vibrate(35);
    showResult(false, '鱼儿脱钩了', '这条' + fish.name + '很有力气。\n调整节奏，再试一次吧。');
  }

  function showResult(success, title, text) {
    setMode('result');
    overlay.hidden = false;
    modalEyebrow.textContent = success ? '本次收获' : '差一点点';
    modalTitle.textContent = title;
    modalText.textContent = text;
    modalBtn.textContent = '再钓一竿';
    modalBack.hidden = false;
  }

  function showPause() {
    if (!['ready', 'casting', 'waiting', 'bite', 'fishing'].includes(mode)) return;
    beforePause = mode === 'casting' ? 'ready' : mode;
    held = false;
    mode = 'paused';
    overlay.hidden = false;
    modalEyebrow.textContent = '湖面仍在等你';
    modalTitle.textContent = '已暂停';
    modalText.textContent = '休息一下，准备好再继续。';
    modalBtn.textContent = '继续钓鱼';
    modalBack.hidden = false;
  }

  function resume() {
    overlay.hidden = true;
    setMode(beforePause);
  }

  function pressStart(event) {
    if (event) event.preventDefault();
    if (mode === 'ready') beginCast();
    else if (mode === 'bite') hookFish();
    else if (mode === 'fishing') {
      held = true;
      actionBtn.classList.add('is-held');
    }
  }

  function pressEnd(event) {
    if (event) event.preventDefault();
    if (mode === 'casting') releaseCast();
    else if (mode === 'fishing') {
      held = false;
      actionBtn.classList.remove('is-held');
    }
  }

  function update(dt) {
    if (mode === 'casting') {
      power += powerDir * dt * .82;
      if (power >= 1) { power = 1; powerDir = -1; }
      if (power <= 0) { power = 0; powerDir = 1; }
      powerFill.style.width = Math.round(power * 100) + '%';
    } else if (mode === 'waiting') {
      castTime = Math.max(0, castTime - dt);
      ripple += dt;
      waitLeft -= dt;
      if (waitLeft <= 0) beginBite();
    } else if (mode === 'bite') {
      ripple += dt * 5;
      biteLeft -= dt;
      if (biteLeft <= 0) missBite();
    } else if (mode === 'fishing') {
      updateFishing(dt);
    } else if (mode === 'finishing') {
      finishLeft -= dt;
      if (finishLeft <= 0) catchFish();
    }
    caughtFlash = Math.max(0, caughtFlash - dt * 1.4);
  }

  function renderCatchGame() {
    if (mode !== 'fishing' && mode !== 'finishing') return;
    const height = catchTrack.clientHeight;
    const zonePx = Math.max(72, Math.min(96, height * (fish.id === 'crucian' && totalCaught === 0 ? .38 : .32)));
    catchZone.style.height = zonePx + 'px';
    catchZone.style.bottom = 'calc(' + Math.round(zoneY * 100) + '% - ' + Math.round(zonePx / 2) + 'px)';
    fishMarker.style.bottom = 'calc(' + Math.round(fishY * 100) + '% - 17px)';
    progressFill.style.width = Math.round(catchProgress * 100) + '%';
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawScene(time) {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const lakeY = h * .48;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#142449');
    grad.addColorStop(.48, '#283f66');
    grad.addColorStop(.49, '#1c5270');
    grad.addColorStop(1, '#0e2c4a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,239,183,.92)';
    ctx.beginPath(); ctx.arc(w * .72, h * .17, Math.min(w, h) * .075, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a2d51';
    ctx.beginPath(); ctx.arc(w * .748, h * .145, Math.min(w, h) * .072, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 26; i++) {
      const x = ((i * 83) % 997) / 997 * w;
      const y = ((i * 47) % 211) / 211 * lakeY * .75;
      const twinkle = .35 + .5 * Math.abs(Math.sin(time / 900 + i));
      ctx.fillStyle = 'rgba(255,244,205,' + twinkle + ')';
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }

    ctx.fillStyle = '#0d1b32';
    ctx.beginPath(); ctx.moveTo(0, lakeY);
    for (let x = 0; x <= w; x += 22) ctx.lineTo(x, lakeY - 18 - ((x * 7) % 41));
    ctx.lineTo(w, lakeY + 18); ctx.lineTo(0, lakeY + 18); ctx.fill();
    ctx.strokeStyle = 'rgba(174,214,222,.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const y = lakeY + 18 + i * (h - lakeY) / 9;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const yy = y + Math.sin(x * .035 + time * .0015 + i) * 2;
        if (!x) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    const personX = w * .16;
    const groundY = lakeY + 30;
    ctx.fillStyle = '#10172a';
    ctx.beginPath(); ctx.arc(personX, groundY - 42, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(personX - 8, groundY - 33, 16, 30);
    ctx.strokeStyle = '#d8b77a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(personX + 5, groundY - 27); ctx.lineTo(personX + 40, groundY - 72); ctx.stroke();

    if (mode !== 'menu' && mode !== 'result') {
      const bobX = personX + 45 + (w * .7 - personX) * castDistance;
      const bobY = lakeY + 28 + Math.sin(time / 260) * (mode === 'bite' ? 8 : 2);
      ctx.strokeStyle = 'rgba(245,241,223,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(personX + 40, groundY - 72); ctx.quadraticCurveTo(w * .45, lakeY - 48, bobX, bobY); ctx.stroke();
      ctx.fillStyle = '#ff806b'; ctx.fillRect(bobX - 2, bobY - 8, 4, 9);
      ctx.fillStyle = '#f5f1df'; ctx.beginPath(); ctx.arc(bobX, bobY + 1, 4, 0, Math.PI * 2); ctx.fill();
      if (mode === 'waiting' || mode === 'bite') {
        const rr = 10 + ((ripple * 24) % 30);
        ctx.strokeStyle = 'rgba(220,245,242,' + Math.max(.05, .45 - (rr - 10) / 70) + ')';
        ctx.beginPath(); ctx.ellipse(bobX, bobY + 4, rr, rr * .28, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }

    if (caughtFlash > 0) {
      ctx.fillStyle = 'rgba(255,231,153,' + caughtFlash * .22 + ')';
      ctx.fillRect(0, 0, w, h);
    }
  }

  function frame(now) {
    if (!lastTime) lastTime = now;
    const dt = Math.min(.034, (now - lastTime) / 1000);
    lastTime = now;
    if (mode !== 'paused' && mode !== 'menu' && mode !== 'result') update(dt);
    drawScene(now);
    renderCatchGame();
    requestAnimationFrame(frame);
  }

  function ensureAudio() {
    if (muted) return null;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function play(name) {
    const ac = ensureAudio();
    if (!ac) return;
    const settings = {
      start: [420, .16, 'triangle'], cast: [250, .18, 'sine'], bite: [760, .22, 'triangle'],
      hook: [520, .13, 'square'], success: [610, .32, 'triangle'], rare: [780, .5, 'sine'],
      lose: [190, .35, 'sawtooth'],
    }[name] || [320, .08, 'sine'];
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const now = ac.currentTime;
    osc.type = settings[2];
    osc.frequency.setValueAtTime(settings[0], now);
    if (name === 'success' || name === 'rare') osc.frequency.exponentialRampToValueAtTime(settings[0] * 1.7, now + settings[1]);
    if (name === 'lose') osc.frequency.exponentialRampToValueAtTime(90, now + settings[1]);
    gain.gain.setValueAtTime(.08, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + settings[1]);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(now); osc.stop(now + settings[1] + .02);
  }

  function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  modalBtn.addEventListener('click', () => {
    if (mode === 'paused') resume();
    else startSession();
  });
  pauseBtn.addEventListener('click', showPause);
  soundBtn.addEventListener('click', () => {
    muted = !muted;
    soundBtn.textContent = muted ? '🔇' : '🔊';
    soundBtn.setAttribute('aria-label', muted ? '开启声音' : '关闭声音');
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    if (!muted) play('start');
  });
  actionBtn.addEventListener('pointerdown', (e) => {
    actionBtn.setPointerCapture && actionBtn.setPointerCapture(e.pointerId);
    pressStart(e);
  });
  actionBtn.addEventListener('pointerup', pressEnd);
  actionBtn.addEventListener('pointercancel', pressEnd);
  window.addEventListener('pointerup', () => {
    if (mode === 'fishing') { held = false; actionBtn.classList.remove('is-held'); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) pressStart();
    } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (mode === 'paused') resume(); else showPause();
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { e.preventDefault(); pressEnd(); }
  });
  window.addEventListener('blur', () => {
    held = false;
    if (['casting', 'waiting', 'bite', 'fishing'].includes(mode)) showPause();
  });
  window.addEventListener('resize', resize);

  soundBtn.textContent = muted ? '🔇' : '🔊';
  soundBtn.setAttribute('aria-label', muted ? '开启声音' : '关闭声音');
  updateHud();
  resize();
  requestAnimationFrame(frame);

  window.__fishingTest = {
    getState: () => ({ mode, power, castDistance, waitLeft, biteLeft, fish: fish && fish.id, fishY, zoneY, zoneV, catchProgress, totalCaught, bestWeight, streak, bestStreak }),
    start: startSession,
    bite: () => { if (mode === 'ready') { castDistance = .8; } beginBite(); },
    hook: hookFish,
    finish: beginCatchFinish,
    setFish: (id) => { fish = FISH.find((item) => item.id === id) || FISH[0]; },
    setProgress: (value) => { catchProgress = Math.max(0, Math.min(1, Number(value))); },
  };
})();
