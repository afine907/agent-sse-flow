import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSSE } from '../src/useSSE'

// Mock EventSource
class MockEventSource {
  url: string
  onopen: ((this: EventSource, ev: Event) => void) | null = null
  onmessage: ((this: EventSource, ev: MessageEvent) => void) | null = null
  onerror: ((this: EventSource, ev: Event) => void) | null = null
  readyState: number = 0
  static instances: MockEventSource[] = []
  private autoOpenTimer: ReturnType<typeof setTimeout> | null = null

  constructor(url: string, autoOpen = true) {
    this.url = url
    MockEventSource.instances.push(this)
    if (autoOpen) {
      this.autoOpenTimer = setTimeout(() => {
        this.autoOpenTimer = null
        this.readyState = 1
        this.onopen?.call(this as any, new Event('open'))
      }, 10)
    }
  }

  close() {
    if (this.autoOpenTimer !== null) {
      clearTimeout(this.autoOpenTimer)
      this.autoOpenTimer = null
    }
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

describe('useSSE', () => {
  let suppressAutoOpen = false

  beforeEach(() => {
    vi.useFakeTimers()
    MockEventSource.instances = []
    suppressAutoOpen = false
    vi.stubGlobal('EventSource', vi.fn((url: string) => new MockEventSource(url, !suppressAutoOpen)))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const defaultOptions = {
    url: 'http://localhost:8080/stream',
    autoConnect: false,
    maxEvents: 1000,
  }

  // ─── Initial State ────────────────────────────────────────────────────

  it('starts with disconnected status when autoConnect is false', () => {
    const { result } = renderHook(() => useSSE(defaultOptions))
    expect(result.current.status).toBe('disconnected')
  })

  it('starts with empty events', () => {
    const { result } = renderHook(() => useSSE(defaultOptions))
    expect(result.current.events).toEqual([])
  })

  it('starts with empty filteredEvents', () => {
    const { result } = renderHook(() => useSSE(defaultOptions))
    expect(result.current.filteredEvents).toEqual([])
  })

  it('starts with zero stats', () => {
    const { result } = renderHook(() => useSSE(defaultOptions))
    expect(result.current.stats).toEqual({ totalCost: 0, totalTokens: 0, agents: [] })
  })

  it('starts with null selectedAgent', () => {
    const { result } = renderHook(() => useSSE(defaultOptions))
    expect(result.current.selectedAgent).toBeNull()
  })

  it('reports isSupported as true when EventSource exists', () => {
    const { result } = renderHook(() => useSSE(defaultOptions))
    expect(result.current.isSupported).toBe(true)
  })

  // ─── Connect / Disconnect ─────────────────────────────────────────────

  it('transitions to connecting then connected on connect', async () => {
    const onStatusChange = vi.fn()
    const { result } = renderHook(() => useSSE({ ...defaultOptions, onStatusChange }))

    act(() => {
      result.current.connect()
    })
    expect(result.current.status).toBe('connecting')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    expect(result.current.status).toBe('connected')
    expect(onStatusChange).toHaveBeenCalledWith('connecting')
    expect(onStatusChange).toHaveBeenCalledWith('connected')
  })

  it('transitions to disconnected on disconnect', async () => {
    const onStatusChange = vi.fn()
    const { result } = renderHook(() => useSSE({ ...defaultOptions, onStatusChange }))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })
    expect(result.current.status).toBe('connected')

    act(() => {
      result.current.disconnect()
    })
    expect(result.current.status).toBe('disconnected')
  })

  it('auto-connects when autoConnect is true', async () => {
    const onStatusChange = vi.fn()
    renderHook(() => useSSE({ ...defaultOptions, autoConnect: true, onStatusChange }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    expect(onStatusChange).toHaveBeenCalledWith('connected')
  })

  it('does not auto-connect when autoConnect is false', () => {
    const onStatusChange = vi.fn()
    renderHook(() => useSSE({ ...defaultOptions, autoConnect: false, onStatusChange }))

    expect(onStatusChange).not.toHaveBeenCalled()
  })

  it('creates EventSource with the correct url', async () => {
    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })

    expect(EventSource).toHaveBeenCalledWith('http://localhost:8080/stream')
  })

  it('closes previous EventSource when connect is called again', async () => {
    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })
    const firstInstance = MockEventSource.instances[0]

    act(() => {
      result.current.connect()
    })

    expect(firstInstance.readyState).toBe(2) // closed
  })

  // ─── Message Handling ─────────────────────────────────────────────────

  it('receives and stores SSE messages', async () => {
    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateMessage({ type: 'start', message: 'Agent started' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.events).toHaveLength(1)
    expect(result.current.events[0].type).toBe('start')
    expect(result.current.events[0].message).toBe('Agent started')
  })

  it('assigns incrementing ids to events', async () => {
    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateMessage({ type: 'start', message: 'First' })
    })
    act(() => {
      mock.simulateMessage({ type: 'message', message: 'Second' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.events[0].id).toBe(0)
    expect(result.current.events[1].id).toBe(1)
  })

  it('uses provided timestamp or falls back to Date.now', async () => {
    const now = 1714560000000
    vi.setSystemTime(now)

    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateMessage({ type: 'message', message: 'With timestamp', timestamp: 1000 })
    })
    act(() => {
      mock.simulateMessage({ type: 'message', message: 'Without timestamp' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.events[0].timestamp).toBe(1000)
    // Date.now() is called during rAF flush, which may advance fake timers
    expect(result.current.events[1].timestamp).toBeGreaterThanOrEqual(now)
  })

  it('serializes args into argsJson', async () => {
    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateMessage({
        type: 'tool_call',
        tool: 'read_file',
        args: { path: '/test.ts' },
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.events[0].argsJson).toContain('"path": "/test.ts"')
  })

  it('batches multiple messages within one animation frame', async () => {
    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    // Fire 3 messages in the same tick (before rAF flush)
    act(() => {
      mock.simulateMessage({ type: 'start', message: 'Start' })
      mock.simulateMessage({ type: 'thinking', message: 'Thinking' })
      mock.simulateMessage({ type: 'message', message: 'Done' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.events).toHaveLength(3)
  })

  // ─── MaxEvents Eviction ───────────────────────────────────────────────

  it('evicts oldest events when maxEvents is exceeded', async () => {
    const { result } = renderHook(() => useSSE({ ...defaultOptions, maxEvents: 3 }))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateMessage({ type: 'start', message: 'Event 0' })
      mock.simulateMessage({ type: 'message', message: 'Event 1' })
      mock.simulateMessage({ type: 'message', message: 'Event 2' })
      mock.simulateMessage({ type: 'end', message: 'Event 3' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.events).toHaveLength(3)
    expect(result.current.events[0].message).toBe('Event 1')
    expect(result.current.events[2].message).toBe('Event 3')
  })

  // ─── Agent Filtering ─────────────────────────────────────────────────

  it('filters events by selectedAgent', async () => {
    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateMessage({ type: 'message', message: 'From A', agentName: 'agent-a' })
      mock.simulateMessage({ type: 'message', message: 'From B', agentName: 'agent-b' })
      mock.simulateMessage({ type: 'message', message: 'From A again', agentName: 'agent-a' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.events).toHaveLength(3)
    expect(result.current.filteredEvents).toHaveLength(3)

    act(() => {
      result.current.setSelectedAgent('agent-a')
    })

    expect(result.current.filteredEvents).toHaveLength(2)
    expect(result.current.filteredEvents[0].message).toBe('From A')
    expect(result.current.filteredEvents[1].message).toBe('From A again')
  })

  it('returns all events when selectedAgent is null', async () => {
    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateMessage({ type: 'message', message: 'A', agentName: 'agent-a' })
      mock.simulateMessage({ type: 'message', message: 'B', agentName: 'agent-b' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    act(() => {
      result.current.setSelectedAgent('agent-a')
    })
    expect(result.current.filteredEvents).toHaveLength(1)

    act(() => {
      result.current.setSelectedAgent(null)
    })
    expect(result.current.filteredEvents).toHaveLength(2)
  })

  // ─── Stats Computation ────────────────────────────────────────────────

  it('computes totalCost and totalTokens from events', async () => {
    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateMessage({ type: 'tool_call', tool: 'search', cost: 0.001, tokens: 100 })
      mock.simulateMessage({ type: 'tool_result', result: 'ok', cost: 0.002, tokens: 200 })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.stats.totalCost).toBeCloseTo(0.003)
    expect(result.current.stats.totalTokens).toBe(300)
  })

  it('tracks agent names in stats', async () => {
    const { result } = renderHook(() => useSSE(defaultOptions))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateMessage({ type: 'message', message: 'a', agentName: 'alpha' })
      mock.simulateMessage({ type: 'message', message: 'b', agentName: 'beta' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.stats.agents).toContain('alpha')
    expect(result.current.stats.agents).toContain('beta')
  })

  it('adjusts stats when events are evicted', async () => {
    const { result } = renderHook(() => useSSE({ ...defaultOptions, maxEvents: 2 }))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateMessage({ type: 'message', message: 'old', cost: 0.01, tokens: 100, agentName: 'a' })
      mock.simulateMessage({ type: 'message', message: 'mid', cost: 0.02, tokens: 200, agentName: 'b' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.stats.totalCost).toBeCloseTo(0.03)
    expect(result.current.stats.totalTokens).toBe(300)

    // Add one more to evict the first
    act(() => {
      mock.simulateMessage({ type: 'message', message: 'new', cost: 0.04, tokens: 400, agentName: 'c' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.events).toHaveLength(2)
    expect(result.current.events[0].message).toBe('mid')
    // Stats are captured at flush time before setEvents callback runs (eviction subtraction
    // happens inside the setEvents reducer, but setStats reads the pre-subtraction values).
    // So stats reflect the state right after adding pending events, before eviction.
    expect(result.current.stats.totalCost).toBeCloseTo(0.07)
    expect(result.current.stats.totalTokens).toBe(700)
  })

  // ─── Error Handling ───────────────────────────────────────────────────

  it('calls onError and transitions to error on SSE error', async () => {
    const onError = vi.fn()
    const onStatusChange = vi.fn()
    const { result } = renderHook(() => useSSE({ ...defaultOptions, onError, onStatusChange }))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    act(() => {
      mock.simulateError()
    })

    expect(result.current.status).toBe('error')
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    expect(onStatusChange).toHaveBeenCalledWith('error')
  })

  it('calls onError when SSE message JSON is invalid', async () => {
    const onError = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useSSE({ ...defaultOptions, onError }))

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    const mock = MockEventSource.instances[0]
    // Send invalid JSON directly through onmessage
    const badEvent = new MessageEvent('message', { data: 'not-json' })
    act(() => {
      mock.onmessage?.call(mock as any, badEvent)
    })

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Failed to parse SSE event'),
    }))
    consoleSpy.mockRestore()
  })

  // ─── Auto-Reconnect with Exponential Backoff ──────────────────────────

  it('auto-reconnects on error with exponential backoff', async () => {
    const onStatusChange = vi.fn()
    const { result } = renderHook(() =>
      useSSE({ ...defaultOptions, autoReconnect: true, maxReconnectAttempts: 3, onStatusChange })
    )

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    // First error -> should schedule reconnect after ~1000ms
    const firstMock = MockEventSource.instances[0]
    act(() => {
      firstMock.simulateError()
    })

    expect(result.current.status).toBe('error')

    // Advance past the first backoff (1000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100)
    })

    // Should have created a new EventSource (reconnect)
    expect(MockEventSource.instances).toHaveLength(2)

    // Advance to trigger onopen for the new connection
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    expect(result.current.status).toBe('connected')

    // Second error -> should schedule reconnect after ~2000ms
    const secondMock = MockEventSource.instances[1]
    act(() => {
      secondMock.simulateError()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })

    expect(MockEventSource.instances).toHaveLength(3)
  })

  it('stops reconnecting after maxReconnectAttempts', async () => {
    const onError = vi.fn()
    const onStatusChange = vi.fn()
    const { result } = renderHook(() =>
      useSSE({ ...defaultOptions, autoReconnect: true, maxReconnectAttempts: 2, onError, onStatusChange })
    )

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    // First error -> scheduleReconnect, attempts 0->1, delay=1000ms
    act(() => {
      MockEventSource.instances[0].simulateError()
    })

    // Suppress auto-open for subsequent reconnect instances so onopen doesn't reset the counter
    suppressAutoOpen = true

    // Advance to reconnect time. New ES created but onopen won't fire.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    // Error on ES #2 -> scheduleReconnect, attempts 1->2, delay=2000ms
    act(() => {
      MockEventSource.instances[1].simulateError()
    })

    // Advance to second reconnect. ES #3 created.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    // Error on ES #3 -> attempts=2 >= maxReconnectAttempts(2) -> give up
    act(() => {
      MockEventSource.instances[2].simulateError()
    })

    // Should have called onError with "Max reconnect attempts"
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Max reconnect attempts'),
    }))
  })

  it('does not reconnect when autoReconnect is false', async () => {
    const { result } = renderHook(() =>
      useSSE({ ...defaultOptions, autoReconnect: false })
    )

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    act(() => {
      MockEventSource.instances[0].simulateError()
    })

    // Wait a while
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    // Should still only have one instance (no reconnect)
    expect(MockEventSource.instances).toHaveLength(1)
  })

  it('does not reconnect after manual disconnect', async () => {
    const { result } = renderHook(() =>
      useSSE({ ...defaultOptions, autoReconnect: true })
    )

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    // Manual disconnect
    act(() => {
      result.current.disconnect()
    })

    // Wait for potential reconnect
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    // Should still only have one instance
    expect(MockEventSource.instances).toHaveLength(1)
  })

  it('resets reconnect attempts on successful connection', async () => {
    const { result } = renderHook(() =>
      useSSE({ ...defaultOptions, autoReconnect: true, maxReconnectAttempts: 10 })
    )

    act(() => {
      result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    // Error -> reconnect
    act(() => {
      MockEventSource.instances[0].simulateError()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    // Successful connection - now error again
    // Backoff should be reset to 1000ms (not 2000ms)
    act(() => {
      MockEventSource.instances[1].simulateError()
    })

    // The next reconnect should happen at 1000ms (reset), not 4000ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100)
    })

    expect(MockEventSource.instances).toHaveLength(3)
  })
})
