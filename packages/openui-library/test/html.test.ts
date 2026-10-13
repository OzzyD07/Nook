import { describe, expect, it } from 'vitest';

import { buildHtmlPage, EXAMPLES, HTML_CONTENT_SECURITY_POLICY, isHtmlDocument, THEMES, validateHtml, validateUi } from '../src';

const page = (head: string, body = '<p>Hi</p>') => `<!doctype html>\n<html><head>${head}</head><body>${body}</body></html>`;
const codes = (source: string) => {
  const result = validateHtml(source);
  return result.ok ? [] : result.errors.map((error) => error.code);
};

describe('html detail pages', () => {
  it('detects HTML documents by their doctype', () => {
    expect(isHtmlDocument('<!DOCTYPE html><html></html>')).toBe(true);
    expect(isHtmlDocument('  <!doctype html>\n<html></html>')).toBe(true);
    expect(isHtmlDocument(EXAMPLES.newsDetail)).toBe(false);
  });

  it.each([['htmlDetail'], ['htmlChartDetail']] as const)('%s validates', (name) => {
    const result = validateUi('detail', EXAMPLES[name]);
    expect(result.errors).toEqual([]);
    expect(result.format).toBe('html');
  });

  it('reads declared state fields and the theme', () => {
    const result = validateUi('detail', EXAMPLES.htmlDetail);
    expect(result.stateFields).toEqual([{ id: 'sleep-note', component: 'Html' }]);
    expect(result.ok && result.stats && 'theme' in result.stats && result.stats.theme).toBe('midnight');
  });

  it('keeps HTML off the dashboard tile', () => {
    expect(validateUi('card', EXAMPLES.htmlDetail).errors.map((error) => error.code)).toEqual(['wrong-root']);
  });

  it('rejects scripts and stylesheets from other hosts', () => {
    expect(codes(page('<script src="https://evil.example/x.js"></script>'))).toContain('forbidden-syntax');
    expect(codes(page('<script src="/local.js"></script>'))).toContain('forbidden-syntax');
    expect(codes(page('<link rel="stylesheet" href="https://evil.example/x.css">'))).toContain('forbidden-syntax');
    expect(codes(page('<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>'))).toEqual([]);
    expect(codes(page('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">'))).toEqual([]);
  });

  it('rejects frames, base tags and redirects', () => {
    expect(codes(page('', '<iframe src="https://example.com"></iframe>'))).toContain('forbidden-syntax');
    expect(codes(page('<base href="https://example.com/">'))).toContain('forbidden-syntax');
    expect(codes(page('<meta http-equiv="refresh" content="0;url=https://example.com">'))).toContain('forbidden-syntax');
  });

  it('rejects truncated pages, bad state ids and unknown themes', () => {
    expect(codes('<!doctype html><html><body>')).toContain('parse-error');
    expect(codes(page('<meta name="nook-state" content="Bad Id!">'))).toContain('invalid-prop');
    expect(codes(page('<meta name="nook-state" content="a a">'))).toContain('duplicate-id');
    expect(codes(page('<meta name="nook-theme" content="vaporwave">'))).toContain('invalid-prop');
  });

  it('warns about network calls that the sandbox blocks', () => {
    const result = validateHtml(page('', '<script>fetch("https://api.example.com")</script>'));
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  it('injects the policy, theme variables and bridge before the page head content', () => {
    const built = buildHtmlPage(page('<title>T</title>'), {
      scheme: 'dark',
      colors: THEMES.midnight.colors,
      state: { note: '</script><script>alert(1)</script>' },
    });
    const policy = built.indexOf(HTML_CONTENT_SECURITY_POLICY);
    expect(policy).toBeGreaterThan(built.indexOf('<head>'));
    expect(policy).toBeLessThan(built.indexOf('<title>'));
    expect(built).toContain('--nook-text-secondary:#A9B1D6');
    expect(built).toContain('window.nook');
    // Saved user input cannot close the bridge script.
    expect(built).not.toContain('</script><script>alert(1)');
  });

  it('adds a head when the page has none', () => {
    const built = buildHtmlPage('<!doctype html><html><body>x</body></html>', { scheme: 'light', colors: THEMES.paper.colors, state: {} });
    expect(built).toMatch(/^<!doctype html><html><head><meta charset="utf-8">/);
  });

  it('blocks network access in the policy', () => {
    expect(HTML_CONTENT_SECURITY_POLICY).toContain("connect-src 'none'");
    expect(HTML_CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
  });
});

describe('html pages with AI', () => {
  it('records a nook-ai declaration and requires it before calling nook.ai', () => {
    const declared = validateHtml(page('<meta name="nook-ai" content="chess opponent">', '<script>nook.ai.chat({ messages: [] })</script>'));
    expect(declared.ok && declared.stats.ai).toBe(true);
    const undeclared = validateHtml(page('', '<script>nook.ai.chat({ messages: [] })</script>'));
    expect(!undeclared.ok && undeclared.errors.map((error) => error.path)).toContain('nook-ai');
    expect(validateHtml(page('<title>x</title>')).stats?.ai).toBe(false);
  });

  it('exposes nook.ai.chat in the bridge', () => {
    const built = buildHtmlPage(page(''), { scheme: 'dark', colors: THEMES.noir.colors, state: {} });
    expect(built).toContain("chat: function (options) { return request('aiChat', options); }");
    expect(built).toContain('__nookReceive');
  });
});
