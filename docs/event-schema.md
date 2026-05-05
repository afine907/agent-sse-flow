# Event JSON Schema

agent-sse-flow uses Server-Sent Events (SSE) to stream agent execution traces. Each event is a JSON object following the schema below.

## FlowEvent

```json
{
  "type": "start | thinking | tool_call | tool_result | message | error | end",
  "message": "string",
  "tool": "string",
  "args": {},
  "result": "string",
  "agentName": "string",
  "agentColor": "#hex",
  "cost": 0.005,
  "tokens": 350,
  "duration": 1500
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | enum | ✅ | Event type (see below) |
| `message` | string | No | Human-readable message text |
| `tool` | string | No | Tool name (for `tool_call`) |
| `args` | object | No | Tool arguments (for `tool_call`) |
| `result` | string | No | Tool result text (for `tool_result`) |
| `agentName` | string | No | Agent identifier for multi-agent systems |
| `agentColor` | string | No | Agent color in hex format (e.g. `#3b82f6`) |
| `cost` | number | No | API cost in USD |
| `tokens` | integer | No | Token count for this event |
| `duration` | integer | No | Duration in milliseconds |

## Event Types

### `start`

Sent when the agent begins execution.

```json
{
  "type": "start",
  "message": "Agent started processing",
  "agentName": "main",
  "agentColor": "#3b82f6"
}
```

### `thinking`

Sent when the agent is reasoning or planning.

```json
{
  "type": "thinking",
  "message": "Analyzing the user's request...",
  "agentName": "main"
}
```

### `tool_call`

Sent when the agent invokes a tool.

```json
{
  "type": "tool_call",
  "message": "Reading file",
  "tool": "read_file",
  "args": { "path": "/src/index.ts" },
  "agentName": "main",
  "duration": 45
}
```

### `tool_result`

Sent after a tool call completes.

```json
{
  "type": "tool_result",
  "message": "File read complete",
  "result": "export function main() {\n  console.log('Hello');\n}",
  "agentName": "main",
  "tokens": 150,
  "cost": 0.002
}
```

### `message`

Sent when the agent produces a text response.

```json
{
  "type": "message",
  "message": "Here's the analysis you requested...",
  "agentName": "main"
}
```

### `error`

Sent when an error occurs.

```json
{
  "type": "error",
  "message": "Failed to call API: timeout",
  "agentName": "main"
}
```

### `end`

Sent when the agent completes execution.

```json
{
  "type": "end",
  "message": "Task completed successfully",
  "agentName": "main",
  "duration": 3200,
  "tokens": 1250,
  "cost": 0.015
}
```

## Multi-Agent Systems

Use `agentName` and `agentColor` to distinguish agents in the visualization:

```json
[
  { "type": "start", "agentName": "planner", "agentColor": "#6366f1" },
  { "type": "thinking", "message": "Delegating to researcher...", "agentName": "planner" },
  { "type": "tool_call", "tool": "search", "args": {"query": "traffic AI"}, "agentName": "researcher", "agentColor": "#10b981" },
  { "type": "tool_result", "result": "Found 10 articles", "agentName": "researcher" },
  { "type": "message", "message": "Research complete. Handing off to writer.", "agentName": "planner" },
  { "type": "tool_call", "tool": "write", "args": {"content": "..."}, "agentName": "writer", "agentColor": "#f59e0b" },
  { "type": "end", "message": "Done", "agentName": "planner", "duration": 5000, "tokens": 2000, "cost": 0.02 }
]
```

## SSE Format

Events must be sent as SSE with the `data:` prefix:

```
data: {"type":"start","message":"Agent started","agentName":"main"}

data: {"type":"thinking","message":"Thinking...","agentName":"main"}

data: {"type":"tool_call","tool":"search","args":{"query":"hello"},"agentName":"main"}

data: {"type":"tool_result","result":"Found results","agentName":"main"}

data: {"type":"end","message":"Done","agentName":"main","duration":1500}
```

### HTTP Response Headers

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

## Python Helper

```python
import json

def format_sse(data: dict) -> str:
    """Format a FlowEvent dict as SSE data line."""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

# Usage
yield format_sse({"type": "start", "message": "Started", "agentName": "main"})
yield format_sse({"type": "tool_call", "tool": "search", "args": {"query": "hello"}, "agentName": "main"})
yield format_sse({"type": "tool_result", "result": "Found 5 results", "agentName": "main"})
yield format_sse({"type": "end", "message": "Done", "agentName": "main", "duration": 800})
```

## TypeScript Type

```typescript
interface FlowEvent {
  type: 'start' | 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'end';
  message?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
  agentName?: string;
  agentColor?: string;
  cost?: number;
  tokens?: number;
  duration?: number;
}
```

## Integration Examples

- [Python FastAPI](../examples/python-fastapi.md)
- [LangGraph](../examples/langgraph.md)
- [LangChain Quickstart](../examples/langchain_quickstart.py)
- [Node.js Express](../examples/nodejs-express.md)
- [Next.js App Router](../examples/nextjs-app-router.md)
- [OpenAI Assistant](../examples/openai-assistant.md)
