import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

export interface Env {
  OAUTH_KV: KVNamespace;
  /** Injected by OAuthProvider into every handler. */
  OAUTH_PROVIDER: OAuthHelpers;
  FIREBASE_PROJECT_ID: string;
  /** Public Firebase Web API key, used for the email/password sign-in on /authorize. */
  FIREBASE_WEB_API_KEY: string;
  /** e.g. https://nook-mcp.example.workers.dev; defaults to the request origin. */
  PUBLIC_BASE_URL?: string;
  /** Google service account key JSON (secret). */
  GCP_SA_JSON: string;
  /** Random secret used to sign the pending authorization request (secret). */
  STATE_SIGNING_KEY: string;
  /** Optional comma-separated Firebase UIDs allowed to connect an AI. */
  ALLOWED_UIDS?: string;
  /** Local development only: host:port of the Firestore emulator. */
  FIRESTORE_EMULATOR_HOST?: string;
}

/** Auth data stored in each OAuth grant and exposed to the MCP handler as ctx.props. */
export interface GrantProps {
  uid: string;
  scopes: string[];
  clientName: string;
}

export const SCOPES = {
  read: 'cards:read',
  write: 'cards:write',
  delete: 'cards:delete',
} as const;

export const SERVER_VERSION = '0.1.0';
