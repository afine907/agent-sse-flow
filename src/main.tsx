import React from 'react'
import ReactDOM from 'react-dom/client'
import { AgentFlow } from './AgentFlow'
import './AgentFlow.css'

const MOCK_SERVER = 'http://localhost:3001'

function Demo() {
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark')
  const [eventCount, setEventCount] = React.useState(1000)
  const [sseUrl, setSseUrl] = React.useState('')
  const [running, setRunning] = React.useState(false)

  const startStream = () => {
    setSseUrl(`${MOCK_SERVER}/stream?count=${eventCount}`)
    setRunning(true)
  }

  const stopStream = () => {
    setSseUrl('')
    setRunning(false)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', background: '#1a1a2e', borderBottom: '1px solid #2d2d44' }}>
        <h1 style={{ color: '#eaeaea', fontSize: '24px', marginBottom: '8px' }}>
          agent-sse-flow Demo
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          Agent SSE Stream Visualizer — Virtual scrolling, 10K+ nodes
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '16px', padding: '16px', minHeight: 0 }}>
        {/* Control panel */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
          <div style={{ padding: '12px', background: '#242442', borderRadius: '8px', color: '#eaeaea' }}>
            <label style={{ fontSize: '13px', opacity: 0.7, display: 'block', marginBottom: '4px' }}>Event Count</label>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={eventCount}
              onChange={e => setEventCount(Number(e.target.value))}
              disabled={running}
              style={{ width: '100%' }}
            />
            <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>
              {eventCount.toLocaleString()}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={running ? stopStream : startStream}
              style={{
                flex: 1,
                padding: '10px',
                background: running ? '#ef4444' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {running ? 'Stop' : 'Start'}
            </button>
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              style={{
                padding: '10px 14px',
                background: '#242442',
                color: '#eaeaea',
                border: '1px solid #3d3d5c',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>

          <div style={{ padding: '12px', background: '#242442', borderRadius: '8px', color: '#eaeaea', fontSize: '13px', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Features</div>
            <ul style={{ paddingLeft: '18px', margin: 0 }}>
              <li>Virtual scrolling (10K+ nodes)</li>
              <li>rAF message batching</li>
              <li>Stable event keys</li>
              <li>Configurable maxEvents</li>
              <li>Markdown rendering</li>
            </ul>
          </div>

          <div style={{ padding: '12px', background: '#242442', borderRadius: '8px', color: '#eaeaea' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Usage</div>
            <pre style={{ fontSize: '11px', overflow: 'auto', background: '#1a1a2e', padding: '10px', borderRadius: '4px', margin: 0 }}>
{`<AgentFlow
  url="/api/sse"
  theme="dark"
  maxEvents={10000}
/>`}
            </pre>
          </div>
        </div>

        {/* AgentFlow component */}
        <div style={{ flex: 1, border: '1px solid #2d2d44', borderRadius: '8px', overflow: 'hidden', minHeight: 0 }}>
          {sseUrl ? (
            <AgentFlow
              key={sseUrl}
              url={sseUrl}
              theme={theme}
              maxEvents={10_000}
            />
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
                  Set event count and click Start to stream from mock server
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Performance test page: direct AgentFlow with SSE URL from query param
function PerfTestPage({ url }: { url: string }) {
  return (
    <div style={{ height: '100vh' }}>
      <AgentFlow url={url} theme="dark" maxEvents={10_000} />
    </div>
  )
}

const params = new URLSearchParams(window.location.search)
const sseParam = params.get('sse')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {sseParam ? <PerfTestPage url={sseParam} /> : <Demo />}
  </React.StrictMode>
)
