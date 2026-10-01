import {
  CARD_STATE_LIMITS,
  DateSchema,
  DateTimeSchema,
  HttpsUrlSchema,
  isHttpsUrl,
  MonthSchema,
  StateIdSchema,
} from '@nook/shared';
import { z } from 'zod';

import { ICON_NAMES } from './icons';
import { component, singleSlot, slot, type CheckIssue, type ComponentSpec } from './spec';
import { ColorSchema, FontSchema, ThemeSchema, Tone } from './styles';

// Shared prop schemas. Everything is a literal: strings, numbers, booleans, enums.

export const Gap = z.enum(['none', 'xs', 'sm', 'md', 'lg']);
export const Size = z.enum(['sm', 'md', 'lg']);
export const IconNameSchema = z.enum(ICON_NAMES);
const Align = z.enum(['start', 'center', 'end']).describe('Text alignment, default start');
const color = ColorSchema.optional().describe('Overrides tone');
const font = FontSchema.optional();

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
  color,
  font,
  align: Align.optional(),
  uppercase: z.boolean().optional(),
});

const Text = component('Text', 'Body text. Plain text only; no markdown', {
  text: text(2000),
  size: Size.optional(),
  tone: Tone.optional(),
  weight: z.enum(['regular', 'medium', 'bold']).optional(),
  maxLines: z.number().int().min(1).max(20).optional(),
  color,
  font,
  align: Align.optional(),
  uppercase: z.boolean().optional(),
});

const Caption = component('Caption', 'Small secondary text such as dates or attributions', {
  text: text(200),
  tone: Tone.optional(),
  color,
  font,
  align: Align.optional(),
  uppercase: z.boolean().optional(),
});

const Display = component(
  'Display',
  'Big hero text: a temperature, price, score, date or a large emoji. Shrinks to fit one line',
  {
    text: text(40),
    size: z.enum(['md', 'lg', 'xl', 'xxl']).optional().describe('32 / 44 / 60 / 84 pt, default lg'),
    color,
    font,
    align: Align.optional(),
    weight: z.enum(['regular', 'medium', 'bold']).optional().describe('Default bold'),
  },
);

const Icon = component('Icon', 'Symbol from the fixed icon set', {
  name: IconNameSchema,
  size: z.enum(['sm', 'md', 'lg', 'xl']).optional().describe('16 / 22 / 32 / 48 pt'),
  tone: Tone.optional(),
  color,
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
  color,
});

const Metric = component('Metric', 'Key number with optional change indicator', {
  label,
  value: text(32).describe('Preformatted value, e.g. "$1,204" or "23°C"'),
  delta: text(24).optional().describe('Preformatted change, e.g. "+2.4%"'),
  trend: z.enum(['up', 'down', 'flat']).optional(),
  invertTrend: z.boolean().optional().describe('true when "down" is good, e.g. prices you pay'),
  size: Size.optional(),
  color: ColorSchema.optional().describe('Color of the value'),
  font,
});

const Progress = component('Progress', 'Horizontal progress bar', {
  value: z.number().min(0).max(100).describe('Percent 0-100'),
  label: label.optional(),
  tone: Tone.optional(),
  color,
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
  color,
});

const Ring = component('Ring', 'Circular progress ring with text in the middle, like an activity ring', {
  value: z.number().min(0).max(100).describe('Percent 0-100'),
  label: text(12).optional().describe('Center text, e.g. "72%" or "8.2k"'),
  caption: text(24).optional().describe('Small text under the center text'),
  tone: Tone.optional(),
  color,
  size: Size.optional().describe('56 / 84 / 120 pt, default md'),
});

const Gauge = component(
  'Gauge',
  'Semicircle gauge for a value on a scale (speed, air quality, battery, score)',
  {
    value: z.number().finite(),
    min: z.number().finite().optional().describe('Default 0'),
    max: z.number().finite().optional().describe('Default 100'),
    display: text(16).optional().describe('Center text; default is the value'),
    label: text(40).optional().describe('Text under the gauge'),
    tone: Tone.optional(),
    color,
  },
  {
    check: (props) => {
      const min = typeof props.min === 'number' ? props.min : 0;
      const max = typeof props.max === 'number' ? props.max : 100;
      return min < max ? [] : [invalid('min must be smaller than max')];
    },
  },
);

