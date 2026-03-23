import { randomUUID } from 'node:crypto';
import type {
  AgentConfig,
  LLMMessage,
  LLMResponse,
  ToolCall,
  ToolResult,
  StreamEvent,
  ToolDefinition,
  SandboxExecutionResult,
} from '@xclaw-ai/shared';
import { EventBus } from './event-bus.js';
import { LLMRouter } from '../llm/llm-router.js';
import { MemoryManager } from '../memory/memory-manager.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { Tracer } from '../tracing/tracer.js';

/** In-request tool: a tool definition + its handler, passed directly to chat/chatStream */
export interface AdditionalTool {
  definition: ToolDefinition;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

/** Sandbox executor interface — decoupled from @xclaw-ai/sandbox to avoid circular deps */
export interface SandboxToolExecutor {
  execute(
    call: ToolCall,
    definition: ToolDefinition,
    handler: (args: Record<string, unknown>) => Promise<unknown>,
    options: { tenantId: string },
  ): Promise<ToolResult>;
}

/** Configuration for the Agent's sandbox integration */
export interface AgentSandboxConfig {
  /** Sandbox executor instance */
  executor: SandboxToolExecutor;
  /** Tenant ID for sandbox scoping */
  tenantId: string;
  /** Whether sandbox is enabled */
  enabled: boolean;
}

export class Agent {
  readonly config: AgentConfig;
  readonly events: EventBus;
  readonly llm: LLMRouter;
  readonly memory: MemoryManager;
  readonly tools: ToolRegistry;
  readonly tracer: Tracer;
  private sandboxConfig?: AgentSandboxConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.events = new EventBus();
    this.llm = new LLMRouter(config.llm);
    this.memory = new MemoryManager();
    this.tools = new ToolRegistry();
    this.tracer = new Tracer();
  }

  /**
   * Configure sandbox execution for this agent.
   * When enabled, tools with sandbox requirements will be routed
   * through the OpenShell sandbox executor.
   */
  configureSandbox(sandboxConfig: AgentSandboxConfig): void {
    this.sandboxConfig = sandboxConfig;
  }

