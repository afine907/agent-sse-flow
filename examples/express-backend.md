# Express.js SSE Backend

Complete Express.js backend for serving SSE events to agent-sse-flow.

## Installation

```bash
mkdir agent-backend && cd agent-backend
pnpm init
pnpm install express cors
pnpm install -D @types/express @types/cors typescript
```

## Project Structure

```
agent-backend/
├── src/
│   ├── server.ts          # Main Express app
│   ├── sse/
│   │   ├── helpers.ts     # SSE formatting utilities
│   │   └── agent-stream.ts # Agent stream handler
│   └── types.ts           # Shared types
├── tsconfig.json
└── package.json
```

## SSE Helper Utilities

`src/sse/helpers.ts`:

```typescript
import { Response } from 'express';

/** Agent event matching the FlowEvent interface */
export interface AgentEvent {
  type: 'start' | 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'end';
  message?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
  agentName?: string;
  agentColor?: string;
  agentAvatar?: string;
  cost?: number;
  tokens?: number;
  duration?: number;
}

/** Set the required SSE headers on the response */
export function setSSEHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();
}

/** Format and write an SSE event to the response */
export function sendSSE(res: Response, event: AgentEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/** Create a helper object bound to a specific response */
export function createSSEWriter(res: Response) {
  return {
    send(event: AgentEvent) {
      sendSSE(res, event);
    },
    start(message: string, agentName?: string, agentColor?: string) {
      sendSSE(res, { type: 'start', message, agentName, agentColor });
    },
    thinking(message: string, agentName?: string) {
      sendSSE(res, { type: 'thinking', message, agentName });
    },
    toolCall(tool: string, args: Record<string, unknown>, agentName?: string) {
      sendSSE(res, { type: 'tool_call', tool, args, agentName });
    },
    toolResult(result: string, agentName?: string, meta?: { tokens?: number; cost?: number; duration?: number }) {
      sendSSE(res, { type: 'tool_result', result, agentName, ...meta });
    },
    message(message: string, agentName?: string) {
      sendSSE(res, { type: 'message', message, agentName });
    },
    error(message: string) {
      sendSSE(res, { type: 'error', message });
    },
    end(message: string, agentName?: string, meta?: { tokens?: number; cost?: number; duration?: number }) {
      sendSSE(res, { type: 'end', message, agentName, ...meta });
    },
  };
}

export type SSEWriter = ReturnType<typeof createSSEWriter>;
```

## Agent Stream Handler

`src/sse/agent-stream.ts`:

```typescript
import { Response, Request } from 'express';
import { createSSEWriter, SSEWriter } from './helpers';

/**
 * Simulated agent execution.
 * Replace this with your actual agent logic (LLM calls, tool execution, etc.)
 */
async function runAgent(prompt: string, writer: SSEWriter): Promise<void> {
  const startTime = Date.now();

  writer.start('Agent initialized', 'assistant', '#3b82f6');

  await delay(200);

  // Thinking phase
  writer.thinking('Analyzing the request...', 'assistant');

  await delay(500);

  // Tool call
  writer.toolCall('search', { query: prompt }, 'assistant');

  await delay(800);

  writer.toolResult(
    'Found 3 relevant results for the query.',
    'assistant',
    { tokens: 120, cost: 0.001, duration: 800 }
  );

  await delay(300);

  // Another tool call
  writer.toolCall('summarize', { input: 'search results', style: 'concise' }, 'assistant');

  await delay(600);

  writer.toolResult(
    'Summary generated successfully.',
    'assistant',
    { tokens: 200, cost: 0.003, duration: 600 }
  );

  await delay(200);

  // Final message
  writer.message(
    `Based on the search results, here is the analysis for: "${prompt}"`,
    'assistant'
  );

  await delay(100);

  const totalDuration = Date.now() - startTime;

  writer.end('Task completed', 'assistant', {
    tokens: 520,
    cost: 0.008,
    duration: totalDuration,
  });
}

/**
 * Express route handler for the SSE endpoint.
 */
export function agentStreamHandler(req: Request, res: Response): void {
  setSSEHeaders(res);

  const writer = createSSEWriter(res);
  const prompt = (req.query.prompt as string) || 'Hello';

  // Track connection for cleanup
  let closed = false;

  req.on('close', () => {
    closed = true;
    res.end();
  });

  // Run agent asynchronously
  (async () => {
    try {
      await runAgent(prompt, writer);
    } catch (error) {
      if (!closed) {
        writer.error(error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      if (!closed) {
        res.end();
      }
    }
  })();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setSSEHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}
```