const Heatmap = component(
  'Heatmap',
  'Grid of squares shaded by value, like a GitHub contribution graph. Values fill column by column (one column per week when rows is 7)',
  {
    values: z.array(z.number().finite().min(0)).min(1).max(371),
    rows: z.number().int().min(1).max(7).optional().describe('Default 7'),
    tone: Tone.optional(),
    color,
  },
);

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

// Interactive components (detail surface). Stateful ones persist user input under their id;
// keep ids stable when regenerating a card so the user's input survives.

const stateId = StateIdSchema.describe('Stable id; user input is stored under it. Reuse it when you regenerate the card');
const elementIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap((child) => {
        const id = (child as { props?: { id?: unknown } })?.props?.id;
        return typeof id === 'string' ? [id] : [];
      })
    : [];
const duplicates = (values: string[]) => [...new Set(values.filter((value, i) => values.indexOf(value) !== i))];
const invalid = (message: string): CheckIssue => ({ code: 'invalid-prop', message });

const ChecklistItem = component('ChecklistItem', 'Row inside a Checklist', {
  id: stateId,
  label: text(160),
  note: text(240).optional(),
  checked: z.boolean().optional().describe('Initial state until the user changes it'),
});

const Checklist = component(
  'Checklist',
  'List the user can tick off; ticks are saved and visible to you through get_card',
  {
    id: stateId,
    items: slot(['ChecklistItem'], { max: CARD_STATE_LIMITS.maxChecklistItems }),
    title: label.optional(),
  },
  {
    stateful: true,
    check: (props) =>
      duplicates(elementIds(props.items)).map((id) => ({ code: 'duplicate-id', message: `ChecklistItem id "${id}" is used twice` })),
  },
);

const TextInput = component(
  'TextInput',
  'Free text field the user can fill in (saved)',
  {
    id: stateId,
    label,
    placeholder: text(120).optional(),
    multiline: z.boolean().optional(),
  },
  { stateful: true },
);

const Choice = component(
  'Choice',
  'Single or multiple choice question (saved)',
  {
    id: stateId,
    label: text(160),
    options: z.array(text(60)).min(2).max(12),
    multiple: z.boolean().optional(),
  },
  {
    stateful: true,
    check: (props) =>
      duplicates(Array.isArray(props.options) ? props.options.map(String) : []).map((option) => invalid(`option "${option}" is listed twice`)),
  },
);

const Rating = component(
  'Rating',
  'Star rating the user can set (saved)',
  {
    id: stateId,
    label,
    max: z.number().int().min(3).max(10).optional().describe('Number of stars, default 5'),
  },
  { stateful: true },
);

const Button = component(
  'Button',
  'Action button. open_url opens value (https); copy copies value; request_refresh flags the card for your next ' +
    'run (visible as refreshRequestedAt); ask_ai opens the user\'s AI app with value as a prepared prompt',
  {
    label: text(40),
    action: z.enum(['open_url', 'copy', 'request_refresh', 'ask_ai']),
    value: text(1000).optional(),
    tone: Tone.optional(),
  },
  {
    check: (props) => {
      const value = typeof props.value === 'string' ? props.value : '';
      if (props.action === 'open_url' && !isHttpsUrl(value)) return [invalid('open_url needs an https:// URL as value')];
      if ((props.action === 'copy' || props.action === 'ask_ai') && !value.trim()) return [invalid(`${props.action} needs a value`)];
      return [];
    },
  },
);

// Calendar and time.

const CalendarEvent = component('CalendarEvent', 'Event inside a Calendar, Agenda or WeekStrip', {
  date: DateSchema.describe('YYYY-MM-DD in the user\'s local calendar'),
  title: text(120),
  time: text(20).optional().describe('e.g. "14:00" or "All day"'),
  tone: Tone.optional(),
  url: url.optional(),
});

const Calendar = component('Calendar', 'Month grid; days with events get a dot and tapping a day lists its events', {
  month: MonthSchema.describe('YYYY-MM'),
  events: slot(['CalendarEvent'], { min: 0, max: 100 }),
  title: label.optional(),
});

