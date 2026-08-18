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
  const modalNew = $('modalNew');
  const modalBack = $('modalBack');
  const resultFish = $('resultFish');
  const catalog = $('catalog');
  const catalogBtn = $('catalogBtn');
  const catalogClose = $('catalogClose');
  const catalogGrid = $('catalogGrid');
  const catalogProgress = $('catalogProgress');
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
  const soundOn = $('soundOn');
  const soundOff = $('soundOff');
  const pauseBtn = $('pauseBtn');
  const totalCaughtEl = $('totalCaught');
  const bestWeightEl = $('bestWeight');
  const streakEl = $('streak');
  const bestStreakEl = $('bestStreak');

  const TOTAL_KEY = 'fishing_total_v1';
  const WEIGHT_KEY = 'fishing_best_weight_v1';
  const STREAK_KEY = 'fishing_best_streak_v1';
  const MUTE_KEY = 'fishing_muted_v1';
  const SAVE_KEY = 'fishing_save_v1';
  const COLLECTION_KEY = 'fishing_collection_v1';
  const FISH = [
    { id: 'crucian', name: '小鲫鱼', rarity: '常见', color: '#b9c5ca', min: 220, max: 760, behavior: 'calm', difficulty: .7, weight: 24, sprite: 0, hint: '湖中随处可见，性情温和。' },
    { id: 'carp', name: '红鲤鱼', rarity: '常见', color: '#e58a42', min: 520, max: 2400, behavior: 'calm', difficulty: .78, weight: 17, sprite: 1, hint: '喜欢水草丰盛的浅水区域。' },
    { id: 'loach', name: '湖鳅', rarity: '常见', color: '#a58b54', min: 180, max: 620, behavior: 'active', difficulty: .76, weight: 13, sprite: 2, hint: '细长灵活，常贴着湖底游动。' },
    { id: 'catfish', name: '蓝鲶鱼', rarity: '常见', color: '#6686a8', min: 760, max: 3600, behavior: 'calm', difficulty: .84, weight: 11, sprite: 3, hint: '长着胡须，偏爱安静的夜晚。' },
    { id: 'perch', name: '翡翠河鲈', rarity: '常见', color: '#54a99b', min: 420, max: 1380, behavior: 'active', difficulty: .9, weight: 10, sprite: 4, hint: '条纹鲜明，游动十分活跃。' },
    { id: 'trout', name: '彩虹鳟', rarity: '少见', color: '#87b9c7', min: 680, max: 2800, behavior: 'active', difficulty: .96, weight: 8, sprite: 5, hint: '雨后常在清凉水域出现。' },
    { id: 'eel', name: '金鳗', rarity: '少见', color: '#bd813e', min: 540, max: 2200, behavior: 'active', difficulty: 1, weight: 6, sprite: 6, hint: '动作流畅，却很擅长突然变向。' },
    { id: 'puffer', name: '珊瑚河豚', rarity: '少见', color: '#ef8b73', min: 360, max: 1200, behavior: 'active', difficulty: 1.02, weight: 5, sprite: 7, hint: '圆滚滚的身体会随水流跳动。' },
    { id: 'icefin', name: '冰鳍鱼', rarity: '稀有', color: '#8ed4ee', min: 920, max: 4200, behavior: 'dash', difficulty: 1.04, weight: 3, sprite: 8, hint: '据说会在冰凉的雨幕下现身。' },
    { id: 'starlight', name: '星辉鱼', rarity: '稀有', color: '#8d6ce3', min: 780, max: 3400, behavior: 'dash', difficulty: 1.08, weight: 2, sprite: 9, hint: '鳞片只在深夜映出星光。' },
    { id: 'koi', name: '红白锦鲤', rarity: '稀有', color: '#efaa73', min: 1100, max: 5600, behavior: 'dash', difficulty: 1.09, weight: .8, sprite: 10, hint: '红白纹样独一无二，十分珍贵。' },
    { id: 'moon', name: '月光锦鲤', rarity: '传说', color: '#d7f3e8', min: 1800, max: 8260, behavior: 'dash', difficulty: 1.12, weight: .2, sprite: 11, hint: '只回应最有耐心的湖畔来客。' },
  ];
  const RARITY_RANK = { '常见': 0, '少见': 1, '稀有': 2, '传说': 3 };

  let mode = 'menu';
  let beforePause = 'ready';
  let lastTime = 0;
  let held = false;
  let power = 0;
  let powerDir = 1;
  let castDistance = .55;
  let castTime = 0;
  let hookTime = 0;
  let waitLeft = 0;
  let biteLeft = 0;
  let fish = null;
  let fishY = .5;
  let fishTarget = .5;
  let fishMoveLeft = 0;
  let fishWarning = 0;
  let dashPending = false;
  let dashCount = 0;
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
  let motionTestHold = false;
  let saveAcc = 0;
  let pendingResume = null;
  let collection = loadCollection();

  function readInt(key) {
    try { return parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { return 0; }
  }

  function loadCollection() {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLECTION_KEY));
      return saved && typeof saved === 'object' ? saved : {};
    } catch (e) { return {}; }
  }

  function saveCollection() {
    try { localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection)); } catch (e) {}
  }

  function setFishSprite(el, item) {
    if (!el || !item) return;
    const col = item.sprite % 4;
    const row = Math.floor(item.sprite / 4);
    const sheets = ['common', 'uncommon', 'rare'];
    el.style.backgroundImage = 'url("assets/moonlake-fish-' + sheets[row] + '-v1.png")';
    el.style.setProperty('--fish-x', (col * 100 / 3) + '%');
  }

  function recordCatch(item, weight) {
    const previous = collection[item.id] || { count: 0, best: 0 };
    const first = previous.count === 0;
    const speciesRecord = weight > previous.best;
    collection[item.id] = { count: previous.count + 1, best: Math.max(previous.best, weight) };
    saveCollection();
    return { first, speciesRecord };
  }

  function renderCatalog() {
    const found = FISH.filter((item) => collection[item.id] && collection[item.id].count > 0).length;
    catalogProgress.textContent = '已发现 ' + found + ' / ' + FISH.length;
    catalogGrid.innerHTML = '';
    FISH.forEach((item) => {
      const record = collection[item.id];
      const discovered = record && record.count > 0;
      const card = document.createElement('article');
      card.className = 'fish-card' + (discovered ? '' : ' is-locked');
      card.dataset.rarity = item.rarity;
      const art = document.createElement('div');
      art.className = 'fish-card__art fish-sprite';
      setFishSprite(art, item);
      const name = document.createElement('h3');
      name.textContent = discovered ? item.name : '？？？';
      const rarity = document.createElement('p');
      rarity.className = 'fish-card__rarity';
      rarity.textContent = discovered ? item.rarity : '尚未发现';
      const detail = document.createElement('p');
      detail.textContent = discovered ? '捕获 ' + record.count + ' 次 · 最大 ' + formatWeight(record.best) : item.hint;
      card.append(art, name, rarity, detail);
      catalogGrid.appendChild(card);
    });
  }

  function openCatalog() {
    if (['casting', 'waiting', 'bite', 'hooking', 'fishing'].includes(mode)) showPause();
    renderCatalog();
    catalog.hidden = false;
  }

  function closeCatalog() {
    catalog.hidden = true;
  }

  function saveStats() {
    try {
      localStorage.setItem(TOTAL_KEY, String(totalCaught));
      localStorage.setItem(WEIGHT_KEY, String(bestWeight));
      localStorage.setItem(STREAK_KEY, String(bestStreak));
    } catch (e) {}
  }

  function saveState() {
    let phase = mode === 'paused' ? beforePause : mode;
    if (phase === 'ready' || phase === 'casting') {
      clearState();
      return;
    }
    if (!['waiting', 'bite', 'hooking', 'fishing'].includes(phase)) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        phase: phase,
        castDistance: castDistance,
        castTime: castTime,
        waitLeft: waitLeft,
        biteLeft: biteLeft,
        hookTime: hookTime,
        fish: fish && fish.id,
        fishY: fishY,
        fishTarget: fishTarget,
        fishMoveLeft: fishMoveLeft,
        fishWarning: fishWarning,
        dashPending: dashPending,
        dashCount: dashCount,
        zoneY: zoneY,
        zoneV: zoneV,
        catchProgress: catchProgress,
        streak: streak,
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      return saved && typeof saved === 'object' ? saved : null;
    } catch (e) { return null; }
  }

  function clearState() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  function showResumePrompt(saved) {
    pendingResume = saved;
    mode = 'resume';
    overlay.hidden = false;
    modalEyebrow.textContent = '湖面还记得这一竿';
    modalTitle.textContent = '继续上次垂钓？';
    const fishName = saved.fish && FISH.find((item) => item.id === saved.fish);
    modalText.textContent = fishName ? fishName.name + ' · 捕获进度 ' + Math.round((saved.catchProgress || 0) * 100) + '%' : '鱼竿和浮标都还在原处';
    modalBtn.textContent = '继续上次';
    modalNew.textContent = '新钓一局';
    modalNew.hidden = false;
    modalBack.hidden = false;
  }

  function restoreState(saved) {
    const restoredFish = saved.fish && FISH.find((item) => item.id === saved.fish);
    let phase = saved.phase;
    if (!['ready', 'waiting', 'bite', 'hooking', 'fishing'].includes(phase)) phase = 'ready';
    if (['hooking', 'fishing'].includes(phase) && !restoredFish) phase = 'ready';
    castDistance = Number(saved.castDistance) || .55;
    castTime = Math.max(0, Number(saved.castTime) || 0);
    waitLeft = Math.max(.4, Number(saved.waitLeft) || .4);
    biteLeft = Math.max(.8, Number(saved.biteLeft) || .8);
    hookTime = Math.max(.15, Number(saved.hookTime) || .15);
    fish = restoredFish || null;
    fishY = Math.max(.04, Math.min(.96, Number(saved.fishY) || .5));
    fishTarget = Math.max(.04, Math.min(.96, Number(saved.fishTarget) || fishY));
    fishMoveLeft = Math.max(.1, Number(saved.fishMoveLeft) || .4);
    fishWarning = Math.max(0, Number(saved.fishWarning) || 0);
    dashPending = !!saved.dashPending;
    dashCount = Math.max(0, Number(saved.dashCount) || 0);
    zoneY = Math.max(.16, Math.min(.84, Number(saved.zoneY) || .2));
    zoneV = Math.max(-.88, Math.min(.84, Number(saved.zoneV) || 0));
    catchProgress = Math.max(.08, Math.min(.96, Number(saved.catchProgress) || .25));
    streak = Math.max(0, Number(saved.streak) || 0);
    if (fish) setFishSprite(fishMarker.querySelector('span'), fish);
    pendingResume = null;
    motionTestHold = false;
    modalNew.hidden = true;
    setMode(phase);
    updateHud();
    saveState();
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
    resultFish.hidden = true;
    catchGame.hidden = next !== 'fishing' && next !== 'finishing';
    powerWrap.hidden = next !== 'casting';
    pauseBtn.hidden = !['ready', 'casting', 'waiting', 'bite', 'fishing'].includes(next);
    actionBtn.disabled = next === 'waiting' || next === 'hooking';

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
    } else if (next === 'hooking') {
      actionBtn.textContent = '提竿中…';
      actionHint.textContent = '鱼线绷紧了，准备遛鱼';
    } else if (next === 'result') {
      actionBtn.disabled = true;
      actionBtn.textContent = '等待下一竿';
      actionHint.textContent = '查看本次收获后继续';
    }
  }

  function startSession() {
    motionTestHold = false;
    pendingResume = null;
    clearState();
    overlay.hidden = true;
    modalNew.hidden = true;
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
    saveState();
    play('cast');
    vibrate(10);
  }

  function beginBite() {
    biteLeft = totalCaught < 3 ? 1.7 : 1.35;
    noticeTitle.textContent = '鱼咬钩了！';
    noticeSub.textContent = '快提竿';
    notice.hidden = false;
    setMode('bite');
    notice.hidden = false;
    saveState();
    play('bite');
    vibrate([20, 35, 35]);
  }

  function chooseFish() {
    const rareBoost = Math.max(0, castDistance - .55) * 1.7;
    const weighted = FISH.map((item) => item.weight * (1 + RARITY_RANK[item.rarity] * rareBoost));
    let roll = Math.random() * weighted.reduce((sum, value) => sum + value, 0);
    for (let i = 0; i < FISH.length; i++) {
      roll -= weighted[i];
      if (roll <= 0) return FISH[i];
    }
    return FISH[0];
  }

  function hookFish() {
    if (mode !== 'bite') return;
    fish = chooseFish();
    setFishSprite(fishMarker.querySelector('span'), fish);
    fishY = .5;
    fishTarget = .5;
    fishMoveLeft = .45;
    fishWarning = 0;
    dashPending = false;
    dashCount = 0;
    zoneY = .2;
    zoneV = 0;
    catchProgress = fish.id === 'crucian' && totalCaught === 0 ? .38 : .25;
    hookTime = .62;
    setMode('hooking');
    saveState();
    play('hook');
    vibrate(22);
  }

  function startFishing() {
    setMode('fishing');
    saveState();
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
        fishWarning = .5;
        fishMoveLeft = .5;
        fishTarget = fishY;
        dashPending = true;
      } else {
        if (dashCount === 0) fishTarget = fishY > .5 ? .18 + Math.random() * .14 : .68 + Math.random() * .14;
        else fishTarget = fishY > .5 ? .08 + Math.random() * .18 : .74 + Math.random() * .2;
        fishMoveLeft = .48 + Math.random() * .28;
        dashPending = false;
        dashCount++;
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
    zoneV *= Math.pow(.2, dt);
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
    const species = recordCatch(fish, weight);
    totalCaught++;
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    bestWeight = Math.max(bestWeight, weight);
    saveStats();
    updateHud();
    caughtFlash = 1;
    play(RARITY_RANK[fish.rarity] >= 2 ? 'rare' : 'success');
    vibrate([24, 40, 55]);
    const badges = [];
    if (species.first) badges.push('✨ 新物种发现！');
    if (species.speciesRecord) badges.push('🏆 单鱼新纪录！');
    if (isRecord) badges.push('本湖最大重量！');
    showResult(true, '钓到了！', fish.name + ' · ' + fish.rarity + '\n' + formatWeight(weight) + (badges.length ? '\n' + badges.join(' · ') : ''), fish);
  }

  function loseFish() {
    streak = 0;
    updateHud();
    play('lose');
    vibrate(35);
    showResult(false, '鱼儿脱钩了', '这条' + fish.name + '很有力气。\n调整节奏，再试一次吧。');
  }

  function showResult(success, title, text, caughtFish) {
    clearState();
    setMode('result');
    overlay.hidden = false;
    modalEyebrow.textContent = success ? '本次收获' : '差一点点';
    resultFish.hidden = !caughtFish;
    if (caughtFish) setFishSprite(resultFish, caughtFish);
    modalTitle.textContent = title;
    modalText.textContent = text;
    modalBtn.textContent = '再钓一竿';
    modalNew.textContent = '查看鱼类图鉴';
    modalNew.hidden = !success;
    modalBack.hidden = false;
  }

  function showPause() {
    if (!['ready', 'casting', 'waiting', 'bite', 'hooking', 'fishing'].includes(mode)) return;
    beforePause = mode === 'casting' ? 'ready' : mode;
    held = false;
    mode = 'paused';
    overlay.hidden = false;
    modalEyebrow.textContent = '湖面仍在等你';
    modalTitle.textContent = '已暂停';
    modalText.textContent = '休息一下，准备好再继续。';
    modalBtn.textContent = '继续钓鱼';
    modalNew.hidden = true;
    modalBack.hidden = false;
    saveState();
  }

  function resume() {
    overlay.hidden = true;
    setMode(beforePause);
    saveState();
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
      if (!motionTestHold) castTime = Math.max(0, castTime - dt);
      ripple += dt;
      waitLeft -= dt;
      if (waitLeft <= 0) beginBite();
    } else if (mode === 'bite') {
      ripple += dt * 5;
      biteLeft -= dt;
      if (biteLeft <= 0) missBite();
    } else if (mode === 'hooking') {
      if (!motionTestHold) hookTime -= dt;
      if (hookTime <= 0) startFishing();
    } else if (mode === 'fishing') {
      updateFishing(dt);
    } else if (mode === 'finishing') {
      if (!motionTestHold) finishLeft -= dt;
      if (finishLeft <= 0) catchFish();
    }
    saveAcc += dt;
    if (saveAcc >= .5) {
      saveAcc = 0;
      saveState();
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
    const pullBack = mode === 'casting' ? power : 0;
    const rodTipX = personX + 40 - pullBack * 18;
    const rodTipY = groundY - 72 - pullBack * 8;
    ctx.strokeStyle = '#d8b77a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(personX + 5, groundY - 27); ctx.lineTo(rodTipX, rodTipY); ctx.stroke();

    const targetBobX = personX + 45 + (w * .7 - personX) * castDistance;
    const targetBobY = lakeY + 28;
    if (mode === 'ready' || mode === 'casting') {
      const hookX = personX + 24 - pullBack * 12;
      const hookY = lakeY - 10;
      ctx.strokeStyle = 'rgba(245,241,223,.58)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rodTipX, rodTipY); ctx.quadraticCurveTo(personX + 42, groundY - 18, hookX, hookY); ctx.stroke();
      ctx.strokeStyle = '#f5f1df'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(hookX, hookY - 5); ctx.lineTo(hookX, hookY + 3); ctx.quadraticCurveTo(hookX, hookY + 8, hookX + 5, hookY + 5); ctx.stroke();
    } else if (mode === 'waiting' && castTime > 0) {
      const castT = Math.max(0, Math.min(1, 1 - castTime / .72));
      const bobX = rodTipX + (targetBobX - rodTipX) * castT;
      const bobY = rodTipY + (targetBobY - rodTipY) * castT - Math.sin(Math.PI * castT) * h * .24;
      ctx.strokeStyle = 'rgba(245,241,223,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(personX + 40, groundY - 72); ctx.quadraticCurveTo(w * .45, lakeY - 48, bobX, bobY); ctx.stroke();
      ctx.fillStyle = '#ff806b'; ctx.fillRect(bobX - 2, bobY - 8, 4, 9);
      ctx.fillStyle = '#f5f1df'; ctx.beginPath(); ctx.arc(bobX, bobY + 1, 4, 0, Math.PI * 2); ctx.fill();
    } else if (mode === 'hooking') {
      const hookT = Math.max(0, Math.min(1, 1 - hookTime / .62));
      const bobX = targetBobX + Math.sin(hookT * Math.PI * 3) * 5;
      const bobY = targetBobY - Math.sin(Math.PI * hookT) * 10;
      ctx.strokeStyle = 'rgba(245,241,223,.8)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(rodTipX, rodTipY - Math.sin(Math.PI * hookT) * 12); ctx.lineTo(bobX, bobY); ctx.stroke();
      ctx.fillStyle = '#ff806b'; ctx.fillRect(bobX - 2, bobY - 8, 4, 9);
      ctx.fillStyle = '#f5f1df'; ctx.beginPath(); ctx.arc(bobX, bobY + 1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.globalAlpha = .3;
      ctx.fillStyle = fish ? fish.color : '#8fd3c7';
      ctx.beginPath(); ctx.ellipse(bobX - 8, targetBobY + 35 + Math.sin(hookT * 12) * 5, 12, 5, .15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(220,245,242,.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(targetBobX, targetBobY + 3, 14 + hookT * 15, 4 + hookT * 4, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (mode === 'finishing') {
      const finishT = Math.max(0, Math.min(1, 1 - finishLeft / .38));
      const bobX = targetBobX + (rodTipX - targetBobX) * finishT * .72;
      const bobY = targetBobY - Math.sin(Math.PI * finishT) * h * .3 - finishT * 20;
      ctx.strokeStyle = 'rgba(245,241,223,.85)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(rodTipX, rodTipY); ctx.quadraticCurveTo(w * .52, lakeY - 80, bobX, bobY); ctx.stroke();
      ctx.fillStyle = fish ? fish.color : '#8fd3c7';
      ctx.beginPath(); ctx.ellipse(bobX - 10, bobY + 7, 11, 6, -.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bobX - 20, bobY + 6); ctx.lineTo(bobX - 29, bobY); ctx.lineTo(bobX - 27, bobY + 13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#17213b'; ctx.beginPath(); ctx.arc(bobX - 5, bobY + 5, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(220,245,242,.65)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(targetBobX, targetBobY + 3, 15 + finishT * 20, 5 + finishT * 5, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (['waiting', 'bite', 'fishing', 'paused'].includes(mode)) {
      const bobX = targetBobX;
      const bobY = targetBobY + Math.sin(time / 260) * (mode === 'bite' ? 8 : 2);
      ctx.strokeStyle = 'rgba(245,241,223,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rodTipX, rodTipY); ctx.quadraticCurveTo(w * .45, lakeY - 48, bobX, bobY); ctx.stroke();
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

  function applyMuted() {
    soundOn.hidden = muted;
    soundOff.hidden = !muted;
    soundBtn.setAttribute('aria-label', muted ? '开启声音' : '关闭声音');
  }

  modalBtn.addEventListener('click', () => {
    if (mode === 'paused') resume();
    else if (mode === 'resume' && pendingResume) restoreState(pendingResume);
    else startSession();
  });
  modalNew.addEventListener('click', () => {
    if (mode === 'menu' || mode === 'result') openCatalog();
    else startSession();
  });
  catalogBtn.addEventListener('click', openCatalog);
  catalogClose.addEventListener('click', closeCatalog);
  pauseBtn.addEventListener('click', showPause);
  soundBtn.addEventListener('click', () => {
    muted = !muted;
    applyMuted();
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
    if (['casting', 'waiting', 'bite', 'hooking', 'fishing'].includes(mode)) showPause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ['casting', 'waiting', 'bite', 'hooking', 'fishing'].includes(mode)) showPause();
  });
  window.addEventListener('pagehide', saveState);
  window.addEventListener('resize', resize);

  applyMuted();
  setFishSprite(fishMarker.querySelector('span'), FISH[0]);
  updateHud();
  resize();
  const savedState = loadState();
  if (savedState) showResumePrompt(savedState);
  requestAnimationFrame(frame);

  window.__fishingTest = {
    getState: () => ({ mode, power, castDistance, waitLeft, biteLeft, fish: fish && fish.id, fishY, zoneY, zoneV, catchProgress, totalCaught, bestWeight, streak, bestStreak }),
    start: startSession,
    showCast: (progress) => {
      motionTestHold = true;
      castDistance = .78;
      castTime = .72 * (1 - Math.max(0, Math.min(.9, Number(progress) || 0)));
      waitLeft = 999;
      setMode('waiting');
    },
    bite: () => { if (mode === 'ready') { castDistance = .8; } beginBite(); },
    hook: hookFish,
    showHook: (progress) => {
      motionTestHold = true;
      if (!fish) fish = FISH[0];
      hookTime = .62 * (1 - Math.max(0, Math.min(.9, Number(progress) || 0)));
      setMode('hooking');
    },
    startFishing: startFishing,
    finish: beginCatchFinish,
    showFinish: (progress) => {
      if (!fish) fish = FISH[0];
      motionTestHold = true;
      catchProgress = 1;
      finishLeft = .38 * (1 - Math.max(0, Math.min(.9, Number(progress) || 0)));
      mode = 'finishing';
    },
    setFish: (id) => { fish = FISH.find((item) => item.id === id) || FISH[0]; },
    setProgress: (value) => { catchProgress = Math.max(0, Math.min(1, Number(value))); },
  };
})();
