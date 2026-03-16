// ============================================================
// AutoX Server - REST API + WebSocket for real-time updates
// ============================================================

import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Agent } from '@autox/core';
import { programmingSkill, healthcareSkill } from '@autox/skills';
import type { AgentConfig, Workflow } from '@autox/shared';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT ?? '3001');
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Init Agent ─────────────────────────────────────────────

const agentConfig: AgentConfig = {
  id: 'autox-main',
  name: process.env.AGENT_NAME ?? 'AutoX',
  persona: process.env.AGENT_PERSONA ?? 'A helpful AI assistant specialized in programming and healthcare.',
  systemPrompt: `You are AutoX, an intelligent AI agent. You have access to programming tools (shell, files, git, testing) and healthcare tools (symptom analysis, medication management, health metrics). Use tools when appropriate to help the user. Always be helpful, accurate, and safety-conscious.`,
  llm: {
    provider: (process.env.LLM_PROVIDER as 'openai' | 'anthropic' | 'ollama') ?? 'openai',
    model: process.env.LLM_MODEL ?? 'gpt-4o',
    apiKey: process.env.LLM_API_KEY ?? '',
    temperature: 0.7,
    maxTokens: 4096,
  },
  enabledSkills: ['programming', 'healthcare'],
  enabledWorkflows: [],
  memory: { enabled: true, maxEntries: 1000 },
  security: {
    requireApprovalForShell: true,
    requireApprovalForNetwork: false,
    sandboxed: false,
  },
  messaging: {
    platforms: ['web', 'api'],
    maxConcurrentSessions: 50,
  },
};

const agent = new Agent(agentConfig);

// Register skills
async function initSkills() {
  await agent.skills.register(programmingSkill);
  await agent.skills.register(healthcareSkill);
  await agent.skills.activate('programming');
  await agent.skills.activate('healthcare');
  console.log('Skills activated:', agent.skills.listActive().map(s => s.name).join(', '));
}

// ─── Workflow Storage (in-memory, replace with DB) ──────────

const workflowStore: Map<string, Workflow> = new Map();

// ─── REST API Routes ────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', agent: agent.getConfig().name, uptime: process.uptime() });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const sid = sessionId ?? crypto.randomUUID();
  try {
    const response = await agent.chat(sid, message);
    res.json({ sessionId: sid, response });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// ─── Skill Routes ───────────────────────────────────────────

app.get('/api/skills', (_req, res) => {
  res.json({ skills: agent.skills.listAll() });
});

app.get('/api/skills/active', (_req, res) => {
  res.json({ skills: agent.skills.listActive() });
});

app.post('/api/skills/:id/activate', async (req, res) => {
  try {
    await agent.skills.activate(req.params.id, req.body.config);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

app.post('/api/skills/:id/deactivate', async (req, res) => {
  try {
    await agent.skills.deactivate(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── Tool Routes ────────────────────────────────────────────

app.get('/api/tools', (_req, res) => {
  res.json({ tools: agent.tools.getAllDefinitions() });
});

app.get('/api/tools/:category', (req, res) => {
  res.json({ tools: agent.tools.getByCategory(req.params.category) });
});

// ─── Workflow Routes ────────────────────────────────────────

app.get('/api/workflows', (_req, res) => {
  res.json({ workflows: [...workflowStore.values()] });
});

app.get('/api/workflows/:id', (req, res) => {
  const wf = workflowStore.get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
});

app.post('/api/workflows', (req, res) => {
  const workflow: Workflow = {
    ...req.body,
    id: req.body.id ?? crypto.randomUUID(),
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  workflowStore.set(workflow.id, workflow);
  res.json(workflow);
});

app.put('/api/workflows/:id', (req, res) => {
  const existing = workflowStore.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Workflow not found' });

  const updated: Workflow = {
    ...existing,
    ...req.body,
    id: existing.id,
    version: existing.version + 1,
    updatedAt: new Date().toISOString(),
  };
  workflowStore.set(updated.id, updated);
  res.json(updated);
});

app.delete('/api/workflows/:id', (req, res) => {
  workflowStore.delete(req.params.id);
  res.json({ success: true });
});

app.post('/api/workflows/:id/execute', async (req, res) => {
  const workflow = workflowStore.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  try {
    const result = await agent.runWorkflow(workflow, req.body.triggerData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Execution failed' });
  }
});

// ─── Agent Config ───────────────────────────────────────────

app.get('/api/agent/config', (_req, res) => {
  const config = agent.getConfig();
  // Mask API key
  const safe = { ...config, llm: { ...config.llm, apiKey: config.llm.apiKey ? '***' : '' } };
  res.json(safe);
});

app.patch('/api/agent/config', (req, res) => {
  agent.updateConfig(req.body);
  res.json({ success: true });
});

// ─── Memory Routes ──────────────────────────────────────────

app.post('/api/memory/search', async (req, res) => {
  const { query, limit } = req.body;
  const results = await agent.memory.recall(query, limit ?? 10);
  res.json({ results });
});

app.post('/api/memory/save', async (req, res) => {
  const { content, type, tags } = req.body;
  const entry = await agent.memory.remember(content, type ?? 'fact', tags ?? []);
  res.json(entry);
});

// ─── WebSocket for real-time events ─────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // Forward agent events to WS clients
  const unsub = agent.eventBus.on('*', async (event) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  });

  // Handle incoming WS messages (chat)
  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'chat') {
        const sessionId = msg.sessionId ?? 'ws-default';
        const response = await agent.chat(sessionId, msg.content);
        ws.send(JSON.stringify({ type: 'chat:response', sessionId, content: response }));
      }

      if (msg.type === 'workflow:execute') {
        const workflow = workflowStore.get(msg.workflowId);
        if (workflow) {
          const result = await agent.runWorkflow(workflow, msg.triggerData);
          ws.send(JSON.stringify({ type: 'workflow:result', result }));
        }
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' }));
    }
  });

  ws.on('close', () => {
    unsub();
    console.log('WebSocket client disconnected');
  });
});

// ─── Start ──────────────────────────────────────────────────

async function start() {
  await initSkills();
  server.listen(PORT, () => {
    console.log(`\n🤖 AutoX Agent Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
    console.log(`📋 API docs: http://localhost:${PORT}/api/health\n`);
  });
}

start().catch(console.error);