  /**
   * Chat with the agent (non-streaming). Returns full response.
   * Pass `additionalTools` to inject per-request tools (e.g. domain skill tools) without mutating shared state.
   */
  async chat(sessionId: string, userMessage: string, ragContext?: string, images?: string[], additionalTools?: AdditionalTool[]): Promise<string> {
    const span = this.tracer.startSpan('agent:chat', 'agent');

    // Save user message to history
    await this.memory.addMessage(sessionId, {
      id: randomUUID(),
      sessionId,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    // Build messages
    await this.memory.loadHistory(sessionId, 20);
    const messages = this.buildMessages(sessionId, userMessage, ragContext, images);

    // Merge registered tools + per-request additional tools
    const allToolDefs = [
      ...this.tools.getDefinitions(),
      ...(additionalTools?.map((t) => t.definition) ?? []),
    ];

    // Tool-calling loop
    let response: LLMResponse;
    let iterations = 0;

    while (iterations < this.config.maxToolIterations) {
      iterations++;
      response = await this.llm.chat(messages, allToolDefs);

      if (!response.toolCalls?.length) {
        // No tool calls — we have the final answer
        await this.memory.addMessage(sessionId, {
          id: randomUUID(),
          sessionId,
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
        });

        this.tracer.endSpan(span.id, { iterations, usage: response.usage });
        await this.events.emit({
          type: 'agent:response',
          payload: { sessionId, content: response.content, usage: response.usage },
          source: this.config.id,
          timestamp: new Date().toISOString(),
        });

        return response.content;
      }

      // Execute tool calls (additional tools take priority over registry)
      const toolResults = await this.executeToolCalls(response.toolCalls, additionalTools);

      // Add assistant message with tool calls + results to context
      messages.push({
        role: 'assistant',
        content: response.content || '',
        toolCalls: response.toolCalls,
      });

      for (const result of toolResults) {
        messages.push({
          role: 'tool',
          content: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
          toolCallId: result.toolCallId,
        });
      }
    }

    // Max iterations reached
    this.tracer.endSpan(span.id, { iterations, maxReached: true });
    return 'I reached the maximum number of tool iterations. Here is what I have so far.';
  }

  /**
   * Stream chat response via async generator.
   * Pass `additionalTools` to inject per-request tools (e.g. domain skill tools) without mutating shared state.
   */
  async *chatStream(sessionId: string, userMessage: string, ragContext?: string, images?: string[], additionalTools?: AdditionalTool[]): AsyncGenerator<StreamEvent> {
    const span = this.tracer.startSpan('agent:chatStream', 'agent');

    await this.memory.addMessage(sessionId, {
      id: randomUUID(),
      sessionId,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    await this.memory.loadHistory(sessionId, 20);
    const messages = this.buildMessages(sessionId, userMessage, ragContext, images);

    const allToolDefs = [
      ...this.tools.getDefinitions(),
      ...(additionalTools?.map((t) => t.definition) ?? []),
    ];
    let iterations = 0;

    while (iterations < this.config.maxToolIterations) {
      iterations++;

      const stream = this.llm.chatStream(messages, allToolDefs);

      let fullContent = '';
      const toolCalls: ToolCall[] = [];

      for await (const event of stream) {
        if (event.type === 'text-delta') {
          fullContent += event.delta;
          yield event;
        } else if (event.type === 'tool-call-start') {
          toolCalls.push({ id: event.toolCallId, name: event.toolName, arguments: {} });
          yield event;
        } else if (event.type === 'tool-call-args') {
          yield event;
        } else if (event.type === 'tool-call-end') {
          yield event;
        } else if (event.type === 'finish') {
          if (toolCalls.length === 0) {
            // Final response
            await this.memory.addMessage(sessionId, {
              id: randomUUID(),
              sessionId,
              role: 'assistant',
              content: fullContent,
              timestamp: new Date().toISOString(),
            });
            this.tracer.endSpan(span.id, { iterations });
            yield event;
            return;
          }
        } else if (event.type === 'error') {
          this.tracer.failSpan(span.id, event.error);
          yield event;
          return;
        }
      }

      // Execute tool calls if any
      if (toolCalls.length > 0) {
        const results = await this.executeToolCalls(toolCalls, additionalTools);

        for (const result of results) {
          yield { type: 'tool-result', toolCallId: result.toolCallId, result };
        }

        // Feed results back
        messages.push({
          role: 'assistant',
          content: fullContent,
          toolCalls,
        });
        for (const result of results) {
          messages.push({
            role: 'tool',
            content: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
            toolCallId: result.toolCallId,
          });
        }
      }
    }

    yield { type: 'error', error: 'Max tool iterations reached' };
  }

  private buildMessages(sessionId: string, userMessage: string, ragContext?: string, images?: string[]): LLMMessage[] {
    const messages: LLMMessage[] = [];

    // System prompt (augmented with RAG context if available)
    let systemPrompt = this.config.systemPrompt || this.config.persona;
    if (ragContext) {
      systemPrompt = `${systemPrompt}\n\n## Knowledge Base Context\nThe following information was retrieved from the knowledge base. Use it to answer accurately. Cite sources when possible.\n\n${ragContext}`;
    }
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Conversation history (from cache)
    const history = this.memory.getHistorySync(sessionId);
    for (const msg of history) {
      // The last user message in history is the current one — attach images to it
      const isCurrentUserMsg = msg.role === 'user' && msg.content === userMessage && images?.length;
      messages.push({
        role: msg.role as LLMMessage['role'],
        content: msg.content,
        ...(isCurrentUserMsg ? { images } : {}),
        toolCalls: msg.toolCalls,
      });
    }

    return messages;
  }

  private async executeToolCalls(toolCalls: ToolCall[], additionalTools?: AdditionalTool[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      await this.events.emit({
        type: 'tool:started',
        payload: { name: call.name, arguments: call.arguments },
        source: this.config.id,
        timestamp: new Date().toISOString(),
      });

      // Check additional (per-request) tools first, fall back to shared registry
      const additionalTool = additionalTools?.find((t) => t.definition.name === call.name);
      let result: ToolResult;

      // Determine if this tool requires sandbox execution
      const definition = additionalTool?.definition ?? this.tools.getDefinition(call.name);
      const needsSandbox = this.sandboxConfig?.enabled && definition?.sandbox?.required;

      if (needsSandbox && this.sandboxConfig?.executor) {
        // Route through sandbox executor (OpenShell)
        const handler = additionalTool
          ? additionalTool.handler
          : (args: Record<string, unknown>) => this.tools.execute({ ...call, arguments: args }).then((r) => r.result);

        result = await this.sandboxConfig.executor.execute(
          call,
          definition!,
          handler,
          { tenantId: this.sandboxConfig.tenantId },
        );
      } else if (additionalTool) {
        // Direct execution for non-sandboxed additional tools
        const start = Date.now();
        try {
          const res = await additionalTool.handler(call.arguments);
          result = { toolCallId: call.id, success: true, result: res, duration: Date.now() - start };
        } catch (err) {
          result = { toolCallId: call.id, success: false, result: null, error: err instanceof Error ? err.message : String(err), duration: Date.now() - start };
        }
      } else {
        // Direct execution for registered tools
        result = await this.tools.execute(call);
      }
      results.push(result);

      await this.events.emit({
        type: result.success ? 'tool:completed' : 'tool:failed',
        payload: { name: call.name, result: result.result, duration: result.duration },
        source: this.config.id,
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  }
}
