import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { createMcpHandler } from 'agents/mcp/server';

import { app } from './app';
import { SCOPES, type Env, type GrantProps } from './env';
import { Firestore } from './firestore/client';
import { userPaths } from './firestore/paths';
import { serviceAccountToken } from './firestore/token';
import { createServer } from './mcp/server';
import type { ToolContext } from './repo/context';

/** The protected /mcp route. OAuthProvider has already verified the token and set ctx.props. */
const mcpApi: ExportedHandler<Env> & { fetch: NonNullable<ExportedHandler<Env>['fetch']> } = {
  fetch(request, env, ctx) {
    const props = (ctx as ExecutionContext & { props: GrantProps }).props;
    const db = new Firestore({
      projectId: env.FIREBASE_PROJECT_ID,
      getToken: () => serviceAccountToken(env.GCP_SA_JSON),
      emulatorHost: env.FIRESTORE_EMULATOR_HOST,
    });
    const requestId = crypto.randomUUID();
    const handler = createMcpHandler(({ authInfo }) => {
      const toolContext: ToolContext = {
        uid: props.uid,
        scopes: props.scopes,
        clientId: authInfo?.clientId ?? 'unknown',
        clientName: props.clientName,
        requestId,
        db,
        paths: userPaths(props.uid),
        now: () => new Date(),
        waitUntil: (promise) => ctx.waitUntil(promise),
      };
      return createServer(toolContext);
    });
    return handler(request, env, ctx);
  },
};

let provider: OAuthProvider<Env> | undefined;

function createProvider(baseUrl: string): OAuthProvider<Env> {
  const scopes = Object.values(SCOPES);
  return new OAuthProvider<Env>({
    apiRoute: '/mcp',
    apiHandler: mcpApi,
    defaultHandler: { fetch: (request, env, ctx) => app.fetch(request, env, ctx) },
    authorizeEndpoint: '/authorize',
    tokenEndpoint: '/oauth/token',
    // DCR is deprecated in MCP 2026 but several hosts still rely on it; CIMD is preferred.
    clientRegistrationEndpoint: '/oauth/register',
    clientIdMetadataDocumentEnabled: true,
    scopesSupported: scopes,
    resourceMetadata: {
      resource: `${baseUrl}/mcp`,
      // Issuers must be https; for local http development the provider derives it from the request.
      ...(baseUrl.startsWith('https://') && { authorization_servers: [baseUrl] }),
      // Advertise every scope: hosts request what is listed here, and a narrower request
      // would yield read-only tokens. The consent page decides what is actually granted.
      scopes_supported: scopes,
      resource_name: 'Nook dashboard',
    },
  });
}

export default {
  fetch(request, env, ctx) {
    // Built lazily because the canonical resource URL depends on the deployment's hostname.
    provider ??= createProvider((env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/+$/, ''));
    return provider.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
