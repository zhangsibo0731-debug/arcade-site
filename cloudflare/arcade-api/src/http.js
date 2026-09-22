export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}

export function allowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return '';
  const configured = String(env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
  return configured.includes(origin) ? origin : '';
}

export function corsHeaders(request, env) {
  const origin = allowedOrigin(request, env);
  return origin ? {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  } : {};
}

export function withHeaders(response, headers) {
  const next = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => next.set(key, value));
  return new Response(response.body, { status: response.status, headers: next });
}
