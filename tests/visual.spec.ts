import { test, expect } from '@playwright/test';

const MOCK_SERVER = 'http://localhost:3001';
const DEV_SERVER = 'http://localhost:5173';

/**
 * Visual regression test suite for AgentFlow component.
 * Screenshots are compared against baselines; first run creates them.
 */

test.describe('Visual Regression — List View', () => {
  test('list view, dark theme', async ({ page }) => {
    await page.goto(`${DEV_SERVER}/?sse=${MOCK_SERVER}/stream-fast?count=30`);
    await page.waitForSelector('.agent-flow');
    await page.waitForFunction(
      () => {
        const countEl = document.querySelector('.agent-flow__event-count');
        return countEl && countEl.textContent?.includes('30');
      },
      { timeout: 10_000 },
    );
    // Let layout settle
    await page.waitForTimeout(500);
    await expect(page.locator('.agent-flow')).toHaveScreenshot('list-dark.png');
  });

  test('list view, light theme', async ({ page }) => {
    await page.goto(`${DEV_SERVER}/?sse=${MOCK_SERVER}/stream-fast?count=30&theme=light`);
    await page.waitForSelector('.agent-flow');
    await page.waitForFunction(
      () => {
        const countEl = document.querySelector('.agent-flow__event-count');
        return countEl && countEl.textContent?.includes('30');
      },
      { timeout: 10_000 },
    );
    await page.waitForTimeout(500);
    await expect(page.locator('.agent-flow')).toHaveScreenshot('list-light.png');
  });
});

test.describe('Visual Regression — Timeline View', () => {
  test('timeline view, dark theme', async ({ page }) => {
    await page.goto(`${DEV_SERVER}/?sse=${MOCK_SERVER}/stream-fast?count=30&view=timeline`);
    await page.waitForSelector('.agent-flow');
    await page.waitForFunction(
      () => {
        const countEl = document.querySelector('.agent-flow__event-count');
        return countEl && countEl.textContent?.includes('30');
      },
      { timeout: 10_000 },
    );
    await page.waitForTimeout(500);
    await expect(page.locator('.agent-flow')).toHaveScreenshot('timeline-dark.png');
  });

  test('timeline view, light theme', async ({ page }) => {
    await page.goto(`${DEV_SERVER}/?sse=${MOCK_SERVER}/stream-fast?count=30&view=timeline&theme=light`);
    await page.waitForSelector('.agent-flow');
    await page.waitForFunction(
      () => {
        const countEl = document.querySelector('.agent-flow__event-count');
        return countEl && countEl.textContent?.includes('30');
      },
      { timeout: 10_000 },
    );
    await page.waitForTimeout(500);
    await expect(page.locator('.agent-flow')).toHaveScreenshot('timeline-light.png');
  });
});

test.describe('Visual Regression — Waterfall View', () => {
  test('waterfall view, dark theme', async ({ page }) => {
    await page.goto(`${DEV_SERVER}/?sse=${MOCK_SERVER}/stream-fast?count=30&view=waterfall`);
    await page.waitForSelector('.agent-flow');
    await page.waitForFunction(
      () => {
        const countEl = document.querySelector('.agent-flow__event-count');
        return countEl && countEl.textContent?.includes('30');
      },
      { timeout: 10_000 },
    );
    await page.waitForTimeout(500);
    await expect(page.locator('.agent-flow')).toHaveScreenshot('waterfall-dark.png');
  });

  test('waterfall view, light theme', async ({ page }) => {
    await page.goto(`${DEV_SERVER}/?sse=${MOCK_SERVER}/stream-fast?count=30&view=waterfall&theme=light`);
    await page.waitForSelector('.agent-flow');
    await page.waitForFunction(
      () => {
        const countEl = document.querySelector('.agent-flow__event-count');
        return countEl && countEl.textContent?.includes('30');
      },
      { timeout: 10_000 },
    );
    await page.waitForTimeout(500);
    await expect(page.locator('.agent-flow')).toHaveScreenshot('waterfall-light.png');
  });
});

test.describe('Visual Regression — Compact Mode', () => {
  test('compact mode, dark theme', async ({ page }) => {
    await page.goto(`${DEV_SERVER}/?sse=${MOCK_SERVER}/stream-fast?count=30`);
    await page.waitForSelector('.agent-flow');
    await page.waitForFunction(
      () => {
        const countEl = document.querySelector('.agent-flow__event-count');
        return countEl && countEl.textContent?.includes('30');
      },
      { timeout: 10_000 },
    );

    // Toggle compact mode
    await page.click('[title*="compact"]');
    await page.waitForTimeout(300);

    await expect(page.locator('.agent-flow')).toHaveScreenshot('compact-dark.png');
  });
});

test.describe('Visual Regression — Search Results', () => {
  test('search results, dark theme', async ({ page }) => {
    await page.goto(`${DEV_SERVER}/?sse=${MOCK_SERVER}/stream-fast?count=50`);
    await page.waitForSelector('.agent-flow');
    await page.waitForFunction(
      () => {
        const countEl = document.querySelector('.agent-flow__event-count');
        return countEl && countEl.textContent?.includes('50');
      },
      { timeout: 10_000 },
    );

    // Open search and type a query
    await page.keyboard.press('Control+k');
    await page.waitForSelector('.agent-flow__search-input');
    await page.fill('.agent-flow__search-input', 'tool_call');
    await page.waitForTimeout(300);

    await expect(page.locator('.agent-flow')).toHaveScreenshot('search-dark.png');
  });
});

test.describe('Visual Regression — Filtered View', () => {
  test('type filter applied, dark theme', async ({ page }) => {
    await page.goto(`${DEV_SERVER}/?sse=${MOCK_SERVER}/stream-fast?count=50`);
    await page.waitForSelector('.agent-flow');
    await page.waitForFunction(
      () => {
        const countEl = document.querySelector('.agent-flow__event-count');
        return countEl && countEl.textContent?.includes('50');
      },
      { timeout: 10_000 },
    );

    // Uncheck some event types to filter
    const checkboxes = page.locator('.agent-flow__type-checkbox input[type="checkbox"]');
    const count = await checkboxes.count();
    // Uncheck first 3 types
    for (let i = 0; i < Math.min(3, count); i++) {
      await checkboxes.nth(i).uncheck();
    }
    await page.waitForTimeout(300);

    await expect(page.locator('.agent-flow')).toHaveScreenshot('filtered-dark.png');
  });
});
