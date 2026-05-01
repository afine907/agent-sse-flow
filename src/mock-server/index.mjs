import { createServer } from 'node:http';

const PORT = process.env.PORT || 3001;

const EVENT_TYPES = ['start', 'thinking', 'tool_call', 'tool_result', 'message', 'error', 'end'];
const TOOL_NAMES = ['search', 'calculator', 'code_interpreter', 'web_browser', 'file_reader', 'database_query'];
const THOUGHTS = [
  'Analyzing the user request...',
  'Breaking down the problem into steps.',
  'Considering multiple approaches.',
  'Evaluating the best strategy.',
  'Checking constraints and requirements.',
];
const MESSAGES = [
  'Here is the result of the analysis.',
  'The operation completed successfully.',
  'I found the following information.',
  'Based on the data, here is my conclusion.',
  'The task has been processed.',
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEvent(seq) {
  const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  const base = { type, timestamp: Date.now() };

  switch (type) {
    case 'start':
      return { ...base, message: 'Agent execution started' };
    case 'thinking':
      return { ...base, message: randomChoice(THOUGHTS) };
    case 'tool_call':
      return { ...base, tool: randomChoice(TOOL_NAMES), args: { query: `test-query-${seq}` } };
    case 'tool_result':
      return { ...base, result: `Result for step ${seq}: ${Math.random().toFixed(6)}` };
    case 'message':
      return { ...base, message: randomChoice(MESSAGES) };
    case 'error':
      return { ...base, message: `Error at step ${seq}: timeout` };
    case 'end':
      return { ...base, message: 'Agent execution completed' };
    default:
      return base;
  }
}

function parseCount(url) {
  try {
    const params = new URL(url, 'http://localhost').searchParams;
    const count = parseInt(params.get('count') || '5000', 10);
    return Math.min(Math.max(count, 1), 100_000);
  } catch {
    return 5000;
  }
}

const server = createServer((req, res) => {
  const url = req.url || '/';

  if (url.startsWith('/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (url.startsWith('/config')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ defaultCount: 5000, maxCount: 100_000 }));
    return;
  }

  if (url.startsWith('/stream')) {
    const totalCount = parseCount(url);
    const BATCH_SIZE = 50;
    const BATCH_INTERVAL_MS = 100;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    let sent = 0;
    let seq = 0;

    const timer = setInterval(() => {
      const remaining = totalCount - sent;
      if (remaining <= 0) {
        clearInterval(timer);
        res.write(`data: ${JSON.stringify({ type: 'end', message: 'Stream complete', timestamp: Date.now() })}\n\n`);
        res.end();
        return;
      }

      const batchCount = Math.min(BATCH_SIZE, remaining);
      for (let i = 0; i < batchCount; i++) {
        const event = generateEvent(seq++);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      sent += batchCount;
    }, BATCH_INTERVAL_MS);

    req.on('close', () => {
      clearInterval(timer);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Mock SSE server running at http://localhost:${PORT}`);
  console.log(`  GET /stream?count=10000  - SSE stream with N events`);
  console.log(`  GET /health              - Health check`);
  console.log(`  GET /config              - Server config`);
});
