import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { EXAMPLES } from '@nook/openui';
import { describe, expect, it } from 'vitest';

import { Firestore } from '../src/firestore/client';
import { userPaths } from '../src/firestore/paths';
import { createServer } from '../src/mcp/server';
import { FakeFirestore } from './fake-firestore';

async function connect(scopes: string[], fake = new FakeFirestore()) {
  const server = createServer({
    uid: 'user1',
    scopes,
    clientId: 'client-1',
    clientName: 'Test AI',
    requestId: 'req-1',
    db: new Firestore({ projectId: 'demo', getToken: async () => 'token', fetch: fake.fetch }),
    paths: userPaths('user1'),
    now: () => new Date('2026-09-22T09:00:00Z'),
    waitUntil: () => undefined,
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientTransport);
  return client;
}

const text = (result: { content?: unknown }) =>
  JSON.parse(((result.content as { type: string; text: string }[])[0]!).text) as Record<string, unknown>;

describe('MCP server', () => {
  it('only exposes delete_card when the grant allows deleting', async () => {
    const withoutDelete = await connect(['cards:read', 'cards:write']);
    const names = (await withoutDelete.listTools()).tools.map((tool) => tool.name);
    expect(names).toContain('update_card_content');
    expect(names).not.toContain('delete_card');

    const withDelete = await connect(['cards:read', 'cards:write', 'cards:delete']);
    expect((await withDelete.listTools()).tools.map((tool) => tool.name)).toContain('delete_card');
  });

  it('read-only grants cannot write', async () => {
    const client = await connect(['cards:read']);
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect(names.sort()).toEqual(['get_card', 'get_dashboard', 'get_ui_capabilities', 'validate_ui']);
  });

  it('creates a card and lists it on the dashboard', async () => {
    const client = await connect(['cards:read', 'cards:write']);
    const created = await client.callTool({
      name: 'create_card',
      arguments: {
        title: 'BTC',
        layout: { columnSpan: 1, rowSpan: 1 },
        previewUi: EXAMPLES.metricCard,
        detailUi: EXAMPLES.metricDetail,
        idempotencyKey: 'btc-create-1',
      },
    });
    expect(created.isError).toBeFalsy();
    const dashboard = text(await client.callTool({ name: 'get_dashboard', arguments: {} }));
    expect(dashboard.cards).toMatchObject([{ title: 'BTC', version: 1, status: 'active' }]);
  });

  it('reports validation failures as tool errors the AI can act on', async () => {
    const client = await connect(['cards:read', 'cards:write']);
    const result = await client.callTool({
      name: 'create_card',
      arguments: {
        title: 'Bad',
        layout: { columnSpan: 1, rowSpan: 1 },
        previewUi: 'root = CardContainer([Link("x", "http://insecure.example.com")])',
        detailUi: EXAMPLES.metricDetail,
        idempotencyKey: 'bad-create-1',
      },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatchObject({ error: { code: 'UI_INVALID' } });
  });

  it('serves the UI reference', async () => {
    const client = await connect(['cards:read']);
    const capabilities = text(await client.callTool({ name: 'get_ui_capabilities', arguments: {} }));
    expect(JSON.stringify(capabilities)).toContain('CardContainer(');
  });
});
