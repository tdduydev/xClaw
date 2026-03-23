import { serve } from '@hono/node-server';
import dotenv from 'dotenv';
import {
  Agent,
  LLMRouter,
  OpenAIAdapter,
  AnthropicAdapter,
  OllamaAdapter,
  RagEngine,
  OpenAIEmbeddingProvider,
  LocalEmbeddingProvider,
  WorkflowEngine,
  MonitoringService,
  ImageGenService,
} from '@xclaw-ai/core';
import { createGateway } from '@xclaw-ai/gateway';
import { AgentManager } from '@xclaw-ai/gateway';
import { startWorkflowScheduler } from '@xclaw-ai/gateway';
import { IntegrationRegistry, allIntegrations } from '@xclaw-ai/integrations';
import { allDomainPacks } from '@xclaw-ai/domains';
import { MLEngine } from '@xclaw-ai/ml';
import { PluginManager } from '@xclaw-ai/core';
import { SandboxManager, TenantSandboxManager, PolicyWatcher, OCSFEventLogger } from '@xclaw-ai/sandbox';
import type { AgentConfig, GatewayConfig } from '@xclaw-ai/shared';
import { TelegramChannel } from '@xclaw-ai/channel-telegram';
import { SlackChannel } from '@xclaw-ai/channel-slack';
import { WhatsAppChannel } from '@xclaw-ai/channel-whatsapp';
import { ZaloChannel } from '@xclaw-ai/channel-zalo';
import { DiscordChannel } from '@xclaw-ai/channel-discord';
import { MSTeamsChannel } from '@xclaw-ai/channel-msteams';
import { textToFhirSkill } from '@xclaw-ai/skills';
import { loadKnowledgePacks } from './knowledge-loader.js';
import { runMigrations, seedInitialData, connectMongo, getMongo, mongoMonitoringStore, sessionsCollection, messagesCollection, agentConfigsCollection, channelConnectionsCollection, llmLogsCollection, estimateCost, sandboxAuditLogsCollection } from '@xclaw-ai/db';
import type { MongoChannelConnection } from '@xclaw-ai/db';

dotenv.config();

// Load env
const {
  PORT = '5001',
  HOST = '0.0.0.0',
  CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001,http://localhost:3002',
  JWT_SECRET = 'xclaw-dev-secret-change-me',
  LLM_PROVIDER = 'ollama',
  LLM_MODEL: LLM_MODEL_ENV,
  OPENAI_API_KEY = '',
  ANTHROPIC_API_KEY = '',
  OLLAMA_BASE_URL = 'http://localhost:11434/v1',
  AGENT_NAME = 'xClaw Assistant',
  AGENT_SYSTEM_PROMPT = '',
  IMAGE_GEN_PROVIDER = 'placeholder',
  GEMINI_API_KEY = '',
  REPLICATE_API_KEY = '',
  TOGETHER_API_KEY = '',
  COMFYUI_URL = 'http://localhost:8188',
  TELEGRAM_BOT_TOKEN = '',
  TELEGRAM_ALLOWED_CHAT_IDS = '',
  SLACK_BOT_TOKEN = '',
  WHATSAPP_ACCESS_TOKEN = '',
  WHATSAPP_PHONE_NUMBER_ID = '',
  ZALO_OA_ACCESS_TOKEN = '',
  DISCORD_BOT_TOKEN = '',
  MSTEAMS_APP_ID = '',
  MSTEAMS_APP_PASSWORD = '',
  OPENSHELL_ENABLED = '',
  OPENSHELL_GATEWAY_URL = '',
} = process.env;

// Auto-detect default model based on provider
const LLM_MODEL = LLM_MODEL_ENV || (LLM_PROVIDER === 'ollama' ? 'qwen2.5:14b' : 'gpt-4o-mini');

// Vietnamese system prompt for doctor support
const DEFAULT_SYSTEM_PROMPT = `You are xClaw, an open-source AI agent platform that adapts to any industry. You are highly capable, helpful, and concise.

You can operate with different domain packs (healthcare, developer, finance, marketing, education, research, devops, legal, HR, sales, e-commerce) and integrate with external services (Gmail, GitHub, Slack, Notion, etc.).

When a user activates a domain pack, adopt that domain's persona and skills. By default, you are a versatile general-purpose assistant.

Respond in the user's language. Be accurate and honest about your limitations.`;

const SYSTEM_PROMPT = AGENT_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;

