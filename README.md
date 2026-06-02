# agent-sse-flow

> Agent SSE Stream Visualizer - Free, unlimited, local

[![NPM Version](https://img.shields.io/npm/v/agent-sse-flow.svg)](https://www.npmjs.com/package/agent-sse-flow)
[![License](https://img.shields.io/npm/l/agent-sse-flow.svg)](https://github.com/afine907/agent-sse-flow/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dw/agent-sse-flow.svg)](https://www.npmjs.com/package/agent-sse-flow)
[![CI](https://github.com/afine907/agent-sse-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/afine907/agent-sse-flow/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-190%20passed-brightgreen)](https://github.com/afine907/agent-sse-flow/tree/main/tests)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/agent-sse-flow)](https://bundlephobia.com/package/agent-sse-flow)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

**[Live Demo](https://afine907.github.io/agent-sse-flow/)** | **[NPM](https://www.npmjs.com/package/agent-sse-flow)** | **[Issues](https://github.com/afine907/agent-sse-flow/issues)**

A lightweight React component for visualizing AI Agent execution traces from SSE streams. Supports 100,000+ events with virtual scrolling, multi-agent systems, 5 view modes, cost tracking, i18n, and more.

## Why?

| Problem | Solution |
|---------|----------|
| LangSmith free tier limited to 5000 traces/month | Unlimited, completely free |
| LangSmith uploads data to cloud | Local, data never leaves your machine |
| Complex debugging tools | Simple component, 5-minute integration |
| Limited visualization options | 5 view modes: list, timeline, waterfall, DAG, swimlane |

## Install

```bash
npm install agent-sse-flow
# or
pnpm add agent-sse-flow
```

## Quick Start

```tsx
import { AgentFlow } from 'agent-sse-flow'
import 'agent-sse-flow/style.css'

function App() {
  return (
    <AgentFlow
      url="http://localhost:8080/agent/stream"
      theme="dark"
      viewMode="list"
    />
  )
}
```

## What's New in v3.0.0

v3.0.0 is a major release that transforms agent-sse-flow from a simple event viewer into a comprehensive agent observability platform.

### New View Modes
- **Waterfall View** -- Gantt-chart style visualization of event durations
- **DAG View** -- Directed acyclic graph showing agent-to-agent dependencies
- **Swimlane View** -- Parallel timeline lanes per agent for concurrent execution analysis

### Advanced Analytics
- **Cost Dashboard** -- Pie charts and bar charts for cost breakdown by event type and agent
- **Token Usage Chart** -- Cumulative token and cost line charts over time
- **Performance Bottleneck Detection** -- Automatic detection of slow tools, high-cost events, error spikes, and low token efficiency
- **Event Clustering** -- Group events by tool name or type for pattern analysis

### Data Management
- **Snapshot Store** -- Save and load event snapshots to IndexedDB for offline analysis
- **Event Diff** -- Side-by-side field-level diff between any two events
- **Stream Recording** -- Record raw SSE streams as JSONL files for replay
- **Event Validation** -- Schema validation with field-level error reporting

### AI Integration
- **AI Analysis** -- Prepare events for LLM-based analysis with structured prompts
- **Analysis Callback** -- `onAnalyze` prop for custom AI analysis integration

### Transport Adapters
- **WebSocket Adapter** -- `useWebSocket` hook as alternative to SSE
- **HTTP Polling Adapter** -- `usePolling` hook for environments without SSE/WebSocket support

### UX Enhancements
- **Bookmarks** -- Star events for quick reference, filter to bookmarked only
- **Compact Mode** -- Dense layout for viewing more events at once
- **Event Type Filters** -- Checkbox filters for each event type (start, thinking, tool_call, etc.)
- **Time Range Filter** -- Filter events by datetime range
- **Agent Grouping** -- Group events by agent with collapsible sections and drag-to-reorder
- **Context Menu** -- Right-click on events for copy, bookmark, filter actions
- **Copy as cURL** -- Generate cURL commands from tool_call events
- **Resizable Component** -- Drag handle to resize the component height
- **Event Detail Modal** -- Click any event to view full JSON details
- **Keyboard Shortcuts** -- Ctrl+K for search, `?` for help, Escape to close panels

### Internationalization
- **i18n Support** -- English and Chinese locales via `locale` prop

### Accessibility & Feedback
- **Sound Feedback** -- Optional audio cues for errors, connections, and search results (`enableSounds` prop)
- **ARIA Labels** -- Comprehensive accessibility attributes throughout
- **Responsive Design** -- Touch swipe support and mobile-friendly layout

### Customization
- **Custom Themes** -- Override any CSS variable via `customTheme` prop
- **Custom Renderers** -- `renderMessage` and `renderResult` props for custom content rendering
- **Custom CSS** -- `className` and `style` props for full styling control

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `string` | required | SSE endpoint URL |
| `theme` | `'light' \| 'dark'` | `'dark'` | Color theme |
| `autoConnect` | `boolean` | `true` | Auto connect on mount |
| `maxEvents` | `number` | `100000` | Maximum events to keep in memory |
| `onError` | `(error: Error) => void` | - | Error callback |
| `onStatusChange` | `(status: string) => void` | - | Connection status callback |
| `viewMode` | `'list' \| 'timeline' \| 'waterfall' \| 'dag' \| 'swimlane'` | `'list'` | Visualization mode |
| `defaultCollapsed` | `boolean` | `true` | Collapse new events by default in timeline mode |
| `autoReconnect` | `boolean` | `true` | Reconnect automatically on disconnect |
| `maxReconnectAttempts` | `number` | `10` | Maximum reconnect attempts before giving up |
| `className` | `string` | - | Custom CSS class name |
| `style` | `React.CSSProperties` | - | Custom inline style object |
| `customTheme` | `Record<string, string>` | - | CSS variable overrides (e.g. `{'--af-accent': '#ff6b6b'}`) |
| `locale` | `'en' \| 'zh'` | `'en'` | UI language |
| `enableSounds` | `boolean` | `false` | Enable subtle sound feedback for events |
| `searchKey` | `string` | `'k'` | Keyboard shortcut key for search (used with Ctrl/Cmd) |
| `renderMessage` | `(message: string) => ReactNode` | - | Custom renderer for event messages |
| `renderResult` | `(result: string) => ReactNode` | - | Custom renderer for tool results |
| `onAnalyze` | `(events, options?) => Promise<AnalysisResult>` | - | AI analysis callback |

## Exported Hooks and Utilities

In addition to the `AgentFlow` component, the library exports several hooks and utilities:

| Export | Type | Description |
|--------|------|-------------|
| `useSSE` | Hook | SSE connection hook with rAF batching and incremental stats |
| `useWebSocket` | Hook | WebSocket transport adapter |
| `usePolling` | Hook | HTTP polling transport adapter |
| `validateFlowEvent` | Function | Schema validation for incoming events |
| `formatValidationErrors` | Function | Human-readable validation error formatting |
| `diffEvents` | Function | Field-level diff between two FlowEvents |
| `clusterEvents` | Function | Group events by tool/type for pattern analysis |
| `analyzePerformance` | Function | Detect performance bottlenecks in event streams |
| `prepareEventsForAnalysis` | Function | Prepare events for LLM analysis |
| `buildAnalysisPrompt` | Function | Generate structured analysis prompts |
| `saveSnapshot` / `loadAllSnapshots` | Function | IndexedDB snapshot persistence |
| `createRecordingBuffer` | Function | Record raw SSE streams as JSONL |
| `downloadJSONL` / `parseJSONL` | Function | JSONL file I/O |
| `playErrorSound` / `playConnectedSound` | Function | Sound feedback utilities |
| `createT` | Function | i18n translation function factory |

## CSS Variables

Override any of these CSS variables via the `customTheme` prop:

| Variable | Dark Default | Light Default | Description |
|----------|-------------|---------------|-------------|
| `--af-bg` | `#0f1117` | `#ffffff` | Main background |
| `--af-bg-raised` | `#161822` | `#f8f9fb` | Raised surfaces (header, cards) |
| `--af-bg-hover` | `#1c1f2e` | `#f0f1f5` | Hover state background |
| `--af-surface` | `#1e2133` | `#f4f5f7` | Event card background |
| `--af-border` | `#2a2d3e` | `#e2e4ea` | Primary border color |
| `--af-border-subtle` | `#222538` | `#ecedf1` | Subtle border color |
| `--af-text` | `#e2e4ed` | `#1a1d2e` | Primary text |
| `--af-text-secondary` | `#8b8fa4` | `#6b7085` | Secondary text |
| `--af-text-tertiary` | `#5c6078` | `#9ca0b3` | Tertiary text |
| `--af-accent` | `#6e8bfa` | `#4f6ef7` | Accent color (buttons, highlights) |
| `--af-accent-muted` | `rgba(110,139,250,0.12)` | `rgba(79,110,247,0.08)` | Muted accent background |
| `--af-font` | (system) | (system) | Font family |
| `--af-mono` | (monospace) | (monospace) | Monospace font family |
| `--af-radius` | `10px` | `10px` | Large border radius |
| `--af-radius-sm` | `6px` | `6px` | Small border radius |

```tsx
<AgentFlow
  url="http://localhost:8080/agent/stream"
  customTheme={{ '--af-accent': '#ff6b6b', '--af-bg': '#1a1a2e' }}
/>
```

## SSE Event Format

Expects JSON events with the following structure:

```json
{"type": "start", "message": "Agent started", "agentName": "agent-1", "agentColor": "#3b82f6", "agentAvatar": "robot"}
{"type": "thinking", "message": "Analyzing request..."}
{"type": "tool_call", "tool": "read_file", "args": {"path": "src/index.ts"}, "agentName": "agent-1", "duration": 125}
{"type": "tool_result", "result": "file content...", "duration": 125}
{"type": "message", "message": "Here's what I found...", "cost": 0.002, "tokens": 150}
{"type": "error", "message": "Something went wrong"}
{"type": "end", "message": "Done", "cost": 0.015, "tokens": 1200, "duration": 3500}
```

### Event Types

| Type | Description | Fields |
|------|-------------|--------|
| `start` | Agent started | `message`, `agentName?`, `agentColor?`, `agentAvatar?` |
| `thinking` | Agent thinking | `message`, `agentName?`, `duration?` |
| `tool_call` | Tool invocation | `tool`, `args`, `agentName?`, `duration?`, `cost?`, `tokens?` |
| `tool_result` | Tool result | `result`, `duration?`, `cost?`, `tokens?` |
| `message` | Text message | `message`, `cost?`, `tokens?`, `duration?` |
| `error` | Error occurred | `message` |
| `end` | Agent finished | `message`, `cost?`, `tokens?`, `duration?` |

> Fields marked with `?` are optional

## Features

### Visualization
- **5 View Modes** -- List, Timeline, Waterfall, DAG, and Swimlane views
- **Virtual Scrolling** -- Handles 100,000+ events with @tanstack/react-virtual
- **Incremental Stats** -- O(1) cost/token tracking via useRef at any scale
- **Dark/Light Theme** -- Built-in themes with full CSS variable customization
- **Compact Mode** -- Dense layout for power users
- **Markdown Rendering** -- Rich message and result display with react-markdown

### Multi-Agent
- **Agent Filtering** -- Dropdown to filter events by agent
- **Agent Grouping** -- Collapsible agent groups with drag-to-reorder
- **Agent Avatars** -- Custom avatar support (URL, emoji, or text)
- **Agent Colors** -- Per-agent color coding

### Analysis
- **Cost Dashboard** -- Pie charts and bar charts for cost breakdown
- **Token Usage Chart** -- Cumulative token and cost visualization
- **Performance Analysis** -- Automatic bottleneck detection (slow tools, high cost, error rates)
- **Event Clustering** -- Group events by tool/type for pattern recognition
- **AI Analysis** -- Structured prompts for LLM-based trace analysis
- **Event Diff** -- Field-level comparison between events

### Data Management
- **Search** -- Ctrl/Cmd+K to search across events
- **Export** -- Export events as JSON or CSV
- **Recording** -- Record raw SSE streams as JSONL for replay
- **Snapshots** -- Save/load event snapshots to IndexedDB
- **Validation** -- Schema validation with field-level error reporting
- **Bookmarks** -- Star events and filter to bookmarked only

### Filters
- **Event Type Filter** -- Checkbox filters for each event type
- **Time Range Filter** -- Filter events by datetime range
- **Agent Filter** -- Filter by specific agent
- **Search Filter** -- Full-text search across messages, tools, and results

### Transport
- **SSE** -- Default transport via native EventSource
- **WebSocket** -- Alternative transport via `useWebSocket` hook
- **HTTP Polling** -- Fallback transport via `usePolling` hook
- **Auto-Reconnect** -- Exponential backoff with configurable max attempts
- **Web Worker** -- Off-main-thread JSON parsing when available

### UX
- **Keyboard Shortcuts** -- Ctrl+K search, `?` help, Escape close
- **Context Menu** -- Right-click for copy, bookmark, filter actions
- **Event Detail Modal** -- Click to view full JSON
- **Copy as cURL** -- Generate cURL from tool_call events
- **Auto-Scroll** -- Follow new events with manual override
- **Error Navigation** -- Jump between error events
- **Resizable** -- Drag handle to resize component height

### Internationalization
- **i18n** -- English and Chinese locales via `locale` prop

### Accessibility
- **ARIA Labels** -- Comprehensive screen reader support
- **Keyboard Navigation** -- Full keyboard accessibility
- **Sound Feedback** -- Optional audio cues for events

## Comparison

| Feature | agent-sse-flow | LangSmith |
|---------|---------------|-----------|
| Price | Free | Free tier limited |
| Trace limit | Unlimited | 5000/month |
| Data location | Local | Cloud |
| Setup | 5 minutes | Account required |
| Dependencies | React + 2 small libs | LangChain ecosystem |
| View modes | 5 (list, timeline, waterfall, DAG, swimlane) | 1 |
| Export formats | JSON, CSV, JSONL | JSON |
| i18n | English, Chinese | English |
| Custom themes | Full CSS variable control | Limited |

## Example: LangGraph Integration

```python
# Python (FastAPI)
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.get("/agent/stream")
async def agent_stream():
    async def generate():
        yield f'data: {{"type": "start", "message": "Agent started", "agentName": "planner", "agentColor": "#3b82f6"}}\n\n'

        yield f'data: {{"type": "thinking", "message": "Analyzing..."}}\n\n'

        yield f'data: {{"type": "tool_call", "tool": "read_file", "args": {{"path": "test.py"}}, "duration": 125}}\n\n'

        result = read_file("test.py")
        yield f'data: {{"type": "tool_result", "result": "{result}", "duration": 125}}\n\n'

        yield f'data: {{"type": "message", "message": "Analysis complete", "cost": 0.002, "tokens": 150}}\n\n'

        yield f'data: {{"type": "end", "message": "Done", "cost": 0.015, "tokens": 1200, "duration": 3500}}\n\n'

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
        viewMode="waterfall"
        locale="en"
        enableSounds
      />
    </div>
  )
}
```

## License

MIT

## Links

- [GitHub](https://github.com/afine907/agent-sse-flow)
- [NPM](https://www.npmjs.com/package/agent-sse-flow)
- [Issues](https://github.com/afine907/agent-sse-flow/issues)
