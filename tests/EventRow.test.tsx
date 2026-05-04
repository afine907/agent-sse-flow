import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { EventRow } from '../src/AgentFlow'
import type { FlowEvent } from '../src/AgentFlow'

describe('EventRow', () => {
  const mockEvent: FlowEvent = {
    id: 1,
    type: 'tool_call',
    tool: 'read_file',
    args: { path: '/test/file.ts' },
    argsJson: '{\n  "path": "/test/file.ts"\n}',
    timestamp: 1714560000000,
  }

  beforeEach(() => {
    cleanup()
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
  })

  it('renders event type', () => {
    render(<EventRow event={mockEvent} />)
    expect(screen.getByText('tool_call')).toBeInTheDocument()
  })

  it('renders tool name', () => {
    render(<EventRow event={mockEvent} />)
    expect(screen.getByText('read_file')).toBeInTheDocument()
  })

  it('renders timestamp', () => {
    render(<EventRow event={mockEvent} />)
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument()
  })

  it('toggles args visibility', () => {
    render(<EventRow event={mockEvent} showArgs={true} onToggleArgs={() => {}} />)
    
    // Args should be visible initially
    expect(screen.getByText(/"path"/)).toBeInTheDocument()
    
    // Find toggle button
    const toggleBtn = screen.getByRole('button', { name: /args/i })
    expect(toggleBtn).toBeInTheDocument()
  })

  it('copies args to clipboard', async () => {
    render(<EventRow event={mockEvent} showArgs={true} onToggleArgs={() => {}} />)

    const copyBtn = screen.getAllByTitle('Copy')[0]
    fireEvent.click(copyBtn)

    // In jsdom, isSecureContext is false so code falls back to document.execCommand
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('renders message content', () => {
    const eventWithMessage: FlowEvent = {
      ...mockEvent,
      message: 'Test message',
    }
    render(<EventRow event={eventWithMessage} />)
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('renders result content', () => {
    const eventWithResult: FlowEvent = {
      ...mockEvent,
      type: 'tool_result',
      result: 'File content here',
    }
    render(<EventRow event={eventWithResult} />)
    expect(screen.getByText(/File content here/)).toBeInTheDocument()
  })

  it('applies correct CSS class for event type', () => {
    const { container } = render(<EventRow event={mockEvent} />)
    expect(container.firstChild).toHaveClass('agent-flow__event--tool_call')
  })
})
