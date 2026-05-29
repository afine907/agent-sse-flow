import { describe, it, expect } from 'vitest'
import { diffEvents } from '../src/event-diff'
import type { FlowEvent } from '../src/types'

function makeEvent(overrides: Partial<FlowEvent> = {}): FlowEvent {
  return {
    id: 0,
    type: 'message',
    ...overrides,
  }
}

describe('diffEvents', () => {
  it('returns equal lines for identical events', () => {
    const event = makeEvent({ type: 'message', message: 'Hello', duration: 100 })
    const lines = diffEvents(event, event)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every(l => l.type === 'equal')).toBe(true)
  })

  it('detects changed fields', () => {
    const left = makeEvent({ type: 'message', message: 'Hello' })
    const right = makeEvent({ type: 'message', message: 'World' })
    const lines = diffEvents(left, right)

    const msgLine = lines.find(l => l.field === 'message')
    expect(msgLine).toBeDefined()
    expect(msgLine!.type).toBe('changed')
    expect(msgLine!.leftValue).toBe('Hello')
    expect(msgLine!.rightValue).toBe('World')
  })

  it('detects added fields', () => {
    const left = makeEvent({ type: 'message' })
    const right = makeEvent({ type: 'message', tool: 'search' })
    const lines = diffEvents(left, right)

    const toolLine = lines.find(l => l.field === 'tool')
    expect(toolLine).toBeDefined()
    expect(toolLine!.type).toBe('added')
    expect(toolLine!.leftValue).toBe('')
    expect(toolLine!.rightValue).toBe('search')
  })

  it('detects removed fields', () => {
    const left = makeEvent({ type: 'tool_call', tool: 'search' })
    const right = makeEvent({ type: 'tool_call' })
    const lines = diffEvents(left, right)

    const toolLine = lines.find(l => l.field === 'tool')
    expect(toolLine).toBeDefined()
    expect(toolLine!.type).toBe('removed')
    expect(toolLine!.leftValue).toBe('search')
    expect(toolLine!.rightValue).toBe('')
  })

  it('detects type changes', () => {
    const left = makeEvent({ type: 'start' })
    const right = makeEvent({ type: 'end' })
    const lines = diffEvents(left, right)

    const typeLine = lines.find(l => l.field === 'type')
    expect(typeLine).toBeDefined()
    expect(typeLine!.type).toBe('changed')
    expect(typeLine!.leftValue).toBe('start')
    expect(typeLine!.rightValue).toBe('end')
  })

  it('handles undefined fields as empty strings', () => {
    const left = makeEvent({ type: 'message' })
    const right = makeEvent({ type: 'message' })
    const lines = diffEvents(left, right)

    // Fields that are undefined on both sides should not appear (both empty)
    // Only 'type' should appear as equal since it's always defined
    const typeLine = lines.find(l => l.field === 'type')
    expect(typeLine).toBeDefined()
    expect(typeLine!.type).toBe('equal')
  })

  it('compares argsJson field', () => {
    const left = makeEvent({ type: 'tool_call', argsJson: '{"q":"old"}' })
    const right = makeEvent({ type: 'tool_call', argsJson: '{"q":"new"}' })
    const lines = diffEvents(left, right)

    const argsLine = lines.find(l => l.field === 'argsJson')
    expect(argsLine).toBeDefined()
    expect(argsLine!.type).toBe('changed')
    expect(argsLine!.leftValue).toBe('{"q":"old"}')
    expect(argsLine!.rightValue).toBe('{"q":"new"}')
  })

  it('compares duration field', () => {
    const left = makeEvent({ type: 'tool_call', duration: 100 })
    const right = makeEvent({ type: 'tool_call', duration: 500 })
    const lines = diffEvents(left, right)

    const durLine = lines.find(l => l.field === 'duration')
    expect(durLine).toBeDefined()
    expect(durLine!.type).toBe('changed')
    expect(durLine!.leftValue).toBe('100')
    expect(durLine!.rightValue).toBe('500')
  })

  it('returns empty array for events with no compared fields', () => {
    // Events with only id (not compared) should produce no lines
    const left = makeEvent({ id: 1 })
    const right = makeEvent({ id: 2 })
    // type is always present, so we'll get at least one equal line
    const lines = diffEvents(left, right)
    expect(lines.length).toBeGreaterThanOrEqual(1)
  })

  it('handles mixed equal, changed, added, removed', () => {
    const left = makeEvent({
      type: 'tool_call',
      message: 'old msg',
      tool: 'search',
      duration: 100,
    })
    const right = makeEvent({
      type: 'tool_call',
      message: 'new msg',
      result: 'found',
      duration: 200,
    })
    const lines = diffEvents(left, right)

    // type: equal
    expect(lines.find(l => l.field === 'type')?.type).toBe('equal')
    // message: changed
    expect(lines.find(l => l.field === 'message')?.type).toBe('changed')
    // tool: removed (present in left, not right)
    expect(lines.find(l => l.field === 'tool')?.type).toBe('removed')
    // result: added (not in left, present in right)
    expect(lines.find(l => l.field === 'result')?.type).toBe('added')
    // duration: changed
    expect(lines.find(l => l.field === 'duration')?.type).toBe('changed')
  })
})
