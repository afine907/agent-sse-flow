# OpenAI Agents SDK Integration

This example shows how to integrate `agent-sse-flow` with the
[OpenAI Agents SDK](https://github.com/openai/openai-agents-python) (Python)
to visualize agent execution in real time.

## Overview

The OpenAI Agents SDK runs multi-step agent loops in Python. We expose those
steps over an SSE endpoint that streams `FlowEvent`-compatible JSON, which the
`AgentFlow` React component renders.

## 1. Python Backend -- Agent Setup

Install the SDK:

```bash
pip install openai-agents uvicorn sse-starlette
```

Create `agent_server.py`:

```python
import asyncio
import json
import time
from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse
from agents import Agent, Runner

app = FastAPI()

# Define your agents
research_agent = Agent(
    name="Researcher",
    instructions="You are a research assistant. Gather information on the topic.",
)

writer_agent = Agent(
    name="Writer",
    instructions="You are a technical writer. Summarize research into clear prose.",
)

def make_event(event_type: str, **kwargs) -> dict:
    """Build a FlowEvent-compatible dict."""
    return {
        "type": event_type,
        "timestamp": int(time.time() * 1000),
        **kwargs,
    }


async def run_agents_stream(prompt: str):
    """Run the agent loop and yield SSE events."""
    start_time = time.time()

    # Emit start event
    yield make_event("start", message=f"Starting agent pipeline for: {prompt}")

    # --- Research phase ---
    yield make_event(
        "thinking",
        message="Researcher is analyzing the topic...",
        agentName="Researcher",
        agentColor="#10b981",
    )

    research_result = await Runner.run(research_agent, prompt)

    yield make_event(
        "tool_result",
        tool="research_agent",
        result=str(research_result.final_output),
        agentName="Researcher",
        agentColor="#10b981",
        tokens=getattr(research_result, "usage", {}).get("total_tokens"),
        duration=int((time.time() - start_time) * 1000),
    )

    # --- Writing phase ---
    yield make_event(
        "thinking",
        message="Writer is drafting the summary...",
        agentName="Writer",
        agentColor="#6366f1",
    )

    writer_result = await Runner.run(
        writer_agent,
        f"Summarize this research:\n{research_result.final_output}",
    )

    yield make_event(
        "message",
        message=str(writer_result.final_output),
        agentName="Writer",
        agentColor="#6366f1",
        tokens=getattr(writer_result, "usage", {}).get("total_tokens"),
        duration=int((time.time() - start_time) * 1000),
    )

    # Emit end event
    yield make_event("end", message="Pipeline complete")


@app.get("/stream")
async def stream(prompt: str = "Explain quantum computing"):
    async def event_generator():
        async for event in run_agents_stream(prompt):
            yield {"event": "message", "data": json.dumps(event)}

    return EventSourceResponse(event_generator())
```

Run the server:

```bash
uvicorn agent_server:app --reload --port 8000
```

## 2. React Frontend

```tsx
import { AgentFlow } from 'agent-sse-flow';
import 'agent-sse-flow/dist/style.css';

function App() {
  return (
    <AgentFlow
      url="http://localhost:8000/stream?prompt=Explain+quantum+computing"
      theme="dark"
      autoConnect
    />
  );
}

export default App;
```

## 3. Event Mapping Reference

The table below shows how each SDK concept maps to a `FlowEvent`:

| OpenAI Agents SDK          | FlowEvent `type`   | Notes                                      |
| -------------------------- | ------------------ | ------------------------------------------ |
| `Runner.run()` start       | `start`            | Emitted before the agent loop begins       |
| Agent "thinking" / LLM call| `thinking`         | Optional; shows the agent is reasoning     |
| Function tool invocation   | `tool_call`        | Include `tool` and `args` fields           |
| Tool output returned       | `tool_result`      | Include `result` as a string               |
| Agent final output         | `message`          | The agent's response to the user           |
| Handoff between agents     | `thinking` or `message` | Use `agentName` to distinguish agents |
| Pipeline complete          | `end`              | Signals the full run is done               |
| Error / exception          | `error`            | Include error details in `message`         |

## 4. Multi-Agent Color Convention

Use distinct `agentColor` values so the timeline view is easy to read:

```python
AGENT_COLORS = {
    "Researcher": "#10b981",  # green
    "Writer":     "#6366f1",  # indigo
    "Critic":     "#f59e0b",  # amber
    "Coder":      "#3b82f6",  # blue
}
```

## 5. Streaming with Handoffs

When one agent hands off to another, emit a `thinking` event from the new agent
so the UI shows the transition:

```python
yield make_event(
    "thinking",
    message="Handing off to Writer...",
    agentName="Writer",
    agentColor="#6366f1",
)
```

This produces a clear visual handoff in the timeline view.
