import { Hono } from 'hono';
import { getDB } from '@xclaw-ai/db';
import { getMongo } from '@xclaw-ai/db';
import { sql } from 'drizzle-orm';

const VERSION = '2.1.0';

export function createHealthRoutes() {
  const app = new Hono();

  // Liveness — app is running
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      version: VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness — app can serve traffic (DB connections alive)
  app.get('/health/ready', async (c) => {
    try {
      const db = getDB();
      await db.execute(sql`SELECT 1`);

      const mongo = getMongo();
      await mongo.command({ ping: 1 });

      return c.json({ status: 'ok' });
    } catch {
      return c.json({ status: 'unhealthy' }, 503);
    }
  });

  // Deep health — detailed dependency status
  app.get('/health/deep', async (c) => {
    const checks: Record<string, { status: string; latency_ms: number; error?: string }> = {};
    let overall: 'ok' | 'degraded' | 'unhealthy' = 'ok';

    // PostgreSQL
    try {
      const start = performance.now();
      const db = getDB();
      await db.execute(sql`SELECT 1`);
      checks.postgres = { status: 'ok', latency_ms: Math.round(performance.now() - start) };
    } catch (err) {
      checks.postgres = { status: 'unhealthy', latency_ms: -1, error: err instanceof Error ? err.message : 'Failed' };
      overall = 'unhealthy';
    }

    // MongoDB
    try {
      const start = performance.now();
      const mongo = getMongo();
      await mongo.command({ ping: 1 });
      checks.mongodb = { status: 'ok', latency_ms: Math.round(performance.now() - start) };
    } catch (err) {
      checks.mongodb = { status: 'unhealthy', latency_ms: -1, error: err instanceof Error ? err.message : 'Failed' };
      overall = 'unhealthy';
    }

    // Memory
    const mem = process.memoryUsage();
    const usedMb = Math.round(mem.rss / 1024 / 1024);
    checks.memory = { status: usedMb > 900 ? 'warning' : 'ok', latency_ms: 0 };

    if (overall === 'ok' && Object.values(checks).some(c => c.status === 'warning')) {
      overall = 'degraded';
    }

    return c.json({
      status: overall,
      version: VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
      memory: { used_mb: usedMb, heap_mb: Math.round(mem.heapUsed / 1024 / 1024) },
    }, overall === 'unhealthy' ? 503 : 200);
  });

  app.get('/', (c) => {
    return c.json({
      name: 'xClaw AI Agent Platform',
      version: VERSION,
      docs: '/health',
    });
  });

  return app;
}
