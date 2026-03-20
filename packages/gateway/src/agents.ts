import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import {
  channelConnectionsCollection,
  sessionsCollection,
  messagesCollection,
  type MongoChannelConnection,
} from '@xclaw-ai/db';

// Helper to extract user info from Hono context
function getUserCtx(c: any) {
  const user = c.get('user');
  return {
    tenantId: (user?.tenantId as string) || 'default',
    userId: (user?.sub as string) || 'anonymous',
  };
}

// ─── Agents / Channel Connections Routes ────────────────────

export function createAgentsRoutes() {
  const app = new Hono();

  // ─── Channel Connections ──────────────────────────────────

  // List all channel connections for the current user
  app.get('/channels', async (c) => {
    try {
      const { tenantId, userId } = getUserCtx(c);
      const channels = channelConnectionsCollection();
      const list = await channels.find({ tenantId, userId }).sort({ updatedAt: -1 }).toArray();
      return c.json({ ok: true, channels: list });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 500);
    }
  });

  // Get a single channel connection
  app.get('/channels/:id', async (c) => {
    try {
      const { tenantId, userId } = getUserCtx(c);
      const id = c.req.param('id');
      const channels = channelConnectionsCollection();
      const channel = await channels.findOne({ _id: id, tenantId, userId });
      if (!channel) return c.json({ error: 'Channel not found' }, 404);
      // Mask sensitive config values
      const masked = maskConfig(channel);
      return c.json({ ok: true, channel: masked });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 500);
    }
  });

  // Create a new channel connection
  app.post('/channels', async (c) => {
    try {
      const { tenantId, userId } = getUserCtx(c);
      const body = await c.req.json();

      const { channelType, name, config } = body;
      if (!channelType || !name || !config) {
        return c.json({ error: 'channelType, name, and config are required' }, 400);
      }

      const validTypes = ['telegram', 'discord', 'facebook', 'slack', 'whatsapp', 'webhook'];
      if (!validTypes.includes(channelType)) {
        return c.json({ error: `Invalid channelType. Supported: ${validTypes.join(', ')}` }, 400);
      }

      // Validate channel-specific config
      const validation = validateChannelConfig(channelType, config);
      if (!validation.ok) {
        return c.json({ error: validation.error }, 400);
      }

      const now = new Date();
      const connection: MongoChannelConnection = {
        _id: randomUUID(),
        tenantId,
        userId,
        channelType,
        name,
        config,
        status: 'inactive',
        createdAt: now,
        updatedAt: now,
      };

      const channels = channelConnectionsCollection();
      await channels.insertOne(connection);

      return c.json({ ok: true, channel: connection }, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 500);
    }
  });

  // Update a channel connection
  app.put('/channels/:id', async (c) => {
    try {
      const { tenantId, userId } = getUserCtx(c);
      const id = c.req.param('id');
      const body = await c.req.json();
      const { name, config, status } = body;

      const channels = channelConnectionsCollection();
      const existing = await channels.findOne({ _id: id, tenantId, userId });
      if (!existing) return c.json({ error: 'Channel not found' }, 404);

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (name) updates.name = name;
      if (config) {
        const validation = validateChannelConfig(existing.channelType, config);
        if (!validation.ok) return c.json({ error: validation.error }, 400);
        updates.config = config;
      }
      if (status && ['active', 'inactive'].includes(status)) {
        updates.status = status;
      }

      await channels.updateOne({ _id: id }, { $set: updates });
      const updated = await channels.findOne({ _id: id });

      return c.json({ ok: true, channel: updated });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 500);
    }
  });

  // Delete a channel connection
  app.delete('/channels/:id', async (c) => {
    try {
      const { tenantId, userId } = getUserCtx(c);
      const id = c.req.param('id');

      const channels = channelConnectionsCollection();
      const result = await channels.deleteOne({ _id: id, tenantId, userId });
      if (result.deletedCount === 0) return c.json({ error: 'Channel not found' }, 404);

      return c.json({ ok: true });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 500);
    }
  });

  // Test/verify a channel connection
  app.post('/channels/:id/test', async (c) => {
    try {
      const { tenantId, userId } = getUserCtx(c);
      const id = c.req.param('id');

      const channels = channelConnectionsCollection();
      const channel = await channels.findOne({ _id: id, tenantId, userId });
      if (!channel) return c.json({ error: 'Channel not found' }, 404);

      const testResult = await testChannelConnection(channel);
      if (testResult.ok) {
        await channels.updateOne({ _id: id }, {
          $set: {
            status: 'active',
            lastConnectedAt: new Date(),
            metadata: testResult.metadata,
            updatedAt: new Date(),
          },
        });
      } else {
        await channels.updateOne({ _id: id }, {
          $set: { status: 'error', updatedAt: new Date() },
        });
      }

      return c.json({ ok: testResult.ok, message: testResult.message, metadata: testResult.metadata });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 500);
    }
  });

  // Activate a channel (sets status to active)
  app.post('/channels/:id/activate', async (c) => {
    try {
      const { tenantId, userId } = getUserCtx(c);
      const id = c.req.param('id');

      const channels = channelConnectionsCollection();
      const channel = await channels.findOne({ _id: id, tenantId, userId });
      if (!channel) return c.json({ error: 'Channel not found' }, 404);

      // Test first
      const testResult = await testChannelConnection(channel);
      if (!testResult.ok) {
        return c.json({ error: `Cannot activate: ${testResult.message}` }, 400);
      }

      await channels.updateOne({ _id: id }, {
        $set: {
          status: 'active',
          lastConnectedAt: new Date(),
          metadata: testResult.metadata,
          updatedAt: new Date(),
        },
      });

      return c.json({ ok: true, message: 'Channel activated', metadata: testResult.metadata });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 500);
    }
  });

  // Deactivate a channel
  app.post('/channels/:id/deactivate', async (c) => {
    try {
      const { tenantId, userId } = getUserCtx(c);
      const id = c.req.param('id');

      const channels = channelConnectionsCollection();
      const result = await channels.updateOne(
        { _id: id, tenantId, userId },
        { $set: { status: 'inactive', updatedAt: new Date() } },
      );
      if (result.matchedCount === 0) return c.json({ error: 'Channel not found' }, 404);

      return c.json({ ok: true, message: 'Channel deactivated' });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 500);
    }
  });

  // ─── Chat History (cross-platform) ───────────────────────

  // List Telegram/channel sessions for user
  app.get('/sessions', async (c) => {
    try {
      const { tenantId, userId } = getUserCtx(c);
      const platform = c.req.query('platform');
      const sessions = sessionsCollection();
      const filter: Record<string, any> = { tenantId };
      // Include all sessions belonging to this user (web + telegram + others)
      if (platform) {
        filter.platform = platform;
      }
      // For telegram sessions, match by tg- prefix
      const list = await sessions.find(filter).sort({ updatedAt: -1 }).limit(100).toArray();
      return c.json({ ok: true, sessions: list });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 500);
    }
  });

  // Get messages for a session
  app.get('/sessions/:id/messages', async (c) => {
    try {
      const id = c.req.param('id');
      const messages = messagesCollection();
      const list = await messages.find({ sessionId: id }).sort({ createdAt: 1 }).toArray();
      return c.json({ ok: true, messages: list });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 500);
    }
  });

  // ─── Supported Channel Types ──────────────────────────────

  app.get('/channel-types', (c) => {
    return c.json({
      ok: true,
      types: [
        {
          id: 'telegram',
          name: 'Telegram',
          icon: '✈️',
          description: 'Connect a Telegram Bot to receive and send messages',
          configFields: [
            { key: 'botToken', label: 'Bot Token', type: 'password', required: true, placeholder: '123456:ABC-DEF...' },
          ],
          setupGuide: 'Open @BotFather on Telegram → /newbot → copy token',
        },
        {
          id: 'discord',
          name: 'Discord',
          icon: '🎮',
          description: 'Connect a Discord Bot',
          configFields: [
            { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
            { key: 'guildId', label: 'Server ID', type: 'text', required: false },
          ],
          setupGuide: 'Create app at discord.com/developers → Bot → copy token',
        },
        {
          id: 'facebook',
          name: 'Facebook Messenger',
          icon: '💬',
          description: 'Connect Facebook Messenger via Page',
          configFields: [
            { key: 'pageAccessToken', label: 'Page Access Token', type: 'password', required: true },
            { key: 'verifyToken', label: 'Verify Token', type: 'text', required: true },
            { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
          ],
          setupGuide: 'Create app at developers.facebook.com → Messenger settings',
        },
        {
          id: 'slack',
          name: 'Slack',
          icon: '💼',
          description: 'Connect Slack workspace',
          configFields: [
            { key: 'botToken', label: 'Bot Token (xoxb-...)', type: 'password', required: true },
            { key: 'signingSecret', label: 'Signing Secret', type: 'password', required: true },
          ],
          setupGuide: 'Create app at api.slack.com → OAuth & Permissions',
        },
        {
          id: 'whatsapp',
          name: 'WhatsApp',
          icon: '📱',
          description: 'Connect WhatsApp Business API',
          configFields: [
            { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true },
            { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
            { key: 'verifyToken', label: 'Verify Token', type: 'text', required: true },
          ],
          setupGuide: 'Set up via Meta Business Suite → WhatsApp',
        },
        {
          id: 'webhook',
          name: 'Webhook',
          icon: '🔗',
          description: 'Custom webhook integration',
          configFields: [
            { key: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true },
            { key: 'secret', label: 'Secret Key', type: 'password', required: false },
          ],
          setupGuide: 'Configure your service to send POST requests to the webhook endpoint',
        },
      ],
    });
  });

  return app;
}

// ─── Helpers ──────────────────────────────────────────────

function validateChannelConfig(channelType: string, config: Record<string, any>): { ok: boolean; error?: string } {
  switch (channelType) {
    case 'telegram':
      if (!config.botToken || typeof config.botToken !== 'string') {
        return { ok: false, error: 'botToken is required for Telegram' };
      }
      break;
    case 'discord':
      if (!config.botToken || typeof config.botToken !== 'string') {
        return { ok: false, error: 'botToken is required for Discord' };
      }
      break;
    case 'facebook':
      if (!config.pageAccessToken) return { ok: false, error: 'pageAccessToken is required for Facebook' };
      if (!config.verifyToken) return { ok: false, error: 'verifyToken is required for Facebook' };
      break;
    case 'slack':
      if (!config.botToken) return { ok: false, error: 'botToken is required for Slack' };
      break;
    case 'whatsapp':
      if (!config.phoneNumberId) return { ok: false, error: 'phoneNumberId is required for WhatsApp' };
      if (!config.accessToken) return { ok: false, error: 'accessToken is required for WhatsApp' };
      break;
    case 'webhook':
      if (!config.webhookUrl) return { ok: false, error: 'webhookUrl is required for Webhook' };
      break;
  }
  return { ok: true };
}

function maskConfig(channel: MongoChannelConnection): MongoChannelConnection {
  const maskedConfig = { ...channel.config };
  for (const key of Object.keys(maskedConfig)) {
    if (typeof maskedConfig[key] === 'string' && (key.toLowerCase().includes('token') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('key'))) {
      const val = maskedConfig[key] as string;
      maskedConfig[key] = val.length > 8 ? val.slice(0, 4) + '****' + val.slice(-4) : '****';
    }
  }
  return { ...channel, config: maskedConfig };
}

async function testChannelConnection(channel: MongoChannelConnection): Promise<{ ok: boolean; message: string; metadata?: Record<string, any> }> {
  switch (channel.channelType) {
    case 'telegram': {
      try {
        const token = channel.config.botToken;
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return { ok: false, message: 'Invalid bot token' };
        const data = await res.json() as any;
        if (!data.ok) return { ok: false, message: 'Invalid bot token' };
        return {
          ok: true,
          message: `Connected as @${data.result.username}`,
          metadata: {
            botId: data.result.id,
            botUsername: data.result.username,
            botName: data.result.first_name,
          },
        };
      } catch {
        return { ok: false, message: 'Connection failed — check token' };
      }
    }
    case 'discord': {
      try {
        const token = channel.config.botToken;
        const res = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { Authorization: `Bot ${token}` },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return { ok: false, message: 'Invalid bot token' };
        const data = await res.json() as any;
        return {
          ok: true,
          message: `Connected as ${data.username}#${data.discriminator}`,
          metadata: { botId: data.id, botUsername: data.username },
        };
      } catch {
        return { ok: false, message: 'Connection failed — check token' };
      }
    }
    default:
      return { ok: true, message: 'Configuration saved (verification not available for this channel type)' };
  }
}
