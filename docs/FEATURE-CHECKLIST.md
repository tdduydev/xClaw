# xClaw --- Feature Development Checklist

> Master checklist for platform optimization and feature development.
> Generated from project audit + industry research (2026).

* * *

## ✅ Recently Completed (This Session)

-   [x] **Multi-agent hierarchy (Google ADK-inspired)** --- `AgentHierarchy` class with parent/child relationships and `transfer_to_agent` delegation, `SequentialWorkflowAgent`, `ParallelWorkflowAgent`, `LoopWorkflowAgent`, `createWorkflowAgent()` factory in `@xclaw-ai/core`

-   [x] **A2A Protocol** --- `A2AServer`, `RemoteA2AAgent`, `A2ARegistry` for cross-service agent-to-agent communication in `packages/core/src/a2a/`

-   [x] **transfer_to_agent tool** --- LLM-driven agent delegation: injected into agent tool set when `allowTransfer=true`, orchestrator detects and routes in `Agent.chat()` / `chatStream()`

-   [x] **Multi-agent types** --- `SubAgentRef`, `WorkflowAgentType`, `WorkflowAgentConfig`, `WorkflowAgentResult`, `AgentTransferRequest`, `A2AAgentCard`, `A2ACapability`, `A2ATask`, `A2ATaskResult`, `A2AArtifact` added to `@xclaw-ai/shared`; `AgentConfig` extended with `subAgents` + `allowTransfer`

-   [x] **Agent Builder: Provider selector** --- 12-provider dropdown (`openai`, `anthropic`, `ollama`, `google`, `groq`, `mistral`, `deepseek`, `xai`, `openrouter`, `perplexity`, `huggingface`, `custom`) with auto-default model per provider, **★ Tenant Default** badge, non-tenant provider warning

-   [x] **Agent Builder: Multi-Agent Settings** --- `allowTransfer` toggle + `subAgents` list in Settings tab + live preview panel (transfer badge + sub-agents count)

-   [x] **Tenant modelDefaults API** --- `GET /api/settings` returns `modelDefaults: { provider, model, temperature, maxTokens }` from tenant DB; Agent Builder reads on mount and pre-fills provider/model fields

-   [x] **HuggingFace + Custom LLM providers** --- 2 new provider options in `LLMProvider` union type (now 12 total); reflected in Agent Builder dropdown and docs

-   [x] **Chat voice/image toolbar** --- Mic button (STT via `useVoice`), Image button (camera-capable), TTS Volume2 button on assistant messages

-   [x] **Workflow as agent tool** --- `buildWorkflowTools()` gives agent `list_workflows` + `trigger_workflow` tools mid-conversation

-   [x] **Sentiment analysis** --- `GET /api/analytics/sentiment` with bilingual keyword scoring (VN+EN), per-session analysis

-   [x] **Topic clustering** --- `GET /api/analytics/topics` with 8 predefined categories, bilingual keyword matching

-   [x] **PII detection & redaction** --- `scanPII()` in `pii.ts` (9 pattern types), auto-redacts stored messages, `GET /api/analytics/pii` report

-   [x] **Widget analytics** --- `trackEvent()` in embeddable widget + `POST/GET /api/widget/analytics` backend with batch ingestion

-   [x] **Discord channel** --- Full `DiscordChannel` class with WebSocket Gateway v10, REST API, heartbeat, auto-reconnect

-   [x] **Channel + Domain integration** --- Channels now support `domainId` for domain-specific persona injection

-   [x] **Workflow triggers in chat** --- `message`-type workflows auto-trigger via regex/keyword matching during chat

-   [x] **OCR/Vision pipeline** --- Full image support: LLMMessage.images → Ollama adapter (base64) → Agent.chat(images) → chat handler. Use `qwen2.5vl` model

-   [x] **Interactive AI blocks** --- AI can return quick-reply buttons via ```` ```interactive-blocks``` ```` markdown blocks; users click to auto-send

-   [x] **GitHub integration** --- Full REST API v3: list_repos, create_issue, list_issues, create_pull_request, get_file_contents

-   [x] **Brave Search integration** --- web_search and news_search via Brave Search API

-   [x] **Notion integration** --- search, get_page, create_page, query_database via Notion API v1

-   [x] **Slack API integration** --- send_message, list_channels, read_messages, upload_file via Slack Web API

-   [x] **HuggingFace integration** --- inference, list_models, list_datasets, get_model_info, text_embedding

-   [x] **W&B integration** --- log_run, list_runs, get_run, log_artifact, create_report via W&B REST + GraphQL API

-   [x] **Gmail integration** --- send_email, read_emails, create_draft + new_email polling trigger

-   [x] **Google Calendar integration** --- list_events, create_event, delete_event + event_starting_soon polling trigger

