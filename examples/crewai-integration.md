# CrewAI Integration

This example shows how to integrate `agent-sse-flow` with
[CrewAI](https://github.com/crewAIInc/crewAI) to visualize multi-agent task
execution in real time.

## Overview

CrewAI orchestrates a "crew" of agents that collaborate on tasks. By tapping
into CrewAI's step callbacks we emit SSE events that match the `FlowEvent`
schema, giving you a live view of every step in the pipeline.

## 1. Python Backend -- Crew Setup

Install dependencies:

```bash
pip install crewai crewai-tools uvicorn sse-starlette
```

Create `crew_server.py`:

```python
import asyncio
import json
import time
from typing import Any
from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse
from crewai import Agent, Task, Crew, Process

app = FastAPI()

# Shared queue between the crew run and the SSE generator
event_queue: asyncio.Queue[dict | None] = asyncio.Queue()


def make_event(event_type: str, **kwargs) -> dict:
    """Build a FlowEvent-compatible dict."""
    return {
        "type": event_type,
        "timestamp": int(time.time() * 1000),
        **kwargs,
    }


# --- Step callbacks ---

def step_callback(step_output: Any) -> None:
    """Called after every agent step inside a task."""
    event = make_event(
        "thinking",
        message=str(step_output)[:500],
        agentName=getattr(step_output, "agent", {}).get("role", "Agent"),
        agentColor="#8b5cf6",
    )
    event_queue.put_nowait(event)


def task_callback(output: Any) -> None:
    """Called when a task completes."""
    event = make_event(
        "tool_result",
        tool=output.description if hasattr(output, "description") else "task",
        result=str(output.raw)[:1000],
        agentName=getattr(output, "agent", {}).get("role", "Agent"),
        agentColor="#8b5cf6",
    )
    event_queue.put_nowait(event)


# --- Define crew ---

researcher = Agent(
    role="Researcher",
    goal="Find accurate information on the given topic",
    backstory="You are an expert researcher with deep analytical skills.",
    verbose=True,
)

writer = Agent(
    role="Writer",
    goal="Write clear, engaging content based on research",
    backstory="You are a skilled technical writer.",
    verbose=True,
)


def build_crew(topic: str) -> Crew:
    research_task = Task(
        description=f"Research the topic: {topic}",
        expected_output="A detailed research summary",
        agent=researcher,
        callback=task_callback,
    )

    writing_task = Task(
        description="Write a clear article based on the research",
        expected_output="A well-structured article",
        agent=writer,
        callback=task_callback,
    )

    return Crew(
        agents=[researcher, writer],
        tasks=[research_task, writing_task],
        process=Process.sequential,
        step_callback=step_callback,
        verbose=True,
    )


async def run_crew(topic: str):
    """Run the crew in a background thread and yield SSE events."""
    start_time = time.time()

    yield make_event("start", message=f"Starting crew for: {topic}")

    # Start crew in a thread so we can stream events concurrently
    loop = asyncio.get_event_loop()
    crew = build_crew(topic)
    crew_task = loop.run_in_executor(None, crew.kickoff)

    # Stream events from the queue until the crew finishes
    while True:
        try:
            event = await asyncio.wait_for(event_queue.get(), timeout=0.5)
            if event is None:
                break
            # Enrich with timing
            event["duration"] = int((time.time() - start_time) * 1000)
            yield event
        except asyncio.TimeoutError:
            if crew_task.done():
                break

    result = crew_task.result()
    yield make_event(
        "message",
        message=str(result),
        agentName="Writer",
        agentColor="#10b981",
        duration=int((time.time() - start_time) * 1000),
    )
    yield make_event("end", message="Crew run complete")


@app.get("/stream")
async def stream(topic: str = "The future of AI agents"):
    async def event_generator():
        async for event in run_crew(topic):
            yield {"event": "message", "data": json.dumps(event)}
        # Signal end to SSE clients
        yield {"event": "end", "data": ""}

    return EventSourceResponse(event_generator())
```

Run:

```bash
uvicorn crew_server:app --reload --port 8000
```

## 2. React Frontend

```tsx
import { AgentFlow } from 'agent-sse-flow';
import 'agent-sse-flow/dist/style.css';

function App() {
  return (
    <AgentFlow
      url="http://localhost:8000/stream?topic=The+future+of+AI+agents"
      theme="dark"
      autoConnect
    />
  );
}

export default App;
```

## 3. Event Mapping Reference

| CrewAI Concept          | FlowEvent `type`  | Notes                                  |
| ----------------------- | ----------------- | -------------------------------------- |
| Crew start              | `start`           | Emitted before `crew.kickoff()`        |
| Agent step callback     | `thinking`        | Shows each reasoning step              |
| Task callback           | `tool_result`     | Task output with agent attribution     |
| Final crew output       | `message`         | The crew's final result                |
| Crew complete           | `end`             | Signals the run is finished            |
| Agent error / exception | `error`           | Include error details in `message`     |

## 4. Agent Color Mapping

Assign distinct colors per agent role for clear timeline visualization:

```python
AGENT_COLORS = {
    "Researcher": "#8b5cf6",  # violet
    "Writer":     "#10b981",  # emerald
    "Analyst":    "#f59e0b",  # amber
    "Reviewer":   "#ef4444",  # red
}
```

Pass the color in each event:

```python
make_event(
    "thinking",
    message=step_output,
    agentName="Researcher",
    agentColor=AGENT_COLORS["Researcher"],
)
```

## 5. Hierarchical Process

For `Process.hierarchical` crews, the manager agent emits `thinking` events and
delegates to worker agents via `tool_call` / `tool_result` pairs:

```python
yield make_event(
    "tool_call",
    tool="delegate",
    args={"assignee": "Researcher", "task": "Research quantum computing"},
    agentName="Manager",
    agentColor="#3b82f6",
)

yield make_event(
    "tool_result",
    tool="delegate",
    result="Research complete",
    agentName="Researcher",
    agentColor="#8b5cf6",
)
```

This gives you a clear parent-child relationship in the timeline view.
