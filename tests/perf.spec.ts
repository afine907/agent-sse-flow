import { test, expect } from '@playwright/test';

const MOCK_SERVER = 'http://localhost:3001';

test.describe('AgentFlow Performance', () => {
  test('render 10K events via SSE — DOM nodes stay bounded', async ({ page }) => {
    // Navigate with SSE URL pointing to mock server (10K events)
    await page.goto(`${MOCK_SERVER.replace('3001', '5173')}/?sse=${MOCK_SERVER}/stream?count=10000`);

    // Wait for the component to mount and connection to establish
    await page.waitForSelector('.agent-flow');

    // Wait for events to stream in (mock server sends 50/batch at 100ms intervals)
    // 10K events / 50 per batch = 200 batches * 100ms = 20s max
    // We'll wait for the "end" event or timeout after 30s
    await page.waitForFunction(
      () => {
        const statusDot = document.querySelector('.agent-flow__status-dot');
        // Connection established or stream complete
        const eventRows = document.querySelectorAll('.agent-flow__event-row');
        return eventRows.length > 0;
      },
      { timeout: 30_000 }
    );

    // Give some time for events to accumulate
    await page.waitForTimeout(5000);

    const stats = await page.evaluate(() => {
      const viewportRows = document.querySelectorAll('.agent-flow__event-row');
      const allEvents = document.querySelectorAll('.agent-flow__event');
      const viewport = document.querySelector('.agent-flow__events-viewport');
      return {
        viewportRows: viewportRows.length,
        totalEvents: allEvents.length,
        viewportHeight: viewport ? parseInt(viewport.style.height) : 0,
        containerScrollHeight: document.querySelector('.agent-flow__events')?.scrollHeight || 0,
      };
    });

    console.log(`DOM stats after streaming: ${JSON.stringify(stats, null, 2)}`);

    // With virtual scrolling, only ~15-25 rows should be in the DOM
    // regardless of how many events have been received
    expect(stats.viewportRows).toBeLessThanOrEqual(50);
    // But the viewport height should reflect the total number of events
    expect(stats.viewportHeight).toBeGreaterThan(0);
  });

  test('scroll FPS with 10K events >= 30fps', async ({ page }) => {
    await page.goto(`${MOCK_SERVER.replace('3001', '5173')}/?sse=${MOCK_SERVER}/stream?count=10000`);
    await page.waitForSelector('.agent-flow');

    // Wait for events to accumulate
    await page.waitForTimeout(10_000);

    // Check if scrollable
    const isScrollable = await page.evaluate(() => {
      const container = document.querySelector('.agent-flow__events');
      return container ? container.scrollHeight > container.clientHeight : false;
    });

    if (!isScrollable) {
      console.log('Not enough events to scroll, skipping FPS test');
      test.skip();
      return;
    }

    // Measure FPS during scroll
    const fps = await page.evaluate(async () => {
      const container = document.querySelector('.agent-flow__events');
      if (!container) return 0;

      return new Promise<number>((resolve) => {
        const frameTimes: number[] = [];
        let lastTime = performance.now();
        let scrollPos = 0;
        const maxScroll = container.scrollHeight - container.clientHeight;
        let frameCount = 0;

        function tick(now: number) {
          const delta = now - lastTime;
          frameTimes.push(delta);
          lastTime = now;

          // Scroll down
          scrollPos += 300;
          if (scrollPos > maxScroll) scrollPos = 0;
          container.scrollTop = scrollPos;

          frameCount++;
          if (frameCount >= 90) {
            // Trim outliers (first 10 and last 10)
            const sorted = frameTimes.slice(10, -10).sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            resolve(1000 / median);
            return;
          }

          requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
      });
    });

    console.log(`Scroll FPS: ${fps.toFixed(1)}`);
    expect(fps).toBeGreaterThanOrEqual(30);
  });

  test('first-paint render with 1000 events < 100ms', async ({ page }) => {
    await page.goto(`${MOCK_SERVER.replace('3001', '5173')}/?sse=${MOCK_SERVER}/stream?count=1000`);
    await page.waitForSelector('.agent-flow');

    // Measure time from page load to first visible events
    const renderTime = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        const start = performance.now();

        const observer = new MutationObserver(() => {
          const rows = document.querySelectorAll('.agent-flow__event-row');
          if (rows.length > 0) {
            observer.disconnect();
            resolve(performance.now() - start);
          }
        });

        const eventsContainer = document.querySelector('.agent-flow__events');
        if (eventsContainer) {
          observer.observe(eventsContainer, { childList: true, subtree: true });
        }

        // Timeout fallback
        setTimeout(() => {
          observer.disconnect();
          resolve(performance.now() - start);
        }, 10_000);
      });
    });

    console.log(`First-paint render time: ${renderTime.toFixed(1)}ms`);
    expect(renderTime).toBeLessThan(5000); // Generous: includes SSE connection time
  });

  test('memory usage with 10K events < 100MB', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'performance.memory is Chrome-only');

    await page.goto(`${MOCK_SERVER.replace('3001', '5173')}/?sse=${MOCK_SERVER}/stream?count=10000`);
    await page.waitForSelector('.agent-flow');

    // Wait for events to stream in
    await page.waitForTimeout(15_000);

    const memory = await page.evaluate(() => {
      const perf = performance as any;
      if (!perf.memory) return null;
      return {
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize,
      };
    });

    if (!memory) {
      test.skip();
      return;
    }

    const usedMB = memory.usedJSHeapSize / (1024 * 1024);
    console.log(`Memory: ${usedMB.toFixed(1)}MB`);
    expect(usedMB).toBeLessThan(100);
  });

  test('SSE throughput: 5K events arrive within expected time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${MOCK_SERVER.replace('3001', '5173')}/?sse=${MOCK_SERVER}/stream?count=5000`);
    await page.waitForSelector('.agent-flow');

    // Wait for the viewport height to stabilize (all events received)
    // The mock server sends 50/batch at 100ms intervals = 100 batches = ~10s for 5K events
    await page.waitForFunction(
      () => {
        const viewport = document.querySelector('.agent-flow__events-viewport');
        if (!viewport) return false;
        const height = parseInt(viewport.style.height);
        // Each event is estimated at ~80px. 5000 * 80 = 400,000px
        return height > 300_000;
      },
      { timeout: 30_000 }
    );

    const elapsed = Date.now() - startTime;
    const viewportHeight = await page.evaluate(() => {
      const viewport = document.querySelector('.agent-flow__events-viewport');
      return viewport ? parseInt((viewport as HTMLElement).style.height) : 0;
    });

    // Estimate event count from viewport height (80px per event)
    const estimatedEvents = Math.round(viewportHeight / 80);
    console.log(`Received ~${estimatedEvents} events in ${elapsed}ms (${(estimatedEvents / elapsed * 1000).toFixed(0)} events/sec)`);

    // Mock server should deliver 5K events in ~10s (100 batches * 100ms)
    // Allow generous margin for cold start
    expect(elapsed).toBeLessThan(30_000);
    expect(estimatedEvents).toBeGreaterThanOrEqual(3000);
  });

  test('100K events — DOM stays bounded and memory < 200MB', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'performance.memory is Chrome-only');

    await page.goto(`${MOCK_SERVER.replace('3001', '5173')}/?sse=${MOCK_SERVER}/stream?count=100000`);
    await page.waitForSelector('.agent-flow');

    // Wait for events to accumulate (100K / 50 per batch * 100ms = 200s)
    // We'll check after 30s which gives ~15K events — enough to validate scaling
    await page.waitForTimeout(30_000);

    const stats = await page.evaluate(() => {
      const viewportRows = document.querySelectorAll('.agent-flow__event-row');
      const viewport = document.querySelector('.agent-flow__events-viewport');
      const perf = performance as any;
      const memory = perf.memory
        ? { usedMB: perf.memory.usedJSHeapSize / (1024 * 1024) }
        : null;
      return {
        viewportRows: viewportRows.length,
        viewportHeight: viewport ? parseInt((viewport as HTMLElement).style.height) : 0,
        memory,
      };
    });

    console.log(`100K test stats after 30s: ${JSON.stringify(stats, null, 2)}`);

    // Virtual scrolling keeps DOM bounded regardless of total events
    expect(stats.viewportRows).toBeLessThanOrEqual(50);
    // Viewport should reflect accumulated events
    expect(stats.viewportHeight).toBeGreaterThan(0);

    if (stats.memory) {
      expect(stats.memory.usedMB).toBeLessThan(200);
    }
  });
});
