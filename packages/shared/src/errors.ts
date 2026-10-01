export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UI_INVALID',
  'CARD_NOT_FOUND',
  'VERSION_CONFLICT',
  'IDEMPOTENCY_KEY_REUSED',
  'FORBIDDEN_SCOPE',
  'CARD_LIMIT_REACHED',
  'DESIGN_LOCKED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** An expected, user-facing failure. Anything else is reported as INTERNAL. */
export class NookError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'NookError';
    this.code = code;
    this.details = details;
  }
}
