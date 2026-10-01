import { THEMES, type ThemeName } from '@nook/openui';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useId, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient as SvgRadialGradient, Rect, Stop } from 'react-native-svg';

import { withAlpha } from '@/constants/theme';
import { MeshBackground } from '@/openui/components/mesh-gradient';
import { resolveColor, useUiTheme, type UiTheme } from '@/openui/ui-theme';
import type { NodeProps } from '@/openui/types';

function resolveAll(values: unknown, theme: UiTheme): string[] {
  return Array.isArray(values) ? values.map((value) => resolveColor(value, theme) ?? theme.colors.background) : [];
}

/** CSS angle (0 = to top, 90 = to right) as expo-linear-gradient start and end points. */
function direction(angle: number) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians) / 2;
  const dy = -Math.cos(radians) / 2;
  return { start: { x: 0.5 - dx, y: 0.5 - dy }, end: { x: 0.5 + dx, y: 0.5 + dy } };
}

function LinearBackground({ colors, angle }: { colors: readonly string[]; angle: number }) {
  const { start, end } = direction(angle);
  return (
    <LinearGradient
      colors={colors as unknown as readonly [string, string, ...string[]]}
      start={start}
      end={end}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function Fill({ props }: NodeProps) {
  const theme = useUiTheme();
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: resolveColor(props.color, theme) ?? undefined }]} />;
}

export function Gradient({ props }: NodeProps) {
  const theme = useUiTheme();
  return <LinearBackground colors={resolveAll(props.colors, theme)} angle={props.angle ?? 135} />;
}

export function RadialGradient({ props }: NodeProps) {
  const theme = useUiTheme();
  // Gradient ids are global in the DOM on web, so each instance needs its own.
  const id = `rg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const colors = resolveAll(props.colors, theme);
  const x = props.x ?? 0.5;
  const y = props.y ?? 0.5;
  const radius = props.radius ?? 0.8;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <SvgRadialGradient id={id} cx={x} cy={y} fx={x} fy={y} rx={radius} ry={radius} gradientUnits="objectBoundingBox">
          {colors.map((color, index) => (
            <Stop key={index} offset={index / (colors.length - 1)} stopColor={color} />
          ))}
        </SvgRadialGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export function MeshGradient({ props }: NodeProps) {
  const theme = useUiTheme();
  return <MeshBackground colors={resolveAll(props.colors, theme)} />;
}

export function BackgroundImage({ props }: NodeProps) {
  const dim = props.dim ?? 0.35;
  return (
    <View style={StyleSheet.absoluteFill}>
      <ExpoImage
        source={{ uri: String(props.url) }}
        contentFit="cover"
        blurRadius={props.blur ?? 0}
        transition={200}
        style={StyleSheet.absoluteFill}
      />
      {dim > 0 ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${dim})` }]} /> : null}
    </View>
  );
}

/** The backdrop a preset theme paints when no explicit background is given. */
export function ThemeBackdrop({ theme }: { theme: unknown }) {
  if (typeof theme !== 'string' || !(theme in THEMES)) return null;
  const backdrop = THEMES[theme as ThemeName].backdrop;
  return backdrop.kind === 'mesh' ? (
    <MeshBackground colors={[...backdrop.colors]} />
  ) : (
    <LinearBackground colors={backdrop.colors} angle={backdrop.angle} />
  );
}

/** Fills its parent behind the content: the explicit background, else the theme's backdrop. */
export function Backdrop({ background, theme }: { background?: ReactNode; theme?: unknown }) {
  const content = background ?? <ThemeBackdrop theme={theme} />;
  return (
    <View style={styles.layer}>
      {content}
    </View>
  );
}

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * Translucent layer behind a Surface's content. Liquid Glass on iOS 26+, a blur elsewhere
 * (Android renders BlurView as a translucent fill), or a plain tint.
 */
export function Material({ kind, theme }: { kind: unknown; theme: UiTheme }) {
  if (kind !== 'glass' && kind !== 'blur' && kind !== 'tint') return null;
  const dark = theme.scheme === 'dark';
  const tint = withAlpha('#FFFFFF', dark ? 0.1 : 0.45);
  let layer: ReactNode;
  if (kind === 'tint') {
    layer = <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />;
  } else if (kind === 'glass' && liquidGlass) {
    layer = <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" colorScheme={theme.scheme} />;
  } else {
    layer = (
      <>
        <BlurView style={StyleSheet.absoluteFill} intensity={kind === 'blur' ? 70 : 35} tint={dark ? 'dark' : 'light'} />
        {kind === 'glass' ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} /> : null}
      </>
    );
  }
  return (
    <View style={styles.layer}>
      {layer}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
});