const Agenda = component('Agenda', 'Upcoming events grouped by day (Today, Tomorrow, dates)', {
  events: slot(['CalendarEvent'], { min: 0, max: 100 }),
  title: label.optional(),
});

const WeekStrip = component('WeekStrip', 'The current week as 7 day cells; today is highlighted, days with events get a dot', {
  events: slot(['CalendarEvent'], { min: 0, max: 50 }),
  start: DateSchema.optional().describe('Any date in the week to show; default is the current week on the device'),
});

const Countdown = component('Countdown', 'Live countdown to a moment, computed on the device', {
  target: DateTimeSchema,
  label,
  style: z.enum(['compact', 'large']).optional(),
});

const Table = component(
  'Table',
  'Data table for comparisons; scrolls horizontally when wide',
  {
    columns: z.array(text(40)).min(1).max(8),
    rows: z.array(z.array(text(200))).min(1).max(50),
    title: label.optional(),
  },
  {
    check: (props) => {
      const width = Array.isArray(props.columns) ? props.columns.length : 0;
      const rows = Array.isArray(props.rows) ? props.rows : [];
      const bad = rows.findIndex((row) => !Array.isArray(row) || row.length !== width);
      return bad >= 0 ? [invalid(`row ${bad} must have exactly ${width} cells, one per column`)] : [];
    },
  },
);

// Backgrounds: one of these goes in the background argument of CardContainer, Page or Surface.

const BACKGROUNDS = ['Fill', 'Gradient', 'RadialGradient', 'MeshGradient', 'BackgroundImage'] as const;
const colors = (min: number, max: number) => z.array(ColorSchema).min(min).max(max);

const backgroundSpecs: ComponentSpec[] = [
  component('Fill', 'Solid background color', { color: ColorSchema }),
  component('Gradient', 'Linear gradient background', {
    colors: colors(2, 6),
    angle: z.number().min(0).max(360).optional().describe('CSS degrees: 0 = to top, 90 = to right, 180 = to bottom; default 135'),
  }),
  component('RadialGradient', 'Radial glow; the first color is the center, the last fills the edges', {
    colors: colors(2, 5),
    x: z.number().min(0).max(1).optional().describe('Center 0-1 from the left, default 0.5'),
    y: z.number().min(0).max(1).optional().describe('Center 0-1 from the top, default 0.5'),
    radius: z.number().min(0.1).max(2).optional().describe('Relative to the size, default 0.8'),
  }),
  component(
    'MeshGradient',
    'Soft multi-color mesh (Apple-style blobs). 4 colors = 2x2 grid, 6 = 3 wide x 2 tall, 9 = 3x3; listed row by row from the top left',
    { colors: colors(4, 9) },
    {
      check: (props) =>
        Array.isArray(props.colors) && [4, 6, 9].includes(props.colors.length) ? [] : [invalid('colors must have 4, 6 or 9 entries')],
    },
  ),
  component('BackgroundImage', 'Photo background (https only), darkened so text on it stays readable', {
    url,
    dim: z.number().min(0).max(0.9).optional().describe('Dark overlay 0-0.9, default 0.35'),
    blur: z.number().min(0).max(40).optional().describe('Blur radius, default 0'),
  }),
];

const background = singleSlot(BACKGROUNDS, 'One background element (Fill, Gradient, RadialGradient, MeshGradient or BackgroundImage)');

// Layout components are built per surface because their slots accept that surface's content.

