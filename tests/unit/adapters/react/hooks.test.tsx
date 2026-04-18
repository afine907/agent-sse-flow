/**
 * React Hooks Unit Tests
 * Tests for src/adapters/react/hooks.ts
 */

import { describe, it, expect, vi, React } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useTraceScope,
  useTraceNode,
  useTraceTree,
  useConnectionState,
  useNodes,
  useError,
  useConnection,
  useNodeExpanded,
  useStreamingStatus,
  useFilteredNodes,
} from '@tracescope/adapters/react/hooks';
import {
  TraceScopeDataContext,
  TraceScopeActionsContext,
} from '@tracescope/adapters/react/context';
import type { StreamNode, NodeMap } from '@tracescope/types/node';
import type { TreeNode } from '@tracescope/types/tree';
import type { ConnectionState } from '@tracescope/types/config';

// Helper to create wrapper with context values
const createWrapper = (
  dataOverrides = {},
  actionsOverrides = {}
) => {
  const defaultData = {
    nodes: {} as NodeMap,
    tree: null as TreeNode | null,
    connectionState: 'disconnected' as ConnectionState,
    error: null as Error | null,
  };

  const defaultActions = {
    connect: async () => {},
    disconnect: () => {},
    reconnect: () => {},
    reset: () => {},
    getNode: () => undefined as StreamNode | undefined,
    toggleExpanded: () => {},
    config: { url: 'https://test.com' },
  };

  return ({ children }: { children: React.ReactNode }) => (
    <TraceScopeDataContext.Provider value={{ ...defaultData, ...dataOverrides }}>
      <TraceScopeActionsContext.Provider value={{ ...defaultActions, ...actionsOverrides }}>
        {children}
      </TraceScopeActionsContext.Provider>
    </TraceScopeDataContext.Provider>
  );
};

describe('useTraceScope', () => {
  it('should return context value when inside provider', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTraceScope(), { wrapper });

    expect(result.current.nodes).toEqual({});
    expect(result.current.connectionState).toBe('disconnected');
  });

  it('should return connect function', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTraceScope(), { wrapper });

    expect(typeof result.current.connect).toBe('function');
  });

  it('should return all expected properties', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTraceScope(), { wrapper });

    expect(result.current).toHaveProperty('nodes');
    expect(result.current).toHaveProperty('tree');
    expect(result.current).toHaveProperty('connectionState');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('connect');
    expect(result.current).toHaveProperty('disconnect');
    expect(result.current).toHaveProperty('reconnect');
    expect(result.current).toHaveProperty('reset');
    expect(result.current).toHaveProperty('getNode');
    expect(result.current).toHaveProperty('toggleExpanded');
  });
});

describe('useTraceNode', () => {
  it('should return undefined for null nodeId', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTraceNode(null), { wrapper });

    expect(result.current).toBeUndefined();
  });

  it('should return undefined for undefined nodeId', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTraceNode(undefined), { wrapper });

    expect(result.current).toBeUndefined();
  });

  it('should return node when it exists', () => {
    const node: StreamNode = { nodeId: 'node-1', chunk: 'test' };
    const wrapper = createWrapper({ nodes: { 'node-1': node } });

    const { result } = renderHook(() => useTraceNode('node-1'), { wrapper });

    expect(result.current).toEqual(node);
  });

  it('should return undefined when node does not exist', () => {
    const wrapper = createWrapper({ nodes: {} });
    const { result } = renderHook(() => useTraceNode('non-existent'), { wrapper });

    expect(result.current).toBeUndefined();
  });
});

describe('useTraceTree', () => {
  it('should return null when no tree', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTraceTree(), { wrapper });

    expect(result.current).toBeNull();
  });

  it('should return tree when available', () => {
    const tree: TreeNode = {
      nodeId: 'root',
      data: { nodeId: 'root', chunk: 'root' },
      children: [],
      depth: 0,
      isExpanded: true,
    };

    const wrapper = createWrapper({ tree });
    const { result } = renderHook(() => useTraceTree(), { wrapper });

    expect(result.current).toEqual(tree);
  });
});

describe('useConnectionState', () => {
  it('should return current connection state', () => {
    const wrapper = createWrapper({ connectionState: 'connected' });
    const { result } = renderHook(() => useConnectionState(), { wrapper });

    expect(result.current).toBe('connected');
  });

  it('should return different connection states', () => {
    const states: ConnectionState[] = ['connecting', 'connected', 'disconnected', 'error'];

    states.forEach((state) => {
      const wrapper = createWrapper({ connectionState: state });
      const { result } = renderHook(() => useConnectionState(), { wrapper });

      expect(result.current).toBe(state);
    });
  });
});

describe('useNodes', () => {
  it('should return nodes map', () => {
    const nodes: NodeMap = {
      'node-1': { nodeId: 'node-1', chunk: 'a' },
      'node-2': { nodeId: 'node-2', chunk: 'b' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => useNodes(), { wrapper });

    expect(result.current).toEqual(nodes);
  });
});

describe('useError', () => {
  it('should return null when no error', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useError(), { wrapper });

    expect(result.current).toBeNull();
  });

  it('should return error when present', () => {
    const error = new Error('Test error');
    const wrapper = createWrapper({ error });
    const { result } = renderHook(() => useError(), { wrapper });

    expect(result.current).toBe(error);
    expect(result.current?.message).toBe('Test error');
  });
});

