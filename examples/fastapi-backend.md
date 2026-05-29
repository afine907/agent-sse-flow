# FastAPI SSE Backend

Complete FastAPI backend for serving SSE events to agent-sse-flow.

## Installation

```bash
pip install fastapi uvicorn
```

## Project Structure

```
agent-backend/
├── main.py              # FastAPI app with SSE endpoint
├── sse.py               # SSE formatting helpers
├── agent.py             # Agent logic (replace with your agent)
├── requirements.txt
└── README.md
```

## SSE Helpers

`sse.py`:

```python
import json
from dataclasses import dataclass, asdict
from typing import Optional, AsyncIterator
from fastapi.responses import StreamingResponse


@dataclass
class AgentEvent:
    """Event matching the FlowEvent interface."""
    type: str  # start | thinking | tool_call | tool_result | message | error | end
    message: Optional[str] = None
    tool: Optional[str] = None
    args: Optional[dict] = None
    result: Optional[str] = None
    agentName: Optional[str] = None
    agentColor: Optional[str] = None
    agentAvatar: Optional[str] = None
    cost: Optional[float] = None
    tokens: Optional[int] = None
    duration: Optional[int] = None

    def to_sse(self) -> str:
        """Format as SSE data line."""
        data = {k: v for k, v in asdict(self).items() if v is not None}
        return f"data: {json.dumps(data)}\n\n"


def sse_response(generator: AsyncIterator[str]) -> StreamingResponse:
    """Create a StreamingResponse with SSE headers."""
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

## Agent Logic

`agent.py`:

```python
import asyncio
from typing import AsyncIterator
from sse import AgentEvent


async def run_agent(prompt: str) -> AsyncIterator[str]:
    """
    Simulated agent execution.
    Replace with your actual agent logic (LLM calls, tool execution, etc.)
    """
    start_time = asyncio.get_event_loop().time()

    # Start event
    yield AgentEvent(
        type="start",
        message="Agent initialized",
        agentName="assistant",
        agentColor="#3b82f6",
    ).to_sse()

    await asyncio.sleep(0.3)

    # Thinking
    yield AgentEvent(
        type="thinking",
        message="Analyzing your request...",
        agentName="assistant",
    ).to_sse()

    await asyncio.sleep(0.5)

    # Tool call
    yield AgentEvent(
        type="tool_call",
        tool="search",
        args={"query": prompt},
        agentName="assistant",
    ).to_sse()

    await asyncio.sleep(0.8)

    # Tool result
    yield AgentEvent(
        type="tool_result",
        result=f"Found 5 relevant results for: {prompt}",
        agentName="assistant",
        tokens=150,
        cost=0.002,
        duration=800,
    ).to_sse()

    await asyncio.sleep(0.3)

    # Another tool call
    yield AgentEvent(
        type="tool_call",
        tool="read_file",
        args={"path": "/src/main.py"},
        agentName="assistant",
    ).to_sse()

    await asyncio.sleep(0.4)

    yield AgentEvent(
        type="tool_result",
        result='def main():\n    print("Hello, world!")',
        agentName="assistant",
        tokens=80,
        cost=0.001,
        duration=400,
    ).to_sse()

    await asyncio.sleep(0.2)

    # Final message
    yield AgentEvent(
        type="message",
        message=f"Here is the analysis for: **{prompt}**\n\nThe search found relevant information and the file was read successfully.",
        agentName="assistant",
    ).to_sse()

    await asyncio.sleep(0.1)

    # Calculate total duration
    elapsed = int((asyncio.get_event_loop().time() - start_time) * 1000)

    # End event
    yield AgentEvent(
        type="end",
        message="Task completed",
        agentName="assistant",
        tokens=430,
        cost=0.006,
        duration=elapsed,
    ).to_sse()
```

## Main FastAPI App

`main.py`:

```python
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sse import sse_response
from agent import run_agent

app = FastAPI(title="Agent SSE Backend")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Next.js dev server
        "http://localhost:8080",   # Generic dev server
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/agent/stream")
async def agent_stream(prompt: str = Query(default="Hello", description="The user prompt")):
    """
    SSE endpoint for agent execution trace.

    The response is a Server-Sent Events stream where each event
    is a JSON object matching the FlowEvent interface.
    """
    return sse_response(run_agent(prompt))


@app.post("/agent/stream")
async def agent_stream_post(body: dict):
    """POST variant that accepts a JSON body with the prompt."""
    prompt = body.get("prompt", "Hello")
    return sse_response(run_agent(prompt))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Multi-Agent Example

For systems with multiple agents:

