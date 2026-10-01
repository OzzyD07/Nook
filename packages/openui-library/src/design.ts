import type { UiSurface } from '@nook/shared';
import type { ElementNode } from '@openuidev/lang-core';

import { isHtmlDocument } from './html';
import { getLibrary } from './library';
import { validateOpenUI } from './validate';

/**
 * Design locks. When the user locks a card, the AI may still refresh its data but not
 * its design. "Data" is what a refresh legitimately changes: text, numbers, value lists,
 * links, images, icon names and the semantic tones of list entries. Everything else is
 * design: which components there are and how they are arranged, plus every
 * presentational argument (theme, background, colors, fonts, sizes, spacing, materials).
 */

/** Arguments that carry data on every component. */
const DATA_PROPS = new Set([
  'text',
  'label',
  'value',
  'values',
  'delta',
  'trend',
  'invertTrend',
  'caption',
  'display',
  'title',
  'subtitle',
  'trailing',
  'url',
  'alt',
  'attribution',
  'description',
  'time',
  'date',
  'month',
  'start',
  'target',
  'labels',
  'series',
  'slices',
  'columns',
  'rows',
  'items',
  'options',
  'checked',
  'publisher',
  'note',
  'placeholder',
  'min',
  'max',
  'name',
  'icon',
  'id',
]);

/** Per-component exceptions to DATA_PROPS. */
const DESIGN_PROPS: Record<string, readonly string[]> = {
  // A heatmap's row count is its shape (7 = weeks), not its data.
  Heatmap: ['rows'],
};

/** Components whose tone describes the entry (an event, a status), so it follows the data. */
const DATA_TONE = new Set(['Badge', 'CalendarEvent', 'TimelineItem']);

/** Slots that hold a variable number of entries; their count follows the data. */
const REPEATING_SLOTS = new Set(['items', 'events']);

const HTML_DATA_BLOCK = /(<script\b[^>]*\bid\s*=\s*["']?nook-data["']?[^>]*>)[\s\S]*?(<\/script\s*>)/gi;

export interface DesignChange {
  path: string;
  message: string;
}

function isDataProp(type: string, key: string): boolean {
  if (DESIGN_PROPS[type]?.includes(key)) return false;
  if (key === 'tone' && DATA_TONE.has(type)) return true;
  return DATA_PROPS.has(key);
}

/** Skipped optional arguments arrive as null; treat them like absent ones. */
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const show = (value: unknown) => {
  const text = JSON.stringify(value ?? null);
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
};

const isElement = (value: unknown): value is ElementNode =>
  typeof value === 'object' && value !== null && (value as ElementNode).type === 'element';

function elements(value: unknown): ElementNode[] {
  if (Array.isArray(value)) return value.filter(isElement);
  return isElement(value) ? [value] : [];
}

function compareNodes(surface: UiSurface, before: ElementNode, after: ElementNode, path: string, changes: DesignChange[]) {
  if (before.typeName !== after.typeName) {
    changes.push({ path, message: `${before.typeName} was replaced by ${after.typeName}` });
    return;
  }
  const type = after.typeName;
  const slots = getLibrary(surface).slots.get(type) ?? new Map();
  const keys = new Set([...Object.keys(before.props), ...Object.keys(after.props)]);
  for (const key of keys) {
    const at = `${path}.${key}`;
    if (slots.has(key)) {
      compareSlot(surface, key, elements(before.props[key]), elements(after.props[key]), at, changes);
    } else if (!isDataProp(type, key) && !same(before.props[key], after.props[key])) {
      changes.push({ path: at, message: `${type} ${key} changed from ${show(before.props[key])} to ${show(after.props[key])}` });
    }
  }
}

function compareSlot(
  surface: UiSurface,
  key: string,
  before: ElementNode[],
  after: ElementNode[],
  path: string,
  changes: DesignChange[],
) {
  if (REPEATING_SLOTS.has(key)) {
    // Entries may come and go; each one must look like an existing entry of its type.
    after.forEach((node, index) => {
      const template = before[index]?.typeName === node.typeName ? before[index] : before.find((b) => b.typeName === node.typeName);
      if (!template) {
        if (before.length > 0) changes.push({ path: `${path}[${index}]`, message: `${node.typeName} entries were not part of the design` });
        return;
      }
      compareNodes(surface, template, node, `${path}[${index}]:${node.typeName}`, changes);
    });
    return;
  }
  if (before.length !== after.length) {
    changes.push({ path, message: `${key} went from ${before.length} to ${after.length} components` });
  }
  for (let index = 0; index < Math.min(before.length, after.length); index++) {
    compareNodes(surface, before[index]!, after[index]!, `${path}[${index}]:${after[index]!.typeName}`, changes);
  }
}

/** HTML pages may only change the contents of their <script type="application/json" id="nook-data"> block. */
function htmlShell(source: string): string {
  return source.replace(HTML_DATA_BLOCK, '$1$2').replace(/\s+/g, ' ').trim();
}

/**
 * Design differences between the current document and a proposed one; empty when only
 * data changed. Both documents are expected to be valid.
 */
export function designChanges(surface: UiSurface, before: string, after: string): DesignChange[] {
  const html = isHtmlDocument(before);
  if (html !== isHtmlDocument(after)) {
    return [{ path: '', message: html ? 'The HTML page was replaced by an OpenUI page' : 'The OpenUI page was replaced by an HTML page' }];
  }
  if (html) {
    if (htmlShell(before) === htmlShell(after)) return [];
    const hasBlock = new RegExp(HTML_DATA_BLOCK.source, 'i').test(before);
    return [
      {
        path: '',
        message: hasBlock
          ? 'The HTML changed outside its <script type="application/json" id="nook-data"> block'
          : 'The HTML changed; this page has no <script type="application/json" id="nook-data"> block, so it cannot change at all',
      },
    ];
  }
  const a = validateOpenUI(surface, before);
  const b = validateOpenUI(surface, after);
  // An invalid current document has no design to protect.
  if (!a.ok || !b.ok) return [];
  const changes: DesignChange[] = [];
  compareNodes(surface, a.tree, b.tree, `root:${a.tree.typeName}`, changes);
  return changes;
}
