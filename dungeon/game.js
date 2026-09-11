(function () {
  'use strict';
  const R = window.DungeonCombatRules;
  const E = window.DungeonEquipment;
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const ui = Object.fromEntries(['hp','kills','weaponBtn','message','skillCd','dashCd','result','resultTitle','resultText','lootPanel','lootName','lootDescription','lootRarity','currentEquipment','newEquipment','weaponSlot','armorSlot','charmSlot'].map((id) => [id, document.getElementById(id)]));
  const bounds = { left: 16, right: 344, top: 18, bottom: 502 };
  const held = new Set();
  const stick = { x: 0, y: 0, pointer: null };
  let game, last = 0, accumulator = 0;

  function enemy(type, x, y) {
    const data = { chaser: [7, 44], charger: [9, 36], ranged: [6, 32] }[type];
    return { type, x, y, r: 14, hp: data[0], maxHp: data[0], speed: data[1], cooldown: .8 + Math.random(), state: 'move', timer: 0, dir: { x: 0, y: 1 }, dead: false };
  }
  function reset() {
    game = {
      mode: 'ready', kills: 0, weapon: 'sword', time: 0, bullets: [], effects: [], drops: [], pendingLoot: null, shake: 0, rangeHint: 2.5,
      equipment: { weapon: 'moon-blade', armor: null, charm: null },
      player: { x: 180, y: 430, r: 12, hp: 8, maxHp: 8, speed: 142, attackCd: 0, skillCd: 0, dashCd: 0, dashLeft: 0, trailCd: 0, invuln: 0, face: { x: 0, y: -1 } },
      enemies: [enemy('chaser', 75, 90), enemy('charger', 285, 145), enemy('ranged', 80, 255)],
    };
    ui.resultTitle.textContent = '选择初始武器';
    ui.resultText.textContent = '点击上方武器可切换月牙剑或星辉弓。准备好后开始战斗。';
    document.getElementById('restartBtn').textContent = '开始战斗';
    ui.result.hidden = false;
    ui.message.textContent = '月牙剑是近战，星辉弓是远程。';
    renderUi();
  }
  function inputVector() {
    let x = stick.x, y = stick.y;
    if (held.has('left')) x -= 1; if (held.has('right')) x += 1;
    if (held.has('up')) y -= 1; if (held.has('down')) y += 1;
    return R.normalize(x, y);
  }
  function damageEnemy(target, amount) {
    if (!target || target.dead) return;
    target.hp -= amount;
    game.effects.push({ type: 'hit', x: target.x, y: target.y, life: .18 });
    if (target.hp <= 0) {
      target.dead = true; game.kills++;
      game.effects.push({ type: 'burst', x: target.x, y: target.y, life: .45 });
      const item = E.ITEMS[(game.kills * 3 + Math.floor(Math.random() * E.ITEMS.length)) % E.ITEMS.length];
      game.drops.push({ x: target.x, y: target.y, r: 9, item, rarity: E.rarity(), pulse: 0 });
      if (game.equipment.charm === 'blood-ring' && game.kills % 3 === 0) game.player.hp = Math.min(game.player.maxHp, game.player.hp + 1);
    }
  }
  function damagePlayer(amount) {
    const p = game.player;
    if (p.invuln > 0 || game.mode !== 'playing') return;
    p.hp = Math.max(0, p.hp - amount); p.invuln = 1.1; game.shake = 8;
    ui.message.textContent = '受到了伤害，注意红色攻击预警。';
    if (!p.hp) finish(false);
  }
  function fire(from, target, owner, speed, damage) {
    const dir = R.normalize(target.x - from.x, target.y - from.y);
    game.bullets.push({ x: from.x, y: from.y, vx: dir.x * speed, vy: dir.y * speed, r: owner === 'player' ? 4 : 5, owner, damage, dead: false });
  }
  function autoAttack(dt) {
    const p = game.player;
    p.attackCd -= dt;
    const range = game.weapon === 'sword' ? 68 : 290;
    const target = R.nearest(p, game.enemies, range);
    if (!target || p.attackCd > 0) return;
    p.face = R.normalize(target.x - p.x, target.y - p.y);
    if (game.weapon === 'sword') {
      damageEnemy(target, 1);
      const angle = Math.atan2(target.y - p.y, target.x - p.x);
      game.effects.push({ type: 'slash', x: p.x, y: p.y, angle, life: .22 });
      const push = R.normalize(target.x - p.x, target.y - p.y);
      R.moveInside(target, push.x * 34, push.y * 34, 1, bounds);
      p.attackCd = .48;
    }
    else { const staff = game.weapon === 'staff'; fire(p, target, 'player', staff ? 220 : 330, 1); game.bullets.at(-1).aoe = staff; p.attackCd = staff ? .92 : .68; }
  }
  function updateEnemy(e, dt) {
    if (e.dead) return;
    const p = game.player;
    const toward = R.normalize(p.x - e.x, p.y - e.y);
    e.cooldown -= dt;
    if (e.type === 'charger') {
      if (e.state === 'warn') { e.timer -= dt; if (e.timer <= 0) { e.state = 'dash'; e.timer = .34; } }
      else if (e.state === 'dash') { R.moveInside(e, e.dir.x * 300, e.dir.y * 300, dt, bounds); e.timer -= dt; if (e.timer <= 0) { e.state = 'move'; e.cooldown = 1.7; } }
      else if (e.cooldown <= 0) { e.state = 'warn'; e.timer = .72; e.warnMax = e.timer; e.dir = toward; }
      else R.moveInside(e, toward.x * e.speed, toward.y * e.speed, dt, bounds);
    } else if (e.type === 'ranged') {
      const d = R.distance(e, p);
      if (e.state === 'warn') { e.timer -= dt; if (e.timer <= 0) { fire(e, p, 'enemy', 190, 1); e.state = 'move'; e.cooldown = 1.7; } }
      else if (e.cooldown <= 0 && d < 280) { e.state = 'warn'; e.timer = .65; e.warnMax = e.timer; e.dir = toward; }
      else if (d < 145) R.moveInside(e, -toward.x * e.speed, -toward.y * e.speed, dt, bounds);
      else if (d > 220) R.moveInside(e, toward.x * e.speed, toward.y * e.speed, dt, bounds);
    } else R.moveInside(e, toward.x * e.speed, toward.y * e.speed, dt, bounds);
    if (R.circleHit(e, p)) {
      damagePlayer(1);
      e.x -= toward.x * 28;
      e.y -= toward.y * 28;
    }
  }
  function updateBullets(dt) {
    game.bullets.forEach((b) => {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 8 || b.x > 352 || b.y < 8 || b.y > 512) b.dead = true;
      if (b.owner === 'player') { const hit = game.enemies.find((e) => !e.dead && R.circleHit(b, e)); if (hit) { if (b.aoe) game.enemies.forEach((e) => { if (!e.dead && R.distance(hit, e) < 58) damageEnemy(e, b.damage); }); else damageEnemy(hit, b.damage); b.dead = true; } }
      else if (R.circleHit(b, game.player)) { damagePlayer(b.damage); b.dead = true; }
    });
    game.bullets = game.bullets.filter((b) => !b.dead);
  }
  function showLoot(drop) {
    game.mode = 'loot'; game.pendingLoot = drop;
    const current = game.equipment[drop.item.slot];
    ui.lootRarity.textContent = drop.rarity === 'rare' ? '稀有装备' : '普通装备';
    ui.lootName.textContent = drop.item.icon + ' ' + drop.item.name;
    ui.lootDescription.textContent = drop.item.description;
    ui.currentEquipment.textContent = current ? E.BY_ID.get(current).name : '无';
    ui.newEquipment.textContent = drop.item.name;
    ui.lootPanel.hidden = false;
  }
  function collectNearbyDrop() {
    const drop = game.drops.find((item) => R.distance(item, game.player) < 24);
    if (drop) showLoot(drop);
  }
  function closeLoot(equip) {
    const drop = game.pendingLoot;
    if (!drop) return;
    if (equip) {
      const old = game.equipment[drop.item.slot];
      game.equipment[drop.item.slot] = drop.item.id;
      if (drop.item.slot === 'weapon') game.weapon = drop.item.weapon;
      if (drop.item.slot === 'armor') {
        const before = old ? E.BY_ID.get(old) : null;
        const delta = (drop.item.maxHp || 0) - (before && before.maxHp || 0);
        const currentHp = game.player.hp;
        game.player.maxHp += delta;
        game.player.hp = Math.max(0, Math.min(game.player.maxHp, currentHp + delta));
      }
      ui.message.textContent = '装备了' + drop.item.name + '。';
    }
    game.drops = game.drops.filter((item) => item !== drop);
    game.pendingLoot = null; ui.lootPanel.hidden = true; game.mode = 'playing'; renderUi();
  }
  function update(dt) {
    if (game.mode !== 'playing') return;
    game.time += dt;
    const p = game.player;
    p.skillCd = Math.max(0, p.skillCd - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.invuln = Math.max(0, p.invuln - dt); p.trailCd -= dt;
    game.rangeHint = Math.max(0, game.rangeHint - dt); game.shake = Math.max(0, game.shake - dt * 24);
    const movement = inputVector();
    if (movement.x || movement.y) p.face = movement;
    const speed = p.dashLeft > 0 ? 390 : p.speed;
    if (p.dashLeft > 0) { p.dashLeft -= dt; p.invuln = Math.max(p.invuln, .08); if (p.trailCd <= 0) { game.effects.push({ type:'afterimage', x:p.x, y:p.y, life:.2 }); p.trailCd = .045; } }
    R.moveInside(p, movement.x * speed, movement.y * speed, dt, bounds);
    autoAttack(dt); game.enemies.forEach((e) => updateEnemy(e, dt)); updateBullets(dt); collectNearbyDrop();
    game.effects.forEach((e) => { e.life -= dt; }); game.effects = game.effects.filter((e) => e.life > 0);
    if (game.enemies.every((e) => e.dead) && game.drops.length === 0) finish(true);
    renderUi();
  }
  function dash() { const p = game.player, d = inputVector(); if (p.dashCd || game.mode !== 'playing') return; p.face = d.x || d.y ? d : p.face; stick.x = stick.y = 0; p.dashLeft = .2; p.dashCd = 1.35; p.invuln = .28; }
  function skill() { const p = game.player; if (p.skillCd || game.mode !== 'playing') return; game.enemies.forEach((e) => { if (!e.dead && R.distance(p, e) < 130) damageEnemy(e, 2); }); game.effects.push({ type:'moon', x:p.x, y:p.y, life:.5 }); p.skillCd = 6; }
  function finish(won) { game.mode = won ? 'won' : 'lost'; ui.resultTitle.textContent = won ? '房间清除' : '月光熄灭'; ui.resultText.textContent = won ? '基础战斗完成，下一步将验证加入装备掉落。' : '调整走位和闪避时机，再试一次。'; document.getElementById('restartBtn').textContent = '重新准备'; ui.result.hidden = false; }
  function renderUi() { const p = game.player, eq = game.equipment; ui.hp.textContent = '♥'.repeat(p.hp) + '♡'.repeat(p.maxHp - p.hp); ui.kills.textContent = game.kills; ui.weaponBtn.textContent = game.weapon === 'sword' ? '⚔ 月牙剑 · 可切换' : game.weapon === 'bow' ? '➶ 星辉弓 · 可切换' : '✦ 潮汐法杖'; ui.skillCd.textContent = p.skillCd ? p.skillCd.toFixed(1) + 's' : '就绪'; ui.dashCd.textContent = p.dashCd ? p.dashCd.toFixed(1) + 's' : '就绪'; ui.weaponSlot.textContent = E.BY_ID.get(eq.weapon).name; ui.armorSlot.textContent = eq.armor ? E.BY_ID.get(eq.armor).name : '无'; ui.charmSlot.textContent = eq.charm ? E.BY_ID.get(eq.charm).name : '无'; }
  function circle(x,y,r,color) { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=color; ctx.fill(); }
  function draw() {
    ctx.clearRect(0,0,360,520); ctx.save(); if(game.shake){ctx.translate((Math.random()-.5)*game.shake,(Math.random()-.5)*game.shake)} const g=ctx.createLinearGradient(0,0,0,520); g.addColorStop(0,'#191637'); g.addColorStop(1,'#10172c'); ctx.fillStyle=g; ctx.fillRect(0,0,360,520);
    ctx.strokeStyle='rgba(176,160,230,.08)'; for(let x=20;x<360;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,520);ctx.stroke()} for(let y=20;y<520;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(360,y);ctx.stroke()}
    game.enemies.forEach((e)=>{ if(e.dead)return; if(e.state==='warn'){ctx.strokeStyle='rgba(255,70,103,.65)';ctx.lineWidth=e.type==='charger'?22:8;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+e.dir.x*320,e.y+e.dir.y*320);ctx.stroke();ctx.lineWidth=1} const colors={chaser:'#e95d82',charger:'#ef9d4f',ranged:'#a576e8'};circle(e.x,e.y,e.r,colors[e.type]);ctx.fillStyle='#fff';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText({chaser:'狼',charger:'冲',ranged:'眼'}[e.type],e.x,e.y+3);ctx.fillStyle='#332540';ctx.fillRect(e.x-14,e.y-22,28,3);ctx.fillStyle='#d8fa61';ctx.fillRect(e.x-14,e.y-22,28*e.hp/e.maxHp,3)});
    game.drops.forEach((d)=>{d.pulse+=.04;ctx.fillStyle=d.rarity==='rare'?'rgba(190,112,255,.22)':'rgba(213,250,97,.18)';ctx.fillRect(d.x-10,d.y-48,20,48);circle(d.x,d.y,9,d.item.color);ctx.fillStyle='#fff';ctx.font='bold 12px system-ui';ctx.fillText(d.item.icon,d.x,d.y+4)});
    game.bullets.forEach((b)=>circle(b.x,b.y,b.r,b.owner==='player'?'#d8fa61':'#ff6685'));
    game.effects.forEach((e)=>{if(e.type==='afterimage'){ctx.globalAlpha=e.life*1.8;circle(e.x,e.y,11,'#b9a9ed');ctx.globalAlpha=1;return}ctx.globalAlpha=Math.min(1,e.life*5);ctx.strokeStyle=e.type==='moon'?'#bff4ff':'#fff';ctx.lineWidth=e.type==='slash'?8:3;ctx.beginPath();if(e.type==='slash')ctx.arc(e.x,e.y,48,e.angle-.85,e.angle+.85);else ctx.arc(e.x,e.y,e.type==='moon'?(1-e.life/.5)*130:24,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1});
    const p=game.player; if(game.rangeHint){ctx.beginPath();ctx.arc(p.x,p.y,game.weapon==='sword'?68:150,0,Math.PI*2);ctx.strokeStyle=game.weapon==='sword'?'rgba(255,224,244,.24)':'rgba(213,250,97,.18)';ctx.setLineDash([5,6]);ctx.stroke();ctx.setLineDash([])} ctx.globalAlpha=p.invuln&&Math.floor(game.time*18)%2? .35:1; circle(p.x,p.y,p.r,'#e9e2ff');circle(p.x+p.face.x*5,p.y+p.face.y*5,3,'#5a467a');ctx.globalAlpha=1;ctx.restore();
  }
  function frame(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;accumulator+=dt;while(accumulator>=1/60){update(1/60);accumulator-=1/60}draw();requestAnimationFrame(frame)}
  const keyMap={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down'};
  addEventListener('keydown',(e)=>{const k=keyMap[e.key];if(k){held.add(k);e.preventDefault()}if(e.key===' ')skill();if(e.key==='Shift')dash()}); addEventListener('keyup',(e)=>{const k=keyMap[e.key];if(k)held.delete(k)});
  const stickEl=document.getElementById('stick'),knob=document.getElementById('stickKnob'); function moveStick(e){const b=stickEl.getBoundingClientRect(),x=e.clientX-(b.left+b.width/2),y=e.clientY-(b.top+b.height/2),n=R.normalize(x,y),m=Math.min(Math.hypot(x,y),32);stick.x=n.x*(m/32);stick.y=n.y*(m/32);knob.style.transform='translate('+(n.x*m)+'px,'+(n.y*m)+'px)'} function clearStick(){stick.pointer=null;stick.x=stick.y=0;knob.style.transform=''} stickEl.addEventListener('pointerdown',(e)=>{stick.pointer=e.pointerId;stickEl.setPointerCapture(e.pointerId);moveStick(e)});stickEl.addEventListener('pointermove',(e)=>{if(e.pointerId===stick.pointer)moveStick(e)});['pointerup','pointercancel'].forEach((n)=>stickEl.addEventListener(n,clearStick));
  document.getElementById('dashBtn').addEventListener('pointerdown',dash); document.getElementById('skillBtn').addEventListener('pointerdown',skill); ui.weaponBtn.addEventListener('click',()=>{game.weapon=game.weapon==='sword'?'bow':'sword';game.player.attackCd=0;renderUi()}); document.getElementById('restartBtn').addEventListener('click',()=>{if(game.mode==='ready'){game.mode='playing';ui.result.hidden=true;ui.message.textContent='移动躲开红色预警，角色会自动攻击最近的敌人。'}else reset()}); document.getElementById('pauseBtn').addEventListener('click',()=>{if(game.mode!=='playing'&&game.mode!=='paused')return;game.mode=game.mode==='paused'?'playing':'paused';ui.message.textContent=game.mode==='paused'?'已暂停':'继续战斗'});
  document.getElementById('equipLootBtn').addEventListener('pointerdown', () => closeLoot(true));
  document.getElementById('discardLootBtn').addEventListener('pointerdown', () => closeLoot(false));
  reset();requestAnimationFrame(frame);
})();
