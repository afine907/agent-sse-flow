/**
 * TraceScope React Context
 * Split into Data and Actions contexts for optimal re-render behavior
 */

import { createContext, useContext } from 'react';
import type { TraceScopeConfig, TraceScopeState, ConnectionState } from '../../types/config';
import type { StreamNode, NodeMap } from '../../types/node';
import type { TreeNode } from '../../types/tree';

/**
 * Default stream trace state
 */
export const DEFAULT_STATE: TraceScopeState = {
  nodes: {},
  tree: null,
  connectionState: 'disconnected',
  error: null,
};

/**
 * Data Context Value - Contains frequently changing data
 */
export interface TraceScopeDataValue {
  /**
   * All nodes in the trace
   */
  nodes: NodeMap;

  /**
   * Tree structure for rendering
   */
  tree: TreeNode | null;

  /**
   * Current connection state
   */
  connectionState: ConnectionState;

  /**
   * Current error if any
   */
  error: Error | null;
}

/**
 * Actions Context Value - Contains stable action functions
 */
export interface TraceScopeActionsValue {
  /**
   * Connect to SSE endpoint
   */
  connect: () => Promise<void>;

  /**
   * Disconnect from SSE endpoint
   */
  disconnect: () => void;

  /**
   * Reconnect to SSE endpoint
   */
  reconnect: () => void;

  /**
   * Reset connection and clear data
   */
  reset: () => void;

  /**
   * Get a specific node by ID
   */
  getNode: (nodeId: string) => StreamNode | undefined;

  /**
   * Toggle node expansion
   */
  toggleExpanded: (nodeId: string) => void;

  /**
   * Current configuration
   */
  config: TraceScopeConfig | null;
}

/**
 * Combined Context Value (for backward compatibility)
 */
export interface TraceScopeContextValue extends TraceScopeDataValue, TraceScopeActionsValue {}

/**
 * Data Context - Contains frequently changing data
 * Components subscribing to this will re-render when data changes
 */
export const TraceScopeDataContext = createContext<TraceScopeDataValue>({
  nodes: {},
  tree: null,
  connectionState: 'disconnected',
  error: null,
});

/**
 * Actions Context - Contains stable action functions
 * Components subscribing to this will rarely re-render (only if config changes)
 */
export const TraceScopeActionsContext = createContext<TraceScopeActionsValue>({
  connect: async () => {},
  disconnect: () => {},
  reconnect: () => {},
  reset: () => {},
  getNode: () => undefined,
  toggleExpanded: () => {},
  config: null,
});

/**
 * Legacy Context - Kept for backward compatibility
 * @deprecated Use TraceScopeDataContext and TraceScopeActionsContext instead
 */
export const TraceScopeContext = createContext<TraceScopeContextValue>({
  ...DEFAULT_STATE,
  connect: async () => {},
  disconnect: () => {},
  reconnect: () => {},
  reset: () => {},
  getNode: () => undefined,
  toggleExpanded: () => {},
  config: null,
});

/**
 * Hook to access data context
 * Use this when you only need to read data (nodes, tree, connectionState, error)
 * This reduces unnecessary re-renders when actions are stable
 */
export function useTraceScopeData(): TraceScopeDataValue {
  return useContext(TraceScopeDataContext);
}

/**
 * Hook to access actions context
 * Use this when you only need action functions
 * This provides stable references that won't cause re-renders
 */
export function useTraceScopeActions(): TraceScopeActionsValue {
  return useContext(TraceScopeActionsContext);
}

/**
 * Custom hook to access TraceScope context
 * Returns combined value from both contexts
 * @returns Combined context value
 * @throws Error if used outside TraceScopeProvider
 */
export function useTraceScopeContext(): TraceScopeContextValue {
  const data = useContext(TraceScopeDataContext);
  const actions = useContext(TraceScopeActionsContext);

  // Check if we're inside a provider by checking if config is set
  if (!actions.config) {
    throw new Error('useTraceScope must be used within a TraceScopeProvider');
  }

  return { ...data, ...actions };
}
