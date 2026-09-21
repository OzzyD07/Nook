import { AuthorizationError, type AuthRequest } from '@cloudflare/workers-oauth-provider';

import { SCOPES, type Env, type GrantProps } from '../env';
import { SignInError, signInWithPassword } from './firebase';
import { signState, verifyState } from './signed-state';

/** How long the sign-in form stays valid. */
const FORM_TTL_SECONDS = 10 * 60;

interface PendingAuthorization {
  request: AuthRequest;
  clientName: string;
  redirectHost: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function page(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect to Nook</title><style>
:root{color-scheme:light dark;--bg:#f2f2f5;--card:#fff;--text:#0b0b0f;--muted:#60646c;--border:#e1e2e7;--accent:#2f6bff;--error:#d93a3a}
@media (prefers-color-scheme:dark){:root{--bg:#000;--card:#17181b;--text:#f5f5f7;--muted:#a6aab2;--border:#2a2c31;--accent:#6b97ff;--error:#ff6b6b}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text);font:15px/1.45 system-ui,-apple-system,sans-serif;padding:16px}
main{width:100%;max-width:400px;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:28px}
h1{font-size:22px;margin:0 0 6px}p{margin:0 0 16px;color:var(--muted)}ul{margin:0 0 18px;padding-left:18px}li{margin:4px 0}
label.field{display:block;font-size:13px;color:var(--muted);margin:12px 0 4px}
input[type=email],input[type=password]{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text);font:inherit}
.check{display:flex;gap:8px;align-items:flex-start;margin:14px 0 4px;font-size:14px}.check input{margin-top:3px}
.buttons{display:flex;gap:10px;margin-top:20px}button{flex:1;padding:12px;border-radius:10px;border:0;font:inherit;font-weight:600;cursor:pointer}
.allow{background:var(--accent);color:#fff}.deny{background:transparent;color:var(--text);border:1px solid var(--border)}
.error{color:var(--error);margin:12px 0 0}.host{font-family:ui-monospace,monospace;font-size:13px}
</style></head><body><main>${body}</main></body></html>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
        'cache-control': 'no-store',
      },
    },
  );
}

function consentForm(pending: PendingAuthorization, state: string, error?: string, email = ''): Response {
  return page(`
<h1>Connect ${escapeHtml(pending.clientName)} to Nook</h1>
<p>It will be able to manage your dashboard. Afterwards it returns you to <span class="host">${escapeHtml(pending.redirectHost)}</span>.</p>
<ul><li>Read your cards</li><li>Create and update cards</li></ul>
<form method="post" action="/authorize">
<input type="hidden" name="state" value="${escapeHtml(state)}">
<label class="field" for="email">Nook account email</label>
<input id="email" name="email" type="email" autocomplete="username" required value="${escapeHtml(email)}">
<label class="field" for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password">
<label class="check"><input type="checkbox" name="allowDelete" value="1"><span>Also allow it to delete cards (you can restore deleted cards in the app)</span></label>
${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
<div class="buttons"><button class="deny" type="submit" name="decision" value="deny" formnovalidate>Deny</button><button class="allow" type="submit" name="decision" value="allow">Allow</button></div>
</form>`);
}

function errorRedirect(request: AuthRequest, code: string, description: string): Response {
  const redirect = new URL(request.redirectUri);
  redirect.searchParams.set('error', code);
  redirect.searchParams.set('error_description', description);
  if (request.state) redirect.searchParams.set('state', request.state);
  if (request.issuer) redirect.searchParams.set('iss', request.issuer);
  return Response.redirect(redirect.toString(), 302);
}

/** GET /authorize: validate the OAuth request and show the sign-in + consent form. */
export async function showAuthorize(request: Request, env: Env): Promise<Response> {
  let oauthRequest: AuthRequest;
  try {
    oauthRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    if (!error.redirectUri) return page(`<h1>Invalid request</h1><p>${escapeHtml(error.description)}</p>`, 400);
    const redirect = new URL(error.redirectUri);
    redirect.searchParams.set('error', error.code);
    redirect.searchParams.set('error_description', error.description);
    if (error.state) redirect.searchParams.set('state', error.state);
    if (error.issuer) redirect.searchParams.set('iss', error.issuer);
    return Response.redirect(redirect.toString(), 302);
  }
  const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId);
  if (!client) return page('<h1>Unknown application</h1><p>This AI app is not registered.</p>', 400);

  const pending: PendingAuthorization = {
    request: oauthRequest,
    clientName: client.clientName || new URL(oauthRequest.redirectUri).host,
    redirectHost: new URL(oauthRequest.redirectUri).host,
  };
  return consentForm(pending, await signState(pending, env.STATE_SIGNING_KEY, FORM_TTL_SECONDS));
}

/** POST /authorize: sign the user in with Firebase, then grant or deny. */
export async function submitAuthorize(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const state = String(form.get('state') ?? '');
  const pending = await verifyState<PendingAuthorization>(state, env.STATE_SIGNING_KEY);
  if (!pending) return page('<h1>This page expired</h1><p>Start connecting again from your AI app.</p>', 400);

  if (form.get('decision') !== 'allow') {
    return errorRedirect(pending.request, 'access_denied', 'The user denied access');
  }

  const email = String(form.get('email') ?? '').trim();
  let uid: string;
  try {
    ({ uid } = await signInWithPassword(email, String(form.get('password') ?? ''), env.FIREBASE_WEB_API_KEY));
  } catch (error) {
    if (error instanceof SignInError) return consentForm(pending, state, error.message, email);
    throw error;
  }

  const allowed = (env.ALLOWED_UIDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(uid)) {
    return consentForm(pending, state, 'This account is not allowed to connect AI apps to this server.', email);
  }

  const scopes: string[] = [SCOPES.read, SCOPES.write];
  if (form.get('allowDelete') === '1') scopes.push(SCOPES.delete);
  const props: GrantProps = { uid, scopes, clientName: pending.clientName };
  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: pending.request,
    userId: uid,
    metadata: { clientName: pending.clientName },
    scope: scopes,
    props,
  });
  return Response.redirect(redirectTo, 302);
}
