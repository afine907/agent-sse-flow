/**
 * TraceScope React Provider
 * Wraps application with TraceScope context and manages connection lifecycle
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  TraceScopeContext,
  TraceScopeDataContext,
  TraceScopeActionsContext,
  type TraceScopeContextValue,
  type TraceScopeDataValue,
  type TraceScopeActionsValue,
} from './context';
import { SSEManager } from '../../core/sse';
import { StateManager } from '../../core/state';
import { TreeBuilder } from '../../core/tree';
import { Renderer } from '../../core/renderer';
import type { TraceScopeConfig, ConnectionState } from '../../types/config';
import type { StreamNode, NodeMap } from '../../types/node';
import type { TreeNode } from '../../types/tree';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Partial<TraceScopeConfig> = {
  autoConnect: true,
  renderOptions: {
    debounceMs: 50,
    maxNodesBeforeDegrade: 1000,
    incremental: true,
  },
};

/**
 * TraceScope Provider Props
 */
export interface TraceScopeProviderProps {
  /**
   * TraceScope configuration
   */
  config: TraceScopeConfig;

  /**
   * Child components
   */
  children: React.ReactNode;
}

/**
 * TraceScope Provider Component
 * Provides TraceScope context to child components
 * Manages SSE connection, state, and tree building
 */
export function TraceScopeProvider({ config, children }: TraceScopeProviderProps): JSX.Element {
  // Merge with defaults
  const fullConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config } as TraceScopeConfig),
    [config]
  );

  // Refs for managers (to maintain identity across renders)
  const sseManagerRef = useRef<SSEManager | null>(null);
  const stateManagerRef = useRef<StateManager | null>(null);
  const treeBuilderRef = useRef<TreeBuilder | null>(null);
  const rendererRef = useRef<Renderer | null>(null);

  // React state for UI updates
  const [nodes, setNodes] = useState<NodeMap>({});
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Initialize managers
  useEffect(() => {
    // Create manager instances
    stateManagerRef.current = new StateManager({
      maxNodes: 1000,
      onNodeUpdate: (nodeId, node) => {
        // Trigger React state update for this node
        setNodes(prev => ({ ...prev, [nodeId]: node }));
      },
    });

    treeBuilderRef.current = new TreeBuilder();
    rendererRef.current = new Renderer(fullConfig.renderOptions);

    // Subscribe to renderer flush events
    rendererRef.current.onFlush(() => {
      // Update tree on render events
      const currentNodes = stateManagerRef.current?.getAllNodes();
      if (currentNodes && treeBuilderRef.current) {
        const newTree = treeBuilderRef.current.buildTree(currentNodes);
        setTree(newTree ?? null);
      }
    });

    // Set up SSE manager
    sseManagerRef.current = new SSEManager({
      url: fullConfig.url,
      headers: fullConfig.headers,
      queryParams: fullConfig.agentId ? { agentId: fullConfig.agentId } : undefined,
      onMessage: (message: any) => {
        // Handle message through state manager
        stateManagerRef.current?.handleMessage(message as any);

        // Update React state
        const allNodes = stateManagerRef.current?.getAllNodes() || {};
        setNodes({ ...allNodes });

        // Rebuild tree
        const newTree = treeBuilderRef.current?.buildTree(allNodes);
        setTree(newTree ?? null);

        // Schedule render
        const event = message.type === 'node_create'
          ? { type: 'created' as const, nodeId: message.data.nodeId, node: message.data }
          : { type: 'updated' as const, nodeId: message.data.nodeId, node: message.data };
        rendererRef.current?.scheduleRender(event);
      },
      onError: (err) => {
        setError(err);
        fullConfig.onError?.(err);
      },
      onStateChange: (state) => {
        setConnectionState(state);
      },
    });

    // Auto-connect if enabled
    if (fullConfig.autoConnect) {
      sseManagerRef.current.connect().catch((err) => {
        setError(err);
      });
    }

    // Cleanup on unmount
    return () => {
      sseManagerRef.current?.disconnect();
      rendererRef.current?.clear();
    };
  }, [fullConfig.url, fullConfig.headers, fullConfig.agentId, fullConfig.autoConnect]);

  // Connect function
  const connect = useCallback(async () => {
    if (sseManagerRef.current) {
      setError(null);
      await sseManagerRef.current.connect();
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    sseManagerRef.current?.disconnect();
  }, []);

  // Reconnect function
  const reconnect = useCallback(() => {
    sseManagerRef.current?.reconnect();
  }, []);

  // Reset function
  const reset = useCallback(() => {
    sseManagerRef.current?.reset();
    stateManagerRef.current?.clear();
    treeBuilderRef.current?.clear();
    setNodes({});
    setTree(null);
    setError(null);
    setExpandedNodes(new Set());
  }, []);

  // Get node function
  const getNode = useCallback((nodeId: string): StreamNode | undefined => {
    return stateManagerRef.current?.getNode(nodeId);
  }, []);

  // Toggle expanded function
  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Data context value (changes frequently with nodes, tree, connectionState, error)
  const dataValue: TraceScopeDataValue = useMemo(
    () => ({
      nodes,
      tree,
      connectionState,
      error,
    }),
    [nodes, tree, connectionState, error]
  );

  // Actions context value (stable references - only changes when config changes)
  const actionsValue: TraceScopeActionsValue = useMemo(
    () => ({
      connect,
      disconnect,
      reconnect,
      reset,
      getNode,
      toggleExpanded,
      config: fullConfig,
    }),
    [connect, disconnect, reconnect, reset, getNode, toggleExpanded, fullConfig]
  );

  // Legacy context value (for backward compatibility)
  const contextValue: TraceScopeContextValue = useMemo(
    () => ({
      ...dataValue,
      ...actionsValue,
    }),
    [dataValue, actionsValue]
  );

  return (
    <TraceScopeActionsContext.Provider value={actionsValue}>
      <TraceScopeDataContext.Provider value={dataValue}>
        <TraceScopeContext.Provider value={contextValue}>
          {children}
        </TraceScopeContext.Provider>
      </TraceScopeDataContext.Provider>
    </TraceScopeActionsContext.Provider>
  );
}
