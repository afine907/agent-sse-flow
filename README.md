# agent-sse-flow

> Agent SSE Stream Visualizer - Free, unlimited, local

[![NPM Version](https://img.shields.io/npm/v/agent-sse-flow.svg)](https://www.npmjs.com/package/agent-sse-flow)
[![License](https://img.shields.io/npm/l/agent-sse-flow.svg)](https://github.com/afine907/agent-sse-flow/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dw/agent-sse-flow.svg)](https://www.npmjs.com/package/agent-sse-flow)
[![CI](https://github.com/afine907/agent-sse-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/afine907/agent-sse-flow/actions/workflows/ci.yml)

**[🎬 Live Demo](https://afine907.github.io/agent-sse-flow/)** | **[📦 NPM](https://www.npmjs.com/package/agent-sse-flow)** | **[🐛 Issues](https://github.com/afine907/agent-sse-flow/issues)**

A lightweight React component for visualizing Agent execution traces from SSE streams.

## Why?

| Problem | Solution |
|---------|----------|
| LangSmith free tier limited to 5000 traces/month | ✅ Unlimited, completely free |
| LangSmith uploads data to cloud | ✅ Local, data never leaves your machine |
| Complex debugging tools | ✅ Simple component, 5-minute integration |

## Install

```bash
npm install agent-sse-flow
# or
pnpm add agent-sse-flow
```

## Usage

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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `string` | required | SSE endpoint URL |
| `theme` | `'light' \| 'dark'` | `'dark'` | Color theme |
| `autoConnect` | `boolean` | `true` | Auto connect on mount |
| `maxEvents` | `number` | `100000` | Maximum events to display |
| `onError` | `(error: Error) => void` | - | Error callback |
| `onStatusChange` | `(status: string) => void` | - | Connection status callback |

## SSE Event Format

Expects JSON events with the following structure:

```json
{"type": "start", "message": "Agent started", "agentName": "agent-1", "agentColor": "#3b82f6"}
{"type": "thinking", "message": "Analyzing request..."}
{"type": "tool_call", "tool": "read_file", "args": {"path": "src/index.ts"}, "agentName": "agent-1"}
{"type": "tool_result", "result": "file content...", "duration": 125}
{"type": "message", "message": "Here's what I found...", "cost": 0.002, "tokens": 150}
{"type": "error", "message": "Something went wrong"}
{"type": "end", "message": "Done", "cost": 0.015, "tokens": 1200, "duration": 3500}
```

### Event Types

| Type | Description | Fields |
|------|-------------|--------|
| `start` | Agent started | `message`, `agentName?`, `agentColor?` |
| `thinking` | Agent thinking | `message`, `agentName?`, `agentColor?` |
| `tool_call` | Tool invocation | `tool`, `args`, `agentName?`, `agentColor?`, `duration?` |
| `tool_result` | Tool result | `result`, `duration?`, `cost?`, `tokens?` |
| `message` | Text message | `message`, `cost?`, `tokens?`, `duration?` |
| `error` | Error occurred | `message` |
| `end` | Agent finished | `message`, `cost?`, `tokens?`, `duration?` |

> Fields marked with `?` are optional

## Example: LangGraph Integration

```python
# Python (FastAPI)
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.get("/agent/stream")
async def agent_stream():
    async def generate():
        yield f'data: {{"type": "start", "message": "Agent started"}}\n\n'
        
        yield f'data: {{"type": "thinking", "message": "Analyzing..."}}\n\n'
        
        yield f'data: {{"type": "tool_call", "tool": "read_file", "args": {{"path": "test.py"}}}}\n\n'
        
        result = read_file("test.py")
        yield f'data: {{"type": "tool_result", "result": "{result}"}}\n\n'
        
        yield f'data: {{"type": "end", "message": "Done"}}\n\n'
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

```tsx
// React
import { AgentFlow } from 'agent-sse-flow'
import 'agent-sse-flow/style.css'

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <AgentFlow 
        url="http://localhost:8000/agent/stream"
        theme="dark"
      />
    </div>
  )
}
```

## Features

- ✅ **SSE Streaming** - Real-time event visualization
- ✅ **Dark/Light Theme** - Built-in themes
- ✅ **Connection Status** - Visual status indicator
- ✅ **Error Handling** - Graceful error display
- ✅ **TypeScript** - Full type support
- ✅ **Minimal Dependencies** - React peer dep + 2 small libs (virtual scrolling, markdown)
- ✅ **100K+ Events** - Virtual scrolling with incremental stats for large traces
- ✅ **Multi-Agent** - `agentName` and `agentColor` for multi-agent systems
- ✅ **Agent Filter** - Dropdown to filter events by agent
- ✅ **Cost Tracking** - `cost`, `tokens`, `duration` fields for monitoring API usage

## Comparison

| Feature | agent-sse-flow | LangSmith |
|---------|---------------|-----------|
| Price | Free | Free tier limited |
| Trace limit | Unlimited | 5000/month |
| Data location | Local | Cloud |
| Setup | 5 minutes | Account required |
| Dependencies | React + 2 small libs | LangChain ecosystem |

## License

MIT © 2025

## Links

- [GitHub](https://github.com/afine907/agent-sse-flow)
- [NPM](https://www.npmjs.com/package/agent-sse-flow)
- [Issues](https://github.com/afine907/agent-sse-flow/issues)
