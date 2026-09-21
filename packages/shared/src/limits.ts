/** Hard limits enforced by the MCP server and re-checked by the mobile renderer. */
export const LIMITS = {
  maxCards: 50,
  titleMaxLength: 80,
  maxSources: 20,
  urlMaxLength: 2048,
  statusMessageMaxLength: 280,
  /** Maximum UTF-8 size of an OpenUI document, per surface. */
  uiMaxBytes: { card: 8 * 1024, detail: 48 * 1024 },
  /** Maximum element nesting depth, per surface. */
  uiMaxDepth: { card: 8, detail: 12 },
  /** Maximum number of element nodes, per surface. */
  uiMaxNodes: { card: 80, detail: 400 },
  /** How many content versions are retained per card. */
  versionsRetained: 20,
  /** How long an idempotency record is kept. */
  idempotencyTtlMs: 7 * 24 * 60 * 60 * 1000,
} as const;

/** Dashboard grid rules. The AI picks relative spans; the app maps them to pixels. */
export const GRID = {
  phoneColumns: 2,
  tabletColumns: 4,
  tabletMinWidth: 768,
  columnSpan: { min: 1, max: 2 },
  rowSpan: { min: 1, max: 3 },
} as const;

export type UiSurface = 'card' | 'detail';
