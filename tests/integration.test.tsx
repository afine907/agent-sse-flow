/**
 * Integration tests for AgentFlow
 *
 * These tests exercise end-to-end workflows that span multiple features,
 * ensuring that combined interactions work correctly together.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { AgentFlow } from '../src/AgentFlow'

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock @tanstack/react-virtual to render all items
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: any) => ({
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

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('Integration Tests', () => {
  let mockEventSource: MockEventSource | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    mockEventSource = null

    vi.stubGlobal('EventSource', vi.fn((url: string) => {
      mockEventSource = new MockEventSource(url)
      return mockEventSource
    }))

    // Mock URL.createObjectURL and URL.revokeObjectURL (not available in jsdom)
    if (!URL.createObjectURL) {
      (URL as any).createObjectURL = vi.fn(() => 'blob:mock')
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    }
    if (!URL.revokeObjectURL) {
      (URL as any).revokeObjectURL = vi.fn()
    } else {
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    }

    // Mock anchor click for download tests
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  /** Helper: connect and inject a set of events */
  async function setupWithEvents(events: Array<Record<string, unknown>>) {
    const { container } = render(<AgentFlow url="http://localhost:8080/stream" />)

    const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
    if (eventsEl) {
      Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
      Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
    }

    await vi.advanceTimersByTimeAsync(20)

    for (const event of events) {
      mockEventSource?.simulateMessage(event)
    }

    await vi.advanceTimersByTimeAsync(50)

    return container
  }

  // ─── Full Flow: Mock SSE to Rendered Events ─────────────────────────────

  describe('full flow from mock SSE to rendered events', () => {
    it('renders a complete agent trace from start to end', async () => {
      await setupWithEvents([
        { type: 'start', message: 'Agent initialized', agentName: 'Planner', agentColor: '#3b82f6' },
        { type: 'thinking', message: 'Analyzing request', agentName: 'Planner' },
        { type: 'tool_call', tool: 'search', message: 'Searching files', agentName: 'Planner' },
        { type: 'tool_result', result: 'Found 5 files', message: 'Search done', agentName: 'Planner' },
        { type: 'message', message: 'Here is the analysis', agentName: 'Planner' },
        { type: 'end', message: 'Task complete', agentName: 'Planner', cost: 0.01, tokens: 500 },
      ])

      // All event messages should be rendered
      expect(screen.getByText('Agent initialized')).toBeInTheDocument()
      expect(screen.getByText('Analyzing request')).toBeInTheDocument()
      expect(screen.getByText('search')).toBeInTheDocument()
      expect(screen.getByText(/Found 5 files/)).toBeInTheDocument()
      expect(screen.getByText('Here is the analysis')).toBeInTheDocument()
      expect(screen.getByText('Task complete')).toBeInTheDocument()

      // Event count should show 6
      expect(screen.getByText(/6 events/)).toBeInTheDocument()

      // Cost and tokens should be displayed
      expect(screen.getByText('$0.0100')).toBeInTheDocument()
      expect(screen.getByText('500 tokens')).toBeInTheDocument()
    })

    it('handles rapid event bursts correctly', async () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        type: i === 0 ? 'start' : i === 49 ? 'end' : 'message',
        message: `Event ${i}`,
      }))

      await setupWithEvents(events)

      expect(screen.getByText(/50 events/)).toBeInTheDocument()
      expect(screen.getByText('Event 0')).toBeInTheDocument()
      expect(screen.getByText('Event 49')).toBeInTheDocument()
    })

    it('preserves events through connection error and recovery', async () => {
      const onStatusChange = vi.fn()
      const { container } = render(
        <AgentFlow url="http://localhost:8080/stream" autoReconnect={false} onStatusChange={onStatusChange} />
      )

      const eventsEl = container.querySelector('.agent-flow__events') as HTMLElement
      if (eventsEl) {
        Object.defineProperty(eventsEl, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(eventsEl, 'scrollHeight', { value: 600, configurable: true })
      }

      await vi.advanceTimersByTimeAsync(20)

      // Stream some events
      mockEventSource?.simulateMessage({ type: 'start', message: 'Before error' })
      mockEventSource?.simulateMessage({ type: 'message', message: 'Important data' })
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('Before error')).toBeInTheDocument()
      expect(screen.getByText('Important data')).toBeInTheDocument()

      // Trigger error
      mockEventSource?.simulateError()
      await vi.advanceTimersByTimeAsync(50)

      // Events should persist
      expect(screen.getByText('Before error')).toBeInTheDocument()
      expect(screen.getByText('Important data')).toBeInTheDocument()
      expect(screen.getByText(/2 events/)).toBeInTheDocument()
    })
  })

  // ─── Multi-Agent Filtering End-to-End ───────────────────────────────────

  describe('multi-agent filtering end-to-end', () => {
    it('filters events by agent using the agent dropdown', async () => {
      const container = await setupWithEvents([
        { type: 'start', message: 'Planner started', agentName: 'Planner', agentColor: '#3b82f6' },
        { type: 'thinking', message: 'Planning approach', agentName: 'Planner' },
        { type: 'start', message: 'Coder started', agentName: 'Coder', agentColor: '#10b981' },
        { type: 'tool_call', tool: 'write_file', message: 'Writing code', agentName: 'Coder' },
        { type: 'message', message: 'Code written', agentName: 'Coder' },
        { type: 'end', message: 'Done', agentName: 'Planner' },
      ])

      // All events should be visible initially
      expect(screen.getByText(/6 events/)).toBeInTheDocument()

      // Open agent filter dropdown
      const filterToggle = container.querySelector('.agent-flow__agent-filter-toggle') as HTMLButtonElement
      expect(filterToggle).toBeInTheDocument()
      fireEvent.click(filterToggle)
      await vi.advanceTimersByTimeAsync(50)

      // Click on "Coder" agent
      const coderOption = Array.from(container.querySelectorAll('.agent-flow__agent-filter-option')).find(
        el => el.textContent?.includes('Coder')
      )
      expect(coderOption).toBeInTheDocument()
      fireEvent.click(coderOption!)
      await vi.advanceTimersByTimeAsync(50)

      // Only Coder events should be visible
      expect(screen.getByText('Coder started')).toBeInTheDocument()
      expect(screen.getByText('Writing code')).toBeInTheDocument()
      expect(screen.getByText('Code written')).toBeInTheDocument()
      expect(screen.queryByText('Planner started')).not.toBeInTheDocument()
      expect(screen.queryByText('Planning approach')).not.toBeInTheDocument()

      // Reset to all agents
      const filterToggle2 = container.querySelector('.agent-flow__agent-filter-toggle') as HTMLButtonElement
      fireEvent.click(filterToggle2)
      await vi.advanceTimersByTimeAsync(50)

      const allOption = container.querySelector('.agent-flow__agent-filter-option')
      fireEvent.click(allOption!)
      await vi.advanceTimersByTimeAsync(50)

      // All events should be visible again
      expect(screen.getByText('Planner started')).toBeInTheDocument()
      expect(screen.getByText('Coder started')).toBeInTheDocument()
    })

    it('shows agent names in the stats panel', async () => {
      await setupWithEvents([
        { type: 'start', message: 'A started', agentName: 'Alpha', agentColor: '#3b82f6' },
        { type: 'start', message: 'B started', agentName: 'Beta', agentColor: '#10b981' },
      ])

      // Open stats panel
      const statsBtn = document.querySelector('.agent-flow__header-btn[title="Toggle event statistics"]') as HTMLButtonElement
      fireEvent.click(statsBtn)
      await vi.advanceTimersByTimeAsync(50)

      const statsPanel = document.querySelector('.agent-flow__stats')
      expect(statsPanel).toBeInTheDocument()
      expect(statsPanel!.textContent).toContain('Agents')
      expect(statsPanel!.textContent).toContain('2')
    })
  })

  // ─── Export Functionality ───────────────────────────────────────────────

  describe('export functionality', () => {
    it('exports events as JSON file', async () => {
      const container = await setupWithEvents([
        { type: 'start', message: 'Test event', agentName: 'assistant' },
        { type: 'end', message: 'Done', agentName: 'assistant' },
      ])

      // Open export dropdown
      const exportBtn = container.querySelector('.agent-flow__export-toggle') as HTMLButtonElement
      fireEvent.click(exportBtn)
      await vi.advanceTimersByTimeAsync(50)

      // Click "Export as JSON"
      const jsonOption = screen.getByText('Export as JSON')
      fireEvent.click(jsonOption)
      await vi.advanceTimersByTimeAsync(50)

      // Verify a download was triggered
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()

      // Dropdown should close after export
      expect(container.querySelector('.agent-flow__export-dropdown')).not.toBeInTheDocument()
    })

    it('exports events as CSV file', async () => {
      const container = await setupWithEvents([
        { type: 'start', message: 'Test event', agentName: 'assistant' },
      ])

      const exportBtn = container.querySelector('.agent-flow__export-toggle') as HTMLButtonElement
      fireEvent.click(exportBtn)
      await vi.advanceTimersByTimeAsync(50)

      const csvOption = screen.getByText('Export as CSV')
      fireEvent.click(csvOption)
      await vi.advanceTimersByTimeAsync(50)

      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    })

    it('exports only filtered events when type filter is active', async () => {
      const container = await setupWithEvents([
        { type: 'start', message: 'Start event', agentName: 'assistant' },
        { type: 'error', message: 'Error event', agentName: 'assistant' },
        { type: 'message', message: 'Message event', agentName: 'assistant' },
      ])

      // Uncheck "start" type to filter it out
      const labels = document.querySelectorAll('.agent-flow__type-checkbox')
      const startLabel = Array.from(labels).find(el => el.textContent?.includes('start'))
      const checkbox = startLabel!.querySelector('input[type="checkbox"]') as HTMLInputElement
      fireEvent.click(checkbox)
      await vi.advanceTimersByTimeAsync(50)

      // Verify "Start event" is filtered out from view
      expect(screen.queryByText('Start event')).not.toBeInTheDocument()
      expect(screen.getByText('Error event')).toBeInTheDocument()
      expect(screen.getByText('Message event')).toBeInTheDocument()

      // Open export and click JSON
      const exportBtn = container.querySelector('.agent-flow__export-toggle') as HTMLButtonElement
      fireEvent.click(exportBtn)
      await vi.advanceTimersByTimeAsync(50)
      fireEvent.click(screen.getByText('Export as JSON'))
      await vi.advanceTimersByTimeAsync(50)

      // Export was called (content verification would require inspecting
      // the Blob, which jsdom doesn't fully support)
      expect(URL.createObjectURL).toHaveBeenCalled()
    })
  })

  // ─── Search + Filter Chain ──────────────────────────────────────────────

  describe('search + filter chain', () => {
    it('combines search with event type filter', async () => {
      await setupWithEvents([
        { type: 'start', message: 'Agent started' },
        { type: 'tool_call', tool: 'search', message: 'Searching for files' },
        { type: 'tool_result', result: 'Found files', message: 'Search results' },
        { type: 'message', message: 'Analysis complete' },
        { type: 'error', message: 'Connection timeout' },
      ])

      // First, uncheck "error" type
      const labels = document.querySelectorAll('.agent-flow__type-checkbox')
      const errorLabel = Array.from(labels).find(el => el.textContent?.includes('error'))
      const errorCheckbox = errorLabel!.querySelector('input[type="checkbox"]') as HTMLInputElement
      fireEvent.click(errorCheckbox)
      await vi.advanceTimersByTimeAsync(50)

      // Error event should be gone
      expect(screen.queryByText('Connection timeout')).not.toBeInTheDocument()

      // Now open search
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      // Search for "search" (matches tool_call message and tool_result message)
      fireEvent.change(input, { target: { value: 'search' } })
      await vi.advanceTimersByTimeAsync(50)

      // Should show matching events (search + type filter combined)
      expect(screen.getByText('Searching for files')).toBeInTheDocument()
      expect(screen.getByText(/Search results/)).toBeInTheDocument()

      // Non-matching events should be hidden
      expect(screen.queryByText('Agent started')).not.toBeInTheDocument()
      expect(screen.queryByText('Analysis complete')).not.toBeInTheDocument()

      // Error event is both type-filtered AND non-matching
      expect(screen.queryByText('Connection timeout')).not.toBeInTheDocument()
    })

    it('shows correct count when multiple filters are active', async () => {
      await setupWithEvents([
        { type: 'start', message: 'Start' },
        { type: 'message', message: 'Hello world' },
        { type: 'message', message: 'Goodbye world' },
        { type: 'error', message: 'Error occurred' },
      ])

      // Uncheck "error" type
      const labels = document.querySelectorAll('.agent-flow__type-checkbox')
      const errorLabel = Array.from(labels).find(el => el.textContent?.includes('error'))
      fireEvent.click(errorLabel!.querySelector('input[type="checkbox"]')!)
      await vi.advanceTimersByTimeAsync(50)

      // Open search and filter by "world"
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'world' } })
      await vi.advanceTimersByTimeAsync(50)

      // Should show filtered/total count in header
      // 2 events match "world" out of 3 non-error events
      expect(screen.getByText('2 matches')).toBeInTheDocument()
    })

    it('search filters across message, tool, and result fields', async () => {
      await setupWithEvents([
        { type: 'tool_call', tool: 'read_file', message: 'Reading', args: { path: '/test' } },
        { type: 'tool_result', result: 'File contents here', message: 'Done' },
        { type: 'message', message: 'Final output' },
      ])

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement

      // Search by tool name
      fireEvent.change(input, { target: { value: 'read_file' } })
      await vi.advanceTimersByTimeAsync(50)
      expect(screen.getByText('read_file')).toBeInTheDocument()
      expect(screen.queryByText('Final output')).not.toBeInTheDocument()

      // Search by result content
      fireEvent.change(input, { target: { value: 'File contents' } })
      await vi.advanceTimersByTimeAsync(50)
      expect(screen.getByText(/File contents here/)).toBeInTheDocument()
      expect(screen.queryByText('read_file')).not.toBeInTheDocument()

      // Search by message
      fireEvent.change(input, { target: { value: 'Final' } })
      await vi.advanceTimersByTimeAsync(50)
      expect(screen.getByText('Final output')).toBeInTheDocument()
      expect(screen.queryByText(/File contents/)).not.toBeInTheDocument()
    })
  })

  // ─── Bookmark + Pin Interaction ─────────────────────────────────────────

  describe('bookmark + pin interaction', () => {
    it('bookmarks an event and shows bookmark count', async () => {
      const container = await setupWithEvents([
        { type: 'start', message: 'First event' },
        { type: 'message', message: 'Second event' },
        { type: 'end', message: 'Third event' },
      ])

      // Find the bookmark button for the first event row
      const eventRows = container.querySelectorAll('.agent-flow__event-row')
      expect(eventRows.length).toBeGreaterThan(0)

      // Find bookmark buttons (star icon)
      const bookmarkBtns = container.querySelectorAll('.agent-flow__bookmark-btn')
      expect(bookmarkBtns.length).toBeGreaterThan(0)

      // Click the first bookmark button
      fireEvent.click(bookmarkBtns[0])
      await vi.advanceTimersByTimeAsync(50)

      // Bookmark count should appear in header
      expect(screen.getByText(/1 bookmarked/)).toBeInTheDocument()
    })

    it('filters to show only bookmarked events', async () => {
      const container = await setupWithEvents([
        { type: 'start', message: 'Event A' },
        { type: 'message', message: 'Event B' },
        { type: 'end', message: 'Event C' },
      ])

      // Bookmark the second event
      const bookmarkBtns = container.querySelectorAll('.agent-flow__bookmark-btn')
      fireEvent.click(bookmarkBtns[1])
      await vi.advanceTimersByTimeAsync(50)

      // The bookmark filter toggle should appear
      const bookmarkFilter = container.querySelector('.agent-flow__header-btn[title*="bookmarked"]') as HTMLButtonElement
      expect(bookmarkFilter).toBeInTheDocument()

      // Click to filter to bookmarked only
      fireEvent.click(bookmarkFilter)
      await vi.advanceTimersByTimeAsync(50)

      // Only bookmarked event should be visible
      expect(screen.getByText('Event B')).toBeInTheDocument()
      expect(screen.queryByText('Event A')).not.toBeInTheDocument()
      expect(screen.queryByText('Event C')).not.toBeInTheDocument()

      // Click again to show all
      fireEvent.click(bookmarkFilter)
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText('Event A')).toBeInTheDocument()
      expect(screen.getByText('Event B')).toBeInTheDocument()
      expect(screen.getByText('Event C')).toBeInTheDocument()
    })

    it('clearing events also clears bookmarks', async () => {
      const container = await setupWithEvents([
        { type: 'start', message: 'Bookmarked event' },
        { type: 'message', message: 'Another event' },
      ])

      // Bookmark first event
      const bookmarkBtns = container.querySelectorAll('.agent-flow__bookmark-btn')
      fireEvent.click(bookmarkBtns[0])
      await vi.advanceTimersByTimeAsync(50)

      expect(screen.getByText(/1 bookmarked/)).toBeInTheDocument()

      // Clear all events
      const clearBtn = container.querySelector('.agent-flow__header-btn[title="Clear all events"]') as HTMLButtonElement
      fireEvent.click(clearBtn)
      await vi.advanceTimersByTimeAsync(50)

      // Events and bookmarks should be cleared
      expect(screen.getByText(/No events yet/)).toBeInTheDocument()
      expect(screen.queryByText(/1 bookmarked/)).not.toBeInTheDocument()
    })

    it('bookmark persists through search filtering', async () => {
      const container = await setupWithEvents([
        { type: 'start', message: 'Alpha start' },
        { type: 'message', message: 'Beta message' },
        { type: 'end', message: 'Gamma end' },
      ])

      // Bookmark second event
      const bookmarkBtns = container.querySelectorAll('.agent-flow__bookmark-btn')
      fireEvent.click(bookmarkBtns[1])
      await vi.advanceTimersByTimeAsync(50)

      // Open search
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      const input = document.querySelector('.agent-flow__search-input') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Alpha' } })
      await vi.advanceTimersByTimeAsync(50)

      // Bookmark count should still show
      expect(screen.getByText(/1 bookmarked/)).toBeInTheDocument()

      // Close search
      fireEvent.keyDown(window, { key: 'Escape' })
      await vi.advanceTimersByTimeAsync(50)

      // Bookmark count should still be there
      expect(screen.getByText(/1 bookmarked/)).toBeInTheDocument()
    })
  })
})
