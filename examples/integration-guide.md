# Integration Guide

A comprehensive guide for integrating agent-sse-flow into your application.

## Table of Contents

- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [SSE Event Format](#sse-event-format)
- [Backend Integration](#backend-integration)
  - [Node.js (Express)](#nodejs-express)
  - [Python (FastAPI)](#python-fastapi)
- [Advanced Usage](#advanced-usage)
  - [Custom Themes](#custom-themes)
  - [Internationalization (i18n)](#internationalization-i18n)
  - [Persistence](#persistence)
  - [Multi-Agent Systems](#multi-agent-systems)
  - [Custom Renderers](#custom-renderers)
- [Troubleshooting](#troubleshooting)

---

## Installation

```bash
# npm
npm install agent-sse-flow

# pnpm
pnpm add agent-sse-flow

# yarn
yarn add agent-sse-flow
```

Peer dependencies (`react` >= 18 and `react-dom` >= 18) must already be installed.

## Basic Setup

```tsx
import { AgentFlow } from 'agent-sse-flow';
import 'agent-sse-flow/style.css';

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <AgentFlow
        url="http://localhost:8000/agent/stream"
        theme="dark"
        viewMode="timeline"
      />
    </div>
  );
}
```

The CSS import (`agent-sse-flow/style.css`) is required. Without it the component renders unstyled.

### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `string` | (required) | SSE endpoint URL |
| `theme` | `'dark' \| 'light'` | `'dark'` | Color theme |
| `viewMode` | `'list' \| 'timeline' \| 'waterfall'` | `'list'` | Display mode |
| `autoConnect` | `boolean` | `true` | Connect on mount |
| `autoReconnect` | `boolean` | `true` | Reconnect on disconnect |
| `maxReconnectAttempts` | `number` | `10` | Max reconnect tries |
| `maxEvents` | `number` | `100000` | Max events in memory |
| `defaultCollapsed` | `boolean` | `true` | Collapse new events in timeline |
| `locale` | `'en' \| 'zh'` | `'en'` | UI language |
| `className` | `string` | - | Custom CSS class |
| `style` | `CSSProperties` | - | Inline styles |
| `customTheme` | `Record<string, string>` | - | CSS variable overrides |
| `renderMessage` | `(msg: string) => ReactNode` | - | Custom message renderer |
| `renderResult` | `(result: string) => ReactNode` | - | Custom result renderer |
| `onError` | `(error: Error) => void` | - | Error callback |
| `onStatusChange` | `(status: EventStatus) => void` | - | Connection status callback |

---

## SSE Event Format

The component expects SSE events where each `data:` line contains a JSON object matching the `FlowEvent` interface.

### Event Types

| Type | Required Fields | Optional Fields | Description |
|------|----------------|-----------------|-------------|
| `start` | `type`, `message` | `agentName`, `agentColor`, `agentAvatar` | Agent session begins |
| `thinking` | `type`, `message` | `agentName`, `tokens`, `cost` | Agent reasoning step |
| `tool_call` | `type`, `tool` | `message`, `args`, `agentName`, `duration` | Tool invocation |
| `tool_result` | `type`, `result` | `message`, `agentName`, `tokens`, `cost`, `duration` | Tool output |
| `message` | `type`, `message` | `agentName`, `tokens`, `cost` | Agent response (supports markdown) |
| `error` | `type`, `message` | `agentName` | Error occurred |
| `end` | `type`, `message` | `agentName`, `tokens`, `cost`, `duration` | Agent session ends |

### Example SSE Stream

```
data: {"type":"start","message":"Agent initialized","agentName":"assistant","agentColor":"#3b82f6"}

data: {"type":"thinking","message":"Analyzing the request...","agentName":"assistant"}

data: {"type":"tool_call","tool":"search","args":{"query":"quantum computing"},"agentName":"assistant","duration":450}

data: {"type":"tool_result","result":"Found 10 relevant documents","agentName":"assistant","tokens":120,"cost":0.002}

data: {"type":"message","message":"## Summary\n\nThe analysis found **10 documents** related to quantum computing.","agentName":"assistant","tokens":350,"cost":0.005}

data: {"type":"end","message":"Task completed","agentName":"assistant","tokens":470,"cost":0.007,"duration":2300}
```

---

## Backend Integration

### Node.js (Express)

```bash
npm install express cors
```

```javascript
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));

app.get('/agent/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Your agent logic here
  (async () => {
    send({ type: 'start', message: 'Agent started', agentName: 'assistant' });
    await delay(500);
    send({ type: 'thinking', message: 'Processing...', agentName: 'assistant' });
    await delay(1000);
    send({ type: 'message', message: 'Done!', agentName: 'assistant' });
    send({ type: 'end', message: 'Complete', agentName: 'assistant' });
    res.end();
  })();

  req.on('close', () => res.end());
});

app.listen(8000);
```

For production setups, see `examples/express-backend.md`.

### Python (FastAPI)

```bash
pip install fastapi uvicorn
```

```python
import json
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"])

def sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"

async def agent_stream():
    yield sse_event({"type": "start", "message": "Agent started", "agentName": "assistant"})
    await asyncio.sleep(0.5)
    yield sse_event({"type": "thinking", "message": "Processing...", "agentName": "assistant"})
    await asyncio.sleep(1.0)
    yield sse_event({"type": "message", "message": "Done!", "agentName": "assistant"})
    yield sse_event({"type": "end", "message": "Complete", "agentName": "assistant"})

@app.get("/agent/stream")
async def stream():
    return StreamingResponse(agent_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})
```

For production setups, see `examples/fastapi-backend.md`.

---

## Advanced Usage

### Custom Themes

Override CSS custom properties to match your brand:

```tsx
<AgentFlow
  url="/agent/stream"
  theme="dark"
  customTheme={{
    '--af-accent': '#f472b6',
    '--af-bg': '#1e1b2e',
    '--af-surface': '#2d2640',
    '--af-text': '#e8e0f0',
    '--af-border': '#3d3555',
  }}
/>
```

Available CSS variables can be found in `src/AgentFlow.css`. All variables follow the `--af-` prefix convention.

### Internationalization (i18n)

AgentFlow supports English (`en`) and Chinese (`zh`) locales:

```tsx
<AgentFlow url="/agent/stream" locale="zh" />
```

To add a new locale, extend the translations object in `src/i18n.ts`.

### Persistence

AgentFlow keeps events in memory only. To persist events across page reloads, use the `useSSE` hook and save events to your preferred storage:

```tsx
import { useSSE } from 'agent-sse-flow';

function PersistentAgentView() {
  const { events, status, connect, disconnect } = useSSE({
    url: '/agent/stream',
    autoConnect: true,
    maxEvents: 100000,
  });

  // Save to localStorage on every update
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem('agent-events', JSON.stringify(events));
    }
  }, [events]);

  // Load on mount
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('agent-events') || '[]');
    } catch { return []; }
  }, []);

  // Use saved events as initial state
  // ...
}
```

### Multi-Agent Systems

Include `agentName` and `agentColor` in your events to support multi-agent visualization:

```json
{"type":"thinking","message":"Delegating...","agentName":"coordinator","agentColor":"#3b82f6"}
{"type":"tool_call","tool":"search","agentName":"researcher","agentColor":"#10b981"}
{"type":"message","message":"Writing report...","agentName":"writer","agentColor":"#f59e0b"}
```

The component automatically:
- Groups events by agent (toggle with the group-by button)
- Filters events by agent (dropdown in the toolbar)
- Assigns distinct visual indicators per agent

### Custom Renderers

Override the default markdown rendering for messages and results:

```tsx
<AgentFlow
  url="/agent/stream"
  renderMessage={(msg) => <div className="custom-msg">{msg}</div>}
  renderResult={(result) => <pre className="custom-result">{result}</pre>}
/>
```

---

## Troubleshooting

### Events not appearing

1. **Check the SSE endpoint**: Open the URL in a browser tab. You should see `data: {...}` lines streaming.
2. **CORS**: Ensure your backend allows the frontend origin. During development, use a Vite proxy:
   ```typescript
   // vite.config.ts
   export default defineConfig({
     server: {
       proxy: { '/agent': { target: 'http://localhost:8000', changeOrigin: true } },
     },
   });
   ```
3. **Event format**: Each SSE message must be `data: {json}\n\n`. The `data:` prefix and double newline are required.

### Connection drops immediately

- Check that the response `Content-Type` is `text/event-stream`.
- Ensure `Cache-Control: no-cache` and `Connection: keep-alive` headers are set.
- If behind nginx, add `X-Accel-Buffering: no` to disable response buffering.

### Component not rendering

- Verify the CSS import: `import 'agent-sse-flow/style.css'`.
- Check the browser console for errors.
- Ensure `react` >= 18 is installed as a peer dependency.

### High memory usage

- Reduce `maxEvents` (default: 100,000): `<AgentFlow maxEvents={10000} />`
- Use event type filters to hide verbose types (e.g., `thinking`).

### Reconnection not working

- `autoReconnect` is `true` by default. Check `maxReconnectAttempts` (default: 10).
- After max attempts, the component shows an error status. Use the Connect button to retry manually.

### TypeScript errors

Ensure your `tsconfig.json` includes `"jsx": "react-jsx"` and `"moduleResolution": "bundler"` or `"node"`. The library ships its own type declarations.

---

## Framework-Specific Guides

- **Vite + React**: `examples/vite-react.md`
- **Next.js (App Router)**: `examples/nextjs-app-router.md`
- **Express backend**: `examples/express-backend.md`
- **FastAPI backend**: `examples/fastapi-backend.md`
- **LangGraph**: `examples/langgraph.md`
- **CrewAI**: `examples/crewai-integration.md`
