// ============================================================
// xClaw Shared Types — Foundation for the entire platform
// ============================================================

// ─── LLM Provider Types ─────────────────────────────────────

export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'google' | 'groq' | 'mistral' | 'deepseek' | 'xai' | 'openrouter' | 'perplexity' | 'custom';

export interface LLMCapabilities {
  vision?: boolean;
  audio?: boolean;
  streaming?: boolean;
  functionCalling?: boolean;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  capabilities?: LLMCapabilities;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[]; // base64 image data or URLs for vision/OCR models
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  model: string;
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ─── Streaming Types ────────────────────────────────────────

export type StreamEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call-start'; toolCallId: string; toolName: string }
  | { type: 'tool-call-args'; toolCallId: string; argsJson: string }
  | { type: 'tool-call-end'; toolCallId: string }
  | { type: 'tool-result'; toolCallId: string; result: ToolResult }
  | { type: 'meta'; key: string; data: unknown }
  | { type: 'finish'; usage: TokenUsage; finishReason: string }
  | { type: 'error'; error: string };

// ─── Tool System Types ──────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  parameters: ToolParameter[];
  returns?: ToolParameter;
  requiresApproval?: boolean;
  timeout?: number;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  success: boolean;
  result: unknown;
  error?: string;
  duration: number;
}

// ─── Skill / Plugin Types ───────────────────────────────────

export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: SkillCategory;
  tags: string[];
  tools: ToolDefinition[];
  triggers?: TriggerDefinition[];
  config?: SkillConfigField[];
  dependencies?: string[];
}

export type SkillCategory =
  | 'programming'
  | 'healthcare'
  | 'productivity'
  | 'marketing'
  | 'finance'
  | 'ecommerce'
  | 'communication'
  | 'analytics'
  | 'devops'
  | 'content'
  | 'research'
  | 'sales'
  | 'project-management'
  | 'learning'
  | 'design'
  | 'custom';

export interface SkillConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'secret';
  description: string;
  required?: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
}

// ─── Trigger System ─────────────────────────────────────────

export interface TriggerDefinition {
  id: string;
  type: TriggerType;
  name: string;
  description: string;
  config: Record<string, unknown>;
}

export type TriggerType = 'cron' | 'webhook' | 'event' | 'message' | 'file' | 'manual';

// ─── Interactive Block Types ────────────────────────────────

export interface QuickReplyButton {
  label: string;
  value: string; // The message to send when clicked
  icon?: string; // Optional emoji/icon
}

export interface InteractiveBlock {
  type: 'quick-replies' | 'list-select' | 'confirm';
  title?: string;
  buttons: QuickReplyButton[];
}

// ─── Workflow Types ─────────────────────────────────────────

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  trigger: TriggerDefinition;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
  inputs: NodePort[];
  outputs: NodePort[];
}

export type WorkflowNodeType =
  | 'trigger'
  | 'llm-call'
  | 'tool-call'
  | 'condition'
  | 'loop'
  | 'transform'
  | 'http-request'
  | 'code'
  | 'memory-read'
  | 'memory-write'
  | 'notification'
  | 'wait'
  | 'switch'
  | 'merge'
  | 'sub-workflow'
  | 'output';

export interface WorkflowNodeData {
  label: string;
  description?: string;
  config: Record<string, unknown>;
  color?: string;
  icon?: string;
}

export interface NodePort {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  condition?: string;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
  description?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  nodeResults: Map<string, NodeExecutionResult>;
  variables: Record<string, unknown>;
  error?: string;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string;
  duration: number;
}

// ─── Memory Types ───────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  type: 'fact' | 'preference' | 'conversation' | 'context' | 'skill-data';
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  source: string;
  tags: string[];
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: string;
  metadata?: Record<string, unknown>;
  /** RL feedback: user thumbs-up/down or auto tool-success signal */
  feedback?: {
    skillId: string;
    toolName?: string;
    reward: number;
    success: boolean;
    reason?: string;
  };
}

// ─── Chat / Messaging Types ────────────────────────────────

export type ChatPlatform = 'web' | 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'zalo' | 'msteams' | 'api';

