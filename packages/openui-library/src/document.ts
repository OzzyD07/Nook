import type { UiSurface } from '@nook/shared';

import { isHtmlDocument, validateHtml, type HtmlStats } from './html';
import { validateOpenUI, type UiIssue, type UiStateField, type UiStats } from './validate';

export type UiFormat = 'openui' | 'html';

export interface UiDocumentResult {
  ok: boolean;
  format: UiFormat;
  errors: UiIssue[];
  warnings: UiIssue[];
  /** Fields the page saves user input under, whatever the format. */
  stateFields: UiStateField[];
  stats: UiStats | HtmlStats | null;
}

/**
 * Validates a card document in either format: OpenUI Lang for both surfaces, or a
 * complete HTML document for the detail page only.
 */
export function validateUi(surface: UiSurface, source: string): UiDocumentResult {
  if (isHtmlDocument(source)) {
    if (surface === 'card') {
      return {
        ok: false,
        format: 'html',
        errors: [
          {
            code: 'wrong-root',
            path: '',
            message: 'The dashboard tile (previewUi) must be OpenUI Lang; HTML is only supported for the detail page (detailUi)',
          },
        ],
        warnings: [],
        stateFields: [],
        stats: null,
      };
    }
    const result = validateHtml(source);
    return {
      ok: result.ok,
      format: 'html',
      errors: result.ok ? [] : result.errors,
      warnings: result.warnings,
      stateFields: result.stats?.stateFields ?? [],
      stats: result.stats,
    };
  }
  const result = validateOpenUI(surface, source);
  return {
    ok: result.ok,
    format: 'openui',
    errors: result.ok ? [] : result.errors,
    warnings: result.warnings,
    stateFields: result.stats?.stateFields ?? [],
    stats: result.stats,
  };
}
