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
}

export type NodeComponent = (props: NodeProps) => ReactNode;
