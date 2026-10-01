import { z } from 'zod';

/** A prop that holds child elements. Its `accepts` list doubles as the parent rule. */
export interface SlotDef {
  kind: 'slot';
  accepts: readonly string[];
  min: number;
  max: number;
  optional: boolean;
  /** Holds exactly one element instead of an array, e.g. `background`. */
  single: boolean;
  description?: string;
}

export type PropDef = z.ZodType | SlotDef;

export interface CheckIssue {
  code: 'invalid-prop' | 'duplicate-id';
  message: string;
}

export interface ComponentSpec {
  name: string;
  description: string;
  /** Key order is the positional argument order in OpenUI Lang. Never reorder. */
  props: Record<string, PropDef>;
  /** Stores user input under its `id` prop; ids must be unique within a document. */
  stateful?: boolean;
  /** Cross-prop rules that a per-prop schema cannot express. */
  check?: (props: Record<string, unknown>) => CheckIssue[];
}

export function slot(
  accepts: readonly string[],
  options: { min?: number; max?: number; optional?: boolean; single?: boolean; description?: string } = {},
): SlotDef {
  return {
    kind: 'slot',
    accepts,
    min: options.min ?? 1,
    max: options.max ?? 40,
    optional: options.optional ?? false,
    single: options.single ?? false,
    description: options.description,
  };
}

/** An optional prop that takes one element, such as a background. */
export function singleSlot(accepts: readonly string[], description?: string): SlotDef {
  return slot(accepts, { min: 1, max: 1, optional: true, single: true, description });
}

export function isSlot(def: PropDef): def is SlotDef {
  return (def as SlotDef).kind === 'slot';
}

export function component(
  name: string,
  description: string,
  props: Record<string, PropDef>,
  options: Pick<ComponentSpec, 'stateful' | 'check'> = {},
): ComponentSpec {
  return { name, description, props, ...options };
}
