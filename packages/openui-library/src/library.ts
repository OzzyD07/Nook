import type { UiSurface } from '@nook/shared';
import {
  createLibrary,
  createParser,
  defineComponent,
  type Library,
  type LibraryJSONSchema,
  type Parser,
} from '@openuidev/lang-core';
import { z } from 'zod';

import { CARD_ROOT, cardSpecs, DETAIL_ROOT, detailSpecs } from './components';
import { isSlot, type ComponentSpec, type SlotDef } from './spec';

export interface SurfaceLibrary {
  surface: UiSurface;
  root: string;
  specs: ReadonlyMap<string, ComponentSpec>;
  /** Strict schema of each component's non-slot props. */
  leafSchemas: ReadonlyMap<string, z.ZodType>;
  slots: ReadonlyMap<string, ReadonlyMap<string, SlotDef>>;
  library: Library<null>;
  jsonSchema: LibraryJSONSchema;
  parser: Parser;
}

function build(surface: UiSurface, root: string, specs: ComponentSpec[]): SurfaceLibrary {
  const propsByName = new Map<string, z.ZodObject>();
  const leafSchemas = new Map<string, z.ZodType>();
  const slots = new Map<string, Map<string, SlotDef>>();

  for (const spec of specs) {
    const shape: Record<string, z.ZodType> = {};
    const leafShape: Record<string, z.ZodType> = {};
    const componentSlots = new Map<string, SlotDef>();
    for (const [key, def] of Object.entries(spec.props)) {
      if (isSlot(def)) {
        componentSlots.set(key, def);
        // Getter so slots can refer to components defined later (and to themselves).
        Object.defineProperty(shape, key, {
          enumerable: true,
          get() {
            const refs = def.accepts.map((name): z.ZodType => {
              const ref = propsByName.get(name);
              if (!ref) throw new Error(`${spec.name}.${key} accepts unknown component ${name}`);
              return ref;
            });
            const [first, ...rest] = refs;
            const item = rest.length === 0 ? first! : z.union([first!, ...rest]);
            const value = def.single ? item : z.array(item);
            return def.optional ? value.optional() : value;
          },
        });
      } else {
        shape[key] = def;
        leafShape[key] = def;
      }
    }
    propsByName.set(spec.name, z.object(shape));
    leafSchemas.set(spec.name, z.strictObject(leafShape));
    slots.set(spec.name, componentSlots);
  }

  const library = createLibrary<null>({
    root,
    components: specs.map((spec) =>
      defineComponent({
        name: spec.name,
        description: spec.description,
        props: propsByName.get(spec.name)!,
        component: null,
      }),
    ),
  });
  const jsonSchema = library.toJSONSchema();

  return {
    surface,
    root,
    specs: new Map(specs.map((spec) => [spec.name, spec])),
    leafSchemas,
    slots,
    library,
    jsonSchema,
    parser: createParser(jsonSchema, root),
  };
}

let cached: Record<UiSurface, SurfaceLibrary> | undefined;

/** Libraries are built once per process/isolate. */
export function getLibraries(): Record<UiSurface, SurfaceLibrary> {
  cached ??= {
    card: build('card', CARD_ROOT, cardSpecs),
    detail: build('detail', DETAIL_ROOT, detailSpecs),
  };
  return cached;
}

export function getLibrary(surface: UiSurface): SurfaceLibrary {
  return getLibraries()[surface];
}
