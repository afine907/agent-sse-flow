# Next.js App Router Integration

Complete guide for integrating agent-sse-flow into a Next.js 14+ App Router project.

## Installation

```bash
npx create-next-app@latest my-agent-app --typescript --tailwind --app
cd my-agent-app
pnpm install agent-sse-flow
```

## Project Structure

```
my-agent-app/
├── app/
│   ├── api/
│   │   └── agent/
│   │       └── stream/
│   │           └── route.ts      # SSE API endpoint
│   ├── components/
│   │   └── AgentFlowClient.tsx   # Client component wrapper
│   ├── layout.tsx
│   └── page.tsx                  # Server component page
├── next.config.mjs
└── package.json
```

## Step 1: SSE API Route

Create `app/api/agent/stream/route.ts`:

```typescript
import { NextRequest } from 'next/server';

// Required: use Node.js runtime for streaming
export const runtime = 'nodejs';

// Required: disable static generation
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // Simulate agent execution - replace with your agent logic
        send({
          type: 'start',
          message: 'Agent initialized',
          agentName: 'assistant',
          agentColor: '#3b82f6',
        });

        await delay(300);

        send({
          type: 'thinking',
          message: 'Analyzing your request...',
          agentName: 'assistant',
        });

        await delay(500);

        send({
          type: 'tool_call',
          tool: 'search',
          args: { query: 'relevant information' },
          agentName: 'assistant',
        });

        await delay(400);

        send({
          type: 'tool_result',
          result: 'Found 5 relevant documents',
          agentName: 'assistant',
          tokens: 150,
          cost: 0.002,
        });

        await delay(300);

        send({
          type: 'message',
          message: 'Here is the analysis based on the search results.',
          agentName: 'assistant',
        });

        await delay(200);

        send({
          type: 'end',
          message: 'Task completed',
          agentName: 'assistant',
          tokens: 500,
          cost: 0.008,
          duration: 1700,
        });
      } catch (error) {
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

## Step 2: Client Component Wrapper

Create `app/components/AgentFlowClient.tsx`:

```tsx
'use client';

import dynamic from 'next/dynamic';
import 'agent-sse-flow/style.css';

// Dynamic import with SSR disabled - required for EventSource
const AgentFlow = dynamic(
  () => import('agent-sse-flow').then((mod) => mod.AgentFlow),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-400">Loading agent...</span>
      </div>
    ),
  }
);

interface AgentFlowClientProps {
  url?: string;
  theme?: 'light' | 'dark';
}

export default function AgentFlowClient({
  url = '/api/agent/stream',
  theme = 'dark',
}: AgentFlowClientProps) {
  return (
    <div className="h-full w-full">
      <AgentFlow
        url={url}
        theme={theme}
        viewMode="timeline"
        autoReconnect={true}
        onStatusChange={(status) => {
          console.log('[AgentFlow] Status:', status);
        }}
        onError={(error) => {
          console.error('[AgentFlow] Error:', error);
        }}
      />
    </div>
  );
}
```

## Step 3: Page Component

Update `app/page.tsx`:

```tsx
import AgentFlowClient from './components/AgentFlowClient';

export default function Home() {
  return (
    <main className="h-screen w-screen bg-gray-950">
      <div className="h-full max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Agent Execution Trace
        </h1>
        <div className="h-[calc(100%-4rem)] rounded-lg overflow-hidden border border-gray-800">
          <AgentFlowClient />
        </div>
      </div>
    </main>
  );
}
```

## Step 4: Next.js Configuration

Update `next.config.mjs` to handle the CSS import:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['agent-sse-flow'],
};

export default nextConfig;
```

## Production API Route (with Backend Proxy)

For production, proxy the SSE request to your actual backend:

```typescript
// app/api/agent/stream/route.ts
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.AGENT_BACKEND_URL || 'http://localhost:8000';

  // Forward auth headers if needed
  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) {
    headers.set('Authorization', auth);
  }

  const response = await fetch(`${backendUrl}/agent/stream`, {
    headers,
    signal: request.signal,
  });

  // Pipe the backend SSE stream through
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
```

## Authentication with NextAuth

```typescript
// app/api/agent/stream/route.ts
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Proceed with SSE stream...
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Your agent logic here, using session.user for auth context
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

## POST Route with Request Body

For agents that accept a prompt:

```typescript
// app/api/agent/stream/route.ts
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { prompt, conversationId } = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      send({ type: 'start', message: `Processing: ${prompt}` });

      // Your agent logic using the prompt...

      send({ type: 'end', message: 'Done' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

Then call with a POST-capable URL in the client:

```tsx
// Use the URL that your backend expects
<AgentFlow url="/api/agent/stream?prompt=hello" theme="dark" />
```

## Run

```bash
pnpm dev
# Open http://localhost:3000
```

## Key Points

1. **SSR must be disabled**: `EventSource` is a browser API. Always use `next/dynamic` with `{ ssr: false }`.
2. **Use `'use client'`**: The wrapper component must be a Client Component.
3. **Runtime must be `'nodejs'`**: The default Edge Runtime does not support streaming `ReadableStream` properly for SSE.
4. **Set `dynamic = 'force-dynamic'`**: Prevents Next.js from caching the route.
5. **Same-origin URLs**: Using `/api/...` avoids CORS entirely.
6. **CSS import**: Import `agent-sse-flow/style.css` in the client component.
