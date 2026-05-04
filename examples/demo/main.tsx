import React, { useState, useRef, useCallback, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { AgentFlow } from '../../src/AgentFlow'
import '../../src/AgentFlow.css'

const MOCK_EVENTS = [
  { type: 'start', message: 'Agent initialized' },
  { type: 'thinking', message: 'Analyzing user request...' },
  { type: 'tool_call', tool: 'search_files', args: { pattern: '*.ts', directory: 'src/' } },
  { type: 'tool_result', result: 'Found 12 TypeScript files matching pattern' },
  { type: 'thinking', message: 'Reading relevant source files...' },
  { type: 'tool_call', tool: 'read_file', args: { path: 'src/index.ts' } },
  { type: 'tool_result', result: 'export { AgentFlow } from "./AgentFlow"\nexport type { FlowEvent, AgentFlowProps } from "./AgentFlow"' },
  { type: 'tool_call', tool: 'read_file', args: { path: 'src/AgentFlow.tsx' } },
  { type: 'tool_result', result: 'import { useVirtualizer } from "@tanstack/react-virtual"...' },
  { type: 'thinking', message: 'Identifying performance bottleneck in event rendering...' },
  { type: 'tool_call', tool: 'run_tests', args: { suite: 'unit', coverage: true } },
  { type: 'tool_result', result: 'Tests: 19 passed, 0 failed\nCoverage: 87% statements' },
  { type: 'message', message: '## Analysis Complete\n\nThe component uses **virtual scrolling** via `@tanstack/react-virtual` to handle 10K+ events efficiently.\n\nKey findings:\n- DOM nodes stay bounded at ~20 rows\n- rAF batching prevents excessive re-renders\n- Memory usage < 100MB at 10K events' },
  { type: 'end', message: 'Task completed successfully' },
]

function generateEvents(count: number) {
  const events: typeof MOCK_EVENTS = []
  for (let i = 0; i < count; i++) {
    events.push(MOCK_EVENTS[i % MOCK_EVENTS.length])
  }
  return events
}

/** Mock EventSource that emits events from an array on a schedule */
class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  readyState = 0
  private timer: ReturnType<typeof setInterval> | null = null
  private index = 0
  private events: typeof MOCK_EVENTS

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
    const params = new URL(url, window.location.href).searchParams
    const count = parseInt(params.get('count') || '500', 10)
    this.events = generateEvents(count)

    setTimeout(() => {
      this.readyState = 1
      this.onopen?.(new Event('open'))
      this.startStreaming()
    }, 100)
  }

  private startStreaming() {
    this.timer = setInterval(() => {
      if (this.index >= this.events.length) {
        this.close()
        return
      }
      const batch = this.events.slice(this.index, this.index + 5)
      this.index += 5
      for (const ev of batch) {
        const data = { ...ev, timestamp: Date.now() }
        this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
      }
    }, 80)
  }

  close() {
    this.readyState = 2
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    const idx = MockEventSource.instances.indexOf(this)
    if (idx >= 0) MockEventSource.instances.splice(idx, 1)
  }
}

// Install mock globally so AgentFlow picks it up
;(window as any).EventSource = MockEventSource

const MOCK_BASE = 'http://mock-sse/demo'

