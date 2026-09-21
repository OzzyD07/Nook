import { HttpsUrlSchema } from '@nook/shared';
import { z } from 'zod';

import { ICON_NAMES } from './icons';
import { component, slot, type ComponentSpec } from './spec';

// Shared prop schemas. Everything is a literal: strings, numbers, booleans, enums.

export const Tone = z
  .enum(['neutral', 'muted', 'accent', 'positive', 'negative', 'warning', 'info'])
  .describe('Semantic color');
export const Gap = z.enum(['none', 'xs', 'sm', 'md', 'lg']);
export const Size = z.enum(['sm', 'md', 'lg']);
export const IconNameSchema = z.enum(ICON_NAMES);

const text = (max: number) => z.string().max(max);
const label = text(80);
const url = HttpsUrlSchema;
const numbers = (min: number, max: number) => z.array(z.number().finite()).min(min).max(max);
const labels = (max: number) => z.array(text(24)).max(max);

const series = z
  .array(
    z.object({
      name: text(40),
      values: numbers(1, 60),
      tone: Tone.optional(),
    }),
  )
  .min(1)
  .max(4)
  .refine((all) => all.every((s) => s.values.length === all[0]!.values.length), {
    message: 'every series must have the same number of values',
  });

// Leaf components, shared by both surfaces.

const Heading = component('Heading', 'Title text', {
  text: text(120),
  size: Size.optional().describe('Default md'),
});

const Text = component('Text', 'Body text. Plain text only; no markdown', {
  text: text(2000),
  size: Size.optional(),
  tone: Tone.optional(),
  weight: z.enum(['regular', 'medium', 'bold']).optional(),
  maxLines: z.number().int().min(1).max(20).optional(),
});

const Caption = component('Caption', 'Small secondary text such as dates or attributions', {
  text: text(200),
  tone: Tone.optional(),
});

const Icon = component('Icon', 'Symbol from the fixed icon set', {
  name: IconNameSchema,
  size: Size.optional(),
  tone: Tone.optional(),
});

const Image = component('Image', 'Remote image (https only)', {
  url,
  alt: text(200).optional(),
  aspectRatio: z.number().min(0.25).max(4).optional().describe('width / height, default 16/9'),
  fit: z.enum(['cover', 'contain']).optional(),
});

const Badge = component('Badge', 'Short pill label', {
  label: text(32),
  tone: Tone.optional(),
});

const Metric = component('Metric', 'Key number with optional change indicator', {
  label,
  value: text(32).describe('Preformatted value, e.g. "$1,204" or "23°C"'),
  delta: text(24).optional().describe('Preformatted change, e.g. "+2.4%"'),
  trend: z.enum(['up', 'down', 'flat']).optional(),
  invertTrend: z.boolean().optional().describe('true when "down" is good, e.g. prices you pay'),
  size: Size.optional(),
});

const Progress = component('Progress', 'Horizontal progress bar', {
  value: z.number().min(0).max(100).describe('Percent 0-100'),
  label: label.optional(),
  tone: Tone.optional(),
});

const Divider = component('Divider', 'Thin separator line', {});

const ListItem = component('ListItem', 'Row inside a List', {
  title: text(160),
  subtitle: text(240).optional(),
  trailing: text(32).optional().describe('Short right-aligned text, e.g. a time or value'),
  icon: IconNameSchema.optional(),
  url: url.optional().describe('Opens in the in-app browser when tapped'),
});

const List = component('List', 'Vertical list of ListItem rows', {
  items: slot(['ListItem'], { max: 30 }),
  ordered: z.boolean().optional(),
});

const Sparkline = component('Sparkline', 'Tiny trend line without axes', {
  values: numbers(2, 120),
  tone: Tone.optional(),
  height: Size.optional(),
});

const Link = component('Link', 'Tappable text link (https only)', {
  label: text(120),
  url,
});

// Charts.

const MiniLineChart = component('MiniLineChart', 'Compact line chart with optional x labels', {
  values: numbers(2, 60),
  labels: labels(60).optional(),
  tone: Tone.optional(),
});

const MiniBarChart = component('MiniBarChart', 'Compact bar chart with optional x labels', {
  values: numbers(1, 24),
  labels: labels(24).optional(),
  tone: Tone.optional(),
});

const LineChart = component('LineChart', 'Line chart with axes and legend', {
  labels: labels(60),
  series,
  title: label.optional(),
  unit: text(12).optional(),
});

const BarChart = component('BarChart', 'Grouped bar chart with axes and legend', {
  labels: labels(24),
  series,
  title: label.optional(),
  unit: text(12).optional(),
});

