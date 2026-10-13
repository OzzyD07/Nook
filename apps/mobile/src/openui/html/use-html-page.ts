import { buildHtmlPage, validateHtml } from '@nook/openui';
import { AiChatRequestSchema, FieldValueSchema } from '@nook/shared';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useRef, useState } from 'react';

import { askAi } from '@/openui/ask-ai';
import type { HtmlFrameHandle } from '@/openui/html/HtmlFrame';
import { openUrl } from '@/openui/open-url';
import { useCardState } from '@/openui/state-context';
import { presetTheme, useUiTheme } from '@/openui/ui-theme';
import { aiChat } from '@/services/api';
import { effectiveState, useCardStateStore } from '@/store/card-state';
import { usePreferences } from '@/store/preferences';

export const MIN_HEIGHT = 120;
const MAX_HEIGHT = 20_000;
const MAX_TEXT = 4_000;
/** Pages may open links, sub-pages or the AI app at most this often, so a script cannot loop them. */
const ACTION_INTERVAL_MS = 1_000;
/** AI calls a page may have running at once. */
const MAX_AI_IN_FLIGHT = 2;

export interface HtmlPageHandlers {
  /** Opens a sub-page of the card; only ids in `pageIds` reach it. */
  onOpenPage?: (id: string) => void;
  onFullscreen?: (on: boolean) => void;
  /** Sub-page ids the page may open. */
  pageIds?: readonly string[];
}

/**
 * Everything a sandboxed HTML detail page needs: the document with the CSP, theme and
 * bridge injected, its content height, and a handler for messages from the bridge.
 * Messages are untrusted page output and are checked one by one.
 */
export function useHtmlPage(source: string, cardId: string | undefined, handlers: HtmlPageHandlers = {}) {
  const appTheme = useUiTheme();
  const cardState = useCardState();
  const aiApp = usePreferences((preferences) => preferences.aiApp);
  const [height, setHeight] = useState(MIN_HEIGHT);
  const lastAction = useRef(0);
  const aiInFlight = useRef(0);
  const frameRef = useRef<HtmlFrameHandle>(null);

  const validation = useMemo(() => validateHtml(source), [source]);
  const theme = presetTheme(validation.stats?.theme) ?? appTheme;
  const fields = useMemo(() => (validation.stats?.stateFields ?? []).map((field) => field.id), [validation]);
  const aiAllowed = validation.stats?.ai === true;

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

  const runAiChat = async (requestId: string, payload: unknown) => {
    const reply = (result: { ok: true; value: unknown } | { ok: false; error: string }) => frameRef.current?.reply({ requestId, ...result });
    if (!aiAllowed || !cardState.interactive || !cardId) {
      reply({ ok: false, error: 'AI is not available on this page.' });
      return;
    }
    if (aiInFlight.current >= MAX_AI_IN_FLIGHT) {
      reply({ ok: false, error: 'Wait for the previous AI answer first.' });
      return;
    }
    const input = AiChatRequestSchema.safeParse({ ...(payload as object), cardId });
    if (!input.success) {
      reply({ ok: false, error: input.error.issues[0]?.message ?? 'Invalid AI request.' });
      return;
    }
    aiInFlight.current += 1;
    try {
      const { content, model } = await aiChat(input.data);
      reply({ ok: true, value: { content, model } });
    } catch (error) {
      reply({ ok: false, error: error instanceof Error ? error.message : String(error) });
    } finally {
      aiInFlight.current -= 1;
    }
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
      case 'openPage':
        if (typeof message.id === 'string' && handlers.pageIds?.includes(message.id) && !throttled()) handlers.onOpenPage?.(message.id);
        break;
      case 'fullscreen':
        if (typeof message.value === 'boolean') handlers.onFullscreen?.(message.value);
        break;
      case 'copy':
        if (typeof message.text === 'string' && message.text.length <= MAX_TEXT) Clipboard.setStringAsync(message.text);
        break;
      case 'askAi':
        if (typeof message.prompt === 'string' && message.prompt.length <= MAX_TEXT && !throttled()) {
          askAi(aiApp, message.prompt).catch(() => undefined);
        }
        break;
      case 'aiChat':
        if (typeof message.requestId === 'string' && message.requestId.length <= 20) runAiChat(message.requestId, message.payload);
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

  return { html, height, onMessage, frameRef, scheme, valid: validation.ok };
}
