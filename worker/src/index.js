/*
 * WHAT THIS DOES: Receives COACTA early-access requests from deep-bp.com, checks each one is from a person (Cloudflare
 * Turnstile), stores it in a private Cloudflare D1 database, and lets the founder read or download the list behind a
 * password. Nothing is shared with anyone else.
 * WHY IT MATTERS: The early-access list is the first relationship with future customers; it must be complete, safe
 * from spam, and private.
 * SECRETS (set by the founder with `wrangler secret put`, never in this file): TURNSTILE_SECRET, ADMIN_KEY.
 */
const ORIGINS = ['https://deep-bp.com', 'https://www.deep-bp.com'];
const LIMITS = { name: 120, email: 160, company: 160, role: 40, stage: 40, country: 80, wants: 400, note: 1500, lang: 2 };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    // The browser asks first whether it may send the form; answer yes for our own site only.
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    // A new request for early access.
    if (url.pathname === '/api/early-access' && req.method === 'POST') {
      if (!ORIGINS.includes(origin)) return json({ ok: false, error: 'origin' }, 403, cors);
      let body;
      try { body = await req.json(); } catch { return json({ ok: false, error: 'format' }, 400, cors); }

      // Keep only the fields we ask for, trimmed and within sensible lengths.
      const f = {};
      for (const k of Object.keys(LIMITS)) f[k] = String(body[k] ?? '').trim().slice(0, LIMITS[k]);
      const consent = body.consent === true;
      if (!f.name || !f.company || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email) || !consent) {
        return json({ ok: false, error: 'missing' }, 400, cors);
      }

      // Make sure a person, not a bot, sent it.
      const ip = req.headers.get('CF-Connecting-IP') || '';
      const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret: env.TURNSTILE_SECRET || '', response: String(body.turnstile || ''), remoteip: ip }),
      }).then((r) => r.json()).catch(() => ({ success: false }));
      if (!check.success) return json({ ok: false, error: 'robot' }, 400, cors);

      // Store it; the same email asking again updates its request instead of adding a duplicate.
      await env.DB.prepare(
        `INSERT INTO requests (email, name, company, role, stage, country, wants, note, lang, consent_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10, ?10)
         ON CONFLICT(email) DO UPDATE SET name=?2, company=?3, role=?4, stage=?5, country=?6, wants=?7, note=?8, lang=?9, updated_at=?10`
      ).bind(f.email.toLowerCase(), f.name, f.company, f.role, f.stage, f.country, f.wants, f.note, f.lang, new Date().toISOString()).run();
      return json({ ok: true }, 200, cors);
    }

    // The founder's private view: the list, or a CSV download, behind a password.
    if (url.pathname === '/admin' || url.pathname === '/admin.csv') {
      if (!authorised(req, env)) {
        return new Response('Password required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="DBP early access", charset="UTF-8"' } });
      }
      const { results } = await env.DB.prepare('SELECT * FROM requests ORDER BY created_at DESC').all();
      if (url.pathname === '/admin.csv') {
        const cols = ['created_at', 'name', 'email', 'company', 'role', 'stage', 'country', 'wants', 'note', 'lang'];
        const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
        const csv = '﻿' + [cols.join(','), ...results.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
        return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="coacta-early-access.csv"', 'Cache-Control': 'no-store' } });
      }
      return new Response(adminPage(results), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    }

    return new Response('Not found', { status: 404 });
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

// The password check compares in constant time, so it cannot be guessed letter by letter.
function authorised(req, env) {
  const h = req.headers.get('Authorization') || '';
  if (!h.startsWith('Basic ') || !env.ADMIN_KEY) return false;
  let pass = '';
  try { pass = atob(h.slice(6)).split(':').slice(1).join(':'); } catch { return false; }
  const a = new TextEncoder().encode(pass), b = new TextEncoder().encode(env.ADMIN_KEY);
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

function adminPage(rows) {
  const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tr = rows.map((r) => `<tr><td>${e(r.created_at.slice(0, 10))}</td><td>${e(r.name)}</td><td><a href="mailto:${e(r.email)}">${e(r.email)}</a></td><td>${e(r.company)}</td><td>${e(r.role)}</td><td>${e(r.stage)}</td><td>${e(r.country)}</td><td>${e(r.wants)}</td><td>${e(r.note)}</td><td>${e(r.lang)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>COACTA early access</title>
<style>body{font:14px system-ui,sans-serif;margin:24px;color:#0b1a38;background:#f5f7fb}h1{font-size:20px}a.btn{display:inline-block;margin:8px 0 16px;padding:8px 14px;border-radius:999px;background:#2c55f5;color:#fff;text-decoration:none}
.t{overflow-x:auto;background:#fff;border-radius:12px;box-shadow:0 0 0 1px #e1e8f3}table{border-collapse:collapse;min-width:900px;width:100%}th,td{padding:8px 10px;border-bottom:1px solid #eef2f8;text-align:start;vertical-align:top}th{background:#f0f4fb;font-weight:600}</style></head>
<body><h1>COACTA early access · ${rows.length} requests</h1><a class="btn" href="/admin.csv">Download CSV (Excel)</a>
<div class="t"><table><thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Company</th><th>Role</th><th>Stage</th><th>Country</th><th>Wants first</th><th>Note</th><th>Lang</th></tr></thead><tbody>${tr}</tbody></table></div></body></html>`;
}
