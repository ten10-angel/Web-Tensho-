import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { onRequest } from '../functions/api/[[route]].js';

const origin = 'https://web-tensho.pages.dev';
// Only dummy credentials are used in these tests; no GitHub requests are sent.
const env = { GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-secret-not-real' };
const request = (path, options = {}, bindings = env) => onRequest({ request: new Request(origin + path, options), env: bindings });

async function start() {
  const response = await request('/api/auth?provider=github&scope=repo&site_id=attacker.example');
  return {
    response,
    location: new URL(response.headers.get('Location')),
    cookie: response.headers.get('Set-Cookie').split(';')[0],
  };
}

function callback(flow, query = '') {
  return request(`/api/callback?state=${flow.location.searchParams.get('state')}&code=test-code${query}`, { headers: { Cookie: flow.cookie } });
}

test('authentication redirect locks origin, callback and public scope; uses secure cookie and PKCE', async () => {
  const flow = await start();
  assert.equal(flow.response.status, 302);
  assert.equal(flow.location.origin + flow.location.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(flow.location.searchParams.get('scope'), 'public_repo');
  assert.equal(flow.location.searchParams.get('redirect_uri'), `${origin}/api/callback`);
  assert.equal(flow.location.searchParams.get('code_challenge_method'), 'S256');
  assert.match(flow.location.searchParams.get('state'), /^[\w-]{43}$/);
  assert.match(flow.location.searchParams.get('code_challenge'), /^[\w-]{43}$/);
  assert.match(flow.response.headers.get('Set-Cookie'), /Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
  assert.match(flow.response.headers.get('Cache-Control'), /no-store/);
  assert.ok(!flow.location.href.includes(env.GITHUB_CLIENT_SECRET));
  assert.notEqual((await start()).cookie, flow.cookie);
});

test('wrong host, route, method, provider, or missing bindings fail safely', async () => {
  assert.equal((await onRequest({ request: new Request('https://preview.pages.dev/api/auth'), env })).status, 403);
  assert.equal((await request('/api/other')).status, 404);
  assert.equal((await request('/api/auth', { method: 'POST' })).status, 405);
  assert.equal((await request('/api/auth?provider=gitlab')).status, 400);
  assert.equal((await request('/api/auth?provider=github', {}, {})).status, 503);
  assert.equal((await request('/api/auth/?provider=github')).status, 302);
});

test('missing/mismatched/tampered/expired state cannot exchange a code', async () => {
  let calls = 0;
  const fetchMock = mock.method(globalThis, 'fetch', () => { calls++; throw Error('must not call'); });
  try {
    const flow = await start();
    assert.equal((await request('/api/callback?state=invalid&code=test-code')).status, 400);
    assert.equal((await request('/api/callback?state=invalid&code=test-code', { headers: { Cookie: flow.cookie } })).status, 400);
    const tampered = { ...flow, cookie: flow.cookie + 'x' };
    assert.equal((await callback(tampered)).status, 400);
    const now = Date.now();
    const clock = mock.method(Date, 'now', () => now + 601000);
    try { assert.equal((await callback(flow)).status, 400); } finally { clock.mock.restore(); }
    assert.equal(calls, 0);
  } finally { fetchMock.mock.restore(); }
});

test('denial and missing code are handled without exchange', async () => {
  const flow = await start();
  assert.equal((await callback(flow, '&error=access_denied')).status, 400);
  assert.equal((await request(`/api/callback?state=${flow.location.searchParams.get('state')}`, { headers: { Cookie: flow.cookie } })).status, 400);
});

test('exchange uses original PKCE verifier and returns an origin-checked Decap handshake', async () => {
  const flow = await start();
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://github.com/login/oauth/access_token');
    assert.equal(options.method, 'POST');
    assert.equal(options.body.get('client_secret'), env.GITHUB_CLIENT_SECRET);
    assert.equal(options.body.get('redirect_uri'), `${origin}/api/callback`);
    const challenge = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(options.body.get('code_verifier')))).toString('base64url');
    assert.equal(challenge, flow.location.searchParams.get('code_challenge'));
    return Response.json({ access_token: 'dummy-token', scope: 'public_repo' });
  });
  let response;
  try { response = await callback(flow); } finally { fetchMock.mock.restore(); }
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  const html = await response.text();
  assert.ok(!html.includes(env.GITHUB_CLIENT_SECRET));
  const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
  const listeners = new Map();
  const sent = [];
  const parent = { closed: false, postMessage: (...args) => sent.push(args) };
  const window = { opener: parent, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const historyCalls = [];
  runInNewContext(script, { window, history: { replaceState: (...args) => historyCalls.push(args) }, setTimeout: () => {}, document: { getElementById: () => ({ textContent: '' }) } });
  assert.equal(historyCalls[0][2], '/api/callback');
  assert.deepEqual(sent, [['authorizing:github', origin]]);
  const receive = listeners.get('message');
  receive({ origin: 'https://attacker.example', source: parent, data: 'authorizing:github' });
  receive({ origin, source: {}, data: 'authorizing:github' });
  receive({ origin, source: parent, data: 'unexpected' });
  assert.equal(sent.length, 1);
  receive({ origin, source: parent, data: 'authorizing:github' });
  assert.equal(sent[1][0], 'authorization:github:success:{"token":"dummy-token","provider":"github"}');
  assert.equal(sent[1][1], origin);
  receive({ origin, source: parent, data: 'authorizing:github' });
  assert.equal(sent.length, 2);
});

test('upstream errors and overbroad scopes never leak sensitive response data', async () => {
  for (const payload of [
    { error: 'bad_verification_code', error_description: 'sensitive-value' },
    { access_token: 'sensitive-value', scope: 'repo' },
    { access_token: 'sensitive-value', scope: 'public_repo,admin:org' },
  ]) {
    const flow = await start();
    const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(payload));
    try {
      const response = await callback(flow);
      assert.ok(response.status >= 400);
      const html = await response.text();
      assert.ok(!html.includes('sensitive-value'));
      assert.ok(!html.includes(env.GITHUB_CLIENT_SECRET));
    } finally { fetchMock.mock.restore(); }
  }
});

test('network errors are redacted and callback HTML cannot be injected', async () => {
  const flow = await start();
  let fetchMock = mock.method(globalThis, 'fetch', async () => { throw Error(env.GITHUB_CLIENT_SECRET); });
  try {
    const response = await callback(flow);
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes(env.GITHUB_CLIENT_SECRET));
  } finally { fetchMock.mock.restore(); }
  fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ access_token: '</script><script>bad()</script>', scope: 'public_repo' }));
  try {
    const html = await (await callback(await start())).text();
    assert.equal((html.match(/<script/g) || []).length, 1);
    assert.ok(!html.includes('<script>bad()'));
  } finally { fetchMock.mock.restore(); }
});

test('routing/configuration keep static pages out of Functions', async () => {
  const routes = JSON.parse(await readFile(new URL('../public/_routes.json', import.meta.url), 'utf8'));
  assert.deepEqual(routes.include, ['/api/auth', '/api/auth/', '/api/callback', '/api/callback/']);
  const config = await readFile(new URL('../public/admin/config.yml', import.meta.url), 'utf8');
  assert.match(config, /base_url: https:\/\/web-tensho.pages.dev/);
  assert.match(config, /auth_endpoint: api\/auth/);
  assert.ok(!config.includes('netlify.app'));
});
