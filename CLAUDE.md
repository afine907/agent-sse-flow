# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

agent-sse-flow is a lightweight React component for visualizing AI agent execution traces from SSE streams. It is a single-component library (`AgentFlow`) with zero runtime dependencies (React peer dependency only). Published as `agent-sse-flow` on npm.

## Common Commands

```bash
pnpm dev              # Start Vite dev server (port 5173)
pnpm build            # Type-check + build library (ES + CJS to dist/)
pnpm type-check       # TypeScript validation without emit
pnpm lint             # ESLint for src/
```

## Architecture

The codebase is 8 source files in `src/`:

```
src/
├── index.ts          # Library entry - exports AgentFlow, AgentFlowProps, FlowEvent
├── AgentFlow.tsx     # Main component (~200 lines) - virtual scrolling + layout
├── EventRow.tsx      # EventRow and TimelineRow components
├── useSSE.ts         # SSE connection, rAF batching, incremental stats hook
├── types.ts          # TypeScript interfaces (AgentFlowProps, FlowEvent)
├── utils.ts          # formatTime, copyToClipboard, icon/color constants
├── AgentFlow.css     # Styles - dark/light themes, BEM naming (.agent-flow--dark)
└── main.tsx          # Dev-only demo page with mock events
```

**Data flow:** SSE endpoint → native `EventSource` → JSON parse → React `useState` → render event list via @tanstack/react-virtual.

**Event types:** `start`, `thinking`, `tool_call`, `tool_result`, `message`, `error`, `end`

**Exported API:**
- `AgentFlow` component with props: `url`, `theme`, `autoConnect`, `maxEvents`, `onError`, `onStatusChange`
- `FlowEvent` interface: `type`, `message`, `tool`, `args`, `result`, `timestamp`, `agentName?`, `agentColor?`, `cost?`, `tokens?`, `duration?`
- `AgentFlowProps` interface

**Build outputs** (dual ESM/CJS via Vite library mode):
- ESM: `dist/agent-sse-flow.es.js`
- CJS: `dist/agent-sse-flow.cjs.js`
- Types: `dist/index.d.ts`
- CSS: `dist/style.css`

## Conventions

- **TypeScript** strict mode; English comments only
- **File naming:** kebab-case files, PascalCase classes/components, camelCase functions
- **Commits:** Conventional Commits format (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- **Package manager:** pnpm (enforced via `.npmrc`)
- **CSS:** BEM-style naming with theme variants (`.agent-flow--dark`, `.agent-flow--light`)

## Notes

- Tests exist in `tests/` directory (vitest + Playwright). Run `pnpm test` for unit tests, `pnpm perf-test` for performance tests.
- CI (`.github/workflows/ci.yml`) runs `type-check`, `build`, and unit tests.