function layout(content: readonly string[]): ComponentSpec[] {
  return [
    component('Surface', 'Styled box with its own background, glass material, rounded corners, border and shadow', {
      children: slot(content),
      background,
      material: z
        .enum(['none', 'glass', 'blur', 'tint'])
        .optional()
        .describe('glass = frosted glass over what is behind, blur = stronger blur, tint = translucent layer'),
      padding: Gap.optional().describe('Default md'),
      radius: z.enum(['none', 'sm', 'md', 'lg', 'full']).optional().describe('Default md'),
      gap: Gap.optional(),
      align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
      border: ColorSchema.optional().describe('Hairline border color'),
      shadow: z.enum(['none', 'sm', 'md', 'lg', 'glow']).optional().describe('glow uses the accent color'),
      grow: z.boolean().optional().describe('Fill the remaining height (inside CardContainer) or share the width (inside Row)'),
    }),
    component('Layer', 'Stacks children on top of each other: the first child sets the size, the others are overlaid on it', {
      children: slot(content, { min: 2, max: 6 }),
      align: z
        .enum(['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'])
        .optional()
        .describe('Where overlays sit, default center'),
      padding: Gap.optional().describe('Inset of the overlays, default none'),
    }),
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
  'Surface',
  'Layer',
  'Display',
  'Ring',
  'Gauge',
  'Heatmap',
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
  'WeekStrip',
  'Countdown',
  'Link',
] as const;

const DETAIL_CONTENT = [
  'Section',
  'Stack',
  'Row',
  'Surface',
  'Layer',
  'Display',
  'Ring',
  'Gauge',
  'Heatmap',
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
  'Table',
  'Sparkline',
  'MiniLineChart',
  'MiniBarChart',
  'LineChart',
  'BarChart',
  'PieChart',
  'Calendar',
  'Agenda',
  'WeekStrip',
  'Countdown',
  'Checklist',
  'TextInput',
  'Choice',
  'Rating',
  'Button',
  'Tabs',
  'Accordion',
  'Callout',
  'SourceList',
  'Link',
  'Divider',
] as const;

/** What Sections, Stacks, Rows, tabs and accordion panels may contain. */
const NESTED_CONTENT = DETAIL_CONTENT.filter((name) => name !== 'Section');

export const CARD_ROOT = 'CardContainer';
export const DETAIL_ROOT = 'Page';

export const cardSpecs: ComponentSpec[] = [
  component(CARD_ROOT, 'Root of every dashboard tile. Content is clipped to the tile size', {
    children: slot(CARD_CONTENT, { max: 12 }),
    tone: Tone.optional().describe('Subtle background tint'),
    padding: z.enum(['none', 'sm', 'md']).optional(),
    theme: ThemeSchema.optional(),
    background,
    justify: z.enum(['start', 'center', 'end', 'between']).optional().describe('Vertical distribution of the children, default start'),
  }),
  ...layout(CARD_CONTENT),
  ...backgroundSpecs,
  Heading,
  Text,
  Caption,
  Display,
  Ring,
  Gauge,
  Heatmap,
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
  WeekStrip,
  CalendarEvent,
  Countdown,
  Link,
];

export const detailSpecs: ComponentSpec[] = [
  component(DETAIL_ROOT, 'Root of every detail screen; scrolls vertically', {
    children: slot(DETAIL_CONTENT, { max: 60 }),
    theme: ThemeSchema.optional().describe('Colors the whole screen'),
    background: singleSlot(BACKGROUNDS, 'Background of the whole screen'),
  }),
  component('Section', 'Titled group of content', {
    title: label,
    children: slot(NESTED_CONTENT),
  }),
  ...layout(NESTED_CONTENT),
  ...backgroundSpecs,
  component('Tabs', 'Switches between panels; only the selected Tab is shown', {
    tabs: slot(['Tab'], { min: 2, max: 6 }),
  }),
  component('Tab', 'One panel inside Tabs', {
    label: text(24),
    children: slot(NESTED_CONTENT.filter((name) => name !== 'Tabs')),
  }),
  component('Accordion', 'Collapsible sections the user can expand', {
    items: slot(['AccordionItem'], { max: 20 }),
  }),
  component('AccordionItem', 'One collapsible section inside an Accordion', {
    title: text(120),
    children: slot(NESTED_CONTENT.filter((name) => name !== 'Tabs' && name !== 'Accordion')),
    open: z.boolean().optional().describe('Start expanded'),
  }),
  Heading,
  Text,
  Caption,
  Display,
  Ring,
  Gauge,
  Heatmap,
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
  Table,
  Sparkline,
  MiniLineChart,
  MiniBarChart,
  LineChart,
  BarChart,
  PieChart,
  Calendar,
  Agenda,
  WeekStrip,
  CalendarEvent,
  Countdown,
  Checklist,
  ChecklistItem,
  TextInput,
  Choice,
  Rating,
  Button,
  Callout,
  Source,
  SourceList,
  Link,
  Divider,
];
