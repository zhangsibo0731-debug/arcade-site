'use strict';

const DEFAULT_CLOUDFLARE_ACCOUNT_ID = '4b13ae217111bf8fbc82258ad8073a76';
const DEFAULT_D1_DATABASE_ID = '9fc94a41-8c69-4691-ab72-bc9cf890c308';

function createD1Client(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const accountId = options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_CLOUDFLARE_ACCOUNT_ID;
  const databaseId = options.databaseId || process.env.CLOUDFLARE_D1_DATABASE_ID || DEFAULT_D1_DATABASE_ID;
  const apiToken = options.apiToken || process.env.CLOUDFLARE_D1_API_TOKEN;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  async function query(sql, params = []) {
    if (!accountId || !databaseId || !apiToken) throw new Error('gateway_not_configured');
    const apiResponse = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    });
    const payload = await apiResponse.json().catch(() => null);
    const result = payload && Array.isArray(payload.result) ? payload.result[0] : null;
    if (!apiResponse.ok || !payload || payload.success !== true || !result || result.success === false) {
      const error = new Error('d1_query_failed');
      error.status = apiResponse.status;
      throw error;
    }
    return result;
  }

  return Object.freeze({ query });
}

module.exports = { createD1Client };
