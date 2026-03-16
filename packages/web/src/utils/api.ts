// ============================================================
// API Client
// ============================================================

const BASE = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Chat
  chat: (sessionId: string, message: string) =>
    request<{ sessionId: string; response: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    }),

  // Skills
  getSkills: () => request<{ skills: any[] }>('/api/skills'),
  getActiveSkills: () => request<{ skills: any[] }>('/api/skills/active'),
  activateSkill: (id: string, config?: Record<string, unknown>) =>
    request('/api/skills/' + id + '/activate', { method: 'POST', body: JSON.stringify({ config }) }),
  deactivateSkill: (id: string) =>
    request('/api/skills/' + id + '/deactivate', { method: 'POST' }),

  // Tools
  getTools: () => request<{ tools: any[] }>('/api/tools'),

  // Workflows
  getWorkflows: () => request<{ workflows: any[] }>('/api/workflows'),
  getWorkflow: (id: string) => request<any>('/api/workflows/' + id),
  saveWorkflow: (workflow: any) =>
    request<any>(workflow.id ? `/api/workflows/${workflow.id}` : '/api/workflows', {
      method: workflow.id ? 'PUT' : 'POST',
      body: JSON.stringify(workflow),
    }),
  deleteWorkflow: (id: string) =>
    request('/api/workflows/' + id, { method: 'DELETE' }),
  executeWorkflow: (id: string, triggerData?: Record<string, unknown>) =>
    request<any>('/api/workflows/' + id + '/execute', {
      method: 'POST',
      body: JSON.stringify({ triggerData }),
    }),

  // Agent
  getConfig: () => request<any>('/api/agent/config'),
  updateConfig: (config: any) =>
    request('/api/agent/config', { method: 'PATCH', body: JSON.stringify(config) }),

  // Memory
  searchMemory: (query: string, limit?: number) =>
    request<{ results: any[] }>('/api/memory/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    }),
};
