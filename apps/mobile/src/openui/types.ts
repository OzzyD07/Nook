import type { ElementNode } from '@nook/openui';
import type { ReactNode } from 'react';

export interface RenderedChild {
  type: string;
  element: ReactNode;
}

/** Validated props straight from the parser; skipped optional arguments arrive as null. */
export type UiProps = Record<string, any>;

export interface NodeProps {
  props: UiProps;
  /** Renders the child elements of a slot prop such as `children` or `items`. */
  slot: (key: string) => RenderedChild[];
  /** The raw child elements of a slot, for components that render their children's data themselves. */
  nodes: (key: string) => ElementNode[];
}

export type NodeComponent = (props: NodeProps) => ReactNode;

/** Typed view of a child's props; safe because the validator checked them against the component schema. */
export function propsOf<T>(node: ElementNode): T {
  return node.props as unknown as T;
}
