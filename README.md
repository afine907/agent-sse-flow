# TraceScope - Agent Trace Visualization Standard

> ⚡ High-Performance Agent Execution Trace Visualization Component | Support SSE Streaming

---

## Why TraceScope?

| Pain Point | TraceScope Solution |
|------------|---------------------|
| Each company defines its own trace format | ✅ **Protocol Standardization** - Unified data format |
| 5000+ nodes lag | ✅ **Extreme Performance** - Virtual scrolling + incremental rendering |
| High cost to adapt different frameworks | ✅ **Adapter Layer** - Zero-code framework switching |
| Hard to achieve smooth experience | ✅ **60fps Target** - Frame rate control + Web Worker |

### Key Features

- 📜 **Protocol-First** - Standard data format defined in [TRACE_PROTOCOL.md](./docs/TRACE_PROTOCOL.md)
- ⚡ **Extreme Performance** - Virtual scrolling supports 100,000+ nodes, 60fps smooth rendering
- 🔌 **Universal Adapter** - Supports LangChain / AutoGen / Dify / Coze and other mainstream frameworks
- 💬 **Chat Streaming** - Streaming output + Token billing in chat mode
- 🛠️ **TypeScript Full Support** - Complete type definitions, IDE auto-completion

### Quick Start

```tsx
import { TraceScopeProvider, TraceTree } from 'react-tracescope';
import 'react-tracescope/style.css';

function App() {
  return (
    <TraceScopeProvider
      config={{
        url: 'https://api.example.com/trace/stream',
        adapter: 'langchain',  // Auto-convert format
        autoConnect: true,
      }}
    >
      <TraceTree />
    </TraceScopeProvider>
  );
}
```

### Performance Benchmarks

| Nodes | FPS | Memory | First Paint |
|-------|-----|--------|-------------|
| 1,000 | 60fps | ~10MB | <50ms |
| 5,000 | 60fps | ~25MB | <80ms |
| 50,000 | 45fps | ~80MB | <150ms |
| 100,000 | 30fps | ~100MB | <200ms |

### Supported Frameworks

| Framework | Adapter | Status | Notes |
|-----------|---------|--------|-------|
| Custom JSON | `custom` | ✅ Stable | Zero config, follows protocol |
| LangChain | `langchain` | ✅ Stable | v0.1+ |
| AutoGen | `autogen` | ✅ Stable | v0.2+ |
| Dify | `dify` | ✅ Stable | Workflow |
| Coze | `coze` | 📋 Planned | Bot |

For detailed adapter usage, see [ADAPTERS.md](./docs/ADAPTERS.md).

### Examples - Ready-to-Use Demo Data

TraceScope provides built-in example data for each framework:

```tsx
import { TraceScopeProvider, TraceTree } from 'react-tracescope';
import { langchainAgentTrace, langchainAgentEvents } from 'react-tracescope';

// Use with adapter (for real-time SSE stream)
function App1() {
  return (
    <TraceScopeProvider config={{ adapter: 'langchain' }}>
      <TraceTree />
    </TraceScopeProvider>
  );
}

// Use with demo data (static)
function App2() {
  return (
    <TraceScopeProvider
      config={{ adapter: 'custom', autoConnect: false }}
      initialEvents={langchainAgentEvents}
    >
      <TraceTree />
    </TraceScopeProvider>
  );
}
```

**Available Examples:**

| Framework | Import | Description |
|-----------|--------|-------------|
| LangChain | `langchainAgentTrace` | Full Agent flow with LLM + Tool |
| AutoGen | `autogenMultiAgentTrace` | Multi-agent collaboration |
| Dify | `difyCustomerServiceWorkflow` | Customer service workflow |

### Installation

```bash
npm install react-tracescope
# or
pnpm add react-tracescope
```

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Start Mock SSE server
npm run mock-server

# Build
npm run build
```

### License

MIT © 2024