// ============================================================
// Tool Registry & Executor - Sandbox for running tools safely
// ============================================================

import type { ToolDefinition, ToolCall, ToolResult } from '@autox/shared';
import { EventBus } from '../agent/event-bus.js';

export type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown>;

interface RegisteredTool {
  definition: ToolDefinition;
  executor: ToolExecutor;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private approvalCallback?: (tool: ToolDefinition, args: Record<string, unknown>) => Promise<boolean>;

  constructor(private eventBus: EventBus) {}

  register(definition: ToolDefinition, executor: ToolExecutor): void {
    this.tools.set(definition.name, { definition, executor });
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  getDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name)?.definition;
  }

  getAllDefinitions(): ToolDefinition[] {
    return [...this.tools.values()].map(t => t.definition);
  }

  getByCategory(category: string): ToolDefinition[] {
    return [...this.tools.values()]
      .filter(t => t.definition.category === category)
      .map(t => t.definition);
  }

  setApprovalCallback(cb: (tool: ToolDefinition, args: Record<string, unknown>) => Promise<boolean>): void {
    this.approvalCallback = cb;
  }

  async execute(call: ToolCall): Promise<ToolResult> {
    const startTime = Date.now();
    const registered = this.tools.get(call.name);

    if (!registered) {
      return {
        toolCallId: call.id,
        success: false,
        result: null,
        error: `Tool not found: ${call.name}`,
        duration: Date.now() - startTime,
      };
    }

    // Check approval if needed
    if (registered.definition.requiresApproval && this.approvalCallback) {
      const approved = await this.approvalCallback(registered.definition, call.arguments);
      if (!approved) {
        return {
          toolCallId: call.id,
          success: false,
          result: null,
          error: 'Tool execution denied by user',
          duration: Date.now() - startTime,
        };
      }
    }

    try {
      await this.eventBus.emit({
        type: 'tool:executing',
        payload: { tool: call.name, arguments: call.arguments },
        source: 'tool-registry',
        timestamp: new Date().toISOString(),
      });

      // Execute with timeout
      const timeout = registered.definition.timeout ?? 30000;
      const result = await Promise.race([
        registered.executor(call.arguments),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Tool timeout after ${timeout}ms`)), timeout)),
      ]);

      const toolResult: ToolResult = {
        toolCallId: call.id,
        success: true,
        result,
        duration: Date.now() - startTime,
      };

      await this.eventBus.emit({
        type: 'tool:completed',
        payload: { tool: call.name, result: toolResult },
        source: 'tool-registry',
        timestamp: new Date().toISOString(),
      });

      return toolResult;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const toolResult: ToolResult = {
        toolCallId: call.id,
        success: false,
        result: null,
        error,
        duration: Date.now() - startTime,
      };

      await this.eventBus.emit({
        type: 'tool:failed',
        payload: { tool: call.name, error },
        source: 'tool-registry',
        timestamp: new Date().toISOString(),
      });

      return toolResult;
    }
  }

  async executeAll(calls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(calls.map(c => this.execute(c)));
  }
}