async function main() {
  console.log('🐾 xClaw v2.1.0 — Open Platform Starting...');

  // Run PostgreSQL migrations (idempotent)
  try {
    await runMigrations();
    console.log('   PostgreSQL: migrations applied');
  } catch (err) {
    console.warn('⚠️  Migration skipped:', (err as Error).message);
  }

  // Connect MongoDB (sessions, messages, memory)
  try {
    await connectMongo();
    console.log('   MongoDB:    connected (sessions, messages, memory)');
  } catch (err) {
    console.warn('⚠️  MongoDB skipped:', (err as Error).message);
  }

  // Seed default data (idempotent — skips if already seeded)
  try {
    await seedInitialData();
  } catch (err) {
    console.warn('⚠️  Seed skipped (DB may not be ready):', (err as Error).message);
  }

  // Seed default agent config in MongoDB (idempotent)
  try {
    const configs = agentConfigsCollection();
    const existing = await configs.findOne({ tenantId: 'default', isDefault: true });
    if (!existing) {
      const now = new Date();
      await configs.insertOne({
        _id: 'default-agent',
        tenantId: 'default',
        name: AGENT_NAME,
        persona: AGENT_NAME,
        systemPrompt: SYSTEM_PROMPT,
        llmConfig: {
          provider: LLM_PROVIDER,
          model: LLM_MODEL,
          apiKey: LLM_PROVIDER === 'openai' ? OPENAI_API_KEY : ANTHROPIC_API_KEY,
          baseUrl: LLM_PROVIDER === 'ollama' ? OLLAMA_BASE_URL : undefined,
        },
        enabledSkills: [],
        memoryConfig: { enabled: true, maxEntries: 1000 },
        securityConfig: { requireApprovalForShell: true, requireApprovalForNetwork: false },
        maxToolIterations: 10,
        toolTimeout: 30000,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      });
      console.log('   AgentConfig: default agent config seeded');
    }
  } catch (err) {
    console.warn('⚠️  Agent config seed skipped:', (err as Error).message);
  }

  // Agent config
  const agentConfig: AgentConfig = {
    id: 'default-agent',
    name: AGENT_NAME,
    persona: AGENT_NAME,
    systemPrompt: SYSTEM_PROMPT,
    llm: {
      provider: LLM_PROVIDER as AgentConfig['llm']['provider'],
      model: LLM_MODEL,
      apiKey: LLM_PROVIDER === 'openai' ? OPENAI_API_KEY : ANTHROPIC_API_KEY,
      baseUrl: LLM_PROVIDER === 'ollama' ? OLLAMA_BASE_URL : undefined,
    },
    enabledSkills: [],
    memory: { enabled: true, maxEntries: 1000 },
    security: {
      requireApprovalForShell: true,
      requireApprovalForNetwork: false,
    },
    maxToolIterations: 10,
    toolTimeout: 30000,
  };

  // Create agent
  const agent = new Agent(agentConfig);

  // Register LLM adapters
  let ollamaAdapter: OllamaAdapter | undefined;

  if (LLM_PROVIDER === 'ollama') {
    // Use native Ollama adapter for multi-model management
    const ollamaBaseUrl = OLLAMA_BASE_URL.replace(/\/v1\/?$/, '');
    ollamaAdapter = new OllamaAdapter({
      baseUrl: ollamaBaseUrl,
      model: LLM_MODEL,
    });
    agent.llm.registerAdapter(ollamaAdapter);
    console.log(`   Ollama:   ${ollamaBaseUrl} (model: ${LLM_MODEL})`);
  }

  if (OPENAI_API_KEY && LLM_PROVIDER !== 'ollama') {
    agent.llm.registerAdapter(
      new OpenAIAdapter({
        apiKey: OPENAI_API_KEY,
        model: LLM_MODEL,
      }),
    );
  }
  if (ANTHROPIC_API_KEY) {
    agent.llm.registerAdapter(
      new AnthropicAdapter({
        apiKey: ANTHROPIC_API_KEY,
        model: LLM_PROVIDER === 'anthropic' ? LLM_MODEL : 'claude-sonnet-4-20250514',
      }),
    );
  }

  // AgentManager — manages multiple agent configs from MongoDB
  const agentManager = new AgentManager(agent);

  // Register adapters for dynamic agents
  if (LLM_PROVIDER === 'ollama' && ollamaAdapter) {
    agentManager.registerAdapter(ollamaAdapter);
  }
  if (OPENAI_API_KEY && LLM_PROVIDER !== 'ollama') {
    agentManager.registerAdapter(
      new OpenAIAdapter({ apiKey: OPENAI_API_KEY, model: LLM_MODEL }),
    );
  }
  if (ANTHROPIC_API_KEY) {
    agentManager.registerAdapter(
      new AnthropicAdapter({
        apiKey: ANTHROPIC_API_KEY,
        model: LLM_PROVIDER === 'anthropic' ? LLM_MODEL : 'claude-sonnet-4-20250514',
      }),
    );
  }

  // RAG Engine
  const embeddingProvider = OPENAI_API_KEY
    ? new OpenAIEmbeddingProvider({ apiKey: OPENAI_API_KEY })
    : new LocalEmbeddingProvider();
  const rag = new RagEngine(embeddingProvider, undefined, {
    chunkingOptions: { chunkSize: 512, chunkOverlap: 50 },
    topK: 5,
    scoreThreshold: 0.1,
  });

  // Auto-load knowledge packs into RAG
  const knowledgeCount = await loadKnowledgePacks(rag);
  if (knowledgeCount > 0) {
    console.log(`   Knowledge: ${knowledgeCount} documents loaded from knowledge packs`);
  }

  // Integration Registry
  const integrationRegistry = new IntegrationRegistry();
  integrationRegistry.registerAll(allIntegrations);
  console.log(`   Integrations: ${allIntegrations.length} registered`);
  console.log(`   Domains: ${allDomainPacks.length} domain packs loaded`);

  // ML Engine
  const mlEngine = new MLEngine();
  console.log(`   ML Engine: ${mlEngine.listAlgorithms().length} algorithms available`);

  // Register built-in text-to-fhir skill (HIS query tools for LLM)
  for (const tool of textToFhirSkill.tools) {
    agent.tools.register(tool.definition, tool.handler);
  }
  console.log(`   Skills:    text-to-fhir (${textToFhirSkill.tools.length} tools registered)`);

  // Workflow Engine
  const workflowEngine = new WorkflowEngine(agent.tools, agent.llm, agent.events);
  console.log('   Workflow:  engine ready (16 node types)');

  // Monitoring Service
  const monitoring = new MonitoringService(agent.events);
  monitoring.setStore(mongoMonitoringStore as any);
  console.log('   Monitoring: audit logs + system logs + metrics active');

  // Plugin Manager
  const imageGen = new ImageGenService({
    provider: IMAGE_GEN_PROVIDER as 'gemini' | 'replicate' | 'together' | 'comfyui' | 'placeholder',
    apiKey: IMAGE_GEN_PROVIDER === 'gemini' ? GEMINI_API_KEY
      : IMAGE_GEN_PROVIDER === 'replicate' ? REPLICATE_API_KEY
      : TOGETHER_API_KEY,
    baseUrl: IMAGE_GEN_PROVIDER === 'comfyui' ? COMFYUI_URL : undefined,
  });
  console.log(`   ImageGen:  ${IMAGE_GEN_PROVIDER} provider`);

  const pluginManager = new PluginManager({
    getMongoDb: () => {
      try { return getMongo(); } catch { return null; }
    },
    llm: agent.llm,
    tools: agent.tools,
    events: agent.events,
    rag,
    imageGen,
  });

  // Plugins are loaded from external submodule (xclaw-plugins)
  console.log(`   Plugins:   ${pluginManager.listActive().length} loaded`);

  // ─── Shared message handler factory for all channel plugins ─────────────
  const makeChannelHandler = (
    platform: string,
    send: (channelId: string, content: string, replyTo?: string) => Promise<void>,
  ) => async (incoming: { channelId: string; userId: string; content: string; metadata?: Record<string, unknown> }) => {
    const prefix = platform.substring(0, 3);
    const sessionId = `${prefix}-${incoming.channelId}-${incoming.userId}`;
    try {
      const channelConn = await channelConnectionsCollection().findOne({ channelType: platform as MongoChannelConnection['channelType'], status: 'active' });
      const channelAgent = channelConn?.agentConfigId
        ? await agentManager.getAgent(channelConn.agentConfigId, 'default')
        : await agentManager.getDefaultForTenant('default');

      const sessions = sessionsCollection();
      const now = new Date();
      const existingSession = await sessions.findOne({ _id: sessionId });
      if (!existingSession) {
        await sessions.insertOne({
          _id: sessionId,
          tenantId: 'default',
          userId: `${prefix}-${incoming.userId}`,
          platform,
          title: incoming.content.slice(0, 60) + (incoming.content.length > 60 ? '...' : ''),
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await sessions.updateOne({ _id: sessionId }, { $set: { updatedAt: now } });
      }

      const messages = messagesCollection();
      await messages.insertOne({
        _id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId,
        role: 'user',
        content: incoming.content,
        metadata: incoming.metadata,
        createdAt: now,
      });

      let ragContext = '';
      try {
        const retrieval = await rag.retrieve(incoming.content);
        if (retrieval.context) ragContext = retrieval.context;
      } catch { /* RAG failure is non-fatal */ }

      let channelMessage = incoming.content;
      if (channelConn?.domainId && channelConn.domainId !== 'general') {
        const domain = allDomainPacks.find((d) => d.id === channelConn.domainId);
        if (domain?.agentPersona) {
          channelMessage = `[System instruction — Domain specialist mode]\n${domain.agentPersona}\n\n[User message]\n${incoming.content}`;
        }
      }

      const llmStart = Date.now();
      const response = await channelAgent.chat(sessionId, channelMessage, ragContext);
      const llmDuration = Date.now() - llmStart;

      llmLogsCollection().insertOne({
        tenantId: 'default',
        userId: `${prefix}-${incoming.userId}`,
        sessionId,
        provider: channelAgent.config.llm.provider,
        model: channelAgent.config.llm.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        duration: llmDuration,
        costUsd: estimateCost(channelAgent.config.llm.provider, channelAgent.config.llm.model, 0, 0),
        platform,
        success: true,
        toolCalls: 0,
        streaming: false,
        createdAt: new Date(),
      } as any).catch(() => {});

      await messages.insertOne({
        _id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId,
        role: 'assistant',
        content: response,
        createdAt: new Date(),
      });

      await send(incoming.channelId, response, incoming.metadata?.messageId ? String(incoming.metadata.messageId) : undefined);
    } catch (err) {
      console.error(`${platform} agent error:`, err instanceof Error ? err.message : err);
      try { await send(incoming.channelId, '❌ Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu.'); } catch { /* ignore */ }
    }
  };

  // ─── Telegram Channel ────────────────────────────────────
  let telegramChannel: TelegramChannel | undefined;
  if (TELEGRAM_BOT_TOKEN) {
    try {
      telegramChannel = new TelegramChannel();
      await telegramChannel.initialize({ botToken: TELEGRAM_BOT_TOKEN });
      telegramChannel.onMessage(makeChannelHandler('telegram', async (channelId, content, replyTo) => {
        await telegramChannel!.send({ platform: 'telegram', channelId, content, replyTo });
      }));
      await telegramChannel.start();
    } catch (err) {
      console.warn('⚠️  Telegram channel skipped:', (err as Error).message);
    }
  }

  // ─── Slack Channel ────────────────────────────────────────
  if (SLACK_BOT_TOKEN) {
    try {
      const slackChannel = new SlackChannel();
      await slackChannel.initialize({ botToken: SLACK_BOT_TOKEN });
      slackChannel.onMessage(makeChannelHandler('slack', async (channelId, content) => {
        await slackChannel.send({ platform: 'slack', channelId, content });
      }));
      await slackChannel.start();
    } catch (err) {
      console.warn('⚠️  Slack channel skipped:', (err as Error).message);
    }
  }

  // ─── WhatsApp Channel ─────────────────────────────────────
  if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const waChannel = new WhatsAppChannel();
      await waChannel.initialize({
        accessToken: WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? 'xclaw-wa-verify',
      });
      waChannel.onMessage(makeChannelHandler('whatsapp', async (channelId, content) => {
        await waChannel.send({ platform: 'whatsapp', channelId, content });
      }));
      await waChannel.start();
    } catch (err) {
      console.warn('⚠️  WhatsApp channel skipped:', (err as Error).message);
    }
  }

  // ─── Zalo Channel ─────────────────────────────────────────
  if (ZALO_OA_ACCESS_TOKEN) {
    try {
      const zaloChannel = new ZaloChannel();
      await zaloChannel.initialize({
        accessToken: ZALO_OA_ACCESS_TOKEN,
        oaId: process.env.ZALO_OA_ID ?? '',
      });
      zaloChannel.onMessage(makeChannelHandler('zalo', async (channelId, content) => {
        await zaloChannel.send({ platform: 'zalo', channelId, content });
      }));
      await zaloChannel.start();
    } catch (err) {
      console.warn('⚠️  Zalo channel skipped:', (err as Error).message);
    }
  }

  // ─── Discord Channel ──────────────────────────────────────
  if (DISCORD_BOT_TOKEN) {
    try {
      const discordChannel = new DiscordChannel();
      await discordChannel.initialize({ botToken: DISCORD_BOT_TOKEN });
      discordChannel.onMessage(makeChannelHandler('discord', async (channelId, content) => {
        await discordChannel.send({ platform: 'discord', channelId, content });
      }));
      await discordChannel.start();
    } catch (err) {
      console.warn('⚠️  Discord channel skipped:', (err as Error).message);
    }
  }

  // ─── Microsoft Teams Channel ──────────────────────────────
  if (MSTEAMS_APP_ID && MSTEAMS_APP_PASSWORD) {
    try {
      const teamsChannel = new MSTeamsChannel();
      await teamsChannel.initialize({ appId: MSTEAMS_APP_ID, appPassword: MSTEAMS_APP_PASSWORD });
      teamsChannel.onMessage(makeChannelHandler('msteams', async (channelId, content) => {
        await teamsChannel.send({ platform: 'msteams', channelId, content });
      }));
      await teamsChannel.start();
    } catch (err) {
      console.warn('⚠️  MS Teams channel skipped:', (err as Error).message);
    }
  }

  // Gateway config
  const gatewayConfig: GatewayConfig = {
    port: parseInt(PORT, 10),
    host: HOST,
    corsOrigins: CORS_ORIGINS.split(',').map((s) => s.trim()),
    jwtSecret: JWT_SECRET,
  };

  // ─── OpenShell Sandbox (optional) ─────────────────────────
  let sandboxManager: SandboxManager | undefined;
  let tenantSandboxManager: TenantSandboxManager | undefined;

  if (OPENSHELL_ENABLED === 'true') {
    try {
      const ocsfLogger = new OCSFEventLogger();
      ocsfLogger.addDestination(OCSFEventLogger.consoleDestination());

      sandboxManager = new SandboxManager({
        gatewayUrl: OPENSHELL_GATEWAY_URL || undefined,
        mode: OPENSHELL_GATEWAY_URL ? 'remote' : 'local',
        onAudit: (entry) => {
          sandboxAuditLogsCollection().insertOne({
            sandboxId: entry.sandboxId,
            tenantId: entry.tenantId,
            action: entry.action,
            details: entry.details,
            createdAt: new Date(),
          }).catch(() => {});
          ocsfLogger.logAudit(entry);
        },
      });
      tenantSandboxManager = new TenantSandboxManager(sandboxManager);

      // Hot-reload policies from YAML files
      const policyWatcher = new PolicyWatcher({
        policyDir: new URL('../../../deploy/policies', import.meta.url).pathname,
        onPolicyUpdate: (name, policy) => {
          console.log(`   Policy:    hot-reloaded '${name}'`);
        },
        onError: (err) => {
          console.warn('⚠️  Policy watcher error:', err.message);
        },
      });
      policyWatcher.start();

      await sandboxManager.bootstrapGateway();
      console.log('   Sandbox:   OpenShell gateway ready');
    } catch (err) {
      console.warn('⚠️  OpenShell sandbox skipped:', (err as Error).message);
      sandboxManager = undefined;
      tenantSandboxManager = undefined;
    }
  }

  // Create Hono app
  const app = createGateway({
    agent,
    agentManager,
    rag,
    config: gatewayConfig,
    ollamaAdapter,
    integrationRegistry,
    domainPacks: allDomainPacks,
    mlEngine,
    workflowEngine,
    monitoring,
    pluginManager,
    sandboxManager,
    tenantSandboxManager,
  });

  // Start server
  serve(
    { fetch: app.fetch, hostname: gatewayConfig.host, port: gatewayConfig.port },
    (info) => {
      console.log(`🚀 xClaw server running at http://${info.address}:${info.port}`);
      console.log(`   Provider: ${LLM_PROVIDER} / Model: ${LLM_MODEL}`);
      console.log(`   Health:   http://${info.address}:${info.port}/health`);
      console.log(`   RAG:      ${OPENAI_API_KEY ? 'OpenAI embeddings' : 'Local embeddings (dev mode)'}`);
    },
  );

  // Start workflow cron scheduler
  startWorkflowScheduler(workflowEngine);
}

main().catch((err) => {
  console.error('❌ Failed to start xClaw:', err);
  process.exit(1);
});
