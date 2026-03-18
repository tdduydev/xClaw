import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Agent, RagEngine } from '@xclaw/core';
import type { OllamaAdapter } from '@xclaw/core';
import type { GatewayConfig } from '@xclaw/shared';
import type { IntegrationRegistry } from '@xclaw/integrations';
import type { DomainPack } from '@xclaw/domains';
import type { MLEngine } from '@xclaw/ml';
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

export interface GatewayContext {
  agent: Agent;
  rag: RagEngine;
  config: GatewayConfig;
  ollamaAdapter?: OllamaAdapter;
  integrationRegistry?: IntegrationRegistry;
  domainPacks?: DomainPack[];
  mlEngine?: MLEngine;
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

  // Protected routes
  const api = new Hono();
  api.use('*', authMiddleware(ctx.config.jwtSecret));
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
  api.route('/mcp', createMCPRoutes(ctx.domainPacks, ctx.agent));
  app.route('/api', api);

  return app;
}

export { createGateway as default };
