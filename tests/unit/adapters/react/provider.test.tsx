/**
 * TraceScope Provider Unit Tests
 * Tests for src/adapters/react/provider.tsx
 */

import { describe, it, expect, vi, React, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { TraceScopeProvider } from '@tracescope/adapters/react/provider';
import {
  useTraceScopeData,
  useTraceScopeActions,
  useTraceScopeContext,
} from '@tracescope/adapters/react/context';

// Mock SSEManager
vi.mock('../../core/sse', () => ({
  SSEManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    reconnect: vi.fn(),
    reset: vi.fn(),
  })),
}));

// Mock StateManager
vi.mock('../../core/state', () => ({
  StateManager: vi.fn().mockImplementation(() => ({
    handleMessage: vi.fn(),
    getNode: vi.fn().mockReturnValue(undefined),
    getAllNodes: vi.fn().mockReturnValue({}),
    clear: vi.fn(),
  })),
}));

// Mock TreeBuilder
vi.mock('../../core/tree', () => ({
  TreeBuilder: vi.fn().mockImplementation(() => ({
    buildTree: vi.fn().mockReturnValue(null),
    clear: vi.fn(),
  })),
}));

// Mock Renderer
vi.mock('../../core/renderer', () => ({
  Renderer: vi.fn().mockImplementation(() => ({
    scheduleRender: vi.fn(),
    onFlush: vi.fn(),
    clear: vi.fn(),
  })),
}));

describe('TraceScopeProvider', () => {
  const defaultConfig = {
    url: 'https://test.example.com/stream',
    autoConnect: false, // Disable auto connect for predictable tests
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TraceScopeProvider config={defaultConfig}>
      {children}
    </TraceScopeProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      render(
        <TraceScopeProvider config={defaultConfig}>
          <div data-testid="child">Test Child</div>
        </TraceScopeProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <TraceScopeProvider config={defaultConfig}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </TraceScopeProvider>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('should render with empty children', () => {
      const { container } = render(
        <TraceScopeProvider config={defaultConfig}>
          {null}
        </TraceScopeProvider>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('context values', () => {
    it('should provide data context', () => {
      const { result } = renderHook(() => useTraceScopeData(), { wrapper });

      expect(result.current.nodes).toEqual({});
      expect(result.current.tree).toBeNull();
      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.error).toBeNull();
    });

    it('should provide actions context', () => {
      const { result } = renderHook(() => useTraceScopeActions(), { wrapper });

      expect(result.current.config).toBeDefined();
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.reconnect).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.getNode).toBe('function');
      expect(typeof result.current.toggleExpanded).toBe('function');
    });

    it('should provide combined context', () => {
      const { result } = renderHook(() => useTraceScopeContext(), { wrapper });

      expect(result.current.nodes).toEqual({});
      expect(result.current.connectionState).toBe('disconnected');
      expect(typeof result.current.connect).toBe('function');
    });
  });

  describe('config handling', () => {
    it('should use provided config URL', () => {
      const { result } = renderHook(() => useTraceScopeActions(), { wrapper });

      expect(result.current.config?.url).toBe('https://test.example.com/stream');
    });

    it('should merge with default config', () => {
      const { result } = renderHook(() => useTraceScopeActions(), { wrapper });

      // autoConnect is set to false in our test config
      expect(result.current.config?.autoConnect).toBe(false);
    });

    it('should accept custom config options', () => {
      const customConfig = {
        url: 'https://custom.example.com/stream',
        autoConnect: false,
        headers: { Authorization: 'Bearer token' },
      };

      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <TraceScopeProvider config={customConfig}>
          {children}
        </TraceScopeProvider>
      );

      const { result } = renderHook(() => useTraceScopeActions(), { wrapper: customWrapper });

      expect(result.current.config?.url).toBe('https://custom.example.com/stream');
      expect(result.current.config?.autoConnect).toBe(false);
      expect(result.current.config?.headers).toEqual({ Authorization: 'Bearer token' });
    });
  });

  describe('action functions', () => {
    it('should have connect function that can be called', async () => {
      const { result } = renderHook(() => useTraceScopeActions(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should have disconnect function that can be called', () => {
      const { result } = renderHook(() => useTraceScopeActions(), { wrapper });

      act(() => {
        result.current.disconnect();
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should have reconnect function that can be called', () => {
      const { result } = renderHook(() => useTraceScopeActions(), { wrapper });

      act(() => {
        result.current.reconnect();
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should have reset function that can be called', () => {
      const { result } = renderHook(() => useTraceScopeActions(), { wrapper });

      act(() => {
        result.current.reset();
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should have getNode function that returns undefined', () => {
      const { result } = renderHook(() => useTraceScopeActions(), { wrapper });

      const node = result.current.getNode('non-existent');

      expect(node).toBeUndefined();
    });

    it('should have toggleExpanded function that can be called', () => {
      const { result } = renderHook(() => useTraceScopeActions(), { wrapper });

      act(() => {
        result.current.toggleExpanded('node-1');
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should start with null error', () => {
      const { result } = renderHook(() => useTraceScopeData(), { wrapper });

      expect(result.current.error).toBeNull();
    });
  });

  describe('connection state', () => {
    it('should start with disconnected state', () => {
      const { result } = renderHook(() => useTraceScopeData(), { wrapper });

      expect(result.current.connectionState).toBe('disconnected');
    });
  });
});
