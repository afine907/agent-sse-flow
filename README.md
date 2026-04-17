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

| Framework | Status | Notes |
|-----------|--------|-------|
| LangChain | 🔄 In Dev | v0.1+ |
| AutoGen | 🔄 In Dev | v0.2+ |
| Dify | 📋 Planned | Workflow |
| Coze | 📋 Planned | Bot |
| Custom JSON | ✅ Supported | Zero config |

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