```python
import asyncio
from typing import AsyncIterator
from sse import AgentEvent

AGENTS = {
    "coordinator": {"name": "coordinator", "color": "#3b82f6"},
    "researcher": {"name": "researcher", "color": "#10b981"},
    "writer": {"name": "writer", "color": "#f59e0b"},
}


async def run_multi_agent(prompt: str) -> AsyncIterator[str]:
    """Multi-agent execution with handoffs."""
    yield AgentEvent(
        type="start",
        message="Starting multi-agent workflow",
        agentName="coordinator",
        agentColor=AGENTS["coordinator"]["color"],
    ).to_sse()

    await asyncio.sleep(0.2)

    # Coordinator delegates to researcher
    yield AgentEvent(
        type="thinking",
        message="Delegating research task...",
        agentName="coordinator",
    ).to_sse()

    await asyncio.sleep(0.3)

    # Researcher works
    yield AgentEvent(
        type="tool_call",
        tool="search",
        args={"query": prompt, "depth": "thorough"},
        agentName="researcher",
        agentColor=AGENTS["researcher"]["color"],
    ).to_sse()

    await asyncio.sleep(1.0)

    yield AgentEvent(
        type="tool_result",
        result="Gathered 10 relevant sources",
        agentName="researcher",
        tokens=200,
        cost=0.003,
    ).to_sse()

    await asyncio.sleep(0.2)

    yield AgentEvent(
        type="message",
        message="Research complete. Handing off to writer.",
        agentName="researcher",
    ).to_sse()

    await asyncio.sleep(0.3)

    # Writer works
    yield AgentEvent(
        type="thinking",
        message="Drafting response from research...",
        agentName="writer",
        agentColor=AGENTS["writer"]["color"],
    ).to_sse()

    await asyncio.sleep(0.8)

    yield AgentEvent(
        type="message",
        message="Draft complete. Here is the synthesized response.",
        agentName="writer",
        tokens=350,
        cost=0.005,
    ).to_sse()

    await asyncio.sleep(0.2)

    # Coordinator wraps up
    yield AgentEvent(
        type="end",
        message="Workflow completed",
        agentName="coordinator",
        tokens=650,
        cost=0.012,
        duration=2800,
    ).to_sse()
```

## Using with a Real LLM

```python
import asyncio
from typing import AsyncIterator
from openai import AsyncOpenAI
from sse import AgentEvent

client = AsyncOpenAI()


async def run_llm_agent(prompt: str) -> AsyncIterator[str]:
    """Agent using OpenAI API with streaming."""
    yield AgentEvent(
        type="start",
        message="Calling LLM...",
        agentName="assistant",
        agentColor="#3b82f6",
    ).to_sse()

    yield AgentEvent(
        type="thinking",
        message="Generating response...",
        agentName="assistant",
    ).to_sse()

    # Stream from OpenAI
    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ],
        stream=True,
    )

    full_response = []

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            full_response.append(delta)
            yield AgentEvent(
                type="message",
                message=delta,
                agentName="assistant",
            ).to_sse()

    usage = chunk.usage

    yield AgentEvent(
        type="end",
        message="Complete",
        agentName="assistant",
        tokens=usage.total_tokens if usage else None,
        cost=0.01 if usage else None,  # Calculate based on your pricing
    ).to_sse()
```

## StreamingResponse with Cleanup

For long-running agents, handle client disconnects:

```python
import asyncio
from fastapi import Request
from fastapi.responses import StreamingResponse
from sse import AgentEvent


async def agent_stream_with_cleanup(request: Request):
    """SSE endpoint that cleans up on client disconnect."""

    async def generate():
        cancelled = False

        async def check_disconnect():
            nonlocal cancelled
            while not cancelled:
                if await request.is_disconnected():
                    cancelled = True
                    return
                await asyncio.sleep(1)

        # Monitor for disconnect
        disconnect_task = asyncio.create_task(check_disconnect())

        try:
            yield AgentEvent(type="start", message="Starting...").to_sse()

            for i in range(100):
                if cancelled:
                    break
                # Do work...
                yield AgentEvent(
                    type="message",
                    message=f"Step {i + 1}",
                    agentName="assistant",
                ).to_sse()
                await asyncio.sleep(0.5)

            if not cancelled:
                yield AgentEvent(type="end", message="Done").to_sse()
        finally:
            disconnect_task.cancel()
            # Cleanup resources: cancel LLM requests, close connections, etc.

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )
```

## Run

```bash
# Development
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Or directly
python main.py
```

## React Frontend

```tsx
import { AgentFlow } from 'agent-sse-flow';
import 'agent-sse-flow/style.css';

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <AgentFlow
        url="http://localhost:8000/agent/stream?prompt=Explain%20quantum%20computing"
        theme="dark"
        viewMode="timeline"
      />
    </div>
  );
}
```

## Key Points

1. **StreamingResponse**: Use `fastapi.responses.StreamingResponse` with an async generator.
2. **media_type**: Must be `text/event-stream`.
3. **Format**: Each event must be `data: {json}\n\n`.
4. **CORS**: Use `CORSMiddleware` and specify exact origins in production.
5. **Cleanup**: Use `request.is_disconnected()` to detect client disconnect and stop work.
6. **Workers**: For production, use multiple uvicorn workers or run behind a reverse proxy.
7. **Heartbeats**: For long-running agents, yield comment lines (`": heartbeat\n\n"`) to keep the connection alive through proxies.