-   [x] **Groq adapter** --- `GroqAdapter` (llama-3.3-70b-versatile) via Groq OpenAI-compatible API

-   [x] **Mistral adapter** --- `MistralAdapter` (mistral-large-latest) via Mistral AI API

-   [x] **Gemini adapter** --- `GeminiAdapter` (gemini-2.0-flash) via Google Generative Language OpenAI-compatible endpoint

-   [x] **Zustand auth/chat/agents stores** --- `useAuthStore`, `useChatStore`, `useAgentsStore` in `packages/web/src/stores/`

-   [x] **Zustand channels/domains/settings stores** --- `useChannelsStore`, `useDomainsStore`, `useSettingsStore` with full state + actions

-   [x] **Zustand page migrations** --- DomainsPage, ChannelsPage, SettingsPage LanguageTab using centralized stores

-   [x] **Model routing + fallback chains** --- `TaskComplexity` (`fast`/`smart`/`cheap`) in `LLMRouter` with `ROUTING_CHAINS` automatic fallback

-   [x] **Workflow cron scheduler** --- Lightweight 5-field cron parser, `startWorkflowScheduler()` with minute-boundary alignment, DB persistence

-   [x] **Workflow webhook triggers** --- Public `POST /webhooks/workflow/:workflowId` route, optional `x-webhook-secret` validation

-   [x] **Skill Hub SDK** --- `SkillRegistry` class with `importFromAPI()`, `search()`, `markInstalled()`, `formatSkillId()`, `describeSkill()` helpers

-   [x] **Domain tools → Agent ToolRegistry** --- `buildDomainTools()` in `packages/gateway/src/chat.ts` wires domain skills as callable tools

-   [x] **Zustand stores (channels/domains/settings)** --- `useChannelsStore`, `useDomainsStore`, `useSettingsStore` with full state + actions

-   [x] **Zustand migration** --- DomainsPage, ChannelsPage, SettingsPage (LanguageTab) migrated to centralized stores

-   [x] **Workflow cron scheduler** --- Lightweight 5-field cron parser, schedule-triggered workflows with DB persistence

-   [x] **Workflow webhook triggers** --- `POST /webhooks/workflow/:workflowId` public route, optional secret header

-   [x] **Model routing** --- `TaskComplexity` (`fast`/`smart`/`cheap`) routing chains in `LLMRouter`

-   [x] **Fallback chains** --- `ROUTING_CHAINS` with automatic provider fallback on failure

-   [x] **Dev Docs Knowledge Base** --- `packages/doc-mcp` MCP server + `data/dev-docs` seed docs + web UI (`DevDocsPage`) + gateway CRUD API + CLI commands + VS Code MCP config

-   [x] **Skill Hub SDK** --- `SkillRegistry` class, full types, `importFromAPI()`, `formatSkillId()`, `describeSkill()` helpers

* * *

## 🔴 Critical --- Architecture Gaps

### 1. Domain Skills → Agent ToolRegistry

-   [x] Auto-register domain skill tools into Agent's `ToolRegistry` during chat
-   [x] `buildDomainTools()` in `packages/gateway/src/chat.ts` wires domain skill tools into each chat request
-   [x] Agent can invoke domain-specific tools via function calling
-   **Impact**: High --- this is the core value prop of domain packs

### 2. Integration Execute Handlers

-   [x] Gmail --- implement actual Google API calls (send, read, search)
-   [x] Google Calendar --- implement event CRUD
-   [x] GitHub --- implement repo/issue/PR operations
-   [x] Notion --- implement page/database operations
-   [x] Slack API --- implement message/channel operations
-   [x] Brave Search --- implement web search API
-   [x] Tavily Search --- implement search API
-   [x] HuggingFace --- implement model inference
-   [x] W&B (Weights & Biases) --- implement experiment tracking
-   [ ] iMessage --- evaluate feasibility (macOS-only)
-   [ ] Telegram API --- implement beyond channel bot
-   **Impact**: High --- framework is built, execute handlers all return stubs

### 3. State Management (Zustand)

-   [x] Create Zustand stores for: auth, chat, agents (in `packages/web/src/stores/`)
-   [x] Create Zustand stores for: channels, domains, settings
-   [x] Migrate from per-component `useState` to centralized stores (DomainsPage, ChannelsPage, SettingsPage)
-   [x] Enables cross-component state sharing (e.g., active model, active domain)
-   **Impact**: Medium --- UX consistency, code quality, less prop drilling

* * *

## 🟡 Medium Priority --- Feature Completion

### 4. Channel Plugins

