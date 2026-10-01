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
    ['card', EXAMPLES.weekCard],
    ['detail', EXAMPLES.newsDetail],
    ['detail', EXAMPLES.metricDetail],
    ['detail', EXAMPLES.groceryDetail],
    ['detail', EXAMPLES.calendarDetail],
    ['card', EXAMPLES.weatherCard],
    ['card', EXAMPLES.photoCard],
    ['card', EXAMPLES.ringCard],
    ['card', EXAMPLES.focusCard],
    ['card', EXAMPLES.gaugeCard],
    ['detail', EXAMPLES.habitDetail],
    ['detail', EXAMPLES.eventDetail],
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

describe('styling', () => {
  it('accepts tones, hex colors and light/dark pairs', () => {
    expect(codes('card', 'root = CardContainer([Text("x", null, null, null, null, "accent")])')).toEqual([]);
    expect(codes('card', 'root = CardContainer([Text("x", null, null, null, null, "#FF8800")])')).toEqual([]);
    expect(codes('card', 'root = CardContainer([Text("x", null, null, null, null, "#FF880080")])')).toEqual([]);
    expect(codes('card', 'root = CardContainer([Text("x", null, null, null, null, {light: "#000000", dark: "#FFFFFF"})])')).toEqual([]);
  });

  it('rejects malformed colors, unknown themes and fonts', () => {
    expect(codes('card', 'root = CardContainer([Text("x", null, null, null, null, "orange")])')).toContain('invalid-prop');
    expect(codes('card', 'root = CardContainer([Text("x", null, null, null, null, "#F80")])')).toContain('invalid-prop');
    expect(codes('card', 'root = CardContainer([Text("x")], null, null, "vaporwave")')).toContain('invalid-prop');
    expect(codes('card', 'root = CardContainer([Heading("x", null, null, "comic-sans")])')).toContain('invalid-prop');
  });

  it('takes a single background element', () => {
    expect(codes('card', 'root = CardContainer([Text("x")], null, null, null, Gradient(["#000000", "#FFFFFF"], 90))')).toEqual([]);
    expect(codes('card', 'root = CardContainer([Text("x")], null, null, null, [Fill("#000000")])')).toContain('invalid-prop');
    expect(codes('card', 'root = CardContainer([Text("x")], null, null, null, Text("y"))')).toContain('wrong-parent');
    expect(codes('card', 'root = CardContainer([Fill("#000000")])')).toContain('wrong-parent');
  });

  it('checks mesh sizes and gauge ranges', () => {
    expect(codes('card', 'root = CardContainer([Text("x")], null, null, null, MeshGradient(["#000000", "#111111", "#222222", "#333333", "#444444"]))')).toContain('invalid-prop');
    expect(codes('card', 'root = CardContainer([Gauge(5, 10, 0)])')).toContain('invalid-prop');
  });

  it('accepts backgrounds on nested Surfaces and the detail Page', () => {
    expect(codes('card', 'root = CardContainer([Surface([Text("x")], RadialGradient(["#FF0000", "#000000"]), "glass")])')).toEqual([]);
    expect(codes('detail', 'root = Page([Text("x")], "ocean", BackgroundImage("https://example.com/a.jpg", 0.5, 10))')).toEqual([]);
  });
});

describe('capabilities', () => {
  it('describes both surfaces with generated references', () => {
    const capabilities = buildUiCapabilities();
    expect(capabilities.surfaces.card.reference).toContain('CardContainer(');
    expect(capabilities.surfaces.detail.reference).toContain('Page(');
    expect(capabilities.surfaces.card.reference).not.toContain('Quote(');
    expect(JSON.stringify(capabilities).length).toBeLessThan(48_000);
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

describe('interactive components', () => {
  it('lists the stateful fields of a document', () => {
    const result = validateOpenUI('detail', EXAMPLES.groceryDetail);
    expect(result.ok && result.stats.stateFields).toEqual([
      { id: 'groceries', component: 'Checklist' },
      { id: 'requests', component: 'TextInput' },
    ]);
  });

  it('keeps stateful components off the card surface', () => {
    expect(codes('card', 'root = CardContainer([TextInput("note", "Note")])')).toContain('unknown-component');
  });

  it('rejects duplicate ids across interactive components', () => {
    expect(codes('detail', 'root = Page([TextInput("note", "A"), Rating("note", "B")])')).toContain('duplicate-id');
  });

  it('rejects duplicate checklist item ids', () => {
    expect(
      codes('detail', 'root = Page([Checklist("list", [ChecklistItem("a", "One"), ChecklistItem("a", "Two")])])'),
    ).toContain('duplicate-id');
  });

  it('rejects malformed ids', () => {
    expect(codes('detail', 'root = Page([TextInput("My Note", "A")])')).toContain('invalid-prop');
  });

  it('checks button actions against their value', () => {
    expect(codes('detail', 'root = Page([Button("Go", "open_url", "http://example.com")])')).toContain('invalid-prop');
    expect(codes('detail', 'root = Page([Button("Copy", "copy")])')).toContain('invalid-prop');
    expect(codes('detail', 'root = Page([Button("Refresh", "request_refresh")])')).toEqual([]);
  });

  it('rejects duplicate choice options', () => {
    expect(codes('detail', 'root = Page([Choice("pick", "Pick", ["A", "A"])])')).toContain('invalid-prop');
  });

  it('does not allow Tabs inside a Tab', () => {
    expect(
      codes('detail', 'root = Page([Tabs([Tab("A", [Tabs([Tab("x", [Text("1")]), Tab("y", [Text("2")])])]), Tab("B", [Text("b")])])])'),
    ).toContain('wrong-parent');
  });
});

describe('calendar and table components', () => {
  it('rejects impossible dates and months', () => {
    expect(codes('detail', 'root = Page([Agenda([CalendarEvent("2026-02-30", "x")])])')).toContain('invalid-prop');
    expect(codes('detail', 'root = Page([Calendar("2026-13", [])])')).toContain('invalid-prop');
    expect(codes('card', 'root = CardContainer([Countdown("tomorrow", "Soon")])')).toContain('invalid-prop');
  });

  it('allows empty calendars and agendas', () => {
    expect(codes('detail', 'root = Page([Calendar("2026-09", []), Agenda([])])')).toEqual([]);
  });

  it('requires table rows to match the columns', () => {
    expect(codes('detail', 'root = Page([Table(["A", "B"], [["1", "2"], ["3"]])])')).toContain('invalid-prop');
    expect(codes('detail', 'root = Page([Table(["A", "B"], [["1", "2"]], "Compare")])')).toEqual([]);
  });
});
