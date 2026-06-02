import { describe, it, expect } from 'vitest'
import { clusterEvents, getClusterColor } from '../src/event-cluster'
import type { FlowEvent } from '../src/types'

function makeEvent(overrides: Partial<FlowEvent> = {}): FlowEvent {
  return {
    id: 0,
    type: 'message',
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('clusterEvents', () => {
  it('returns empty array for empty input', () => {
    expect(clusterEvents([])).toEqual([])
  })

  it('clusters events by type', () => {
    const events = [
      makeEvent({ id: 1, type: 'message', message: 'a' }),
      makeEvent({ id: 2, type: 'message', message: 'b' }),
      makeEvent({ id: 3, type: 'error', message: 'c' }),
    ]
    const clusters = clusterEvents(events)
    expect(clusters).toHaveLength(2)

    const msgCluster = clusters.find(c => c.key === 'type:message')
    expect(msgCluster).toBeDefined()
    expect(msgCluster!.count).toBe(2)
    expect(msgCluster!.label).toBe('message')

    const errCluster = clusters.find(c => c.key === 'type:error')
    expect(errCluster).toBeDefined()
    expect(errCluster!.count).toBe(1)
  })

  it('clusters tool_call events by tool name', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call', tool: 'search' }),
      makeEvent({ id: 2, type: 'tool_call', tool: 'search' }),
      makeEvent({ id: 3, type: 'tool_call', tool: 'write' }),
    ]
    const clusters = clusterEvents(events)
    expect(clusters).toHaveLength(2)

    const searchCluster = clusters.find(c => c.key === 'tool:search')
    expect(searchCluster).toBeDefined()
    expect(searchCluster!.count).toBe(2)
    expect(searchCluster!.label).toBe('search')

    const writeCluster = clusters.find(c => c.key === 'tool:write')
    expect(writeCluster).toBeDefined()
    expect(writeCluster!.count).toBe(1)
  })

  it('sorts clusters by count (descending)', () => {
    const events = [
      makeEvent({ id: 1, type: 'error' }),
      makeEvent({ id: 2, type: 'message' }),
      makeEvent({ id: 3, type: 'message' }),
      makeEvent({ id: 4, type: 'message' }),
    ]
    const clusters = clusterEvents(events)
    expect(clusters[0].key).toBe('type:message')
    expect(clusters[0].count).toBe(3)
    expect(clusters[1].key).toBe('type:error')
    expect(clusters[1].count).toBe(1)
  })

  it('computes average duration', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call', tool: 'fast', duration: 100 }),
      makeEvent({ id: 2, type: 'tool_call', tool: 'fast', duration: 300 }),
    ]
    const clusters = clusterEvents(events)
    const cluster = clusters.find(c => c.key === 'tool:fast')
    expect(cluster!.avgDuration).toBe(200)
  })

  it('returns undefined avgDuration when no events have duration', () => {
    const events = [
      makeEvent({ id: 1, type: 'message', message: 'a' }),
      makeEvent({ id: 2, type: 'message', message: 'b' }),
    ]
    const clusters = clusterEvents(events)
    expect(clusters[0].avgDuration).toBeUndefined()
  })

  it('computes totalCost', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call', tool: 'expensive', cost: 0.05 }),
      makeEvent({ id: 2, type: 'tool_call', tool: 'expensive', cost: 0.03 }),
    ]
    const clusters = clusterEvents(events)
    const cluster = clusters.find(c => c.key === 'tool:expensive')
    expect(cluster!.totalCost).toBeCloseTo(0.08)
  })

  it('returns undefined totalCost when no events have cost', () => {
    const events = [
      makeEvent({ id: 1, type: 'message' }),
    ]
    const clusters = clusterEvents(events)
    expect(clusters[0].totalCost).toBeUndefined()
  })

  it('computes totalTokens', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call', tool: 'llm', tokens: 500 }),
      makeEvent({ id: 2, type: 'tool_call', tool: 'llm', tokens: 300 }),
    ]
    const clusters = clusterEvents(events)
    const cluster = clusters.find(c => c.key === 'tool:llm')
    expect(cluster!.totalTokens).toBe(800)
  })

  it('sets expanded to false by default', () => {
    const events = [
      makeEvent({ id: 1, type: 'message' }),
    ]
    const clusters = clusterEvents(events)
    expect(clusters[0].expanded).toBe(false)
  })

  it('includes all events in the cluster', () => {
    const events = [
      makeEvent({ id: 1, type: 'message', message: 'a' }),
      makeEvent({ id: 2, type: 'message', message: 'b' }),
    ]
    const clusters = clusterEvents(events)
    expect(clusters[0].events).toHaveLength(2)
    expect(clusters[0].events[0].id).toBe(1)
    expect(clusters[0].events[1].id).toBe(2)
  })

  it('handles tool_call without tool name as type cluster', () => {
    const events = [
      makeEvent({ id: 1, type: 'tool_call' }), // no tool name
    ]
    const clusters = clusterEvents(events)
    expect(clusters[0].key).toBe('type:tool_call')
  })
})

describe('getClusterColor', () => {
  it('returns amber for tool clusters', () => {
    expect(getClusterColor('tool:search')).toBe('#f59e0b')
    expect(getClusterColor('tool:write')).toBe('#f59e0b')
  })

  it('returns correct color for known event types', () => {
    expect(getClusterColor('type:start')).toBe('#3b82f6')
    expect(getClusterColor('type:thinking')).toBe('#8b5cf6')
    expect(getClusterColor('type:tool_call')).toBe('#f59e0b')
    expect(getClusterColor('type:tool_result')).toBe('#10b981')
    expect(getClusterColor('type:message')).toBe('#06b6d4')
    expect(getClusterColor('type:error')).toBe('#ef4444')
    expect(getClusterColor('type:end')).toBe('#10b981')
  })

  it('returns default color for unknown keys', () => {
    expect(getClusterColor('type:unknown')).toBe('#6e8bfa')
    expect(getClusterColor('random')).toBe('#6e8bfa')
  })
})
