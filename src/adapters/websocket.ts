/**
 * WebSocket Transport Adapter
 *
 * Provides an alternative to SSE using WebSocket connections.
 * Implements the same event delivery semantics as useSSE:
 *   - Connect to a WebSocket endpoint
 *   - Receive JSON messages and emit FlowEvent objects
 *   - Auto-reconnect with exponential backoff
 *   - rAF batching for high-throughput streams
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { FlowEvent, SSEStats, ConnectionDetails } from '../types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWebSocketOptions {
  /** WebSocket endpoint URL (ws:// or wss://) */
  url: string;
  /** Auto connect on mount */
  autoConnect: boolean;
  /** Max events to keep in memory */
  maxEvents: number;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Connection status callback */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Reconnect automatically on disconnect. Default: true */
  autoReconnect?: boolean;
  /** Max reconnect attempts. Default: 10 */
  maxReconnectAttempts?: number;
  /** WebSocket protocols (optional) */
  protocols?: string | string[];
}

export interface UseWebSocketReturn {
  events: FlowEvent[];
  filteredEvents: FlowEvent[];
  status: ConnectionStatus;
  stats: SSEStats;
  selectedAgent: string | null;
  setSelectedAgent: (agent: string | null) => void;
  connect: () => () => void;
  disconnect: () => void;
  clearEvents: () => void;
  isSupported: boolean;
  connectionDetails: ConnectionDetails;
}

/** SSR-safe WebSocket check */
const checkWebSocketSupport = () => typeof WebSocket !== 'undefined';

