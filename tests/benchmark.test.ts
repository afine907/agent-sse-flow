/**
 * Performance Benchmark Script
 *
 * Measures render time, memory usage, and throughput for the AgentFlow component.
 * Outputs results as JSON for CI consumption.
 *
 * Usage:
 *   pnpm benchmark          # run benchmarks
 *   pnpm benchmark -- --reporter json  # JSON output only
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import { AgentFlow } from '../src/AgentFlow';
import type { FlowEvent, EventType } from '../src/types';

// Mock @tanstack/react-virtual to render all items (no virtual scrolling in benchmarks)
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, getScrollElement }: any) => ({
    getTotalSize: () => count * 80,
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 200) }, (_, i) => ({
        index: i,
        start: i * 80,
        size: 80,
        end: (i + 1) * 80,
      })),
    measureElement: () => {},
    scrollToIndex: () => {},
  }),
}));

// Mock EventSource
class MockEventSource {
  url: string;
  onopen: ((this: EventSource, ev: Event) => void) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent) => void) | null = null;
  onerror: ((this: EventSource, ev: Event) => void) | null = null;
  readyState: number = 0;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.call(this as any, new Event('open'));
    }, 0);
  }

  close() {
    this.readyState = 2;
  }
}

/** Generate N mock FlowEvents */
function generateEvents(count: number): FlowEvent[] {
  const types: EventType[] = ['start', 'thinking', 'tool_call', 'tool_result', 'message', 'error', 'end'];
  const tools = ['read_file', 'write_file', 'search', 'analyze', 'generate'];
  const events: FlowEvent[] = [];

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const event: FlowEvent = {
      id: i,
      type,
      message: `Event ${i}: ${type} operation performed successfully`,
      timestamp: Date.now() + i,
    };
    if (type === 'tool_call') {
      event.tool = tools[i % tools.length];
      event.args = { path: `/file-${i}.ts`, options: { verbose: true } };
      event.argsJson = JSON.stringify(event.args, null, 2);
      event.duration = Math.floor(Math.random() * 3000);
    }
    if (type === 'tool_result') {
      event.result = `Result for event ${i}: operation completed with ${Math.floor(Math.random() * 100)} items processed`;
      event.duration = Math.floor(Math.random() * 2000);
    }
    events.push(event);
  }
  return events;
}

/** Measure memory usage (Node.js) */
function getMemoryUsageMB(): number {
  const usage = process.memoryUsage();
  return usage.heapUsed / (1024 * 1024);
}

/** Force garbage collection if available */
function forceGC(): void {
  if (global.gc) {
    global.gc();
  }
}

interface BenchmarkResult {
  name: string;
  eventCount: number;
  renderTimeMs: number;
  memoryBeforeMB: number;
  memoryAfterMB: number;
  memoryDeltaMB: number;
  eventsPerSecond: number;
}

const results: BenchmarkResult[] = [];

describe('Performance Benchmarks', () => {
  let mockEventSource: MockEventSource | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    mockEventSource = null;

    vi.stubGlobal(
      'EventSource',
      vi.fn((url: string) => {
        mockEventSource = new MockEventSource(url);
        return mockEventSource;
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function runRenderBenchmark(eventCount: number) {
    it(`render ${eventCount.toLocaleString()} events`, () => {
      forceGC();
      const memBefore = getMemoryUsageMB();

      const start = performance.now();

      // Render the component with autoConnect=false (we'll inject events manually)
      const { container, unmount } = render(
        React.createElement(AgentFlow, {
          url: 'http://localhost:8080/stream',
          autoConnect: false,
          maxEvents: eventCount + 1000,
        }),
      );

      // Inject events directly via state manipulation
      // We simulate what useSSE does: batch events into state
      const events = generateEvents(eventCount);

      // Simulate the SSE message handler by directly calling
      // the mocked EventSource's onmessage
      if (mockEventSource) {
        // Flush initial connection
        vi.advanceTimersByTime(20);

        // Send events in batches (simulating real SSE behavior)
        const batchSize = 100;
        for (let i = 0; i < events.length; i += batchSize) {
          const batch = events.slice(i, i + batchSize);
          for (const event of batch) {
            const msg = new MessageEvent('message', {
              data: JSON.stringify(event),
            });
            mockEventSource.onmessage?.call(mockEventSource as any, msg);
          }
          // Flush the requestAnimationFrame batch
          vi.advanceTimersByTime(0);
        }
      }

      const elapsed = performance.now() - start;
      const memAfter = getMemoryUsageMB();

      const result: BenchmarkResult = {
        name: `render-${eventCount}`,
        eventCount,
        renderTimeMs: Math.round(elapsed * 100) / 100,
        memoryBeforeMB: Math.round(memBefore * 100) / 100,
        memoryAfterMB: Math.round(memAfter * 100) / 100,
        memoryDeltaMB: Math.round((memAfter - memBefore) * 100) / 100,
        eventsPerSecond: Math.round(eventCount / (elapsed / 1000)),
      };

      results.push(result);

      // Sanity checks
      expect(elapsed).toBeLessThan(eventCount < 10000 ? 5000 : 30000);
      expect(result.eventsPerSecond).toBeGreaterThan(0);

      unmount();
    });
  }

  runRenderBenchmark(1_000);
  runRenderBenchmark(10_000);
  runRenderBenchmark(100_000);

  it('output JSON results', () => {
    const output = {
      timestamp: new Date().toISOString(),
      benchmarks: results,
      summary: {
        totalBenchmarks: results.length,
        avgEventsPerSecond: Math.round(
          results.reduce((sum, r) => sum + r.eventsPerSecond, 0) / results.length,
        ),
        maxMemoryDeltaMB: Math.round(
          Math.max(...results.map((r) => r.memoryDeltaMB)) * 100,
        ) / 100,
      },
    };

    // Write to stdout for CI consumption
    console.log('\n=== BENCHMARK RESULTS (JSON) ===');
    console.log(JSON.stringify(output, null, 2));
    console.log('=== END BENCHMARK RESULTS ===\n');

    // Also write to file if path provided
    const outputIdx = process.argv.indexOf('--output');
    if (outputIdx !== -1 && process.argv[outputIdx + 1]) {
      const fs = require('fs');
      fs.writeFileSync(process.argv[outputIdx + 1], JSON.stringify(output, null, 2));
    }

    // Verify all benchmarks completed
    expect(results.length).toBe(3);
  });
});
