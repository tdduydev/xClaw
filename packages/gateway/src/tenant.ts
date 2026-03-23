import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { HTTPException } from 'hono/http-exception';
import type { TenantSandboxConfig } from '@xclaw-ai/shared';
import { getDB, tenants, tenantSettings, users, eq, and } from '@xclaw-ai/db';

// ─── Types ──────────────────────────────────────────────────

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  metadata: Record<string, unknown>;
}

function toTenantInfo(row: any): TenantInfo {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    status: row.status,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export interface TenantSettingsInfo {
  llmProvider: string;
  llmModel: string;
  llmApiKey: string | null;
  llmBaseUrl: string | null;
  llmTemperature: number | null;
  llmMaxTokens: number | null;
  agentName: string;
  systemPrompt: string | null;
  aiLanguage: string;
  aiLanguageCustom: string | null;
  enableWebSearch: boolean;
  enableRag: boolean;
  enableWorkflows: boolean;
  enabledDomains: string[];
  enabledIntegrations: string[];
  maxUsersPerTenant: number;
  maxSessionsPerUser: number;
  maxMessagesPerDay: number;
  tavilyApiKey: string | null;
  branding: Record<string, unknown>;
  sandboxConfig: TenantSandboxConfig;
}

// ─── In-memory cache (tenant settings) ──────────────────────

const settingsCache = new Map<string, { data: TenantSettingsInfo; cachedAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

function invalidateCache(tenantId: string) {
  settingsCache.delete(tenantId);
}

// ─── TenantService ──────────────────────────────────────────

export const TenantService = {
  async getById(tenantId: string): Promise<TenantInfo | null> {
    const db = getDB();
    const rows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    return rows[0] ? toTenantInfo(rows[0]) : null;
  },

  async getBySlug(slug: string): Promise<TenantInfo | null> {
    const db = getDB();
    const rows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return rows[0] ? toTenantInfo(rows[0]) : null;
  },

  async list(): Promise<TenantInfo[]> {
    const db = getDB();
    const rows = await db.select().from(tenants).where(eq(tenants.status, 'active'));
    return rows.map(toTenantInfo);
  },

  async create(data: { name: string; slug: string; plan?: string; metadata?: Record<string, unknown> }): Promise<TenantInfo> {
    const db = getDB();
    const id = randomUUID();
    const now = new Date();

    // Check slug uniqueness
    const existing = await db.select().from(tenants).where(eq(tenants.slug, data.slug)).limit(1);
    if (existing.length > 0) {
      throw new Error('Tenant slug already exists');
    }

    const [tenant] = await db.insert(tenants).values({
      id,
      name: data.name,
      slug: data.slug,
      plan: data.plan ?? 'free',
      status: 'active',
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Create default settings
    await db.insert(tenantSettings).values({
      id: randomUUID(),
      tenantId: id,
      createdAt: now,
      updatedAt: now,
    });

    return toTenantInfo(tenant);
  },

  async update(tenantId: string, data: Partial<Pick<TenantInfo, 'name' | 'plan' | 'status' | 'metadata'>>): Promise<TenantInfo | null> {
    const db = getDB();
    const [updated] = await db.update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();
    return updated ? toTenantInfo(updated) : null;
  },

  // ─── Settings ───────────────────────────────────────────

  async getSettings(tenantId: string): Promise<TenantSettingsInfo | null> {
    // Check cache
    const cached = settingsCache.get(tenantId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    const db = getDB();
    const rows = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId)).limit(1);
    if (rows.length === 0) return null;

    const row = rows[0];
    const result: TenantSettingsInfo = {
      llmProvider: row.llmProvider,
      llmModel: row.llmModel,
      llmApiKey: row.llmApiKey,
      llmBaseUrl: row.llmBaseUrl,
      llmTemperature: row.llmTemperature,
      llmMaxTokens: row.llmMaxTokens,
      agentName: row.agentName,
      systemPrompt: row.systemPrompt,
      aiLanguage: row.aiLanguage,
      aiLanguageCustom: row.aiLanguageCustom,
      enableWebSearch: row.enableWebSearch,
      enableRag: row.enableRag,
      enableWorkflows: row.enableWorkflows,
      enabledDomains: row.enabledDomains as string[],
      enabledIntegrations: row.enabledIntegrations as string[],
      maxUsersPerTenant: row.maxUsersPerTenant,
      maxSessionsPerUser: row.maxSessionsPerUser,
      maxMessagesPerDay: row.maxMessagesPerDay,
      tavilyApiKey: row.tavilyApiKey,
      branding: row.branding as Record<string, unknown>,
      sandboxConfig: (row.sandboxConfig ?? {
        enabled: false,
        defaultPolicy: 'default',
        maxConcurrentSandboxes: 5,
        idleTimeoutMs: 300000,
        cpuLimit: '0.5',
        memoryLimit: '512Mi',
        gpuEnabled: false,
      }) as TenantSandboxConfig,
    };

    settingsCache.set(tenantId, { data: result, cachedAt: Date.now() });
    return result;
  },

  async updateSettings(tenantId: string, data: Partial<TenantSettingsInfo>): Promise<TenantSettingsInfo | null> {
    const db = getDB();
    await db.update(tenantSettings)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(tenantSettings.tenantId, tenantId));

    invalidateCache(tenantId);
    return this.getSettings(tenantId);
  },
};

// ─── Language helper (per-tenant) ───────────────────────────

const LANGUAGE_MAP: Record<string, string> = {
  vi: 'Vietnamese (Tiếng Việt)',
  en: 'English',
  ja: 'Japanese (日本語)',
  ko: 'Korean (한국어)',
  zh: 'Chinese Simplified (简体中文)',
  'zh-tw': 'Chinese Traditional (繁體中文)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  es: 'Spanish (Español)',
  pt: 'Portuguese (Português)',
  it: 'Italian (Italiano)',
  ru: 'Russian (Русский)',
  th: 'Thai (ภาษาไทย)',
  id: 'Indonesian (Bahasa Indonesia)',
  ms: 'Malay (Bahasa Melayu)',
  ar: 'Arabic (العربية)',
  hi: 'Hindi (हिन्दी)',
};

export function getTenantLanguageInstruction(settings: TenantSettingsInfo): string {
  if (settings.aiLanguage === 'auto') return '';
  if (settings.aiLanguageCustom?.trim()) return settings.aiLanguageCustom.trim();
  const langName = LANGUAGE_MAP[settings.aiLanguage];
  if (langName) return `You MUST respond in ${langName}. All your responses, explanations, and outputs must be written in ${langName}.`;
  return '';
}

export { LANGUAGE_MAP };

// ─── Tenant middleware ──────────────────────────────────────

declare module 'hono' {
  interface ContextVariableMap {
    tenantId: string;
    tenantSettings: TenantSettingsInfo;
  }
}

export function tenantMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const user = c.get('user');
    if (!user?.tenantId) {
      throw new HTTPException(403, { message: 'No tenant associated with user' });
    }

    const settings = await TenantService.getSettings(user.tenantId);
    if (!settings) {
      throw new HTTPException(403, { message: 'Tenant settings not found' });
    }

    // Check tenant is active
    const tenant = await TenantService.getById(user.tenantId);
    if (!tenant || tenant.status !== 'active') {
      throw new HTTPException(403, { message: 'Tenant is not active' });
    }

    c.set('tenantId', user.tenantId);
    c.set('tenantSettings', settings);
    await next();
  };
}

