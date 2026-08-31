(function () {
  'use strict';

  if (!window.FishingFishData || !window.FishingRiverFishData || !window.FishingCoastFishData || !window.FishingAbyssFishData || !window.FishingCatchables || !window.FishingEconomy || !window.FishingEnvironments || !window.FishingLocations || !window.FishingStorage || !window.FishingAchievementData || !window.FishingAchievementStorage || !window.FishingAchievementEngine || !window.FishingAchievementUI || !window.FishingAudio || !window.FishingUI || !window.FishingSceneRenderer || !window.FishingSessionState || !window.FishingCatchMechanics || !window.FishingEconomyUI || !window.FishingLocationUI || !window.FishingCollectionUI) {
    throw new Error('Fishing data modules failed to load.');
  }

  const { FISH, RARITY_RANK } = window.FishingFishData;
  const { RIVER_FISH } = window.FishingRiverFishData;
  const { COAST_FISH } = window.FishingCoastFishData;
  const { ABYSS_FISH } = window.FishingAbyssFishData;
  const ALL_FISH = FISH.concat(RIVER_FISH, COAST_FISH, ABYSS_FISH);
  const FISH_BY_ID = new Map(ALL_FISH.map((item) => [item.id, item]));
  const { ITEMS, ITEM_BY_ID, choose: chooseItem } = window.FishingCatchables;
  const economy = window.FishingEconomy;
  const { ENVIRONMENTS, environmentForStep, chooseFish: chooseFishForEnvironment } = window.FishingEnvironments;
  const { LOCATIONS, resolveUnlocked, progressFor, unlockProgressFor } = window.FishingLocations;
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
  const itemsBtn = $('itemsBtn');
  const itemsPanel = $('itemsPanel');
  const itemsClose = $('itemsClose');
  const tackleBtn = $('tackleBtn');
  const tacklePanel = $('tacklePanel');
  const tackleClose = $('tackleClose');
  const achievementBtn = $('achievementBtn');
  const achievementPanel = $('achievementPanel');
  const achievementClose = $('achievementClose');
  const premiumBaitCount = $('premiumBaitCount');
  const basketBtn = $('basketBtn');
  const basketPanel = $('basketPanel');
  const basketClose = $('basketClose');
  const basketList = $('basketList');
  const basketSummary = $('basketSummary');
  const sellAllBtn = $('sellAllBtn');
  const buyBaitBtn = $('buyBaitBtn');
  const shopBaitStock = $('shopBaitStock');
  const shopFeedback = $('shopFeedback');
  const coinCount = $('coinCount');
  const bagCount = $('bagCount');
  const locationBtn = $('locationBtn');
  const locationsPanel = $('locationsPanel');
  const locationsClose = $('locationsClose');
  const locationsGrid = $('locationsGrid');
  const actionBtn = $('actionBtn');
  const actionHint = $('actionHint');
  const powerWrap = $('powerWrap');
  const powerFill = $('powerFill');
  const catchGame = $('catchGame');
  const currentIndicator = $('currentIndicator');
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
    fish: ALL_FISH,
    elements: {
      catalogGrid: $('catalogGrid'),
      catalogProgress: $('catalogProgress'),
      catalogKicker: $('catalogKicker'),
      soundButton: soundBtn,
      soundOn: $('soundOn'),
      soundOff: $('soundOff'),
      totalCaught: $('totalCaught'),
      bestWeight: $('bestWeight'),
      streak: $('streak'),
      bestStreak: $('bestStreak'),
      environmentLabel: $('environmentLabel'),
      locationsGrid,
      itemsGrid: $('itemsGrid'),
      itemsProgress: $('itemsProgress'),
      itemsKicker: $('itemsKicker'),
      tacklePanel,
      premiumBaitCount,
      coinCount,
      bagCount,
      basketList,
      basketSummary,
      sellAllBtn,
      buyBaitBtn,
      shopBaitStock,
    },
  });
  const setFishSprite = ui.setFishSprite;
  const setCatchableArt = ui.setCatchableArt;
  const setMysteryArt = ui.setMysteryArt;

  const {
    TOTAL: TOTAL_KEY,
    BEST_WEIGHT: WEIGHT_KEY,
    BEST_STREAK: STREAK_KEY,
    MUTED: MUTE_KEY,
    SAVE: SAVE_KEY,
    COLLECTION: COLLECTION_KEY,
    ENVIRONMENT_STEP: ENV_KEY,
    CURRENT_LOCATION: CURRENT_LOCATION_KEY,
    UNLOCKED_LOCATIONS: UNLOCKED_LOCATIONS_KEY,
    ITEM_COLLECTION: ITEM_COLLECTION_KEY,
    TACKLE: TACKLE_KEY,
    COINS: COINS_KEY,
    FISH_BAG: FISH_BAG_KEY,
    ACHIEVEMENTS: ACHIEVEMENT_KEY,
  } = storage.KEYS;
  const sessionState = window.FishingSessionState.create({ storage, key: SAVE_KEY });
  let mode = 'menu';
  let beforePause = 'ready';
  let lastTime = 0;
  let held = false;
  let power = 0;
  let powerDir = 1;
  let castDistance = .55;
  let castTime = 0;
  let castUsedPremiumBait = false;
  let hookTime = 0;
  let waitLeft = 0;
  let biteLeft = 0;
  let fish = null;
  let catchable = null;
  let fishY = .5;
  let fishTarget = .5;
  let fishMoveLeft = 0;
  let fishWarning = 0;
  let dashPending = false;
  let dashCount = 0;
  let zoneY = .22;
  let zoneV = 0;
  let catchProgress = .24;
  let peakCatchProgress = .24;
  let surgeTimer = 4.4;
  let surgeLeft = 0;
  let surgeDirection = 1;
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
  let collection = storage.readObject(COLLECTION_KEY, {});
  let itemCollection = storage.readObject(ITEM_COLLECTION_KEY, {});
  let tackle = economy.normalizeTackle(storage.readObject(TACKLE_KEY, {}));
  let coins = economy.normalizeCoins(storage.readInt(COINS_KEY));
  let fishBag = economy.normalizeBag(storage.readObject(FISH_BAG_KEY, []), FISH_BY_ID);
  let achievementEngine = null;
  let achievementUI = null;
  const achievementUnlockQueue = [];
  const economyUI = window.FishingEconomyUI.create({
    economy,
    ui,
    elements: { basketList, feedback: shopFeedback, coinCount },
    play,
    getState: () => ({ coins, fishBag, tackle }),
    updateState: (next) => {
      if (Object.prototype.hasOwnProperty.call(next, 'coins')) coins = next.coins;
      if (Object.prototype.hasOwnProperty.call(next, 'fishBag')) fishBag = next.fishBag;
      if (Object.prototype.hasOwnProperty.call(next, 'tackle')) tackle = next.tackle;
    },
    saveTackle,
    saveEconomy,
    renderTackle,
    onSale: (detail) => emitAchievement(Object.assign({ type: 'fishSold' }, detail)),
    onPurchase: (detail) => emitAchievement(Object.assign({ type: 'baitPurchased' }, detail)),
  });
  let unlockedLocations = resolveUnlocked(collection, itemCollection, storage.readObject(UNLOCKED_LOCATIONS_KEY, ['lake']));
  let currentLocationId = storage.readString(CURRENT_LOCATION_KEY, 'lake');
  if (!LOCATIONS[currentLocationId] || !unlockedLocations.includes(currentLocationId)) currentLocationId = 'lake';
  let environmentStep = storage.readInt(ENV_KEY);
  let environment = environmentForStep(environmentStep);
  const locationUI = window.FishingLocationUI.create({
    rules: {
      locations: LOCATIONS,
      resolveUnlocked,
      progressFor,
      unlockProgressFor,
      discoveredFishCount: window.FishingLocations.discoveredFishCount,
    },
    storage,
    keys: { unlocked: UNLOCKED_LOCATIONS_KEY, current: CURRENT_LOCATION_KEY },
    ui,
    elements: {
      stage,
      indicator: currentIndicator,
      panel: locationsPanel,
      catalog,
      items: itemsPanel,
      tackle: tacklePanel,
      basket: basketPanel,
    },
    getState: () => ({ mode, collection, itemCollection, unlockedLocations, currentLocationId }),
    updateState: (next) => {
      if (next.unlockedLocations) unlockedLocations = next.unlockedLocations;
      if (next.currentLocationId) currentLocationId = next.currentLocationId;
    },
    pause: showPause,
    updateEnvironment,
    startSession,
  });
  const collectionUI = window.FishingCollectionUI.create({
    storage,
    keys: { collection: COLLECTION_KEY, items: ITEM_COLLECTION_KEY },
    ui,
    items: ITEMS,
    locations: LOCATIONS,
    elements: {
      catalog,
      itemPanel: itemsPanel,
      items: itemsPanel,
      locations: locationsPanel,
      tackle: tacklePanel,
      basket: basketPanel,
    },
    getState: () => ({ mode, collection, itemCollection, currentLocationId }),
    updateState: (next) => {
      if (next.collection) collection = next.collection;
      if (next.itemCollection) itemCollection = next.itemCollection;
    },
    currentFishPool,
    refreshLocations: locationUI.refreshUnlocks,
    pause: showPause,
  });
  const achievementStore = window.FishingAchievementStorage.create({ storage, key: ACHIEVEMENT_KEY });
  achievementEngine = window.FishingAchievementEngine.create({
    definitions: window.FishingAchievementData.ACHIEVEMENTS,
    sets: window.FishingAchievementData.COLLECTION_SETS,
    store: achievementStore,
    onUnlock: (definition, retroactive) => {
      achievementUnlockQueue.push({ definition, retroactive });
      if (achievementUI && !retroactive) achievementUI.notify(definition);
    },
  });

  function achievementContext() {
    const treasureCollection = {};
    const junkCollection = {};
    ITEMS.forEach((item) => {
      if (!itemCollection[item.id]) return;
      (item.type === 'treasure' ? treasureCollection : junkCollection)[item.id] = itemCollection[item.id];
    });
    return {
      totalCaught, bestWeight, bestStreak, coins, collection, itemCollection,
      treasureCollection, junkCollection, unlockedLocations, locations: LOCATIONS,
    };
  }

  function emitAchievement(event) {
    return achievementEngine ? achievementEngine.emit(event, achievementContext()) : [];
  }

  const achievementInitialization = achievementEngine.initialize(achievementContext());
  achievementUI = window.FishingAchievementUI.create({
    definitions: window.FishingAchievementData.ACHIEVEMENTS,
    categories: window.FishingAchievementData.CATEGORIES,
    engine: achievementEngine,
    store: achievementStore,
    getContext: achievementContext,
    getMode: () => mode,
    pause: showPause,
    onToast: (entry) => {
      const frame = entry.frame || 'common';
      play(frame === 'legendary' ? 'achievementLegendary' : (frame === 'rare' ? 'achievementRare' : 'achievement'));
      if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        vibrate(frame === 'legendary' ? [24, 45, 38, 45, 60] : (frame === 'rare' ? [22, 38, 34] : 24));
      }
    },
    hidePanels: () => {
      catalog.hidden = true;
      itemsPanel.hidden = true;
      locationsPanel.hidden = true;
      tacklePanel.hidden = true;
      basketPanel.hidden = true;
    },
    elements: {
      panel: achievementPanel,
      filters: $('achievementFilters'),
      statusFilters: $('achievementStatusFilters'),
      grid: $('achievementGrid'),
      progress: $('achievementProgress'),
      progressFill: $('achievementProgressFill'),
      dot: $('achievementDot'),
      toast: $('achievementToast'),
      toastIcon: $('achievementToastIcon'),
      toastTitle: $('achievementToastTitle'),
      toastText: $('achievementToastText'),
    },
  });
  if (achievementInitialization.firstRun) achievementUI.notifyRetroactive(achievementInitialization.unlocked.length);
  else achievementUI.render();

  function fishPoolForLocation(id) {
    const location = LOCATIONS[id] || LOCATIONS.lake;
    return location.fishIds.map((fishId) => FISH_BY_ID.get(fishId)).filter(Boolean);
  }

  function currentFishPool() {
    return fishPoolForLocation(currentLocationId);
  }

  function updateEnvironment() {
    environment = environmentForStep(environmentStep);
    const location = LOCATIONS[currentLocationId];
    ui.renderEnvironment({ label: currentLocationId === 'abyss' ? '🌌 星渊 · 深层水域' : location.icon + ' ' + location.name + ' · ' + environment.label });
  }

  function advanceEnvironment() {
    environmentStep++;
    storage.writeInt(ENV_KEY, environmentStep);
    updateEnvironment();
  }

  function saveTackle() {
    storage.writeObject(TACKLE_KEY, tackle);
  }

  function renderTackle() {
    ui.renderTackle(tackle);
  }

  function openTackle() {
    if (['casting', 'waiting', 'bite', 'hooking', 'fishing'].includes(mode)) showPause();
    catalog.hidden = true;
    itemsPanel.hidden = true;
    locationsPanel.hidden = true;
    basketPanel.hidden = true;
    renderTackle();
    tacklePanel.hidden = false;
  }

  function closeTackle() {
    tacklePanel.hidden = true;
  }

  function saveEconomy() {
    storage.writeInt(COINS_KEY, coins);
    storage.writeObject(FISH_BAG_KEY, fishBag);
  }

  function openBasket() {
    if (['casting', 'waiting', 'bite', 'hooking', 'fishing'].includes(mode)) showPause();
    catalog.hidden = true;
    itemsPanel.hidden = true;
    locationsPanel.hidden = true;
    tacklePanel.hidden = true;
    economyUI.renderBasket();
    basketPanel.hidden = false;
  }

  function closeBasket() {
    basketPanel.hidden = true;
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
    if (!sessionState.activePhases.includes(phase)) return;
    sessionState.save({
        phase: phase,
        castDistance: castDistance,
        castTime: castTime,
        castUsedPremiumBait: castUsedPremiumBait,
        waitLeft: waitLeft,
        biteLeft: biteLeft,
        hookTime: hookTime,
        fishId: fish && fish.id,
        catchableId: catchable && catchable.type !== 'fish' ? catchable.id : null,
        fishY: fishY,
        fishTarget: fishTarget,
        fishMoveLeft: fishMoveLeft,
        fishWarning: fishWarning,
        dashPending: dashPending,
        dashCount: dashCount,
        zoneY: zoneY,
        zoneV: zoneV,
        catchProgress: catchProgress,
        peakCatchProgress: peakCatchProgress,
        surgeTimer: surgeTimer,
        surgeLeft: surgeLeft,
        surgeDirection: surgeDirection,
        streak: streak,
        location: currentLocationId,
      });
  }

  function loadState() {
    return sessionState.load();
  }

  function clearState() {
    sessionState.clear();
  }

  function showResumePrompt(saved) {
    pendingResume = saved;
    mode = 'resume';
    overlay.hidden = false;
    modalEyebrow.textContent = '湖面还记得这一竿';
    modalTitle.textContent = '继续上次垂钓？';
    const hasHookedCatchable = (saved.fish && FISH_BY_ID.has(saved.fish)) || (saved.catchable && ITEM_BY_ID.has(saved.catchable));
    modalText.textContent = hasHookedCatchable ? '神秘水影 · 捕获进度 ' + Math.round((saved.catchProgress || 0) * 100) + '%' : '鱼竿和浮标都还在原处';
    modalBtn.textContent = '继续上次';
    modalNew.textContent = '新钓一局';
    modalNew.hidden = false;
    modalBack.hidden = false;
  }

  function restoreState(saved) {
    const restored = sessionState.normalize(saved, { fishById: FISH_BY_ID, itemById: ITEM_BY_ID, locations: LOCATIONS, unlockedLocations });
    castDistance = restored.castDistance;
    castTime = restored.castTime;
    castUsedPremiumBait = restored.castUsedPremiumBait;
    waitLeft = restored.waitLeft;
    biteLeft = restored.biteLeft;
    hookTime = restored.hookTime;
    fish = restored.fish;
    catchable = restored.fish ? Object.assign({ type: 'fish' }, restored.fish) : restored.item;
    if (restored.item) fish = { id: restored.item.id, behavior: 'calm', difficulty: .58 };
    fishY = restored.fishY;
    fishTarget = restored.fishTarget;
    fishMoveLeft = restored.fishMoveLeft;
    fishWarning = restored.fishWarning;
    dashPending = restored.dashPending;
    dashCount = restored.dashCount;
    zoneY = restored.zoneY;
    zoneV = restored.zoneV;
    catchProgress = restored.catchProgress;
    peakCatchProgress = restored.peakCatchProgress;
    surgeTimer = restored.surgeTimer;
    surgeLeft = restored.surgeLeft;
    surgeDirection = restored.surgeDirection;
    streak = restored.streak;
    if (restored.location) {
      currentLocationId = restored.location;
      storage.writeString(CURRENT_LOCATION_KEY, currentLocationId);
    }
    locationUI.present();
    updateEnvironment();
    if (catchable) setMysteryMarker();
    pendingResume = null;
    motionTestHold = false;
    modalNew.hidden = true;
    setMode(restored.phase);
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
      const baitLabel = tackle.selectedBait === 'premium' ? '🦐 高级鱼饵 × ' + tackle.premiumBait : '🪱 普通鱼饵';
      actionHint.textContent = streak ? '连续上鱼 ×' + streak + ' · ' + baitLabel : baitLabel + ' · 按住蓄力，松开抛竿';
    } else if (next === 'casting') {
      actionBtn.textContent = '松开抛竿';
      actionHint.textContent = '越接近右端，抛得越远';
    } else if (next === 'waiting') {
      actionBtn.textContent = '等待鱼儿…';
      actionHint.textContent = castUsedPremiumBait ? '🦐 高级鱼饵已投入 · 剩余 × ' + tackle.premiumBait + ' · 留意浮标' : '看好浮标，咬钩时立即提竿';
    } else if (next === 'bite') {
      actionBtn.disabled = false;
      actionBtn.textContent = '立即提竿！';
      actionHint.textContent = '鱼咬钩了，别让它跑掉';
      notice.hidden = false;
    } else if (next === 'fishing') {
      actionBtn.disabled = false;
      actionBtn.textContent = '按住向上';
      actionHint.textContent = currentLocationId === 'river' ? '按住上升 · 松开下沉 · 水流会轻推捕获区' : currentLocationId === 'abyss' ? '按住上升 · 松开下沉 · 声呐扫过时看清鱼影' : '按住上升 · 松开下沉 · 让鱼留在捕获区';
    } else if (next === 'hooking') {
      actionBtn.textContent = '提竿中…';
      actionHint.textContent = castUsedPremiumBait ? '🦐 高级鱼饵已生效 · 剩余 × ' + tackle.premiumBait : '鱼线绷紧了，准备遛鱼';
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
    fish = null;
    catchable = null;
    castUsedPremiumBait = false;
    overlay.hidden = true;
    modalNew.hidden = true;
    modalBack.hidden = true;
    locationUI.present();
    setMode('ready');
    play('start');
  }

  function beginCast() {
    if (mode !== 'ready') return;
    if (fishBag.length >= economy.BAG_CAPACITY) {
      actionHint.textContent = '鱼篓已满，请先出售一些鱼';
      openBasket();
      return;
    }
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
    castUsedPremiumBait = tackle.selectedBait === 'premium' && tackle.premiumBait > 0;
    if (castUsedPremiumBait) {
      tackle.premiumBait--;
      if (tackle.premiumBait <= 0) tackle.selectedBait = 'normal';
      saveTackle();
      renderTackle();
    }
    castTime = .72;
    waitLeft = (1.15 + Math.random() * 1.75) * (1 - Math.min(.15, streak * .03));
    ripple = 0;
    setMode('waiting');
    if (castUsedPremiumBait) actionHint.textContent = '🦐 高级鱼饵已投入 · 剩余 × ' + tackle.premiumBait + ' · 留意浮标';
    saveState();
    play('cast');
    vibrate(10);
  }

  function beginBite() {
    biteLeft = totalCaught < 3 ? 1.7 : 1.35;
    noticeTitle.textContent = '有东西上钩了！';
    noticeSub.textContent = '快提竿';
    notice.hidden = false;
    setMode('bite');
    notice.hidden = false;
    saveState();
    play('bite');
    vibrate([20, 35, 35]);
  }

  function chooseFish(usingPremiumBait) {
    return chooseFishForEnvironment({
      fish: currentFishPool(),
      rarityRank: RARITY_RANK,
      environment,
      castDistance,
      streak,
      premiumBait: usingPremiumBait,
    });
  }

  function setMysteryMarker() {
    const marker = fishMarker.querySelector('span');
    setMysteryArt(marker);
  }

  function hookFish() {
    if (mode !== 'bite') return;
    const usingPremiumBait = castUsedPremiumBait;
    const itemChance = tackle.magnet ? .2 : .12;
    const foundItem = Math.random() < itemChance ? chooseItem(currentLocationId, { magnet: tackle.magnet, environment }) : null;
    if (foundItem) {
      catchable = foundItem;
      fish = { id: foundItem.id, behavior: 'calm', difficulty: .58 };
    } else {
      fish = chooseFish(usingPremiumBait);
      catchable = Object.assign({ type: 'fish' }, fish);
    }
    setMysteryMarker();
    fishY = .5;
    fishTarget = .5;
    fishMoveLeft = .45;
    fishWarning = 0;
    dashPending = false;
    dashCount = 0;
    zoneY = .2;
    zoneV = 0;
    surgeTimer = 3.8 + Math.random() * 1.4;
    surgeLeft = 0;
    surgeDirection = Math.random() < .5 ? -1 : 1;
    catchProgress = catchable.type !== 'fish' ? .48 : (fish.id === 'crucian' && totalCaught === 0 ? .38 : .25);
    peakCatchProgress = catchProgress;
    hookTime = .62;
    setMode('hooking');
    if (usingPremiumBait) actionHint.textContent = '🦐 高级鱼饵已生效 · 剩余 × ' + tackle.premiumBait;
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
    achievementUI.setDeferred(true);
    emitAchievement({ type: 'biteMissed', locationId: currentLocationId, bait: castUsedPremiumBait ? 'premium' : 'normal' });
    advanceEnvironment();
    showResult(false, '反应慢了一点', '鱼儿吃掉鱼饵，溜走了。');
  }

  function updateFishing(dt) {
    const result = window.FishingCatchMechanics.step({
      fish, fishY, fishTarget, fishMoveLeft, fishWarning, dashPending, dashCount,
      zoneY, zoneV, catchProgress, surgeTimer, surgeLeft, surgeDirection,
      held, location: currentLocationId, isItem: catchable && catchable.type !== 'fish',
      totalCaught, stableHook: tackle.stableHook,
    }, dt, performance.now());
    ({ fishY, fishTarget, fishMoveLeft, fishWarning, dashPending, dashCount,
      zoneY, zoneV, catchProgress, surgeTimer, surgeLeft, surgeDirection } = result.state);
    peakCatchProgress = Math.max(peakCatchProgress, catchProgress);
    fishMarker.classList.toggle('is-warning', result.events.fishWarning);
    catchZone.classList.toggle('is-catching', result.events.inside);
    if (currentLocationId === 'coast') {
      currentIndicator.textContent = result.events.surgeText;
      currentIndicator.classList.toggle('is-warning', result.events.surgeWarning);
      currentIndicator.classList.toggle('is-active', result.events.surgeActive);
    } else if (currentLocationId === 'abyss') {
      const sonarPhase = performance.now() % 1400;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const sonarActive = !reducedMotion && sonarPhase < 550;
      stage.classList.toggle('is-sonar-active', sonarActive);
      currentIndicator.textContent = reducedMotion ? '声呐持续显示' : sonarActive ? '声呐扫描中' : '下一次声呐 · ' + Math.max(1, Math.ceil((1400 - sonarPhase) / 1000)) + 's';
      currentIndicator.classList.toggle('is-active', sonarActive);
    }
    if (result.events.wave) { play('wave'); vibrate(12); }
    if (result.events.outcome === 'caught') beginCatchFinish();
    else if (result.events.outcome === 'lost') loseFish();
  }

  function beginCatchFinish() {
    achievementUI.setDeferred(true);
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
    if (catchable && catchable.type !== 'fish') {
      catchItem(catchable);
      return;
    }
    const weight = Math.round(fish.min + Math.random() * (fish.max - fish.min));
    const grade = sizeGrade(fish, weight);
    const caughtEnvironment = environment.label.replace(/^[^ ]+ /, '');
    const isRecord = weight > bestWeight;
    const species = collectionUI.recordFish(fish, weight);
    const value = economy.fishValue(fish, weight);
    fishBag.push({ id: fish.id, weight: weight, value: value });
    saveEconomy();
    totalCaught++;
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    bestWeight = Math.max(bestWeight, weight);
    saveStats();
    updateHud();
    economyUI.renderBar();
    if (species.speciesRecord && !species.first) emitAchievement({ type: 'weightRecord', fishId: fish.id, weight });
    emitAchievement({
      type: 'fishCaught', fishId: fish.id, rarity: fish.rarity, behavior: fish.behavior,
      locationId: currentLocationId, weight, sizeRank: grade,
      bait: castUsedPremiumBait ? 'premium' : 'normal', stableHook: tackle.stableHook,
      time: environment.time, weather: environment.weather,
    });
    caughtFlash = 1;
    const badges = [];
    const caughtLocation = LOCATIONS[currentLocationId] || LOCATIONS.lake;
    if (species.first) badges.push('✨ 新物种发现！');
    if (species.speciesRecord) badges.push('🏆 单鱼新纪录！');
    if (isRecord) badges.push(caughtLocation.weightRecordLabel);
    if (species.newlyUnlocked.includes('river')) badges.push('🏞️ 发现新钓场：清溪！');
    if (species.newlyUnlocked.includes('coast')) badges.push('🌊 海风带来新的方向 · 潮汐湾已解锁！');
    const title = fish.rarity === '传说' ? caughtLocation.legendaryTitle : '钓到了！';
    const baitFeedback = castUsedPremiumBait ? '\n🦐 本次使用了高级鱼饵' : '';
    const text = fish.name + ' · ' + fish.rarity + '\n' + formatWeight(weight) + ' · ' + grade + ' · 估价 ' + value + ' 🪙\n' + caughtEnvironment + baitFeedback + (badges.length ? '\n' + badges.join(' · ') : '');
    clearState();
    advanceEnvironment();
    beginReveal({ fish: fish, title: title, text: text });
  }

  function catchItem(item) {
    const recorded = collectionUI.recordItem(item);
    const first = recorded.first;
    const itemCount = recorded.count;
    const newlyUnlocked = recorded.newlyUnlocked;
    emitAchievement({ type: 'itemCaught', itemId: item.id, itemType: item.type, locationId: currentLocationId });
    if (item.type === 'treasure') {
      tackle.premiumBait = Math.min(economy.MAX_BAIT, tackle.premiumBait + 1);
      saveTackle();
    }
    caughtFlash = 1;
    const treasure = item.type === 'treasure';
    const title = treasure && first ? 'NEW! ' + item.name : (treasure ? '再次发现' + item.name : '捞到了……');
    const collectionFeedback = treasure ? (first ? '\n✨ 首次发现 · 已登记到水边收藏' : '\n水边收藏 · 已发现 × ' + itemCount) : '';
    const unlockFeedback = newlyUnlocked.includes('coast') ? '\n🌊 海风带来新的方向 · 潮汐湾已解锁！' : '';
    const text = item.name + ' · ' + item.rarity + '\n' + item.line + collectionFeedback + (treasure ? '\n🦐 获得高级鱼饵 × 1' : '') + unlockFeedback;
    clearState();
    advanceEnvironment();
    beginReveal({ item: item, title: title, text: text, first: first });
  }

  function beginReveal(result) {
    pendingCatchResult = result;
    const isFish = !!result.fish;
    const rank = isFish ? RARITY_RANK[result.fish.rarity] : (result.item.type === 'treasure' ? 2 : 0);
    revealLeft = [.72, .86, 1.05, 1.32][rank];
    setMode('reveal');
    catchReveal.dataset.rarity = isFish ? result.fish.rarity : (result.item.type === 'treasure' ? '稀有' : '常见');
    catchReveal.dataset.kind = isFish ? 'fish' : result.item.type;
    catchReveal.dataset.first = !isFish && result.item.type === 'treasure' && result.first ? 'true' : 'false';
    if (isFish) setFishSprite(revealFish, result.fish); else setCatchableArt(revealFish, result.item);
    revealTitle.textContent = result.title;
    revealRarity.textContent = isFish ? result.fish.rarity : result.item.rarity;
    catchReveal.hidden = false;
    play('splash');
    setTimeout(() => play(isFish ? (rank >= 2 ? 'rare' : 'success') : (result.item.type === 'treasure' ? 'treasure' : 'junk')), 170);
    vibrate(rank === 3 ? [28, 35, 65, 35, 90] : rank === 2 ? [24, 35, 60] : [20, 30, 42]);
  }

  function finishReveal() {
    if (!pendingCatchResult) return;
    const result = pendingCatchResult;
    pendingCatchResult = null;
    showResult(true, result.title, result.text, result.fish, result.item);
  }

  function loseFish() {
    const lostProgress = peakCatchProgress;
    streak = 0;
    updateHud();
    achievementUI.setDeferred(true);
    emitAchievement({
      type: 'fishEscaped', fishId: fish && fish.id, rarity: fish && fish.rarity,
      locationId: currentLocationId, progress: lostProgress,
      bait: castUsedPremiumBait ? 'premium' : 'normal', stableHook: tackle.stableHook,
      time: environment.time, weather: environment.weather,
    });
    play('lose');
    advanceEnvironment();
    showResult(false, '鱼儿脱钩了', '这条鱼很有力气。\n调整节奏，再试一次吧。');
  }

  function showResult(success, title, text, caughtFish, caughtItem) {
    clearState();
    setMode('result');
    overlay.hidden = false;
    modalEyebrow.textContent = caughtFish ? (caughtFish.rarity === '传说' ? '传说现身' : '本次收获 · ' + caughtFish.rarity) : (caughtItem ? '水底意外收获' : (success ? '本次收获' : '差一点点'));
    resultFish.hidden = !caughtFish && !caughtItem;
    if (caughtFish) {
      setFishSprite(resultFish, caughtFish);
      resultFish.dataset.rarity = caughtFish.rarity;
    } else if (caughtItem) {
      setCatchableArt(resultFish, caughtItem);
      resultFish.dataset.rarity = caughtItem.type === 'treasure' ? '稀有' : '常见';
    }
    modalTitle.textContent = title;
    modalText.textContent = text;
    modalBtn.textContent = '再钓一竿';
    modalNew.textContent = '选择钓场';
    modalNew.hidden = false;
    modalBack.hidden = false;
    achievementUI.setDeferred(false);
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
    const baseZoneRatio = catchable && catchable.type !== 'fish' ? .44 : (fish.id === 'crucian' && totalCaught === 0 ? .38 : .32);
    const zonePx = Math.max(72, Math.min(118, height * baseZoneRatio * (tackle.stableHook ? 1.1 : 1)));
    catchZone.style.height = zonePx + 'px';
    catchZone.style.bottom = 'calc(' + Math.round(zoneY * 100) + '% - ' + Math.round(zonePx / 2) + 'px)';
    fishMarker.style.bottom = 'calc(' + Math.round(fishY * 100) + '% - 17px)';
    progressFill.style.width = Math.round(catchProgress * 100) + '%';
  }

  const sceneRenderer = window.FishingSceneRenderer.create({ canvas, stage, context: ctx });
  const resize = sceneRenderer.resize;

  function drawScene(time) {
    sceneRenderer.draw(time, { currentLocationId, environment, mode, power, castDistance, castTime, hookTime, finishLeft, ripple, caughtFlash });
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
    else if (mode === 'menu') locationUI.open();
    else startSession();
  });
  modalNew.addEventListener('click', () => {
    if (mode === 'menu') collectionUI.openCatalog();
    else if (mode === 'result') locationUI.open();
    else startSession();
  });
  locationBtn.addEventListener('click', () => { achievementUI.close(); locationUI.open(); });
  locationsClose.addEventListener('click', locationUI.close);
  locationsGrid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-location]');
    if (button && !button.disabled) locationUI.select(button.dataset.location);
  });
  catalogBtn.addEventListener('click', () => { achievementUI.close(); collectionUI.openCatalog(); });
  catalogClose.addEventListener('click', collectionUI.closeCatalog);
  itemsBtn.addEventListener('click', () => { achievementUI.close(); collectionUI.openItems(); });
  itemsClose.addEventListener('click', collectionUI.closeItems);
  tackleBtn.addEventListener('click', () => { achievementUI.close(); openTackle(); });
  tackleClose.addEventListener('click', closeTackle);
  basketBtn.addEventListener('click', () => { achievementUI.close(); openBasket(); });
  basketClose.addEventListener('click', closeBasket);
  achievementBtn.addEventListener('click', achievementUI.open);
  achievementClose.addEventListener('click', achievementUI.close);
  sellAllBtn.addEventListener('click', economyUI.sellAll);
  basketList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-sell-index]');
    if (button) economyUI.sellAt(Number(button.dataset.sellIndex), button.closest('.basket-row'));
  });
  buyBaitBtn.addEventListener('click', economyUI.buyPremiumBait);
  tacklePanel.addEventListener('click', (event) => {
    const bait = event.target.closest('[data-bait]');
    if (bait && !bait.disabled) {
      tackle.selectedBait = bait.dataset.bait;
      saveTackle();
      renderTackle();
      return;
    }
    const gear = event.target.closest('[data-gear]');
    if (gear) {
      tackle[gear.dataset.gear] = !tackle[gear.dataset.gear];
      saveTackle();
      renderTackle();
    }
  });
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
  saveTackle();
  saveEconomy();
  locationUI.refreshUnlocks();
  locationUI.present();
  updateEnvironment();
  setMysteryArt(fishMarker.querySelector('span'));
  updateHud();
  economyUI.renderBar();
  resize();
  const savedState = loadState();
  if (savedState) showResumePrompt(savedState);
  else locationUI.open();
  requestAnimationFrame(frame);

  window.__fishingTest = {
    getState: () => ({ mode, power, castDistance, waitLeft, biteLeft, fish: catchable && catchable.type === 'fish' ? fish.id : null, catchable: catchable && catchable.id, catchableType: catchable && catchable.type, fishY, zoneY, zoneV, catchProgress, peakCatchProgress, surgeTimer, surgeLeft, surgeDirection, totalCaught, bestWeight, streak, bestStreak, muted: audio.isMuted(), tackle: Object.assign({}, tackle), coins, fishBag: fishBag.slice(), currentLocationId, unlockedLocations: unlockedLocations.slice(), environmentStep, environment: environment.time + '-' + environment.weather }),
    getLocations: () => Object.values(LOCATIONS).map((location) => ({
      id: location.id,
      name: location.name,
      unlocked: unlockedLocations.includes(location.id),
      progress: progressFor(location, collection),
    })),
    openLocations: locationUI.open,
    openItems: collectionUI.openItems,
    openTackle,
    openBasket,
    sellAllFish: economyUI.sellAll,
    buyPremiumBait: economyUI.buyPremiumBait,
    selectLocation: locationUI.select,
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
      if (!fish) fish = currentFishPool()[0];
      hookTime = .62 * (1 - Math.max(0, Math.min(.9, Number(progress) || 0)));
      setMode('hooking');
    },
    startFishing: startFishing,
    finish: beginCatchFinish,
    showFinish: (progress) => {
      if (!fish) fish = currentFishPool()[0];
      motionTestHold = true;
      catchProgress = 1;
      finishLeft = .68 * (1 - Math.max(0, Math.min(.9, Number(progress) || 0)));
      mode = 'finishing';
    },
    setFish: (id) => { fish = FISH_BY_ID.get(id) || currentFishPool()[0]; },
    setProgress: (value) => { catchProgress = Math.max(0, Math.min(1, Number(value))); peakCatchProgress = Math.max(peakCatchProgress, catchProgress); },
    setEnvironment: (time, weather) => {
      const index = ENVIRONMENTS.findIndex((item) => item.time === time && item.weather === weather);
      if (index >= 0) { environmentStep = index * 4; updateEnvironment(); }
    },
    sampleFish: (count) => Array.from({ length: Math.max(1, Number(count) || 1) }, () => chooseFish().id),
    showReveal: (id) => {
      const item = FISH_BY_ID.get(id) || currentFishPool()[0];
      const location = LOCATIONS[currentLocationId] || LOCATIONS.lake;
      beginReveal({ fish: item, title: item.rarity === '传说' ? location.legendaryTitle : '钓到了！', text: item.name });
      revealLeft = 999;
    },
    getAchievements: () => ({
      definitions: window.FishingAchievementData.ACHIEVEMENTS,
      state: achievementEngine.getState(),
      queued: achievementUnlockQueue.map((entry) => ({ id: entry.definition.id, retroactive: entry.retroactive })),
    }),
    emitAchievement: (event) => emitAchievement(event),
  };
})();
