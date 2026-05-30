# Contributing to agent-sse-flow

Thank you for your interest in contributing to agent-sse-flow! This document outlines the guidelines for contributing to this project.

## Code of Conduct

Please be respectful and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported
2. Create a detailed issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

### Suggesting Features

1. Check existing issues and PRs
2. Create an issue with:
   - Clear feature description
   - Use cases
   - Proposed implementation (optional)

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with **English comments**
4. Run tests: `npm run build` and `node test-e2e.js`
5. Commit with clear messages: `git commit -m 'feat: add new feature'`
6. Push to your fork: `git push origin feature/my-feature`
7. Create a Pull Request

## Development Setup

```bash
# Clone the repo
git clone https://github.com/your-username/agent-sse-flow.git
cd agent-sse-flow

# Install dependencies (pnpm required)
pnpm install

# Start development
pnpm dev              # Frontend dev server (port 5173)
pnpm mock-server      # Mock SSE server for testing

# Build and test
pnpm build            # Type-check + build library
pnpm type-check       # TypeScript validation
pnpm test             # Run unit tests (vitest)
pnpm perf-test        # Run performance tests (Playwright)
```

## Coding Standards

- **Language**: English comments throughout all code
- **TypeScript**: Strict mode, no `any` types
- **Naming**: 
  - Files: kebab-case (`node-operations.ts`)
  - Classes: PascalCase (`StateManager`)
  - Functions: camelCase (`buildTree`)
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/)

## Project Structure

```
src/
├── index.ts              # Library entry — exports all public API
├── AgentFlow.tsx         # Main component — all UI state + rendering
├── EventRow.tsx          # EventRow, TimelineRow, WaterfallBar, SyntaxHighlight
├── useSSE.ts             # SSE hook — rAF batching, auto-reconnect, stats
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

### Key Modules

| Module | Purpose |
|--------|---------|
| `AgentFlow.tsx` | Monolith component — filtering pipeline, virtual scrolling, all view modes |
| `EventRow.tsx` | Row rendering components (list, timeline, waterfall views) |
| `useSSE.ts` | SSE connection lifecycle, rAF batching, incremental stats |
| `adapters/` | Alternative transport adapters (WebSocket, HTTP polling) |
| `validate.ts` | Event schema validation with field-level errors |
| `perf-analyze.ts` | Detect slow tools, high cost, error rate bottlenecks |

## Commit Message Format

```
<type>(<scope>): <description>

Types:
  - feat: New feature
  - fix: Bug fix
  - docs: Documentation
  - style: Code style
  - refactor: Code refactoring
  - test: Tests
  - chore: Maintenance
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

<p align="center">Thank you for contributing! 🎉</p>