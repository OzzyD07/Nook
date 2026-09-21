import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { showAuthorize, submitAuthorize } from './auth/authorize';
import { verifyFirebaseIdToken } from './auth/firebase';
import { SERVER_VERSION, type Env } from './env';

type AppEnv = { Bindings: Env; Variables: { uid: string } };

/** Everything that is not the protected /mcp route: OAuth consent, the app API, health. */
export const app = new Hono<AppEnv>();

app.get('/', (c) => c.text('Nook MCP server. Connect your AI app to /mcp.'));
app.get('/health', (c) => c.json({ ok: true, version: SERVER_VERSION }));

app.get('/authorize', (c) => showAuthorize(c.req.raw, c.env));
app.post('/authorize', (c) => submitAuthorize(c.req.raw, c.env));

// API used by the Nook app itself, authenticated with the user's Firebase ID token.
app.use('/api/*', cors({ origin: '*', allowHeaders: ['authorization', 'content-type'], allowMethods: ['GET', 'DELETE'] }));
app.use('/api/*', async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return c.json({ error: 'Missing token' }, 401);
  try {
    c.set('uid', await verifyFirebaseIdToken(token, c.env.FIREBASE_PROJECT_ID));
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
  await next();
});

async function listGrants(env: Env, uid: string) {
  const grants = [];
  let cursor: string | undefined;
  do {
    const page = await env.OAUTH_PROVIDER.listUserGrants(uid, { cursor, limit: 100 });
    grants.push(...page.items);
    cursor = page.cursor;
  } while (cursor);
  return grants;
}

app.get('/api/connections', async (c) => {
  const grants = await listGrants(c.env, c.get('uid'));
  return c.json({
    connections: grants.map((grant) => ({
      id: grant.id,
      clientId: grant.clientId,
      clientName: (grant.metadata as { clientName?: string } | null)?.clientName ?? grant.clientId,
      scopes: grant.scope,
      // Seconds or milliseconds depending on the library version; normalize to ms.
      createdAt: grant.createdAt < 1e12 ? grant.createdAt * 1000 : grant.createdAt,
    })),
  });
});

app.delete('/api/connections/:id', async (c) => {
  await c.env.OAUTH_PROVIDER.revokeGrant(c.req.param('id'), c.get('uid'));
  return c.json({ ok: true });
});

app.delete('/api/connections', async (c) => {
  const uid = c.get('uid');
  const grants = await listGrants(c.env, uid);
  await Promise.all(grants.map((grant) => c.env.OAUTH_PROVIDER.revokeGrant(grant.id, uid)));
  return c.json({ ok: true, revoked: grants.length });
});
