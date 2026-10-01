import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { withAlpha, type ThemeColors } from '@/constants/theme';
import { formatCompact, pick, seriesColor, toneColor, type Tone } from '@/openui/tokens';
import type { NodeProps } from '@/openui/types';
import { colorOrTone, useUiColors, useUiTheme } from '@/openui/ui-theme';

interface Series {
  name: string;
  values: number[];
  tone?: Tone | null;
}

function useWidth(): [number, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  return [width, (event) => setWidth(Math.round(event.nativeEvent.layout.width))];
}

function numbers(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)) : [];
}

function extent(values: number[], includeZero = false): [number, number] {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

function linePath(values: number[], x0: number, y0: number, width: number, height: number, [min, max]: [number, number]) {
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((value, i) => {
      const x = x0 + i * step;
      const y = y0 + (1 - (value - min) / (max - min)) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Picks at most `max` evenly spaced label indexes, always including the first and last. */
function labelIndexes(count: number, max: number): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => Math.round(i * step));
}

const SPARK_HEIGHT = { sm: 24, md: 36, lg: 56 } as const;

export function Sparkline({ props }: NodeProps) {
  const theme = useUiTheme();
  const [width, onLayout] = useWidth();
  const values = numbers(props.values);
  const height = pick(SPARK_HEIGHT, props.height, 'md');
  const color = colorOrTone(theme, props.color, props.tone, 'accent');
  const range = extent(values);
  const path = width > 0 && values.length > 1 ? linePath(values, 2, 2, width - 4, height - 4, range) : '';
  return (
    <View onLayout={onLayout} style={{ height }}>
      {path ? (
        <Svg width={width} height={height}>
          <Path d={`${path} L${width - 2},${height} L2,${height} Z`} fill={withAlpha(color, 0.12)} />
          <Path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}

function XLabels({ labels, colors }: { labels: string[]; colors: ThemeColors }) {
  if (labels.length === 0) return null;
  const shown = labelIndexes(labels.length, 2);
  return (
    <View style={styles.xLabels}>
      {shown.map((index) => (
        <Text key={index} style={[styles.axis, { color: colors.textSecondary }]} numberOfLines={1}>
          {labels[index]}
        </Text>
      ))}
    </View>
  );
}

export function MiniLineChart({ props }: NodeProps) {
  const colors = useUiColors();
  const [width, onLayout] = useWidth();
  const values = numbers(props.values);
  const height = 64;
  const color = toneColor(colors, props.tone, 'accent');
  const path = width > 0 && values.length > 1 ? linePath(values, 2, 4, width - 4, height - 8, extent(values)) : '';
  return (
    <View style={styles.mini}>
      <View onLayout={onLayout} style={{ height }}>
        {path ? (
          <Svg width={width} height={height}>
            <Path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
        ) : null}
      </View>
      <XLabels labels={Array.isArray(props.labels) ? props.labels : []} colors={colors} />
    </View>
  );
}

export function MiniBarChart({ props }: NodeProps) {
  const colors = useUiColors();
  const [width, onLayout] = useWidth();
  const values = numbers(props.values);
  const height = 64;
  const color = toneColor(colors, props.tone, 'accent');
  const [min, max] = extent(values, true);
  const slot = values.length ? width / values.length : 0;
  const zeroY = (max / (max - min)) * height;
  return (
    <View style={styles.mini}>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {values.map((value, i) => {
              const barHeight = (Math.abs(value) / (max - min)) * height;
              return (
                <Rect
                  key={i}
                  x={i * slot + slot * 0.15}
                  y={value >= 0 ? zeroY - barHeight : zeroY}
                  width={slot * 0.7}
                  height={Math.max(1, barHeight)}
                  rx={2}
                  fill={color}
                />
              );
            })}
          </Svg>
        ) : null}
      </View>
      <XLabels labels={Array.isArray(props.labels) ? props.labels : []} colors={colors} />
    </View>
  );
}

const CHART_HEIGHT = 180;
const AXIS_WIDTH = 40;
const LABEL_HEIGHT = 18;

function seriesOf(value: unknown): Series[] {
  return Array.isArray(value)
    ? value.map((s) => ({ name: String(s?.name ?? ''), values: numbers(s?.values), tone: s?.tone ?? null }))
    : [];
}

function ChartFrame({
  title,
  unit,
  series,
  colors,
  children,
}: {
  title: unknown;
  unit: unknown;
  series: Series[];
  colors: ThemeColors;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.chart}>
      {title || unit ? (
        <View style={styles.chartHeader}>
          {title ? <Text style={[styles.chartTitle, { color: colors.text }]}>{String(title)}</Text> : <View />}
          {unit ? <Text style={[styles.axis, { color: colors.textSecondary }]}>{String(unit)}</Text> : null}
        </View>
      ) : null}
      {children}
      {series.length > 1 ? (
        <View style={styles.legend}>
          {series.map((s, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: seriesColor(colors, i, s.tone) }]} />
              <Text style={[styles.axis, { color: colors.textSecondary }]}>{s.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Axes({
  width,
  range,
  labels,
  colors,
  categorical,
}: {
  width: number;
  range: [number, number];
  labels: string[];
  colors: ThemeColors;
  categorical: boolean;
}) {
  const plotWidth = width - AXIS_WIDTH;
  const ticks = [range[1], (range[0] + range[1]) / 2, range[0]];
  const count = labels.length;
  return (
    <G>
      {ticks.map((tick, i) => {
        const y = (i / 2) * CHART_HEIGHT;
        return (
          <G key={i}>
            <Line x1={AXIS_WIDTH} x2={width} y1={y} y2={y} stroke={colors.border} strokeWidth={1} />
            <SvgText x={AXIS_WIDTH - 6} y={Math.min(Math.max(y + 4, 10), CHART_HEIGHT)} fontSize={10} fill={colors.textSecondary} textAnchor="end">
              {formatCompact(tick)}
            </SvgText>
          </G>
        );
      })}
      {labelIndexes(count, Math.max(2, Math.floor(plotWidth / 56))).map((index) => {
        const x = categorical
          ? AXIS_WIDTH + (index + 0.5) * (plotWidth / count)
          : AXIS_WIDTH + (count > 1 ? (index * plotWidth) / (count - 1) : 0);
        const anchor = categorical ? 'middle' : index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle';
        return (
          <SvgText key={index} x={x} y={CHART_HEIGHT + 14} fontSize={10} fill={colors.textSecondary} textAnchor={anchor}>
            {labels[index]}
          </SvgText>
        );
      })}
    </G>
  );
}

export function LineChart({ props }: NodeProps) {
  const colors = useUiColors();
  const [width, onLayout] = useWidth();
  const series = seriesOf(props.series);
  const labels: string[] = Array.isArray(props.labels) ? props.labels.map(String) : [];
  const range = extent(series.flatMap((s) => s.values));
  return (
    <ChartFrame title={props.title} unit={props.unit} series={series} colors={colors}>
      <View onLayout={onLayout} style={{ height: CHART_HEIGHT + LABEL_HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT + LABEL_HEIGHT}>
            <Axes width={width} range={range} labels={labels} colors={colors} categorical={false} />
            {series.map((s, i) => (
              <Path
                key={i}
                d={linePath(s.values, AXIS_WIDTH, 0, width - AXIS_WIDTH, CHART_HEIGHT, range)}
                stroke={seriesColor(colors, i, s.tone)}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          </Svg>
        ) : null}
      </View>
    </ChartFrame>
  );
}

export function BarChart({ props }: NodeProps) {
  const colors = useUiColors();
  const [width, onLayout] = useWidth();
  const series = seriesOf(props.series);
  const labels: string[] = Array.isArray(props.labels) ? props.labels.map(String) : [];
  const [min, max] = extent(series.flatMap((s) => s.values), true);
  const groups = Math.max(1, ...series.map((s) => s.values.length));
  const plotWidth = width - AXIS_WIDTH;
  const groupWidth = plotWidth / groups;
  const barWidth = (groupWidth * 0.7) / Math.max(1, series.length);
  const zeroY = (max / (max - min)) * CHART_HEIGHT;
  return (
    <ChartFrame title={props.title} unit={props.unit} series={series} colors={colors}>
      <View onLayout={onLayout} style={{ height: CHART_HEIGHT + LABEL_HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT + LABEL_HEIGHT}>
            <Axes width={width} range={[min, max]} labels={labels} colors={colors} categorical />
            {series.map((s, si) =>
              s.values.map((value, gi) => {
                const barHeight = (Math.abs(value) / (max - min)) * CHART_HEIGHT;
                return (
                  <Rect
                    key={`${si}-${gi}`}
                    x={AXIS_WIDTH + gi * groupWidth + groupWidth * 0.15 + si * barWidth}
                    y={value >= 0 ? zeroY - barHeight : zeroY}
                    width={Math.max(1, barWidth - 1)}
                    height={Math.max(1, barHeight)}
                    rx={2}
                    fill={seriesColor(colors, si, s.tone)}
                  />
                );
              }),
            )}
          </Svg>
        ) : null}
      </View>
    </ChartFrame>
  );
}

function arc(cx: number, cy: number, r: number, start: number, end: number): string {
  const point = (angle: number) => [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
}

export function PieChart({ props }: NodeProps) {
  const colors = useUiColors();
  const slices: { label: string; value: number; tone?: Tone | null }[] = Array.isArray(props.slices)
    ? props.slices.filter((s: { value: unknown }) => typeof s?.value === 'number' && s.value >= 0)
    : [];
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const size = 150;
  const r = size / 2;
  let angle = 0;
  return (
    <ChartFrame title={props.title} unit={null} series={[]} colors={colors}>
      <View style={styles.pie}>
        <Svg width={size} height={size}>
          {slices.length === 1 ? (
            <Circle cx={r} cy={r} r={r} fill={seriesColor(colors, 0, slices[0]!.tone)} />
          ) : (
            slices.map((slice, i) => {
              const start = angle;
              angle += (slice.value / total) * Math.PI * 2;
              return <Path key={i} d={arc(r, r, r, start, angle)} fill={seriesColor(colors, i, slice.tone)} />;
            })
          )}
          {props.donut ? <Circle cx={r} cy={r} r={r * 0.6} fill={colors.background} /> : null}
        </Svg>
        <View style={styles.pieLegend}>
          {slices.map((slice, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: seriesColor(colors, i, slice.tone) }]} />
              <Text style={[styles.pieLabel, { color: colors.text }]} numberOfLines={1}>
                {slice.label}
              </Text>
              <Text style={[styles.axis, { color: colors.textSecondary }]}>
                {Math.round((slice.value / total) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ChartFrame>
  );
}

const styles = StyleSheet.create({
  mini: { gap: 4 },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  axis: { fontSize: 11 },
  chart: { gap: 10 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chartTitle: { fontSize: 14, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  pieLegend: { flex: 1, minWidth: 120, gap: 6 },
  pieLabel: { fontSize: 13, flexShrink: 1 },
});
