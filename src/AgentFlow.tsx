/**
 * AgentFlow - Agent SSE Stream Visualizer
 *
 * A React component for visualizing Agent execution traces.
 * Optimized for 10,000+ nodes via virtual scrolling and message batching.
 */

import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import ReactMarkdown from 'react-markdown';
import './AgentFlow.css';

export interface AgentFlowProps {
  /** SSE endpoint URL */
  url: string;
  /** Theme: 'light' | 'dark' */
  theme?: 'light' | 'dark';
  /** Auto connect on mount */
  autoConnect?: boolean;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Connection status callback */
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  /** Max events to keep in memory (default: 10000) */
  maxEvents?: number;
  /** Custom renderer for event messages (overrides default markdown) */
  renderMessage?: (message: string) => React.ReactNode;
  /** Custom renderer for tool results (overrides default markdown) */
  renderResult?: (result: string) => React.ReactNode;
}

export interface FlowEvent {
  /** Unique event ID */
  id: number;
  /** Event type */
  type: 'start' | 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'end';
  /** Event message */
  message?: string;
  /** Tool name (for tool_call) */
  tool?: string;
  /** Tool arguments */
  args?: Record<string, unknown>;
  /** Tool result */
  result?: string;
  /** Timestamp */
  timestamp?: number;
}

/** Module-scoped icon map — never recreated */
const EVENT_ICONS: Record<FlowEvent['type'], string> = {
  start: '▶️',
  thinking: '💭',
  tool_call: '🔧',
  tool_result: '✅',
  message: '💬',
  error: '❌',
  end: '🏁',
};

const EventIcon = memo(function EventIcon({ type }: { type: FlowEvent['type'] }) {
  return <span className="agent-flow__event-icon">{EVENT_ICONS[type]}</span>;
});

const EventRow = memo(function EventRow({
  event,
  renderMessage,
  renderResult,
}: {
  event: FlowEvent;
  renderMessage?: (message: string) => React.ReactNode;
  renderResult?: (result: string) => React.ReactNode;
}) {
  return (
    <div className={`agent-flow__event agent-flow__event--${event.type}`}>
      <EventIcon type={event.type} />
      <div className="agent-flow__event-content">
        <span className="agent-flow__event-type">{event.type}</span>
        {event.message && (
          <div className="agent-flow__event-message agent-flow__markdown">
            {renderMessage ? renderMessage(event.message) : <ReactMarkdown>{event.message}</ReactMarkdown>}
          </div>
        )}
        {event.tool && (
          <div className="agent-flow__event-tool">
            <span className="agent-flow__tool-name">{event.tool}</span>
            {event.args && (
              <pre className="agent-flow__tool-args">{JSON.stringify(event.args, null, 2)}</pre>
            )}
          </div>
        )}
        {event.result && (
          <div className="agent-flow__event-result agent-flow__markdown">
            {renderResult ? renderResult(event.result) : <ReactMarkdown>{event.result}</ReactMarkdown>}
          </div>
        )}
      </div>
    </div>
  );
});

export function AgentFlow({
  url,
  theme = 'dark',
  autoConnect = true,
  onError,
  onStatusChange,
  maxEvents = 10_000,
  renderMessage,
  renderResult,
}: AgentFlowProps) {
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // Batching: buffer SSE messages and flush once per animation frame
  const pendingRef = useRef<FlowEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const idCounterRef = useRef(0);
  const parentRef = useRef<HTMLDivElement>(null);

  const flushPending = useCallback(() => {
    const pending = pendingRef.current;
    if (pending.length === 0) return;
    pendingRef.current = [];

    setEvents(prev => {
      const next = [...prev, ...pending];
      // Trim to maxEvents from the front (drop oldest)
      if (next.length > maxEvents) {
        return next.slice(next.length - maxEvents);
      }
      return next;
    });
  }, [maxEvents]);

  const handleStatusChange = useCallback((newStatus: typeof status) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const connect = useCallback(() => {
    handleStatusChange('connecting');

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      handleStatusChange('connected');
    };

    eventSource.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data);
        const event: FlowEvent = {
          ...raw,
          id: idCounterRef.current++,
          timestamp: raw.timestamp || Date.now(),
        };
        pendingRef.current.push(event);

        // Schedule a flush if not already scheduled
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            flushPending();
          });
        }
      } catch (err) {
        console.error('[AgentFlow] Failed to parse event:', err);
      }
    };

    eventSource.onerror = () => {
      handleStatusChange('error');
      const error = new Error('SSE connection failed');
      onError?.(error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      flushPending();
      handleStatusChange('disconnected');
    };
  }, [url, handleStatusChange, onError, flushPending]);

  useEffect(() => {
    if (autoConnect) {
      return connect();
    }
  }, [autoConnect, connect]);

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  return (
    <div className={`agent-flow agent-flow--${theme}`}>
      {/* Header */}
      <div className="agent-flow__header">
        <span className="agent-flow__status">
          <span className={`agent-flow__status-dot agent-flow__status-dot--${status}`} />
          {status}
        </span>
        {status === 'disconnected' && (
          <button className="agent-flow__connect-btn" onClick={connect}>
            Connect
          </button>
        )}
      </div>

      {/* Events (virtualized) */}
      <div ref={parentRef} className="agent-flow__events">
        {events.length === 0 ? (
          <div className="agent-flow__empty">No events yet. Waiting for agent...</div>
        ) : (
          <div
            className="agent-flow__events-viewport"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const event = events[virtualRow.index];
              return (
                <div
                  key={event.id}
                  className="agent-flow__event-row"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                >
                  <EventRow event={event} renderMessage={renderMessage} renderResult={renderResult} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentFlow;
