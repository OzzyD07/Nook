import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { withAlpha } from '@/constants/theme';
import { useFontStyle } from '@/openui/fonts';
import { pick } from '@/openui/tokens';
import type { NodeProps } from '@/openui/types';
import { colorOrTone, useUiTheme } from '@/openui/ui-theme';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function useWidth(): [number, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  return [width, (event) => setWidth(Math.round(event.nativeEvent.layout.width))];
}

const RING_SIZE = { sm: 56, md: 84, lg: 120 } as const;

export function Ring({ props }: NodeProps) {
  const theme = useUiTheme();
  const font = useFontStyle(theme.font, 'bold');
  const size = pick(RING_SIZE, props.size, 'md');
  const stroke = Math.max(5, Math.round(size * 0.11));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = clamp(Number(props.value) || 0, 0, 100);
  const color = colorOrTone(theme, props.color, props.tone, 'accent');
  const center = size / 2;
  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={withAlpha(color, 0.2)} strokeWidth={stroke} fill="none" />
        {value > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - value / 100)}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter, { padding: stroke + 2 }]}>
        {props.label ? (
          <Text
            style={[font, { fontSize: Math.round(size * 0.22), color: theme.colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {String(props.label)}
          </Text>
        ) : null}
        {props.caption ? (
          <Text style={{ fontSize: Math.max(9, Math.round(size * 0.11)), color: theme.colors.textSecondary }} numberOfLines={1}>
            {String(props.caption)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const GAUGE_MAX_WIDTH = 220;

export function Gauge({ props }: NodeProps) {
  const theme = useUiTheme();
  const font = useFontStyle(theme.font, 'bold');
  const [measured, onLayout] = useWidth();
  const width = Math.min(measured, GAUGE_MAX_WIDTH);
  const min = typeof props.min === 'number' ? props.min : 0;
  const max = typeof props.max === 'number' ? props.max : 100;
  const fraction = clamp((Number(props.value) - min) / (max - min), 0, 1);
  const color = colorOrTone(theme, props.color, props.tone, 'accent');
  const stroke = Math.max(8, Math.round(width * 0.08));
  const radius = width / 2 - stroke / 2;
  const cx = width / 2;
  const cy = width / 2;
  const height = width / 2 + stroke / 2;
  // Sweeps clockwise over the top from the left end (min) to the right end (max).
  const endX = cx - radius * Math.cos(fraction * Math.PI);
  const endY = cy - radius * Math.sin(fraction * Math.PI);
  const track = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const arc = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
  const display = props.display ?? String(props.value);
  return (
    <View style={styles.gauge}>
      <View onLayout={onLayout} style={styles.gaugeMeasure}>
        {width > 0 ? (
          <View style={{ width, height }}>
            <Svg width={width} height={height}>
              <Path d={track} stroke={withAlpha(color, 0.2)} strokeWidth={stroke} fill="none" strokeLinecap="round" />
              {fraction > 0 ? <Path d={arc} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" /> : null}
            </Svg>
            <View style={[StyleSheet.absoluteFill, styles.gaugeValue]}>
              <Text
                style={[font, { fontSize: Math.round(width * 0.17), color: theme.colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {display}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
      {props.label ? (
        <Text style={[styles.gaugeLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {String(props.label)}
        </Text>
      ) : null}
    </View>
  );
}

const HEATMAP_GAP = 3;
const HEATMAP_MAX_CELL = 16;
/** Opacity per level; level 0 (no activity) uses the track color. */
const LEVELS = [0, 0.3, 0.5, 0.75, 1];

export function Heatmap({ props }: NodeProps) {
  const theme = useUiTheme();
  const [width, onLayout] = useWidth();
  const values: number[] = Array.isArray(props.values) ? props.values.map(Number) : [];
  const rows = typeof props.rows === 'number' ? props.rows : 7;
  const columns = Math.ceil(values.length / rows);
  const cell = width > 0 ? Math.min(HEATMAP_MAX_CELL, (width - HEATMAP_GAP * (columns - 1)) / columns) : 0;
  const peak = Math.max(...values, 0);
  const color = colorOrTone(theme, props.color, props.tone, 'accent');
  const empty = withAlpha(color, 0.12);
  const level = (value: number) => (peak === 0 || value <= 0 ? 0 : Math.min(4, Math.ceil((value / peak) * 4)));
  return (
    <View onLayout={onLayout}>
      {cell > 0 ? (
        <Svg width={columns * cell + HEATMAP_GAP * (columns - 1)} height={rows * cell + HEATMAP_GAP * (rows - 1)}>
          {values.map((value, index) => {
            const step = level(value);
            return (
              <Rect
                key={index}
                x={Math.floor(index / rows) * (cell + HEATMAP_GAP)}
                y={(index % rows) * (cell + HEATMAP_GAP)}
                width={cell}
                height={cell}
                rx={Math.max(1, cell * 0.2)}
                fill={step === 0 ? empty : withAlpha(color, LEVELS[step]!)}
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignSelf: 'center' },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  gauge: { alignItems: 'center', gap: 2 },
  gaugeMeasure: { alignSelf: 'stretch', alignItems: 'center' },
  gaugeValue: { alignItems: 'center', justifyContent: 'flex-end' },
  gaugeLabel: { fontSize: 12, lineHeight: 16 },
});
