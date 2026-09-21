import { describe, expect, it } from 'vitest';

import { buildUiCapabilities, EXAMPLES, validateOpenUI } from '../src';

const codes = (surface: 'card' | 'detail', source: string) => {
  const result = validateOpenUI(surface, source);
  return result.ok ? [] : result.errors.map((error) => error.code);
};

describe('examples', () => {
  it.each([
    ['card', EXAMPLES.newsCard],
    ['card', EXAMPLES.metricCard],
    ['card', EXAMPLES.quoteCard],
    ['detail', EXAMPLES.newsDetail],
    ['detail', EXAMPLES.metricDetail],
  ] as const)('%s example validates', (surface, source) => {
    const result = validateOpenUI(surface, source);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it('returns the element tree', () => {
    const result = validateOpenUI('card', EXAMPLES.quoteCard);
    expect(result.ok && result.tree.typeName).toBe('CardContainer');
    expect(result.ok && result.stats.components).toContain('Icon');
  });
});

describe('rejections', () => {
  it('rejects unknown components', () => {
    expect(codes('card', 'root = CardContainer([Button("x")])')).toContain('unknown-component');
  });

  it('rejects detail-only components on the card surface', () => {
    expect(codes('card', 'root = CardContainer([Quote("x")])')).toContain('unknown-component');
  });

  it('rejects the wrong root', () => {
    expect(codes('card', 'root = Page([Text("x")])')).toContain('wrong-root');
    expect(codes('detail', 'root = Text("x")')).toContain('wrong-root');
  });

  it('rejects children in the wrong parent', () => {
    expect(codes('card', 'root = CardContainer([ListItem("x")])')).toContain('wrong-parent');
    expect(codes('card', 'root = CardContainer([List([Text("x")])])')).toContain('wrong-parent');
  });

  it('rejects invalid prop values', () => {
    expect(codes('card', 'root = CardContainer([Text("x", "huge")])')).toContain('invalid-prop');
    expect(codes('card', 'root = CardContainer([Progress(140)])')).toContain('invalid-prop');
    expect(codes('card', 'root = CardContainer([Icon("rocket-ship")])')).toContain('invalid-prop');
  });

  it('rejects non-https URLs', () => {
    expect(codes('card', 'root = CardContainer([Link("x", "http://example.com")])')).toContain('invalid-prop');
    expect(codes('card', 'root = CardContainer([Link("x", "javascript:alert(1)")])')).toContain('invalid-prop');
    expect(codes('card', 'root = CardContainer([Image("file:///etc/passwd")])')).toContain('invalid-prop');
  });

  it('rejects $state, expressions and builtins', () => {
    expect(codes('card', '$n = 1\nroot = CardContainer([Text("x")])')).toContain('forbidden-syntax');
    expect(codes('card', 'root = CardContainer([Text("a" + "b")])')).toContain('forbidden-syntax');
    expect(codes('card', 'root = CardContainer([Text(@Count([1, 2]))])')).toContain('forbidden-syntax');
  });

  it('rejects Query and Mutation', () => {
    expect(
      codes('card', 'q = Query("tool", {}, {rows: []})\nroot = CardContainer([Text("x")])'),
    ).toContain('forbidden-syntax');
  });

  it('rejects unresolved references and truncated input', () => {
    expect(codes('card', 'root = CardContainer([missing])')).toContain('unresolved-reference');
    expect(codes('card', 'root = CardContainer([Text("x"')).toContain('parse-error');
  });

  it('rejects oversized documents', () => {
    const long = `root = CardContainer([Text("${'x'.repeat(9000)}")])`;
    expect(codes('card', long)).toEqual(['too-large']);
  });

  it('rejects documents nested too deeply', () => {
    let inner = 'Text("x")';
    for (let i = 0; i < 9; i++) inner = `Stack([${inner}])`;
    expect(codes('card', `root = CardContainer([${inner}])`)).toContain('too-deep');
  });

  it('rejects empty documents', () => {
    expect(codes('card', '   ')).toEqual(['empty']);
  });

  it('warns about orphaned statements without rejecting', () => {
    const result = validateOpenUI('card', 'root = CardContainer([Text("x")])\nextra = Text("y")');
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });
});

describe('capabilities', () => {
  it('describes both surfaces with generated references', () => {
    const capabilities = buildUiCapabilities();
    expect(capabilities.surfaces.card.reference).toContain('CardContainer(');
    expect(capabilities.surfaces.detail.reference).toContain('Page(');
    expect(capabilities.surfaces.card.reference).not.toContain('Quote(');
    expect(JSON.stringify(capabilities).length).toBeLessThan(40_000);
  });
});

describe('error locations', () => {
  it('reports expressions on the node and prop that contain them', () => {
    const result = validateOpenUI('card', 'root = CardContainer([Stack([Text("a" + "b")])])');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual([
      expect.objectContaining({ code: 'forbidden-syntax', path: 'root:CardContainer.children[0]:Stack.children[0]:Text.text' }),
    ]);
  });

  it('rejects ternaries in slots', () => {
    const result = validateOpenUI('card', '$on = true\nroot = CardContainer($on ? [Text("a")] : [Text("b")])');
    expect(!result.ok && result.errors.map((error) => error.code)).toContain('forbidden-syntax');
  });
});
