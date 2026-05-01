# Node.js Express Example

Complete example of using agent-sse-flow with Express.

## Setup

```bash
npm install express cors
```

## Server Code

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());

// SSE endpoint
app.get('/agent/stream', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  // Helper to send SSE events
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Simulate agent execution
  let delay = 0;
  
  const scheduleEvent = (data, ms) => {
    setTimeout(() => sendEvent(data), delay + ms);
  };
  
  // Start
  scheduleEvent({
    type: 'start',
    message: 'Agent initialized',
    agentName: 'assistant',
    agentColor: '#8b5cf6'
  }, 0);
  
  // Thinking
  scheduleEvent({
    type: 'thinking',
    message: 'Processing request...',
    agentName: 'assistant'
  }, 500);
  
  // Tool call 1
  scheduleEvent({
    type: 'tool_call',
    tool: 'read_file',
    args: { path: '/src/app.ts' },
    agentName: 'assistant'
  }, 1000);
  
  scheduleEvent({
    type: 'tool_result',
    result: 'const app = express();\napp.get("/api", handler);',
    agentName: 'assistant',
    tokens: 200,
    cost: 0.003
  }, 1200);
  
  // Tool call 2
  scheduleEvent({
    type: 'tool_call',
    tool: 'edit_file',
    args: { 
      path: '/src/app.ts',
      changes: 'Added new endpoint'
    },
    agentName: 'assistant'
  }, 1800);
  
  scheduleEvent({
    type: 'tool_result',
    result: 'File updated successfully',
    agentName: 'assistant',
    duration: 89
  }, 2000);
  
  // Message
  scheduleEvent({
    type: 'message',
    message: 'I\'ve updated the file. Here\'s what changed:\n\n- Added `/api` endpoint\n- Implemented handler function',
    agentName: 'assistant'
  }, 2500);
  
  // End
  scheduleEvent({
    type: 'end',
    message: 'Task completed successfully',
    agentName: 'assistant',
    tokens: 450,
    cost: 0.007,
    duration: 2500
  }, 3000);
  
  // Handle client disconnect
  req.on('close', () => {
    res.end();
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## React Code

```tsx
import { AgentFlow } from 'agent-sse-flow'
import 'agent-sse-flow/style.css'

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <AgentFlow 
        url="http://localhost:3000/agent/stream"
        theme="dark"
        autoConnect={true}
        onStatusChange={(status) => console.log('Status:', status)}
        onError={(error) => console.error('Error:', error)}
      />
    </div>
  )
}
```

## Run

```bash
# Start server
node server.js

# Open React app
# AgentFlow will auto-connect
```

## TypeScript Version

```typescript
import express, { Request, Response } from 'express';
import cors from 'cors';

interface AgentEvent {
  type: 'start' | 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'end';
  message?: string;
  tool?: string;
  args?: Record<string, any>;
  result?: string;
  agentName?: string;
  agentColor?: string;
  cost?: number;
  tokens?: number;
  duration?: number;
}

const app = express();
app.use(cors());

app.get('/agent/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data: AgentEvent) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Your agent logic here...
  
  req.on('close', () => res.end());
});

app.listen(3000);
```

## Production Considerations

1. **Compression**: Don't compress SSE streams
2. **Timeouts**: Set appropriate keep-alive timeouts
3. **Load Balancing**: Use sticky sessions for WebSocket-like behavior
4. **Monitoring**: Track active connections
