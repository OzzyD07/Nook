import { env } from '@/lib/env';
import { idToken } from '@/services/auth';

/** An OAuth grant: one connected AI host. */
export interface AiConnection {
  id: string;
  clientId: string;
  clientName: string;
  scopes: string[];
  createdAt: number;
}

export interface WorkerHealth {
  ok: boolean;
  version: string;
  latencyMs: number;
}

export const mcpEndpoint = () => (env.mcpBaseUrl ? `${env.mcpBaseUrl}/mcp` : '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.mcpBaseUrl) throw new Error('EXPO_PUBLIC_MCP_BASE_URL is not set');
  const response = await fetch(`${env.mcpBaseUrl}${path}`, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${await idToken()}` },
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

export async function listConnections(): Promise<AiConnection[]> {
  const { connections } = await request<{ connections: AiConnection[] }>('/api/connections');
  return connections;
}

export async function revokeConnection(id: string): Promise<void> {
  await request(`/api/connections/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function revokeAllConnections(): Promise<void> {
  await request('/api/connections', { method: 'DELETE' });
}

export async function checkHealth(): Promise<WorkerHealth> {
  if (!env.mcpBaseUrl) throw new Error('EXPO_PUBLIC_MCP_BASE_URL is not set');
  const started = Date.now();
  const response = await fetch(`${env.mcpBaseUrl}/health`);
  const body = (await response.json()) as { ok: boolean; version: string };
  return { ...body, ok: response.ok && body.ok, latencyMs: Date.now() - started };
}
