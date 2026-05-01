# LangGraph Integration Example

How to integrate agent-sse-flow with LangGraph agents.

## Setup

```bash
pip install langgraph langchain-openai fastapi uvicorn
```

## Server Code

```python
import os
import json
import asyncio
from typing import Annotated, TypedDict
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

app = FastAPI()

# Define tools
@tool
def search(query: str) -> str:
    """Search for information."""
    return f"Results for: {query}"

@tool
def read_file(path: str) -> str:
    """Read a file."""
    return f"Content of {path}"

# Define state
class State(TypedDict):
    messages: Annotated[list, add_messages]
    current_agent: str

# Create LLM with tools
llm = ChatOpenAI(
    model="gpt-4-turbo-preview",
    api_key=os.environ.get("OPENAI_API_KEY")
)
llm_with_tools = llm.bind_tools([search, read_file])

# Define nodes
async def researcher_node(state: State):
    response = await llm_with_tools.ainvoke(state["messages"])
    return {
        "messages": [response],
        "current_agent": "researcher"
    }

async def writer_node(state: State):
    response = await llm.ainvoke(state["messages"])
    return {
        "messages": [response],
        "current_agent": "writer"
    }

# Build graph
graph = StateGraph(State)
graph.add_node("researcher", researcher_node)
graph.add_node("writer", writer_node)
graph.set_entry_point("researcher")
graph.add_edge("researcher", "writer")
graph.add_edge("writer", END)

runnable = graph.compile()

@app.get("/langgraph/stream")
async def langgraph_stream(prompt: str = "Hello"):
    """Stream LangGraph execution to agent-sse-flow."""
    
    async def generate():
        yield format_sse({
            "type": "start",
            "message": "LangGraph agent started",
            "agentName": "system"
        })
        
        # Stream events
        async for event in runnable.astream_events(
            {"messages": [{"role": "user", "content": prompt}]},
            version="v1"
        ):
            kind = event["event"]
            
            if kind == "on_chain_start":
                yield format_sse({
                    "type": "thinking",
                    "message": f"Starting {event['name']}...",
                    "agentName": event.get("tags", {}).get("agent", "unknown")
                })
            
            elif kind == "on_tool_start":
                yield format_sse({
                    "type": "tool_call",
                    "tool": event["name"],
                    "args": event["data"].get("input", {}),
                    "agentName": event.get("tags", {}).get("agent", "unknown")
                })
            
            elif kind == "on_tool_end":
                yield format_sse({
                    "type": "tool_result",
                    "result": str(event["data"].get("output", "")),
                    "agentName": event.get("tags", {}).get("agent", "unknown")
                })
            
            elif kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if chunk.content:
                    yield format_sse({
                        "type": "message",
                        "message": chunk.content,
                        "agentName": event.get("tags", {}).get("agent", "assistant")
                    })
        
        yield format_sse({
            "type": "end",
            "message": "Execution completed",
            "agentName": "system"
        })
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

def format_sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## React Code

```tsx
import { AgentFlow } from 'agent-sse-flow';
import 'agent-sse-flow/style.css';

function LangGraphDemo() {
  return (
    <div style={{ height: '100vh' }}>
      <AgentFlow 
        url="http://localhost:8000/langgraph/stream?prompt=Write%20a%20blog%20post"
        theme="dark"
        viewMode="timeline"
      />
    </div>
  );
}
```

## Multi-Agent Graph Example

```python
from langgraph.graph import StateGraph

# Define specialized agents
async def research_agent(state):
    # Research logic
    return {"current_agent": "researcher"}

async def analysis_agent(state):
    # Analysis logic
    return {"current_agent": "analyst"}

async def writing_agent(state):
    # Writing logic
    return {"current_agent": "writer"}

# Build multi-agent graph
graph = StateGraph(State)
graph.add_node("researcher", research_agent)
graph.add_node("analyst", analysis_agent)
graph.add_node("writer", writing_agent)

# Conditional routing
def should_analyze(state):
    return "analyst" if state.get("needs_analysis") else "writer"

graph.add_conditional_edges("researcher", should_analyze)
graph.add_edge("analyst", "writer")
graph.add_edge("writer", END)
```

## Custom Event Formatting

```python
def format_langgraph_event(event, node_name):
    """Convert LangGraph event to agent-sse-flow format."""
    
    event_type_map = {
        "on_chain_start": "thinking",
        "on_chain_end": "message",
        "on_tool_start": "tool_call",
        "on_tool_end": "tool_result",
        "on_llm_start": "thinking",
        "on_llm_end": "message",
    }
    
    return {
        "type": event_type_map.get(event["event"], "message"),
        "message": event.get("data", {}).get("output", ""),
        "agentName": node_name,
        "timestamp": int(event.get("timestamp", 0) * 1000),
    }
```

## Run

```bash
export OPENAI_API_KEY=sk-...
python langgraph_server.py
```

## Tips

1. Use `astream_events` for detailed event streaming
2. Tag nodes with agent names using `.with_config(tags={"agent": "name"})`
3. Track tokens and costs in state
4. Use conditional edges for dynamic routing
