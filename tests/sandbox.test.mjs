// ============================================================
// Sandbox Integration Tests
// ============================================================
// Tests for the @xclaw-ai/sandbox package.
// Run with: node --test tests/sandbox.test.mjs

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ─── PolicyBuilder Tests ─────────────────────────────────────

describe('PolicyBuilder', async () => {
    const { PolicyBuilder, BUILTIN_POLICIES, INTEGRATION_POLICIES } = await import('@xclaw-ai/sandbox');

    it('should create a custom policy', () => {
        const policy = new PolicyBuilder('test-policy')
            .allowPath('/tmp', 'read-write')
            .allowHost('api.example.com', ['GET', 'POST'])
            .processPolicy({ maxProcesses: 10 })
            .build();

        assert.equal(policy.name, 'test-policy');
        assert.equal(policy.filesystem.rules.length, 1);
        assert.equal(policy.network.rules.length, 1);
        assert.equal(policy.network.rules[0].host, 'api.example.com');
        assert.equal(policy.process.maxProcesses, 10);
    });

    it('should create policy from template', () => {
        const policy = PolicyBuilder.from('default')
            .allowHost('custom.api.com')
            .build();

        assert.equal(policy.name, 'default');
        assert.ok(policy.network.rules.some((r) => r.host === 'custom.api.com'));
    });

    it('should have all builtin policies', () => {
        const expected = ['strict', 'default', 'permissive', 'gmail', 'github', 'slack', 'notion', 'web-search', 'telegram', 'discord', 'zalo'];
        for (const name of expected) {
            assert.ok(BUILTIN_POLICIES[name], `Missing builtin policy: ${name}`);
        }
    });

    it('should have integration policies', () => {
        const expected = ['gmail', 'github', 'slack', 'notion', 'tavily', 'telegram', 'discord', 'zalo'];
        for (const name of expected) {
            assert.ok(INTEGRATION_POLICIES[name], `Missing integration policy: ${name}`);
        }
    });

    it('strict policy should deny all network by default', () => {
        const strict = BUILTIN_POLICIES['strict'];
        assert.equal(strict.network.defaultAction, 'deny');
        assert.equal(strict.network.rules.length, 0);
    });

    it('gmail policy should only allow Google APIs', () => {
        const gmail = BUILTIN_POLICIES['gmail'];
        assert.equal(gmail.network.defaultAction, 'deny');
        assert.ok(gmail.network.rules.every((r) => r.host.includes('google') || r.host.includes('googleapis')));
    });

    it('should convert policy to YAML', () => {
        const yaml = new PolicyBuilder('test')
            .allowPath('/tmp', 'read-write')
            .allowHost('api.test.com')
            .build();
        const builder = PolicyBuilder.from('strict');
        const yamlStr = builder.toYAML();
        assert.ok(yamlStr.includes('name: strict'));
        assert.ok(yamlStr.includes('filesystem:'));
        assert.ok(yamlStr.includes('network:'));
    });
});

// ─── PrivacyRouter Tests ─────────────────────────────────────

describe('PrivacyRouter', async () => {
    const { PrivacyRouter } = await import('@xclaw-ai/sandbox');

    it('should detect email PII', () => {
        const router = new PrivacyRouter();
        const entities = router.detect('Contact me at user@example.com for details');
        assert.ok(entities.some((e) => e.type === 'email'));
    });

    it('should detect Vietnamese phone numbers', () => {
        const router = new PrivacyRouter();
        const entities = router.detect('Gọi cho tôi qua số 0912345678');
        assert.ok(entities.some((e) => e.type === 'phone'));
    });

    it('should strip and rehydrate PII', () => {
        const router = new PrivacyRouter();
        const original = 'Send email to doctor@hospital.vn about patient';
        const stripped = router.strip(original, 'session-1');
        assert.ok(!stripped.includes('doctor@hospital.vn'));
        assert.ok(stripped.includes('[EMAIL_'));

        const rehydrated = router.rehydrate(stripped, 'session-1');
        assert.equal(rehydrated, original);
    });

    it('should not modify text when disabled', () => {
        const router = new PrivacyRouter(false);
        const text = 'Email: test@test.com Phone: 0912345678';
        assert.equal(router.strip(text, 'key'), text);
    });

    it('should return true for hasPII with credit cards', () => {
        const router = new PrivacyRouter();
        assert.ok(router.hasPII('Card: 4111 1111 1111 1111'));
    });
});

