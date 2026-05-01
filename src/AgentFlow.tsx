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
  /** View mode: 'list' (card style) or 'timeline' (collapsible timeline) */
  viewMode?: 'list' | 'timeline';
  /** Whether new events are collapsed by default in timeline mode */
  defaultCollapsed?: boolean;
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
  /** Pre-serialized args for performance */
  argsJson?: string;
}

/** Format timestamp to HH:MM:SS */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

/** Copy text to clipboard with fallback for non-HTTPS */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for non-HTTPS: use textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('[AgentFlow] Failed to copy:', err);
    return false;
  }
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
  showArgs = true,
  onToggleArgs,
}: {
  event: FlowEvent;
  renderMessage?: (message: string) => React.ReactNode;
  renderResult?: (result: string) => React.ReactNode;
  showArgs?: boolean;
  onToggleArgs?: () => void;
}) {
  const time = event.timestamp ? formatTime(event.timestamp) : null;

  const handleCopy = useCallback((text: string) => {
    copyToClipboard(text);
  }, []);

  return (
    <div className={`agent-flow__event agent-flow__event--${event.type}`}>
      <EventIcon type={event.type} />
      <div className="agent-flow__event-content">
        <div className="agent-flow__event-header">
          <span className="agent-flow__event-type">{event.type}</span>
          {time && <span className="agent-flow__event-time">{time}</span>}
        </div>
        {event.message && (
          <div className="agent-flow__event-message agent-flow__markdown">
            {renderMessage ? renderMessage(event.message) : <ReactMarkdown>{event.message}</ReactMarkdown>}
          </div>
        )}
        {event.tool && (
          <div className="agent-flow__event-tool">
            <div className="agent-flow__tool-header">
              <span className="agent-flow__tool-name">{event.tool}</span>
              {event.argsJson && onToggleArgs && (
                <button
                  className="agent-flow__tool-toggle"
                  onClick={onToggleArgs}
                  type="button"
                >
                  {showArgs ? '▼' : '▶'} args
                </button>
              )}
            </div>
            {showArgs && event.argsJson && (
              <pre className="agent-flow__tool-args">
                <button
                  className="agent-flow__copy-btn"
                  onClick={() => handleCopy(event.argsJson!)}
                  title="Copy"
                  type="button"
                >
                  📋
                </button>
                {event.argsJson}
              </pre>
            )}
          </div>
        )}
        {event.result && (
          <div className="agent-flow__event-result agent-flow__markdown">
            <button
              className="agent-flow__copy-btn"
              onClick={() => handleCopy(event.result!)}
              title="Copy"
              type="button"
            >
              📋
            </button>
            {renderResult ? renderResult(event.result) : <ReactMarkdown>{event.result}</ReactMarkdown>}
          </div>
        )}
      </div>
    </div>
  );
});

/** Generate a one-line summary for the collapsed timeline view */
function getSummary(event: FlowEvent): string {
  switch (event.type) {
    case 'message':
      return event.message?.split('\n')[0]?.slice(0, 80) ?? '';
    case 'tool_call':
      return event.tool + (event.args?.path ? ` ${event.args.path}` : '');
    case 'tool_result':
      return event.result?.split('\n')[0]?.slice(0, 80) ?? '';
    case 'error':
      return event.message?.split('\n')[0]?.slice(0, 80) ?? 'Error';
    case 'thinking':
      return event.message?.split('\n')[0]?.slice(0, 80) ?? 'Thinking...';
    default:
      return event.type;
  }
}

const EVENT_DOT_COLORS: Record<FlowEvent['type'], string> = {
  start: '#3b82f6',
  thinking: '#8b5cf6',
  tool_call: '#f59e0b',
  tool_result: '#10b981',
  message: '#06b6d4',
  error: '#ef4444',
  end: '#10b981',
};

