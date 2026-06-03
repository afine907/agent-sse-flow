# agent-sse-flow

> A lightweight React component for visualizing AI Agent execution traces from SSE streams.
> Free, unlimited, local-first. No cloud account required.

[![NPM Version](https://img.shields.io/npm/v/agent-sse-flow.svg)](https://www.npmjs.com/package/agent-sse-flow)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/afine907/agent-sse-flow/blob/main/LICENSE)
[![CI](https://github.com/afine907/agent-sse-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/afine907/agent-sse-flow/actions/workflows/ci.yml)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/agent-sse-flow)](https://bundlephobia.com/package/agent-sse-flow)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-188%20passed-brightgreen)](https://github.com/afine907/agent-sse-flow/actions/workflows/ci.yml)

**[Live Demo](https://afine907.github.io/agent-sse-flow/)** · [NPM](https://www.npmjs.com/package/agent-sse-flow) · [Documentation](docs/) · [Examples](examples/) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

---

## Why agent-sse-flow?

| | agent-sse-flow | LangSmith |
|---|---|---|
| **Price** | Free, open-source | Free tier limited |
| **Trace limit** | Unlimited | 5,000/month |
| **Data location** | Local (never leaves your machine) | Cloud |
| **Setup** | 5 minutes, `npm install` | Account required |
| **Dependencies** | React + 2 small libs | LangChain ecosystem |
| **Self-hosted** | Yes | No |

---

## Features

### Core Visualization
- **Real-time SSE streaming** with automatic reconnection
- **6 view modes**: List, Timeline, Waterfall, DAG, Swimlane, Cluster
- **Virtual scrolling** — handles 100K+ events smoothly
- **Dark/Light themes** with full CSS variable customization
- **Responsive layout** — works on mobile and desktop

### Filtering & Search
- **Full-text search** (Ctrl/Cmd+K) across all event fields
- **Time range filter** with datetime pickers
- **Event type filter** checkboxes
- **Agent filter** with drag-to-reorder
- **Bookmarks & pinning** for important events

### Analytics & Debugging
- **Cost dashboard** — total cost, per-agent breakdown, pie chart
- **Token usage chart** — cumulative tokens over time
- **Performance bottleneck detection** — slow tools, high cost, error rates
- **Event breakpoints** — pause on specific event types
- **Event snapshots** — save/load event state via IndexedDB
- **Event diff** — side-by-side comparison of two events
- **JSON syntax highlighting** in tool arguments
- **Duration visualization bars** for tool calls

### Data Management
- **Export** events as JSON or CSV
- **Record** raw SSE streams as JSONL for replay
- **IndexedDB persistence** for session restore
- **Event stream recording** for debugging

### Developer Experience
- **TypeScript** with strict mode and full type exports
- **i18n** — English and Chinese built-in
- **ARIA accessibility** — proper roles, labels, and keyboard navigation
- **Sound feedback** — optional audio cues for errors and status changes
- **Custom renderers** — override message and result rendering
- **Storybook** — interactive component development

### Integrations
- **Transport adapters**: SSE (default), WebSocket, HTTP Polling
- **Framework examples**: Next.js, Vite, Express, FastAPI
- **Agent framework examples**: LangGraph, OpenAI Agents, CrewAI

---

## Quick Start

### Install

```bash
npm install agent-sse-flow
# or
pnpm add agent-sse-flow
```

### Use

```tsx
import { AgentFlow } from 'agent-sse-flow'
import 'agent-sse-flow/style.css'

function App() {
  return (
    <AgentFlow
      url="http://localhost:8080/agent/stream"
      theme="dark"
    />
  )
}
```

That's it. The component connects to your SSE endpoint and renders the agent execution trace in real time.

---

## SSE Event Format

Send JSON events from your backend:

```json
{"type": "start", "message": "Agent started", "agentName": "researcher", "agentColor": "#3b82f6"}
{"type": "thinking", "message": "Analyzing request...", "agentName": "researcher"}
{"type": "tool_call", "tool": "search_web", "args": {"query": "AI news"}, "agentName": "researcher"}
{"type": "tool_result", "result": "Found 10 results...", "duration": 1250}
{"type": "message", "message": "Here's what I found...", "cost": 0.002, "tokens": 150}
{"type": "error", "message": "Rate limit exceeded"}
{"type": "end", "message": "Done", "cost": 0.015, "tokens": 1200, "duration": 3500}
```

### Event Types

| Type | Description | Key Fields |
|------|-------------|------------|
| `start` | Agent started | `message`, `agentName?`, `agentColor?` |
| `thinking` | Agent reasoning | `message`, `agentName?` |
| `tool_call` | Tool invocation | `tool`, `args`, `agentName?`, `duration?` |
| `tool_result` | Tool output | `result`, `duration?`, `cost?`, `tokens?` |
| `message` | Text output | `message`, `cost?`, `tokens?` |
| `error` | Error occurred | `message` |
| `end` | Agent finished | `message`, `cost?`, `tokens?`, `duration?` |

All fields except `type` are optional. See [API Reference](docs/api-reference.md) for the full `FlowEvent` interface.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `string` | **required** | SSE endpoint URL |
| `theme` | `'light' \| 'dark'` | `'dark'` | Color theme |
| `autoConnect` | `boolean` | `true` | Auto-connect on mount |
| `maxEvents` | `number` | `100000` | Max events in memory |
| `viewMode` | `'list' \| 'timeline'` | `'list'` | Default view mode |
| `defaultCollapsed` | `boolean` | `false` | Collapse new events in timeline |
| `autoReconnect` | `boolean` | `true` | Reconnect on disconnect |
| `maxReconnectAttempts` | `number` | `10` | Max reconnect tries |
| `searchKey` | `string` | `'k'` | Search shortcut key (+ Ctrl/Cmd) |
| `locale` | `'en' \| 'zh'` | `'en'` | UI language |
| `customTheme` | `Record<string, string>` | - | CSS variable overrides |
| `renderMessage` | `(msg: string) => ReactNode` | - | Custom message renderer |
| `renderResult` | `(result: string) => ReactNode` | - | Custom result renderer |
| `onError` | `(error: Error) => void` | - | Error callback |
| `onStatusChange` | `(status: EventStatus) => void` | - | Connection status callback |
| `className` | `string` | - | Custom CSS class |
| `style` | `CSSProperties` | - | Custom inline styles |

---

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](docs/api-reference.md) | Complete API docs for all props, hooks, types, and utilities |
| [Advanced Features](docs/advanced-features.md) | DAG, swimlane, breakpoints, snapshots, AI analysis, and more |
| [Architecture](docs/architecture.md) | System design, data flow, and module structure |
| [Integration Guide](examples/integration-guide.md) | Step-by-step setup for various backends |
| [Examples](examples/) | Framework-specific integration examples |

---

## Integrations

### Backend Examples

| Framework | Guide |
|-----------|-------|
| Express.js | [examples/express-backend.md](examples/express-backend.md) |
| FastAPI (Python) | [examples/fastapi-backend.md](examples/fastapi-backend.md) |

### Agent Framework Examples

| Framework | Guide |
|-----------|-------|
| LangGraph | [examples/langgraph-integration.md](examples/langgraph-integration.md) |
| OpenAI Agents SDK | [examples/openai-agents.md](examples/openai-agents.md) |
| CrewAI | [examples/crewai-integration.md](examples/crewai-integration.md) |

### Frontend Examples

| Framework | Guide |
|-----------|-------|
| Next.js | [examples/nextjs.md](examples/nextjs.md) |
| Vite + React | [examples/vite-react.md](examples/vite-react.md) |
| Storybook | [examples/storybook.md](examples/storybook.md) |

---

## Theming

Customize with CSS variables:

```tsx
<AgentFlow
  url="/api/stream"
  customTheme={{
    '--af-accent': '#10b981',
    '--af-bg': '#0f172a',
    '--af-text': '#e2e8f0',
    '--af-border': '#1e293b',
  }}
/>
```

See the full list of CSS variables in the [API Reference](docs/api-reference.md#css-variables).

---

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (with mock SSE server)
pnpm dev

# Run tests
pnpm test

# Type check
pnpm type-check

# Build library
pnpm build

# Storybook
pnpm dev-storybook
```

---

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup
- Coding conventions
- Commit format
- Pull request process

---

## License

[MIT](LICENSE) © 2025
