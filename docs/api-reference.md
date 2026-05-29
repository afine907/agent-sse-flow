# API Reference

Complete API reference for `agent-sse-flow`. All exported types, interfaces, components, hooks, and utility functions.

## Table of Contents

- [Components](#components)
  - [AgentFlow](#agentflow)
  - [EventRow](#eventrow)
  - [TimelineRow](#timelinerow)
  - [AgentAvatar](#agentavatar)
  - [WaterfallBar](#waterfallbar)
  - [SyntaxHighlight](#syntaxhighlight)
  - [DAGView](#dagview)
  - [SwimlaneView](#swimlaneview)
  - [TokenChart](#tokenchart)
  - [CostDashboard](#costdashboard)
- [Hooks](#hooks)
  - [useSSE](#usesse)
  - [useWebSocket](#usewebsocket)
  - [usePolling](#usepolling)
- [Types](#types)
  - [AgentFlowProps](#agentflowprops)
  - [FlowEvent](#flowevent)
  - [EventType](#eventtype)
  - [Theme](#theme)
  - [ViewMode](#viewmode)
  - [EventStatus](#eventstatus)
  - [SSEStats](#ssestats)
  - [UseSSEReturn](#usessereturn)
  - [ConnectionDetails](#connectiondetails)
- [Validation](#validation)
  - [validateFlowEvent](#validateflowevent)
  - [formatValidationErrors](#formatvalidationerrors)
- [Snapshot Store](#snapshot-store)
  - [saveSnapshot](#savesnapshot)
  - [loadAllSnapshots](#loadallsnapshots)
  - [loadSnapshot](#loadsnapshot)
  - [deleteSnapshot](#deletesnapshot)
  - [clearAllSnapshots](#clearallsnapshots)
- [Event Diff](#event-diff)
  - [diffEvents](#diffevents)
- [AI Analysis](#ai-analysis)
  - [prepareEventsForAnalysis](#prepareeventsforanalysis)
  - [buildAnalysisPrompt](#buildanalysisprompt)
- [Event Clustering](#event-clustering)
  - [clusterEvents](#clusterevents)
  - [getClusterColor](#getclustercolor)
- [Performance Analysis](#performance-analysis)
  - [analyzePerformance](#analyzeperformance)
- [Recording](#recording)
  - [createRecordingBuffer](#createrecordingbuffer)
  - [downloadJSONL](#downloadjsonl)
  - [parseJSONL](#parsejsonl)
- [i18n](#i18n)
  - [createT](#createt)
- [Sounds](#sounds)
- [Utilities](#utilities)

---

## Components

### AgentFlow

The main component for visualizing agent execution traces from SSE streams.

```tsx
import { AgentFlow } from 'agent-sse-flow';

function App() {
  return (
    <AgentFlow
      url="http://localhost:8080/agent/stream"
      theme="dark"
      viewMode="timeline"
    />
  );
}
```

**Props:** See [AgentFlowProps](#agentflowprops)

---

### EventRow

Renders a single event in list view mode.

```tsx
import { EventRow } from 'agent-sse-flow';

<EventRow
  event={flowEvent}
  showArgs={false}
  onToggleArgs={(id) => {}}
  onEventClick={(event) => {}}
  highlighted={false}
  relativeTime={false}
  bookmarked={false}
  onToggleBookmark={(id) => {}}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `event` | `FlowEvent` | The event to render |
| `showArgs` | `boolean` | Whether tool arguments are expanded |
| `onToggleArgs` | `(id: number) => void` | Toggle argument visibility |
| `renderMessage?` | `(message: string) => ReactNode` | Custom message renderer |
| `renderResult?` | `(result: string) => ReactNode` | Custom result renderer |
| `onEventClick` | `(event: FlowEvent) => void` | Click handler |
| `highlighted` | `boolean` | Whether the row is highlighted |
| `relativeTime` | `boolean` | Show relative timestamps |
| `bookmarked` | `boolean` | Whether the event is bookmarked |
| `onToggleBookmark` | `(id: number) => void` | Toggle bookmark |

---

### TimelineRow

Renders a single event in timeline view mode (collapsible).

**Props:** Same as `EventRow`, plus:

| Prop | Type | Description |
|------|------|-------------|
| `collapsed` | `boolean` | Whether the event is collapsed |
| `onToggle` | `() => void` | Toggle collapse state |

---

### AgentAvatar

Renders an agent avatar (image, emoji, or text fallback).

```tsx
import { AgentAvatar } from 'agent-sse-flow';

<AgentAvatar avatar="🤖" name="researcher" color="#3b82f6" size={24} />
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `avatar?` | `string` | Image URL, emoji, or short text |
| `name` | `string` | Agent name (used as fallback) |
| `color?` | `string` | Background color hex |
| `size` | `number` | Size in pixels |

---

### WaterfallBar

Renders a waterfall bar for a single event in waterfall view.

```tsx
import { WaterfallBar } from 'agent-sse-flow';

<WaterfallBar
  event={flowEvent}
  startTime={1700000000000}
  totalDuration={5000}
  onClick={(event) => {}}
  highlighted={false}
/>
```

---

### SyntaxHighlight

Syntax highlighting component for code blocks.

```tsx
import { SyntaxHighlight } from 'agent-sse-flow';

<SyntaxHighlight code="{ \"key\": \"value\" }" language="json" />
```

---

### DAGView

Directed Acyclic Graph visualization of event dependencies.

```tsx
import { DAGView } from 'agent-sse-flow';

<DAGView events={flowEvents} theme="dark" />
```

---

### SwimlaneView

Swimlane visualization showing events across multiple agents.

```tsx
import { SwimlaneView } from 'agent-sse-flow';

<SwimlaneView events={flowEvents} theme="dark" />
```

---

### TokenChart

Token usage visualization chart.

```tsx
import { TokenChart } from 'agent-sse-flow';

<TokenChart events={flowEvents} />
```

---

### CostDashboard

Cost breakdown dashboard showing per-agent and per-tool costs.

```tsx
import { CostDashboard } from 'agent-sse-flow';

<CostDashboard events={flowEvents} />
```

---

## Hooks

### useSSE

Core hook for connecting to an SSE endpoint and receiving FlowEvent objects.

```tsx
import { useSSE } from 'agent-sse-flow';

const {
  events,
  filteredEvents,
  status,
  stats,
  selectedAgent,
  setSelectedAgent,
  connect,
  disconnect,
  clearEvents,
  isSupported,
  connectionDetails,
} = useSSE({
  url: 'http://localhost:8080/stream',
  autoConnect: true,
  maxEvents: 100_000,
});
```

**Options (`UseSSEOptions`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | (required) | SSE endpoint URL |
| `autoConnect` | `boolean` | (required) | Auto-connect on mount |
| `maxEvents` | `number` | (required) | Max events to keep in memory |
| `onError?` | `(error: Error) => void` | - | Error callback |
| `onStatusChange?` | `(status: EventStatus) => void` | - | Connection status callback |
| `autoReconnect?` | `boolean` | `true` | Reconnect automatically on disconnect |
| `maxReconnectAttempts?` | `number` | `10` | Max reconnect attempts |
| `onRawEvent?` | `(rawData: string) => void` | - | Raw SSE data callback (for recording) |

**Returns (`UseSSEReturn`):**

| Property | Type | Description |
|----------|------|-------------|
| `events` | `FlowEvent[]` | All events |
| `filteredEvents` | `FlowEvent[]` | Events filtered by selectedAgent |
| `status` | `EventStatus` | Connection status |
| `stats` | `SSEStats` | Aggregated statistics |
| `selectedAgent` | `string \| null` | Currently selected agent filter |
| `setSelectedAgent` | `(agent: string \| null) => void` | Set agent filter |
| `connect` | `() => () => void` | Connect to SSE (returns cleanup function) |
| `disconnect` | `() => void` | Disconnect from SSE |
| `clearEvents` | `() => void` | Clear all events |
| `isSupported` | `boolean` | Whether EventSource is available |
| `connectionDetails` | `ConnectionDetails` | Detailed connection info |

---

### useWebSocket

WebSocket transport adapter. Same API as `useSSE` but uses WebSocket instead of SSE.

```tsx
import { useWebSocket } from 'agent-sse-flow';

const { events, status, connect, disconnect } = useWebSocket({
  url: 'ws://localhost:8080/ws',
  autoConnect: true,
  maxEvents: 100_000,
});
```

**Options (`UseWebSocketOptions`):**

Same as `UseSSEOptions`, plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `protocols?` | `string \| string[]` | - | WebSocket protocols |

**Returns (`UseWebSocketReturn`):** Same as `UseSSEReturn`.

---

### usePolling

HTTP polling transport adapter. Fallback when neither SSE nor WebSocket is available.

```tsx
import { usePolling } from 'agent-sse-flow';

const { events, status, connect, disconnect } = usePolling({
  url: 'http://localhost:8080/poll',
  autoConnect: true,
  maxEvents: 100_000,
  pollInterval: 1000,
});
```

**Options (`UsePollingOptions`):**

Same as `UseSSEOptions`, plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pollInterval?` | `number` | `1000` | Polling interval in ms |
| `timeout?` | `number` | `30000` | Request timeout in ms |
| `headers?` | `Record<string, string>` | - | Custom HTTP headers |

**Returns (`UsePollingReturn`):** Same as `UseSSEReturn`.

---

## Types

### AgentFlowProps

Props for the `AgentFlow` component.

```typescript
interface AgentFlowProps {
  url: string;
  theme?: Theme;
  autoConnect?: boolean;
  onError?: (error: Error) => void;
  onStatusChange?: (status: EventStatus) => void;
  maxEvents?: number;
  renderMessage?: (message: string) => React.ReactNode;
  renderResult?: (result: string) => React.ReactNode;
  viewMode?: ViewMode;
  defaultCollapsed?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  className?: string;
  style?: React.CSSProperties;
  customTheme?: Record<string, string>;
  searchKey?: string;
  locale?: Locale;
  enableSounds?: boolean;
  onAnalyze?: (events: FlowEvent[], options?: { focus?: string; maxEvents?: number }) => Promise<AnalysisResult>;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `string` | (required) | SSE endpoint URL |
| `theme?` | `'light' \| 'dark'` | `'dark'` | UI theme |
| `autoConnect?` | `boolean` | `true` | Auto-connect on mount |
| `onError?` | `(error: Error) => void` | - | Error callback |
| `onStatusChange?` | `(status: EventStatus) => void` | - | Connection status callback |
| `maxEvents?` | `number` | `100000` | Max events in memory |
| `renderMessage?` | `(message: string) => ReactNode` | - | Custom message renderer |
| `renderResult?` | `(result: string) => ReactNode` | - | Custom result renderer |
| `viewMode?` | `ViewMode` | `'list'` | View mode |
| `defaultCollapsed?` | `boolean` | `true` | Collapse new events in timeline |
| `autoReconnect?` | `boolean` | `true` | Auto-reconnect on disconnect |
| `maxReconnectAttempts?` | `number` | `10` | Max reconnect attempts |
| `className?` | `string` | - | Custom CSS class |
| `style?` | `React.CSSProperties` | - | Custom inline styles |
| `customTheme?` | `Record<string, string>` | - | CSS variable overrides |
| `locale?` | `'en' \| 'zh'` | `'en'` | UI language |
| `enableSounds?` | `boolean` | `false` | Sound feedback |
| `onAnalyze?` | `(events, options) => Promise<AnalysisResult>` | - | AI analysis callback |

---

### FlowEvent

Core event interface representing a single agent execution event.

```typescript
interface FlowEvent {
  id: number;
  type: EventType;
  message?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
  timestamp?: number;
  argsJson?: string;
  agentName?: string;
  agentColor?: string;
  agentAvatar?: string;
  cost?: number;
  tokens?: number;
  duration?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Unique event ID (auto-assigned) |
| `type` | `EventType` | Event type |
| `message?` | `string` | Event message |
| `tool?` | `string` | Tool name (for tool_call) |
| `args?` | `Record<string, unknown>` | Tool arguments |
| `result?` | `string` | Tool result |
| `timestamp?` | `number` | Unix timestamp in ms |
| `argsJson?` | `string` | Pre-serialized args for performance |
| `agentName?` | `string` | Agent name (multi-agent) |
| `agentColor?` | `string` | Agent color (hex) |
| `agentAvatar?` | `string` | Agent avatar (URL, emoji, or text) |
| `cost?` | `number` | Cost in USD |
| `tokens?` | `number` | Token count |
| `duration?` | `number` | Duration in ms |

---

### EventType

```typescript
type EventType = 'start' | 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'end';
```

---

### Theme

```typescript
type Theme = 'light' | 'dark';
```

---

### ViewMode

```typescript
type ViewMode = 'list' | 'timeline' | 'waterfall' | 'dag' | 'swimlane';
```

---

### EventStatus

```typescript
type EventStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
```

---

### SSEStats

Aggregated statistics for the event stream.

```typescript
interface SSEStats {
  totalCost: number;
  totalTokens: number;
  agents: string[];
}
```

---

### UseSSEReturn

Return type of the `useSSE` hook.

```typescript
interface UseSSEReturn {
  events: FlowEvent[];
  filteredEvents: FlowEvent[];
  status: EventStatus;
  stats: SSEStats;
  selectedAgent: string | null;
  setSelectedAgent: (agent: string | null) => void;
  connect: () => () => void;
  disconnect: () => void;
  clearEvents: () => void;
  isSupported: boolean;
  connectionDetails: ConnectionDetails;
}
```

---

### ConnectionDetails

Detailed connection status information.

```typescript
interface ConnectionDetails {
  url: string;
  reconnectAttempts: number;
  lastErrorMessage: string | null;
  connectedAt: number | null;
}
```

---

## Validation

### validateFlowEvent

Validates raw data against the FlowEvent schema. Returns structured errors.

```typescript
import { validateFlowEvent } from 'agent-sse-flow';

const result = validateFlowEvent(rawData);
if (!result.valid) {
  console.error(result.errors);
}
```

**Signature:**
```typescript
function validateFlowEvent(data: unknown): ValidationResult
```

**Returns:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}
```

---

### formatValidationErrors

Formats validation errors into a human-readable string.

```typescript
import { formatValidationErrors } from 'agent-sse-flow';

const errorStr = formatValidationErrors(result.errors);
// "[type] Invalid event type. Expected one of: start, thinking, ..."
```

**Signature:**
```typescript
function formatValidationErrors(errors: ValidationError[]): string
```

---

## Snapshot Store

Persistent event snapshots stored in IndexedDB.

### saveSnapshot

Save a snapshot of events to IndexedDB.

```typescript
import { saveSnapshot } from 'agent-sse-flow';

const snapshot = await saveSnapshot('my-snapshot', events);
console.log(snapshot.id); // "snap-1700000000000-abc123"
```

**Signature:**
```typescript
function saveSnapshot(name: string, events: FlowEvent[]): Promise<EventSnapshot>
```

---

### loadAllSnapshots

Load all saved snapshots, sorted by creation date (newest first).

```typescript
import { loadAllSnapshots } from 'agent-sse-flow';

const snapshots = await loadAllSnapshots();
```

**Signature:**
```typescript
function loadAllSnapshots(): Promise<EventSnapshot[]>
```

---

### loadSnapshot

Load a specific snapshot by ID.

```typescript
import { loadSnapshot } from 'agent-sse-flow';

const snapshot = await loadSnapshot('snap-1700000000000-abc123');
```

**Signature:**
```typescript
function loadSnapshot(id: string): Promise<EventSnapshot | null>
```

---

### deleteSnapshot

Delete a snapshot by ID.

```typescript
import { deleteSnapshot } from 'agent-sse-flow';

await deleteSnapshot('snap-1700000000000-abc123');
```

**Signature:**
```typescript
function deleteSnapshot(id: string): Promise<void>
```

---

### clearAllSnapshots

Delete all saved snapshots.

```typescript
import { clearAllSnapshots } from 'agent-sse-flow';

await clearAllSnapshots();
```

**Signature:**
```typescript
function clearAllSnapshots(): Promise<void>
```

---

### EventSnapshot

```typescript
interface EventSnapshot {
  id: string;
  name: string;
  createdAt: string;
  eventCount: number;
  events: FlowEvent[];
}
```

---

## Event Diff

### diffEvents

Compare two FlowEvent objects field by field.

```typescript
import { diffEvents } from 'agent-sse-flow';

const lines = diffEvents(eventA, eventB);
for (const line of lines) {
  console.log(`${line.type}: ${line.field} "${line.leftValue}" -> "${line.rightValue}"`);
}
```

**Signature:**
```typescript
function diffEvents(left: FlowEvent, right: FlowEvent): DiffLine[]
```

**Returns:**
```typescript
type DiffLineType = 'equal' | 'added' | 'removed' | 'changed';

interface DiffLine {
  type: DiffLineType;
  field: string;
  leftValue: string;
  rightValue: string;
}
```

---

## AI Analysis

### prepareEventsForAnalysis

Prepare events for AI analysis by trimming and optionally stripping args/results.

```typescript
import { prepareEventsForAnalysis } from 'agent-sse-flow';

const prepared = prepareEventsForAnalysis(events, {
  maxEvents: 100,
  includeArgs: false,
  includeResults: false,
});
```

**Signature:**
```typescript
function prepareEventsForAnalysis(events: FlowEvent[], options?: AnalysisOptions): FlowEvent[]
```

**Options:**
```typescript
interface AnalysisOptions {
  focus?: 'performance' | 'errors' | 'patterns' | 'all';
  maxEvents?: number;      // default: 100
  includeArgs?: boolean;   // default: false
  includeResults?: boolean; // default: false
}
```

---

### buildAnalysisPrompt

Build a text prompt for sending events to an AI model.

```typescript
import { buildAnalysisPrompt } from 'agent-sse-flow';

const prompt = buildAnalysisPrompt(events, { focus: 'performance' });
// "Analyze agent trace (50 events). Focus: performance.
//  [start] "Agent started"
//  [tool_call] tool=search "Searching..."
//  ..."
```

**Signature:**
```typescript
function buildAnalysisPrompt(events: FlowEvent[], options?: AnalysisOptions): string
```

---

### AnalysisResult

```typescript
interface AnalysisResult {
  summary: string;
  findings?: AnalysisFinding[];
  suggestions?: string[];
  raw?: string;
}

interface AnalysisFinding {
  category: 'performance' | 'error' | 'pattern' | 'optimization' | 'general';
  severity: 'info' | 'warning' | 'error';
  description: string;
  relatedEventIds?: number[];
}
```

---

### AnalyzeCallback

Type for the AI analysis callback used in `AgentFlowProps.onAnalyze`.

```typescript
type AnalyzeCallback = (
  events: FlowEvent[],
  options?: AnalysisOptions,
) => Promise<AnalysisResult>;
```

---

## Event Clustering

### clusterEvents

Group events by type or tool name into clusters with aggregated stats.

```typescript
import { clusterEvents } from 'agent-sse-flow';

const clusters = clusterEvents(events);
for (const cluster of clusters) {
  console.log(`${cluster.label}: ${cluster.count} events, avg ${cluster.avgDuration}ms`);
}
```

**Signature:**
```typescript
function clusterEvents(events: FlowEvent[]): EventCluster[]
```

**Returns:**
```typescript
interface EventCluster {
  key: string;          // e.g. "tool:search" or "type:message"
  label: string;        // e.g. "search" or "message"
  events: FlowEvent[];
  count: number;
  avgDuration?: number;
  totalCost?: number;
  totalTokens?: number;
  expanded: boolean;
}
```

---

### getClusterColor

Get the display color for a cluster key.

```typescript
import { getClusterColor } from 'agent-sse-flow';

const color = getClusterColor('tool:search'); // "#f59e0b"
```

**Signature:**
```typescript
function getClusterColor(key: string): string
```

---

## Performance Analysis

### analyzePerformance

Analyze an event stream for performance bottlenecks.

```typescript
import { analyzePerformance } from 'agent-sse-flow';

const result = analyzePerformance(events, {
  slowToolThreshold: 3000,
  highCostThreshold: 0.01,
  errorRateThreshold: 0.15,
  longThinkingThreshold: 10000,
  costPerTokenThreshold: 0.0001,
});

for (const finding of result.findings) {
  console.log(`[${finding.severity}] ${finding.description}`);
  if (finding.suggestion) {
    console.log(`  Suggestion: ${finding.suggestion}`);
  }
}
```

**Signature:**
```typescript
function analyzePerformance(events: FlowEvent[], options?: PerfAnalysisOptions): PerfAnalysisResult
```

**Options:**
```typescript
interface PerfAnalysisOptions {
  slowToolThreshold?: number;      // default: 3000 (ms)
  highCostThreshold?: number;      // default: 0.01 (USD)
  errorRateThreshold?: number;     // default: 0.15 (ratio)
  longThinkingThreshold?: number;  // default: 10000 (ms)
  costPerTokenThreshold?: number;  // default: 0.0001 (USD)
}
```

**Returns:**
```typescript
interface PerfAnalysisResult {
  findings: PerfFinding[];
  totalEvents: number;
  analyzedAt: number;
}

interface PerfFinding {
  category: 'slow_tool' | 'high_cost' | 'error_rate' | 'long_thinking' | 'low_efficiency';
  severity: 'info' | 'warning' | 'error';
  description: string;
  relatedEventIds: number[];
  suggestion?: string;
}
```

---

## Recording

### createRecordingBuffer

Create a recording buffer for capturing raw SSE data.

```typescript
import { createRecordingBuffer } from 'agent-sse-flow';

const buffer = createRecordingBuffer();
buffer.start();
buffer.push('{"type":"start","message":"Hello"}');
buffer.push('{"type":"message","message":"World"}');
buffer.stop();

const jsonl = buffer.toJSONL();
// '{"type":"start","message":"Hello"}\n{"type":"message","message":"World"}\n'
```

**Signature:**
```typescript
function createRecordingBuffer(): RecordingBuffer
```

**RecordingBuffer methods:**

| Method | Description |
|--------|-------------|
| `start()` | Start recording |
| `stop()` | Stop recording |
| `push(rawJson: string)` | Push a raw SSE event JSON string |
| `isRecording` | Whether recording is active (getter) |
| `startTime` | When recording started (getter) |
| `count` | Number of captured events (getter) |
| `toJSONL()` | Get JSONL content as string |
| `getLines()` | Get captured raw JSON lines |
| `reset()` | Reset the buffer |

---

### downloadJSONL

Trigger a browser download of JSONL content.

```typescript
import { downloadJSONL } from 'agent-sse-flow';

downloadJSONL(jsonlContent);
// Downloads as: agent-flow-recording-2024-01-15T10-30-00-000Z.jsonl

downloadJSONL(jsonlContent, 'my-recording.jsonl');
```

**Signature:**
```typescript
function downloadJSONL(content: string, filename?: string): void
```

---

### parseJSONL

Parse a JSONL string into an array of objects. Useful for replaying recordings.

```typescript
import { parseJSONL } from 'agent-sse-flow';

const events = parseJSONL(jsonlContent);
// [{ type: "start", message: "Hello" }, { type: "message", message: "World" }]
```

**Signature:**
```typescript
function parseJSONL(jsonl: string): Record<string, unknown>[]
```

---

## i18n

### createT

Create a translation function for the given locale.

```typescript
import { createT } from 'agent-sse-flow';

const t = createT('en');
t('header.events');    // "events"
t('empty.noEvents');   // "No events yet. Waiting for agent..."

const tZh = createT('zh');
tZh('header.events');  // "个事件"
```

**Signature:**
```typescript
function createT(locale: Locale): (key: TranslationKey) => string
```

**Supported locales:** `'en'` (English), `'zh'` (Chinese)

---

## Sounds

Sound feedback functions for audio cues.

```typescript
import {
  playErrorSound,
  playConnectedSound,
  playDisconnectedSound,
  playSearchCompleteSound,
} from 'agent-sse-flow';

playErrorSound();        // Plays error beep
playConnectedSound();    // Plays connection established tone
playDisconnectedSound(); // Plays disconnection tone
playSearchCompleteSound(); // Plays search complete chime
```

All functions are synchronous and use the Web Audio API. They are no-ops in SSR environments.

---

## Utilities

Utility functions exported from the package.

```typescript
import {
  formatTime,
  formatRelativeTime,
  copyToClipboard,
  exportToJSON,
  exportToCSV,
  generateCurlCommand,
  getSummary,
  EVENT_DOT_COLORS,
} from 'agent-sse-flow';
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `formatTime` | `(ts: number) => string` | Format timestamp to HH:MM:SS |
| `formatRelativeTime` | `(ts: number) => string` | Format as relative time ("3s ago") |
| `copyToClipboard` | `(text: string) => Promise<boolean>` | Copy text to clipboard |
| `exportToJSON` | `(events: FlowEvent[]) => void` | Download events as JSON |
| `exportToCSV` | `(events: FlowEvent[]) => void` | Download events as CSV |
| `generateCurlCommand` | `(event: FlowEvent) => string` | Generate cURL from tool_call |
| `getSummary` | `(event: FlowEvent) => string` | One-line event summary |
| `EVENT_DOT_COLORS` | `Record<EventType, string>` | Color map for event types |