export interface IncomingMessage {
  platform: ChatPlatform;
  channelId: string;
  userId: string;
  content: string;
  attachments?: Attachment[];
  replyTo?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessage {
  platform: ChatPlatform;
  channelId: string;
  content: string;
  attachments?: Attachment[];
  replyTo?: string;
}

export interface Attachment {
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

// ─── Agent Config ───────────────────────────────────────────

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  persona: string;
  systemPrompt: string;
  llm: LLMConfig;
  enabledSkills: string[];
  memory: {
    enabled: boolean;
    maxEntries: number;
  };
  security: {
    requireApprovalForShell: boolean;
    requireApprovalForNetwork: boolean;
    blockedCommands?: string[];
  };
  maxToolIterations: number;
  toolTimeout: number;
  isDefault?: boolean;
}

// ─── Event Bus ──────────────────────────────────────────────

export interface AgentEvent {
  type: string;
  payload: Record<string, unknown>;
  source: string;
  timestamp: string;
}

export type EventHandler = (event: AgentEvent) => Promise<void>;

// ─── Gateway Types ──────────────────────────────────────────

export interface GatewayConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  jwtSecret: string;
}

export interface GatewaySession {
  id: string;
  userId: string;
  platform: ChatPlatform;
  connectedAt: string;
  lastActiveAt: string;
}

export type GatewayMessageType =
  | 'auth'
  | 'chat'
  | 'chat:stream'
  | 'chat:response'
  | 'tool:call'
  | 'tool:result'
  | 'workflow:execute'
  | 'workflow:status'
  | 'skill:list'
  | 'skill:toggle'
  | 'event'
  | 'ping'
  | 'pong'
  | 'error';

export interface GatewayMessage {
  type: GatewayMessageType;
  id: string;
  sessionId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ─── Channel Plugin ─────────────────────────────────────────

export interface ChannelPlugin {
  id: string;
  platform: ChatPlatform;
  name: string;
  version: string;

  initialize(config: Record<string, unknown>): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(message: OutgoingMessage): Promise<void>;
  onMessage(handler: (message: IncomingMessage) => Promise<void>): void;
}

// ─── Plugin Manifest ────────────────────────────────────────

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  type: 'skill' | 'channel' | 'integration' | 'theme' | 'knowledge-pack';
  entry: string;
  config?: SkillConfigField[];
  platforms?: ChatPlatform[];
  permissions?: PluginPermission[];
}

export type PluginPermission = 'network' | 'filesystem' | 'shell' | 'memory' | 'llm' | 'secrets';

// ─── Tracing Types ──────────────────────────────────────────

export interface TraceSpan {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  kind: 'agent' | 'llm' | 'tool' | 'workflow' | 'memory' | 'custom';
  startTime: number;
  endTime?: number;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
  status: 'ok' | 'error';
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

// ─── Integration Types ──────────────────────────────────────

export type IntegrationCategory =
  | 'messaging'
  | 'email'
  | 'calendar'
  | 'productivity'
  | 'developer'
  | 'search'
  | 'social'
  | 'storage'
  | 'crm'
  | 'payment'
  | 'analytics'
  | 'ai'
  | 'communication'
  | 'automation'
  | 'database'
  | 'custom';

export type IntegrationAuthType = 'none' | 'api-key' | 'basic' | 'bearer' | 'oauth2';

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: IntegrationCategory;
  authType: IntegrationAuthType;
  actions: IntegrationAction[];
  triggers?: IntegrationTrigger[];
}

export interface IntegrationAction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>, context: IntegrationContext) => Promise<ActionResult>;
}

export interface IntegrationTrigger {
  name: string;
  description: string;
  type: 'webhook' | 'polling';
  config?: Record<string, unknown>;
}

export interface IntegrationContext {
  credentials: Record<string, string>;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ─── Domain Pack Types ──────────────────────────────────────

export interface DomainPackDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  skillCount: number;
  agentPersona: string;
  recommendedIntegrations: string[];
  knowledgePacks?: string[];
}

// ─── RBAC Types ─────────────────────────────────────────────

export type RBACResource =
  | 'chat' | 'sessions' | 'knowledge' | 'workflows' | 'integrations'
  | 'domains' | 'settings' | 'users' | 'roles' | 'tenants' | 'models'
  | 'ml' | 'agents' | 'webhooks' | 'mcp';

export type RBACAction = 'read' | 'write' | 'delete' | 'manage';

