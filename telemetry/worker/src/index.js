const encoder = new TextEncoder();

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'content-type,x-olympia-signature',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}

async function hmac(secret, body) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function validate(payload) {
  if (!payload || payload.schema_version !== 1) return 'unsupported schema';
  if (!payload.generated_at || Number.isNaN(Date.parse(payload.generated_at))) return 'invalid generated_at';
  if (!Array.isArray(payload.agents) || payload.agents.length > 50) return 'invalid agents';
  if (!Array.isArray(payload.missions) || payload.missions.length > 100) return 'invalid missions';
  return null;
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || 'https://mission-control-roan-five.vercel.app';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    if (request.method === 'GET' && url.pathname === '/v1/telemetry') {
      const row = await env.DB.prepare(
        'SELECT payload, received_at FROM telemetry_current WHERE id = 1',
      ).first();
      if (!row) return json({ status: 'empty', telemetry_mode: 'unavailable' }, 404, origin);
      const payload = JSON.parse(row.payload);
      return json({ ...payload, telemetry_mode: 'live', received_at: row.received_at }, 200, origin);
    }

    if (request.method === 'GET' && url.pathname === '/v1/health') {
      return json({ status: 'ok', service: 'olympia-telemetry' }, 200, origin);
    }

    if (request.method === 'POST' && url.pathname === '/v1/telemetry') {
      if (!env.TELEMETRY_SECRET) return json({ error: 'collector not configured' }, 503, origin);
      const body = await request.text();
      if (body.length > 128_000) return json({ error: 'payload too large' }, 413, origin);
      const supplied = request.headers.get('x-olympia-signature') || '';
      const expected = await hmac(env.TELEMETRY_SECRET, body);
      if (!safeEqual(supplied, expected)) return json({ error: 'invalid signature' }, 401, origin);

      let payload;
      try { payload = JSON.parse(body); } catch { return json({ error: 'invalid JSON' }, 400, origin); }
      const invalid = validate(payload);
      if (invalid) return json({ error: invalid }, 400, origin);

      const receivedAt = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO telemetry_current (id, generated_at, payload, received_at)
           VALUES (1, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET generated_at = excluded.generated_at,
           payload = excluded.payload, received_at = excluded.received_at`,
        ).bind(payload.generated_at, body, receivedAt),
        env.DB.prepare(
          'INSERT INTO telemetry_history (generated_at, payload, received_at) VALUES (?, ?, ?)',
        ).bind(payload.generated_at, body, receivedAt),
        env.DB.prepare(
          'DELETE FROM telemetry_history WHERE id NOT IN (SELECT id FROM telemetry_history ORDER BY id DESC LIMIT 1440)',
        ),
      ]);
      return json({ status: 'accepted', received_at: receivedAt }, 202, origin);
    }

    return json({ error: 'not found' }, 404, origin);
  },
};
