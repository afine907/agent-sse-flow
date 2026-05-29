# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-05-30

### Added

#### New View Modes
- **Waterfall View** - Gantt-chart style visualization showing event durations as horizontal bars with a time axis
- **DAG View** - Directed acyclic graph showing agent-to-agent dependencies inferred from event sequences
- **Swimlane View** - Parallel timeline lanes per agent for analyzing concurrent multi-agent execution

#### Advanced Analytics
- **Cost Dashboard** - Pie chart breakdown by event type and bar chart by agent with summary cards (total cost, total tokens, avg cost/tool call, tool call count)
- **Token Usage Chart** - Cumulative token and cost line charts over time with per-event-type breakdown
- **Performance Bottleneck Detection** - Automatic detection of slow tools (>3s), high-cost events (>$0.01), high error rates (>15%), long thinking steps (>10s), and low token efficiency
- **Event Clustering** - Group events by tool name or type for pattern recognition with aggregate stats (count, avg duration, total cost, total tokens)

#### Data Management
- **Snapshot Store** - Save and load event snapshots to IndexedDB for offline analysis (save, load, delete, clear)
- **Event Diff** - Field-level side-by-side comparison between any two FlowEvents
- **Stream Recording** - Record raw SSE streams as JSONL files with start/stop controls and auto-download
- **Event Validation** - Schema validation with field-level error reporting for incoming events

#### AI Integration
- **AI Analysis** - `prepareEventsForAnalysis` and `buildAnalysisPrompt` utilities for LLM-based trace analysis
- **onAnalyze Prop** - Callback prop for custom AI analysis integration

#### Transport Adapters
- **WebSocket Adapter** - `useWebSocket` hook as alternative to SSE with same API surface
- **HTTP Polling Adapter** - `usePolling` hook for environments without SSE/WebSocket support (long-polling with configurable interval)

#### UX Enhancements
- **Bookmarks** - Star events for quick reference with bookmark counter in header
- **Bookmark Filter** - Toggle to show only bookmarked events
- **Compact Mode** - Dense layout toggle for viewing more events at once
- **Event Type Filters** - Checkbox filters for each event type (start, thinking, tool_call, tool_result, message, error, end)
- **Time Range Filter** - Filter events by datetime-local range with clear button
- **Agent Grouping** - Group events by agent with collapsible sections and drag-to-reorder
- **Context Menu** - Right-click on events for copy JSON, copy as cURL, bookmark, filter by agent/type, show details
- **Copy as cURL** - Generate cURL commands from tool_call events
- **Resizable Component** - Bottom drag handle to resize component height
- **Event Detail Modal** - Click any event to view full JSON with copy button
- **Keyboard Shortcuts** - Ctrl/Cmd+K for search, `?` for help overlay, Escape to close panels
- **Connection Details** - Clickable status indicator showing URL, connection time, reconnect count, last error
- **Relative Time Toggle** - Switch between absolute and relative timestamps
- **Auto-Scroll Control** - Toggle auto-scroll with manual override when scrolling up
- **Error Navigation** - Jump between error events with highlight animation

#### Internationalization
- **i18n Support** - English and Chinese locales via `locale` prop with 60+ translation keys

#### Accessibility and Feedback
- **Sound Feedback** - Optional audio cues for error events, connection changes, and search results (`enableSounds` prop)
- **ARIA Labels** - Comprehensive screen reader support (role, aria-label, aria-expanded, aria-pressed, aria-live, aria-modal)
- **Keyboard Navigation** - Full keyboard accessibility for all interactive elements
- **Touch Support** - Touch event handling for mobile devices

#### Customization
- **Custom Themes** - Override any CSS variable via `customTheme` prop (applied as inline style)
- **Custom Renderers** - `renderMessage` and `renderResult` props for custom content rendering
- **Custom CSS** - `className` and `style` props for full styling control

#### Developer Experience
- **Web Worker JSON Parsing** - Off-main-thread JSON parsing for high-throughput streams when Worker is available
- **Visible Row Optimization** - IntersectionObserver-based lazy rendering for rows outside viewport
- **Memoized Event Rows** - Memoized EventRow wrapper with bound callbacks to prevent unnecessary re-renders
- **Storybook Integration** - Component stories for visual development

