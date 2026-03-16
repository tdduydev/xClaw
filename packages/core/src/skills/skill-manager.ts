// ============================================================
// Skill Manager - Load, register, and manage skill plugins
// ============================================================

import type { SkillManifest, SkillConfigField, ToolDefinition } from '@autox/shared';
import { ToolRegistry, type ToolExecutor } from '../tools/tool-registry.js';
import { EventBus } from '../agent/event-bus.js';

export interface SkillPlugin {
  manifest: SkillManifest;
  activate(context: SkillContext): Promise<void>;
  deactivate?(): Promise<void>;
}

export interface SkillContext {
  toolRegistry: ToolRegistry;
  eventBus: EventBus;
  config: Record<string, unknown>;
  log: (message: string) => void;
}

export class SkillManager {
  private skills: Map<string, SkillPlugin> = new Map();
  private configs: Map<string, Record<string, unknown>> = new Map();
  private activeSkills: Set<string> = new Set();

  constructor(
    private toolRegistry: ToolRegistry,
    private eventBus: EventBus,
  ) {}

  async register(plugin: SkillPlugin): Promise<void> {
    this.skills.set(plugin.manifest.id, plugin);
    await this.eventBus.emit({
      type: 'skill:registered',
      payload: { skillId: plugin.manifest.id, name: plugin.manifest.name },
      source: 'skill-manager',
      timestamp: new Date().toISOString(),
    });
  }

  async activate(skillId: string, config?: Record<string, unknown>): Promise<void> {
    const plugin = this.skills.get(skillId);
    if (!plugin) throw new Error(`Skill not found: ${skillId}`);
    if (this.activeSkills.has(skillId)) return;

    if (config) this.configs.set(skillId, config);

    const context: SkillContext = {
      toolRegistry: this.toolRegistry,
      eventBus: this.eventBus,
      config: this.configs.get(skillId) ?? {},
      log: (msg: string) => console.log(`[skill:${skillId}] ${msg}`),
    };

    await plugin.activate(context);
    this.activeSkills.add(skillId);

    await this.eventBus.emit({
      type: 'skill:activated',
      payload: { skillId, name: plugin.manifest.name },
      source: 'skill-manager',
      timestamp: new Date().toISOString(),
    });
  }

  async deactivate(skillId: string): Promise<void> {
    const plugin = this.skills.get(skillId);
    if (!plugin || !this.activeSkills.has(skillId)) return;

    if (plugin.deactivate) await plugin.deactivate();

    // Unregister tools
    for (const tool of plugin.manifest.tools) {
      this.toolRegistry.unregister(tool.name);
    }

    this.activeSkills.delete(skillId);
  }

  getManifest(skillId: string): SkillManifest | undefined {
    return this.skills.get(skillId)?.manifest;
  }

  listAll(): SkillManifest[] {
    return [...this.skills.values()].map(s => s.manifest);
  }

  listActive(): SkillManifest[] {
    return [...this.skills.values()]
      .filter(s => this.activeSkills.has(s.manifest.id))
      .map(s => s.manifest);
  }

  isActive(skillId: string): boolean {
    return this.activeSkills.has(skillId);
  }
}

// ─── Helper to create a skill plugin easily ─────────────────

export function defineSkill(
  manifest: SkillManifest,
  toolImplementations: Record<string, ToolExecutor>,
): SkillPlugin {
  return {
    manifest,
    async activate(context: SkillContext) {
      for (const toolDef of manifest.tools) {
        const executor = toolImplementations[toolDef.name];
        if (executor) {
          context.toolRegistry.register(toolDef, executor);
          context.log(`Registered tool: ${toolDef.name}`);
        }
      }
    },
    async deactivate() {
      // Tools will be unregistered by SkillManager
    },
  };
}
