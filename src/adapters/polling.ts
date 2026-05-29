/**
 * HTTP Polling Transport Adapter
 *
 * Fallback transport when neither SSE nor WebSocket is available.
 * Uses long-polling: the server holds the connection open until new events
 * are ready, then returns them as a JSON array. The client immediately
 * re-polls after each response.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { FlowEvent, SSEStats, ConnectionDetails } from '../types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UsePollingOptions {
  /** HTTP endpoint URL for polling */
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
  /** Polling interval in ms for non-long-polling servers. Default: 1000 */
  pollInterval?: number;
  /** Request timeout in ms. Default: 30000 (long-poll) */
  timeout?: number;
  /** Custom headers for the polling request */
  headers?: Record<string, string>;
}

export interface UsePollingReturn {
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

export function usePolling({
  url,
  autoConnect,
  maxEvents,
  onError,
  onStatusChange,
  autoReconnect = true,
  maxReconnectAttempts = 10,
  pollInterval = 1000,
  timeout = 30000,
  headers,
}: UsePollingOptions): UsePollingReturn {
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
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventIdRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      manualDisconnectRef.current = true;

      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (pollTimerRef.current !== null) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
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

  /** Parse a raw event object into a FlowEvent */
  const parseEvent = useCallback((raw: Record<string, unknown>): FlowEvent | null => {
    if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string') {
      return null;
    }

    let argsJson: string | undefined;
    if (raw.args) {
      try {
        argsJson = JSON.stringify(raw.args, null, 2);
      } catch {
        argsJson = '[Unable to serialize]';
      }
    }

    return {
      ...raw,
      id: idCounterRef.current++,
      timestamp: (raw.timestamp as number) || Date.now(),
      argsJson,
    } as FlowEvent;
  }, []);

  /** Single poll request */
  const pollOnce = useCallback(async () => {
    if (manualDisconnectRef.current || !isMountedRef.current) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      ...headers,
    };
    if (lastEventIdRef.current) {
      requestHeaders['Last-Event-ID'] = lastEventIdRef.current;
    }

    // Set up request timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // The server may return a single event or an array of events
      const rawEvents: Record<string, unknown>[] = Array.isArray(data) ? data : [data];

      for (const raw of rawEvents) {
        const event = parseEvent(raw);
        if (event) {
          // Track last event ID for resumption
          if (raw.id) {
            lastEventIdRef.current = String(raw.id);
          }
          pendingRef.current.push(event);
        }
      }

      if (rafRef.current === null && pendingRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          flushPending();
        });
      }

      // On successful poll, reset reconnect counter
      if (isMountedRef.current) {
        reconnectAttemptsRef.current = 0;
        if (status !== 'connected') {
          handleStatusChange('connected');
          setConnectedAt(Date.now());
          setLastErrorMessage(null);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Intentional abort, not an error
      }
      console.error('[AgentFlow:Poll] Poll error:', err);
      if (isMountedRef.current) {
        setLastErrorMessage(err instanceof Error ? err.message : 'Poll failed');
        handleStatusChange('error');
        onError?.(err instanceof Error ? err : new Error('Poll failed'));
        scheduleReconnect();
        return; // Don't schedule next poll; reconnect will handle it
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // Schedule next poll (immediate for long-polling, interval for standard)
    if (!manualDisconnectRef.current && isMountedRef.current) {
      pollTimerRef.current = setTimeout(() => {
        pollTimerRef.current = null;
        pollOnce();
      }, pollInterval);
    }
  }, [url, headers, pollInterval, status, handleStatusChange, onError, flushPending, scheduleReconnect, parseEvent]);

  const connect = useCallback(() => {
    manualDisconnectRef.current = false;
    handleStatusChange('connecting');

    // Abort any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    pollOnce();

    return () => {
      manualDisconnectRef.current = true;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      if (pollTimerRef.current !== null) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      flushPending();
      if (isMountedRef.current) {
        handleStatusChange('disconnected');
        setConnectedAt(null);
      }
    };
  }, [handleStatusChange, flushPending, pollOnce]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
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
    /** fetch is available in all modern environments */
    isSupported: typeof fetch !== 'undefined',
    connectionDetails,
  };
}
