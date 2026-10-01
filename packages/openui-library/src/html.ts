import { CARD_STATE_LIMITS, LIMITS, STATE_ID_PATTERN } from '@nook/shared';

import { THEMES, type ThemeName, type ThemePalette } from './styles';
import { utf8Length, type UiIssue, type UiStateField } from './validate';

/**
 * HTML detail pages. A detailUi that starts with <!doctype html> is a complete HTML
 * document rendered in a sandboxed web view instead of the native OpenUI renderer.
 * The sandbox, not this validator, is the security boundary: the app injects a
 * Content-Security-Policy that blocks all network access except images, media,
 * fonts and scripts/styles from a few public CDNs. Validation rejects what the
 * sandbox would block anyway, so the AI gets a clear error instead of a broken page.
 */

const DOCTYPE = /^\s*<!doctype\s+html\b/i;

export function isHtmlDocument(source: string): boolean {
  return DOCTYPE.test(source);
}

/** Script and stylesheet hosts pages may load libraries from. */
export const HTML_LIBRARY_ORIGINS = ['https://cdn.jsdelivr.net', 'https://unpkg.com', 'https://cdnjs.cloudflare.com'] as const;
const FONT_CSS_ORIGIN = 'https://fonts.googleapis.com';
const FONT_FILE_ORIGIN = 'https://fonts.gstatic.com';

const LIBRARIES = HTML_LIBRARY_ORIGINS.join(' ');

/** The policy the app injects ahead of the page's own markup. */
export const HTML_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  `script-src 'unsafe-inline' 'unsafe-eval' ${LIBRARIES}`,
  `style-src 'unsafe-inline' ${LIBRARIES} ${FONT_CSS_ORIGIN}`,
  `font-src data: ${LIBRARIES} ${FONT_FILE_ORIGIN}`,
  'img-src https: data: blob:',
  'media-src https: data: blob:',
  "connect-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

const FORBIDDEN_TAGS = ['iframe', 'frame', 'frameset', 'object', 'embed', 'base', 'portal'];

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
}

function metaContent(source: string, name: string): string | null {
  for (const match of source.matchAll(/<meta\b[^>]*>/gi)) {
    if (attribute(match[0], 'name')?.toLowerCase() === name) return attribute(match[0], 'content') ?? '';
  }
  return null;
}

const fromOrigins = (url: string, origins: readonly string[]) => origins.some((origin) => url.startsWith(`${origin}/`));

export interface HtmlStats {
  bytes: number;
  /** Fields declared in <meta name="nook-state">; the page saves them with nook.setField. */
  stateFields: UiStateField[];
  /** Preset theme from <meta name="nook-theme">, applied to the screen around the page. */
  theme: ThemeName | null;
}

export type HtmlValidationResult =
  | { ok: true; warnings: UiIssue[]; stats: HtmlStats }
  | { ok: false; errors: UiIssue[]; warnings: UiIssue[]; stats: HtmlStats | null };

export function validateHtml(source: string): HtmlValidationResult {
  const errors: UiIssue[] = [];
  const warnings: UiIssue[] = [];
  const bytes = utf8Length(source);
  const max = LIMITS.uiMaxBytes.detail;
  if (bytes > max) {
    return { ok: false, errors: [{ code: 'too-large', path: '', message: `Document is ${bytes} bytes; the detail limit is ${max}` }], warnings, stats: null };
  }
  if (!isHtmlDocument(source)) {
    errors.push({ code: 'parse-error', path: '', message: 'An HTML page must start with <!doctype html>' });
  }
  if (!/<\/html\s*>\s*$/i.test(source)) {
    errors.push({ code: 'parse-error', path: '', message: 'Document is truncated: it must end with </html>' });
  }

  for (const tag of FORBIDDEN_TAGS) {
    if (new RegExp(`<${tag}\\b`, 'i').test(source)) {
      errors.push({ code: 'forbidden-syntax', path: `<${tag}>`, message: `<${tag}> is not allowed` });
    }
  }
  if (/<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i.test(source)) {
    errors.push({ code: 'forbidden-syntax', path: '<meta http-equiv="refresh">', message: 'Redirects are not allowed' });
  }
  for (const match of source.matchAll(/<script\b[^>]*>/gi)) {
    const src = attribute(match[0], 'src');
    if (src !== null && !fromOrigins(src, HTML_LIBRARY_ORIGINS)) {
      errors.push({
        code: 'forbidden-syntax',
        path: '<script src>',
        message: `Scripts may only load from ${HTML_LIBRARY_ORIGINS.join(', ')}; got "${src.slice(0, 120)}". Inline your own code`,
      });
    }
  }
  for (const match of source.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attribute(match[0], 'rel')?.toLowerCase() ?? '';
    const href = attribute(match[0], 'href');
    if (rel.includes('stylesheet') && href !== null && !fromOrigins(href, [...HTML_LIBRARY_ORIGINS, FONT_CSS_ORIGIN])) {
      errors.push({
        code: 'forbidden-syntax',
        path: '<link rel="stylesheet">',
        message: `Stylesheets may only load from ${[...HTML_LIBRARY_ORIGINS, FONT_CSS_ORIGIN].join(', ')}; got "${href.slice(0, 120)}"`,
      });
    }
  }
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/.test(source)) {
    warnings.push({
      code: 'forbidden-syntax',
      path: '',
      message: 'Network requests are blocked inside the page; write the data into the document instead',
    });
  }

  const stateFields: UiStateField[] = [];
  const declared = metaContent(source, 'nook-state');
  if (declared !== null) {
    for (const id of declared.split(/[\s,]+/).filter(Boolean)) {
      if (!STATE_ID_PATTERN.test(id)) {
        errors.push({ code: 'invalid-prop', path: 'nook-state', message: `"${id}" is not a valid state id (a-z, 0-9, _ or -, up to 40)` });
      } else if (stateFields.some((field) => field.id === id)) {
        errors.push({ code: 'duplicate-id', path: 'nook-state', message: `"${id}" is declared twice` });
      } else {
        stateFields.push({ id, component: 'Html' });
      }
    }
    if (stateFields.length > CARD_STATE_LIMITS.maxFields) {
      errors.push({ code: 'invalid-prop', path: 'nook-state', message: `At most ${CARD_STATE_LIMITS.maxFields} state fields` });
    }
  }

  let theme: ThemeName | null = null;
  const themeName = metaContent(source, 'nook-theme');
  if (themeName !== null) {
    if (themeName in THEMES) theme = themeName as ThemeName;
    else errors.push({ code: 'invalid-prop', path: 'nook-theme', message: `Unknown theme "${themeName}"; use one of ${Object.keys(THEMES).join(', ')}` });
  }

  const stats: HtmlStats = { bytes, stateFields, theme };
  return errors.length > 0 ? { ok: false, errors, warnings, stats } : { ok: true, warnings, stats };
}

