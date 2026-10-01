import { buildHtmlPage, validateHtml } from '@nook/openui';
import { FieldValueSchema } from '@nook/shared';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useRef, useState } from 'react';

import { askAi } from '@/openui/ask-ai';
import { openUrl } from '@/openui/open-url';
import { useCardState } from '@/openui/state-context';
import { presetTheme, useUiTheme } from '@/openui/ui-theme';
import { effectiveState, useCardStateStore } from '@/store/card-state';
import { usePreferences } from '@/store/preferences';

export const MIN_HEIGHT = 120;
const MAX_HEIGHT = 20_000;
const MAX_TEXT = 4_000;
/** Pages may open links or the AI app at most this often, so a script cannot loop them. */
const ACTION_INTERVAL_MS = 1_500;

/**
 * Everything a sandboxed HTML detail page needs: the document with the CSP, theme and
 * bridge injected, its content height, and a handler for messages from the bridge.
 * Messages are untrusted page output and are checked one by one.
 */
export function useHtmlPage(source: string, cardId: string | undefined) {
  const appTheme = useUiTheme();
  const cardState = useCardState();
  const aiApp = usePreferences((preferences) => preferences.aiApp);
  const [height, setHeight] = useState(MIN_HEIGHT);
  const lastAction = useRef(0);

  const validation = useMemo(() => validateHtml(source), [source]);
  const theme = presetTheme(validation.stats?.theme) ?? appTheme;
  const fields = useMemo(() => (validation.stats?.stateFields ?? []).map((field) => field.id), [validation]);

  // Built once per document and theme: saved input is read here, not subscribed to, so
  // the page's own edits do not reload it.
  const { scheme, colors } = theme;
  const html = useMemo(() => {
    const { remote, pending } = useCardStateStore.getState();
    const saved = cardId ? effectiveState(remote[cardId], pending[cardId]).fields : {};
    const state = Object.fromEntries(fields.filter((id) => saved[id]).map((id) => [id, saved[id]!.value]));
    return buildHtmlPage(source, { scheme, colors, state });
  }, [source, scheme, colors, fields, cardId]);

  const throttled = () => {
    const now = Date.now();
    if (now - lastAction.current < ACTION_INTERVAL_MS) return true;
    lastAction.current = now;
    return false;
  };

  const onMessage = (text: string) => {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (typeof message !== 'object' || message === null) return;
    switch (message.type) {
      case 'height':
        if (typeof message.value === 'number' && Number.isFinite(message.value)) {
          setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(message.value))));
        }
        break;
      case 'openUrl':
        if (!throttled()) openUrl(message.url);
        break;
      case 'copy':
        if (typeof message.text === 'string' && message.text.length <= MAX_TEXT) Clipboard.setStringAsync(message.text);
        break;
      case 'askAi':
        if (typeof message.prompt === 'string' && message.prompt.length <= MAX_TEXT && !throttled()) {
          askAi(aiApp, message.prompt).catch(() => undefined);
        }
        break;
      case 'requestRefresh':
        if (cardState.interactive) cardState.requestRefresh();
        break;
      case 'setField': {
        const value = FieldValueSchema.safeParse(message.value);
        if (cardState.interactive && typeof message.id === 'string' && fields.includes(message.id) && value.success) {
          cardState.setField(message.id, value.data);
        }
        break;
      }
    }
  };

  return { html, height, onMessage, scheme, valid: validation.ok };
}