const TimelineRow = memo(function TimelineRow({
  event,
  collapsed,
  onToggle,
  renderMessage,
  renderResult,
  showArgs = true,
  onToggleArgs,
}: {
  event: FlowEvent;
  collapsed: boolean;
  onToggle: () => void;
  renderMessage?: (message: string) => React.ReactNode;
  renderResult?: (result: string) => React.ReactNode;
  showArgs?: boolean;
  onToggleArgs?: () => void;
}) {
  const time = event.timestamp ? formatTime(event.timestamp) : null;

  const handleCopy = useCallback((text: string) => {
    copyToClipboard(text);
  }, []);

  return (
    <div
      className={`agent-flow__timeline-item agent-flow__timeline-item--${event.type}${collapsed ? ' agent-flow__timeline-item--collapsed' : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onToggle();
        }
      }}
    >
      <div className="agent-flow__timeline-track">
        <span
          className="agent-flow__timeline-dot"
          style={{ background: EVENT_DOT_COLORS[event.type] }}
        />
      </div>
      <div className="agent-flow__timeline-body">
        <div className="agent-flow__timeline-header">
          <EventIcon type={event.type} />
          <span className="agent-flow__timeline-label">{event.type}</span>
          <span className="agent-flow__timeline-summary">{getSummary(event)}</span>
          {time && <span className="agent-flow__event-time">{time}</span>}
          <span className={`agent-flow__timeline-chevron${collapsed ? '' : ' agent-flow__timeline-chevron--open'}`}>
            ▶
          </span>
        </div>
        {!collapsed && (
          <div className="agent-flow__timeline-detail" onClick={e => e.stopPropagation()}>
            {event.message && (
              <div className="agent-flow__event-message agent-flow__markdown">
                {renderMessage ? renderMessage(event.message) : <ReactMarkdown>{event.message}</ReactMarkdown>}
              </div>
            )}
            {event.tool && (
              <div className="agent-flow__event-tool">
                <div className="agent-flow__tool-header">
                  <span className="agent-flow__tool-name">{event.tool}</span>
                  {event.argsJson && onToggleArgs && (
                    <button
                      className="agent-flow__tool-toggle"
                      onClick={onToggleArgs}
                      type="button"
                    >
                      {showArgs ? '▼' : '▶'} args
                    </button>
                  )}
                </div>
                {showArgs && event.argsJson && (
                  <pre className="agent-flow__tool-args">
                    <button
                      className="agent-flow__copy-btn"
                      onClick={() => handleCopy(event.argsJson!)}
                      title="Copy"
                      type="button"
                    >
                      📋
                    </button>
                    {event.argsJson}
                  </pre>
                )}
              </div>
            )}
            {event.result && (
              <div className="agent-flow__event-result agent-flow__markdown">
                <button
                  className="agent-flow__copy-btn"
                  onClick={() => handleCopy(event.result!)}
                  title="Copy"
                  type="button"
                >
                  📋
                </button>
                {renderResult ? renderResult(event.result) : <ReactMarkdown>{event.result}</ReactMarkdown>}
              </div>
            )}
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
  viewMode = 'list',
  defaultCollapsed = true,
}: AgentFlowProps) {
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [expandedArgsIds, setExpandedArgsIds] = useState<Set<number>>(new Set());
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Refs for cleanup and state tracking
  const pendingRef = useRef<FlowEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const idCounterRef = useRef(0);
  const parentRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      
      // Close EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Cancel pending RAF
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      
      // Clear pending events
      pendingRef.current = [];
    };
  }, []);

  const toggleCollapse = useCallback((id: number) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleArgs = useCallback((id: number) => {
    setExpandedArgsIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Auto-collapse new events in timeline mode
  useEffect(() => {
    if (viewMode === 'timeline' && defaultCollapsed && events.length > 0) {
      const latest = events[events.length - 1];
      if (!collapsedIds.has(latest.id)) {
        setCollapsedIds(prev => new Set(prev).add(latest.id));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  // Batching: buffer SSE messages and flush once per animation frame
  const flushPending = useCallback(() => {
    const pending = pendingRef.current;
    if (pending.length === 0) return;
    pendingRef.current = [];

    // Check if component is still mounted before updating state
    if (!isMountedRef.current) return;

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
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    handleStatusChange('connecting');

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (isMountedRef.current) {
        handleStatusChange('connected');
      }
    };

    eventSource.onmessage = (e) => {
      if (!isMountedRef.current) return;
      
      try {
        const raw = JSON.parse(e.data);
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

        // Schedule a flush if not already scheduled
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            flushPending();
          });
        }
      } catch (err) {
        console.error('[AgentFlow] Failed to parse event:', err);
        // Trigger error callback for parse errors
        if (isMountedRef.current) {
          onError?.(new Error(`Failed to parse SSE event: ${err}`));
        }
      }
    };

    eventSource.onerror = () => {
      if (!isMountedRef.current) return;
      
      handleStatusChange('error');
      const error = new Error('SSE connection failed');
      onError?.(error);
      eventSource.close();
      eventSourceRef.current = null;
    };

    return () => {
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

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, []);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBottom(!isNearBottom);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`agent-flow agent-flow--${theme}${viewMode === 'timeline' ? ' agent-flow--timeline' : ''}`}>
      {/* Header */}
      <div className="agent-flow__header">
        <span className="agent-flow__status">
          <span className={`agent-flow__status-dot agent-flow__status-dot--${status}`} />
          {status}
        </span>
        <span className="agent-flow__event-count">{events.length} events</span>
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
                  {viewMode === 'timeline' ? (
                    <TimelineRow
                      event={event}
                      collapsed={collapsedIds.has(event.id)}
                      onToggle={() => toggleCollapse(event.id)}
                      showArgs={expandedArgsIds.has(event.id)}
                      onToggleArgs={() => toggleArgs(event.id)}
                      renderMessage={renderMessage}
                      renderResult={renderResult}
                    />
                  ) : (
                    <EventRow
                      event={event}
                      showArgs={expandedArgsIds.has(event.id)}
                      onToggleArgs={() => toggleArgs(event.id)}
                      renderMessage={renderMessage}
                      renderResult={renderResult}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {showScrollBottom && events.length > 0 && (
          <button className="agent-flow__scroll-bottom" onClick={scrollToBottom} title="Scroll to bottom">
            ↓
          </button>
        )}
      </div>
    </div>
  );
}

export default AgentFlow;
