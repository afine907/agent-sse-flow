# Next.js App Router Example

Complete example of using agent-sse-flow with Next.js 14+ App Router.

## Setup

```bash
npx create-next-app@latest my-app --typescript
cd my-app
npm install agent-sse-flow
```

## API Route (App Router)

Create `app/api/agent/stream/route.ts`:

```typescript
import { NextRequest } from 'next/server';

export const runtime = 'nodejs'; // Required for streaming
export const dynamic = 'force-dynamic'; // Disable caching

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };
      
      // Simulate agent execution
      const events = [
        { type: 'start', message: 'Agent started', agentName: 'assistant' },
        { type: 'thinking', message: 'Thinking...' },
        { type: 'tool_call', tool: 'search', args: { query: 'Next.js docs' } },
        { type: 'tool_result', result: 'Found 50 results' },
        { type: 'message', message: 'Here\'s what I found...' },
        { type: 'end', message: 'Done', tokens: 300, cost: 0.005 }
      ];
      
      for (const event of events) {
        send(event);
        await new Promise(r => setTimeout(r, 500));
      }
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

## Page Component

Create `app/page.tsx`:

```tsx
'use client';

import dynamic from 'next/dynamic';
import 'agent-sse-flow/style.css';

// Import dynamically to avoid SSR issues
const AgentFlow = dynamic(
  () => import('agent-sse-flow').then(mod => mod.AgentFlow),
  { ssr: false }
);

export default function Home() {
  return (
    <main style={{ height: '100vh' }}>
      <AgentFlow 
        url="/api/agent/stream"
        theme="dark"
      />
    </main>
  );
}
```

## With Custom Styling

```tsx
'use client';

import dynamic from 'next/dynamic';
import 'agent-sse-flow/style.css';

const AgentFlow = dynamic(
  () => import('agent-sse-flow').then(mod => mod.AgentFlow),
  { ssr: false }
);

export default function AgentPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="text-3xl font-bold text-white mb-4">
        AI Agent Dashboard
      </h1>
      
      <div className="h-[600px] rounded-lg overflow-hidden border border-gray-700">
        <AgentFlow 
          url="/api/agent/stream"
          theme="dark"
          viewMode="timeline"
          onStatusChange={(status) => {
            console.log('Connection status:', status);
          }}
          onError={(error) => {
            console.error('Stream error:', error);
          }}
        />
      </div>
    </div>
  );
}
```

## Real Agent Integration (LangChain)

```typescript
// app/api/agent/stream/route.ts
import { NextRequest } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor } from 'langchain/agents';

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };
      
      try {
        send({ type: 'start', message: 'Agent initialized' });
        
        // Your LangChain agent logic here
        const llm = new ChatOpenAI({
          modelName: 'gpt-4',
          streaming: true,
          callbacks: [
            {
              handleLLMStart: () => {
                send({ type: 'thinking', message: 'Generating response...' });
              },
              handleLLMEnd: (output) => {
                send({ 
                  type: 'message', 
                  message: output.generations[0][0].text 
                });
              }
            }
          ]
        });
        
        // Execute agent...
        
        send({ type: 'end', message: 'Completed' });
      } catch (error) {
        send({ type: 'error', message: error.message });
      }
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  });
}
```

## NextAuth Integration

```typescript
// Protect SSE endpoint with NextAuth
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Your SSE stream logic...
}
```

## Run

```bash
npm run dev
# Open http://localhost:3000
```

## Tips

1. **Dynamic Import**: Use `next/dynamic` with `ssr: false` for AgentFlow
2. **API Routes**: Use App Router API routes for clean streaming
3. **Styling**: Import CSS in your component or layout
4. **CORS**: Not needed for same-origin requests
