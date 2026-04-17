/**
 * Test Setup File
 * Global configuration for Vitest tests
 */

import '@testing-library/jest-dom';

// ============================================
// EventSource Mock
// ============================================

/**
 * Mock EventSource for SSEManager tests
 * Provides controllable SSE connection simulation
 */
class MockEventSource {
  url: string;
  readyState: number = 0; // CONNECTING
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  onopen: ((this: EventSource, ev: Event) => any) | null = null;
  onmessage: ((this: MessageEvent, ev: MessageEvent) => any) | null = null;
  onerror: ((this: Event, ev: Event) => any) | null = null;

  private listeners: Map<string, EventListener[]> = new Map();
  private autoOpen: boolean;

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.autoOpen = true;

    // Simulate async connection
    setTimeout(() => {
      if (this.autoOpen) {
        this.simulateOpen();
      }
    }, 10);
  }

  private simulateOpen(): void {
    this.readyState = MockEventSource.OPEN;
    if (this.onopen) {
      this.onopen.call(this as any, new Event('open'));
    }
    this.dispatchEvent(new Event('open'));
  }

  addEventListener(type: string, listener: EventListener): void {
    const existing = this.listeners.get(type) || [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const existing = this.listeners.get(type) || [];
    const index = existing.indexOf(listener);
    if (index > -1) {
      existing.splice(index, 1);
      this.listeners.set(type, existing);
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type) || [];
    listeners.forEach((l) => l(event));
    return true;
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
    this.autoOpen = false;
  }

  // ========================================
  // Test Helper Methods
  // ========================================

  /**
   * Simulate receiving a message
   * @param data - Message data (string or object)
   */
  _emitMessage(data: string | object): void {
    if (this.readyState !== MockEventSource.OPEN) {
      console.warn('[MockEventSource] Cannot emit message, connection not open');
      return;
    }

    const messageData = typeof data === 'string' ? data : JSON.stringify(data);
    const event = new MessageEvent('message', { data: messageData });

    if (this.onmessage) {
      this.onmessage.call(event as any, event);
    }
    this.dispatchEvent(event);
  }

  /**
   * Simulate an error
   */
  _emitError(): void {
    this.readyState = MockEventSource.CLOSED;
    const errorEvent = new Event('error');

    if (this.onerror) {
      this.onerror.call(this as any, errorEvent);
    }
    this.dispatchEvent(errorEvent);
  }

  /**
   * Prevent auto-open (for testing error scenarios)
   */
  _preventAutoOpen(): void {
    this.autoOpen = false;
  }

  /**
   * Manually trigger open (after preventAutoOpen)
   */
  _triggerOpen(): void {
    this.simulateOpen();
  }
}

// Replace global EventSource with mock
(global as any).EventSource = MockEventSource;

// Export for use in tests
export { MockEventSource };

// ============================================
// Console Mock (reduce test noise)
// ============================================

const originalWarn = console.warn;
const originalError = console.error;

// Store mock functions for access in tests
export const mockConsole = {
  warn: vi.fn(),
  error: vi.fn(),
};

beforeAll(() => {
  console.warn = mockConsole.warn;
  console.error = mockConsole.error;
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

beforeEach(() => {
  mockConsole.warn.mockClear();
  mockConsole.error.mockClear();
});

// ============================================
// Fake Timers Setup (for tests that need them)
// ============================================

// Example usage in test file:
// beforeEach(() => vi.useFakeTimers());
// afterEach(() => vi.useRealTimers());
