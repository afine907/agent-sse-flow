# Vite + React Integration

Complete setup guide for using agent-sse-flow with Vite and React.

## Installation

```bash
pnpm create vite my-agent-app --template react-ts
cd my-agent-app
pnpm install
pnpm install agent-sse-flow
```

## Project Structure

```
my-agent-app/
├── src/
│   ├── App.tsx           # Main app with AgentFlow
│   ├── main.tsx          # Entry point
│   └── vite-env.d.ts
├── index.html
├── vite.config.ts        # Vite config with proxy
├── tsconfig.json
└── package.json
```

## Step 1: Vite Configuration

Update `vite.config.ts` with a proxy to avoid CORS issues during development:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy SSE requests to your backend during development
    proxy: {
      '/agent': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Do not rewrite - keep the full path
      },
    },
  },
});
```

## Step 2: Entry Point

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

## Step 3: App Component

`src/App.tsx`:

```tsx
import { useState } from 'react';
import { AgentFlow } from 'agent-sse-flow';
import 'agent-sse-flow/style.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');

  return (
    <div className={`app ${theme}`} style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, marginRight: 'auto' }}>
          Agent Flow Demo
        </h1>

        <label>
          Theme:
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
            style={{ marginLeft: '4px' }}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>

        <label>
          View:
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'list' | 'timeline')}
            style={{ marginLeft: '4px' }}
          >
            <option value="timeline">Timeline</option>
            <option value="list">List</option>
          </select>
        </label>
      </div>

      {/* AgentFlow fills remaining space */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <AgentFlow
          url="/agent/stream"
          theme={theme}
          viewMode={viewMode}
          autoConnect={true}
          autoReconnect={true}
          onStatusChange={(status) => console.log('Status:', status)}
          onError={(error) => console.error('Error:', error)}
        />
      </div>
    </div>
  );
}

export default App;
```

## Step 4: Base Styles

`src/index.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app.dark {
  background-color: #111827;
  color: #f9fafb;
}

.app.light {
  background-color: #f9fafb;
  color: #111827;
}
```

## Running with a Backend

### Option A: Express Backend (same machine)

Terminal 1 - start the backend:

```bash
cd backend
node server.js  # Runs on port 8000
```

Terminal 2 - start Vite:

```bash
cd my-agent-app
pnpm dev  # Runs on port 5173
```

The Vite proxy forwards `/agent/stream` requests to `http://localhost:8000/agent/stream`.

### Option B: External Backend (with CORS)

If the backend is on a different origin and already has CORS enabled, skip the proxy and use the full URL:

```tsx
<AgentFlow
  url="https://api.example.com/agent/stream"
  theme="dark"
/>
```

### Option C: Vite Proxy with Path Rewrite

If the backend endpoint path differs:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/stream': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/stream/, '/v1/agent/sse'),
      },
    },
  },
});
```

## TypeScript Support

AgentFlow ships with full TypeScript types. Import them as needed:

```tsx
import { AgentFlow, type FlowEvent, type AgentFlowProps } from 'agent-sse-flow';

// FlowEvent is fully typed
const handleEvent = (event: FlowEvent) => {
  console.log(event.type);    // 'start' | 'thinking' | 'tool_call' | ...
  console.log(event.tool);    // string | undefined
  console.log(event.args);    // Record<string, unknown> | undefined
};
```

## Custom Event Handling with useSSE

If you need more control, use the `useSSE` hook directly (lower-level API):

```tsx
import { useSSE } from 'agent-sse-flow';

function CustomAgentView() {
  const {
    events,
    status,
    stats,
    connect,
    disconnect,
    clearEvents,
  } = useSSE({ url: '/agent/stream' });

  return (
    <div>
      <div>Status: {status}</div>
      <div>Total cost: ${stats.totalCost.toFixed(4)}</div>
      <div>Tokens: {stats.totalTokens}</div>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
      <button onClick={clearEvents}>Clear</button>

      <ul>
        {events.map((event) => (
          <li key={event.id}>
            [{event.type}] {event.message || event.tool || event.result}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Build for Production

```bash
pnpm build
# Output in dist/ - serve with any static file server
```

For production, ensure your backend has CORS configured for your frontend domain, or serve both from the same origin with a reverse proxy.

## Run

```bash
pnpm dev
# Open http://localhost:5173
```

## Key Points

1. **No SSR issues**: Vite is client-only by default, so `EventSource` works out of the box.
2. **Proxy for CORS**: Use `server.proxy` in `vite.config.ts` during development to avoid CORS errors.
3. **CSS import**: Always import `agent-sse-flow/style.css` alongside the component.
4. **Hot reload**: Vite HMR works with AgentFlow - component state resets on save.
5. **TypeScript**: Full type support included. No additional `@types` package needed.