const PieChart = component('PieChart', 'Pie or donut chart', {
  slices: z
    .array(z.object({ label: text(40), value: z.number().finite().min(0), tone: Tone.optional() }))
    .min(1)
    .max(12),
  title: label.optional(),
  donut: z.boolean().optional(),
});

// Detail-only leaves.

const Quote = component('Quote', 'Block quote', {
  text: text(1000),
  attribution: text(120).optional(),
});

const TimelineItem = component('TimelineItem', 'Entry inside a Timeline', {
  title: text(160),
  time: text(40).optional(),
  description: text(600).optional(),
  tone: Tone.optional(),
});

const Timeline = component('Timeline', 'Vertical timeline of TimelineItem entries', {
  items: slot(['TimelineItem'], { max: 30 }),
});

const KeyValue = component('KeyValue', 'Two-column table of labels and values', {
  items: z
    .array(z.object({ label: text(60), value: text(200) }))
    .min(1)
    .max(30),
});

const Callout = component('Callout', 'Highlighted note box', {
  text: text(1000),
  title: label.optional(),
  tone: Tone.optional(),
});

const Source = component('Source', 'Citation inside a SourceList', {
  title: text(200),
  url,
  publisher: text(100).optional(),
});

const SourceList = component('SourceList', 'List of cited sources', {
  items: slot(['Source'], { max: 20 }),
  title: label.optional(),
});

// Layout components are built per surface because their slots accept that surface's content.

function layout(content: readonly string[]): ComponentSpec[] {
  return [
    component('Stack', 'Vertical group', {
      children: slot(content),
      gap: Gap.optional(),
      align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
    }),
    component('Row', 'Horizontal group; children share the width', {
      children: slot(content, { max: 8 }),
      gap: Gap.optional(),
      align: z.enum(['start', 'center', 'end']).optional(),
      justify: z.enum(['start', 'center', 'end', 'between']).optional(),
      wrap: z.boolean().optional(),
    }),
  ];
}

const CARD_CONTENT = [
  'Stack',
  'Row',
  'Heading',
  'Text',
  'Caption',
  'Icon',
  'Image',
  'Badge',
  'Metric',
  'Progress',
  'Divider',
  'List',
  'Sparkline',
  'MiniLineChart',
  'MiniBarChart',
  'Link',
] as const;

const DETAIL_CONTENT = [
  'Section',
  'Stack',
  'Row',
  'Heading',
  'Text',
  'Caption',
  'Quote',
  'Icon',
  'Image',
  'Metric',
  'Badge',
  'Progress',
  'List',
  'Timeline',
  'KeyValue',
  'Sparkline',
  'MiniLineChart',
  'MiniBarChart',
  'LineChart',
  'BarChart',
  'PieChart',
  'Callout',
  'SourceList',
  'Link',
  'Divider',
] as const;

export const CARD_ROOT = 'CardContainer';
export const DETAIL_ROOT = 'Page';

export const cardSpecs: ComponentSpec[] = [
  component(CARD_ROOT, 'Root of every dashboard tile. Content is clipped to the tile size', {
    children: slot(CARD_CONTENT, { max: 12 }),
    tone: Tone.optional().describe('Subtle background tint'),
    padding: z.enum(['none', 'sm', 'md']).optional(),
  }),
  ...layout(CARD_CONTENT),
  Heading,
  Text,
  Caption,
  Icon,
  Image,
  Badge,
  Metric,
  Progress,
  Divider,
  List,
  ListItem,
  Sparkline,
  MiniLineChart,
  MiniBarChart,
  Link,
];

export const detailSpecs: ComponentSpec[] = [
  component(DETAIL_ROOT, 'Root of every detail screen; scrolls vertically', {
    children: slot(DETAIL_CONTENT, { max: 60 }),
  }),
  component('Section', 'Titled group of content', {
    title: label,
    children: slot(DETAIL_CONTENT.filter((name) => name !== 'Section')),
  }),
  ...layout(DETAIL_CONTENT.filter((name) => name !== 'Section')),
  Heading,
  Text,
  Caption,
  Quote,
  Icon,
  Image,
  Metric,
  Badge,
  Progress,
  List,
  ListItem,
  Timeline,
  TimelineItem,
  KeyValue,
  Sparkline,
  MiniLineChart,
  MiniBarChart,
  LineChart,
  BarChart,
  PieChart,
  Callout,
  Source,
  SourceList,
  Link,
  Divider,
];
