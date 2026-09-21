import { validateOpenUI, type ElementNode } from '@nook/openui';
import type { UiSurface } from '@nook/shared';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { registry } from '@/openui/registry';
import type { RenderedChild } from '@/openui/types';

function isElement(value: unknown): value is ElementNode {
  return typeof value === 'object' && value !== null && (value as ElementNode).type === 'element';
}

function Node({ node }: { node: ElementNode }) {
  const Component = registry[node.typeName];
  if (!Component) return null;
  const slot = (key: string): RenderedChild[] => {
    const value = node.props[key];
    if (!Array.isArray(value)) return [];
    return value.filter(isElement).map((child, index) => ({
      type: child.typeName,
      element: <Node key={index} node={child} />,
    }));
  };
  return <Component props={node.props} slot={slot} />;
}

function Unrenderable({ detail }: { detail?: string }) {
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
 */
export function OpenUIView({ surface, source }: { surface: UiSurface; source: string }) {
  const result = useMemo(() => validateOpenUI(surface, source), [surface, source]);
  if (!result.ok) {
    return <Unrenderable detail={result.errors.map((e) => `${e.path}: ${e.message}`).join('\n')} />;
  }
  return (
    <ErrorBoundary resetKey={source} fallback={<Unrenderable />}>
      <Node node={result.tree} />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
  fallbackText: { fontSize: 13, textAlign: 'center' },
  fallbackDetail: { fontSize: 10, textAlign: 'center' },
});
