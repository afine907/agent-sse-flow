# LangGraph + agent-sse-flow Integration

Complete guide for streaming LangGraph agent execution to agent-sse-flow.

## Overview

This guide shows how to:

1. Build a LangGraph agent with tools and multiple nodes
2. Stream execution events via SSE
3. Display the trace in a React frontend using agent-sse-flow

## Python Backend

### Installation

```bash
pip install langgraph langchain-openai langchain-core fastapi uvicorn
```

### Project Structure

```
langgraph-agent/
├── main.py              # FastAPI server with SSE endpoint
├── graph.py             # LangGraph agent definition
├── sse_helpers.py       # SSE formatting
├── requirements.txt
└── .env                 # OPENAI_API_KEY=sk-...
```

### SSE Helpers

`sse_helpers.py`:

```python
import json
from typing import Optional


def format_sse(
    event_type: str,
    message: Optional[str] = None,
    tool: Optional[str] = None,
    args: Optional[dict] = None,
    result: Optional[str] = None,
    agent_name: Optional[str] = None,
    agent_color: Optional[str] = None,
    cost: Optional[float] = None,
    tokens: Optional[int] = None,
    duration: Optional[int] = None,
) -> str:
    """Format a single SSE event."""
    data = {"type": event_type}
    if message is not None:
        data["message"] = message
    if tool is not None:
        data["tool"] = tool
    if args is not None:
        data["args"] = args
    if result is not None:
        data["result"] = result
    if agent_name is not None:
        data["agentName"] = agent_name
    if agent_color is not None:
        data["agentColor"] = agent_color
    if cost is not None:
        data["cost"] = cost
    if tokens is not None:
        data["tokens"] = tokens
    if duration is not None:
        data["duration"] = duration

    return f"data: {json.dumps(data)}\n\n"
```

### LangGraph Agent Definition

`graph.py`:

```python
import os
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage


# Define tools
@tool
def search_web(query: str) -> str:
    """Search the web for information."""
    # Replace with actual search implementation
    return f"Search results for '{query}': Found 5 relevant articles about the topic."


@tool
def read_document(path: str) -> str:
    """Read a document from the filesystem."""
    # Replace with actual file reading
    return f"Contents of {path}: This is a sample document about the requested topic."


@tool
def write_summary(content: str) -> str:
    """Write a summary document."""
    # Replace with actual file writing
    return f"Summary written successfully ({len(content)} characters)."


# Define state
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    current_agent: str
    cost: float
    tokens: int


# Create LLM
llm = ChatOpenAI(
    model="gpt-4o",
    api_key=os.environ.get("OPENAI_API_KEY"),
    temperature=0,
)

# Bind tools to LLM
tools = [search_web, read_document, write_summary]
llm_with_tools = llm.bind_tools(tools)


# Define agent nodes
async def researcher_node(state: AgentState) -> dict:
    """Research agent that searches for information."""
    response = await llm_with_tools.ainvoke(
        [
            {
                "role": "system",
                "content": "You are a research assistant. Use the search_web tool to find information.",
            },
        ]
        + state["messages"]
    )
    return {
        "messages": [response],
        "current_agent": "researcher",
    }


async def analyst_node(state: AgentState) -> dict:
    """Analysis agent that reads and analyzes documents."""
    response = await llm_with_tools.ainvoke(
        [
            {
                "role": "system",
                "content": "You are an analyst. Use read_document to examine files and provide insights.",
            },
        ]
        + state["messages"]
    )
    return {
        "messages": [response],
        "current_agent": "analyst",
    }


async def writer_node(state: AgentState) -> dict:
    """Writer agent that creates summaries."""
    response = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": "You are a technical writer. Synthesize the research and analysis into a clear summary.",
            },
        ]
        + state["messages"]
    )
    return {
        "messages": [response],
        "current_agent": "writer",
    }


# Tool execution node
async def tool_node(state: AgentState) -> dict:
    """Execute tool calls from the last message."""
    last_message = state["messages"][-1]
    results = []

    for tool_call in last_message.tool_calls:
        # Find and invoke the tool
        tool_map = {t.name: t for t in tools}
        tool_fn = tool_map[tool_call["name"]]
        result = tool_fn.invoke(tool_call["args"])
        results.append(
            {
                "role": "tool",
                "content": result,
                "tool_call_id": tool_call["id"],
            }
        )

    return {"messages": results}


# Routing logic
def should_use_tools(state: AgentState) -> str:
    """Decide whether to execute tools or move to next agent."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "next_agent"


def route_after_tools(state: AgentState) -> str:
    """Route back to the agent that made the tool call."""
    current = state.get("current_agent", "researcher")
    if current == "researcher":
        return "analyst"
    elif current == "analyst":
        return "writer"
    return END


# Build the graph
graph = StateGraph(AgentState)

# Add nodes
graph.add_node("researcher", researcher_node)
graph.add_node("analyst", analyst_node)
graph.add_node("writer", writer_node)
graph.add_node("tools", tool_node)

# Set entry point
graph.set_entry_point("researcher")

# Add conditional edges
graph.add_conditional_edges(
    "researcher",
    should_use_tools,
    {"tools": "tools", "next_agent": "analyst"},
)
graph.add_conditional_edges(
    "analyst",
    should_use_tools,
    {"tools": "tools", "next_agent": "writer"},
)

# Regular edges
graph.add_conditional_edges(
    "tools",
    route_after_tools,
    {"researcher": "researcher", "analyst": "analyst", "writer": "writer", END: END},
)
graph.add_edge("writer", END)

# Compile
app_graph = graph.compile()
```