export function useWebSocket({
  url,
  autoConnect,
  maxEvents,
  onError,
  onStatusChange,
  autoReconnect = true,
  maxReconnectAttempts = 10,
  protocols,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);

  // Incremental stats
  const statsRef = useRef({
    totalCost: 0,
    totalTokens: 0,
    agentCounts: new Map<string, number>(),
  });
  const [stats, setStats] = useState<SSEStats>({ totalCost: 0, totalTokens: 0, agents: [] });

  // Filter events by selected agent (memoized)
  const filteredEvents = useMemo(
    () => selectedAgent ? events.filter(e => e.agentName === selectedAgent) : events,
    [events, selectedAgent],
  );

  // Refs
  const pendingRef = useRef<FlowEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const idCounterRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      manualDisconnectRef.current = true;

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      pendingRef.current = [];
    };
  }, []);

  const handleStatusChange = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Batching: buffer messages and flush once per animation frame
  const flushPending = useCallback(() => {
    const pending = pendingRef.current;
    if (pending.length === 0) return;
    pendingRef.current = [];

    if (!isMountedRef.current) return;

    const s = statsRef.current;
    for (const e of pending) {
      s.totalCost += e.cost || 0;
      s.totalTokens += e.tokens || 0;
      if (e.agentName) {
        s.agentCounts.set(e.agentName, (s.agentCounts.get(e.agentName) || 0) + 1);
      }
    }

    setEvents(prev => {
      const next = [...prev, ...pending];
      if (next.length > maxEvents) {
        const removed = next.slice(0, next.length - maxEvents);
        for (const e of removed) {
          s.totalCost -= e.cost || 0;
          s.totalTokens -= e.tokens || 0;
          if (e.agentName) {
            const count = (s.agentCounts.get(e.agentName) || 0) - 1;
            if (count <= 0) {
              s.agentCounts.delete(e.agentName);
            } else {
              s.agentCounts.set(e.agentName, count);
            }
          }
        }
        return next.slice(next.length - maxEvents);
      }
      return next;
    });

    setStats({
      totalCost: s.totalCost,
      totalTokens: s.totalTokens,
      agents: Array.from(s.agentCounts.keys()),
    });
  }, [maxEvents]);

  // Schedule reconnect with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (!autoReconnect || manualDisconnectRef.current) return;
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      handleStatusChange('error');
      onError?.(new Error(`Max reconnect attempts (${maxReconnectAttempts}) exceeded`));
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current++;

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      if (isMountedRef.current && !manualDisconnectRef.current) {
        connect();
      }
    }, delay);
  }, [autoReconnect, maxReconnectAttempts, handleStatusChange, onError]);

  /** Parse incoming WebSocket message into a FlowEvent */
  const handleMessage = useCallback((rawData: string) => {
    try {
      const raw = JSON.parse(rawData);
      let argsJson: string | undefined;
      if (raw.args) {
        try {
          argsJson = JSON.stringify(raw.args, null, 2);
        } catch {
          argsJson = '[Unable to serialize]';
        }
      }
      const event: FlowEvent = {
        ...raw,
        id: idCounterRef.current++,
        timestamp: raw.timestamp || Date.now(),
        argsJson,
      };
      pendingRef.current.push(event);

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          flushPending();
        });
      }
    } catch (err) {
      console.error('[AgentFlow:WS] Failed to parse message:', err);
      if (isMountedRef.current) {
        onError?.(new Error(`Failed to parse WebSocket message: ${err}`));
      }
    }
  }, [flushPending, onError]);

  const connect = useCallback(() => {
    if (!checkWebSocketSupport()) {
      handleStatusChange('error');
      onError?.(new Error('WebSocket is not supported in this environment'));
      return () => {};
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    manualDisconnectRef.current = false;
    handleStatusChange('connecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(url, protocols);
    } catch (err) {
      handleStatusChange('error');
      onError?.(new Error(`Failed to create WebSocket: ${err}`));
      return () => {};
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (isMountedRef.current) {
        reconnectAttemptsRef.current = 0;
        setConnectedAt(Date.now());
        setLastErrorMessage(null);
        handleStatusChange('connected');
      }
    };

    ws.onmessage = (e) => {
      if (!isMountedRef.current) return;

      // Handle Blob data (some environments deliver Blob instead of string)
      if (e.data instanceof Blob) {
        e.data.text().then(handleMessage).catch((err) => {
          console.error('[AgentFlow:WS] Failed to read Blob:', err);
        });
      } else if (typeof e.data === 'string') {
        handleMessage(e.data);
      }
    };

    ws.onerror = () => {
      if (!isMountedRef.current) return;
      handleStatusChange('error');
      setLastErrorMessage('WebSocket connection error');
      setConnectedAt(null);
      onError?.(new Error('WebSocket connection error'));
    };

    ws.onclose = (event) => {
      if (!isMountedRef.current) return;

      if (!manualDisconnectRef.current) {
        handleStatusChange('disconnected');
        setConnectedAt(null);
        if (!event.wasClean) {
          setLastErrorMessage(`WebSocket closed unexpectedly (code: ${event.code})`);
        }
        scheduleReconnect();
      }
    };

    return () => {
      manualDisconnectRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      flushPending();
      if (isMountedRef.current) {
        handleStatusChange('disconnected');
      }
    };
  }, [url, protocols, handleStatusChange, onError, flushPending, scheduleReconnect, handleMessage]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (isMountedRef.current) {
      setConnectedAt(null);
      handleStatusChange('disconnected');
    }
  }, [handleStatusChange]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setSelectedAgent(null);
    statsRef.current = { totalCost: 0, totalTokens: 0, agentCounts: new Map() };
    setStats({ totalCost: 0, totalTokens: 0, agents: [] });
    pendingRef.current = [];
  }, []);

  useEffect(() => {
    if (autoConnect) {
      return connect();
    }
  }, [autoConnect, connect]);

  const connectionDetails: ConnectionDetails = {
    url,
    reconnectAttempts: reconnectAttemptsRef.current,
    lastErrorMessage,
    connectedAt,
  };

  return {
    events,
    filteredEvents,
    status,
    stats,
    selectedAgent,
    setSelectedAgent,
    connect,
    disconnect,
    clearEvents,
    isSupported: checkWebSocketSupport(),
    connectionDetails,
  };
}