-   [x] **Discord** --- Full `DiscordChannel` class with Gateway WebSocket v10, REST API, heartbeat, auto-reconnect
-   [x] Initialize Slack, MSTeams, WhatsApp, Zalo channels --- All channel classes implemented (Slack, MSTeams, WhatsApp, Zalo, Discord)
-   [ ] Add channel-specific config UI in ChannelsPage (token, webhook URL, etc.)
-   **Status**: All 6 channels implemented (Telegram, Discord, Slack, MSTeams, WhatsApp, Zalo). Config UI pending.

### 5. Skill Hub / Marketplace

-   [x] Implement skill marketplace backend (browse, install, rate skills) --- `packages/gateway/src/marketplace.ts`
-   [x] `packages/skill-hub/src/index.ts` --- full `SkillRegistry` SDK with `importFromAPI()`, search, install tracking
-   [x] Connect `SkillMarketplacePage` to real API --- calls `getMarketplaceSkills()` with `SAMPLE_SKILLS` fallback
-   [x] Skill publishing pipeline (package, validate, upload) --- `POST /publish/validate`, `POST /publish`, `GET /published` routes in `marketplace.ts`
-   [x] Anthropic MCP adapter for external tool servers --- SSE + HTTP transport support in `MCPClientManager`, built-in `brave-search` MCP server
-   **Status**: Backend complete; frontend `SkillMarketplacePage` connected to API with sample fallback

### 6. Workflow ↔ Chat Deep Integration

-   [x] Message trigger check (regex/keyword) --- DONE
-   [x] Schedule-based workflow triggers (cron) --- `packages/gateway/src/workflow-scheduler.ts`
-   [x] Webhook-triggered workflows --- `POST /webhooks/workflow/:workflowId`
-   [x] Workflow as agent tool (agent can trigger workflow mid-conversation) --- `buildWorkflowTools()` provides `list_workflows` + `trigger_workflow` AdditionalTools
-   [x] Workflow step results fed back into chat context --- execution result (status, nodeCount, error) returned inline to agent
-   [ ] Visual workflow debugging in chat (show which nodes executed)

### 7. Multi-Model / Provider Flexibility

-   [x] Add Google Gemini adapter
-   [x] Add Mistral adapter
-   [x] Add Groq adapter (fast inference)
-   [x] Model routing --- `TaskComplexity` (`fast`/`smart`/`cheap`) chains in `LLMRouter`
-   [x] Fallback chains --- `ROUTING_CHAINS` with automatic provider fallback on failure
-   [x] Cost tracking per model/conversation --- `GET /api/analytics/cost` with daily/model/conversation breakdowns

* * *

## 🟢 Enhancement --- New Features (Industry Research)

### 8. Voice / TTS / STT

-   [x] Speech-to-Text input (browser MediaRecorder API → Whisper) --- `useVoice.ts` hook + `/api/voice/transcribe` endpoint
-   [x] Text-to-Speech output (browser SpeechSynthesis or cloud TTS) --- `useVoice.ts` SpeechSynthesis + `/api/voice/tts` OpenAI TTS
-   [ ] Voice message support in channels (Telegram voice notes)
-   [ ] Real-time voice conversation mode

### 9. Human Handoff / Escalation

-   [x] Define escalation triggers (sentiment, keyword, confidence threshold) --- `handoff.ts` CRUD routes + `checkEscalationTriggers()`
-   [x] Agent → human transfer protocol --- `/api/handoff/escalate` endpoint
-   [x] Live agent dashboard (view active conversations, take over) --- `/api/handoff/queue`, `/assign`, `/stats`
-   [x] Warm transfer (context passed to human agent) --- `/api/handoff/:id/context` (session + last 50 messages)
-   [x] Return to AI after human resolution --- `/api/handoff/:id/resolve` with `returnToAI` flag

### 10. Conversation Analytics & Insights

-   [x] Dashboard: conversation volume, avg response time, resolution rate --- `AnalyticsPage.tsx` + `/api/analytics/overview`
-   [x] Topic clustering (what are users asking about?) --- `GET /api/analytics/topics` with 8 bilingual topic categories
-   [x] Sentiment analysis per conversation --- `GET /api/analytics/sentiment` with keyword-based scoring (VN+EN)
-   [x] Agent performance metrics (accuracy, hallucination rate) --- `/api/analytics/performance` (latency, token usage, cost, error rate, model breakdown)
-   [x] Export analytics data (CSV, PDF reports) --- `/api/analytics/export` CSV export

### 11. No-Code / Low-Code Builder

-   [x] Visual agent builder (drag-and-drop persona, skills, tools) --- `AgentBuilderPage.tsx` with drag-and-drop skills/tools, persona config, model settings, preview panel
-   [x] Template library for common agent types --- `PromptLabPage.tsx` with 6 built-in templates
-   [x] Prompt engineering UI (test prompts with different models) --- Playground tab with model selection, temperature, test execution
-   [ ] A/B testing for agent configurations