describe('useConnection', () => {
  it('should return connection control functions', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useConnection(), { wrapper });

    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.reconnect).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should use custom connect function', async () => {
    const mockConnect = vi.fn();
    const wrapper = createWrapper({}, { connect: mockConnect });
    const { result } = renderHook(() => useConnection(), { wrapper });

    await result.current.connect();

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });
});

describe('useNodeExpanded', () => {
  it('should return isExpanded true by default', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNodeExpanded('node-1'), { wrapper });

    expect(result.current.isExpanded).toBe(true);
  });

  it('should return toggle function', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNodeExpanded('node-1'), { wrapper });

    expect(typeof result.current.toggle).toBe('function');
  });

  it('should return toggle function that can be called', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNodeExpanded('node-1'), { wrapper });

    expect(result.current.isExpanded).toBe(true);
    expect(typeof result.current.toggle).toBe('function');
    
    // Toggle function should be callable without error
    expect(() => result.current.toggle()).not.toThrow();
  });
});

describe('useStreamingStatus', () => {
  it('should return zero counts for empty nodes', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useStreamingStatus(), { wrapper });

    expect(result.current.streamingCount).toBe(0);
    expect(result.current.completeCount).toBe(0);
    expect(result.current.errorCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.isStreaming).toBe(false);
  });

  it('should count nodes by status', () => {
    const nodes: NodeMap = {
      'node-1': { nodeId: 'node-1', chunk: 'a', status: 'streaming' },
      'node-2': { nodeId: 'node-2', chunk: 'b', status: 'complete' },
      'node-3': { nodeId: 'node-3', chunk: 'c', status: 'error' },
      'node-4': { nodeId: 'node-4', chunk: 'd', status: 'streaming' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => useStreamingStatus(), { wrapper });

    expect(result.current.streamingCount).toBe(2);
    expect(result.current.completeCount).toBe(1);
    expect(result.current.errorCount).toBe(1);
    expect(result.current.totalCount).toBe(4);
    expect(result.current.isStreaming).toBe(true);
  });
});

describe('useFilteredNodes', () => {
  it('should return all nodes when no filters applied', () => {
    const nodes: NodeMap = {
      'node-1': { nodeId: 'node-1', chunk: 'test' },
      'node-2': { nodeId: 'node-2', chunk: 'other' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => useFilteredNodes(), { wrapper });

    expect(result.current.filteredCount).toBe(2);
    expect(result.current.totalCount).toBe(2);
  });

  it('should filter by query', () => {
    const nodes: NodeMap = {
      'node-1': { nodeId: 'node-1', chunk: 'test content' },
      'node-2': { nodeId: 'node-2', chunk: 'other data' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => useFilteredNodes({ query: 'test' }), { wrapper });

    expect(result.current.filteredCount).toBe(1);
    expect(result.current.filtered[0].nodeId).toBe('node-1');
  });

  it('should filter by agentId', () => {
    const nodes: NodeMap = {
      'node-1': { nodeId: 'node-1', chunk: 'a', agentId: 'agent-1' },
      'node-2': { nodeId: 'node-2', chunk: 'b', agentId: 'agent-2' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => useFilteredNodes({ agentId: 'agent-1' }), { wrapper });

    expect(result.current.filteredCount).toBe(1);
    expect(result.current.filtered[0].nodeId).toBe('node-1');
  });

  it('should filter by nodeType', () => {
    const nodes: NodeMap = {
      'node-1': { nodeId: 'node-1', chunk: 'a', nodeType: 'llm' },
      'node-2': { nodeId: 'node-2', chunk: 'b', nodeType: 'tool' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => useFilteredNodes({ nodeType: 'llm' }), { wrapper });

    expect(result.current.filteredCount).toBe(1);
    expect(result.current.filtered[0].nodeType).toBe('llm');
  });

  it('should filter by status', () => {
    const nodes: NodeMap = {
      'node-1': { nodeId: 'node-1', chunk: 'a', status: 'streaming' },
      'node-2': { nodeId: 'node-2', chunk: 'b', status: 'complete' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => useFilteredNodes({ status: 'streaming' }), { wrapper });

    expect(result.current.filteredCount).toBe(1);
    expect(result.current.filtered[0].status).toBe('streaming');
  });

  it('should combine multiple filters', () => {
    const nodes: NodeMap = {
      'node-1': { nodeId: 'node-1', chunk: 'test', nodeType: 'llm', status: 'streaming' },
      'node-2': { nodeId: 'node-2', chunk: 'test', nodeType: 'tool', status: 'streaming' },
      'node-3': { nodeId: 'node-3', chunk: 'other', nodeType: 'llm', status: 'streaming' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => 
      useFilteredNodes({ query: 'test', nodeType: 'llm', status: 'streaming' }), 
      { wrapper }
    );

    expect(result.current.filteredCount).toBe(1);
    expect(result.current.filtered[0].nodeId).toBe('node-1');
  });

  it('should be case-insensitive for query', () => {
    const nodes: NodeMap = {
      'node-1': { nodeId: 'node-1', chunk: 'TEST CONTENT' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => useFilteredNodes({ query: 'test' }), { wrapper });

    expect(result.current.filteredCount).toBe(1);
  });

  it('should search in nodeId as well', () => {
    const nodes: NodeMap = {
      'search-node': { nodeId: 'search-node', chunk: 'content' },
      'other-node': { nodeId: 'other-node', chunk: 'content' },
    };

    const wrapper = createWrapper({ nodes });
    const { result } = renderHook(() => useFilteredNodes({ query: 'search' }), { wrapper });

    expect(result.current.filteredCount).toBe(1);
    expect(result.current.filtered[0].nodeId).toBe('search-node');
  });
});
