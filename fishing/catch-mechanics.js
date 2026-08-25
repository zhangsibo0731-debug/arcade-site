(function (global) {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function moveFish(state, dt, now, random) {
    const fish = state.fish;
    state.fishMoveLeft -= dt;
    state.fishWarning = Math.max(0, state.fishWarning - dt);
    if (state.fishMoveLeft <= 0) {
      if (fish.behavior === 'calm') {
        state.fishTarget = .16 + random() * .68;
        state.fishMoveLeft = (fish.id === 'carp' ? 1.05 : .82) + random() * .72;
      } else if (fish.behavior === 'active') {
        if (fish.id === 'eel') state.fishTarget = state.fishY > .5 ? .12 + random() * .24 : .64 + random() * .24;
        else state.fishTarget = .08 + random() * .84;
        state.fishMoveLeft = fish.id === 'eel' ? .2 + random() * .24 : .32 + random() * .48;
      } else if (!state.dashPending) {
        state.fishWarning = fish.id === 'moon' ? .68 : fish.id === 'icefin' ? .58 : .48;
        state.fishMoveLeft = state.fishWarning;
        if (fish.id === 'starlight') state.fishTarget = clamp(state.fishY + (random() < .5 ? -.12 : .12), .1, .9);
        else if (fish.id === 'moon') state.fishTarget = clamp(state.fishY + (random() < .5 ? -.08 : .08), .1, .9);
        else state.fishTarget = state.fishY;
        state.dashPending = true;
      } else {
        if (fish.id === 'moon') state.fishTarget = state.fishY > .5 ? .05 + random() * .16 : .79 + random() * .16;
        else if (state.dashCount === 0) state.fishTarget = state.fishY > .5 ? .18 + random() * .14 : .68 + random() * .14;
        else state.fishTarget = state.fishY > .5 ? .08 + random() * .18 : .74 + random() * .2;
        state.fishMoveLeft = fish.id === 'icefin' ? .55 + random() * .18 : .44 + random() * .26;
        state.dashPending = false;
        state.dashCount++;
      }
    }
    const speed = (fish.behavior === 'calm' ? .62 : fish.behavior === 'active' ? 1.1 : 1.3) * fish.difficulty;
    state.fishY += (state.fishTarget - state.fishY) * Math.min(1, dt * speed * 3.2);
    state.fishY += Math.sin(now / (fish.id === 'puffer' ? 95 : 180)) * dt * (fish.id === 'puffer' ? .055 : .018);
    state.fishY = clamp(state.fishY, .04, .96);
  }

  function applyLocationForce(state, dt, now, random, events) {
    if (state.location === 'river') state.zoneV += Math.sin(now / 720) * .34 * dt;
    if (state.location !== 'coast') return;
    if (state.surgeLeft > 0) {
      state.surgeLeft = Math.max(0, state.surgeLeft - dt);
      state.zoneV += state.surgeDirection * .56 * dt;
      events.surgeText = state.surgeDirection > 0 ? '浪涌 ↑' : '浪涌 ↓';
      events.surgeActive = true;
      if (state.surgeLeft === 0) {
        state.surgeTimer = 3.8 + random() * 1.4;
        state.surgeDirection = random() < .5 ? -1 : 1;
      }
      return;
    }
    state.surgeTimer = Math.max(0, state.surgeTimer - dt);
    if (state.surgeTimer <= .65) {
      events.surgeText = state.surgeDirection > 0 ? '浪涌将至 ↑' : '浪涌将至 ↓';
      events.surgeWarning = true;
    } else {
      events.surgeText = '下一次浪涌 · ' + Math.ceil(state.surgeTimer) + 's';
    }
    if (state.surgeTimer <= 0) {
      state.surgeLeft = .45;
      events.wave = true;
    }
  }

  function step(input, dt, now, random) {
    const state = Object.assign({}, input);
    const events = { wave: false, surgeText: '', surgeWarning: false, surgeActive: false };
    const rng = random || Math.random;
    moveFish(state, dt, now, rng);
    state.zoneV += (state.held ? 2.12 : -1.48) * dt;
    applyLocationForce(state, dt, now, rng, events);
    state.zoneV *= Math.pow(.2, dt);
    state.zoneV = clamp(state.zoneV, -.88, .84);
    state.zoneY += state.zoneV * dt;
    const baseZoneHalf = state.isItem ? .22 : (state.fish.id === 'crucian' && state.totalCaught === 0 ? .19 : .16);
    const zoneHalf = baseZoneHalf * (state.stableHook ? 1.1 : 1);
    if (state.zoneY < zoneHalf) { state.zoneY = zoneHalf; state.zoneV = Math.abs(state.zoneV) * .22; }
    if (state.zoneY > 1 - zoneHalf) { state.zoneY = 1 - zoneHalf; state.zoneV = -Math.abs(state.zoneV) * .28; }
    events.inside = Math.abs(state.fishY - state.zoneY) <= zoneHalf;
    state.catchProgress += dt * (events.inside ? .27 / state.fish.difficulty : -.105 * state.fish.difficulty);
    state.catchProgress = clamp(state.catchProgress, 0, 1);
    events.outcome = state.catchProgress >= 1 ? 'caught' : state.catchProgress <= 0 ? 'lost' : null;
    events.fishWarning = state.fishWarning > 0;
    return { state, events };
  }

  global.FishingCatchMechanics = Object.freeze({ step });
})(window);
