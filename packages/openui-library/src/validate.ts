import { LIMITS, type UiSurface } from '@nook/shared';
import type { ElementNode } from '@openuidev/lang-core';

import { getLibrary } from './library';

export type UiErrorCode =
  | 'empty'
  | 'too-large'
  | 'parse-error'
  | 'unknown-component'
  | 'invalid-prop'
  | 'wrong-root'
  | 'wrong-parent'
  | 'unresolved-reference'
  | 'forbidden-syntax'
  | 'too-deep'
  | 'too-many-nodes';

export interface UiIssue {
  code: UiErrorCode;
  /** Location such as `root:CardContainer.children[0]:Text.size`. */
  path: string;
  message: string;
}

export interface UiStats {
  bytes: number;
  nodes: number;
  depth: number;
  components: string[];
}

export type UiValidationResult =
  | { ok: true; tree: ElementNode; warnings: UiIssue[]; stats: UiStats }
  | { ok: false; errors: UiIssue[]; warnings: UiIssue[]; stats: UiStats | null };

function utf8Length(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

function isElement(value: unknown): value is ElementNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ElementNode).type === 'element' &&
    typeof (value as ElementNode).typeName === 'string'
  );
}

/** Parser AST nodes carry a `k` discriminant; they only survive for dynamic values. */
function containsExpression(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsExpression);
  if (typeof value !== 'object' || value === null) return false;
  if (isElement(value)) return false;
  if ('k' in value && typeof (value as { k: unknown }).k === 'string') return true;
  return Object.values(value).some(containsExpression);
}

/**
 * Strict validation of an OpenUI Lang document for one surface. The parser alone is
 * lenient (it drops unknown components and skips refinements), so every node is
 * re-checked here. Only static documents are accepted: no $state, Query, Mutation,
 * actions, builtins or expressions.
 */