### 12. Advanced RAG

-   [x] Hybrid search (vector + keyword BM25) --- `hybrid-search.ts` BM25 + vector cosine fusion
-   [x] Re-ranking pipeline (cross-encoder) --- `CrossEncoderReranker` in `packages/core/src/rag/reranker.ts` with 7 scoring signals
-   [x] Multi-modal RAG (index images, tables, charts) --- `processHTML()` in `DocumentProcessor` extracts tables/images/code blocks with `MultiModalContent` typed chunks
-   [x] Chunking strategy configuration (size, overlap, method) --- `GET/PUT /api/knowledge/chunking-config` + `RagEngine` configurable defaults
-   [x] Source citation in responses (link to original document) --- `buildCitationContext()` with numbered references
-   [x] Auto-refresh stale knowledge (scheduled re-indexing) --- `GET /api/knowledge/stale`, `POST /refresh/:id`, `POST /refresh-all` routes + `RagEngine` methods

### 13. Security & Compliance

-   [x] Audit log viewer in UI (currently backend-only) --- `AdminPage.tsx` Audit tab
-   [x] PII detection and redaction in conversations --- `scanPII()` in `pii.ts` (9 pattern types), auto-redacts in stored messages, `GET /api/analytics/pii` report
-   [x] Data retention policies (auto-delete old conversations) --- `retention.ts` routes + `RetentionTab` UI
-   [x] Rate limiting per user/tenant --- API key scopes per tenant
-   [x] API key management UI --- `AdminPage.tsx` API Keys tab + `api-keys.ts` routes
-   [x] SOC 2 / GDPR compliance documentation --- `docs/content/docs/compliance/` with SOC 2 and GDPR guides

### 14. Multi-Tenant Admin

-   [x] Tenant management UI (create, configure, suspend tenants) --- `AdminPage.tsx` Tenants tab
-   [ ] Per-tenant usage quotas and billing
-   [ ] Tenant-specific model/provider configuration
-   [ ] White-label customization (logo, colors, domain)

### 15. Plugin Ecosystem

-   [x] Plugin CLI (`xclaw plugin create`, `xclaw plugin publish`) --- `cli/src/commands/plugin.ts` (create, validate, pack)
-   [ ] Plugin versioning and dependency resolution
-   [x] Plugin marketplace (integrated with Skill Hub) --- Existing `marketplace.ts` routes
-   [ ] Plugin sandbox (isolated execution environment)
-   [ ] Hot-reload plugins without server restart

### 16. Embedding / Widget

-   [x] EmbedChatPage exists (token-based auth)
-   [x] Embeddable widget script (`<script src="xclaw-widget.js">`) --- `xclaw-widget.js` self-contained IIFE
-   [x] Widget customization (position, theme, initial message) --- data attributes: position, theme, title, primary-color, initial-message
-   [x] Widget analytics (conversion tracking) --- `trackEvent()` in widget (loaded/opened/closed/message_sent/response_received), `POST/GET /api/widget/analytics` backend

* * *

## 📋 Tech Debt / Optimization

-   [x] **Zustand migration** --- DomainsPage, ChannelsPage, SettingsPage migrated; remaining pages use local state for transient UI
-   [x] **Error boundaries** --- `ErrorBoundary` component wrapping all page routes in `App.tsx`
-   [x] **Loading states** --- `PageSkeleton`, `CardSkeleton`, `TableSkeleton` components in `Skeleton.tsx`
-   [ ] **TypeScript strict** --- Fix any remaining `any` types in gateway/web
-   [ ] **Test coverage** --- Unit tests for core agent, workflow engine, DB layer
-   [ ] **API documentation** --- OpenAPI/Swagger spec for gateway endpoints
-   [ ] **Monitoring** --- Prometheus metrics endpoint, Grafana dashboards
-   [ ] **CI/CD** --- GitHub Actions: lint, type-check, test, build, deploy

* * *

## Priority Matrix

| Priority | Items                                                     | Effort  |
| -------- | --------------------------------------------------------- | ------- |
| 🔴 P0    | Domain tools → ToolRegistry, Integration handlers         | High    |
| 🟡 P1    | Channel activation, Skill Hub, Workflow deep integration  | Medium  |
| 🟡 P1    | Zustand stores, Multi-model adapters                      | Medium  |
| 🟢 P2    | Voice, Human handoff, Analytics                           | High    |
| 🟢 P2    | Advanced RAG, No-code builder                             | High    |
| 🟢 P3    | Security/compliance, Multi-tenant admin, Plugin ecosystem | High    |
| 📋 Debt  | Testing, API docs, CI/CD, Monitoring                      | Ongoing |
