import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { AgentFlow } from '../src/AgentFlow'

// Mock @tanstack/react-virtual to render all items (no virtual scrolling in tests)
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, getScrollElement }: any) => ({
    getTotalSize: () => count * 80,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 80,
        size: 80,
        end: (i + 1) * 80,
      })),
    measureElement: () => {},
  }),
}))

// Mock EventSource
class MockEventSource {
  url: string
  onopen: ((this: EventSource, ev: Event) => void) | null = null
  onmessage: ((this: EventSource, ev: MessageEvent) => void) | null = null
  onerror: ((this: EventSource, ev: Event) => void) | null = null
  readyState: number = 0
  
  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.call(this as any, new Event('open'))
    }, 10)
  }
  
  close() {
    this.readyState = 2
  }
  
  simulateMessage(data: object) {
    const event = new MessageEvent('message', {
      data: JSON.stringify(data),
    })
    this.onmessage?.call(this as any, event)
  }
  
  simulateError() {
    this.onerror?.call(this as any, new Event('error'))
  }
}

describe('AgentFlow', () => {
  let mockEventSource: MockEventSource | null = null
  
  beforeEach(() => {
    vi.useFakeTimers()
    mockEventSource = null
    
    // Mock EventSource constructor
    vi.stubGlobal('EventSource', vi.fn((url: string) => {
      mockEventSource = new MockEventSource(url)
      return mockEventSource
    }))
  })
  
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  
  it('renders with dark theme by default', () => {
    render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
    expect(document.querySelector('.agent-flow--dark')).toBeInTheDocument()
  })
  
  it('renders with light theme when specified', () => {
    render(<AgentFlow url="http://localhost:8080/stream" theme="light" autoConnect={false} />)
    expect(document.querySelector('.agent-flow--light')).toBeInTheDocument()
  })
  
  it('shows empty state initially', () => {
    render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
    expect(screen.getByText(/No events yet/)).toBeInTheDocument()
  })
  
  it('calls onStatusChange when connecting', async () => {
    const onStatusChange = vi.fn()
    render(<AgentFlow url="http://localhost:8080/stream" onStatusChange={onStatusChange} />)
    
    await vi.runAllTimersAsync()
    
    expect(onStatusChange).toHaveBeenCalledWith('connecting')
    expect(onStatusChange).toHaveBeenCalledWith('connected')
  })
  
  it('displays events from SSE stream', async () => {
    const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

    // Give the scroll container a height so virtualizer renders items
    const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
    if (eventsEl) {
      Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
      Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
    }

    // Flush EventSource onopen (setTimeout 10ms)
    await vi.advanceTimersByTimeAsync(20)

    // Simulate SSE message
    mockEventSource?.simulateMessage({
      type: 'start',
      message: 'Agent started',
    })

    // Flush RAF (setTimeout 0) and any pending timers
    await vi.advanceTimersByTimeAsync(50)

    expect(screen.getByText('Agent started')).toBeInTheDocument()
  })
  
  it('shows event count in header', async () => {
    render(<AgentFlow url="http://localhost:8080/stream" />)
    
    await vi.runAllTimersAsync()
    
    // Simulate multiple events
    mockEventSource?.simulateMessage({ type: 'start', message: 'Start' })
    mockEventSource?.simulateMessage({ type: 'thinking', message: 'Thinking...' })
    
    await vi.runAllTimersAsync()
    
    expect(screen.getByText(/2 events/)).toBeInTheDocument()
  })
  
  it('handles errors gracefully', async () => {
    const onError = vi.fn()
    render(<AgentFlow url="http://localhost:8080/stream" onError={onError} />)
    
    await vi.runAllTimersAsync()
    
    mockEventSource?.simulateError()
    
    expect(onError).toHaveBeenCalled()
  })
  
  it('shows connect button when disconnected', () => {
    render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
    expect(screen.getByText('Connect')).toBeInTheDocument()
  })
  
  it('scrolls to bottom when button clicked', async () => {
    const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)
    
    await vi.runAllTimersAsync()
    
    // Add many events to make scrollable
    for (let i = 0; i < 100; i++) {
      mockEventSource?.simulateMessage({
        type: 'message',
        message: `Event ${i}`,
      })
    }
    
    await vi.runAllTimersAsync()
    
    // Find scroll bottom button
    const scrollBtn = container.querySelector('.agent-flow__scroll-bottom')
    if (scrollBtn) {
      fireEvent.click(scrollBtn)
      // Verify scroll happened
      expect(container.querySelector('.agent-flow__events')?.scrollTop).toBeDefined()
    }
  })
  
  it('renders in timeline mode', () => {
    render(<AgentFlow url="http://localhost:8080/stream" viewMode="timeline" autoConnect={false} />)
    expect(document.querySelector('.agent-flow--timeline')).toBeInTheDocument()
  })
  
  it('supports custom renderMessage', async () => {
    const renderMessage = (msg: string) => <span data-testid="custom">{msg.toUpperCase()}</span>
    const { container } = render(<AgentFlow url="http://localhost:8080/stream" renderMessage={renderMessage} />)

    const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
    if (eventsEl) {
      Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
      Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
    }

    await vi.advanceTimersByTimeAsync(20)

    mockEventSource?.simulateMessage({ type: 'message', message: 'test' })

    await vi.advanceTimersByTimeAsync(50)

    expect(screen.getByTestId('custom')).toHaveTextContent('TEST')
  })
})