export type PermissionKey = `${RBACResource}:${RBACAction}` | '*:*';

export interface RoleDefinition {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  permissions: PermissionKey[];
}

export interface UserWithPermissions {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  tenantId: string;
  avatarUrl?: string;
  hasPassword: boolean;
  permissions: PermissionKey[];
  oauthProviders: string[];
  lastLoginAt?: string;
  createdAt: string;
}

// ─── OAuth2 Types ───────────────────────────────────────────

export type OAuth2Provider = 'google' | 'github' | 'discord';

export interface OAuth2Account {
  id: string;
  provider: OAuth2Provider;
  providerAccountId: string;
  connectedAt: string;
}

export interface OAuth2AuthorizeResponse {
  url: string;
}

export interface OAuth2CallbackResponse {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId: string;
    avatarUrl?: string;
  };
  provider: OAuth2Provider;
}

// ─── Monitoring & Logging Types ─────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type AuditAction =
  | 'user.login' | 'user.logout' | 'user.create' | 'user.update' | 'user.delete'
  | 'tenant.create' | 'tenant.update' | 'tenant.delete'
  | 'workflow.create' | 'workflow.update' | 'workflow.delete' | 'workflow.execute'
  | 'role.create' | 'role.update' | 'role.delete' | 'role.assign'
  | 'settings.update'
  | 'integration.connect' | 'integration.disconnect'
  | 'agent.config.update'
  | 'knowledge.upload' | 'knowledge.delete'
  | 'mcp.connect' | 'mcp.disconnect'
  | string;

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

export interface SystemLogEntry {
  id: string;
  level: LogLevel;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
  timestamp: string;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number; external: number };
  cpuUsage: { user: number; system: number };
  activeConnections: number;
  requestsPerMinute: number;
  llmCalls: { total: number; failed: number; avgLatency: number };
  workflowExecutions: { total: number; running: number; failed: number };
  timestamp: string;
}

// ─── Sandbox Config ─────────────────────────────────────────

export interface SandboxConfig {
  timeoutMs: number;
  memoryLimitMb?: number;
}

// ─── xClaw Plugin System ────────────────────────────────────

export type PluginType = 'domain' | 'integration' | 'full-stack';

export type PluginStatus = 'registered' | 'active' | 'inactive' | 'error';

/**
 * XClawPlugin — The universal plugin interface for extending xClaw.
 *
 * A plugin can provide:
 * - Domain pack (agent persona + skills + tools)
 * - API routes (Hono sub-app mounted at /api/plugins/:pluginId)
 * - MongoDB collections (plugin-scoped data)
 * - Frontend pages (declared via `pages` manifest)
 * - Config schema (user-configurable settings)
 *
 * Each plugin is a self-contained package that registers with the core PluginManager.
 */
export interface XClawPlugin {
  /** Unique plugin identifier, e.g. 'shirtgen', 'his-mini' */
  id: string;
  /** Display name */
  name: string;
  /** Semantic version */
  version: string;
  /** Description */
  description: string;
  /** Author name or org */
  author: string;
  /** Icon (emoji or URL) */
  icon: string;
  /** Plugin type */
  type: PluginType;

  /** Domain pack (if plugin provides domain-specific AI) */
  domain?: PluginDomainConfig;

  /** API routes factory — returns a Hono sub-app */
  createRoutes?: (ctx: PluginContext) => unknown;

  /** MongoDB collection declarations (auto-created with indexes) */
  collections?: PluginCollectionConfig[];

  /** Frontend page declarations */
  pages?: PluginPageConfig[];

  /** Configuration schema */
  configSchema?: PluginConfigField[];

  /** Lifecycle hooks */
  onActivate?: (ctx: PluginContext) => Promise<void>;
  onDeactivate?: (ctx: PluginContext) => Promise<void>;

  /** Dependencies on other plugins */
  dependencies?: string[];
}

export interface PluginDomainConfig {
  /** Agent persona / system prompt for this domain */
  agentPersona: string;
  /** Skills provided by this domain */
  skills: PluginSkillConfig[];
  /** Recommended integration IDs */
  recommendedIntegrations?: string[];
  /** Knowledge pack IDs */
  knowledgePacks?: string[];
}

export interface PluginSkillConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tools: PluginToolConfig[];
}

