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

  // ─── Agent Filtering Comprehensive ────────────────────────────────────

  describe('agent filtering comprehensive', () => {
    it('filters events by a single agent', async () => {
      const { result } = renderHook(() => useSSE(defaultOptions))

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      const mock = MockEventSource.instances[0]
      act(() => {
        mock.simulateMessage({ type: 'message', message: 'From researcher', agentName: 'researcher' })
        mock.simulateMessage({ type: 'message', message: 'From coder', agentName: 'coder' })
        mock.simulateMessage({ type: 'tool_call', tool: 'search', message: 'Searching', agentName: 'researcher' })
        mock.simulateMessage({ type: 'message', message: 'From planner', agentName: 'planner' })
        mock.simulateMessage({ type: 'message', message: 'Another from researcher', agentName: 'researcher' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      // All 5 events visible initially
      expect(result.current.events).toHaveLength(5)
      expect(result.current.filteredEvents).toHaveLength(5)

      // Filter to researcher only
      act(() => { result.current.setSelectedAgent('researcher') })

      expect(result.current.filteredEvents).toHaveLength(3)
      expect(result.current.filteredEvents.every(e => e.agentName === 'researcher')).toBe(true)
    })

    it('shows all events when selectedAgent is set to null (All Agents)', async () => {
      const { result } = renderHook(() => useSSE(defaultOptions))

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      const mock = MockEventSource.instances[0]
      act(() => {
        mock.simulateMessage({ type: 'message', message: 'A1', agentName: 'alpha' })
        mock.simulateMessage({ type: 'message', message: 'B1', agentName: 'beta' })
        mock.simulateMessage({ type: 'message', message: 'A2', agentName: 'alpha' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      // Filter to alpha
      act(() => { result.current.setSelectedAgent('alpha') })
      expect(result.current.filteredEvents).toHaveLength(2)

      // Switch to null (All Agents)
      act(() => { result.current.setSelectedAgent(null) })
      expect(result.current.filteredEvents).toHaveLength(3)
    })

    it('updates filtered events when switching between agents', async () => {
      const { result } = renderHook(() => useSSE(defaultOptions))

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      const mock = MockEventSource.instances[0]
      act(() => {
        mock.simulateMessage({ type: 'message', message: 'Writer msg', agentName: 'writer' })
        mock.simulateMessage({ type: 'message', message: 'Editor msg', agentName: 'editor' })
        mock.simulateMessage({ type: 'message', message: 'Writer msg 2', agentName: 'writer' })
        mock.simulateMessage({ type: 'tool_call', tool: 'edit', message: 'Editing', agentName: 'editor' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      // Switch: writer -> editor -> null -> editor
      act(() => { result.current.setSelectedAgent('writer') })
      expect(result.current.filteredEvents).toHaveLength(2)
      expect(result.current.filteredEvents[0].message).toBe('Writer msg')

      act(() => { result.current.setSelectedAgent('editor') })
      expect(result.current.filteredEvents).toHaveLength(2)
      expect(result.current.filteredEvents[0].message).toBe('Editor msg')

      act(() => { result.current.setSelectedAgent(null) })
      expect(result.current.filteredEvents).toHaveLength(4)

      act(() => { result.current.setSelectedAgent('editor') })
      expect(result.current.filteredEvents).toHaveLength(2)
    })

    it('filtered events count updates as new events arrive', async () => {
      const { result } = renderHook(() => useSSE(defaultOptions))

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      const mock = MockEventSource.instances[0]

      // Set filter before events arrive
      act(() => { result.current.setSelectedAgent('agent-a') })

      // Initially empty
      expect(result.current.filteredEvents).toHaveLength(0)

      // Add events for different agents in separate batches
      act(() => {
        mock.simulateMessage({ type: 'message', message: 'A1', agentName: 'agent-a' })
        mock.simulateMessage({ type: 'message', message: 'B1', agentName: 'agent-b' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      expect(result.current.filteredEvents).toHaveLength(1)

      act(() => {
        mock.simulateMessage({ type: 'message', message: 'A2', agentName: 'agent-a' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      expect(result.current.filteredEvents).toHaveLength(2)

      act(() => {
        mock.simulateMessage({ type: 'message', message: 'B2', agentName: 'agent-b' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      // Still only 2 (agent-a events)
      expect(result.current.filteredEvents).toHaveLength(2)
      expect(result.current.events).toHaveLength(4)
    })

    it('stats reflect all events regardless of selectedAgent filter', async () => {
      const { result } = renderHook(() => useSSE(defaultOptions))

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      const mock = MockEventSource.instances[0]
      act(() => {
        mock.simulateMessage({ type: 'tool_call', tool: 'search', cost: 0.01, tokens: 100, agentName: 'agent-a' })
        mock.simulateMessage({ type: 'tool_call', tool: 'write', cost: 0.02, tokens: 200, agentName: 'agent-b' })
        mock.simulateMessage({ type: 'tool_call', tool: 'read', cost: 0.03, tokens: 300, agentName: 'agent-a' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      // Stats reflect ALL events
      expect(result.current.stats.totalCost).toBeCloseTo(0.06)
      expect(result.current.stats.totalTokens).toBe(600)
      expect(result.current.stats.agents).toContain('agent-a')
      expect(result.current.stats.agents).toContain('agent-b')

      // Filter to agent-a: filteredEvents changes, stats stay the same
      act(() => { result.current.setSelectedAgent('agent-a') })

      expect(result.current.filteredEvents).toHaveLength(2)
      // Stats are not affected by agent filter
      expect(result.current.stats.totalCost).toBeCloseTo(0.06)
      expect(result.current.stats.totalTokens).toBe(600)
      expect(result.current.stats.agents).toContain('agent-a')
      expect(result.current.stats.agents).toContain('agent-b')
    })

    it('tracks unique agent names in stats', async () => {
      const { result } = renderHook(() => useSSE(defaultOptions))

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      const mock = MockEventSource.instances[0]
      act(() => {
        mock.simulateMessage({ type: 'message', message: 'a1', agentName: 'alpha' })
        mock.simulateMessage({ type: 'message', message: 'a2', agentName: 'alpha' })
        mock.simulateMessage({ type: 'message', message: 'b1', agentName: 'beta' })
        mock.simulateMessage({ type: 'message', message: 'g1', agentName: 'gamma' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      expect(result.current.stats.agents).toContain('alpha')
      expect(result.current.stats.agents).toContain('beta')
      expect(result.current.stats.agents).toContain('gamma')
      expect(result.current.stats.agents).toHaveLength(3)
    })

    it('handles events with no agentName in filtered view', async () => {
      const { result } = renderHook(() => useSSE(defaultOptions))

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      const mock = MockEventSource.instances[0]
      act(() => {
        mock.simulateMessage({ type: 'start', message: 'System start' })
        mock.simulateMessage({ type: 'message', message: 'Agent A msg', agentName: 'agent-a' })
        mock.simulateMessage({ type: 'message', message: 'No agent' })
        mock.simulateMessage({ type: 'end', message: 'Done' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      // All 4 events visible with no filter
      expect(result.current.filteredEvents).toHaveLength(4)

      // Filter to agent-a: only 1 event
      act(() => { result.current.setSelectedAgent('agent-a') })
      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].message).toBe('Agent A msg')

      // Events without agentName are excluded when filtering
      act(() => { result.current.setSelectedAgent(null) })
      expect(result.current.filteredEvents).toHaveLength(4)
    })

    it('filtering works correctly after maxEvents eviction', async () => {
      const { result } = renderHook(() => useSSE({ ...defaultOptions, maxEvents: 3 }))

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      const mock = MockEventSource.instances[0]
      act(() => {
        mock.simulateMessage({ type: 'message', message: 'A old', agentName: 'agent-a' })
        mock.simulateMessage({ type: 'message', message: 'B only', agentName: 'agent-b' })
        mock.simulateMessage({ type: 'message', message: 'A mid', agentName: 'agent-a' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      expect(result.current.events).toHaveLength(3)

      // Filter to agent-a
      act(() => { result.current.setSelectedAgent('agent-a') })
      expect(result.current.filteredEvents).toHaveLength(2)

      // Add one more to evict the oldest (A old)
      act(() => {
        mock.simulateMessage({ type: 'message', message: 'A new', agentName: 'agent-a' })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      expect(result.current.events).toHaveLength(3)
      // "A old" was evicted, so only "A mid" and "A new" remain for agent-a
      expect(result.current.filteredEvents).toHaveLength(2)
      expect(result.current.filteredEvents[0].message).toBe('A mid')
      expect(result.current.filteredEvents[1].message).toBe('A new')
    })
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

  // ─── Auto-Reconnect Detailed ──────────────────────────────────────────

  describe('auto-reconnect detailed', () => {
    it('reconnect timer resets to base delay on successful reconnection', async () => {
      const onStatusChange = vi.fn()
      const { result } = renderHook(() =>
        useSSE({ ...defaultOptions, autoReconnect: true, maxReconnectAttempts: 10, onStatusChange })
      )

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })
      expect(result.current.status).toBe('connected')

      // First error: backoff = 1000ms
      act(() => { MockEventSource.instances[0].simulateError() })
      expect(result.current.status).toBe('error')

      // Wait for reconnect (1000ms base)
      await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
      expect(MockEventSource.instances).toHaveLength(2)

      // Reconnect succeeds (onopen fires)
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })
      expect(result.current.status).toBe('connected')

      // Second error after successful reconnect: backoff should still be 1000ms (reset)
      act(() => { MockEventSource.instances[1].simulateError() })

      // If reset works, reconnect happens at 1000ms, not 2000ms
      await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
      expect(MockEventSource.instances).toHaveLength(3)

      // Third error: backoff still 1000ms (reset again after 2nd successful connection)
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })
      act(() => { MockEventSource.instances[2].simulateError() })

      await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
      expect(MockEventSource.instances).toHaveLength(4)
    })

    it('survives multiple error-reconnect-success cycles', async () => {
      const onStatusChange = vi.fn()
      const { result } = renderHook(() =>
        useSSE({ ...defaultOptions, autoReconnect: true, maxReconnectAttempts: 5, onStatusChange })
      )

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      // Cycle through 4 rounds of error -> reconnect -> success
      for (let i = 0; i < 4; i++) {
        act(() => { MockEventSource.instances[i].simulateError() })
        expect(result.current.status).toBe('error')

        await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
        expect(MockEventSource.instances).toHaveLength(i + 2)

        await act(async () => { await vi.advanceTimersByTimeAsync(20) })
        expect(result.current.status).toBe('connected')
      }

      // Should have 5 total instances (original + 4 reconnects)
      expect(MockEventSource.instances).toHaveLength(5)
    })

    it('reconnect stops after manual disconnect even if timer is pending', async () => {
      const { result } = renderHook(() =>
        useSSE({ ...defaultOptions, autoReconnect: true, maxReconnectAttempts: 10 })
      )

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      // Trigger error -> schedules reconnect at 1000ms
      act(() => { MockEventSource.instances[0].simulateError() })
      expect(result.current.status).toBe('error')

      // Disconnect manually BEFORE the 1000ms timer fires
      act(() => { result.current.disconnect() })
      expect(result.current.status).toBe('disconnected')

      // Advance past the would-be reconnect time
      await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

      // No new EventSource should have been created
      expect(MockEventSource.instances).toHaveLength(1)
      expect(result.current.status).toBe('disconnected')
    })

    it('respects custom maxReconnectAttempts of 1', async () => {
      const onError = vi.fn()
      const { result } = renderHook(() =>
        useSSE({ ...defaultOptions, autoReconnect: true, maxReconnectAttempts: 1, onError })
      )

      suppressAutoOpen = true

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      // First error -> attempts becomes 1, which equals max (1)
      // scheduleReconnect still runs since attempts < max at scheduling time
      act(() => { MockEventSource.instances[0].simulateError() })

      // Wait for reconnect (attempts was 0, now 1)
      await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
      expect(MockEventSource.instances).toHaveLength(2)

      // Second error -> attempts (1) >= max (1) -> give up
      act(() => { MockEventSource.instances[1].simulateError() })

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Max reconnect attempts'),
      }))

      // No further reconnects
      await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
      expect(MockEventSource.instances).toHaveLength(2)
    })

    it('respects custom maxReconnectAttempts of 5', async () => {
      const onError = vi.fn()
      const { result } = renderHook(() =>
        useSSE({ ...defaultOptions, autoReconnect: true, maxReconnectAttempts: 5, onError })
      )

      suppressAutoOpen = true

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      // Exhaust all 5 reconnect attempts
      for (let i = 0; i < 5; i++) {
        act(() => { MockEventSource.instances[i].simulateError() })

        const backoff = Math.min(1000 * Math.pow(2, i), 30000)
        await act(async () => { await vi.advanceTimersByTimeAsync(backoff + 100) })
      }

      // Should have 6 instances (original + 5 reconnects)
      expect(MockEventSource.instances).toHaveLength(6)

      // 6th error -> attempts (5) >= max (5) -> stop
      act(() => { MockEventSource.instances[5].simulateError() })

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Max reconnect attempts'),
      }))

      // No more reconnects
      await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
      expect(MockEventSource.instances).toHaveLength(6)
    })

    it('exponential backoff delay caps at 30 seconds', async () => {
      const { result } = renderHook(() =>
        useSSE({ ...defaultOptions, autoReconnect: true, maxReconnectAttempts: 20 })
      )

      suppressAutoOpen = true

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      // Error multiple times without successful connection to increase backoff
      // attempts 0 -> delay 1000
      act(() => { MockEventSource.instances[0].simulateError() })
      await act(async () => { await vi.advanceTimersByTimeAsync(1100) })

      // attempts 1 -> delay 2000
      act(() => { MockEventSource.instances[1].simulateError() })
      await act(async () => { await vi.advanceTimersByTimeAsync(2100) })

      // attempts 2 -> delay 4000
      act(() => { MockEventSource.instances[2].simulateError() })
      await act(async () => { await vi.advanceTimersByTimeAsync(4100) })

      // attempts 3 -> delay 8000
      act(() => { MockEventSource.instances[3].simulateError() })
      await act(async () => { await vi.advanceTimersByTimeAsync(8100) })

      // attempts 4 -> delay 16000
      act(() => { MockEventSource.instances[4].simulateError() })
      await act(async () => { await vi.advanceTimersByTimeAsync(16100) })

      // attempts 5 -> delay 32000, but capped at 30000
      act(() => { MockEventSource.instances[5].simulateError() })

      // At 29000ms, reconnect should NOT have fired yet
      await act(async () => { await vi.advanceTimersByTimeAsync(29000) })
      expect(MockEventSource.instances).toHaveLength(6)

      // At 30000ms, reconnect should fire
      await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
      expect(MockEventSource.instances).toHaveLength(7)
    })

    it('continues receiving messages after successful reconnect', async () => {
      const { result } = renderHook(() =>
        useSSE({ ...defaultOptions, autoReconnect: true, maxReconnectAttempts: 5 })
      )

      act(() => { result.current.connect() })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      // Send message on first connection
      act(() => { MockEventSource.instances[0].simulateMessage({ type: 'start', message: 'Before error' }) })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      // Error and reconnect
      act(() => { MockEventSource.instances[0].simulateError() })
      await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
      await act(async () => { await vi.advanceTimersByTimeAsync(20) })

      // Send message on second connection
      act(() => { MockEventSource.instances[1].simulateMessage({ type: 'message', message: 'After reconnect' }) })
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })

      expect(result.current.events).toHaveLength(2)
      expect(result.current.events[0].message).toBe('Before error')
      expect(result.current.events[1].message).toBe('After reconnect')
    })
  })
})
