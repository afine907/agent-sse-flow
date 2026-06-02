import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { FlowEvent, SSEStats, ConnectionDetails } from './types';
import type { ParsedSSEEvent } from './sse-worker';

export type { SSEStats } from './types';

export interface UseSSEOptions {
  url: string;
  autoConnect: boolean;
  maxEvents: number;
  onError?: (error: Error) => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  /** Reconnect automatically on disconnect. Default: true */
  autoReconnect?: boolean;
  /** Max reconnect attempts. Default: 10 */
  maxReconnectAttempts?: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/** SSR-safe EventSource check (dynamic to allow test mocks) */
const checkEventSourceSupport = () => typeof EventSource !== 'undefined';

export function useSSE({
  url,
  autoConnect,
  maxEvents,
  onError,
  onStatusChange,
  autoReconnect = true,
  maxReconnectAttempts = 10,
}: UseSSEOptions) {
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);

  // Incremental stats — avoids O(n) scans on every render
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

  // Refs for cleanup and state tracking
  const pendingRef = useRef<FlowEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const idCounterRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);

  // Web Worker for off-main-thread JSON parsing
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);
  const flushPendingRef = useRef<() => void>(() => {});
  const onErrorRef = useRef(onError);

  // Cleanup on unmount + worker init
  useEffect(() => {
    isMountedRef.current = true;

    // Initialize Web Worker for JSON parsing (if supported)
    if (typeof Worker !== 'undefined') {
      try {
        const worker = new Worker(
          new URL('./sse-worker.ts', import.meta.url),
          { type: 'module' },
        );
        worker.onmessage = (e: MessageEvent) => {
          if (!isMountedRef.current) return;
          const data = e.data;
          if (data.type === 'parsed') {
            const parsed: ParsedSSEEvent = data.event;
            const event: FlowEvent = {
              id: parsed.id,
              type: parsed.type as FlowEvent['type'],
              message: parsed.message,
              tool: parsed.tool,
              args: parsed.args,
              argsJson: parsed.argsJson,
              result: parsed.result,
              timestamp: parsed.timestamp,
              agentName: parsed.agentName,
              agentColor: parsed.agentColor,
              cost: parsed.cost,
              tokens: parsed.tokens,
              duration: parsed.duration,
            };
            pendingRef.current.push(event);
            if (rafRef.current === null) {
              rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                flushPendingRef.current();
              });
            }
          } else if (data.type === 'error') {
            console.error('[AgentFlow] Worker parse error:', data.error);
            onErrorRef.current?.(new Error(`Failed to parse SSE event: ${data.error}`));
          }
        };
        worker.onerror = (err) => {
          console.error('[AgentFlow] Worker error:', err);
          workerReadyRef.current = false;
          workerRef.current = null;
        };
        workerRef.current = worker;
        workerReadyRef.current = true;
      } catch {
        // Worker not supported (e.g. in SSR or restricted environments)
        workerReadyRef.current = false;
      }
    }

    return () => {
      isMountedRef.current = false;
      manualDisconnectRef.current = true;

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        workerReadyRef.current = false;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
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

  // Batching: buffer SSE messages and flush once per animation frame
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

  // Keep worker callback refs in sync
  flushPendingRef.current = flushPending;
  onErrorRef.current = onError;

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

  /** Fallback: parse SSE JSON on the main thread */
  const parseOnMainThread = useCallback((rawData: string) => {
    try {
      const raw = JSON.parse(rawData);
      let argsJson: string | undefined;
      if (raw.args) {
        try {
          argsJson = JSON.stringify(raw.args, null, 2);
        } catch (err) {
          console.error('[AgentFlow] Failed to serialize args:', err);
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
      console.error('[AgentFlow] Failed to parse event:', err);
      if (isMountedRef.current) {
        onError?.(new Error(`Failed to parse SSE event: ${err}`));
      }
    }
  }, [flushPending, onError]);

  const connect = useCallback(() => {
    if (!checkEventSourceSupport()) {
      handleStatusChange('error');
      onError?.(new Error('EventSource is not supported in this environment'));
      return () => {};
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    manualDisconnectRef.current = false;
    handleStatusChange('connecting');

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (isMountedRef.current) {
        reconnectAttemptsRef.current = 0;
        setConnectedAt(Date.now());
        setLastErrorMessage(null);
        handleStatusChange('connected');
      }
    };

    eventSource.onmessage = (e) => {
      if (!isMountedRef.current) return;

      // Use Web Worker for JSON parsing when available
      if (workerReadyRef.current && workerRef.current) {
        try {
          workerRef.current.postMessage({ type: 'parse', raw: e.data });
        } catch (err) {
          // Fallback to main-thread parsing if worker postMessage fails
          parseOnMainThread(e.data);
        }
      } else {
        parseOnMainThread(e.data);
      }
    };

    eventSource.onerror = () => {
      if (!isMountedRef.current) return;

      handleStatusChange('error');
      setLastErrorMessage('SSE connection failed');
      setConnectedAt(null);
      const error = new Error('SSE connection failed');
      onError?.(error);
      eventSource.close();
      eventSourceRef.current = null;

      // Auto-reconnect with backoff
      scheduleReconnect();
    };

    return () => {
      manualDisconnectRef.current = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
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
  }, [url, handleStatusChange, onError, flushPending, scheduleReconnect, parseOnMainThread]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
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
    /** Whether EventSource is supported in this environment */
    isSupported: checkEventSourceSupport(),
    connectionDetails,
  };
}
