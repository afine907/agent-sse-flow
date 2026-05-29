# Architecture

This document describes the internal architecture of agent-sse-flow, covering data flow, state management, rendering pipeline, and design decisions.

## High-Level Overview

agent-sse-flow is a single-component React library for visualizing AI agent execution traces from Server-Sent Events (SSE) streams. It is designed for:

- **Zero runtime dependencies** (React peer dependency only)
- **100K+ event handling** via virtual scrolling
- **Real-time streaming** with rAF-based batching
- **SSR safety** with graceful degradation

## Data Flow

The complete data flow from SSE endpoint to rendered pixels:

```
SSE Endpoint
    |
    v
[EventSource] -- native browser API
    |
    v
[sse-worker.ts] -- Web Worker (off-main-thread JSON parsing)
    |
    v
[useSSE hook] -- rAF batching, incremental stats
    |
    v
[React State] -- useState<FlowEvent[]>
    |
    v
[AgentFlow component] -- filtering, search, virtual list items
    |
    v
[@tanstack/react-virtual] -- virtual scrolling engine
    |
    v
[MemoizedEventRow] -- per-row rendering with React.memo
    |
    v
[EventRow / TimelineRow] -- presentational components
```

## Core Modules

### `useSSE.ts` -- Connection and Data Layer

The `useSSE` hook is the data backbone. It manages:

1. **EventSource lifecycle**: Connect, disconnect, reconnect with exponential backoff
2. **Web Worker delegation**: Off-main-thread JSON parsing to avoid blocking the UI
3. **rAF batching**: Incoming events are buffered in `pendingRef` and flushed once per animation frame via `requestAnimationFrame`
4. **Incremental stats**: Cost and token counts are tracked incrementally (no O(n) rescan on each render)
5. **Agent filtering**: `selectedAgent` state filters events by `agentName`

```
EventSource.onmessage
    |
    v
Web Worker.postMessage({ type: 'parse', raw: data })
    |
    v
Worker parses JSON, posts back { type: 'parsed', event }
    |
    v
pendingRef.current.push(event)
    |
    v
requestAnimationFrame -> flushPending()
    |
    v
setEvents(prev => [...prev, ...pending])
```

**Fallback**: If Web Workers are unavailable (SSR, restricted environments), JSON parsing falls back to the main thread via `parseOnMainThread`.

### `AgentFlow.tsx` -- Main Component

The main component (~1800 lines) orchestrates:

1. **State management**: 30+ useState hooks for UI state (search, filters, bookmarks, view modes, etc.)
2. **Event filtering pipeline**: Search -> Time range -> Event type -> Bookmark filters, each memoized
3. **Virtual list construction**: Builds `VirtualListItem[]` (either flat events or grouped by agent)
4. **Virtual scrolling**: `useVirtualizer` from @tanstack/react-virtual with dynamic height estimation
5. **Keyboard shortcuts**: Ctrl+K for search, `?` for help, Escape to close panels

#### Filtering Pipeline

```
filteredEvents (from useSSE, agent-filtered)
    |
    v
searchFilteredEvents (text search across message, tool, result, type)
    |
    v
timeFilteredEvents (datetime range filter)
    |
    v
typeFilteredEvents (event type checkboxes)
    |
    v
bookmarkFilteredEvents (bookmarked-only toggle)
    |
    v
virtualListItems (flat or grouped by agent)
```

Each step is wrapped in `useMemo` to avoid unnecessary recomputation.

### `EventRow.tsx` -- Rendering Components

Three rendering components, all wrapped in `React.memo`:

1. **`EventRow`**: Card-style list view with icon, message, tool details, result
2. **`TimelineRow`**: Collapsible timeline view with track line, dot, and expandable detail
3. **`WaterfallBar`**: Single bar in the waterfall Gantt chart view

#### TruncatedContent

Long content (>500 chars) is truncated with a "Show more" button. This prevents rendering huge markdown blocks for rows at the edges of the overscan buffer.

#### SyntaxHighlight

Lightweight JSON syntax highlighting via regex tokenization (no external library). Tokens are wrapped in colored `<span>` elements.

### `types.ts` -- Type Definitions

Core interfaces:

- `FlowEvent`: The event model with `type`, `message`, `tool`, `args`, `result`, `timestamp`, `agentName`, `cost`, `tokens`, `duration`
- `AgentFlowProps`: Component props including `url`, `theme`, `viewMode`, `maxEvents`, callbacks
- `EventType`: `'start' | 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'end'`
- `ViewMode`: `'list' | 'timeline' | 'waterfall' | 'dag' | 'swimlane'`

## Virtual Scrolling Strategy

### Why Virtual Scrolling?

With 100K+ events, rendering all DOM nodes would freeze the browser. Virtual scrolling renders only the visible rows plus a small overscan buffer.

### Implementation

Using `@tanstack/react-virtual`:

```typescript
const virtualizer = useVirtualizer({
  count: virtualListItems.length,
  getScrollElement: () => parentRef.current,
  estimateSize: (index) => {
    // Dynamic height estimation based on content
    // Group headers: 36px
    // Tool calls with args: 80-400px (based on line count)
    // Messages: 60-300px (based on line count)
    // Default: 80px
  },
  overscan: 5,
  getItemKey: (index) => virtualListItems[index].key,
});
```