### FastAPI Server with SSE Streaming

`main.py`:

```python
import json
import time
import asyncio
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from graph import app_graph
from sse_helpers import format_sse

app = FastAPI(title="LangGraph SSE Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# Agent color mapping
AGENT_COLORS = {
    "researcher": "#10b981",
    "analyst": "#8b5cf6",
    "writer": "#f59e0b",
    "system": "#6b7280",
}


async def stream_langgraph_execution(prompt: str):
    """Convert LangGraph execution events to agent-sse-flow SSE format."""
    start_time = time.time()
    total_tokens = 0
    total_cost = 0.0

    # Start event
    yield format_sse(
        "start",
        message="LangGraph multi-agent workflow started",
        agent_name="system",
        agent_color=AGENT_COLORS["system"],
    )

    # Stream events from LangGraph
    async for event in app_graph.astream_events(
        {"messages": [{"role": "user", "content": prompt}]},
        version="v2",
    ):
        kind = event.get("event")
        name = event.get("name", "")
        metadata = event.get("metadata", {})
        agent = metadata.get("langgraph_node", "system")
        agent_color = AGENT_COLORS.get(agent, "#6b7280")

        # Chain start
        if kind == "on_chain_start":
            if agent in ("researcher", "analyst", "writer"):
                yield format_sse(
                    "thinking",
                    message=f"Agent [{agent}] starting: {name}",
                    agent_name=agent,
                    agent_color=agent_color,
                )

        # LLM start
        elif kind == "on_chat_model_start":
            yield format_sse(
                "thinking",
                message=f"LLM generating for [{agent}]...",
                agent_name=agent,
                agent_color=agent_color,
            )

        # LLM streaming tokens
        elif kind == "on_chat_model_stream":
            chunk = event.get("data", {}).get("chunk")
            if chunk and hasattr(chunk, "content") and chunk.content:
                yield format_sse(
                    "message",
                    message=chunk.content,
                    agent_name=agent,
                    agent_color=agent_color,
                )

        # Tool start
        elif kind == "on_tool_start":
            tool_name = event.get("name", "unknown")
            tool_input = event.get("data", {}).get("input", {})
            yield format_sse(
                "tool_call",
                tool=tool_name,
                args=tool_input,
                agent_name=agent,
                agent_color=agent_color,
            )

        # Tool end
        elif kind == "on_tool_end":
            output = event.get("data", {}).get("output", "")
            if isinstance(output, str):
                result_text = output
            else:
                result_text = str(output)

            yield format_sse(
                "tool_result",
                result=result_text,
                agent_name=agent,
                agent_color=agent_color,
            )

        # Chain end (agent completed)
        elif kind == "on_chain_end":
            if agent in ("researcher", "analyst", "writer"):
                output = event.get("data", {}).get("output", {})
                # Extract token usage if available
                if hasattr(output, "usage_metadata") and output.usage_metadata:
                    usage = output.usage_metadata
                    total_tokens += usage.get("total_tokens", 0)
                    total_cost += usage.get("total_cost", 0)

    # Calculate duration
    duration = int((time.time() - start_time) * 1000)

    # End event
    yield format_sse(
        "end",
        message="Multi-agent workflow completed",
        agent_name="system",
        agent_color=AGENT_COLORS["system"],
        tokens=total_tokens if total_tokens > 0 else None,
        cost=total_cost if total_cost > 0 else None,
        duration=duration,
    )


@app.get("/langgraph/stream")
async def langgraph_stream(prompt: str = Query(default="Explain quantum computing")):
    """SSE endpoint for LangGraph agent execution."""
    return StreamingResponse(
        stream_langgraph_execution(prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/langgraph/stream")
async def langgraph_stream_post(body: dict):
    """POST variant accepting JSON body."""
    prompt = body.get("prompt", "Hello")
    return StreamingResponse(
        stream_langgraph_execution(prompt),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## React Frontend

### Installation

```bash
pnpm create vite frontend --template react-ts
cd frontend
pnpm install agent-sse-flow
```

### Vite Proxy Config

`vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/langgraph': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### App Component

