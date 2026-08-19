(function () {
  'use strict';

  if (!window.FishingFishData || !window.FishingEnvironments || !window.FishingStorage || !window.FishingAudio || !window.FishingUI) {
    throw new Error('Fishing data modules failed to load.');
  }

  const { FISH, RARITY_RANK } = window.FishingFishData;
  const { ENVIRONMENTS, environmentForStep, chooseFish: chooseFishForEnvironment } = window.FishingEnvironments;
  const storage = window.FishingStorage;
  const audio = window.FishingAudio.create({ muted: storage.readInt(storage.KEYS.MUTED) === 1 });
  const play = audio.play;
  const vibrate = audio.vibrate;
  const formatWeight = window.FishingUI.formatWeight;

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
  const catchReveal = $('catchReveal');
  const revealFish = $('revealFish');
  const revealTitle = $('revealTitle');
  const revealRarity = $('revealRarity');
  const catalog = $('catalog');
  const catalogBtn = $('catalogBtn');
  const catalogClose = $('catalogClose');
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
  const ui = window.FishingUI.create({
    fish: FISH,
    elements: {
      catalogGrid: $('catalogGrid'),
      catalogProgress: $('catalogProgress'),
      soundButton: soundBtn,
      soundOn: $('soundOn'),
      soundOff: $('soundOff'),
      totalCaught: $('totalCaught'),
      bestWeight: $('bestWeight'),
      streak: $('streak'),
      bestStreak: $('bestStreak'),
      environmentLabel: $('environmentLabel'),
    },
  });
  const setFishSprite = ui.setFishSprite;

  const {
    TOTAL: TOTAL_KEY,
    BEST_WEIGHT: WEIGHT_KEY,
    BEST_STREAK: STREAK_KEY,
    MUTED: MUTE_KEY,
    SAVE: SAVE_KEY,
    COLLECTION: COLLECTION_KEY,
    ENVIRONMENT_STEP: ENV_KEY,
  } = storage.KEYS;
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
  let totalCaught = storage.readInt(TOTAL_KEY);
  let bestWeight = storage.readInt(WEIGHT_KEY);
  let streak = 0;
  let bestStreak = storage.readInt(STREAK_KEY);
  let ripple = 0;
  let caughtFlash = 0;
  let finishLeft = 0;
  let revealLeft = 0;
  let pendingCatchResult = null;
  let motionTestHold = false;
  let saveAcc = 0;
  let pendingResume = null;
  let collection = loadCollection();
  let environmentStep = storage.readInt(ENV_KEY);
  let environment = environmentForStep(environmentStep);

  function updateEnvironment() {
    environment = environmentForStep(environmentStep);
    ui.renderEnvironment(environment);
  }

  function advanceEnvironment() {
    environmentStep++;
    storage.writeInt(ENV_KEY, environmentStep);
    updateEnvironment();
  }

  function loadCollection() {
    return storage.readObject(COLLECTION_KEY, {});
  }

  function saveCollection() {
    storage.writeObject(COLLECTION_KEY, collection);
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
    ui.renderCatalog(collection);
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
    storage.writeInt(TOTAL_KEY, totalCaught);
    storage.writeInt(WEIGHT_KEY, bestWeight);
    storage.writeInt(STREAK_KEY, bestStreak);
  }

  function saveState() {
    let phase = mode === 'paused' ? beforePause : mode;
    if (phase === 'ready' || phase === 'casting') {
      clearState();
      return;
    }
    if (!['waiting', 'bite', 'hooking', 'fishing'].includes(phase)) return;
    storage.writeObject(SAVE_KEY, {
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
      });
  }

  function loadState() {
    return storage.readObject(SAVE_KEY, null);
  }

  function clearState() {
    storage.remove(SAVE_KEY);
  }

  function showResumePrompt(saved) {
    pendingResume = saved;
    mode = 'resume';
    overlay.hidden = false;
    modalEyebrow.textContent = '湖面还记得这一竿';
    modalTitle.textContent = '继续上次垂钓？';
    const hasHookedFish = saved.fish && FISH.some((item) => item.id === saved.fish);
    modalText.textContent = hasHookedFish ? '神秘鱼影 · 捕获进度 ' + Math.round((saved.catchProgress || 0) * 100) + '%' : '鱼竿和浮标都还在原处';
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
    if (fish) setFishSprite(fishMarker.querySelector('span'), FISH[0]);
    pendingResume = null;
    motionTestHold = false;
    modalNew.hidden = true;
    setMode(phase);
    updateHud();
    saveState();
  }

  function updateHud() {
    ui.renderHud({ totalCaught, bestWeight, streak, bestStreak });
  }

  function sizeGrade(item, weight) {
    const ratio = (weight - item.min) / Math.max(1, item.max - item.min);
    if (ratio >= .95) return '👑 纪录级';
    if (ratio >= .82) return '巨型';
    if (ratio >= .6) return '大型';
    if (ratio >= .25) return '普通';
    return '小型';
  }

  function streakBonus() {
    return Math.min(10, streak * 2);
  }

  function setMode(next) {
    mode = next;
    held = false;
    actionBtn.classList.remove('is-held');
    overlay.hidden = true;
    notice.hidden = true;
    resultFish.hidden = true;
    catchReveal.hidden = true;
    catchGame.hidden = next !== 'fishing' && next !== 'finishing';
    powerWrap.hidden = next !== 'casting';
    pauseBtn.hidden = !['ready', 'casting', 'waiting', 'bite', 'fishing'].includes(next);
    actionBtn.disabled = next === 'waiting' || next === 'hooking';

    if (next === 'ready') {
      actionBtn.textContent = '按住蓄力';
      actionHint.textContent = streak ? '连续上鱼 ×' + streak + ' · 稀有鱼概率 +' + streakBonus() + '%' : '按住按钮蓄力，松开抛竿';
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
    waitLeft = (1.15 + Math.random() * 1.75) * (1 - Math.min(.15, streak * .03));
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
    return chooseFishForEnvironment({
      fish: FISH,
      rarityRank: RARITY_RANK,
      environment,
      castDistance,
      streak,
    });
  }

  function hookFish() {
    if (mode !== 'bite') return;
    fish = chooseFish();
    setFishSprite(fishMarker.querySelector('span'), FISH[0]);
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
    advanceEnvironment();
    showResult(false, '反应慢了一点', '鱼儿吃掉鱼饵，溜走了。');
  }

  function updateFish(dt) {
    fishMoveLeft -= dt;
    fishWarning = Math.max(0, fishWarning - dt);
    if (fishMoveLeft <= 0) {
      if (fish.behavior === 'calm') {
        fishTarget = .16 + Math.random() * .68;
        fishMoveLeft = (fish.id === 'carp' ? 1.05 : .82) + Math.random() * .72;
      } else if (fish.behavior === 'active') {
        if (fish.id === 'eel') fishTarget = fishY > .5 ? .12 + Math.random() * .24 : .64 + Math.random() * .24;
        else fishTarget = .08 + Math.random() * .84;
        fishMoveLeft = fish.id === 'eel' ? .2 + Math.random() * .24 : .32 + Math.random() * .48;
      } else if (!dashPending) {
        fishWarning = fish.id === 'moon' ? .68 : fish.id === 'icefin' ? .58 : .48;
        fishMoveLeft = fishWarning;
        if (fish.id === 'starlight') fishTarget = Math.max(.1, Math.min(.9, fishY + (Math.random() < .5 ? -.12 : .12)));
        else if (fish.id === 'moon') fishTarget = Math.max(.1, Math.min(.9, fishY + (Math.random() < .5 ? -.08 : .08)));
        else fishTarget = fishY;
        dashPending = true;
      } else {
        if (fish.id === 'moon') fishTarget = fishY > .5 ? .05 + Math.random() * .16 : .79 + Math.random() * .16;
        else if (dashCount === 0) fishTarget = fishY > .5 ? .18 + Math.random() * .14 : .68 + Math.random() * .14;
        else fishTarget = fishY > .5 ? .08 + Math.random() * .18 : .74 + Math.random() * .2;
        fishMoveLeft = fish.id === 'icefin' ? .55 + Math.random() * .18 : .44 + Math.random() * .26;
        dashPending = false;
        dashCount++;
      }
    }
    const speed = (fish.behavior === 'calm' ? .62 : fish.behavior === 'active' ? 1.1 : 1.3) * fish.difficulty;
    fishY += (fishTarget - fishY) * Math.min(1, dt * speed * 3.2);
    fishY += Math.sin(performance.now() / (fish.id === 'puffer' ? 95 : 180)) * dt * (fish.id === 'puffer' ? .055 : .018);
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
    finishLeft = .68;
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
    play('reel');
    vibrate(18);
  }

  function catchFish() {
    const weight = Math.round(fish.min + Math.random() * (fish.max - fish.min));
    const grade = sizeGrade(fish, weight);
    const caughtEnvironment = environment.label.replace(/^[^ ]+ /, '');
    const isRecord = weight > bestWeight;
    const species = recordCatch(fish, weight);
    totalCaught++;
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    bestWeight = Math.max(bestWeight, weight);
    saveStats();
    updateHud();
    caughtFlash = 1;
    const badges = [];
    if (species.first) badges.push('✨ 新物种发现！');
    if (species.speciesRecord) badges.push('🏆 单鱼新纪录！');
    if (isRecord) badges.push('本湖最大重量！');
    const title = fish.rarity === '传说' ? '月光奇迹！' : '钓到了！';
    const text = fish.name + ' · ' + fish.rarity + '\n' + formatWeight(weight) + ' · ' + grade + '\n' + caughtEnvironment + (badges.length ? '\n' + badges.join(' · ') : '');
    clearState();
    advanceEnvironment();
    beginReveal({ fish: fish, title: title, text: text });
  }

  function beginReveal(result) {
    pendingCatchResult = result;
    const rank = RARITY_RANK[result.fish.rarity];
    revealLeft = [.72, .86, 1.05, 1.32][rank];
    setMode('reveal');
    catchReveal.dataset.rarity = result.fish.rarity;
    setFishSprite(revealFish, result.fish);
    revealTitle.textContent = result.title;
    revealRarity.textContent = result.fish.rarity;
    catchReveal.hidden = false;
    play('splash');
    setTimeout(() => play(rank >= 2 ? 'rare' : 'success'), 170);
    vibrate(rank === 3 ? [28, 35, 65, 35, 90] : rank === 2 ? [24, 35, 60] : [20, 30, 42]);
  }

  function finishReveal() {
    if (!pendingCatchResult) return;
    const result = pendingCatchResult;
    pendingCatchResult = null;
    showResult(true, result.title, result.text, result.fish);
  }

  function loseFish() {
    streak = 0;
    updateHud();
    play('lose');
    advanceEnvironment();
    showResult(false, '鱼儿脱钩了', '这条鱼很有力气。\n调整节奏，再试一次吧。');
  }

  function showResult(success, title, text, caughtFish) {
    clearState();
    setMode('result');
    overlay.hidden = false;
    modalEyebrow.textContent = caughtFish ? (caughtFish.rarity === '传说' ? '传说现身' : '本次收获 · ' + caughtFish.rarity) : (success ? '本次收获' : '差一点点');
    resultFish.hidden = !caughtFish;
    if (caughtFish) {
      setFishSprite(resultFish, caughtFish);
      resultFish.dataset.rarity = caughtFish.rarity;
    }
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
    } else if (mode === 'reveal') {
      revealLeft -= dt;
      if (revealLeft <= 0) finishReveal();
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
    const isNight = environment.time === 'night';
    const isDusk = environment.time === 'dusk';
    const isRain = environment.weather === 'rain';
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, isNight ? '#142449' : isDusk ? '#70465b' : '#5793b5');
    grad.addColorStop(.48, isNight ? '#283f66' : isDusk ? '#c27c69' : '#9bc7d0');
    grad.addColorStop(.49, isNight ? '#1c5270' : isDusk ? '#35677a' : '#34768b');
    grad.addColorStop(1, isNight ? '#0e2c4a' : '#16465d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (isNight) {
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
    } else {
      ctx.fillStyle = isDusk ? 'rgba(255,190,112,.92)' : 'rgba(255,238,173,.94)';
      ctx.beginPath(); ctx.arc(w * .74, h * (isDusk ? .28 : .16), Math.min(w, h) * .065, 0, Math.PI * 2); ctx.fill();
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

    if (isRain) {
      ctx.save();
      ctx.strokeStyle = 'rgba(204,232,244,.36)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 42; i++) {
        const x = (((i * 73) + time * .16) % (w + 60)) - 30;
        const y = (((i * 47) + time * .28) % (h + 50)) - 50;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 14); ctx.stroke();
      }
      ctx.restore();
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
      ctx.fillStyle = 'rgba(8,16,29,.82)';
      ctx.beginPath(); ctx.ellipse(bobX - 8, targetBobY + 35 + Math.sin(hookT * 12) * 5, 12, 5, .15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(220,245,242,.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(targetBobX, targetBobY + 3, 14 + hookT * 15, 4 + hookT * 4, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (mode === 'finishing') {
      const finishT = Math.max(0, Math.min(1, 1 - finishLeft / .68));
      const bobX = targetBobX + (rodTipX - targetBobX) * finishT * .72;
      const bobY = targetBobY - Math.sin(Math.PI * finishT) * h * .3 - finishT * 20;
      ctx.strokeStyle = 'rgba(245,241,223,.85)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(rodTipX, rodTipY); ctx.quadraticCurveTo(w * .52, lakeY - 80, bobX, bobY); ctx.stroke();
      ctx.fillStyle = '#0a1323';
      ctx.beginPath(); ctx.ellipse(bobX - 10, bobY + 7, 11, 6, -.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bobX - 20, bobY + 6); ctx.lineTo(bobX - 29, bobY); ctx.lineTo(bobX - 27, bobY + 13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#17213b'; ctx.beginPath(); ctx.arc(bobX - 5, bobY + 5, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(220,245,242,.65)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(targetBobX, targetBobY + 3, 15 + finishT * 20, 5 + finishT * 5, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const angle = -.3 - i * .38;
        const distance = 10 + finishT * (18 + i * 3);
        ctx.fillStyle = 'rgba(210,242,246,' + (.72 - finishT * .38) + ')';
        ctx.beginPath();
        ctx.arc(targetBobX + Math.cos(angle) * distance, targetBobY - 2 + Math.sin(angle) * distance, 1.5 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
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

  function applyMuted() {
    ui.renderMuted(audio.isMuted());
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
    const muted = audio.toggleMuted();
    applyMuted();
    storage.writeInt(MUTE_KEY, muted ? 1 : 0);
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
  updateEnvironment();
  setFishSprite(fishMarker.querySelector('span'), FISH[0]);
  updateHud();
  resize();
  const savedState = loadState();
  if (savedState) showResumePrompt(savedState);
  requestAnimationFrame(frame);

  window.__fishingTest = {
    getState: () => ({ mode, power, castDistance, waitLeft, biteLeft, fish: fish && fish.id, fishY, zoneY, zoneV, catchProgress, totalCaught, bestWeight, streak, bestStreak, muted: audio.isMuted(), environmentStep, environment: environment.time + '-' + environment.weather }),
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
      finishLeft = .68 * (1 - Math.max(0, Math.min(.9, Number(progress) || 0)));
      mode = 'finishing';
    },
    setFish: (id) => { fish = FISH.find((item) => item.id === id) || FISH[0]; },
    setProgress: (value) => { catchProgress = Math.max(0, Math.min(1, Number(value))); },
    setEnvironment: (time, weather) => {
      const index = ENVIRONMENTS.findIndex((item) => item.time === time && item.weather === weather);
      if (index >= 0) { environmentStep = index * 4; updateEnvironment(); }
    },
    sampleFish: (count) => Array.from({ length: Math.max(1, Number(count) || 1) }, () => chooseFish().id),
    showReveal: (id) => {
      const item = FISH.find((entry) => entry.id === id) || FISH[0];
      beginReveal({ fish: item, title: item.rarity === '传说' ? '月光奇迹！' : '钓到了！', text: item.name });
      revealLeft = 999;
    },
  };
})();
