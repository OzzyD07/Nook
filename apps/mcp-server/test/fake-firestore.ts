import { decodeValue, type Fields, type FirestoreValue } from '../src/firestore/codec';

interface Doc {
  fields: Fields;
  updateTime: string;
}

type WriteBody =
  | {
      update: { name: string; fields: Fields };
      updateMask?: { fieldPaths: string[] };
      currentDocument?: { exists?: boolean; updateTime?: string };
    }
  | { delete: string; currentDocument?: { exists?: boolean; updateTime?: string } };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const error = (status: number, code: string, message: string) => json({ error: { code: status, status: code, message } }, status);

function setPath(fields: Fields, path: string[], value: FirestoreValue | undefined) {
  const [head, ...rest] = path;
  if (!head) return;
  if (rest.length === 0) {
    if (value === undefined) delete fields[head];
    else fields[head] = value;
    return;
  }
  const existing = fields[head];
  const map = existing && 'mapValue' in existing ? existing : { mapValue: { fields: {} as Fields } };
  map.mapValue.fields ??= {};
  setPath(map.mapValue.fields, rest, value);
  fields[head] = map;
}

function getPath(fields: Fields, path: string[]): FirestoreValue | undefined {
  const [head, ...rest] = path;
  const value = head ? fields[head] : undefined;
  if (!value || rest.length === 0) return value;
  return 'mapValue' in value ? getPath(value.mapValue.fields ?? {}, rest) : undefined;
}

/** In-memory stand-in for the Firestore REST endpoints the Worker uses. */
export class FakeFirestore {
  readonly docs = new Map<string, Doc>();
  private clock = 0;
  /** Called at the start of every commit; lets tests simulate concurrent writers. */
  beforeCommit: (() => void) | undefined;

  private tick(): string {
    this.clock += 1;
    return new Date(Date.UTC(2026, 0, 1, 0, 0, this.clock)).toISOString();
  }

  /** Test helper: bump a document's updateTime as if another writer changed it. */
  touch(name: string) {
    const doc = this.docs.get(name);
    if (doc) doc.updateTime = this.tick();
  }

  data(name: string): Record<string, unknown> | undefined {
    const doc = this.docs.get(name);
    return doc && (decodeValue({ mapValue: { fields: doc.fields } }) as Record<string, unknown>);
  }

  names(prefix: string): string[] {
    return [...this.docs.keys()].filter((name) => name.startsWith(prefix)).sort();
  }

  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    const path = decodeURIComponent(url.pathname.replace(/^\/v1\//, ''));
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;

    if (path.endsWith(':commit')) return this.commit(body.writes as WriteBody[]);
    if (path.endsWith(':runQuery')) return this.runQuery(path.slice(0, -':runQuery'.length), body.structuredQuery);
    const doc = this.docs.get(path);
    if (!doc) return error(404, 'NOT_FOUND', `${path} not found`);
    return json({ name: path, fields: doc.fields, updateTime: doc.updateTime });
  };

  private commit(writes: WriteBody[]): Response {
    this.beforeCommit?.();
    for (const write of writes) {
      const name = 'update' in write ? write.update.name : write.delete;
      const existing = this.docs.get(name);
      const pre = write.currentDocument;
      if (pre?.exists === false && existing) return error(409, 'ALREADY_EXISTS', `${name} exists`);
      if (pre?.exists === true && !existing) return error(404, 'NOT_FOUND', `${name} missing`);
      if (pre?.updateTime && existing?.updateTime !== pre.updateTime) {
        return error(400, 'FAILED_PRECONDITION', `${name} was modified`);
      }
    }
    const updateTime = this.tick();
    for (const write of writes) {
      if ('delete' in write) {
        this.docs.delete(write.delete);
        continue;
      }
      const { name, fields } = write.update;
      if (write.updateMask) {
        const next = structuredClone(this.docs.get(name)?.fields ?? {});
        for (const fieldPath of write.updateMask.fieldPaths) {
          const segments = fieldPath.split('.');
          setPath(next, segments, getPath(fields, segments));
        }
        this.docs.set(name, { fields: next, updateTime });
      } else {
        this.docs.set(name, { fields: structuredClone(fields), updateTime });
      }
    }
    return json({ commitTime: updateTime, writeResults: writes.map(() => ({ updateTime })) });
  }

  private runQuery(
    parent: string,
    query: {
      from: { collectionId: string }[];
      where?: { fieldFilter: { field: { fieldPath: string }; op: string; value: FirestoreValue } };
      orderBy?: { field: { fieldPath: string }; direction: string }[];
      offset?: number;
      limit?: number;
    },
  ): Response {
    const prefix = `${parent}/${query.from[0]!.collectionId}/`;
    let rows = [...this.docs.entries()]
      .filter(([name]) => name.startsWith(prefix) && !name.slice(prefix.length).includes('/'))
      .map(([name, doc]) => ({ name, doc, data: decodeValue({ mapValue: { fields: doc.fields } }) as Record<string, unknown> }));
    const filter = query.where?.fieldFilter;
    if (filter) {
      const expected = decodeValue(filter.value);
      rows = rows.filter((row) => row.data[filter.field.fieldPath] === expected);
    }
    for (const order of [...(query.orderBy ?? [])].reverse()) {
      const sign = order.direction === 'DESCENDING' ? -1 : 1;
      rows.sort((a, b) => sign * (Number(a.data[order.field.fieldPath]) - Number(b.data[order.field.fieldPath])));
    }
    rows = rows.slice(query.offset ?? 0, query.limit ? (query.offset ?? 0) + query.limit : undefined);
    return json(rows.map((row) => ({ document: { name: row.name, fields: row.doc.fields, updateTime: row.doc.updateTime } })));
  }
}
