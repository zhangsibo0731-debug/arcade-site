'use strict';

const THEME = Object.freeze({
  bg: '#171329', board: '#211b3b', panel: 'rgba(255,255,255,.065)',
  panelStrong: 'rgba(34,28,59,.94)', line: 'rgba(255,255,255,.13)',
  text: '#f5f0ff', soft: '#a49abd', lime: '#b8f34a', pink: '#ff6fae',
  cyan: '#56dced', gold: '#ffd867', ink: '#171d18',
});

function create(ctx) {
  function roundRect(x, y, w, h, radius, fill, stroke, lineWidth) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
  }

  function text(value, x, y, size, color, align, weight, maxWidth) {
    ctx.fillStyle = color || THEME.text; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.font = (weight || 600) + ' ' + size + 'px sans-serif';
    if (maxWidth) ctx.fillText(String(value), x, y, maxWidth); else ctx.fillText(String(value), x, y);
  }

  function wrap(value, x, y, width, size, color, align, maxLines) {
    const chars = Array.from(String(value || '')); const lines = []; let line = '';
    ctx.font = '600 ' + size + 'px sans-serif';
    chars.forEach((char) => { const next = line + char; if (line && ctx.measureText(next).width > width) { lines.push(line); line = char; } else line = next; });
    if (line) lines.push(line);
    lines.slice(0, maxLines || 2).forEach((entry, index) => text(entry, align === 'center' ? x + width / 2 : x, y + index * (size + 4), size, color, align || 'left', 600));
  }

  function panel(box, options) {
    const o = options || {};
    roundRect(box.x, box.y, box.w, box.h, o.radius == null ? 16 : o.radius, o.fill || THEME.panel, o.stroke || THEME.line, o.lineWidth);
  }

  function button(box, label, options) {
    const o = options || {};
    panel(box, { radius: o.radius == null ? 14 : o.radius, fill: o.fill || 'rgba(48,40,71,.92)', stroke: o.stroke || THEME.line });
    text(label, box.x + box.w / 2, box.y + box.h / 2, o.size || 13, o.color || THEME.text, 'center', o.weight || 800);
  }

  return { theme: THEME, roundRect, text, wrap, panel, button };
}

module.exports = { THEME, create };