// ─── Tenant CRUD Routes (admin only) ───────────────────────

export function createTenantRoutes() {
  const app = new Hono();

  // GET /tenants — list all tenants
  app.get('/', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'owner') {
      throw new HTTPException(403, { message: 'Admin access required' });
    }
    const list = await TenantService.list();
    return c.json(list);
  });

  // GET /tenants/:id
  app.get('/:id', async (c) => {
    const tenant = await TenantService.getById(c.req.param('id'));
    if (!tenant) throw new HTTPException(404, { message: 'Tenant not found' });
    return c.json(tenant);
  });

  // POST /tenants — create new tenant
  app.post('/', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') {
      throw new HTTPException(403, { message: 'Admin access required' });
    }
    const body = await c.req.json();
    const { name, slug, plan, metadata } = body;
    if (!name || !slug) {
      return c.json({ error: 'name and slug are required' }, 400);
    }
    // Validate slug format
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
      return c.json({ error: 'slug must be lowercase alphanumeric with hyphens, 1-63 chars' }, 400);
    }
    try {
      const tenant = await TenantService.create({ name, slug, plan, metadata });
      return c.json(tenant, 201);
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        return c.json({ error: err.message }, 409);
      }
      throw err;
    }
  });

  // PUT /tenants/:id — update tenant
  app.put('/:id', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'owner') {
      throw new HTTPException(403, { message: 'Admin access required' });
    }
    const body = await c.req.json();
    const updated = await TenantService.update(c.req.param('id'), body);
    if (!updated) throw new HTTPException(404, { message: 'Tenant not found' });
    return c.json(updated);
  });

  // GET /tenants/:id/settings
  app.get('/:id/settings', async (c) => {
    const settings = await TenantService.getSettings(c.req.param('id'));
    if (!settings) throw new HTTPException(404, { message: 'Settings not found' });
    // Don't expose API keys 
    const safe = {
      ...settings,
      llmApiKey: settings.llmApiKey ? '***' : null,
      tavilyApiKey: settings.tavilyApiKey ? '***' : null,
    };
    return c.json({
      ...safe,
      languages: Object.entries(LANGUAGE_MAP).map(([code, name]) => ({ code, name })),
    });
  });

  // PUT /tenants/:id/settings
  app.put('/:id/settings', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'owner') {
      throw new HTTPException(403, { message: 'Admin access required' });
    }
    const body = await c.req.json();
    const updated = await TenantService.updateSettings(c.req.param('id'), body);
    if (!updated) throw new HTTPException(404, { message: 'Settings not found' });
    return c.json({ ok: true });
  });

  return app;
}