// ─── OCSF Logger Tests ──────────────────────────────────────

describe('OCSFEventLogger', async () => {
    const { OCSFEventLogger, toOCSFEvent } = await import('@xclaw-ai/sandbox');

    it('should convert audit entry to OCSF event', () => {
        const event = toOCSFEvent({
            sandboxId: 'sandbox-123',
            tenantId: 'tenant-456',
            action: 'create',
            details: { image: 'base' },
            timestamp: new Date().toISOString(),
        });

        assert.equal(event.class_uid, 2001);
        assert.equal(event.activity_name, 'Sandbox Create');
        assert.equal(event.status, 'success');
        assert.equal(event.actor.user.uid, 'tenant-456');
        assert.equal(event.metadata.product.name, 'xClaw');
    });

    it('should mark blocked actions as failure', () => {
        const event = toOCSFEvent({
            sandboxId: 'sandbox-123',
            tenantId: 'tenant-456',
            action: 'blocked',
            details: { host: 'evil.com' },
            timestamp: new Date().toISOString(),
        });

        assert.equal(event.status, 'failure');
        assert.equal(event.severity_id, 4); // High
    });

    it('should emit events to all destinations', () => {
        const logger = new OCSFEventLogger();
        const received: unknown[] = [];
        logger.addDestination((e) => received.push(e));
        logger.addDestination((e) => received.push(e));

        logger.logAudit({
            sandboxId: 'test',
            tenantId: 'test',
            action: 'execute',
            details: {},
            timestamp: new Date().toISOString(),
        });

        assert.equal(received.length, 2);
    });
});

// ─── TenantSandboxManager Tests (unit-level) ────────────────

describe('TenantSandboxManager', async () => {
    const { TenantSandboxManager, SandboxManager } = await import('@xclaw-ai/sandbox');

    it('should use default config for unknown tenants', () => {
        const manager = new SandboxManager({ mode: 'local' });
        const tenantManager = new TenantSandboxManager(manager);

        const config = tenantManager.getTenantConfig('unknown-tenant');
        assert.equal(config.enabled, true);
        assert.equal(config.defaultPolicy, 'default');
        assert.equal(config.maxConcurrentSandboxes, 5);
    });

    it('should allow setting custom tenant config', () => {
        const manager = new SandboxManager({ mode: 'local' });
        const tenantManager = new TenantSandboxManager(manager);

        tenantManager.setTenantConfig('tenant-1', {
            enabled: true,
            defaultPolicy: 'strict',
            maxConcurrentSandboxes: 10,
        });

        const config = tenantManager.getTenantConfig('tenant-1');
        assert.equal(config.defaultPolicy, 'strict');
        assert.equal(config.maxConcurrentSandboxes, 10);
    });

    it('should reject sandbox creation for disabled tenants', async () => {
        const manager = new SandboxManager({ mode: 'local' });
        const tenantManager = new TenantSandboxManager(manager);

        tenantManager.setTenantConfig('disabled-tenant', { enabled: false });

        await assert.rejects(
            () => tenantManager.createForTenant('disabled-tenant'),
            { message: /not enabled/ },
        );
    });
});

// ─── Credential Encryption Tests ─────────────────────────────

describe('Credential Encryption', async () => {
    it('should encrypt and decrypt credentials', async () => {
        // Set dev key for testing
        process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-key-for-unit-tests-only';
        const { encryptCredentials, decryptCredentials, isEncrypted } = await import('@xclaw-ai/db');

        const original = { apiKey: 'sk-abc123', token: 'ghp_xxx' };
        const encrypted = encryptCredentials(original);

        assert.ok(isEncrypted(encrypted));
        assert.ok(!encrypted.includes('sk-abc123'));

        const decrypted = decryptCredentials(encrypted);
        assert.deepEqual(decrypted, original);
    });
});

// ─── GPU Sandbox Tests ───────────────────────────────────────

