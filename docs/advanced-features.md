# Advanced Features

agent-sse-flow includes a rich set of advanced features for analyzing, debugging, and optimizing agent execution traces. This guide covers each feature with usage examples.

## Table of Contents

- [DAG View](#dag-view)
- [Swimlane View](#swimlane-view)
- [Waterfall View](#waterfall-view)
- [Playback](#playback)
- [Breakpoints](#breakpoints)
- [Snapshots](#snapshots)
- [Event Diff](#event-diff)
- [AI Analysis](#ai-analysis)
- [Event Clustering](#event-clustering)
- [Cost Dashboard](#cost-dashboard)
- [Token Chart](#token-chart)
- [Performance Bottleneck Detection](#performance-bottleneck-detection)
- [Event Stream Recording](#event-stream-recording)
- [Multi-Agent Support](#multi-agent-support)
- [Custom Theming](#custom-theming)
- [Sound Feedback](#sound-feedback)
- [Keyboard Shortcuts](#keyboard-shortcuts)

---

## DAG View

The DAG (Directed Acyclic Graph) view visualizes agent-to-agent dependencies as a node graph. It infers edges from sequential events where one agent produces output that another agent consumes.

**How it works:**
- Each agent becomes a node in the graph
- Edges are inferred when a `tool_result` or `message` from one agent is followed by a `thinking` or `tool_call` from another agent within 10 seconds
- Nodes are layered using topological sort for clean layout
- Edge thickness represents the number of interactions between agents

**Usage:**

```tsx
<AgentFlow
  url="http://localhost:8080/stream"
  viewMode="dag"
/>
```

**Switching programmatically:**

```tsx
const [viewMode, setViewMode] = useState<ViewMode>('dag');
<AgentFlow url="..." viewMode={viewMode} />
```

**Best for:** Understanding multi-agent orchestration patterns, identifying bottlenecks in agent handoffs.

---

## Swimlane View

The swimlane view shows events across multiple agents in parallel horizontal lanes, similar to a Gantt chart. Each agent gets its own lane, and events are positioned along a shared time axis.

**How it works:**
- Events are grouped by `agentName`
- Each lane shows events as bars positioned by timestamp
- Bar width represents event duration (minimum 0.5% of total time)
- Color coding matches event types (start=blue, thinking=purple, tool_call=amber, etc.)

**Usage:**

```tsx
<AgentFlow
  url="http://localhost:8080/stream"
  viewMode="swimlane"
/>
```

**Best for:** Visualizing parallel agent execution, identifying idle periods, comparing agent activity over time.

---

## Waterfall View

The waterfall view displays events as horizontal bars on a timeline, showing duration and timing relationships.

**How it works:**
- Each event is a row with a bar spanning its duration
- The time axis shows absolute timestamps
- Events are ordered by appearance
- Hover/click to see event details

**Usage:**

```tsx
<AgentFlow
  url="http://localhost:8080/stream"
  viewMode="waterfall"
/>
```

**Best for:** Identifying slow operations, understanding timing relationships between events.

---

## Playback

Playback allows you to replay recorded event streams at configurable speeds. This is useful for debugging, demonstrations, and analyzing specific execution sequences.

**How it works:**
- Load a recorded JSONL file or snapshot
- Events are replayed in order with configurable delay
- Speed controls: 0.5x, 1x, 2x, 4x
- Pause/resume/seek controls

**Recording a stream:**

1. Click the record button (circle icon) in the header
2. Interact with the agent
3. Click the stop button (square icon) to download the JSONL file

**Replaying:**

Use the mock server with a recorded JSONL file:

```bash
# Start mock server with recorded data
pnpm mock-server --file recording.jsonl
```

**JSONL format:**

Each line is a raw SSE event JSON:

```jsonl
{"type":"start","message":"Agent started","timestamp":1700000000000}
{"type":"thinking","message":"Analyzing input...","duration":1500,"timestamp":1700000001000}
{"type":"tool_call","tool":"search","args":{"query":"test"},"timestamp":1700000002000}
```

---

## Breakpoints

Breakpoints pause the event stream when specific conditions are met, allowing you to inspect the state at that point.

**Setting breakpoints:**

Breakpoints can be set on:
- **Event type**: Pause when a specific event type arrives (e.g., `error`, `tool_call`)
- **Tool name**: Pause when a specific tool is called (e.g., `search`, `write_file`)

**Usage with the hook:**

```typescript
import type { Breakpoint } from 'agent-sse-flow';

const breakpoints: Breakpoint[] = [
  { id: 'bp-1', conditionType: 'event_type', value: 'error', enabled: true },
  { id: 'bp-2', conditionType: 'tool_name', value: 'search', enabled: true },
];
```

**When a breakpoint triggers:**
- The stream pauses
- A visual indicator shows which breakpoint was hit
- You can inspect events, then resume

---

## Snapshots

Snapshots save the current state of the event stream to IndexedDB for later review or comparison.

**Saving a snapshot:**

```typescript
import { saveSnapshot } from 'agent-sse-flow';

const snapshot = await saveSnapshot('debug-session-1', events);
console.log(`Saved ${snapshot.eventCount} events with ID: ${snapshot.id}`);
```

**Loading snapshots:**

```typescript
import { loadAllSnapshots, loadSnapshot } from 'agent-sse-flow';

// List all snapshots
const all = await loadAllSnapshots();
for (const snap of all) {
  console.log(`${snap.name}: ${snap.eventCount} events (${snap.createdAt})`);
}

// Load specific snapshot
const snapshot = await loadSnapshot('snap-1700000000000-abc123');
```

**Deleting snapshots:**

```typescript
import { deleteSnapshot, clearAllSnapshots } from 'agent-sse-flow';

// Delete one
await deleteSnapshot('snap-1700000000000-abc123');

// Delete all
await clearAllSnapshots();
```

**Storage:** Snapshots are stored in IndexedDB under the `agent-sse-flow` database, `snapshots` object store.

---

## Event Diff

The event diff feature compares two FlowEvent objects field by field, showing what changed between them.

**Usage:**

```typescript
import { diffEvents } from 'agent-sse-flow';

const lines = diffEvents(eventA, eventB);

for (const line of lines) {
  switch (line.type) {
    case 'equal':
      console.log(`  ${line.field}: ${line.leftValue}`);
      break;
    case 'changed':
      console.log(`~ ${line.field}: "${line.leftValue}" -> "${line.rightValue}"`);
      break;
    case 'added':
      console.log(`+ ${line.field}: ${line.rightValue}`);
      break;
    case 'removed':
      console.log(`- ${line.field}: ${line.leftValue}`);
      break;
  }
}
```

**Compared fields:**
- `type`
- `message`
- `tool`
- `argsJson`
- `result`
- `duration`

**Use cases:**
- Comparing events from different runs
- Debugging why an event changed between snapshots
- Verifying event transformations

---

## AI Analysis

The AI analysis module prepares events for sending to an LLM for intelligent analysis.

**Preparing events:**

```typescript
import { prepareEventsForAnalysis } from 'agent-sse-flow';

const prepared = prepareEventsForAnalysis(events, {
  maxEvents: 100,       // Limit to last 100 events
  includeArgs: false,   // Strip tool arguments (reduces tokens)
  includeResults: false, // Strip tool results
  focus: 'performance', // Hint for the analysis focus
});
```

**Building a prompt:**

```typescript
import { buildAnalysisPrompt } from 'agent-sse-flow';

const prompt = buildAnalysisPrompt(events, { focus: 'errors' });
// "Analyze agent trace (50 events). Focus: errors.
//  [start] "Agent started"
//  [error] "Connection timeout"
//  [tool_call] tool=retry "Retrying..."
//  ..."
```

**Using with AgentFlow's onAnalyze callback:**

```tsx
<AgentFlow
  url="..."
  onAnalyze={async (events, options) => {
    const prompt = buildAnalysisPrompt(events, options);
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
    return response.json();
  }}
/>
```

**Analysis result structure:**

```typescript
interface AnalysisResult {
  summary: string;
  findings?: Array<{
    category: 'performance' | 'error' | 'pattern' | 'optimization' | 'general';
    severity: 'info' | 'warning' | 'error';
    description: string;
    relatedEventIds?: number[];
  }>;
  suggestions?: string[];
}
```

---

## Event Clustering

Event clustering groups related events by type or tool name, providing aggregated statistics for each group.

**Usage:**

```typescript
import { clusterEvents, getClusterColor } from 'agent-sse-flow';

const clusters = clusterEvents(events);

for (const cluster of clusters) {
  console.log(`${cluster.label}: ${cluster.count} events`);
  if (cluster.avgDuration) {
    console.log(`  Avg duration: ${cluster.avgDuration}ms`);
  }
  if (cluster.totalCost) {
    console.log(`  Total cost: $${cluster.totalCost.toFixed(4)}`);
  }
  if (cluster.totalTokens) {
    console.log(`  Total tokens: ${cluster.totalTokens.toLocaleString()}`);
  }
}
```

**Cluster keys:**
- Tool calls: `tool:<tool_name>` (e.g., `tool:search`, `tool:write_file`)
- Other events: `type:<event_type>` (e.g., `type:message`, `type:error`)

**Getting display colors:**

```typescript
const color = getClusterColor('tool:search'); // "#f59e0b" (amber)
const color2 = getClusterColor('type:error'); // "#ef4444" (red)
```

**Sorting:** Clusters are sorted by count (most frequent first).

---

## Cost Dashboard

The cost dashboard provides a visual breakdown of costs across event types and agents.

**What it shows:**
- **Summary cards:** Total cost, total tokens, average cost per tool call, tool call count
- **Pie chart:** Cost distribution by event type (thinking, tool_call, message, etc.)
- **Agent breakdown:** Cost per agent with horizontal bar chart

**Usage:**

The cost dashboard appears automatically when cost data is present in events. Toggle it with the dollar sign ($) icon in the header.

```tsx
// Events must include cost data
const event = {
  type: 'tool_call',
  tool: 'search',
  cost: 0.002,
  tokens: 150,
  // ...
};
```

**Providing cost data:**

Your SSE endpoint should include `cost` and `tokens` fields in events:

```json
{"type":"tool_call","tool":"gpt-4","cost":0.03,"tokens":500,"timestamp":1700000000000}
```

---

## Token Chart

The token chart shows cumulative token usage and cost over time as a line chart.

**What it shows:**
- **Blue line:** Cumulative token count
- **Amber dashed line:** Cumulative cost
- **Breakdown:** Token usage by event type

**Usage:**

The token chart appears automatically when token/cost data is present. Toggle it with the pulse icon in the header.

**Reading the chart:**
- X-axis: Time
- Left Y-axis: Token count
- Right Y-axis: Cost ($)
- Dots on the blue line: Individual events with token data

---

## Performance Bottleneck Detection

The performance analysis module automatically detects common bottlenecks in agent execution traces.

**Detected bottlenecks:**

| Category | Severity | Description |
|----------|----------|-------------|
| `slow_tool` | warning/error | Tool calls exceeding 3000ms threshold |
| `high_cost` | warning/error | Events exceeding $0.01 cost threshold |
| `error_rate` | warning/error | Error rate exceeding 15% of total events |
| `long_thinking` | info/warning | Thinking steps exceeding 10s threshold |
| `low_efficiency` | info/warning | Cost-per-token above $0.0001 threshold |

**Usage in the UI:**

Click the lightning bolt icon in the header to open the Performance panel. Findings are sorted by severity (error > warning > info).

**Programmatic usage:**

```typescript
import { analyzePerformance } from 'agent-sse-flow';

const result = analyzePerformance(events, {
  slowToolThreshold: 3000,      // ms
  highCostThreshold: 0.01,      // USD
  errorRateThreshold: 0.15,     // 0-1 ratio
  longThinkingThreshold: 10000, // ms
  costPerTokenThreshold: 0.0001 // USD
});

console.log(`Analyzed ${result.totalEvents} events, found ${result.findings.length} issues`);

for (const finding of result.findings) {
  console.log(`[${finding.severity.toUpperCase()}] ${finding.description}`);
  if (finding.suggestion) {
    console.log(`  Suggestion: ${finding.suggestion}`);
  }
}
```

**Severity levels:**
- `error`: Critical performance issue requiring attention
- `warning`: Potential issue worth investigating
- `info`: Informational finding for optimization

---

## Event Stream Recording

Record raw SSE event data to a downloadable JSONL file for later replay or analysis.

**Usage in the UI:**

1. Click the record button (red circle) in the header
2. The button pulses while recording
3. A counter shows captured events
4. Click the stop button (square) to download the JSONL file

**Programmatic usage:**

```typescript
import { createRecordingBuffer, downloadJSONL, parseJSONL } from 'agent-sse-flow';

// Create and use a recording buffer
const buffer = createRecordingBuffer();
buffer.start();

// Push raw SSE data (typically from onRawEvent callback)
buffer.push('{"type":"start","message":"Hello"}');
buffer.push('{"type":"message","message":"World"}');

buffer.stop();

// Get JSONL content
const jsonl = buffer.toJSONL();

// Download as file
downloadJSONL(jsonl, 'my-recording.jsonl');

// Parse a JSONL string back into objects
const events = parseJSONL(jsonl);
// [{ type: "start", message: "Hello" }, { type: "message", message: "World" }]
```

**Integration with useSSE:**

```typescript
const buffer = createRecordingBuffer();

const { events, connect } = useSSE({
  url: 'http://localhost:8080/stream',
  autoConnect: true,
  maxEvents: 100_000,
  onRawEvent: (rawData) => {
    buffer.push(rawData);
  },
});
```

**JSONL format:**

```jsonl
{"type":"start","message":"Agent started","timestamp":1700000000000}
{"type":"thinking","message":"Processing...","duration":1500}
{"type":"tool_call","tool":"search","args":{"query":"test"}}
{"type":"tool_result","result":"Found 5 results"}
{"type":"end","message":"Complete"}
```

---

## Multi-Agent Support

agent-sse-flow fully supports multi-agent systems with per-agent filtering, grouping, and visualization.

**Assigning agents to events:**

```json
{"type":"message","message":"Searching...","agentName":"researcher","agentColor":"#3b82f6","agentAvatar":"🔍"}
{"type":"tool_call","tool":"write","agentName":"coder","agentColor":"#10b981","agentAvatar":"💻"}
```

**Features:**
- **Agent filter dropdown:** Filter events by agent
- **Group by agent:** Group events in list view
- **Drag-to-reorder:** Reorder agents in the filter dropdown
- **Agent avatars:** Support for URLs, emojis, or short text
- **Per-agent stats:** Cost and token breakdown by agent

**Agent fields:**

| Field | Type | Description |
|-------|------|-------------|
| `agentName` | `string` | Agent identifier |
| `agentColor` | `string` | Hex color (e.g., `#3b82f6`) |
| `agentAvatar` | `string` | Image URL, emoji, or 1-2 char text |

---

## Custom Theming

Customize the appearance using CSS custom properties.

**Dark/Light themes:**

```tsx
<AgentFlow url="..." theme="dark" />
<AgentFlow url="..." theme="light" />
```

**Custom CSS variables:**

```tsx
<AgentFlow
  url="..."
  customTheme={{
    '--af-accent': '#ff6b6b',
    '--af-bg': '#1a1a2e',
    '--af-text': '#eee',
  }}
/>
```

**Available CSS variables:**

| Variable | Description | Dark Default | Light Default |
|----------|-------------|--------------|---------------|
| `--af-bg` | Background color | `#0f1117` | `#ffffff` |
| `--af-bg-raised` | Raised surface bg | `#161822` | `#f8f9fb` |
| `--af-bg-hover` | Hover state bg | `#1c1f2e` | `#f0f1f5` |
| `--af-surface` | Surface color | `#1e2133` | `#f4f5f7` |
| `--af-border` | Border color | `#2a2d3e` | `#e2e4ea` |
| `--af-text` | Primary text | `#e2e4ed` | `#1a1d2e` |
| `--af-text-secondary` | Secondary text | `#8b8fa4` | `#6b7085` |
| `--af-accent` | Accent color | `#6e8bfa` | `#4f6ef7` |
| `--af-font` | Font family | System stack | System stack |
| `--af-mono` | Monospace font | Monospace stack | Monospace stack |
| `--af-radius` | Border radius | `10px` | `10px` |

---

## Sound Feedback

Enable subtle audio cues for events and connection changes.

```tsx
<AgentFlow url="..." enableSounds={true} />
```

**Sound events:**
- `playErrorSound()` - Error events
- `playConnectedSound()` - Connection established
- `playDisconnectedSound()` - Connection lost
- `playSearchCompleteSound()` - Search completed with results

All sounds use the Web Audio API and are no-ops in SSR environments.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open search |
| `?` | Toggle help panel |
| `Esc` | Close current panel/modal |

**Search features:**
- Full-text search across messages, tools, results, and types
- Real-time match count
- Keyboard navigation

**Context menu (right-click on event):**
- Copy event JSON
- Copy as cURL (tool_call events)
- Bookmark/unbookmark
- Filter by agent
- Filter by event type
- Show details
