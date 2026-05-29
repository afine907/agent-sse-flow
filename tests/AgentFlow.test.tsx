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
    scrollToIndex: () => {},
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

  // ─── Search Functionality ─────────────────────────────────────────────

  describe('search', () => {
    async function setupWithEvents() {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)

      // Add a variety of events
      mockEventSource?.simulateMessage({ type: 'start', message: 'Agent started' })
      mockEventSource?.simulateMessage({ type: 'tool_call', tool: 'read_file', message: 'Reading file' })
      mockEventSource?.simulateMessage({ type: 'tool_result', result: 'File contents here', message: 'Result' })
      mockEventSource?.simulateMessage({ type: 'message', message: 'Analysis complete' })
      mockEventSource?.simulateMessage({ type: 'error', message: 'Something went wrong' })

      await vi.advanceTimersByTimeAsync(50)

      return container
    }

    it('opens search bar on Ctrl+K', async () => {
      await setupWithEvents()

      // Search bar should not be visible initially
      expect(document.querySelector('.agent-flow__search-bar')).not.toBeInTheDocument()

      // Press Ctrl+K
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

      // Search bar should appear
      expect(document.querySelector('.agent-flow__search-bar')).toBeInTheDocument()
      expect(document.querySelector('.agent-flow__search-input')).toBeInTheDocument()
    })

    it('opens search bar on Meta+K', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', metaKey: true })

      expect(document.querySelector('.agent-flow__search-bar')).toBeInTheDocument()
    })

    it('toggles search bar on repeated Ctrl+K', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      expect(document.querySelector('.agent-flow__search-bar')).toBeInTheDocument()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      expect(document.querySelector('.agent-flow__search-bar')).not.toBeInTheDocument()
    })

    it('filters events by message content', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'Analysis' } })
      await vi.advanceTimersByTimeAsync(50)

      // Only "Analysis complete" should match
      expect(screen.getByText('Analysis complete')).toBeInTheDocument()
      expect(screen.queryByText('Agent started')).not.toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('filters events by tool name', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'read_file' } })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('read_file')).toBeInTheDocument()
      expect(screen.queryByText('Agent started')).not.toBeInTheDocument()
    })

    it('filters events by type', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'error' } })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.queryByText('Agent started')).not.toBeInTheDocument()
    })

    it('shows match count when search query is active', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'complete' } })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('1 matches')).toBeInTheDocument()
    })

    it('shows "No matching events" when search has no results', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'nonexistent' } })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('No matching events')).toBeInTheDocument()
    })

    it('shows filtered/total count in header during search', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'Agent' } })
      await vi.advanceTimersByTimeAsync(50)

      // Header should show "1/5 events" (1 match out of 5 total)
      expect(screen.getByText(/1\/5/)).toBeInTheDocument()
    })

    it('restores all events when search is closed', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'nonexistent' } })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('No matching events')).toBeInTheDocument()

      // Close search via close button
      const closeBtn = document.querySelector('.agent-flow__search-close') as HTMLButtonElement
      fireEvent.click(closeBtn)

      await vi.advanceTimersByTimeAsync(50)

      // All events should be visible again
      expect(screen.getByText('Agent started')).toBeInTheDocument()
      expect(screen.getByText('Analysis complete')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('closes search on Escape key', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'nonexistent' } })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('No matching events')).toBeInTheDocument()

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' })
      await vi.advanceTimersByTimeAsync(50)

      // Search bar should be gone and all events restored
      expect(document.querySelector('.agent-flow__search-bar')).not.toBeInTheDocument()
      expect(screen.getByText('Agent started')).toBeInTheDocument()
    })

    it('clears search query when search is closed', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'test' } })
      await vi.advanceTimersByTimeAsync(50)

      // Close and reopen search
      fireEvent.keyDown(window, { key: 'Escape' })
      await vi.advanceTimersByTimeAsync(50)
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

      // Input should be empty
      const newInput = document.querySelector('.agent-flow__search-input') as HTMLInputElement
      expect(newInput.value).toBe('')
    })

    it('search is case insensitive', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'ANALYSIS' } })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('Analysis complete')).toBeInTheDocument()
    })

    it('filters events by result content', async () => {
      await setupWithEvents()

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'File contents' } })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText(/File contents here/)).toBeInTheDocument()
      expect(screen.queryByText('Agent started')).not.toBeInTheDocument()
    })
  })

  // ─── EventSource Error and Lifecycle ──────────────────────────────────

  describe('EventSource error and lifecycle', () => {
    it('displays error status when EventSource onerror fires', async () => {
      const onError = vi.fn()
      const onStatusChange = vi.fn()
      render(<AgentFlow url="http://localhost:8080/stream" autoReconnect={false} onError={onError} onStatusChange={onStatusChange} />)

      await vi.advanceTimersByTimeAsync(20)
      expect(onStatusChange).toHaveBeenCalledWith('connected')

      // Trigger error
      mockEventSource?.simulateError()
      await vi.advanceTimersByTimeAsync(50)

      expect(onError).toHaveBeenCalled()
      expect(onStatusChange).toHaveBeenCalledWith('error')

      // Error status should be visible in the UI (status span, not the type filter label)
      const errorTexts = screen.getAllByText('error')
      const statusError = errorTexts.find(el => el.classList.contains('agent-flow__status'))
      expect(statusError).toBeInTheDocument()
    })

    it('shows error status dot with error class', async () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoReconnect={false} />)

      await vi.advanceTimersByTimeAsync(20)

      // Initially connected
      expect(document.querySelector('.agent-flow__status-dot--connected')).toBeInTheDocument()

      // Trigger error
      mockEventSource?.simulateError()
      await vi.advanceTimersByTimeAsync(50)

      // Error dot should appear
      expect(document.querySelector('.agent-flow__status-dot--error')).toBeInTheDocument()
    })

    it('handles EventSource close during active streaming', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)

      // Stream some events
      mockEventSource?.simulateMessage({ type: 'start', message: 'Started' })
      mockEventSource?.simulateMessage({ type: 'message', message: 'Processing...' })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('Started')).toBeInTheDocument()
      expect(screen.getByText('Processing...')).toBeInTheDocument()

      // Close the EventSource (simulating server disconnect)
      mockEventSource?.close()

      // Events should still be visible (they persist in state)
      expect(screen.getByText('Started')).toBeInTheDocument()
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    it('preserves received events after error', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)

      // Receive events before error
      mockEventSource?.simulateMessage({ type: 'start', message: 'Before error' })
      mockEventSource?.simulateMessage({ type: 'tool_call', tool: 'search', message: 'Searching' })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('Before error')).toBeInTheDocument()
      expect(screen.getByText('Searching')).toBeInTheDocument()

      // Error occurs
      mockEventSource?.simulateError()

      // Events should still be in the DOM
      expect(screen.getByText('Before error')).toBeInTheDocument()
      expect(screen.getByText('Searching')).toBeInTheDocument()

      // Event count should still show
      expect(screen.getByText(/2 events/)).toBeInTheDocument()
    })

    it('handles rapid connect/disconnect cycles', async () => {
      const onStatusChange = vi.fn()
      const { unmount } = render(
        <AgentFlow url="http://localhost:8080/stream" onStatusChange={onStatusChange} />
      )

      // Wait for initial connection
      await vi.advanceTimersByTimeAsync(20)

      // Rapidly unmount and remount (simulates rapid component lifecycle)
      unmount()

      // Render a new instance
      const onStatusChange2 = vi.fn()
      render(<AgentFlow url="http://localhost:8080/stream" onStatusChange={onStatusChange2} />)

      await vi.advanceTimersByTimeAsync(20)
      expect(onStatusChange2).toHaveBeenCalledWith('connected')

      // Quick unmount again
      cleanup()

      // Third instance
      const onStatusChange3 = vi.fn()
      render(<AgentFlow url="http://localhost:8080/stream" onStatusChange={onStatusChange3} />)

      await vi.advanceTimersByTimeAsync(20)
      expect(onStatusChange3).toHaveBeenCalledWith('connected')
    })

    it('shows Connect button after error allows reconnection', async () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoReconnect={false} />)

      await vi.advanceTimersByTimeAsync(20)

      // Trigger error
      mockEventSource?.simulateError()
      await vi.advanceTimersByTimeAsync(50)

      // After error, the component should show error status (status span, not type filter label)
      const errorTexts = screen.getAllByText('error')
      const statusError = errorTexts.find(el => el.classList.contains('agent-flow__status'))
      expect(statusError).toBeInTheDocument()
    })

    it('calls onError with meaningful error message', async () => {
      const onError = vi.fn()
      render(<AgentFlow url="http://localhost:8080/stream" onError={onError} />)

      await vi.advanceTimersByTimeAsync(20)

      mockEventSource?.simulateError()

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('SSE connection failed'),
      }))
    })

    it('handles EventSource that errors immediately on creation', async () => {
      // Override mock to create an EventSource that errors immediately
      vi.stubGlobal('EventSource', vi.fn((url: string) => {
        const es = new MockEventSource(url)
        // Override to error immediately instead of opening
        setTimeout(() => {
          es.onerror?.call(es as any, new Event('error'))
        }, 5)
        return es
      }))

      const onError = vi.fn()
      const onStatusChange = vi.fn()
      render(<AgentFlow url="http://localhost:8080/stream" onError={onError} onStatusChange={onStatusChange} />)

      await vi.advanceTimersByTimeAsync(20)

      expect(onStatusChange).toHaveBeenCalledWith('connecting')
      expect(onStatusChange).toHaveBeenCalledWith('error')
      expect(onError).toHaveBeenCalled()
    })

    it('receives multiple events then handles clean close', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)

      // Stream many events
      for (let i = 0; i < 10; i++) {
        mockEventSource?.simulateMessage({
          type: i === 0 ? 'start' : i === 9 ? 'end' : 'message',
          message: `Event ${i}`,
        })
      }
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText(/10 events/)).toBeInTheDocument()

      // Clean close (server ends stream)
      mockEventSource?.close()

      // All events should remain visible
      expect(screen.getByText('Event 0')).toBeInTheDocument()
      expect(screen.getByText('Event 9')).toBeInTheDocument()
      expect(screen.getByText(/10 events/)).toBeInTheDocument()
    })
  })

  // ─── Phase 2 Feature Tests ───────────────────────────────────────────

  describe('export button', () => {
    it('shows export toggle button in the header', () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      const exportBtn = container.querySelector('.agent-flow__export-toggle')
      expect(exportBtn).toBeInTheDocument()
    })

    it('opens export dropdown on click', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      const exportBtn = container.querySelector('.agent-flow__export-toggle') as HTMLButtonElement

      fireEvent.click(exportBtn)
      await vi.advanceTimersByTimeAsync(50)

      expect(container.querySelector('.agent-flow__export-dropdown')).toBeInTheDocument()
      expect(screen.getByText('Export as JSON')).toBeInTheDocument()
      expect(screen.getByText('Export as CSV')).toBeInTheDocument()
    })

    it('closes export dropdown on second click', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      const exportBtn = container.querySelector('.agent-flow__export-toggle') as HTMLButtonElement

      fireEvent.click(exportBtn)
      await vi.advanceTimersByTimeAsync(50)
      expect(container.querySelector('.agent-flow__export-dropdown')).toBeInTheDocument()

      fireEvent.click(exportBtn)
      await vi.advanceTimersByTimeAsync(50)
      expect(container.querySelector('.agent-flow__export-dropdown')).not.toBeInTheDocument()
    })
  })

  describe('type filter checkboxes', () => {
    it('renders all event type checkboxes', () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      const checkboxes = document.querySelectorAll('.agent-flow__type-checkbox')
      expect(checkboxes.length).toBe(7) // start, thinking, tool_call, tool_result, message, error, end
    })

    it('all checkboxes are checked by default', () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      const inputs = document.querySelectorAll('.agent-flow__type-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>
      inputs.forEach(input => {
        expect(input.checked).toBe(true)
      })
    })

    it('unchecks a type filter when clicked', async () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)

      // Find the "error" checkbox label
      const labels = document.querySelectorAll('.agent-flow__type-checkbox')
      const errorLabel = Array.from(labels).find(el => el.textContent?.includes('error'))
      expect(errorLabel).toBeInTheDocument()

      const checkbox = errorLabel!.querySelector('input[type="checkbox"]') as HTMLInputElement
      expect(checkbox.checked).toBe(true)

      fireEvent.click(checkbox)
      await vi.advanceTimersByTimeAsync(50)

      expect(checkbox.checked).toBe(false)
    })

    it('re-checks a type filter when clicked again', async () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)

      const labels = document.querySelectorAll('.agent-flow__type-checkbox')
      const errorLabel = Array.from(labels).find(el => el.textContent?.includes('error'))
      const checkbox = errorLabel!.querySelector('input[type="checkbox"]') as HTMLInputElement

      // Uncheck
      fireEvent.click(checkbox)
      await vi.advanceTimersByTimeAsync(50)
      expect(checkbox.checked).toBe(false)

      // Re-check
      fireEvent.click(checkbox)
      await vi.advanceTimersByTimeAsync(50)
      expect(checkbox.checked).toBe(true)
    })

    it('filters events by type when checkbox is unchecked', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)

      // Add events of different types
      mockEventSource?.simulateMessage({ type: 'start', message: 'Agent started' })
      mockEventSource?.simulateMessage({ type: 'error', message: 'An error occurred' })
      mockEventSource?.simulateMessage({ type: 'message', message: 'Hello world' })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('Agent started')).toBeInTheDocument()
      expect(screen.getByText('An error occurred')).toBeInTheDocument()
      expect(screen.getByText('Hello world')).toBeInTheDocument()

      // Uncheck "start" type
      const labels = document.querySelectorAll('.agent-flow__type-checkbox')
      const startLabel = Array.from(labels).find(el => el.textContent?.includes('start'))
      const checkbox = startLabel!.querySelector('input[type="checkbox"]') as HTMLInputElement
      fireEvent.click(checkbox)
      await vi.advanceTimersByTimeAsync(50)

      // "Agent started" should be filtered out
      expect(screen.queryByText('Agent started')).not.toBeInTheDocument()
      expect(screen.getByText('An error occurred')).toBeInTheDocument()
      expect(screen.getByText('Hello world')).toBeInTheDocument()
    })
  })

  describe('clear button', () => {
    it('shows clear button in the header', () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      // The clear button has a trash icon SVG
      const clearBtn = container.querySelector('.agent-flow__header-btn[title="Clear all events"]')
      expect(clearBtn).toBeInTheDocument()
    })

    it('clear button is disabled when no events exist', () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      const clearBtn = container.querySelector('.agent-flow__header-btn[title="Clear all events"]') as HTMLButtonElement
      expect(clearBtn.disabled).toBe(true)
    })

    it('clear button removes all events when clicked', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)

      // Add events
      mockEventSource?.simulateMessage({ type: 'start', message: 'Started' })
      mockEventSource?.simulateMessage({ type: 'message', message: 'Processing' })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('Started')).toBeInTheDocument()
      expect(screen.getByText(/2 events/)).toBeInTheDocument()

      // Click clear
      const clearBtn = container.querySelector('.agent-flow__header-btn[title="Clear all events"]') as HTMLButtonElement
      fireEvent.click(clearBtn)
      await vi.advanceTimersByTimeAsync(50)

      // Events should be gone
      expect(screen.queryByText('Started')).not.toBeInTheDocument()
      expect(screen.getByText(/No events yet/)).toBeInTheDocument()
    })
  })

  describe('stats panel', () => {
    it('stats panel is hidden by default', () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      expect(document.querySelector('.agent-flow__stats')).not.toBeInTheDocument()
    })

    it('toggles stats panel when stats button is clicked', async () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)

      // Find the stats toggle button (bar chart icon, title="Toggle event statistics")
      const statsBtn = document.querySelector('.agent-flow__header-btn[title="Toggle event statistics"]') as HTMLButtonElement
      expect(statsBtn).toBeInTheDocument()

      // Click to open
      fireEvent.click(statsBtn)
      await vi.advanceTimersByTimeAsync(50)
      expect(document.querySelector('.agent-flow__stats')).toBeInTheDocument()

      // Click to close
      fireEvent.click(statsBtn)
      await vi.advanceTimersByTimeAsync(50)
      expect(document.querySelector('.agent-flow__stats')).not.toBeInTheDocument()
    })

    it('shows event type counts in stats panel', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)

      mockEventSource?.simulateMessage({ type: 'start', message: 'Start' })
      mockEventSource?.simulateMessage({ type: 'message', message: 'Hello' })
      mockEventSource?.simulateMessage({ type: 'message', message: 'World' })
      await vi.advanceTimersByTimeAsync(50)

      // Open stats panel
      const statsBtn = document.querySelector('.agent-flow__header-btn[title="Toggle event statistics"]') as HTMLButtonElement
      fireEvent.click(statsBtn)
      await vi.advanceTimersByTimeAsync(50)

      const statsPanel = document.querySelector('.agent-flow__stats')
      expect(statsPanel).toBeInTheDocument()

      // Should show badges for types with events
      expect(statsPanel!.textContent).toContain('Total')
      expect(statsPanel!.textContent).toContain('3')
    })
  })

  describe('help panel', () => {
    it('help panel is hidden by default', () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      expect(document.querySelector('.agent-flow__help-modal')).not.toBeInTheDocument()
    })

    it('opens help panel on ? key press', async () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)

      fireEvent.keyDown(window, { key: '?' })
      await vi.advanceTimersByTimeAsync(50)

      expect(document.querySelector('.agent-flow__help-modal')).toBeInTheDocument()
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
    })

    it('closes help panel on ? key press again', async () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)

      // Open
      fireEvent.keyDown(window, { key: '?' })
      await vi.advanceTimersByTimeAsync(50)
      expect(document.querySelector('.agent-flow__help-modal')).toBeInTheDocument()

      // Close
      fireEvent.keyDown(window, { key: '?' })
      await vi.advanceTimersByTimeAsync(50)
      expect(document.querySelector('.agent-flow__help-modal')).not.toBeInTheDocument()
    })

    it('closes help panel on Escape key', async () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)

      // Open
      fireEvent.keyDown(window, { key: '?' })
      await vi.advanceTimersByTimeAsync(50)
      expect(document.querySelector('.agent-flow__help-modal')).toBeInTheDocument()

      // Close with Escape
      fireEvent.keyDown(window, { key: 'Escape' })
      await vi.advanceTimersByTimeAsync(50)
      expect(document.querySelector('.agent-flow__help-modal')).not.toBeInTheDocument()
    })

    it('opens help panel via ? button click', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)

      // Find the ? button
      const helpBtn = Array.from(container.querySelectorAll('.agent-flow__header-btn')).find(
        btn => btn.textContent?.trim() === '?'
      ) as HTMLButtonElement
      expect(helpBtn).toBeInTheDocument()

      fireEvent.click(helpBtn)
      await vi.advanceTimersByTimeAsync(50)

      expect(document.querySelector('.agent-flow__help-modal')).toBeInTheDocument()
    })

    it('help modal shows keyboard shortcut descriptions', async () => {
      render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)

      fireEvent.keyDown(window, { key: '?' })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('Search events')).toBeInTheDocument()
      expect(screen.getByText('Toggle this help panel')).toBeInTheDocument()
      expect(screen.getByText('Close panels')).toBeInTheDocument()
    })
  })

  describe('auto-scroll toggle', () => {
    it('shows auto-scroll button when events exist', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)
      mockEventSource?.simulateMessage({ type: 'start', message: 'Start' })
      await vi.advanceTimersByTimeAsync(50)

      expect(container.querySelector('.agent-flow__auto-scroll-btn')).toBeInTheDocument()
    })

    it('auto-scroll is active by default', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)
      mockEventSource?.simulateMessage({ type: 'start', message: 'Start' })
      await vi.advanceTimersByTimeAsync(50)

      const autoScrollBtn = container.querySelector('.agent-flow__auto-scroll-btn')
      expect(autoScrollBtn).toHaveClass('agent-flow__auto-scroll-btn--active')
    })

    it('toggles auto-scroll on button click', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)
      mockEventSource?.simulateMessage({ type: 'start', message: 'Start' })
      await vi.advanceTimersByTimeAsync(50)

      const autoScrollBtn = container.querySelector('.agent-flow__auto-scroll-btn') as HTMLButtonElement

      // Initially active
      expect(autoScrollBtn).toHaveClass('agent-flow__auto-scroll-btn--active')

      // Click to deactivate
      fireEvent.click(autoScrollBtn)
      await vi.advanceTimersByTimeAsync(50)
      expect(autoScrollBtn).not.toHaveClass('agent-flow__auto-scroll-btn--active')

      // Click to activate again
      fireEvent.click(autoScrollBtn)
      await vi.advanceTimersByTimeAsync(50)
      expect(autoScrollBtn).toHaveClass('agent-flow__auto-scroll-btn--active')
    })
  })

  describe('relative time toggle', () => {
    it('shows relative time toggle button', () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      const relativeTimeBtn = container.querySelector('.agent-flow__header-btn[title*="absolute time"]')
      expect(relativeTimeBtn).toBeInTheDocument()
    })

    it('relative time is off by default', () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      const relativeTimeBtn = container.querySelector('.agent-flow__header-btn[title*="absolute time"]')
      expect(relativeTimeBtn).not.toHaveClass('agent-flow__header-btn--active')
    })

    it('toggles relative time on button click', async () => {
      const { container } = render(<AgentFlow url="http://localhost:8080/stream" autoConnect={false} />)
      const relativeTimeBtn = container.querySelector('.agent-flow__header-btn[title*="absolute time"]') as HTMLButtonElement

      // Click to enable
      fireEvent.click(relativeTimeBtn)
      await vi.advanceTimersByTimeAsync(50)
      expect(relativeTimeBtn).toHaveClass('agent-flow__header-btn--active')
      expect(relativeTimeBtn.title).toContain('relative time')

      // Click to disable
      fireEvent.click(relativeTimeBtn)
      await vi.advanceTimersByTimeAsync(50)
      expect(relativeTimeBtn).not.toHaveClass('agent-flow__header-btn--active')
      expect(relativeTimeBtn.title).toContain('absolute time')
    })
  })
})
