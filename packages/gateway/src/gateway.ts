import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Agent, RagEngine, WorkflowEngine, MonitoringService, PluginManager } from '@xclaw-ai/core';
import type { OllamaAdapter } from '@xclaw-ai/core';
import type { GatewayConfig } from '@xclaw-ai/shared';
import type { IntegrationRegistry } from '@xclaw-ai/integrations';
import type { DomainPack } from '@xclaw-ai/domains';
import type { MLEngine } from '@xclaw-ai/ml';
import type { SandboxManager, TenantSandboxManager } from '@xclaw-ai/sandbox';
import type { AgentManager } from './agent-manager.js';
import { authMiddleware, createAuthRoutes } from './auth.js';
import { createChatRoutes } from './chat.js';
import { createHealthRoutes } from './health.js';
import { createKnowledgeRoutes } from './knowledge.js';
import { createModelsRoutes } from './models.js';
import { createMedicalRoutes } from './medical.js';
import { createSearchRoutes } from './search.js';
import { createIntegrationRoutes } from './integrations.js';
import { createDomainRoutes } from './domains.js';
import { createMLRoutes } from './ml.js';
import { createSettingsRoutes } from './settings.js';
import { createMCPRoutes } from './mcp.js';
import { tenantMiddleware, createTenantRoutes } from './tenant.js';
import { createRBACRoutes } from './rbac.js';
import { createOAuth2Routes } from './oauth2.js';
import { createZaloMiniAppAuthRoutes } from './auth-zalo-miniapp.js';
import { createWorkflowRoutes, createWorkflowWebhookRoutes } from './workflows.js';
import { createMonitoringRoutes } from './monitoring.js';
import { createPluginRoutes } from './plugins.js';
import { createAgentsRoutes } from './agents.js';
import { createMarketplaceRoutes } from './marketplace.js';
import { activityLoggerMiddleware } from './activity-logger.js';
import { createVoiceRoutes } from './voice.js';
import { createHandoffRoutes } from './handoff.js';
import { createAnalyticsRoutes } from './analytics.js';
import { createApiKeyRoutes } from './api-keys.js';
import { createRetentionRoutes } from './retention.js';
import { createWidgetRoutes } from './widget.js';
import { createSandboxRoutes } from './sandbox.js';

export interface GatewayContext {
  agent: Agent;
  agentManager?: AgentManager;
  rag: RagEngine;
  config: GatewayConfig;
  ollamaAdapter?: OllamaAdapter;
  integrationRegistry?: IntegrationRegistry;
  domainPacks?: DomainPack[];
  mlEngine?: MLEngine;
  workflowEngine?: WorkflowEngine;
  monitoring?: MonitoringService;
  pluginManager?: PluginManager;
  sandboxManager?: SandboxManager;
  tenantSandboxManager?: TenantSandboxManager;
}

export function createGateway(ctx: GatewayContext) {
  const app = new Hono();

  // Middleware
  app.use('*', logger());
  app.use('*', cors({
    origin: ctx.config.corsOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }));

  // Public routes
  app.route('/', createHealthRoutes());
  app.route('/auth', createAuthRoutes(ctx));
  app.route('/auth/oauth2', createOAuth2Routes(ctx));
  app.route('/auth/zalo-miniapp', createZaloMiniAppAuthRoutes(ctx));

  // Public webhook routes (no auth — secrets validated per-workflow)
  if (ctx.workflowEngine) {
    app.route('/webhooks/workflow', createWorkflowWebhookRoutes(ctx.workflowEngine));
  }

  // Protected routes
  const api = new Hono();
  api.use('*', authMiddleware(ctx.config.jwtSecret));
  api.use('*', tenantMiddleware());
  api.use('*', activityLoggerMiddleware());
  api.route('/chat', createChatRoutes(ctx));
  api.route('/knowledge', createKnowledgeRoutes(ctx));
  api.route('/models', createModelsRoutes(ctx));
  api.route('/medical', createMedicalRoutes(ctx));
  api.route('/search', createSearchRoutes(ctx));
  if (ctx.integrationRegistry) {
    api.route('/integrations', createIntegrationRoutes(ctx.integrationRegistry));
  }
  if (ctx.domainPacks) {
    api.route('/domains', createDomainRoutes(ctx.domainPacks));
  }
  if (ctx.mlEngine) {
    api.route('/ml', createMLRoutes(ctx.mlEngine));
  }
  api.route('/settings', createSettingsRoutes());
  api.route('/tenants', createTenantRoutes());
  api.route('/mcp', createMCPRoutes(ctx.domainPacks, ctx.agent));
  api.route('/rbac', createRBACRoutes());
  if (ctx.workflowEngine) {
    api.route('/workflows', createWorkflowRoutes(ctx.workflowEngine));
  }
  if (ctx.monitoring) {
    api.route('/monitoring', createMonitoringRoutes(ctx.monitoring));
  }
  if (ctx.pluginManager) {
    api.route('/plugins', createPluginRoutes(ctx.pluginManager));
  }
  api.route('/agents', createAgentsRoutes(ctx));
  if (ctx.domainPacks) {
    api.route('/marketplace', createMarketplaceRoutes(ctx.domainPacks));
  }
  api.route('/voice', createVoiceRoutes(ctx));
  api.route('/handoff', createHandoffRoutes());
  api.route('/analytics', createAnalyticsRoutes());
  api.route('/api-keys', createApiKeyRoutes());
  api.route('/retention', createRetentionRoutes());
  api.route('/widget', createWidgetRoutes());
  if (ctx.sandboxManager && ctx.tenantSandboxManager) {
    api.route('/sandbox', createSandboxRoutes(ctx.sandboxManager, ctx.tenantSandboxManager));
  }
  app.route('/api', api);

  return app;
}

export { createGateway as default };
