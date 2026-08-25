(function (global) {
  'use strict';

  function create(options) {
    const canvas = options.canvas;
    const stage = options.stage;
    const ctx = options.context;

    function resize() {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  
    function drawScene(time, state) {
      const { currentLocationId, environment, mode, power, castDistance, castTime, hookTime, finishLeft, ripple, caughtFlash } = state;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const isRiver = currentLocationId === 'river';
      const isCoast = currentLocationId === 'coast';
      const isAbyss = currentLocationId === 'abyss';
      const lakeY = h * (isAbyss ? .28 : isRiver ? .43 : isCoast ? .46 : .48);
      const isNight = environment.time === 'night';
      const isDusk = environment.time === 'dusk';
      const isRain = environment.weather === 'rain';
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, isAbyss ? '#0b1931' : isCoast ? (isNight ? '#101d3d' : isDusk ? '#a85f6e' : '#69b8c6') : isRiver ? (isNight ? '#173a4b' : isDusk ? '#5b6a63' : '#73a9a4') : (isNight ? '#142449' : isDusk ? '#70465b' : '#5793b5'));
      grad.addColorStop(.48, isAbyss ? '#07162d' : isCoast ? (isNight ? '#263b68' : isDusk ? '#ef9b76' : '#bfe3d5') : isRiver ? (isNight ? '#285967' : isDusk ? '#8c8b70' : '#b7d7c5') : (isNight ? '#283f66' : isDusk ? '#c27c69' : '#9bc7d0'));
      grad.addColorStop(.49, isAbyss ? '#061227' : isCoast ? (isNight ? '#124668' : isDusk ? '#3c7590' : '#278ba0') : isRiver ? (isNight ? '#164f60' : '#3f7f7d') : (isNight ? '#1c5270' : isDusk ? '#35677a' : '#34768b'));
      grad.addColorStop(1, isAbyss ? '#020510' : isCoast ? (isNight ? '#082c4c' : '#126079') : isRiver ? (isNight ? '#092f3d' : '#1d5960') : (isNight ? '#0e2c4a' : '#16465d'));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
  
      if (!isAbyss && isNight) {
        ctx.fillStyle = 'rgba(255,239,183,.92)';
        const moonR = Math.min(w, h) * .075;
        const moonX = w * .72;
        const moonY = h * .17;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, -Math.PI * .34, Math.PI * .34, true);
        ctx.quadraticCurveTo(moonX - moonR * 1.08, moonY, moonX + moonR * .48, moonY - moonR * .88);
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < 26; i++) {
          const x = ((i * 83) % 997) / 997 * w;
          const y = ((i * 47) % 211) / 211 * lakeY * .75;
          const twinkle = .35 + .5 * Math.abs(Math.sin(time / 900 + i));
          ctx.fillStyle = 'rgba(255,244,205,' + twinkle + ')';
          ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
        }
      } else if (!isAbyss) {
        ctx.fillStyle = isDusk ? 'rgba(255,190,112,.92)' : 'rgba(255,238,173,.94)';
        ctx.beginPath(); ctx.arc(w * .74, h * (isDusk ? .28 : .16), Math.min(w, h) * .065, 0, Math.PI * 2); ctx.fill();
      }
  
      if (isAbyss) {
        ctx.fillStyle = '#050a16';
        ctx.beginPath(); ctx.moveTo(0, lakeY - 4); ctx.lineTo(w, lakeY + 5); ctx.lineTo(w, lakeY + 18); ctx.lineTo(0, lakeY + 12); ctx.closePath(); ctx.fill();
      } else if (isCoast) {
        ctx.fillStyle = isNight ? '#baa982' : '#d8bd8e';
        ctx.beginPath(); ctx.moveTo(0, lakeY - 7); ctx.lineTo(w * .22, lakeY + 5); ctx.lineTo(w * .37, lakeY + 32); ctx.lineTo(0, lakeY + 47); ctx.closePath(); ctx.fill();
        ctx.fillStyle = isNight ? '#17243c' : '#566b66';
        ctx.beginPath(); ctx.moveTo(w * .68, lakeY + 3); ctx.lineTo(w, lakeY - 10); ctx.lineTo(w, lakeY + 18); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = isRiver ? '#17352f' : '#0d1b32';
        ctx.beginPath(); ctx.moveTo(0, lakeY);
        for (let x = 0; x <= w; x += 22) ctx.lineTo(x, lakeY - 18 - ((x * 7) % 41));
        ctx.lineTo(w, lakeY + 18); ctx.lineTo(0, lakeY + 18); ctx.fill();
      }
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const baseY = lakeY + 20 + i * (h - lakeY) / 8.2;
        const speed = time * (isRiver ? .0022 : isCoast ? .00165 : .00115);
        const amp = (isRiver ? 2.7 : isCoast ? 3.4 : 1.8) * (1 - i * .035);
        ctx.strokeStyle = 'rgba(188,225,229,' + (.08 + (i % 3) * .035) + ')';
        ctx.lineWidth = i % 3 === 0 ? 1.35 : .85;
        for (let segment = 0; segment < 3; segment++) {
          const drift = isRiver ? (time * .018) % (w + 120) : (time * .007) % (w + 160);
          const seed = i * 97 + segment * 173;
          const length = w * (.16 + ((seed * 13) % 19) / 100);
          let start = ((seed + drift + segment * w * .31) % (w + length + 50)) - length;
          ctx.beginPath();
          for (let x = start; x <= Math.min(w + 8, start + length); x += 8) {
            const yy = baseY
              + Math.sin(x * (isRiver ? .041 : .027) + speed + i * 1.13) * amp
              + Math.sin(x * .013 - speed * .58 + segment * 2.1) * amp * .48;
            if (x === start) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
      }
      ctx.lineCap = 'butt';
  
      if (isRiver) {
        ctx.fillStyle = 'rgba(194,205,178,.38)';
        for (let i = 0; i < 7; i++) {
          const rockX = ((i * 137) % 911) / 911 * w;
          const rockY = lakeY + 18 + (i % 3) * 19;
          ctx.beginPath(); ctx.ellipse(rockX, rockY, 11 + (i % 3) * 5, 5 + (i % 2) * 3, -.12, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(207,239,226,.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const wakeX = ((i * 137) % 911) / 911 * w;
          const wakeY = lakeY + 22 + (i % 3) * 19;
          ctx.beginPath();
          ctx.ellipse(wakeX + 5, wakeY, 18 + i * 2, 5 + (i % 2), 0, Math.PI * 1.08, Math.PI * 1.88);
          ctx.stroke();
        }
      }
  
      if (isCoast) {
        const lighthouseX = w * .82;
        const lighthouseBase = lakeY + 3;
        ctx.fillStyle = isNight ? '#e8e2cd' : '#f4edda';
        ctx.fillRect(lighthouseX - 8, lighthouseBase - 54, 16, 54);
        ctx.fillStyle = '#d96558';
        ctx.fillRect(lighthouseX - 9, lighthouseBase - 38, 18, 9);
        ctx.beginPath(); ctx.moveTo(lighthouseX - 12, lighthouseBase - 54); ctx.lineTo(lighthouseX, lighthouseBase - 67); ctx.lineTo(lighthouseX + 12, lighthouseBase - 54); ctx.closePath(); ctx.fill();
        ctx.fillStyle = isNight ? '#ffe6a3' : '#6c8490';
        ctx.fillRect(lighthouseX - 5, lighthouseBase - 51, 10, 8);
        if (isNight || isDusk) {
          const beam = Math.sin(time / 1500) * .34;
          ctx.save();
          ctx.globalAlpha = isNight ? .22 : .12;
          ctx.fillStyle = '#fff0b1';
          ctx.beginPath(); ctx.moveTo(lighthouseX, lighthouseBase - 47); ctx.lineTo(lighthouseX + Math.cos(beam) * w * .48, lighthouseBase - 47 + Math.sin(beam) * h * .22 - 24); ctx.lineTo(lighthouseX + Math.cos(beam) * w * .48, lighthouseBase - 47 + Math.sin(beam) * h * .22 + 24); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = 'rgba(224,249,246,.5)';
        ctx.lineWidth = 1.15;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const x = ((time * .045 + i * w * .29) % (w + 70)) - 35;
          const y = lakeY + 34 + i * 27;
          const span = 24 + i * 3;
          ctx.beginPath();
          ctx.moveTo(x - span, y + 2);
          ctx.bezierCurveTo(x - span * .62, y, x - span * .28, y - 3, x + 1, y - 2);
          ctx.bezierCurveTo(x + span * .35, y - 1, x + span * .66, y + 1, x + span, y + 3);
          ctx.stroke();
          ctx.globalAlpha = .48;
          ctx.beginPath();
          ctx.moveTo(x - span * .42, y + 8);
          ctx.quadraticCurveTo(x - 2, y + 5, x + span * .52, y + 9);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.lineCap = 'butt';
      }

      if (isAbyss) {
        ctx.save();
        const beamX = w * (.48 + Math.sin(time / 2600) * .08);
        const beam = ctx.createLinearGradient(beamX, lakeY, beamX + w * .18, h);
        beam.addColorStop(0, 'rgba(111,205,239,.16)');
        beam.addColorStop(1, 'rgba(59,121,175,0)');
        ctx.fillStyle = beam;
        ctx.beginPath(); ctx.moveTo(beamX - 14, lakeY); ctx.lineTo(beamX + 20, lakeY); ctx.lineTo(beamX + w * .2, h); ctx.lineTo(beamX - w * .13, h); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 28; i++) {
          const x = ((i * 137 + time * (.004 + (i % 3) * .002)) % 997) / 997 * w;
          const y = lakeY + 22 + ((i * 83 + time * .012) % 613) / 613 * (h - lakeY - 35);
          const glow = .18 + .42 * Math.abs(Math.sin(time / 900 + i * 1.7));
          ctx.fillStyle = i % 5 === 0 ? 'rgba(105,235,214,' + glow + ')' : 'rgba(99,177,221,' + glow + ')';
          ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 1.8 : 1, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = 'rgba(1,4,12,.88)';
        ctx.beginPath(); ctx.moveTo(w * .58, h); ctx.lineTo(w * .66, h * .74); ctx.lineTo(w * .72, h * .77); ctx.lineTo(w * .79, h); ctx.closePath(); ctx.fill();
        ctx.fillRect(w * .62, h * .73, w * .18, 5);
        ctx.restore();
      }
  
      if (isRain && !isAbyss) {
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
  
      return Object.freeze({ resize, draw: drawScene });
  }

  global.FishingSceneRenderer = Object.freeze({ create });
})(window);
