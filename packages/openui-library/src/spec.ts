import { z } from 'zod';

/** A prop that holds child elements. Its `accepts` list doubles as the parent rule. */
export interface SlotDef {
  kind: 'slot';
  accepts: readonly string[];
  min: number;
  max: number;
  optional: boolean;
  description?: string;
}

export type PropDef = z.ZodType | SlotDef;

export interface ComponentSpec {
  name: string;
  description: string;
  /** Key order is the positional argument order in OpenUI Lang. Never reorder. */
  props: Record<string, PropDef>;
}

export function slot(
  accepts: readonly string[],
  options: { min?: number; max?: number; optional?: boolean; description?: string } = {},
): SlotDef {
  return {
    kind: 'slot',
    accepts,
    min: options.min ?? 1,
    max: options.max ?? 40,
    optional: options.optional ?? false,
    description: options.description,
  };
}

export function isSlot(def: PropDef): def is SlotDef {
  return (def as SlotDef).kind === 'slot';
}

export function component(
  name: string,
  description: string,
  props: Record<string, PropDef>,
): ComponentSpec {
  return { name, description, props };
}