### Dynamic Height Estimation

Since event content varies in size, `estimateSize` analyzes the content:

- Counts newlines in `argsJson`, `result`, or `message`
- Estimates height as `basePx + lineCount * 18px`
- Caps at a maximum (300-400px) to prevent outlier rows from breaking layout

### Visibility-Based Rendering

An `IntersectionObserver` (via `useVisibleRows`) tracks which rows have entered the viewport. Rows outside the viewport render a lightweight placeholder instead of the full `EventRow`, avoiding expensive markdown rendering at overscan edges.

```
Virtual row enters viewport
    |
    v
IntersectionObserver triggers
    |
    v
isVisible(index) returns true
    |
    v
Full MemoizedEventRow renders (with ReactMarkdown)
```

## CSS Theming System

### BEM Naming

All CSS classes follow BEM (Block Element Modifier) naming:

```
.agent-flow                    # Block
.agent-flow__header            # Element
.agent-flow__header-btn        # Element
.agent-flow__header-btn--active # Modifier
.agent-flow--dark              # Theme modifier (block level)
.agent-flow--light             # Theme modifier (block level)
```

### CSS Custom Properties

Theming uses CSS custom properties (variables):

```css
.agent-flow--dark {
  --af-bg: #1a1a2e;
  --af-text: #e0e0e0;
  --af-border: #2a2a3e;
  --af-accent: #3b82f6;
  /* ... */
}

.agent-flow--light {
  --af-bg: #ffffff;
  --af-text: #1a1a2e;
  --af-border: #e0e0e0;
  --af-accent: #2563eb;
  /* ... */
}
```

Components reference these variables:

```css
.agent-flow__event {
  background: var(--af-bg);
  color: var(--af-text);
  border-bottom: 1px solid var(--af-border);
}
```

### Custom Theme Override

Users can override CSS variables via the `customTheme` prop:

```tsx
<AgentFlow
  customTheme={{ '--af-accent': '#ff6b6b', '--af-bg': '#0d1117' }}
/>
```

This is merged as inline style on the root element.

## Web Worker Architecture

### Purpose

JSON parsing of SSE messages can be expensive when events arrive at high frequency. Offloading parsing to a Web Worker keeps the main thread free for rendering.

### Worker: `sse-worker.ts`

```
Main Thread                     Worker Thread
    |                               |
    |-- postMessage({parse, raw}) ->|
    |                               |-- JSON.parse(raw)
    |                               |-- Assign ID
    |<-- postMessage({parsed, e}) --|
    |                               |
    v                               v
pendingRef.push(event)          (idle)
```

### Fallback

If `Worker` is unavailable:
- `workerReadyRef.current` stays `false`
- All parsing happens on the main thread via `parseOnMainThread`
- Same batching logic applies (rAF flush)

### Error Handling

Worker errors are caught and logged. The system falls back to main-thread parsing if the worker fails.

## Performance Optimizations

### 1. rAF Batching

Events are buffered and flushed once per animation frame, preventing multiple `setState` calls per frame.

### 2. Incremental Stats

Cost and token totals are maintained as running sums in `statsRef`, not recalculated from the full event array.

### 3. React.memo

All row components are wrapped in `React.memo` with stable callback references (via `useCallback` in `MemoizedEventRow`).

### 4. Memoized Filters

The filtering pipeline uses chained `useMemo` calls so only changed filters trigger recomputation.

### 5. Visibility-Based Placeholder

Rows outside the viewport render a lightweight placeholder instead of full markdown content.

### 6. Dynamic Height Estimation

The virtualizer estimates row heights based on content analysis, reducing layout shift and re-measurement.

## View Modes

### List (default)

Card-style rows with event icon, type badge, message, tool details, and result. Supports compact mode for denser display.

### Timeline

Collapsible rows with a vertical track line and colored dots. Events default to collapsed and expand on click.

### Waterfall

Gantt-chart style view showing event duration as horizontal bars. Time axis with ticks at 25% intervals.

### DAG

Directed acyclic graph visualization showing event relationships and flow.

### Swimlane

Horizontal swimlane view grouping events by agent.

## Multi-Agent Support

Events can include `agentName`, `agentColor`, and `agentAvatar` fields. The component supports:

- **Agent filtering**: Dropdown to filter events by agent
- **Group by agent**: Collapsible agent groups in list/waterfall view
- **Drag-to-reorder**: Agent order can be customized via drag and drop
- **Agent avatars**: URL images, emoji, or first-letter circles

## Reconnection Strategy

The `useSSE` hook implements automatic reconnection with exponential backoff:

```
Attempt 1: 1s delay
Attempt 2: 2s delay
Attempt 3: 4s delay
...
Attempt N: min(2^N, 30)s delay
Max attempts: 10 (configurable)
```

Manual disconnect (`disconnect()`) sets `manualDisconnectRef` to prevent auto-reconnect.
