import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// ─── Types ─────────────────────────────────────────────────

export interface MongoSession {
  _id: string;
  tenantId: string;
  userId: string;
  platform: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoMessage {
  _id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any;
  toolResults?: any;
  metadata?: Record<string, any>;
  embedding?: number[]; // vector embedding for RAG
  createdAt: Date;
}

export interface MongoMemoryEntry {
  _id: string;
  tenantId: string;
  type: 'fact' | 'preference' | 'conversation' | 'context' | 'skill-data';
  content: string;
  metadata: Record<string, any>;
  source: string;
  tags: string[];
  embedding?: number[]; // vector embedding for similarity search
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface MongoAgentConfig {
  _id: string;
  tenantId: string;
  name: string;
  persona: string;
  systemPrompt: string;
  llmConfig: Record<string, any>;
  enabledSkills: string[];
  memoryConfig: Record<string, any>;
  securityConfig: Record<string, any>;
  maxToolIterations: number;
  toolTimeout: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoAuditLog {
  _id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface MongoSystemLog {
  _id: string;
  level: string;
  source: string;
  message: string;
  metadata?: Record<string, any>;
  error?: { name: string; message: string; stack?: string };
  createdAt: Date;
}

export interface MongoChannelConnection {
  _id: string;
  tenantId: string;
  userId: string;
  channelType: 'telegram' | 'discord' | 'facebook' | 'slack' | 'whatsapp' | 'webhook';
  name: string;
  config: Record<string, any>; // e.g. { botToken, allowedChatIds }
  status: 'active' | 'inactive' | 'error';
  lastConnectedAt?: Date;
  metadata?: Record<string, any>; // e.g. { botUsername, botId }
  createdAt: Date;
  updatedAt: Date;
}

// ─── Connection ────────────────────────────────────────────

let mongoClient: MongoClient | null = null;
let mongoDB: Db | null = null;

export function getMongo(mongoUrl?: string): Db {
  if (mongoDB) return mongoDB;

  const url = mongoUrl || process.env.MONGODB_URL;
  if (!url) {
    throw new Error('MONGODB_URL is required');
  }

  mongoClient = new MongoClient(url);
  mongoDB = mongoClient.db();
  return mongoDB;
}

export async function connectMongo(mongoUrl?: string): Promise<Db> {
  const url = mongoUrl || process.env.MONGODB_URL;
  if (!url) throw new Error('MONGODB_URL is required');

  if (mongoDB && mongoClient) return mongoDB;

  mongoClient = new MongoClient(url);
  await mongoClient.connect();
  mongoDB = mongoClient.db();

  // Ensure indexes
  await ensureIndexes(mongoDB);

  return mongoDB;
}

export async function closeMongo() {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDB = null;
  }
}

// ─── Collections ───────────────────────────────────────────

export function sessionsCollection(db?: Db): Collection<MongoSession> {
  return (db || getMongo()).collection<MongoSession>('sessions');
}

export function messagesCollection(db?: Db): Collection<MongoMessage> {
  return (db || getMongo()).collection<MongoMessage>('messages');
}

export function memoryEntriesCollection(db?: Db): Collection<MongoMemoryEntry> {
  return (db || getMongo()).collection<MongoMemoryEntry>('memory_entries');
}

export function agentConfigsCollection(db?: Db): Collection<MongoAgentConfig> {
  return (db || getMongo()).collection<MongoAgentConfig>('agent_configs');
}

export function auditLogsCollection(db?: Db): Collection<MongoAuditLog> {
  return (db || getMongo()).collection<MongoAuditLog>('audit_logs');
}

export function systemLogsCollection(db?: Db): Collection<MongoSystemLog> {
  return (db || getMongo()).collection<MongoSystemLog>('system_logs');
}

export function channelConnectionsCollection(db?: Db): Collection<MongoChannelConnection> {
  return (db || getMongo()).collection<MongoChannelConnection>('channel_connections');
}

// ─── Indexes ───────────────────────────────────────────────

async function ensureIndexes(db: Db) {
  const sessions = sessionsCollection(db);
  await sessions.createIndex({ tenantId: 1, userId: 1 });
  await sessions.createIndex({ userId: 1 });
  await sessions.createIndex({ updatedAt: -1 });

  const messages = messagesCollection(db);
  await messages.createIndex({ sessionId: 1, createdAt: 1 });

  const memory = memoryEntriesCollection(db);
  await memory.createIndex({ tenantId: 1, type: 1 });
  await memory.createIndex({ tags: 1 });
  await memory.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  const agentConfigs = agentConfigsCollection(db);
  await agentConfigs.createIndex({ tenantId: 1 });
  await agentConfigs.createIndex({ tenantId: 1, isDefault: 1 });

  // Audit logs
  const auditLogs = auditLogsCollection(db);
  await auditLogs.createIndex({ tenantId: 1, createdAt: -1 });
  await auditLogs.createIndex({ userId: 1, createdAt: -1 });
  await auditLogs.createIndex({ action: 1 });
  await auditLogs.createIndex({ resource: 1 });
  // TTL: auto-delete audit logs after 90 days
  await auditLogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

  // System logs
  const systemLogs = systemLogsCollection(db);
  await systemLogs.createIndex({ level: 1, createdAt: -1 });
  await systemLogs.createIndex({ source: 1, createdAt: -1 });
  await systemLogs.createIndex({ message: 'text' });
  // TTL: auto-delete system logs after 30 days
  await systemLogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

  // Channel connections
  const channels = channelConnectionsCollection(db);
  await channels.createIndex({ tenantId: 1, userId: 1 });
  await channels.createIndex({ tenantId: 1, channelType: 1 });
  await channels.createIndex({ status: 1 });
}