export interface HtmlPageContext {
  scheme: 'light' | 'dark';
  colors: ThemePalette;
  /** Saved values of the page's declared state fields. */
  state: Record<string, unknown>;
}

/** JSON that is safe inside an inline <script>. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}

const cssVar = (name: string) => `--nook-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/**
 * Runs before the page's own scripts: exposes window.nook, routes link taps to the app
 * and reports the content height so the page can scroll with the rest of the screen.
 */
const BRIDGE = `(function () {
  var data = __NOOK_DATA__;
  var post = function (message) {
    var text = JSON.stringify(message);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else if (window.parent !== window) window.parent.postMessage({ nook: text }, '*');
  };
  var state = data.state;
  window.nook = Object.freeze({
    theme: Object.freeze(data.theme),
    getState: function (id) { return id === undefined ? JSON.parse(JSON.stringify(state)) : state[id]; },
    setField: function (id, value) { state[id] = value; post({ type: 'setField', id: String(id), value: value }); },
    openUrl: function (url) { post({ type: 'openUrl', url: String(url) }); },
    copy: function (text) { post({ type: 'copy', text: String(text) }); },
    requestRefresh: function () { post({ type: 'requestRefresh' }); },
    askAi: function (prompt) { post({ type: 'askAi', prompt: String(prompt) }); }
  });
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link || (link.getAttribute('href') || '').charAt(0) === '#') return;
    event.preventDefault();
    post({ type: 'openUrl', url: link.href });
  }, true);
  var last = 0;
  var report = function () {
    var height = Math.ceil(Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0));
    if (height !== last) { last = height; post({ type: 'height', value: height }); }
  };
  document.addEventListener('DOMContentLoaded', function () {
    report();
    if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
  });
  window.addEventListener('load', report);
})();`;

/**
 * The document the web view loads: the CSP, the theme as CSS variables and the bridge,
 * inserted at the top of <head> so they apply before anything the page declares.
 */
export function buildHtmlPage(source: string, context: HtmlPageContext): string {
  const variables = Object.entries(context.colors)
    .map(([name, value]) => `${cssVar(name)}:${value}`)
    .join(';');
  const head = [
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${HTML_CONTENT_SECURITY_POLICY}">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">',
    `<style>:root{color-scheme:${context.scheme};${variables}}html,body{margin:0;background:transparent;color:var(--nook-text);font-family:-apple-system,system-ui,Roboto,"Segoe UI",sans-serif;-webkit-text-size-adjust:100%}</style>`,
    `<script>${BRIDGE.replace('__NOOK_DATA__', scriptJson({ theme: { scheme: context.scheme, colors: context.colors }, state: context.state }))}</script>`,
  ].join('');
  const headTag = /<head\b[^>]*>/i.exec(source);
  if (headTag) return source.slice(0, headTag.index + headTag[0].length) + head + source.slice(headTag.index + headTag[0].length);
  const htmlTag = /<html\b[^>]*>/i.exec(source);
  const at = htmlTag ? htmlTag.index + htmlTag[0].length : (/^\s*<!doctype[^>]*>/i.exec(source)?.[0].length ?? 0);
  return `${source.slice(0, at)}<head>${head}</head>${source.slice(at)}`;
}
