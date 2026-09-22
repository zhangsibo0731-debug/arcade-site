'use strict';

const GAMES = new Set(['puyo']);
const MODES = new Set(['challenge']);
const MAX_SCORE = 100000000;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

function integer(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function weekInfo(input = new Date()) {
  const now = input instanceof Date ? input : new Date(input);
  const local = new Date(now.getTime() + SHANGHAI_OFFSET_MS);
  const weekdayFromMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - weekdayFromMonday);
  const monday = new Date(mondayLocal);
  const key = [monday.getUTCFullYear(), String(monday.getUTCMonth() + 1).padStart(2, '0'), String(monday.getUTCDate()).padStart(2, '0')].join('-');
  return Object.freeze({ key, resetAt: new Date(mondayLocal - SHANGHAI_OFFSET_MS + 7 * 86400000).toISOString() });
}

function validateGameMode(game, mode) {
  return GAMES.has(game) && MODES.has(mode);
}

function leaderboardQuery(url) {
  const game = cleanText(url.searchParams.get('game'), 20);
  const mode = cleanText(url.searchParams.get('mode') || 'challenge', 20);
  const requestedLimit = Number(url.searchParams.get('limit') || 20);
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(50, requestedLimit)) : 20;
  return { game, mode, limit };
}

function validateScore(body) {
  const value = body && typeof body === 'object' ? body : {};
  const submissionId = cleanText(value.submissionId, 80);
  const playerId = cleanText(value.playerId, 80);
  const playerName = typeof value.playerName === 'string' ? value.playerName.trim() : '';
  const game = cleanText(value.game, 20);
  const mode = cleanText(value.mode, 20);
  const gameVersion = cleanText(value.gameVersion, 30);
  if (!submissionId || !playerId || !playerName) return { error: '缺少成绩标识、玩家标识或昵称' };
  if (Array.from(playerName).length > 12 || /[\u0000-\u001f\u007f]/.test(playerName)) return { error: '昵称不合法' };
  if (!validateGameMode(game, mode)) return { error: '不支持的游戏或模式' };
  if (!integer(value.score, 0, MAX_SCORE)) return { error: '分数不合法' };
  if (!integer(value.stage, 1, 9999)) return { error: 'Stage 不合法' };
  if (!integer(value.maxChain, 0, 99)) return { error: '连锁数不合法' };
  if (!integer(value.durationMs, 1000, 86400000)) return { error: '游戏时长不合法' };
  return { value: { submissionId, playerId, playerName, game, mode, score: value.score, stage: value.stage, maxChain: value.maxChain, durationMs: value.durationMs, gameVersion } };
}

module.exports = { cleanText, leaderboardQuery, validateGameMode, validateScore, weekInfo };
