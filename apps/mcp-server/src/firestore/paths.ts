const UID = /^[A-Za-z0-9_-]{1,128}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;

function segment(value: string, pattern: RegExp, label: string): string {
  if (!pattern.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}

/**
 * Every Firestore path the Worker touches is built here, from the authenticated uid.
 * The service account bypasses security rules, so this is what keeps users apart:
 * a uid never comes from tool input.
 */
export function userPaths(uid: string) {
  const root = `users/${segment(uid, UID, 'uid')}`;
  return {
    root,
    card: (cardId: string) => `${root}/cards/${segment(cardId, ID, 'card id')}`,
    cardVersion: (cardId: string, version: number) =>
      `${root}/cardVersions/${segment(cardId, ID, 'card id')}_v${Math.trunc(version)}`,
    idempotency: (id: string) => `${root}/idempotency/${segment(id, ID, 'idempotency id')}`,
    auditLog: (id: string) => `${root}/auditLogs/${segment(id, ID, 'audit id')}`,
  };
}

export type UserPaths = ReturnType<typeof userPaths>;
