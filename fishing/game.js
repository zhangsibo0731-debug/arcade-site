(function () {
  'use strict';

  if (!window.FishingFishData || !window.FishingRiverFishData || !window.FishingCatchables || !window.FishingEconomy || !window.FishingEnvironments || !window.FishingLocations || !window.FishingStorage || !window.FishingAudio || !window.FishingUI) {
    throw new Error('Fishing data modules failed to load.');
  }

  const { FISH, RARITY_RANK } = window.FishingFishData;
  const { RIVER_FISH } = window.FishingRiverFishData;
  const ALL_FISH = FISH.concat(RIVER_FISH);
  const FISH_BY_ID = new Map(ALL_FISH.map((item) => [item.id, item]));
  const { ITEMS, ITEM_BY_ID, choose: chooseItem } = window.FishingCatchables;
  const economy = window.FishingEconomy;
  const { ENVIRONMENTS, environmentForStep, chooseFish: chooseFishForEnvironment } = window.FishingEnvironments;
  const { LOCATIONS, resolveUnlocked, progressFor } = window.FishingLocations;
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
  const premiumBaitCount = $('premiumBaitCount');
  const basketBtn = $('basketBtn');
  const basketPanel = $('basketPanel');
  const basketClose = $('basketClose');
  const basketList = $('basketList');
  const basketSummary = $('basketSummary');
  const sellAllBtn = $('sellAllBtn');
  const buyBaitBtn = $('buyBaitBtn');
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
      tacklePanel,
      premiumBaitCount,
      coinCount,
      bagCount,
      basketList,
      basketSummary,
      sellAllBtn,
      buyBaitBtn,
    },
  });
  const setFishSprite = ui.setFishSprite;
  const setCatchableArt = ui.setCatchableArt;

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
  let itemCollection = storage.readObject(ITEM_COLLECTION_KEY, {});
  let tackle = economy.normalizeTackle(storage.readObject(TACKLE_KEY, {}));
  let coins = economy.normalizeCoins(storage.readInt(COINS_KEY));
  let fishBag = economy.normalizeBag(storage.readObject(FISH_BAG_KEY, []), FISH_BY_ID);
  let unlockedLocations = resolveUnlocked(collection, storage.readObject(UNLOCKED_LOCATIONS_KEY, ['lake']));
  let currentLocationId = storage.readString(CURRENT_LOCATION_KEY, 'lake');
  if (!LOCATIONS[currentLocationId] || !unlockedLocations.includes(currentLocationId)) currentLocationId = 'lake';
  let environmentStep = storage.readInt(ENV_KEY);
  let environment = environmentForStep(environmentStep);

  function fishPoolForLocation(id) {
    const location = LOCATIONS[id] || LOCATIONS.lake;
    return location.fishIds.map((fishId) => FISH_BY_ID.get(fishId)).filter(Boolean);
  }

  function currentFishPool() {
    return fishPoolForLocation(currentLocationId);
  }

  function updateLocationPresentation() {
    stage.dataset.location = currentLocationId;
    currentIndicator.hidden = currentLocationId !== 'river';
  }

  function updateEnvironment() {
    environment = environmentForStep(environmentStep);
    const location = LOCATIONS[currentLocationId];
    ui.renderEnvironment({ label: location.icon + ' ' + location.name + ' · ' + environment.label });
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

  function refreshLocationUnlocks() {
    const next = resolveUnlocked(collection, unlockedLocations);
    const newlyUnlocked = next.filter((id) => !unlockedLocations.includes(id));
    unlockedLocations = next;
    storage.writeObject(UNLOCKED_LOCATIONS_KEY, unlockedLocations);
    storage.writeString(CURRENT_LOCATION_KEY, currentLocationId);
    return newlyUnlocked;
  }

  function recordCatch(item, weight) {
    const previous = collection[item.id] || { count: 0, best: 0 };
    const first = previous.count === 0;
    const speciesRecord = weight > previous.best;
    collection[item.id] = { count: previous.count + 1, best: Math.max(previous.best, weight) };
    saveCollection();
    const newlyUnlocked = refreshLocationUnlocks();
    return { first, speciesRecord, newlyUnlocked };
  }

  function renderCatalog() {
    const location = LOCATIONS[currentLocationId];
    ui.renderCatalog(collection, currentFishPool(), currentLocationId === 'river' ? 'CLEARSTREAM COLLECTION' : 'MOONLAKE COLLECTION');
  }

  function openCatalog() {
    if (['casting', 'waiting', 'bite', 'hooking', 'fishing'].includes(mode)) showPause();
    locationsPanel.hidden = true;
    itemsPanel.hidden = true;
    tacklePanel.hidden = true;
    basketPanel.hidden = true;
    renderCatalog();
    catalog.hidden = false;
  }

  function closeCatalog() {
    catalog.hidden = true;
  }

  function openItems() {
    if (['ready', 'casting', 'waiting', 'bite', 'hooking', 'fishing'].includes(mode)) showPause();
    locationsPanel.hidden = true;
    catalog.hidden = true;
    tacklePanel.hidden = true;
    basketPanel.hidden = true;
    ui.renderItems(ITEMS, itemCollection);
    itemsPanel.hidden = false;
  }

  function closeItems() {
    itemsPanel.hidden = true;
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

  function renderEconomyBar() {
    ui.renderEconomyBar({ coins, bagCount: fishBag.length, capacity: economy.BAG_CAPACITY });
  }

  function renderBasket() {
    const total = economy.bagValue(fishBag);
    ui.renderBasket(fishBag, coins, {
      total,
      capacity: economy.BAG_CAPACITY,
      packPrice: economy.premiumBaitPack.price,
    });
  }

  function openBasket() {
    if (['casting', 'waiting', 'bite', 'hooking', 'fishing'].includes(mode)) showPause();
    catalog.hidden = true;
    itemsPanel.hidden = true;
    locationsPanel.hidden = true;
    tacklePanel.hidden = true;
    renderBasket();
    basketPanel.hidden = false;
  }

  function closeBasket() {
    basketPanel.hidden = true;
  }

  function sellAllFish() {
    if (!fishBag.length) return;
    coins = Math.min(economy.MAX_COINS, coins + economy.bagValue(fishBag));
    fishBag = [];
    saveEconomy();
    renderEconomyBar();
    renderBasket();
    play('success');
  }

  function buyPremiumBait() {
    const pack = economy.premiumBaitPack;
    if (coins < pack.price) return;
    coins -= pack.price;
    tackle.premiumBait = Math.min(economy.MAX_BAIT, tackle.premiumBait + pack.amount);
    saveTackle();
    saveEconomy();
    renderEconomyBar();
    renderBasket();
    play('success');
  }

  function locationViewModels() {
    const discovered = window.FishingLocations.discoveredFishCount(collection);
    return Object.values(LOCATIONS).map((location) => {
      const progress = progressFor(location, collection);
      const unlocked = unlockedLocations.includes(location.id);
      const available = unlocked && location.fishIds.length > 0;
      const needed = location.unlock === 'default' ? 0 : Math.max(0, location.unlock.discoveredFish - discovered);
      return {
        id: location.id,
        name: location.name,
        icon: location.icon,
        subtitle: location.subtitle,
        unlocked,
        available,
        current: currentLocationId === location.id,
        progressText: progress.total ? '图鉴 ' + progress.found + ' / ' + progress.total : (unlocked ? '新鱼资料整理中' : '再发现 ' + needed + ' 种鱼即可解锁'),
        actionText: available ? (currentLocationId === location.id ? '继续在这里钓鱼' : '前往' + location.name) : (unlocked ? '即将开放' : '🔒 未解锁'),
      };
    });
  }

  function openLocations() {
    if (['ready', 'casting', 'waiting', 'bite', 'hooking', 'fishing'].includes(mode)) showPause();
    catalog.hidden = true;
    itemsPanel.hidden = true;
    tacklePanel.hidden = true;
    basketPanel.hidden = true;
    ui.renderLocations(locationViewModels());
    locationsPanel.hidden = false;
  }

  function closeLocations() {
    locationsPanel.hidden = true;
  }

  function selectLocation(id) {
    if (!LOCATIONS[id] || !LOCATIONS[id].fishIds.length || !unlockedLocations.includes(id)) return;
    currentLocationId = id;
    storage.writeString(CURRENT_LOCATION_KEY, currentLocationId);
    updateLocationPresentation();
    updateEnvironment();
    closeLocations();
    startSession();
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
        catchable: catchable && catchable.type !== 'fish' ? catchable.id : null,
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
        location: currentLocationId,
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
    const hasHookedCatchable = (saved.fish && FISH_BY_ID.has(saved.fish)) || (saved.catchable && ITEM_BY_ID.has(saved.catchable));
    modalText.textContent = hasHookedCatchable ? '神秘水影 · 捕获进度 ' + Math.round((saved.catchProgress || 0) * 100) + '%' : '鱼竿和浮标都还在原处';
    modalBtn.textContent = '继续上次';
    modalNew.textContent = '新钓一局';
    modalNew.hidden = false;
    modalBack.hidden = false;
  }

  function restoreState(saved) {
    const restoredFish = saved.fish && FISH_BY_ID.get(saved.fish);
    const restoredItem = saved.catchable && ITEM_BY_ID.get(saved.catchable);
    let phase = saved.phase;
    if (!['ready', 'waiting', 'bite', 'hooking', 'fishing'].includes(phase)) phase = 'ready';
    if (['hooking', 'fishing'].includes(phase) && !restoredFish && !restoredItem) phase = 'ready';
    castDistance = Number(saved.castDistance) || .55;
    castTime = Math.max(0, Number(saved.castTime) || 0);
    waitLeft = Math.max(.4, Number(saved.waitLeft) || .4);
    biteLeft = Math.max(.8, Number(saved.biteLeft) || .8);
    hookTime = Math.max(.15, Number(saved.hookTime) || .15);
    fish = restoredFish || null;
    catchable = restoredFish ? Object.assign({ type: 'fish' }, restoredFish) : (restoredItem || null);
    if (restoredItem) fish = { id: restoredItem.id, behavior: 'calm', difficulty: .58 };
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
    if (saved.location && LOCATIONS[saved.location] && unlockedLocations.includes(saved.location)) {
      currentLocationId = saved.location;
      storage.writeString(CURRENT_LOCATION_KEY, currentLocationId);
    }
    updateLocationPresentation();
    updateEnvironment();
    if (catchable) setMysteryMarker();
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
      actionHint.textContent = '看好浮标，咬钩时立即提竿';
    } else if (next === 'bite') {
      actionBtn.disabled = false;
      actionBtn.textContent = '立即提竿！';
      actionHint.textContent = '鱼咬钩了，别让它跑掉';
      notice.hidden = false;
    } else if (next === 'fishing') {
      actionBtn.disabled = false;
      actionBtn.textContent = '按住向上';
      actionHint.textContent = currentLocationId === 'river' ? '按住上升 · 松开下沉 · 水流会轻推捕获区' : '按住上升 · 松开下沉 · 让鱼留在捕获区';
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
    fish = null;
    catchable = null;
    overlay.hidden = true;
    modalNew.hidden = true;
    modalBack.hidden = true;
    updateLocationPresentation();
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
    if (catchable && catchable.type !== 'fish') setCatchableArt(marker, catchable);
    else setFishSprite(marker, currentFishPool()[0]);
  }

  function hookFish() {
    if (mode !== 'bite') return;
    const usingPremiumBait = tackle.selectedBait === 'premium' && tackle.premiumBait > 0;
    const itemChance = tackle.magnet ? .2 : .12;
    const foundItem = Math.random() < itemChance ? chooseItem(currentLocationId, { magnet: tackle.magnet }) : null;
    if (foundItem) {
      catchable = foundItem;
      fish = { id: foundItem.id, behavior: 'calm', difficulty: .58 };
    } else {
      if (usingPremiumBait) {
        tackle.premiumBait--;
        if (tackle.premiumBait <= 0) tackle.selectedBait = 'normal';
        saveTackle();
      }
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
    catchProgress = catchable.type !== 'fish' ? .48 : (fish.id === 'crucian' && totalCaught === 0 ? .38 : .25);
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
    if (currentLocationId === 'river') zoneV += Math.sin(performance.now() / 720) * .34 * dt;
    zoneV *= Math.pow(.2, dt);
    zoneV = Math.max(-.88, Math.min(.84, zoneV));
    zoneY += zoneV * dt;
    const baseZoneHalf = catchable && catchable.type !== 'fish' ? .22 : (fish.id === 'crucian' && totalCaught === 0 ? .19 : .16);
    const zoneHalf = baseZoneHalf * (tackle.stableHook ? 1.1 : 1);
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
    if (catchable && catchable.type !== 'fish') {
      catchItem(catchable);
      return;
    }
    const weight = Math.round(fish.min + Math.random() * (fish.max - fish.min));
    const grade = sizeGrade(fish, weight);
    const caughtEnvironment = environment.label.replace(/^[^ ]+ /, '');
    const isRecord = weight > bestWeight;
    const species = recordCatch(fish, weight);
    const value = economy.fishValue(fish, weight);
    fishBag.push({ id: fish.id, weight: weight, value: value });
    saveEconomy();
    totalCaught++;
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    bestWeight = Math.max(bestWeight, weight);
    saveStats();
    updateHud();
    renderEconomyBar();
    caughtFlash = 1;
    const badges = [];
    if (species.first) badges.push('✨ 新物种发现！');
    if (species.speciesRecord) badges.push('🏆 单鱼新纪录！');
    if (isRecord) badges.push(currentLocationId === 'river' ? '本溪最大重量！' : '本湖最大重量！');
    if (species.newlyUnlocked.includes('river')) badges.push('🏞️ 发现新钓场：清溪！');
    const title = fish.rarity === '传说' ? (currentLocationId === 'river' ? '溪谷传说！' : '月光奇迹！') : '钓到了！';
    const text = fish.name + ' · ' + fish.rarity + '\n' + formatWeight(weight) + ' · ' + grade + ' · 估价 ' + value + ' 🪙\n' + caughtEnvironment + (badges.length ? '\n' + badges.join(' · ') : '');
    clearState();
    advanceEnvironment();
    beginReveal({ fish: fish, title: title, text: text });
  }

  function catchItem(item) {
    const first = !itemCollection[item.id];
    itemCollection[item.id] = (Number(itemCollection[item.id]) || 0) + 1;
    storage.writeObject(ITEM_COLLECTION_KEY, itemCollection);
    if (item.type === 'treasure') {
      tackle.premiumBait = Math.min(economy.MAX_BAIT, tackle.premiumBait + 1);
      saveTackle();
    }
    caughtFlash = 1;
    const title = item.type === 'treasure' ? '发现了宝物！' : '捞到了……';
    const text = item.name + ' · ' + item.rarity + '\n' + item.line + (first && item.type === 'treasure' ? '\n✨ 已登记到水边收藏' : '') + (item.type === 'treasure' ? '\n🦐 获得高级鱼饵 × 1' : '');
    clearState();
    advanceEnvironment();
    beginReveal({ item: item, title: title, text: text });
  }

  function beginReveal(result) {
    pendingCatchResult = result;
    const isFish = !!result.fish;
    const rank = isFish ? RARITY_RANK[result.fish.rarity] : (result.item.type === 'treasure' ? 2 : 0);
    revealLeft = [.72, .86, 1.05, 1.32][rank];
    setMode('reveal');
    catchReveal.dataset.rarity = isFish ? result.fish.rarity : (result.item.type === 'treasure' ? '稀有' : '常见');
    if (isFish) setFishSprite(revealFish, result.fish); else setCatchableArt(revealFish, result.item);
    revealTitle.textContent = result.title;
    revealRarity.textContent = isFish ? result.fish.rarity : result.item.rarity;
    catchReveal.hidden = false;
    play('splash');
    setTimeout(() => play(rank >= 2 ? 'rare' : 'success'), 170);
    vibrate(rank === 3 ? [28, 35, 65, 35, 90] : rank === 2 ? [24, 35, 60] : [20, 30, 42]);
  }

  function finishReveal() {
    if (!pendingCatchResult) return;
    const result = pendingCatchResult;
    pendingCatchResult = null;
    showResult(true, result.title, result.text, result.fish, result.item);
  }

  function loseFish() {
    streak = 0;
    updateHud();
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
    const isRiver = currentLocationId === 'river';
    const lakeY = h * (isRiver ? .43 : .48);
    const isNight = environment.time === 'night';
    const isDusk = environment.time === 'dusk';
    const isRain = environment.weather === 'rain';
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, isRiver ? (isNight ? '#173a4b' : isDusk ? '#5b6a63' : '#73a9a4') : (isNight ? '#142449' : isDusk ? '#70465b' : '#5793b5'));
    grad.addColorStop(.48, isRiver ? (isNight ? '#285967' : isDusk ? '#8c8b70' : '#b7d7c5') : (isNight ? '#283f66' : isDusk ? '#c27c69' : '#9bc7d0'));
    grad.addColorStop(.49, isRiver ? (isNight ? '#164f60' : '#3f7f7d') : (isNight ? '#1c5270' : isDusk ? '#35677a' : '#34768b'));
    grad.addColorStop(1, isRiver ? (isNight ? '#092f3d' : '#1d5960') : (isNight ? '#0e2c4a' : '#16465d'));
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

    ctx.fillStyle = isRiver ? '#17352f' : '#0d1b32';
    ctx.beginPath(); ctx.moveTo(0, lakeY);
    for (let x = 0; x <= w; x += 22) ctx.lineTo(x, lakeY - 18 - ((x * 7) % 41));
    ctx.lineTo(w, lakeY + 18); ctx.lineTo(0, lakeY + 18); ctx.fill();
    ctx.strokeStyle = 'rgba(174,214,222,.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const y = lakeY + 18 + i * (h - lakeY) / 9;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const yy = y + Math.sin(x * (isRiver ? .05 : .035) + time * (isRiver ? .0027 : .0015) + i) * (isRiver ? 3 : 2);
        if (!x) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    if (isRiver) {
      ctx.fillStyle = 'rgba(194,205,178,.38)';
      for (let i = 0; i < 7; i++) {
        const rockX = ((i * 137) % 911) / 911 * w;
        const rockY = lakeY + 18 + (i % 3) * 19;
        ctx.beginPath(); ctx.ellipse(rockX, rockY, 11 + (i % 3) * 5, 5 + (i % 2) * 3, -.12, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(198,242,226,.55)';
      ctx.font = '700 12px sans-serif';
      ctx.fillText('≋', w * .5 + Math.sin(time / 700) * 22, lakeY + 62);
      ctx.fillText('≋', w * .72 + Math.sin(time / 820) * 18, lakeY + 118);
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
    else if (mode === 'menu') openLocations();
    else startSession();
  });
  modalNew.addEventListener('click', () => {
    if (mode === 'menu') openCatalog();
    else if (mode === 'result') openLocations();
    else startSession();
  });
  locationBtn.addEventListener('click', openLocations);
  locationsClose.addEventListener('click', closeLocations);
  locationsGrid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-location]');
    if (button && !button.disabled) selectLocation(button.dataset.location);
  });
  catalogBtn.addEventListener('click', openCatalog);
  catalogClose.addEventListener('click', closeCatalog);
  itemsBtn.addEventListener('click', openItems);
  itemsClose.addEventListener('click', closeItems);
  tackleBtn.addEventListener('click', openTackle);
  tackleClose.addEventListener('click', closeTackle);
  basketBtn.addEventListener('click', openBasket);
  basketClose.addEventListener('click', closeBasket);
  sellAllBtn.addEventListener('click', sellAllFish);
  buyBaitBtn.addEventListener('click', buyPremiumBait);
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
  refreshLocationUnlocks();
  updateLocationPresentation();
  updateEnvironment();
  setFishSprite(fishMarker.querySelector('span'), currentFishPool()[0]);
  updateHud();
  renderEconomyBar();
  resize();
  const savedState = loadState();
  if (savedState) showResumePrompt(savedState);
  else openLocations();
  requestAnimationFrame(frame);

  window.__fishingTest = {
    getState: () => ({ mode, power, castDistance, waitLeft, biteLeft, fish: catchable && catchable.type === 'fish' ? fish.id : null, catchable: catchable && catchable.id, catchableType: catchable && catchable.type, fishY, zoneY, zoneV, catchProgress, totalCaught, bestWeight, streak, bestStreak, muted: audio.isMuted(), tackle: Object.assign({}, tackle), coins, fishBag: fishBag.slice(), currentLocationId, unlockedLocations: unlockedLocations.slice(), environmentStep, environment: environment.time + '-' + environment.weather }),
    getLocations: () => Object.values(LOCATIONS).map((location) => ({
      id: location.id,
      name: location.name,
      unlocked: unlockedLocations.includes(location.id),
      progress: progressFor(location, collection),
    })),
    openLocations,
    openItems,
    openTackle,
    openBasket,
    sellAllFish,
    buyPremiumBait,
    selectLocation,
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
    setProgress: (value) => { catchProgress = Math.max(0, Math.min(1, Number(value))); },
    setEnvironment: (time, weather) => {
      const index = ENVIRONMENTS.findIndex((item) => item.time === time && item.weather === weather);
      if (index >= 0) { environmentStep = index * 4; updateEnvironment(); }
    },
    sampleFish: (count) => Array.from({ length: Math.max(1, Number(count) || 1) }, () => chooseFish().id),
    showReveal: (id) => {
      const item = FISH_BY_ID.get(id) || currentFishPool()[0];
      beginReveal({ fish: item, title: item.rarity === '传说' ? (currentLocationId === 'river' ? '溪谷传说！' : '月光奇迹！') : '钓到了！', text: item.name });
      revealLeft = 999;
    },
  };
})();