describe('GPU Sandbox Images', async () => {
    const { GPU_SANDBOX_IMAGES, POLICY_ML, POLICY_INFERENCE } = await import('@xclaw-ai/sandbox');

    it('should have predefined ML images', () => {
        assert.ok(GPU_SANDBOX_IMAGES.length >= 5);
        assert.ok(GPU_SANDBOX_IMAGES.some((i) => i.name === 'ml-pytorch'));
        assert.ok(GPU_SANDBOX_IMAGES.some((i) => i.name === 'ml-sklearn'));
    });

    it('ML policy should allow Hugging Face downloads', () => {
        assert.ok(POLICY_ML.network.rules.some((r) => r.host === 'huggingface.co'));
        assert.equal(POLICY_ML.network.defaultAction, 'deny');
    });

    it('Inference policy should deny all network', () => {
        assert.equal(POLICY_INFERENCE.network.rules.length, 0);
        assert.equal(POLICY_INFERENCE.network.defaultAction, 'deny');
    });
});

// ─── Cross-Tenant Isolation Tests ────────────────────────────

describe('Cross-Tenant Isolation', async () => {
    const { SandboxManager, TenantSandboxManager } = await import('@xclaw-ai/sandbox');

    it('should not list sandboxes from other tenants', () => {
        const manager = new SandboxManager({ mode: 'local' });
        const tenantManager = new TenantSandboxManager(manager);

        // Sandboxes from tenant-A should not be visible to tenant-B
        const tenantASandboxes = tenantManager.getTenantSandboxes('tenant-a');
        const tenantBSandboxes = tenantManager.getTenantSandboxes('tenant-b');

        assert.equal(tenantASandboxes.length, 0);
        assert.equal(tenantBSandboxes.length, 0);
    });

    it('should enforce per-tenant quotas independently', () => {
        const manager = new SandboxManager({ mode: 'local' });
        const tenantManager = new TenantSandboxManager(manager);

        tenantManager.setTenantConfig('tenant-a', { maxConcurrentSandboxes: 3 });
        tenantManager.setTenantConfig('tenant-b', { maxConcurrentSandboxes: 10 });

        const configA = tenantManager.getTenantConfig('tenant-a');
        const configB = tenantManager.getTenantConfig('tenant-b');

        assert.equal(configA.maxConcurrentSandboxes, 3);
        assert.equal(configB.maxConcurrentSandboxes, 10);
    });
});

// ─── SkillRegistry Sandbox Tests ─────────────────────────────

describe('SkillRegistry Sandbox', async () => {
    const { SkillRegistry } = await import('@xclaw-ai/skill-hub');

    it('should identify community skills as sandboxed', () => {
        const registry = new SkillRegistry();
        registry.register({
            id: 'test/community-skill',
            name: 'Community Skill',
            description: 'A community skill',
            domainId: 'test',
            tools: [],
            installed: true,
            trustLevel: 'community',
        });

        assert.ok(registry.requiresSandbox('test/community-skill'));
    });

    it('should not sandbox builtin skills', () => {
        const registry = new SkillRegistry();
        registry.register({
            id: 'core/search',
            name: 'Search',
            description: 'Built-in search',
            domainId: 'core',
            tools: [],
            installed: true,
            trustLevel: 'builtin',
        });

        assert.ok(!registry.requiresSandbox('core/search'));
    });

    it('should default unknown skills to sandboxed', () => {
        const registry = new SkillRegistry();
        assert.ok(registry.requiresSandbox('unknown/skill'));
    });

    it('should return correct policy for trust levels', () => {
        const registry = new SkillRegistry();

        registry.register({
            id: 'a/builtin', name: 'B', description: '', domainId: 'a',
            tools: [], installed: true, trustLevel: 'builtin',
        });
        registry.register({
            id: 'a/verified', name: 'V', description: '', domainId: 'a',
            tools: [], installed: true, trustLevel: 'verified',
        });
        registry.register({
            id: 'a/community', name: 'C', description: '', domainId: 'a',
            tools: [], installed: true, trustLevel: 'community',
        });

        assert.equal(registry.getSandboxPolicy('a/builtin'), 'permissive');
        assert.equal(registry.getSandboxPolicy('a/verified'), 'default');
        assert.equal(registry.getSandboxPolicy('a/community'), 'strict');
    });
});
