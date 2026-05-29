# Examples

A collection of integration examples, backend implementations, and framework-specific guides for agent-sse-flow.

## Getting Started

| Guide | Description |
|-------|-------------|
| [integration-guide.md](integration-guide.md) | Comprehensive integration guide covering installation, SSE event format, backend setup, advanced usage, and troubleshooting |
| [vite-react.md](vite-react.md) | Complete Vite + React setup with proxy configuration and TypeScript support |
| [storybook.md](storybook.md) | Run Storybook locally for interactive component development and visual testing |

## Frontend Frameworks

| Guide | Description |
|-------|-------------|
| [vite-react.md](vite-react.md) | Vite + React with proxy, TypeScript, and custom event handling |
| [nextjs.md](nextjs.md) | Next.js integration (Pages Router) |
| [nextjs-app-router.md](nextjs-app-router.md) | Next.js App Router with Server Components and streaming |

## Backend Implementations

| Guide | Description |
|-------|-------------|
| [express-backend.md](express-backend.md) | Express.js SSE backend with TypeScript helpers, heartbeats, and error handling |
| [fastapi-backend.md](fastapi-backend.md) | Python FastAPI SSE backend with async generators and multi-agent support |
| [nodejs-express.md](nodejs-express.md) | Minimal Node.js + Express SSE server |
| [python-fastapi.md](python-fastapi.md) | Minimal Python FastAPI SSE server |

## Agent Frameworks

| Guide | Description |
|-------|-------------|
| [langgraph.md](langgraph.md) | LangGraph integration with state graph visualization |
| [langgraph-integration.md](langgraph-integration.md) | Detailed LangGraph integration with multi-agent workflows |
| [openai-assistant.md](openai-assistant.md) | OpenAI Assistants API with streaming and tool calls |
| [openai-agents.md](openai-agents.md) | OpenAI Agents SDK integration |
| [crewai-integration.md](crewai-integration.md) | CrewAI multi-agent framework integration |

## Demo

| Path | Description |
|------|-------------|
| [demo/index.html](demo/index.html) | Standalone HTML demo page |
| [demo/main.tsx](demo/main.tsx) | Demo application source code |

## Quick Reference

### SSE Event Format

Each SSE message must be a JSON object with a `type` field:

```
data: {"type":"start","message":"Agent initialized","agentName":"assistant","agentColor":"#3b82f6"}

data: {"type":"tool_call","tool":"search","args":{"query":"hello"},"agentName":"assistant"}

data: {"type":"message","message":"Result here","agentName":"assistant","tokens":150,"cost":0.002}

data: {"type":"end","message":"Done","agentName":"assistant"}
```

### Minimal React Usage

```tsx
import { AgentFlow } from 'agent-sse-flow';
import 'agent-sse-flow/style.css';

<AgentFlow url="http://localhost:8000/agent/stream" theme="dark" viewMode="timeline" />
```

See [integration-guide.md](integration-guide.md) for the full props reference.