export function validateOpenUI(surface: UiSurface, source: string): UiValidationResult {
  const lib = getLibrary(surface);
  const errors: UiIssue[] = [];
  const warnings: UiIssue[] = [];
  const bytes = utf8Length(source);

  if (!source.trim()) {
    return { ok: false, errors: [{ code: 'empty', path: '', message: 'Document is empty' }], warnings, stats: null };
  }
  const maxBytes = LIMITS.uiMaxBytes[surface];
  if (bytes > maxBytes) {
    return {
      ok: false,
      errors: [{ code: 'too-large', path: '', message: `Document is ${bytes} bytes; the ${surface} limit is ${maxBytes}` }],
      warnings,
      stats: null,
    };
  }

  let result;
  try {
    result = lib.parser.parse(source);
  } catch (error) {
    return {
      ok: false,
      errors: [{ code: 'parse-error', path: '', message: `Could not parse: ${String(error)}` }],
      warnings,
      stats: null,
    };
  }

  const { meta } = result;
  if (meta.incomplete) {
    errors.push({ code: 'parse-error', path: '', message: 'Document is truncated (unclosed string, bracket or parenthesis)' });
  }
  for (const issue of meta.errors) {
    errors.push({
      code: issue.code === 'unknown-component' ? 'unknown-component' : 'invalid-prop',
      path: `${issue.statementId ?? ''}${issue.component ? ` > ${issue.component}` : ''}${issue.path ? `.${issue.path.replace(/^\//, '').replace(/\//g, '.')}` : ''}`,
      message: issue.message,
    });
  }
  for (const name of meta.unresolved) {
    errors.push({ code: 'unresolved-reference', path: name, message: `"${name}" is referenced but never defined` });
  }
  for (const name of meta.orphaned) {
    warnings.push({ code: 'unresolved-reference', path: name, message: `"${name}" is defined but not reachable from root; it will not render` });
  }
  if (Object.keys(result.stateDeclarations).length > 0) {
    errors.push({ code: 'forbidden-syntax', path: '', message: '$state variables are not supported; use literal values' });
  }
  if (result.queryStatements.length > 0 || result.mutationStatements.length > 0) {
    errors.push({ code: 'forbidden-syntax', path: '', message: 'Query() and Mutation() are not supported; write the data into the document' });
  }

  const root = result.root;
  if (!root) {
    errors.push({ code: 'wrong-root', path: '', message: `Document must define root = ${lib.root}(...)` });
    return { ok: false, errors, warnings, stats: null };
  }
  if (root.typeName !== lib.root) {
    errors.push({ code: 'wrong-root', path: 'root', message: `root must be ${lib.root}, got ${root.typeName}` });
  }

  const components = new Set<string>();
  let nodes = 0;
  let maxDepth = 0;
  const depthLimit = LIMITS.uiMaxDepth[surface];

  const visit = (node: ElementNode, path: string, depth: number) => {
    nodes++;
    maxDepth = Math.max(maxDepth, depth);
    components.add(node.typeName);
    if (depth > depthLimit) {
      errors.push({ code: 'too-deep', path, message: `Nesting deeper than ${depthLimit} levels` });
      return;
    }
    const spec = lib.specs.get(node.typeName);
    if (!spec) {
      errors.push({ code: 'unknown-component', path, message: `${node.typeName} is not available on the ${surface} surface` });
      return;
    }
    if (node.partial) {
      errors.push({ code: 'parse-error', path, message: 'Component call is incomplete' });
    }
    // The parser's hasDynamicProps flag also marks every ancestor of a dynamic node, so
    // expressions are located per prop instead; slot children are checked when visited.
    const slots = lib.slots.get(node.typeName)!;
    const leafProps: Record<string, unknown> = {};
    let dynamic = false;
    for (const [key, value] of Object.entries(node.props)) {
      if (slots.has(key)) continue;
      if (containsExpression(value)) {
        dynamic = true;
        errors.push({
          code: 'forbidden-syntax',
          path: `${path}.${key}`,
          message: 'Arguments must be literals or references; expressions, $state, @builtins and actions are not supported',
        });
        continue;
      }
      // `null` for a skipped optional argument means "use the default".
      if (value !== null && value !== undefined) leafProps[key] = value;
    }
    if (dynamic) return;
    const parsed = lib.leafSchemas.get(node.typeName)!.safeParse(leafProps);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          code: 'invalid-prop',
          path: `${path}.${issue.path.join('.') || '(props)'}`,
          message: issue.message,
        });
      }
    }

    for (const [key, def] of slots) {
      const value = node.props[key];
      const slotPath = `${path}.${key}`;
      if (value === undefined || value === null) {
        if (!def.optional) errors.push({ code: 'invalid-prop', path: slotPath, message: `${node.typeName} needs ${key}` });
        continue;
      }
      if (containsExpression(value)) {
        errors.push({ code: 'forbidden-syntax', path: slotPath, message: `${key} must be a literal list of components; expressions are not supported` });
        continue;
      }
      if (!Array.isArray(value)) {
        errors.push({ code: 'invalid-prop', path: slotPath, message: `${key} must be an array of components` });
        continue;
      }
      const children = value.filter((child) => child !== null && child !== undefined);
      if (children.length < def.min || children.length > def.max) {
        errors.push({
          code: 'invalid-prop',
          path: slotPath,
          message: `${key} must contain ${def.min}-${def.max} components, got ${children.length}`,
        });
      }
      children.forEach((child, index) => {
        const childPath = `${slotPath}[${index}]`;
        if (!isElement(child)) {
          errors.push({ code: 'invalid-prop', path: childPath, message: `${key} may only contain components (${def.accepts.join(', ')})` });
          return;
        }
        if (!def.accepts.includes(child.typeName)) {
          errors.push({
            code: 'wrong-parent',
            path: childPath,
            message: `${child.typeName} cannot be placed in ${node.typeName}.${key}; allowed: ${def.accepts.join(', ')}`,
          });
          return;
        }
        visit(child, `${childPath}:${child.typeName}`, depth + 1);
      });
    }
  };

  visit(root, `root:${root.typeName}`, 1);

  const nodeLimit = LIMITS.uiMaxNodes[surface];
  if (nodes > nodeLimit) {
    errors.push({ code: 'too-many-nodes', path: '', message: `Document has ${nodes} components; the ${surface} limit is ${nodeLimit}` });
  }

  const stats: UiStats = { bytes, nodes, depth: maxDepth, components: [...components].sort() };
  if (errors.length > 0) return { ok: false, errors, warnings, stats };
  return { ok: true, tree: root, warnings, stats };
}
