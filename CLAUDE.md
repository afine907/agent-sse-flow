# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

agent-sse-flow is a lightweight React component for visualizing AI agent execution traces from SSE streams. Published as `agent-sse-flow` on npm. Dual ESM/CJS output with TypeScript declarations.

## Common Commands

```bash
pnpm dev              # Start Vite dev server + mock SSE server (port 5173)
pnpm build            # Type-check + build library (ES + CJS to dist/)
pnpm type-check       # TypeScript validation without emit
pnpm lint             # ESLint for src/
pnpm test             # Run unit tests (vitest)
pnpm perf-test        # Run performance tests (Playwright)
pnpm dev-storybook    # Start Storybook
```

## Architecture

The codebase has ~25 source files in `src/`. The main component `AgentFlow.tsx` is a monolith (~1784 lines) handling all UI state, filtering, virtual scrolling, and view modes.

### Source Structure

```
src/
├── index.ts              # Library entry - exports all public API
├── AgentFlow.tsx         # Main component (monolith) - all UI state + rendering
├── EventRow.tsx          # EventRow, TimelineRow, WaterfallBar, SyntaxHighlight, AgentAvatar
├── useSSE.ts             # SSE connection hook - rAF batching, auto-reconnect, stats
├── useVisibleRows.ts     # IntersectionObserver for lazy row rendering
├── types.ts              # TypeScript interfaces (AgentFlowProps, FlowEvent, etc.)
├── utils.ts              # formatTime, copyToClipboard, export helpers, icon constants
├── AgentFlow.css         # All styles - BEM naming, dark/light themes, CSS variables
├── i18n.ts               # Internationalization (en/zh)
├── sounds.ts             # Web Audio API tone generation
├── storage.ts            # IndexedDB event persistence
├── snapshot-store.ts     # IndexedDB snapshot save/load
├── validate.ts           # FlowEvent schema validation
├── perf-analyze.ts       # Performance bottleneck detection
├── recording.ts          # JSONL stream recording
├── event-cluster.ts      # Event clustering by tool/type
├── event-diff.ts         # Event field-level diff
├── ai-analysis.ts        # AI analysis helpers (prompt building)
├── sse-worker.ts         # Web Worker for off-main-thread JSON parsing
├── DAGView.tsx           # Agent dependency graph (SVG)
├── SwimlaneView.tsx      # Multi-agent swimlane view
├── CostDashboard.tsx     # Cost pie chart + summary
├── TokenChart.tsx        # Token usage line chart (SVG)
├── adapters/
│   ├── websocket.ts      # WebSocket transport adapter
│   └── polling.ts        # HTTP polling transport adapter
├── main.tsx              # Dev-only demo page
├── mock-server/
│   └── index.mjs         # Mock SSE server for development
└── stories/
    └── AgentFlow.stories.tsx  # Storybook stories
```

### Data Flow

```
SSE Endpoint → EventSource → sse-worker.ts (Web Worker JSON.parse)
  → useSSE hook (rAF batching, incremental stats, auto-reconnect)
  → AgentFlow.tsx (filtering pipeline, virtual list construction)
  → @tanstack/react-virtual (virtual scrolling)
  → EventRow / DAGView / SwimlaneView / etc. (rendering)
```

### Filtering Pipeline

Events pass through: search query → time range → event type filter → bookmark filter → agent filter → display.

### Key Design Decisions

- **Zero runtime deps** besides React peer dep + @tanstack/react-virtual + react-markdown
- **BEM CSS** with CSS custom properties for theming (no CSS-in-JS)
- **Web Worker** for JSON parsing with main-thread fallback
- **rAF batching** — events buffer and flush once per animation frame
- **Incremental stats** — cost/tokens computed via useRef (not recalculated)

## Build Outputs

- ESM: `dist/agent-sse-flow.es.js`
- CJS: `dist/agent-sse-flow.cjs.js`
- Types: `dist/index.d.ts` (+ per-module .d.ts)
- CSS: `dist/style.css`

## Conventions

- **TypeScript** strict mode; English comments only
- **File naming:** kebab-case files, PascalCase components, camelCase functions
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- **Package manager:** pnpm (enforced via `.npmrc`)
- **CSS:** BEM naming with `.agent-flow--dark` / `.agent-flow--light` theme variants

## Testing

- Unit tests: `tests/*.test.ts(x)` using vitest + @testing-library/react
- Performance tests: `tests/perf.spec.ts` using Playwright
- Visual regression: `tests/visual.spec.ts` using Playwright
- Benchmarks: `tests/benchmark.test.ts` (separate vitest config)
