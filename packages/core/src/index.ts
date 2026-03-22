// ============================================================
// @xclaw-ai/core — Agent Engine
// ============================================================

// Agent
export { Agent } from './agent/agent.js';
export type { AdditionalTool } from './agent/agent.js';
export { EventBus } from './agent/event-bus.js';

// LLM
export { LLMRouter } from './llm/llm-router.js';
export type { LLMAdapter, ChatOptions, TaskComplexity } from './llm/llm-router.js';
export { OpenAIAdapter } from './llm/openai-adapter.js';
export { AnthropicAdapter } from './llm/anthropic-adapter.js';
export { OllamaAdapter } from './llm/ollama-adapter.js';
export type { OllamaModel, OllamaModelInfo, OllamaHealthStatus } from './llm/ollama-adapter.js';
export { DeepSeekAdapter, XAIAdapter, OpenRouterAdapter, PerplexityAdapter, GroqAdapter, MistralAdapter, GeminiAdapter } from './llm/openai-compatible-adapters.js';

// Streaming
export { streamToSSE, collectStreamText, withHeartbeat } from './streaming/stream-writer.js';

// Memory
export { MemoryManager } from './memory/memory-manager.js';
export type { MemoryStore } from './memory/memory-manager.js';

// Tools
export { ToolRegistry } from './tools/tool-registry.js';
export type { ToolHandler } from './tools/tool-registry.js';

// Skills
export { SkillManager, defineSkill } from './skills/skill-manager.js';
export type { SkillDefinition } from './skills/skill-manager.js';

// Graph / Workflow
export { GraphEngine } from './graph/graph-engine.js';
export { WorkflowEngine, validateWorkflow } from './workflow/workflow-engine.js';
export type { ValidationError } from './workflow/workflow-engine.js';

// Monitoring
export { MonitoringService } from './monitoring/monitoring-service.js';
export type { MonitoringStore, MongoAuditLog as MonitoringAuditLog, MongoSystemLog as MonitoringSystemLog, AuditLogFilter, SystemLogFilter } from './monitoring/monitoring-service.js';

// RAG
export { RagEngine } from './rag/rag-engine.js';
export type { RagConfig, RetrievalResult, KnowledgeBaseStats, KBCollection, DocumentMeta, QueryHistoryEntry, KBAnalytics } from './rag/rag-engine.js';
export { DocumentProcessor } from './rag/document-processor.js';
export type { RagDocument, DocumentChunk, ChunkMetadata, ChunkingOptions, MultiModalContent } from './rag/document-processor.js';
export { OpenAIEmbeddingProvider, LocalEmbeddingProvider } from './rag/embedding-provider.js';
export type { EmbeddingProvider } from './rag/embedding-provider.js';
export { InMemoryVectorStore } from './rag/vector-store.js';
export type { VectorStore, VectorSearchResult } from './rag/vector-store.js';
export { hybridSearch, buildBM25Index, bm25Score, buildCitationContext } from './rag/hybrid-search.js';
export type { HybridSearchResult, HybridSearchOptions, } from './rag/hybrid-search.js';
export { WebCrawler } from './rag/web-crawler.js';
export type { CrawlOptions, CrawledPage, CrawlProgress } from './rag/web-crawler.js';
export { CrossEncoderReranker } from './rag/reranker.js';
export type { RerankerResult, RerankerOptions } from './rag/reranker.js';

// Tracing
export { Tracer } from './tracing/tracer.js';

// Guardrails (AI Security — OWASP LLM Top 10)
export { GuardrailPipeline } from './guardrails/guardrail-pipeline.js';
export { PromptInjectionDetector } from './guardrails/prompt-injection-detector.js';
export { OutputSanitizer } from './guardrails/output-sanitizer.js';
export { TopicScopeGuard } from './guardrails/topic-scope-guard.js';
export { LLMRateLimiter } from './guardrails/rate-limiter.js';
export type { GuardrailResult, GuardrailContext, GuardrailPipelineResult, InputGuardrail, OutputGuardrail } from './guardrails/types.js';

// Plugins
export { PluginManager } from './plugins/plugin-manager.js';
export type { PluginManagerDeps } from './plugins/plugin-manager.js';

// Image Generation
export { ImageGenService, IMAGE_MODELS } from './image/image-gen.js';
export type { ImageGenConfig, ImageGenRequest, ImageGenResult, GeneratedImage } from './image/image-gen.js';