function Demo() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [eventCount, setEventCount] = useState(500)
  const [sseUrl, setSseUrl] = useState('')
  const [running, setRunning] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline')

  const startStream = () => {
    // Close any existing mock instances
    MockEventSource.instances.forEach(i => i.close())
    setSseUrl(`${MOCK_BASE}/stream?count=${eventCount}`)
    setRunning(true)
  }

  const stopStream = () => {
    MockEventSource.instances.forEach(i => i.close())
    setSseUrl('')
    setRunning(false)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: theme === 'dark' ? '#0a0a0f' : '#f8f9fa', borderBottom: `1px solid ${theme === 'dark' ? '#1a1a2e' : '#e5e7eb'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1400, margin: '0 auto' }}>
          <div>
            <h1 style={{ color: theme === 'dark' ? '#eaeaea' : '#111', fontSize: 20, margin: 0 }}>
              agent-sse-flow <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>Live Demo</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="https://github.com/afine907/agent-sse-flow" target="_blank" rel="noopener" style={{ color: theme === 'dark' ? '#888' : '#666', fontSize: 13, textDecoration: 'none' }}>GitHub</a>
            <a href="https://www.npmjs.com/package/agent-sse-flow" target="_blank" rel="noopener" style={{ color: theme === 'dark' ? '#888' : '#666', fontSize: 13, textDecoration: 'none' }}>NPM</a>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', gap: 16, padding: 16, minHeight: 0, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {/* Controls */}
        <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
          <div style={{ padding: 12, background: theme === 'dark' ? '#12121f' : '#fff', borderRadius: 8, border: `1px solid ${theme === 'dark' ? '#1a1a2e' : '#e5e7eb'}` }}>
            <label style={{ fontSize: 12, opacity: 0.6, display: 'block', marginBottom: 4, color: theme === 'dark' ? '#ccc' : '#333' }}>Event Count</label>
            <input type="range" min={50} max={5000} step={50} value={eventCount} onChange={e => setEventCount(Number(e.target.value))} disabled={running} style={{ width: '100%' }} />
            <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, marginTop: 4, color: theme === 'dark' ? '#eaeaea' : '#111' }}>{eventCount.toLocaleString()}</div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={running ? stopStream : startStream} style={{ flex: 1, padding: '8px 12px', background: running ? '#ef4444' : '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              {running ? 'Stop' : 'Start'}
            </button>
            <button onClick={() => setViewMode(m => m === 'timeline' ? 'list' : 'timeline')} style={{ padding: '8px 10px', background: theme === 'dark' ? '#12121f' : '#fff', color: theme === 'dark' ? '#eaeaea' : '#111', border: `1px solid ${theme === 'dark' ? '#2d2d44' : '#d1d5db'}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              {viewMode === 'timeline' ? '☰' : '⏱'}
            </button>
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ padding: '8px 10px', background: theme === 'dark' ? '#12121f' : '#fff', color: theme === 'dark' ? '#eaeaea' : '#111', border: `1px solid ${theme === 'dark' ? '#2d2d44' : '#d1d5db'}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              {theme === 'dark' ? '☀' : '🌙'}
            </button>
          </div>

          <div style={{ padding: 12, background: theme === 'dark' ? '#12121f' : '#fff', borderRadius: 8, border: `1px solid ${theme === 'dark' ? '#1a1a2e' : '#e5e7eb'}`, fontSize: 12, lineHeight: 1.6, color: theme === 'dark' ? '#aaa' : '#555' }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: theme === 'dark' ? '#eaeaea' : '#111' }}>Features</div>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              <li>Virtual scrolling (10K+ nodes)</li>
              <li>rAF message batching</li>
              <li>Dark / Light themes</li>
              <li>Markdown rendering</li>
              <li>Timeline & list views</li>
            </ul>
          </div>

          <div style={{ padding: 12, background: theme === 'dark' ? '#12121f' : '#fff', borderRadius: 8, border: `1px solid ${theme === 'dark' ? '#1a1a2e' : '#e5e7eb'}` }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: theme === 'dark' ? '#eaeaea' : '#111' }}>Quick Start</div>
            <pre style={{ fontSize: 11, overflow: 'auto', background: theme === 'dark' ? '#0a0a0f' : '#f3f4f6', padding: 8, borderRadius: 4, margin: 0, color: theme === 'dark' ? '#ccc' : '#333' }}>{`<AgentFlow
  url="/api/sse"
  theme="dark"
  maxEvents={10000}
/>`}</pre>
          </div>
        </div>

        {/* Component */}
        <div style={{ flex: 1, border: `1px solid ${theme === 'dark' ? '#1a1a2e' : '#e5e7eb'}`, borderRadius: 8, overflow: 'hidden', minHeight: 0 }}>
          {sseUrl ? (
            <AgentFlow key={sseUrl} url={sseUrl} theme={theme} viewMode={viewMode} maxEvents={10_000} />
          ) : (
            <div className={`agent-flow agent-flow--${theme}`} style={{ height: '100%' }}>
              <div className="agent-flow__header">
                <span className="agent-flow__status">
                  <span className="agent-flow__status-dot agent-flow__status-dot--disconnected" />
                  disconnected
                </span>
              </div>
              <div className="agent-flow__events">
                <div className="agent-flow__empty">
                  Set event count and click Start to stream mock events
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>
)
