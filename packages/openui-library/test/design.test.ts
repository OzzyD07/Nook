import { describe, expect, it } from 'vitest';

import { designChanges, EXAMPLES } from '../src';

const card = (body: string, theme = '"sunset"') =>
  `root = CardContainer([top, body], null, null, ${theme})\ntop = Row([Caption("ISTANBUL"), Icon("sun", "md", "accent")], "sm", "center", "between")\nbody = ${body}`;

describe('design locks', () => {
  it('allows data changes: text, numbers, icons and value lists', () => {
    const before = card('Stack([Display("24°", "xl", null, "outfit"), Sparkline([1, 2, 3], "positive")])');
    const after = card('Stack([Display("19°", "xl", null, "outfit"), Sparkline([4, 2, 9, 7], "positive")])').replace(
      'Icon("sun"',
      'Icon("rain"',
    );
    expect(designChanges('card', before, after)).toEqual([]);
  });

  it('reports styling changes with their location', () => {
    const before = card('Display("24°", "xl", null, "outfit")');
    expect(designChanges('card', before, card('Display("24°", "lg", null, "outfit")'))).toEqual([
      { path: 'root:CardContainer.children[1]:Display.size', message: 'Display size changed from "xl" to "lg"' },
    ]);
    expect(designChanges('card', before, card('Display("24°", "xl", null, "outfit")', '"ocean"'))).toEqual([
      { path: 'root:CardContainer.theme', message: 'CardContainer theme changed from "sunset" to "ocean"' },
    ]);
  });

  it('reports added, removed and replaced components', () => {
    const before = card('Display("24°")');
    expect(designChanges('card', before, card('Text("24°")'))[0]?.message).toBe('Display was replaced by Text');
    const extra = before.replace('root = CardContainer([top, body]', 'root = CardContainer([top, body, Caption("x")]');
    expect(designChanges('card', before, extra)[0]?.message).toBe('children went from 2 to 3 components');
  });

  it('lets list entries come and go but keeps their look', () => {
    const list = (items: string) => `root = CardContainer([List([${items}])])`;
    const before = list('ListItem("a", "x", "1", "news"), ListItem("b")');
    expect(designChanges('card', before, list('ListItem("c"), ListItem("d"), ListItem("e", "y", "2", "sun")'))).toEqual([]);
    const events = (tone: string) =>
      `root = Page([Agenda([CalendarEvent("2026-10-01", "A", null, ${tone})])])`;
    expect(designChanges('detail', events('"accent"'), events('"warning"'))).toEqual([]);
  });

  it('treats background images as data but not their dimming', () => {
    const photo = (url: string, dim: number) => `root = CardContainer([Text("x")], null, null, null, BackgroundImage("${url}", ${dim}))`;
    expect(designChanges('card', photo('https://a.example/1.jpg', 0.3), photo('https://a.example/2.jpg', 0.3))).toEqual([]);
    expect(designChanges('card', photo('https://a.example/1.jpg', 0.3), photo('https://a.example/1.jpg', 0.6))).toHaveLength(1);
  });

  it('lets HTML pages change only their nook-data block', () => {
    const before = EXAMPLES.htmlDetail;
    const refreshed = before.replace('"average": "7h 12m"', '"average": "6h 50m"');
    expect(designChanges('detail', before, refreshed)).toEqual([]);
    const restyled = before.replace('font: 700 40px/1.1', 'font: 700 52px/1.1');
    expect(designChanges('detail', before, restyled)).toHaveLength(1);
  });

  it('rejects switching between OpenUI and HTML', () => {
    expect(designChanges('detail', EXAMPLES.newsDetail, EXAMPLES.htmlDetail)).toHaveLength(1);
  });
});
