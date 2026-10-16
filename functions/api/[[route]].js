// Cloudflare Pages Functions: the public site remains a static Astro build.
const ORIGIN = 'https://web-tensho.pages.dev';
const CALLBACK = `${ORIGIN}/api/callback`;
const COOKIE = '__Host-tensho-oauth';
const MAX_AGE = 600;
const encoder = new TextEncoder();

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decode(value) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
}

const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
const cookie = (value, age = MAX_AGE) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const signingKey = secret => crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

async function signSession(session, secret) {
  const payload = base64url(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload));
  return `${payload}.${base64url(signature)}`;
}

async function readSession(request, secret) {
  try {
    const value = (request.headers.get('Cookie') || '').split(';').map(v => v.trim())
      .find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!value) return null;
    const [payload, signature, extra] = value.split('.');
    if (!payload || !signature || extra) return null;
    if (!await crypto.subtle.verify('HMAC', await signingKey(secret), decode(signature), encoder.encode(payload))) return null;
    const session = JSON.parse(new TextDecoder().decode(decode(payload)));
    const age = Date.now() - session.created;
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE * 1000) return null;
    if (!/^[\w-]{43}$/.test(session.state) || !/^[\w-]{43}$/.test(session.verifier)) return null;
    return session;
  } catch {
    return null;
  }
}

function headers(extra = {}) {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  };
}

function resultPage(message, token, status = 200) {
  const nonce = random();
  const result = token ? { token, provider: 'github' } : { message };
  // Escape HTML delimiters even though the OAuth response is from GitHub.
  const transfer = JSON.stringify(`authorization:github:${token ? 'success' : 'error'}:${JSON.stringify(result)}`)
    .replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
  const text = message.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return new Response(`<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>記事管理へのログイン</title>
<style nonce="${nonce}">body{font:16px/1.8 system-ui,sans-serif;background:#f2efe7;color:#10362c;max-width:38rem;margin:12vh auto;padding:1.5rem}a{color:inherit}</style></head>
<body><h1>Tensho Nishida</h1><p id="status">${text}</p><p><a href="/admin/">記事管理画面へ戻る</a></p>
<script nonce="${nonce}">
(() => {
  history.replaceState(null, '', '/api/callback');
  const origin = ${JSON.stringify(ORIGIN)};
  const parent = window.opener;
  let transfer = ${transfer};
  if (!parent || parent.closed) {
    transfer = null;
    document.getElementById('status').textContent = '管理画面との接続が切れました。管理画面に戻り、Login with GitHub を押してください。';
    return;
  }
  function receive(event) {
    if (event.origin !== origin || event.source !== parent || event.data !== 'authorizing:github' || !transfer) return;
    window.removeEventListener('message', receive);
    parent.postMessage(transfer, origin);
    transfer = null;
  }
  window.addEventListener('message', receive);
  parent.postMessage('authorizing:github', origin);
  setTimeout(() => {
    if (!transfer) return;
    transfer = null;
    window.removeEventListener('message', receive);
    document.getElementById('status').textContent = '管理画面へ接続できませんでした。この画面を閉じ、管理画面を再読み込みしてログインし直してください。';
  }, 15000);
})();
</script></body></html>`, {
    status,
    headers: headers({
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': cookie('', 0),
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
    }),
  });
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');
  if (url.origin !== ORIGIN) return new Response('本番サイトの /admin/ からログインしてください。', { status: 403, headers: headers() });
  if (!['/api/auth', '/api/callback'].includes(path)) return new Response('Not found', { status: 404, headers: headers() });
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: headers({ Allow: 'GET' }) });
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return resultPage('認証設定が未完了です。CloudflareのProduction環境にGITHUB_CLIENT_IDとGITHUB_CLIENT_SECRETを登録して再デプロイしてください。', null, 503);
  }

  if (path === '/api/auth') {
    if (url.searchParams.get('provider') !== 'github') return resultPage('GitHubログインのみ利用できます。', null, 400);
    const session = { state: random(), verifier: random(), created: Date.now() };
    const challenge = base64url(await crypto.subtle.digest('SHA-256', encoder.encode(session.verifier)));
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.search = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: CALLBACK,
      scope: 'public_repo',
      state: session.state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    return new Response(null, { status: 302, headers: headers({ Location: authorize.href, 'Set-Cookie': cookie(await signSession(session, env.GITHUB_CLIENT_SECRET)) }) });
  }

  const session = await readSession(request, env.GITHUB_CLIENT_SECRET);
  if (!session || url.searchParams.get('state') !== session.state) {
    return resultPage('ログイン情報の期限切れ、または不一致です。管理画面からログインし直してください。', null, 400);
  }
  if (url.searchParams.has('error')) return resultPage('GitHubの承認が完了しませんでした。管理画面からやり直してください。', null, 400);
  const code = url.searchParams.get('code');
  if (!code || code.length > 1024) return resultPage('認証コードがありません。管理画面からやり直してください。', null, 400);

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: CALLBACK, code_verifier: session.verifier }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    if (!response.ok || data.error || typeof data.access_token !== 'string' || !data.access_token) {
      return resultPage('GitHubとの認証に失敗しました。Client ID・Client Secret・Callback URLを確認し、管理画面からやり直してください。', null, 502);
    }
    // Public-repository scope only. Do not silently accept broader grants.
    if (data.scope?.split(/[ ,]+/).filter(Boolean).sort().join(',') !== 'public_repo') {
      return resultPage('GitHubの許可範囲が想定と異なります。公開リポジトリのみの許可を確認してください。', null, 403);
    }
    return resultPage('認証できました。記事管理画面に接続しています…', data.access_token);
  } catch {
    // Never expose upstream bodies, tokens, secrets or codes in error pages/logs.
    return resultPage('GitHubとの通信に失敗しました。管理画面から再度ログインしてください。', null, 502);
  }
}
