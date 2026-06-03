# agent-sse-flow

A lightweight React component for visualizing AI Agent execution traces from SSE streams.

## Developer Commands

```bash
pnpm dev              # Dev server + mock SSE (port 5173)
pnpm build            # Build library (ES + CJS → dist/)
pnpm type-check       # TypeScript validation
pnpm lint             # ESLint check
pnpm test             # Unit tests (vitest, 188 tests)
pnpm perf-test        # Performance tests (Playwright)
pnpm dev-storybook    # Storybook
```

**Note**: Use `pnpm`, not `npm`. Enforced via `.npmrc`.

## Project Structure

```
src/
├── index.ts              # Library entry — exports all public API
├── AgentFlow.tsx         # Main component (~1784 lines) — all UI state + rendering
├── EventRow.tsx          # EventRow, TimelineRow, WaterfallBar, SyntaxHighlight
├── useSSE.ts             # SSE hook — rAF batching, auto-reconnect, incremental stats
├── useVisibleRows.ts     # IntersectionObserver for lazy rendering
├── types.ts              # TypeScript interfaces
├── utils.ts              # Utilities (formatTime, export, copy)
├── AgentFlow.css         # BEM styles, dark/light themes, CSS variables
├── i18n.ts               # Internationalization (en/zh)
├── sounds.ts             # Web Audio API feedback
├── storage.ts            # IndexedDB event persistence
├── snapshot-store.ts     # IndexedDB snapshot save/load
├── validate.ts           # Event schema validation
├── perf-analyze.ts       # Performance bottleneck detection
├── recording.ts          # JSONL stream recording
├── event-cluster.ts      # Event clustering
├── event-diff.ts         # Event diff comparison
├── ai-analysis.ts        # AI analysis prompt helpers
├── sse-worker.ts         # Web Worker for JSON parsing
├── DAGView.tsx           # Agent dependency graph (SVG)
├── SwimlaneView.tsx      # Multi-agent swimlane view
├── CostDashboard.tsx     # Cost pie chart
├── TokenChart.tsx        # Token usage chart (SVG)
├── adapters/
│   ├── websocket.ts      # WebSocket transport adapter
│   └── polling.ts        # HTTP polling transport adapter
├── main.tsx              # Dev demo page
├── mock-server/index.mjs # Mock SSE server
└── stories/              # Storybook stories
```

## Key API

```tsx
<AgentFlow
  url="http://localhost:8080/agent/stream"  // required
  theme="dark"                               // 'dark' | 'light'
  autoConnect={true}
  maxEvents={100000}
  viewMode="list"                            // 'list' | 'timeline'
  locale="en"                                // 'en' | 'zh'
  onError={fn}
  onStatusChange={fn}
/>
```

## Data Flow

```
SSE Endpoint → EventSource → sse-worker.ts (Web Worker JSON.parse)
  → useSSE hook (rAF batching, incremental stats, auto-reconnect)
  → AgentFlow.tsx (filtering pipeline, virtual list)
  → @tanstack/react-virtual → EventRow / DAGView / SwimlaneView
```

## Testing

- Unit: `pnpm test` (vitest, 188 tests across 8 files)
- Performance: `pnpm perf-test` (Playwright, 100K events)
- Visual: `pnpm visual-test` (Playwright screenshots)
- Benchmarks: `pnpm benchmark`

## Conventions

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- Comments: English only
- CSS: BEM naming + theme variants (`.agent-flow--dark`, `.agent-flow--light`)
- TypeScript: strict mode

## Documentation

- [README.md](./README.md) — Usage guide
- [CLAUDE.md](./CLAUDE.md) — Claude Code config
- [CHANGELOG.md](./CHANGELOG.md) — Version history
- [docs/api-reference.md](docs/api-reference.md) — Full API docs
- [docs/architecture.md](docs/architecture.md) — Architecture design
- [docs/advanced-features.md](docs/advanced-features.md) — Feature guide
