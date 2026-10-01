import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { withAlpha } from '@/constants/theme';
import { Backdrop, Material } from '@/openui/components/backgrounds';
import { GAP, HEADING_SIZE, pick, toneColor } from '@/openui/tokens';
import type { NodeProps } from '@/openui/types';
import { resolveColor, UiThemeProvider, useUiColors, useUiTheme } from '@/openui/ui-theme';

const CARD_PADDING = { none: 0, sm: 10, md: 14 } as const;

const JUSTIFY = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
} as const satisfies Record<string, ViewStyle['justifyContent']>;

export function CardContainer({ props, slot }: NodeProps) {
  return (
    <UiThemeProvider theme={props.theme}>
      <CardBody props={props} slot={slot} />
    </UiThemeProvider>
  );
}

function CardBody({ props, slot }: Pick<NodeProps, 'props' | 'slot'>) {
  const colors = useUiColors();
  const tint = props.tone && props.tone !== 'neutral' ? withAlpha(toneColor(colors, props.tone), 0.1) : undefined;
  const background = slot('background')[0]?.element;
  return (
    <View
      style={[
        styles.card,
        { padding: pick(CARD_PADDING, props.padding, 'md'), justifyContent: pick(JUSTIFY, props.justify, 'start') },
      ]}>
      {background || props.theme ? <Backdrop background={background} theme={props.theme} /> : null}
      {tint ? <View style={[StyleSheet.absoluteFill, styles.passThrough, { backgroundColor: tint }]} /> : null}
      {slot('children').map((child) => child.element)}
    </View>
  );
}

/** The screen paints the page background (see DetailBackdrop); the page only applies its theme. */
export function Page({ props, slot }: NodeProps) {
  return (
    <UiThemeProvider theme={props.theme}>
      <View style={styles.page}>{slot('children').map((child) => child.element)}</View>
    </UiThemeProvider>
  );
}

export function Section({ props, slot }: NodeProps) {
  const colors = useUiColors();
  return (
    <View style={styles.section}>
      <Text style={[HEADING_SIZE.sm, styles.sectionTitle, { color: colors.textSecondary }]}>
        {String(props.title).toUpperCase()}
      </Text>
      {slot('children').map((child) => child.element)}
    </View>
  );
}

const ALIGN = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
} as const satisfies Record<string, ViewStyle['alignItems']>;

export function Stack({ props, slot }: NodeProps) {
  return (
    <View style={{ gap: pick(GAP, props.gap, 'sm'), alignItems: pick(ALIGN, props.align, 'stretch') }}>
      {slot('children').map((child) => child.element)}
    </View>
  );
}

/** Components that take their natural width inside a Row; everything else shares the space. */
const FIXED_WIDTH_IN_ROW = new Set(['Icon', 'Badge', 'Link', 'Caption', 'Ring']);

export function Row({ props, slot }: NodeProps) {
  const align: ViewStyle['alignItems'] =
    props.align === 'start' ? 'flex-start' : props.align === 'end' ? 'flex-end' : 'center';
  const justify: ViewStyle['justifyContent'] =
    props.justify === 'center'
      ? 'center'
      : props.justify === 'end'
        ? 'flex-end'
        : props.justify === 'between'
          ? 'space-between'
          : 'flex-start';
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: pick(GAP, props.gap, 'sm'),
        alignItems: align,
        justifyContent: justify,
        flexWrap: props.wrap ? 'wrap' : 'nowrap',
      }}>
      {slot('children').map((child, index) => (
        <View
          key={index}
          style={FIXED_WIDTH_IN_ROW.has(child.type) || props.justify === 'between' ? styles.fixed : styles.grow}>
          {child.element}
        </View>
      ))}
    </View>
  );
}

const SURFACE_PADDING = { none: 0, xs: 6, sm: 10, md: 14, lg: 20 } as const;
const RADIUS = { none: 0, sm: 8, md: 14, lg: 22, full: 999 } as const;
const SHADOW = {
  none: undefined,
  sm: '0px 1px 3px rgba(0, 0, 0, 0.14)',
  md: '0px 4px 14px rgba(0, 0, 0, 0.2)',
  lg: '0px 12px 32px rgba(0, 0, 0, 0.3)',
} as const;

export function Surface({ props, slot }: NodeProps) {
  const theme = useUiTheme();
  const radius = pick(RADIUS, props.radius, 'md');
  const border = resolveColor(props.border, theme);
  const shadow = props.shadow === 'glow' ? `0px 0px 22px ${withAlpha(theme.colors.accent, 0.55)}` : pick(SHADOW, props.shadow, 'none');
  const background = slot('background')[0]?.element;
  // The shadow sits on an outer view because the inner one clips its background to the radius.
  return (
    <View style={[{ borderRadius: radius, boxShadow: shadow }, props.grow && styles.grow]}>
      <View
        style={[
          styles.surface,
          {
            borderRadius: radius,
            padding: pick(SURFACE_PADDING, props.padding, 'md'),
            gap: pick(GAP, props.gap, 'sm'),
            alignItems: pick(ALIGN, props.align, 'stretch'),
          },
          border ? { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: border } : null,
          props.grow && styles.grow,
        ]}>
        {background ? <Backdrop background={background} /> : null}
        <Material kind={props.material} theme={theme} />
        {slot('children').map((child) => child.element)}
      </View>
    </View>
  );
}

const LAYER_ALIGN: Record<string, ViewStyle> = {
  'top-left': { justifyContent: 'flex-start', alignItems: 'flex-start' },
  top: { justifyContent: 'flex-start', alignItems: 'center' },
  'top-right': { justifyContent: 'flex-start', alignItems: 'flex-end' },
  left: { justifyContent: 'center', alignItems: 'flex-start' },
  center: { justifyContent: 'center', alignItems: 'center' },
  right: { justifyContent: 'center', alignItems: 'flex-end' },
  'bottom-left': { justifyContent: 'flex-end', alignItems: 'flex-start' },
  bottom: { justifyContent: 'flex-end', alignItems: 'center' },
  'bottom-right': { justifyContent: 'flex-end', alignItems: 'flex-end' },
};

export function Layer({ props, slot }: NodeProps) {
  const [base, ...overlays] = slot('children');
  return (
    <View>
      {base?.element}
      <View
        style={[StyleSheet.absoluteFill, styles.overlay, { padding: pick(GAP, props.padding, 'none') }, LAYER_ALIGN[props.align] ?? LAYER_ALIGN.center]}>
        {overlays.map((child) => child.element)}
      </View>
    </View>
  );
}

export function Divider() {
  const colors = useUiColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 8, overflow: 'hidden' },
  page: { gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontWeight: '600', letterSpacing: 0.6, fontSize: 12 },
  fixed: { flexShrink: 0 },
  grow: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  surface: { overflow: 'hidden' },
  overlay: { gap: 6, pointerEvents: 'box-none' },
  passThrough: { pointerEvents: 'none' },
  divider: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
});
