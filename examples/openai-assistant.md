# OpenAI Assistant API Example

How to integrate agent-sse-flow with OpenAI Assistants API.

## Setup

```bash
pip install openai fastapi uvicorn
```

## Server Code

```python
import os
import json
import asyncio
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from openai import OpenAI
from typing_extensions import override
from openai import AssistantEventHandler

app = FastAPI()
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Create assistant once
assistant = client.beta.assistants.create(
    name="Code Helper",
    instructions="You are a helpful coding assistant.",
    model="gpt-4-turbo-preview",
    tools=[{"type": "code_interpreter"}]
)

class EventHandler(AssistantEventHandler):
    def __init__(self):
        super().__init__()
        self.events = []
    
    @override
    def on_text_created(self, text) -> None:
        self.events.append({
            "type": "thinking",
            "message": text.value,
            "agentName": "assistant"
        })
    
    @override
    def on_tool_call_created(self, tool_call):
        if tool_call.type == "code_interpreter":
            self.events.append({
                "type": "tool_call",
                "tool": "code_interpreter",
                "agentName": "assistant",
                "args": {"code": tool_call.code_interpreter.input}
            })
    
    @override
    def on_tool_call_delta(self, delta, snapshot):
        if delta.type == "code_interpreter":
            if delta.code_interpreter.outputs:
                for output in delta.code_interpreter.outputs:
                    if output.type == "logs":
                        self.events.append({
                            "type": "tool_result",
                            "result": output.logs,
                            "agentName": "assistant"
                        })

@app.get("/assistant/stream")
async def assistant_stream(prompt: str = "Hello"):
    """Stream OpenAI Assistant events to agent-sse-flow."""
    
    async def generate():
        # Create thread
        thread = client.beta.threads.create()
        
        # Add message
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=prompt
        )
        
        # Yield start event
        yield f'data: {json.dumps({"type": "start", "message": "Assistant started", "agentName": "assistant"})}\n\n'
        
        # Stream run
        handler = EventHandler()
        
        with client.beta.threads.runs.stream(
            thread_id=thread.id,
            assistant_id=assistant.id,
            event_handler=handler
        ) as stream:
            # Yield events as they come
            for event in handler.events:
                yield f'data: {json.dumps(event)}\n\n'
                await asyncio.sleep(0.05)  # Small delay for UI
        
        # Yield end event
        yield f'data: {json.dumps({"type": "end", "message": "Done", "agentName": "assistant"})}\n\n'
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## React Code

```tsx
import { useState } from 'react';
import { AgentFlow } from 'agent-sse-flow';
import 'agent-sse-flow/style.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [url, setUrl] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setUrl(`http://localhost:8000/assistant/stream?prompt=${encodeURIComponent(prompt)}`);
  };
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask the assistant..."
          style={{ width: '70%', padding: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 16px', marginLeft: '8px' }}>
          Send
        </button>
      </form>
      
      <div style={{ flex: 1 }}>
        {url && (
          <AgentFlow 
            url={url}
            theme="dark"
            key={url} // Re-mount on new prompt
          />
        )}
      </div>
    </div>
  );
}
```

## Custom Functions Example

```python
# Define custom tools
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name"
                    }
                },
                "required": ["location"]
            }
        }
    }
]

assistant = client.beta.assistants.create(
    name="Weather Bot",
    instructions="You are a weather assistant.",
    model="gpt-4-turbo-preview",
    tools=tools
)

# Handle tool calls
@override
def on_tool_call_created(self, tool_call):
    if tool_call.type == "function":
        self.events.append({
            "type": "tool_call",
            "tool": tool_call.function.name,
            "args": json.loads(tool_call.function.arguments),
            "agentName": "weather_bot"
        })
        
        # Execute function and add result
        result = execute_tool(tool_call.function.name, 
                             json.loads(tool_call.function.arguments))
        
        self.events.append({
            "type": "tool_result",
            "result": result,
            "agentName": "weather_bot"
        })
```

## Cost Tracking

```python
# Track tokens and cost
GPT4_TURBO_COST = {
    "input": 0.01 / 1000,  # $0.01 per 1K tokens
    "output": 0.03 / 1000  # $0.03 per 1K tokens
}

@override
def on_message_created(self, message):
    if message.content:
        usage = message.usage
        if usage:
            cost = (
                usage.prompt_tokens * GPT4_TURBO_COST["input"] +
                usage.completion_tokens * GPT4_TURBO_COST["output"]
            )
            self.events.append({
                "type": "message",
                "message": message.content[0].text.value,
                "tokens": usage.total_tokens,
                "cost": round(cost, 4)
            })
```

## Run

```bash
export OPENAI_API_KEY=sk-...
python server.py
```
