#!/usr/bin/env python3
"""
LangChain Quickstart — agent-sse-flow integration.

Demonstrates how to stream LangChain agent events to the AgentFlow
React component for real-time visualization.

Requirements:
    pip install langchain langchain-openai fastapi uvicorn

Usage:
    export OPENAI_API_KEY=sk-...
    python examples/langchain_quickstart.py

Then open the React app pointing to http://localhost:8000/langchain/stream
"""

import json
import os
import time
import asyncio
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# ── LangChain imports (optional — install with: pip install langchain langchain-openai) ──

try:
    from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
    from langchain_core.tools import tool
    from langchain_openai import ChatOpenAI

    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False
    print("⚠️  langchain not installed. Run: pip install langchain langchain-openai")
    print("   Running in demo mode with mock events.\n")


# ── SSE Helpers ──────────────────────────────────────────────────────────────


def format_sse(data: Dict[str, Any]) -> str:
    """Format a dict as an SSE `data:` line."""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def make_event(
    event_type: str,
    *,
    message: str = "",
    tool: str = "",
    args: Dict[str, Any] | None = None,
    result: str = "",
    agent_name: str = "agent",
    agent_color: str = "#3b82f6",
    cost: float = 0.0,
    tokens: int = 0,
    duration: int = 0,
) -> Dict[str, Any]:
    """Build a FlowEvent dict matching the agent-sse-flow schema."""
    ev: Dict[str, Any] = {"type": event_type, "agentName": agent_name}
    if message:
        ev["message"] = message
    if tool:
        ev["tool"] = tool
    if args is not None:
        ev["args"] = args
    if result:
        ev["result"] = result
    if agent_color:
        ev["agentColor"] = agent_color
    if cost:
        ev["cost"] = cost
    if tokens:
        ev["tokens"] = tokens
    if duration:
        ev["duration"] = duration
    return ev


# ── Tools (example) ─────────────────────────────────────────────────────────

if HAS_LANGCHAIN:

    @tool
    def search_web(query: str) -> str:
        """Search the web for information."""
        # Mock result — replace with real API
        return f"Search results for '{query}': Found 5 relevant articles about AI agents and traffic optimization."

    @tool
    def read_file(path: str) -> str:
        """Read the contents of a file."""
        # Mock result — replace with real file reading
        return f"Contents of {path}:\n# Hello World\nThis is a sample file."

    @tool
    def calculate(expression: str) -> str:
        """Evaluate a mathematical expression."""
        try:
            result = eval(expression)  # noqa: S307 — demo only
            return f"Result: {result}"
        except Exception as e:
            return f"Error: {e}"

    TOOLS = [search_web, read_file, calculate]
else:
    TOOLS = []


# ── LangChain Streaming Logic ───────────────────────────────────────────────


async def stream_langchain_events(prompt: str):
    """Stream LangChain agent events as SSE for agent-sse-flow."""
    start = time.time()

    if not HAS_LANGCHAIN:
        # Demo mode — emit mock events
        async for ev in mock_events(prompt):
            yield format_sse(ev)
        return

    # Create LLM with tools
    llm = ChatOpenAI(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.3,
    )
    llm_with_tools = llm.bind_tools(TOOLS)

    messages = [HumanMessage(content=prompt)]

    # Start event
    yield format_sse(make_event(
        "start",
        message="LangChain agent started",
        agent_name="planner",
        agent_color="#6366f1",
    ))

    # Iterative agent loop (ReAct style)
    for loop in range(10):  # max 10 loops
        # LLM call
        yield format_sse(make_event(
            "thinking",
            message=f"Thinking... (loop {loop + 1})",
            agent_name="planner",
        ))

        llm_start = time.time()
        response: AIMessage = await llm_with_tools.ainvoke(messages)
        llm_duration = int((time.time() - llm_start) * 1000)

        messages.append(response)

        # If no tool calls, stream final answer
        if not response.tool_calls:
            yield format_sse(make_event(
                "message",
                message=response.content,
                agent_name="planner",
                duration=llm_duration,
                tokens=response.usage_metadata.get("total_tokens", 0) if response.usage_metadata else 0,
            ))
            break

        # Process tool calls
        for tc in response.tool_calls:
            tool_name = tc["name"]
            tool_args = tc["args"]

            yield format_sse(make_event(
                "tool_call",
                message=f"Calling {tool_name}",
                tool=tool_name,
                args=tool_args,
                agent_name="planner",
            ))

            # Execute tool
            tool_fn = next((t for t in TOOLS if t.name == tool_name), None)
            if tool_fn:
                tool_result = await tool_fn.ainvoke(tool_args)
            else:
                tool_result = f"Unknown tool: {tool_name}"

            yield format_sse(make_event(
                "tool_result",
                message=f"{tool_name} completed",
                result=str(tool_result),
                agent_name="planner",
            ))

            messages.append(ToolMessage(content=str(tool_result), tool_call_id=tc["id"]))

    # End event
    total_duration = int((time.time() - start) * 1000)
    yield format_sse(make_event(
        "end",
        message="Agent completed",
        agent_name="planner",
        duration=total_duration,
    ))


async def mock_events(prompt: str):
    """Generate mock events for demo mode (no LangChain installed)."""
    yield make_event("start", message="Demo agent started", agent_name="demo", agent_color="#8b5cf6")
    await asyncio.sleep(0.3)

    yield make_event("thinking", message=f"Analyzing: {prompt}", agent_name="demo")
    await asyncio.sleep(0.5)

    yield make_event("tool_call", message="Searching...", tool="search_web", args={"query": prompt}, agent_name="demo")
    await asyncio.sleep(0.4)

    yield make_event("tool_result", message="Search complete", result="Found 3 relevant results about " + prompt, agent_name="demo")
    await asyncio.sleep(0.3)

    yield make_event("message", message=f"Based on my research about '{prompt}', here are the key findings...", agent_name="demo")
    await asyncio.sleep(0.2)

    yield make_event("end", message="Demo completed", agent_name="demo", duration=1500, tokens=250, cost=0.003)


# ── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(title="LangChain + agent-sse-flow Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/langchain/stream")
async def langchain_stream(prompt: str = "What are the best practices for traffic signal optimization?"):
    """SSE endpoint — stream LangChain events to AgentFlow."""
    return StreamingResponse(
        stream_langchain_events(prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "langchain_available": HAS_LANGCHAIN,
        "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    print(f"🚀 LangChain + agent-sse-flow server at http://localhost:{port}")
    print(f"   SSE endpoint: http://localhost:{port}/langchain/stream")
    print(f"   LangChain: {'✅ installed' if HAS_LANGCHAIN else '❌ not installed (demo mode)'}")
    print()

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
