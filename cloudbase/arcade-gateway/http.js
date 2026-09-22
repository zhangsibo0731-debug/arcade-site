'use strict';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://zhangsibo0731-debug.github.io',
  'http://127.0.0.1:8417',
  'http://localhost:8417',
];

function allowedOrigins() {
  const configured = typeof process.env.ALLOWED_ORIGINS === 'string' ? process.env.ALLOWED_ORIGINS.trim().slice(0, 1000) : '';
  return new Set(configured ? configured.split(',').map((item) => item.trim()).filter(Boolean) : DEFAULT_ALLOWED_ORIGINS);
}

function originOf(request) {
  return request.headers && (request.headers.origin || request.headers.Origin) || '';
}

function corsHeaders(origin) {
  if (!origin || !allowedOrigins().has(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function json(statusCode, data, headers = {}) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8', ...headers }, body: JSON.stringify(data) };
}

module.exports = { allowedOrigins, corsHeaders, json, originOf };
