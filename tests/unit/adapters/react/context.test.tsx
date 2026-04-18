/**
 * React Context Unit Tests
 * Tests for src/adapters/react/context.ts
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import {
  TraceScopeDataContext,
  TraceScopeActionsContext,
  TraceScopeContext,
  useTraceScopeData,
  useTraceScopeActions,
  useTraceScopeContext,
  DEFAULT_STATE,
} from '@tracescope/adapters/react/context';

describe('DEFAULT_STATE', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_STATE.nodes).toEqual({});
    expect(DEFAULT_STATE.tree).toBeNull();
    expect(DEFAULT_STATE.connectionState).toBe('disconnected');
    expect(DEFAULT_STATE.error).toBeNull();
  });
});

describe('TraceScopeDataContext', () => {
  it('should have correct default values', () => {
    expect(TraceScopeDataContext.displayName).toBeUndefined();
  });

  it('should provide default data context value', () => {
    const { result } = renderHook(() => useTraceScopeData());

    expect(result.current.nodes).toEqual({});
    expect(result.current.tree).toBeNull();
    expect(result.current.connectionState).toBe('disconnected');
    expect(result.current.error).toBeNull();
  });
});

describe('TraceScopeActionsContext', () => {
  it('should provide default action context value', () => {
    const { result } = renderHook(() => useTraceScopeActions());

    expect(result.current.config).toBeNull();
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.reconnect).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.getNode).toBe('function');
    expect(typeof result.current.toggleExpanded).toBe('function');
  });

  it('should have connect function that returns void', async () => {
    const { result } = renderHook(() => useTraceScopeActions());

    const connectResult = await result.current.connect();
    expect(connectResult).toBeUndefined();
  });

  it('should have disconnect function that returns void', () => {
    const { result } = renderHook(() => useTraceScopeActions());

    expect(() => result.current.disconnect()).not.toThrow();
  });

  it('should have reconnect function that returns void', () => {
    const { result } = renderHook(() => useTraceScopeActions());

    expect(() => result.current.reconnect()).not.toThrow();
  });

  it('should have reset function that returns void', () => {
    const { result } = renderHook(() => useTraceScopeActions());

    expect(() => result.current.reset()).not.toThrow();
  });

  it('should have getNode function that returns undefined', () => {
    const { result } = renderHook(() => useTraceScopeActions());

    const node = result.current.getNode('any-id');
    expect(node).toBeUndefined();
  });

  it('should have toggleExpanded function that returns void', () => {
    const { result } = renderHook(() => useTraceScopeActions());

    expect(() => result.current.toggleExpanded('any-id')).not.toThrow();
  });
});

describe('TraceScopeContext (legacy)', () => {
  it('should exist for backward compatibility', () => {
    expect(TraceScopeContext).toBeDefined();
  });
});

describe('useTraceScopeContext', () => {
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTraceScopeContext());
    }).toThrow('useTraceScope must be used within a TraceScopeProvider');

    consoleError.mockRestore();
  });
});

describe('Context with provider', () => {
  const createWrapper = (
    dataValue = {},
    actionsValue = {}
  ) => {
    const defaultData = {
      nodes: {},
      tree: null,
      connectionState: 'disconnected' as const,
      error: null,
    };

    const defaultActions = {
      connect: async () => {},
      disconnect: () => {},
      reconnect: () => {},
      reset: () => {},
      getNode: () => undefined,
      toggleExpanded: () => {},
      config: { url: 'https://test.com' },
    };

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <TraceScopeDataContext.Provider value={{ ...defaultData, ...dataValue }}>
        <TraceScopeActionsContext.Provider value={{ ...defaultActions, ...actionsValue }}>
          {children}
        </TraceScopeActionsContext.Provider>
      </TraceScopeDataContext.Provider>
    );

    return Wrapper;
  };

  it('should return data from data context', () => {
    const customNodes = {
      'node-1': { nodeId: 'node-1', chunk: 'test' },
    };

    const wrapper = createWrapper({ nodes: customNodes });
    const { result } = renderHook(() => useTraceScopeData(), { wrapper });

    expect(result.current.nodes).toEqual(customNodes);
  });

  it('should return actions from actions context', () => {
    const mockConnect = vi.fn();
    const wrapper = createWrapper({}, { connect: mockConnect });
    const { result } = renderHook(() => useTraceScopeActions(), { wrapper });

    expect(result.current.connect).toBe(mockConnect);
  });

  it('should return combined context value', () => {
    const wrapper = createWrapper(
      { connectionState: 'connected' },
      { config: { url: 'https://custom.com' } }
    );
    const { result } = renderHook(() => useTraceScopeContext(), { wrapper });

    expect(result.current.connectionState).toBe('connected');
    expect(result.current.config?.url).toBe('https://custom.com');
  });

  it('should have correct nodes in provider', () => {
    const nodes = {
      'node-1': { nodeId: 'node-1', chunk: 'a' },
      'node-2': { nodeId: 'node-2', chunk: 'b' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => useTraceScopeData(), { wrapper });

    expect(result.current.nodes).toEqual(nodes);
  });

  it('should have correct connectionState in provider', () => {
    const wrapper = createWrapper({ connectionState: 'connected' });
    const { result } = renderHook(() => useTraceScopeData(), { wrapper });

    expect(result.current.connectionState).toBe('connected');
  });

  it('should have correct error in provider', () => {
    const error = new Error('Test error');
    const wrapper = createWrapper({ error });
    const { result } = renderHook(() => useTraceScopeData(), { wrapper });

    expect(result.current.error).toBe(error);
  });
});