## Main Server

`src/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import { agentStreamHandler } from './sse/agent-stream';

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// SSE endpoint
app.get('/agent/stream', agentStreamHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Agent SSE backend running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/agent/stream`);
});
```

## JavaScript Version (No TypeScript)

`server.js`:

```javascript
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));

// SSE endpoint
app.get('/agent/stream', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const prompt = req.query.prompt || 'Hello';
  let closed = false;

  req.on('close', () => {
    closed = true;
  });

  // Simulated agent execution
  (async () => {
    try {
      send({ type: 'start', message: 'Agent started', agentName: 'assistant', agentColor: '#3b82f6' });
      await delay(200);

      send({ type: 'thinking', message: 'Processing...', agentName: 'assistant' });
      await delay(500);

      send({ type: 'tool_call', tool: 'search', args: { query: prompt }, agentName: 'assistant' });
      await delay(700);

      send({ type: 'tool_result', result: 'Search complete', agentName: 'assistant', tokens: 100, cost: 0.002 });
      await delay(300);

      send({ type: 'message', message: `Here are results for: "${prompt}"`, agentName: 'assistant' });

      send({ type: 'end', message: 'Done', agentName: 'assistant', tokens: 300, cost: 0.005, duration: 1700 });
    } catch (err) {
      if (!closed) {
        send({ type: 'error', message: err.message });
      }
    } finally {
      res.end();
    }
  })();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
```

## Handling Long-Running Agents

For agents that take a long time, send periodic heartbeats to keep the connection alive:

```typescript
import { SSEWriter } from './sse/helpers';
import { Response } from 'express';

async function longRunningAgent(writer: SSEWriter, res: Response): Promise<void> {
  // Send heartbeat every 15 seconds to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  try {
    writer.start('Long-running agent starting...');

    // Your agent logic here
    await delay(60000);

    writer.end('Done');
  } finally {
    clearInterval(heartbeat);
  }
}
```

## Error Handling with Cleanup

```typescript
import { Request, Response } from 'express';
import { createSSEWriter } from './sse/helpers';

export function robustStreamHandler(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const writer = createSSEWriter(res);
  let aborted = false;

  req.on('close', () => {
    aborted = true;
    // Cleanup: cancel any pending LLM requests, release resources
  });

  (async () => {
    try {
      writer.start('Starting...');

      // Your agent logic, checking `aborted` between steps
      if (aborted) return;

      // ... agent work ...

      if (aborted) return;

      writer.end('Complete');
    } catch (error) {
      if (!aborted) {
        writer.error(error instanceof Error ? error.message : 'Failed');
      }
    } finally {
      res.end();
    }
  })();
}
```

## Run

```bash
# TypeScript
npx ts-node src/server.ts

# JavaScript
node server.js

# Server starts on http://localhost:8000
# SSE endpoint at http://localhost:8000/agent/stream
```

## Key Points

1. **Headers**: Always set `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `Connection: keep-alive`.
2. **Format**: Each SSE message must be prefixed with `data: ` and end with `\n\n`.
3. **CORS**: Use the `cors` middleware. In production, restrict `origin` to your frontend domain.
4. **Cleanup**: Always handle `req.on('close')` to stop agent work when the client disconnects.
5. **Heartbeats**: For long-running agents, send comment lines (`: heartbeat\n\n`) every 15-30 seconds.
6. **Nginx**: If behind nginx, set `X-Accel-Buffering: no` header to prevent response buffering.
