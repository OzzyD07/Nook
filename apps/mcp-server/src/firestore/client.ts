import { decodeFields, encodeFields, encodeValue, type Fields } from './codec';

export interface StoredDocument {
  /** Path relative to the database root, e.g. users/u1/cards/c1. */
  path: string;
  data: Record<string, unknown>;
  updateTime: string;
}

export type Precondition = { exists: boolean } | { updateTime: string };

export type Write =
  | {
      update: { name: string; fields: Fields };
      updateMask?: { fieldPaths: string[] };
      currentDocument?: Precondition;
    }
  | { delete: string; currentDocument?: Precondition };

export class FirestoreError extends Error {
  constructor(
    readonly httpStatus: number,
    /** gRPC status name, e.g. FAILED_PRECONDITION, ALREADY_EXISTS, NOT_FOUND. */
    readonly status: string,
    message: string,
  ) {
    super(message);
    this.name = 'FirestoreError';
  }

  /** A precondition (exists / updateTime) did not hold: someone else wrote first. */
  get isConflict(): boolean {
    return this.status === 'FAILED_PRECONDITION' || this.status === 'ALREADY_EXISTS' || this.status === 'ABORTED';
  }
}

export interface FirestoreOptions {
  projectId: string;
  getToken: () => Promise<string>;
  fetch?: typeof fetch;
  /** host:port of the local emulator; uses http and the emulator's owner token. */
  emulatorHost?: string;
}

export interface FieldFilter {
  field: string;
  op: 'EQUAL' | 'LESS_THAN' | 'GREATER_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN_OR_EQUAL';
  value: unknown;
}

export interface Query {
  collection: string;
  where?: FieldFilter[];
  orderBy?: { field: string; direction: 'ASCENDING' | 'DESCENDING' }[];
  offset?: number;
  limit?: number;
}

/** Joins field path segments, quoting any that are not plain identifiers (e.g. "week-rating"). */
export function fieldPath(...segments: string[]): string {
  return segments
    .map((segment) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment) ? segment : '`' + segment.replace(/[`\\]/g, '\\$&') + '`'))
    .join('.');
}

/** Minimal Firestore REST client: get, query, and atomic commits with preconditions. */
export class Firestore {
  private readonly root: string;
  private readonly base: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: FirestoreOptions) {
    this.root = `projects/${options.projectId}/databases/(default)/documents`;
    this.base = options.emulatorHost
      ? `http://${options.emulatorHost}/v1`
      : 'https://firestore.googleapis.com/v1';
    // Workers throw "Illegal invocation" if the global fetch is called with another `this`,
    // which `this.fetchImpl(...)` would do; wrap it instead of storing the bare reference.
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
  }

  /** Full resource name for a document path. */
  name(path: string): string {
    return `${this.root}/${path}`;
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const token = this.options.emulatorHost ? 'owner' : await this.options.getToken();
    const response = await this.fetchImpl(url, {
      ...init,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    });
    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : {};
    if (!response.ok) {
      const error = (body as { error?: { status?: string; message?: string } }).error;
      throw new FirestoreError(response.status, error?.status ?? 'UNKNOWN', error?.message ?? text);
    }
    return body as T;
  }

  private toStored(doc: { name: string; fields?: Fields; updateTime: string }): StoredDocument {
    return {
      path: doc.name.slice(this.root.length + 1),
      data: decodeFields(doc.fields ?? {}),
      updateTime: doc.updateTime,
    };
  }

  async get(path: string): Promise<StoredDocument | null> {
    try {
      const doc = await this.request<{ name: string; fields?: Fields; updateTime: string }>(
        `${this.base}/${this.name(path)}`,
        { method: 'GET' },
      );
      return this.toStored(doc);
    } catch (error) {
      if (error instanceof FirestoreError && error.status === 'NOT_FOUND') return null;
      throw error;
    }
  }

  /** Runs a query over a collection directly below `parentPath` ('' for the root). */
  async query(parentPath: string, query: Query): Promise<StoredDocument[]> {
    const filters = (query.where ?? []).map((filter) => ({
      fieldFilter: { field: { fieldPath: filter.field }, op: filter.op, value: encodeValue(filter.value) },
    }));
    const structuredQuery: Record<string, unknown> = { from: [{ collectionId: query.collection }] };
    if (filters.length === 1) structuredQuery.where = filters[0];
    if (filters.length > 1) structuredQuery.where = { compositeFilter: { op: 'AND', filters } };
    if (query.orderBy) {
      structuredQuery.orderBy = query.orderBy.map((order) => ({ field: { fieldPath: order.field }, direction: order.direction }));
    }
    if (query.offset) structuredQuery.offset = query.offset;
    if (query.limit) structuredQuery.limit = query.limit;

    const parent = parentPath ? `${this.root}/${parentPath}` : this.root;
    const rows = await this.request<{ document?: { name: string; fields?: Fields; updateTime: string } }[]>(
      `${this.base}/${parent}:runQuery`,
      { method: 'POST', body: JSON.stringify({ structuredQuery }) },
    );
    return rows.flatMap((row) => (row.document ? [this.toStored(row.document)] : []));
  }

  /** Applies all writes atomically; any failed precondition rejects the whole commit. */
  async commit(writes: Write[]): Promise<{ commitTime: string }> {
    return this.request<{ commitTime: string }>(`${this.base}/projects/${this.options.projectId}/databases/(default)/documents:commit`, {
      method: 'POST',
      body: JSON.stringify({ writes }),
    });
  }

  // Write builders.

  set(path: string, data: Record<string, unknown>, currentDocument?: Precondition): Write {
    return { update: { name: this.name(path), fields: encodeFields(data) }, ...(currentDocument && { currentDocument }) };
  }

  /** Updates only the given fields (dotted paths allowed in `data` keys are not; pass nested objects). */
  patch(path: string, data: Record<string, unknown>, fieldPaths: string[], currentDocument?: Precondition): Write {
    return {
      update: { name: this.name(path), fields: encodeFields(data) },
      updateMask: { fieldPaths },
      ...(currentDocument && { currentDocument }),
    };
  }

  remove(path: string, currentDocument?: Precondition): Write {
    return { delete: this.name(path), ...(currentDocument && { currentDocument }) };
  }
}
