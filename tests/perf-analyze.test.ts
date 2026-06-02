import { describe, it, expect } from 'vitest'
import { analyzePerformance } from '../src/perf-analyze'
import type { FlowEvent } from '../src/types'

function makeEvent(overrides: Partial<FlowEvent> = {}): FlowEvent {
  return {
    id: 0,
    type: 'message',
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('analyzePerformance', () => {
  it('returns empty findings for an empty event list', () => {
    const result = analyzePerformance([])
    expect(result.findings).toEqual([])
    expect(result.totalEvents).toBe(0)
    expect(result.analyzedAt).toBeGreaterThan(0)
  })

  it('returns empty findings when no bottlenecks exist', () => {
    const events = [
      makeEvent({ id: 1, type: 'start', message: 'Started' }),
      makeEvent({ id: 2, type: 'message', message: 'Hello' }),
      makeEvent({ id: 3, type: 'end', message: 'Done' }),
    ]
    const result = analyzePerformance(events)
    expect(result.findings).toEqual([])
    expect(result.totalEvents).toBe(3)
  })

  // --- Slow tool calls ---

  it('detects slow tool calls exceeding threshold', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call', tool: 'search', duration: 5000 }),
      makeEvent({ id: 2, type: 'tool_call', tool: 'write', duration: 1000 }),
    ]
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'slow_tool')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('warning')
    expect(finding!.description).toContain('1 tool call(s)')
    expect(finding!.description).toContain('3000ms')
    expect(finding!.relatedEventIds).toContain(1)
  })

  it('uses error severity for many slow tool calls', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: i, type: 'tool_call', tool: 'slow_op', duration: 4000 }),
    )
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'slow_tool')
    expect(finding!.severity).toBe('error')
  })

  it('respects custom slowToolThreshold', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call', tool: 'fast', duration: 500 }),
    ]
    const result = analyzePerformance(events, { slowToolThreshold: 100 })
    const finding = result.findings.find(f => f.category === 'slow_tool')
    expect(finding).toBeDefined()
  })

  // --- High-cost events ---

  it('detects high-cost events', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call', cost: 0.05 }),
      makeEvent({ id: 2, type: 'message', cost: 0.001 }),
    ]
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'high_cost')
    expect(finding).toBeDefined()
    expect(finding!.description).toContain('1 event(s)')
    expect(finding!.relatedEventIds).toContain(1)
  })

  it('uses error severity for very high total cost', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      makeEvent({ id: i, type: 'tool_call', cost: 0.02 }),
    )
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'high_cost')
    expect(finding!.severity).toBe('error') // total = 0.2 > 0.1
  })

  // --- Error rate ---

  it('detects high error rate', () => {
    const events = [
      makeEvent({ id: 1, type: 'error', message: 'Fail 1' }),
      makeEvent({ id: 2, type: 'error', message: 'Fail 2' }),
      makeEvent({ id: 3, type: 'message', message: 'OK' }),
      makeEvent({ id: 4, type: 'message', message: 'OK' }),
    ]
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'error_rate')
    expect(finding).toBeDefined()
    expect(finding!.description).toContain('50.0%')
  })

  it('does not flag normal error rate', () => {
    const events = [
      makeEvent({ id: 1, type: 'error', message: 'Fail' }),
      ...Array.from({ length: 20 }, (_, i) =>
        makeEvent({ id: i + 2, type: 'message', message: 'OK' }),
      ),
    ]
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'error_rate')
    expect(finding).toBeUndefined()
  })

  // --- Long thinking ---

  it('detects long thinking times', () => {
    const events = [
      makeEvent({ id: 1, type: 'thinking', duration: 15000, message: 'Deep thought' }),
    ]
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'long_thinking')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('info')
  })

  it('uses warning severity for many long thinking steps', () => {
    const events = Array.from({ length: 3 }, (_, i) =>
      makeEvent({ id: i, type: 'thinking', duration: 12000 }),
    )
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'long_thinking')
    expect(finding!.severity).toBe('warning')
  })

  // --- Low efficiency ---

  it('detects low token efficiency', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call', cost: 0.1, tokens: 100 }), // $0.001/token > threshold
    ]
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'low_efficiency')
    expect(finding).toBeDefined()
  })

  it('does not flag efficient events', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call', cost: 0.001, tokens: 10000 }), // $0.0000001/token
    ]
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'low_efficiency')
    expect(finding).toBeUndefined()
  })

  // --- Sorting ---

  it('sorts findings by severity (error > warning > info)', () => {
    const events = [
      makeEvent({ id: 1, type: 'thinking', duration: 15000 }), // info
      makeEvent({ id: 2, type: 'error', message: 'fail' }),     // potential error_rate
      makeEvent({ id: 3, type: 'tool_call', tool: 'x', duration: 5000 }), // warning
      makeEvent({ id: 4, type: 'message', message: 'ok' }),
    ]
    const result = analyzePerformance(events)
    if (result.findings.length >= 2) {
      for (let i = 1; i < result.findings.length; i++) {
        const prev = result.findings[i - 1].severity
        const curr = result.findings[i].severity
        const order: Record<string, number> = { error: 0, warning: 1, info: 2 }
        expect(order[prev]).toBeLessThanOrEqual(order[curr])
      }
    }
  })

  // --- Suggestions ---

  it('includes suggestions for findings', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call', tool: 'slow', duration: 5000 }),
    ]
    const result = analyzePerformance(events)
    const finding = result.findings.find(f => f.category === 'slow_tool')
    expect(finding!.suggestion).toBeDefined()
    expect(finding!.suggestion!.length).toBeGreaterThan(0)
  })
})