`src/App.tsx`:

```tsx
import { useState } from 'react';
import { AgentFlow } from 'agent-sse-flow';
import 'agent-sse-flow/style.css';

function App() {
  const [prompt, setPrompt] = useState('Explain quantum computing in simple terms');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#111827' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #374151' }}>
        <h1 style={{ color: '#f9fafb', fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
          LangGraph Agent Trace
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #4b5563',
              background: '#1f2937',
              color: '#f9fafb',
              fontSize: '14px',
            }}
          />
        </div>
      </div>

      {/* AgentFlow */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <AgentFlow
          url={`/langgraph/stream?prompt=${encodeURIComponent(prompt)}`}
          theme="dark"
          viewMode="timeline"
          autoReconnect={false}
          onStatusChange={(status) => console.log('Status:', status)}
          onError={(error) => console.error('Error:', error)}
        />
      </div>
    </div>
  );
}

export default App;
```

## Environment Setup

```bash
# .env
OPENAI_API_KEY=sk-your-api-key-here
```

## Run the Full Stack

Terminal 1 - Python backend:

```bash
cd langgraph-agent
export OPENAI_API_KEY=sk-...
uvicorn main:app --reload --port 8000
```

Terminal 2 - React frontend:

```bash
cd frontend
pnpm dev  # http://localhost:5173
```

Open `http://localhost:5173` and enter a prompt. The LangGraph execution will stream in real-time.

## Event Mapping Reference

| LangGraph Event | agent-sse-flow Event | Description |
|---|---|---|
| `on_chain_start` | `thinking` | Agent node starting |
| `on_chat_model_start` | `thinking` | LLM generating |
| `on_chat_model_stream` | `message` | Streaming LLM tokens |
| `on_tool_start` | `tool_call` | Tool invoked |
| `on_tool_end` | `tool_result` | Tool returned |
| `on_chain_end` | (implicit) | Agent node completed |
| Error | `error` | Something failed |
| (custom) | `start` / `end` | Workflow boundaries |

## Tips

1. **Agent Colors**: Map each LangGraph node to a color for visual distinction.
2. **Token Tracking**: Extract `usage_metadata` from LLM responses for cost/tokens.
3. **Tool Arguments**: Pass tool inputs as `args` to show what each tool received.
4. **Streaming Tokens**: Use `on_chat_model_stream` for real-time token display.
5. **Error Handling**: Wrap the event loop in try/except and emit `error` events on failure.
6. **Cleanup**: Use `request.is_disconnected()` (FastAPI) to abort long-running graphs.