### Changed
- **ViewMode type expanded** - `'list' | 'timeline'` now includes `'waterfall' | 'dag' | 'swimlane'`
- **defaultCollapsed now defaults to `true`** - New events are collapsed by default in timeline mode (was `false`)
- **Dependencies** - Added `react-markdown` as runtime dependency for rich message rendering
- **Build script** - Now generates TypeScript declaration files (`.d.ts`) alongside JS bundles
- **AgentFlowProps** - Added `locale`, `enableSounds`, `onAnalyze` props
- **FlowEvent** - Added `agentAvatar` field for agent avatar support
- **SSEStats** - Added `agents` field tracking active agent names
- **ConnectionDetails** - New interface exposing URL, reconnect attempts, last error, and connection timestamp

### Fixed
- ESLint configuration restored for ESLint v9 flat config format
- TypeScript declaration files now properly generated during build

### Migration Guide (v2.x to v3.0.0)

**No breaking changes.** v3.0.0 is fully backward-compatible with v2.x.

1. Update the package:
   ```bash
   pnpm add agent-sse-flow@3
   ```

2. Import the new CSS (if using custom imports):
   ```tsx
   import 'agent-sse-flow/style.css'
   ```

3. Optionally adopt new features:
   ```tsx
   <AgentFlow
     url="http://localhost:8080/agent/stream"
     viewMode="waterfall"      // New: waterfall, dag, swimlane
     locale="en"               // New: i18n support
     enableSounds              // New: audio feedback
     onAnalyze={handleAnalyze} // New: AI analysis
   />
   ```

4. Optionally use new exported hooks:
   ```tsx
   import { useWebSocket, usePolling } from 'agent-sse-flow'
   ```

### Stats
- **Source files**: 26 TypeScript/TSX files in `src/`
- **Test suites**: 8 suites with 188 tests
- **Bundle size**: ESM 184KB (43KB gzip), CJS 128KB (37KB gzip), CSS 52KB (8KB gzip)
- **Type declarations**: 26 `.d.ts` files

## [2.3.0] - 2026-05-05

### Added
- **100K node support** - Virtual scrolling now supports up to 100,000 events
- **Incremental stats** - Cost and token tracking via useRef for O(1) updates at 100K+ events
- **LangChain quickstart example** - Complete example showing integration with LangChain/LangGraph
- **Event JSON Schema** - Formal schema documentation for the SSE event format

### Fixed
- Timeline layout spacing and track line adjustments

### Changed
- **Modular architecture** - Refactored from single 702-line file to 6 focused modules:
  - `types.ts` - AgentFlowProps and FlowEvent interfaces
  - `utils.ts` - formatTime, copyToClipboard, icon/color constants
  - `EventRow.tsx` - EventRow and TimelineRow components
  - `useSSE.ts` - SSE connection, rAF batching, and incremental stats
  - `AgentFlow.tsx` - Thin wrapper (~200 lines) for virtual scrolling
- Default maxEvents increased from 10,000 to 100,000

## [2.2.0] - 2026-05-04

### Changed
- Version bump for npm release

## [2.1.1] - 2026-05-04

### Changed
- Quality improvements and performance optimization

### Fixed
- Rebrand from TraceScope to agent-sse-flow
- GitHub Pages auto-configuration
- Test suite fixes (19/19 tests passing)
- Pre-existing test failures

## [2.1.0] - 2026-05-01

### Added
- **Multi-agent hierarchy** - `agentName` and `agentColor` fields for multi-agent systems
- **Cost tracking** - `cost`, `tokens`, `duration` fields for monitoring API usage
- **Agent filter** - Dropdown to filter events by agent
- **Demo website** - Live demo at https://afine907.github.io/agent-sse-flow/
- **Integration examples** - Python FastAPI, Node.js Express, Next.js, OpenAI Assistant, LangGraph
- **GitHub templates** - Issue and PR templates

### Fixed
- Memory leak prevention with mount state tracking
- EventSource cleanup on unmount
- Clipboard fallback for non-HTTPS environments
- Keyboard accessibility for timeline rows

### Changed
- Improved UI with timestamp display
- Added copy button for tool args and results
- Collapsible tool arguments
- Enhanced error handling

## [2.0.0] - 2026-05-01

### Added
- Timeline view mode with collapsible events
- Virtual scrolling for 100,000+ events
- Dark/Light theme support
- Connection status indicator
- Error handling with callbacks
- TypeScript support
- Performance tests with Playwright

### Changed
- Renamed from `react-tracescope` to `agent-sse-flow`
- Improved markdown rendering with `react-markdown`
- Better SSE batching with requestAnimationFrame

## [1.0.0] - 2026-04-01

### Added
- Initial release
- Basic SSE streaming visualization
- Event types: start, thinking, tool_call, tool_result, message, error, end
- Virtual scrolling
- NPM package
