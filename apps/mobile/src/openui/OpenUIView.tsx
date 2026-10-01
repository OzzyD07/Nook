import { validateOpenUI, type ElementNode } from '@nook/openui';
import type { UiSurface } from '@nook/shared';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { registry } from '@/openui/registry';
import { CardStateProvider } from '@/openui/state-context';
import type { RenderedChild } from '@/openui/types';

function isElement(value: unknown): value is ElementNode {
  return typeof value === 'object' && value !== null && (value as ElementNode).type === 'element';
}

/** Renders one validated element and, through its slots, its children. */
export function OpenUINode({ node }: { node: ElementNode }) {
  const Component = registry[node.typeName];
  if (!Component) return null;
  // Single-element slots such as `background` hold the element itself instead of an array.
  const nodes = (key: string): ElementNode[] => {
    const value = node.props[key];
    if (Array.isArray(value)) return value.filter(isElement);
    return isElement(value) ? [value] : [];
  };
  const slot = (key: string): RenderedChild[] =>
    nodes(key).map((child, index) => ({
      type: child.typeName,
      element: <OpenUINode key={index} node={child} />,
    }));
  return <Component props={node.props} slot={slot} nodes={nodes} />;
}

/** Shown in place of a document that fails validation or throws while rendering. */
export function Unrenderable({ detail }: { detail?: string }) {
  const colors = useTheme();
  return (
    <View style={styles.fallback}>
      <AppIcon name="warning" size={18} color={colors.warning} />
      <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>{strings.card.unrenderable}</Text>
      {__DEV__ && detail ? (
        <Text style={[styles.fallbackDetail, { color: colors.textSecondary }]} numberOfLines={4}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Renders an OpenUI Lang document natively. The document is re-validated on the
 * device with the same rules the MCP server applies, so nothing unvalidated renders.
 * Pass `cardId` to make interactive components editable and save their input.
 */
export function OpenUIView({ surface, source, cardId }: { surface: UiSurface; source: string; cardId?: string }) {
  const result = useMemo(() => validateOpenUI(surface, source), [surface, source]);
  if (!result.ok) {
    return <Unrenderable detail={result.errors.map((e) => `${e.path}: ${e.message}`).join('\n')} />;
  }
  const tree = (
    <ErrorBoundary resetKey={source} fallback={<Unrenderable />}>
      <OpenUINode node={result.tree} />
    </ErrorBoundary>
  );
  return cardId ? <CardStateProvider cardId={cardId}>{tree}</CardStateProvider> : tree;
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
  fallbackText: { fontSize: 13, textAlign: 'center' },
  fallbackDetail: { fontSize: 10, textAlign: 'center' },
});
