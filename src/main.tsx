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
  const [viewMode, setViewMode] = React.useState<'list' | 'timeline'>('timeline')

  const startStream = () => {
    setSseUrl(`${MOCK_SERVER}/stream?count=${eventCount}`)
    setRunning(true)
  }

  const stopStream = () => {
    setSseUrl('')
    setRunning(false)
  }

  const isDark = theme === 'dark'

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      background: isDark ? '#08090d' : '#f0f1f5',
      color: isDark ? '#e2e4ed' : '#1a1d2e',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: `1px solid ${isDark ? '#1e2133' : '#e2e4ea'}`,
        background: isDark ? '#0c0d14' : '#ffffff',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'linear-gradient(135deg, #6e8bfa 0%, #8b5cf6 100%)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em' }}>
            agent-sse-flow
          </span>
          <span style={{
            fontSize: '11px',
            padding: '2px 7px',
            borderRadius: 4,
            background: isDark ? 'rgba(110, 139, 250, 0.12)' : 'rgba(79, 110, 247, 0.08)',
            color: isDark ? '#6e8bfa' : '#4f6ef7',
            fontWeight: 500,
            fontFamily: "'SF Mono', 'Cascadia Code', monospace",
          }}>
            v2.3.0
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href="https://github.com/afine907/agent-sse-flow"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: isDark ? '#5c6078' : '#9ca0b3',
              display: 'flex',
              alignItems: 'center',
              padding: 6,
              borderRadius: 6,
              transition: 'color 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '16px',
        padding: '16px',
        minHeight: 0,
      }}>
        {/* Sidebar */}
        <div style={{
          width: 260,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flexShrink: 0,
        }}>
          {/* Event count control */}
          <div style={{
            padding: '14px 16px',
            background: isDark ? '#111320' : '#ffffff',
            border: `1px solid ${isDark ? '#1e2133' : '#e2e4ea'}`,
            borderRadius: 10,
          }}>
            <label style={{
              fontSize: '11.5px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isDark ? '#5c6078' : '#9ca0b3',
              display: 'block',
              marginBottom: '10px',
            }}>
              Event Count
            </label>
            <input
              type="range"
              min={100}
              max={100000}
              step={100}
              value={eventCount}
              onChange={e => setEventCount(Number(e.target.value))}
              disabled={running}
              style={{
                width: '100%',
                accentColor: '#6e8bfa',
                height: 4,
              }}
            />
            <div style={{
              textAlign: 'center',
              fontSize: '22px',
              fontWeight: 600,
              marginTop: '6px',
              fontFamily: "'SF Mono', 'Cascadia Code', monospace",
              letterSpacing: '-0.02em',
            }}>
              {eventCount.toLocaleString()}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={running ? stopStream : startStream}
              style={{
                flex: 1,
                padding: '9px 16px',
                background: running
                  ? (isDark ? '#3a1520' : '#fef2f2')
                  : (isDark ? '#1a2550' : '#eff4ff'),
                color: running ? '#ef4444' : '#6e8bfa',
                border: `1px solid ${running ? (isDark ? '#5a1d2d' : '#fecaca') : (isDark ? '#243370' : '#bfdbfe')}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                transition: 'all 0.15s',
              }}
            >
              {running ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                  Stop
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  Start
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode(m => m === 'timeline' ? 'list' : 'timeline')}
              title={viewMode === 'timeline' ? 'Switch to list view' : 'Switch to timeline view'}
              style={{
                padding: '9px 11px',
                background: isDark ? '#111320' : '#ffffff',
                color: isDark ? '#8b8fa4' : '#6b7085',
                border: `1px solid ${isDark ? '#1e2133' : '#e2e4ea'}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {viewMode === 'timeline' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              style={{
                padding: '9px 11px',
                background: isDark ? '#111320' : '#ffffff',
                color: isDark ? '#8b8fa4' : '#6b7085',
                border: `1px solid ${isDark ? '#1e2133' : '#e2e4ea'}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
          </div>

          {/* Features */}
          <div style={{
            padding: '14px 16px',
            background: isDark ? '#111320' : '#ffffff',
            border: `1px solid ${isDark ? '#1e2133' : '#e2e4ea'}`,
            borderRadius: 10,
          }}>
            <div style={{
              fontSize: '11.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isDark ? '#5c6078' : '#9ca0b3',
              marginBottom: '10px',
            }}>
              Features
            </div>
            <ul style={{
              paddingLeft: '16px',
              margin: 0,
              fontSize: '12.5px',
              lineHeight: 1.8,
              color: isDark ? '#8b8fa4' : '#6b7085',
            }}>
              <li>Virtual scrolling (100K+ nodes)</li>
              <li>rAF message batching</li>
              <li>Stable event keys</li>
              <li>Configurable maxEvents</li>
              <li>Markdown rendering</li>
            </ul>
          </div>

          {/* Usage */}
          <div style={{
            padding: '14px 16px',
            background: isDark ? '#111320' : '#ffffff',
            border: `1px solid ${isDark ? '#1e2133' : '#e2e4ea'}`,
            borderRadius: 10,
          }}>
            <div style={{
              fontSize: '11.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isDark ? '#5c6078' : '#9ca0b3',
              marginBottom: '10px',
            }}>
              Usage
            </div>
            <pre style={{
              fontSize: '11.5px',
              lineHeight: 1.6,
              overflow: 'auto',
              background: isDark ? '#0b0c14' : '#f4f5f7',
              color: isDark ? '#a5b4fc' : '#4f6ef7',
              padding: '12px 14px',
              borderRadius: 7,
              margin: 0,
              fontFamily: "'SF Mono', 'Cascadia Code', 'JetBrains Mono', monospace",
              border: `1px solid ${isDark ? '#1a1d2e' : '#ecedf1'}`,
            }}>
{`<AgentFlow
  url="/api/sse"
  theme="dark"
  maxEvents={100000}
/>`}
            </pre>
          </div>
        </div>

        {/* AgentFlow component */}
        <div style={{
          flex: 1,
          border: `1px solid ${isDark ? '#1e2133' : '#e2e4ea'}`,
          borderRadius: 10,
          overflow: 'hidden',
          minHeight: 0,
          background: isDark ? '#0f1117' : '#ffffff',
        }}>
          {sseUrl ? (
            <AgentFlow
              key={sseUrl}
              url={sseUrl}
              theme={theme}
              viewMode={viewMode}
              maxEvents={eventCount}
            />
          ) : (
            <div className={`agent-flow agent-flow--${theme}`} style={{ height: '100%' }}>
              <div className="agent-flow__header">
                <span className="agent-flow__status">
                  <span className="agent-flow__status-dot agent-flow__status-dot--disconnected" />
                  disconnected
                </span>
              </div>
              <div className="agent-flow__events" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  textAlign: 'center',
                  padding: '40px 24px',
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: isDark ? 'rgba(110, 139, 250, 0.08)' : 'rgba(79, 110, 247, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#5c6078' : '#9ca0b3'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isDark ? '#5c6078' : '#9ca0b3',
                    marginBottom: 4,
                  }}>
                    No events yet
                  </div>
                  <div style={{
                    fontSize: '12.5px',
                    color: isDark ? '#3d4060' : '#b0b5c0',
                  }}>
                    Set event count and click Start to stream
                  </div>
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
      <AgentFlow url={url} theme="dark" maxEvents={100_000} />
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
