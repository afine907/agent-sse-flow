/**
 * TraceScope React Hooks
 * Custom hooks for interacting with TraceScope context
 *
 * Optimized to use split contexts for better re-render performance:
 * - useTraceScopeData for reading data (nodes, tree, connectionState, error)
 * - useTraceScopeActions for action functions (connect, disconnect, etc.)
 */

import { useContext, useMemo, useCallback, useState } from 'react';
import {
  TraceScopeDataContext,
  TraceScopeActionsContext,
  type TraceScopeContextValue,
} from './context';
import type { TraceScopeConfig, TraceScopeState, ConnectionState } from '../../types/config';
import type { StreamNode, NodeMap } from '../../types/node';
import type { TreeNode } from '../../types/tree';

/**
 * Get TraceScope context value (internal hook)
 * Uses split contexts and combines them
 * @returns Combined context value
 * @throws Error if not in provider
 */
function useTraceScopeContextInternal(): TraceScopeContextValue {
  const data = useContext(TraceScopeDataContext);
  const actions = useContext(TraceScopeActionsContext);

  // Check if we're inside a provider by checking if config is set
  if (!actions.config) {
    throw new Error('useTraceScope must be used within a TraceScopeProvider');
  }

  return { ...data, ...actions };
}

/**
 * Main hook for TraceScope functionality
 * @param config - TraceScope configuration (optional, uses context if not provided)
 * @returns TraceScope state and methods
 */
export function useTraceScope(
  _config?: TraceScopeConfig
): TraceScopeState & {
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  reset: () => void;
  getNode: (nodeId: string) => StreamNode | undefined;
  toggleExpanded: (nodeId: string) => void;
} {
  // This hook is typically used within TraceScopeProvider
  const context = useTraceScopeContextInternal();

  return useMemo(() => ({
    nodes: context.nodes,
    tree: context.tree,
    connectionState: context.connectionState,
    error: context.error,
    connect: context.connect,
    disconnect: context.disconnect,
    reconnect: context.reconnect,
    reset: context.reset,
    getNode: context.getNode,
    toggleExpanded: context.toggleExpanded,
  }), [
    context.nodes,
    context.tree,
    context.connectionState,
    context.error,
    context.connect,
    context.disconnect,
    context.reconnect,
    context.reset,
    context.getNode,
    context.toggleExpanded,
  ]);
}

/**
 * Hook to get a specific node by ID
 * Uses data context only for optimal performance
 * @param nodeId - Node identifier
 * @returns Node data or undefined
 */
export function useTraceNode(nodeId: string | null | undefined): StreamNode | undefined {
  const { nodes } = useContext(TraceScopeDataContext);

  // Check if we're in a provider
  const actions = useContext(TraceScopeActionsContext);
  if (!actions.config) {
    throw new Error('useTraceNode must be used within a TraceScopeProvider');
  }

  if (!nodeId) {
    return undefined;
  }

  return nodes[nodeId];
}

/**
 * Hook to get the tree structure
 * Uses data context only for optimal performance
 * @returns Root tree node
 */
export function useTraceTree(): TreeNode | null {
  const { tree } = useContext(TraceScopeDataContext);

  // Check if we're in a provider
  const actions = useContext(TraceScopeActionsContext);
  if (!actions.config) {
    throw new Error('useTraceTree must be used within a TraceScopeProvider');
  }

  return tree;
}

/**
 * Hook to get connection state
 * Uses data context only for optimal performance
 * @returns Current connection state
 */
export function useConnectionState(): ConnectionState {
  const { connectionState } = useContext(TraceScopeDataContext);

  // Check if we're in a provider
  const actions = useContext(TraceScopeActionsContext);
  if (!actions.config) {
    throw new Error('useConnectionState must be used within a TraceScopeProvider');
  }

  return connectionState;
}

/**
 * Hook to get all nodes
 * Uses data context only for optimal performance
 * @returns Node map
 */
