# AutoX - AI Agent Platform

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
</p>

> 🤖 Nền tảng AI Agent mã nguồn mở với giao diện kéo-thả Workflow Builder, hỗ trợ đa ngành: Lập trình, Y tế, và nhiều hơn nữa.

## ✨ Tính năng chính

- **🧠 Multi-LLM Support** — OpenAI, Anthropic Claude, Ollama (local)
- **🔧 Plugin/Skill System** — Kiến trúc module hóa, dễ mở rộng theo ngành
- **🎨 Drag & Drop Workflow Builder** — React Flow canvas với 16 loại node
- **💬 AI Chat Interface** — Giao diện chat thông minh với tool-calling
- **🏥 Healthcare Module** — Phân tích triệu chứng, quản lý thuốc, lịch hẹn
- **💻 Programming Module** — Shell, Git, file management, test runner
- **🔌 Event-Driven Architecture** — Pub/sub decoupled communication
- **📡 Real-time WebSocket** — Cập nhật trạng thái workflow theo thời gian thực
- **🐳 Docker Ready** — Deploy nhanh với Docker Compose

## 🏗️ Kiến trúc

```
autox/
├── packages/
│   ├── shared/          # Type definitions & constants
│   ├── core/            # Agent engine, LLM router, memory, workflow
│   │   ├── agent/       # Agent core + EventBus
│   │   ├── llm/         # Multi-provider LLM adapter
│   │   ├── memory/      # Vector memory with cosine similarity
│   │   ├── tools/       # Tool registry with approval system
│   │   ├── skills/      # Skill manager (plugin loader)
│   │   └── workflow/    # Workflow engine (BFS execution)
│   ├── skills/          # Skill packs
│   │   ├── programming/ # 11 tools: shell, git, files, tests...
│   │   └── healthcare/  # 11 tools: symptoms, medications, metrics...
│   ├── server/          # Express + WebSocket API
│   └── web/             # React + Vite + React Flow + Tailwind
│       ├── components/
│       │   ├── workflow/ # Canvas, NodePalette, Properties panel
│       │   ├── chat/    # Chat interface
│       │   ├── dashboard/ # Health monitoring
│       │   ├── skills/  # Skill management
│       │   └── settings/ # Agent configuration
│       └── stores/      # Zustand state management
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## 🚀 Bắt đầu

### Yêu cầu

- Node.js >= 20
- npm >= 10

### Cài đặt

```bash
# Clone repo
git clone https://github.com/tdduydev/AutoX.git
cd AutoX

# Cài dependencies
npm install

# Cấu hình environment
cp .env.example .env
# Sửa .env và thêm API key của bạn
```

### Chạy Development

```bash
# Chạy cả server + frontend
npm run dev

# Hoặc chạy riêng
npm run dev:server   # Backend API: http://localhost:3001
npm run dev:web      # Frontend UI: http://localhost:3000
```

### Docker

```bash
docker compose up -d
```

## 🔧 Cấu hình LLM

Hỗ trợ 3 provider:

| Provider | Model | Ghi chú |
|---|---|---|
| **OpenAI** | gpt-4o-mini, gpt-4o | Cần `OPENAI_API_KEY` |
| **Anthropic** | claude-3-haiku, claude-3-sonnet | Cần `ANTHROPIC_API_KEY` |
| **Ollama** | llama3, mistral, phi3 | Local, miễn phí |

## 📦 Skill Packs

### Programming (11 tools)
`shell_exec` · `file_read` · `file_write` · `file_list` · `git_status` · `git_diff` · `git_commit` · `git_log` · `run_tests` · `code_search` · `project_analyze`

### Healthcare (11 tools)
`symptom_analyze` · `medication_check_interaction` · `medication_schedule` · `health_metrics_log` · `health_metrics_query` · `appointment_manage` · `medical_record` · `health_report` · `clinical_note` · `icd_lookup`

### Tạo Skill Pack mới

```typescript
import { defineSkill } from '@autox/core';

export const mySkill = defineSkill({
  id: 'my-skill',
  name: 'My Custom Skill',
  version: '1.0.0',
  category: 'custom',
  tools: [
    {
      name: 'my_tool',
      description: 'Does something useful',
      parameters: { /* JSON Schema */ },
      execute: async (args) => {
        return { result: 'done' };
      },
    },
  ],
});
```

## 🎨 Workflow Builder

Giao diện kéo-thả với 16 loại node:

| Category | Nodes |
|---|---|
| **Trigger** | Manual, Cron, Webhook, Message, Event |
| **AI** | LLM Call |
| **Action** | Tool Call, HTTP Request, Run Code, Notification |
| **Control** | If/Else, Loop, Switch, Wait, Merge |
| **Data** | Transform, Memory Read/Write, Sub-Workflow |
| **Output** | Output |

## 🗺️ Roadmap

- [ ] Database persistence (PostgreSQL/MongoDB)
- [ ] Authentication & multi-user
- [ ] Skill marketplace
- [ ] Marketing & Sales skill packs
- [ ] Finance & Legal skill packs
- [ ] Smart Home integration
- [ ] Mobile app (React Native)
- [ ] Webhook triggers & Cron scheduler
- [ ] Workflow versioning & rollback
- [ ] AI model fine-tuning interface

## 🤝 Đóng góp

Contributions welcome! Vui lòng tạo Issue hoặc Pull Request.

## 📄 License

MIT © [Trần Đức Duy](https://github.com/tdduydev)
