import { test, expect } from '@playwright/test';

const DEV_SERVER = 'http://localhost:5173';
const MOCK_SERVER = 'http://localhost:3001';

test.describe('AgentFlow Lighthouse Performance', () => {
  test('navigate to demo page and measure performance metrics', async ({ page }) => {
    // Navigate to demo page
    await page.goto(DEV_SERVER, { waitUntil: 'domcontentloaded' });

    // Start performance measurement
    const startTime = Date.now();

    // Start the stream with 1K events for a manageable test
    await page.evaluate((mockUrl) => {
      const input = document.querySelector('input[type="range"]') as HTMLInputElement;
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        )?.set;
        nativeInputValueSetter?.call(input, '1000');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, MOCK_SERVER);

    // Click the Start button
    const startButton = page.locator('button').filter({ hasText: 'Start' });
    await startButton.click();

    // Wait for the AgentFlow component to render events
    await page.waitForSelector('.agent-flow');
    await page.waitForSelector('.agent-flow__event-row', { timeout: 30_000 });

    // Wait for some events to accumulate
    await page.waitForTimeout(5000);

    const elapsed = Date.now() - startTime;
    console.log(`Navigation and initial render: ${elapsed}ms`);

    // Verify the page loaded successfully with the AgentFlow component
    const hasAgentFlow = await page.evaluate(() => {
      return document.querySelector('.agent-flow') !== null;
    });
    expect(hasAgentFlow).toBe(true);
  });

  test('measure LCP (Largest Contentful Paint)', async ({ page }) => {
    await page.goto(DEV_SERVER, { waitUntil: 'domcontentloaded' });

    // Start the stream
    const startButton = page.locator('button').filter({ hasText: 'Start' });
    await startButton.click();

    // Wait for events to render
    await page.waitForSelector('.agent-flow__event-row', { timeout: 30_000 });
    await page.waitForTimeout(3000);

    // Measure LCP using PerformanceObserver API
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const entries = performance.getEntriesByType('largest-contentful-paint');
        if (entries.length > 0) {
          resolve(entries[entries.length - 1].startTime);
          return;
        }

        // If no LCP entries, use PerformanceObserver
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            observer.disconnect();
            resolve(entries[entries.length - 1].startTime);
          }
        });

        try {
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch {
          // LCP observer not supported, fall back to load event timing
          const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          resolve(navEntry ? navEntry.loadEventEnd - navEntry.startTime : 0);
        }

        // Timeout after 5 seconds
        setTimeout(() => {
          observer.disconnect();
          const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          resolve(navEntry ? navEntry.loadEventEnd - navEntry.startTime : 0);
        }, 5000);
      });
    });

    console.log(`LCP: ${lcp.toFixed(1)}ms`);

    // LCP should be under 2.5 seconds for a good score
    // We use a generous 5 second threshold to account for test environment variability
    expect(lcp).toBeLessThan(5000);
  });

  test('measure CLS (Cumulative Layout Shift)', async ({ page }) => {
    await page.goto(DEV_SERVER, { waitUntil: 'domcontentloaded' });

    // Start the stream
    const startButton = page.locator('button').filter({ hasText: 'Start' });
    await startButton.click();

    // Wait for events to render and scroll around to trigger potential layout shifts
    await page.waitForSelector('.agent-flow__event-row', { timeout: 30_000 });
    await page.waitForTimeout(3000);

    // Scroll to trigger layout shifts (if any)
    await page.evaluate(() => {
      const container = document.querySelector('.agent-flow__events');
      if (container) {
        // Scroll down gradually
        container.scrollTop = 500;
      }
    });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const container = document.querySelector('.agent-flow__events');
      if (container) {
        container.scrollTop = 1000;
      }
    });
    await page.waitForTimeout(1000);

    // Measure CLS
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as any;
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value;
            }
          }
        });

        try {
          observer.observe({ type: 'layout-shift', buffered: true });
        } catch {
          // Layout shift observer not supported
          resolve(0);
          return;
        }

        // Wait a bit for any remaining layout shifts
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 2000);
      });
    });

    console.log(`CLS: ${cls.toFixed(4)}`);

    // CLS should be under 0.1 for a good score
    expect(cls).toBeLessThan(0.1);
  });

  test('Performance API — navigation timing within budget', async ({ page }) => {
    await page.goto(DEV_SERVER, { waitUntil: 'domcontentloaded' });

    // Start the stream
    const startButton = page.locator('button').filter({ hasText: 'Start' });
    await startButton.click();

    // Wait for events
    await page.waitForSelector('.agent-flow__event-row', { timeout: 30_000 });
    await page.waitForTimeout(3000);

    const timings = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!navEntry) return null;

      return {
        dnsLookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
        tcpConnect: navEntry.connectEnd - navEntry.connectStart,
        ttfb: navEntry.responseStart - navEntry.requestStart,
        domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
        loadComplete: navEntry.loadEventEnd - navEntry.startTime,
        domInteractive: navEntry.domInteractive - navEntry.startTime,
      };
    });

    if (!timings) {
      console.log('Navigation timing not available');
      test.skip();
      return;
    }

    console.log('Navigation timings:', timings);

    // DOM content loaded should be under 2 seconds
    expect(timings.domContentLoaded).toBeLessThan(2000);
    // DOM interactive should be under 1.5 seconds
    expect(timings.domInteractive).toBeLessThan(1500);
  });
});