export function useNodes(): NodeMap {
  const { nodes } = useContext(TraceScopeDataContext);

  // Check if we're in a provider
  const actions = useContext(TraceScopeActionsContext);
  if (!actions.config) {
    throw new Error('useNodes must be used within a TraceScopeProvider');
  }

  return nodes;
}

/**
 * Hook to get error state
 * Uses data context only for optimal performance
 * @returns Current error or null
 */
export function useError(): Error | null {
  const { error } = useContext(TraceScopeDataContext);

  // Check if we're in a provider
  const actions = useContext(TraceScopeActionsContext);
  if (!actions.config) {
    throw new Error('useError must be used within a TraceScopeProvider');
  }

  return error;
}

/**
 * Hook to control connection
 * Uses actions context only for optimal performance (stable references)
 * @returns Connection control functions
 */
export function useConnection() {
  const { connect, disconnect, reconnect, reset } = useContext(TraceScopeActionsContext);

  // Check if we're in a provider
  const actions = useContext(TraceScopeActionsContext);
  if (!actions.config) {
    throw new Error('useConnection must be used within a TraceScopeProvider');
  }

  return useMemo(() => ({
    connect,
    disconnect,
    reconnect,
    reset,
  }), [connect, disconnect, reconnect, reset]);
}

/**
 * Hook for node expansion state
 * @param nodeId - Node identifier
 * @returns Expansion state and toggle function
 */
export function useNodeExpanded(nodeId: string): {
  isExpanded: boolean;
  toggle: () => void;
} {
  const { toggleExpanded } = useContext(TraceScopeActionsContext);

  // Check if we're in a provider
  const actions = useContext(TraceScopeActionsContext);
  if (!actions.config) {
    throw new Error('useNodeExpanded must be used within a TraceScopeProvider');
  }

  const [isExpanded, setIsExpanded] = useState(true);

  const toggle = useCallback(() => {
    toggleExpanded(nodeId);
    setIsExpanded(prev => !prev);
  }, [toggleExpanded, nodeId]);

  return { isExpanded, toggle };
}

/**
 * Hook for streaming status
 * Uses data context to derive streaming statistics
 * @returns Object with streaming info
 */
export function useStreamingStatus() {
  const nodes = useNodes();

  const { streamingCount, completeCount, errorCount, totalCount } = useMemo(() => {
    let streaming = 0;
    let complete = 0;
    let error = 0;

    for (const node of Object.values(nodes)) {
      if (node.status === 'streaming') streaming++;
      else if (node.status === 'complete') complete++;
      else if (node.status === 'error') error++;
    }

    return {
      streamingCount: streaming,
      completeCount: complete,
      errorCount: error,
      totalCount: Object.keys(nodes).length,
    };
  }, [nodes]);

  const isStreaming = streamingCount > 0;

  return {
    streamingCount,
    completeCount,
    errorCount,
    totalCount,
    isStreaming,
  };
}

/**
 * Hook for filtered nodes
 * Uses data context to filter nodes
 * @param options - Filter options
 * @returns Filtered node array
 */
export function useFilteredNodes(options?: {
  agentId?: string;
  nodeType?: string;
  status?: string;
  query?: string;
}): { filtered: StreamNode[]; filteredCount: number; totalCount: number } {
  const nodes = useNodes();

  // Extract to variables to avoid object property dependencies in useMemo
  const agentId = options?.agentId;
  const nodeType = options?.nodeType;
  const status = options?.status;
  const query = options?.query;

  const allNodes = useMemo(() => Object.values(nodes), [nodes]);

  const filtered = useMemo(() => {
    let result = allNodes;

    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(n =>
        n.chunk?.toLowerCase().includes(lowerQuery) ||
        n.nodeId?.toLowerCase().includes(lowerQuery)
      );
    }

    if (agentId) {
      result = result.filter(n => n.agentId === agentId);
    }

    if (nodeType) {
      result = result.filter(n => n.nodeType === nodeType);
    }

    if (status) {
      result = result.filter(n => n.status === status);
    }

    return result;
  }, [allNodes, query, agentId, nodeType, status]);

  return {
    filtered,
    filteredCount: filtered.length,
    totalCount: allNodes.length,
  };
}