export interface PluginToolConfig {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>, ctx: PluginContext) => Promise<ActionResult>;
}

export interface PluginCollectionConfig {
  /** Collection name (will be prefixed: plugin_{pluginId}_{name}) */
  name: string;
  /** MongoDB indexes */
  indexes?: Array<{
    fields: Record<string, 1 | -1>;
    options?: { unique?: boolean; sparse?: boolean; expireAfterSeconds?: number };
  }>;
}

export interface PluginPageConfig {
  /** Route path (relative to /plugins/:pluginId/) */
  path: string;
  /** Page title */
  title: string;
  /** Icon (emoji or lucide icon name) */
  icon: string;
  /** Show in sidebar? */
  sidebar?: boolean;
  /** Sidebar group label */
  sidebarGroup?: string;
}

export interface PluginConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'secret' | 'url';
  description: string;
  required?: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
}

/**
 * PluginContext — Provided to plugins during lifecycle and route creation.
 * Gives access to core platform services.
 */
export interface PluginContext {
  /** Plugin's own config values */
  config: Record<string, unknown>;
  /** Plugin's MongoDB collection accessor */
  getCollection: (name: string) => unknown;
  /** Access to the Agent's LLM router */
  llm: unknown;
  /** Access to the Agent's tool registry */
  tools: unknown;
  /** Access to the Agent's event bus */
  events: unknown;
  /** Access to RAG engine */
  rag: unknown;
  /** Access to image generation service */
  imageGen?: unknown;
  /** Tenant ID from request context */
  tenantId?: string;
  /** User ID from request context */
  userId?: string;
}

export interface PluginRegistryEntry {
  plugin: XClawPlugin;
  status: PluginStatus;
  activatedAt?: string;
  error?: string;
}

// ─── Voice / STT / TTS Types ───────────────────────────────

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{ start: number; end: number; text: string }>;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  language?: string;
}

// ─── Human Handoff / Escalation Types ───────────────────────

export type HandoffStatus = 'pending' | 'assigned' | 'active' | 'resolved' | 'returned_to_ai';

export type EscalationReason = 'user_request' | 'sentiment' | 'keyword' | 'confidence' | 'loop_detected' | 'manual';

export interface HandoffSession {
  id: string;
  tenantId: string;
  sessionId: string;
  userId: string;
  agentUserId?: string;
  status: HandoffStatus;
  reason: EscalationReason;
  reasonDetail?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
  createdAt: string;
  assignedAt?: string;
  resolvedAt?: string;
}

export interface EscalationRule {
  id: string;
  tenantId: string;
  type: EscalationReason;
  enabled: boolean;
  config: {
    keywords?: string[];
    sentimentThreshold?: number;
    confidenceThreshold?: number;
    maxLoopCount?: number;
  };
}

// ─── Conversation Analytics Types ───────────────────────────

export interface ConversationAnalytics {
  totalConversations: number;
  totalMessages: number;
  avgResponseTimeMs: number;
  avgMessagesPerConversation: number;
  resolutionRate: number;
  platformBreakdown: Record<string, number>;
  dailyVolume: Array<{ date: string; conversations: number; messages: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  sentimentDistribution: { positive: number; neutral: number; negative: number };
  avgSessionDurationMs: number;
  peakHours: Array<{ hour: number; count: number }>;
}

export interface AgentPerformanceMetrics {
  totalInteractions: number;
  avgLatencyMs: number;
  toolCallRate: number;
  escalationRate: number;
  tokenUsage: { prompt: number; completion: number; total: number };
  costUsd: number;
  modelBreakdown: Record<string, { calls: number; avgLatency: number; cost: number }>;
  errorRate: number;
}

// ─── Agent Template Types ───────────────────────────────────

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  persona: string;
  systemPrompt: string;
  skills: string[];
  tools: string[];
  suggestedModel?: string;
  tags: string[];
}

// ─── Data Retention Types ───────────────────────────────────

export interface RetentionPolicy {
  id: string;
  tenantId: string;
  resource: 'messages' | 'sessions' | 'audit_logs' | 'activity_logs' | 'llm_logs';
  retentionDays: number;
  enabled: boolean;
  lastRunAt?: string;
}

// ─── API Key Types ──────────────────────────────────────────

export interface ApiKeyEntry {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  createdBy: string;
}
