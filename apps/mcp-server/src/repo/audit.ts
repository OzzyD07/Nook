import type { Write } from '../firestore/client';
import type { ToolContext } from './context';
import { randomId } from './hash';

export type AuditResult = 'success' | 'rejected' | 'error';

export function auditWrite(
  ctx: ToolContext,
  action: string,
  cardId: string | null,
  result: AuditResult,
  errorCode: string | null = null,
): Write {
  return ctx.db.set(
    ctx.paths.auditLog(randomId()),
    {
      provider: ctx.clientName,
      clientId: ctx.clientId,
      action,
      cardId,
      result,
      errorCode,
      requestId: ctx.requestId,
      timestamp: ctx.now(),
    },
    { exists: false },
  );
}

/** Failed writes are logged too, but never block or fail the response. */
export function recordFailure(ctx: ToolContext, action: string, cardId: string | null, result: AuditResult, errorCode: string): void {
  ctx.waitUntil(ctx.db.commit([auditWrite(ctx, action, cardId, result, errorCode)]).catch(() => undefined));
}
