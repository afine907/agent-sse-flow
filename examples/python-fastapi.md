# Python FastAPI Example

Complete example of using agent-sse-flow with FastAPI.

## Setup

```bash
pip install fastapi uvicorn
```

## Server Code

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/agent/stream")
async def agent_stream():
    """SSE endpoint for agent events."""
    
    async def generate():
        # Start event
        yield format_sse({
            "type": "start",
            "message": "Agent started",
            "agentName": "main",
            "agentColor": "#3b82f6"
        })
        
        await asyncio.sleep(0.5)
        
        # Thinking
        yield format_sse({
            "type": "thinking",
            "message": "Analyzing your request...",
            "agentName": "main"
        })
        
        await asyncio.sleep(0.3)
        
        # Tool call
        yield format_sse({
            "type": "tool_call",
            "tool": "read_file",
            "args": {"path": "/src/index.ts"},
            "agentName": "main",
            "duration": 45
        })
        
        await asyncio.sleep(0.2)
        
        # Tool result
        yield format_sse({
            "type": "tool_result",
            "result": "export function main() {\n  console.log('Hello');\n}",
            "agentName": "main",
            "tokens": 150,
            "cost": 0.002
        })
        
        await asyncio.sleep(0.3)
        
        # Sub-agent call
        yield format_sse({
            "type": "thinking",
            "message": "Delegating to researcher...",
            "agentName": "main"
        })
        
        await asyncio.sleep(0.2)
        
        # Sub-agent work
        yield format_sse({
            "type": "tool_call",
            "tool": "search",
            "args": {"query": "best practices"},
            "agentName": "researcher",
            "agentColor": "#10b981"
        })
        
        await asyncio.sleep(0.3)
        
        yield format_sse({
            "type": "tool_result",
            "result": "Found 10 relevant documents",
            "agentName": "researcher"
        })
        
        await asyncio.sleep(0.2)
        
        # Final message
        yield format_sse({
            "type": "message",
            "message": "Analysis complete! Here's what I found...",
            "agentName": "main"
        })
        
        await asyncio.sleep(0.1)
        
        # End
        yield format_sse({
            "type": "end",
            "message": "Task completed",
            "agentName": "main",
            "duration": 1500,
            "tokens": 350,
            "cost": 0.005
        })
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

def format_sse(data: dict) -> str:
    """Format data as SSE message."""
    return f"data: {json.dumps(data)}\n\n"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## React Code

```tsx
import { AgentFlow } from 'agent-sse-flow'
import 'agent-sse-flow/style.css'

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <AgentFlow 
        url="http://localhost:8000/agent/stream"
        theme="dark"
      />
    </div>
  )
}
```

## Run

```bash
# Start server
python server.py

# Open React app
# The AgentFlow component will connect automatically
```

## Features Demonstrated

- ✅ Multi-agent hierarchy (main + researcher)
- ✅ Custom agent colors
- ✅ Cost tracking
- ✅ Token counting
- ✅ Duration tracking
- ✅ Tool calls with arguments
- ✅ Tool results

## Production Tips

1. **CORS**: Configure proper origins in production
2. **Authentication**: Add auth middleware
3. **Rate Limiting**: Implement rate limiting for SSE endpoints
4. **Error Handling**: Add proper error events
5. **Reconnection**: Handle client reconnection gracefully
