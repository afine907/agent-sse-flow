# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TraceScope is a high-performance React component library for visualizing AI agent execution traces with SSE streaming. It supports 5000+ nodes with virtual scrolling and provides adapter-based framework integration (LangChain, AutoGen, Dify).

## Common Commands

```bash
# Development
npm run dev              # Start Vite dev server (port 5173)
npm run dev:demo         # Start demo app with custom config
npm run mock-server      # Start mock SSE server (port 3001)

# Build
npm run build            # Build library (ES + CJS, outputs to dist/)
npm run type-check       # TypeScript validation without emit

# Linting
npm run lint             # ESLint for src/

# Performance Testing
npm run perf-test        # Run Playwright performance tests
```

## Architecture Overview

### Layered Architecture

```
React Adapter Layer (src/adapters/react/)
    └── TraceScopeProvider, hooks (useTraceScope, useTraceNode, etc.)

Component Layer (src/components/)
    └── TraceTree, TraceNode, VirtualTree, VirtualChat, StatusIndicator

Core Engine Layer (src/core/)
    ├── sse/        - SSE connection management, message parsing
    ├── state/      - Flattened Map storage, immutable updates
    ├── tree/       - Tree structure building from flat nodes
    └── renderer/   - Incremental rendering, debouncing

Protocol Layer (src/protocol/)
    ├── types.ts    - TraceEvent, NodeData, MessageData interfaces
    └── adapters/   - Framework adapters (langchain, autogen, dify, custom)

Type Definitions (src/types/)
    └── config.ts, node.ts, tree.ts, message.ts
```

### Data Flow

```
SSE Server → SSEManager → Parser → Validator → StateManager → TreeBuilder → React State → Components
```

### Key Design Patterns

1. **Adapter Pattern** (`src/protocol/adapters/`) - Normalizes different framework formats to unified protocol
2. **Provider Pattern** (`src/adapters/react/provider.tsx`) - React context for state management
3. **Virtual Scrolling** (`src/components/VirtualTree.tsx`) - Uses `@tanstack/react-virtual` for large lists

## Important Conventions

### TypeScript
- Strict mode enabled
- All code uses English comments (as per CONTRIBUTING.md)
- Path alias: `@tracescope` maps to `src/`

### File Naming
- Files: kebab-case (`node-operations.ts`)
- Classes: PascalCase (`StateManager`)
- Functions: camelCase (`buildTree`)

### Commits
Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## Protocol Format

The trace protocol is defined in `docs/TRACE_PROTOCOL.md`. Key types:

```typescript
interface TraceEvent {
  id: string;
  type: 'node' | 'edge' | 'status' | 'message';
  action: 'start' | 'update' | 'complete' | 'error';
  timestamp: number;
  data?: NodeData;
  message?: MessageData;
  status?: StatusData;
}
```

## Framework Adapters

Adapters transform framework-specific formats to the standard protocol:

| Adapter | Location | Framework |
|---------|----------|-----------|
| `custom` | `src/protocol/adapters/custom.ts` | Direct protocol input |
| `langchain` | `src/protocol/adapters/langchain.ts` | LangChain traces |
| `autogen` | `src/protocol/adapters/autogen.ts` | AutoGen events |
| `dify` | `src/protocol/adapters/dify.ts` | Dify workflows |

## Integrations

Ready-to-use integration packages in `src/integrations/`:

```typescript
// Each integration provides:
import {
  useFrameworkStream,     // Hook for SSE streaming
  useFrameworkEvents,     // Hook for static data
  createFrameworkConfig,  // Config factory
  frameworkDemoEvents,    // Demo data
} from 'react-tracescope/integrations/langchain';
```

## Mock Server

The mock server (`src/mock-server/index.js`) generates test data:
- Default: 5000 nodes
- Max: 10000 nodes
- Customize via query: `/stream?count=3000`
- Endpoints: `/stream`, `/health`, `/config`

## Performance Targets

| Nodes | FPS | Memory | First Paint |
|-------|-----|--------|-------------|
| 1,000 | 60fps | ~10MB | <50ms |
| 5,000 | 60fps | ~25MB | <80ms |
| 50,000 | 45fps | ~80MB | <150ms |

## Build Outputs

Library exports from `src/adapters/react/index.ts`:
- ESM: `dist/tracescope.es.js`
- CJS: `dist/tracescope.cjs.js`
- Types: `dist/index.d.ts`
- CSS: `dist/style.css`
- Integration subpaths: `dist/integrations/*/index.js`
