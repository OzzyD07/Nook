import type { Firestore } from '../firestore/client';
import type { UserPaths } from '../firestore/paths';

/** Everything a tool call needs, derived from the verified OAuth grant. */
export interface ToolContext {
  uid: string;
  scopes: readonly string[];
  clientId: string;
  clientName: string;
  requestId: string;
  db: Firestore;
  paths: UserPaths;
  now: () => Date;
  waitUntil: (promise: Promise<unknown>) => void;
}
