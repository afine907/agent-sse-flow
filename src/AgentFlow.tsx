/**
 * AgentFlow - Agent SSE Stream Visualizer
 *
 * A React component for visualizing Agent execution traces.
 * Optimized for 100,000+ nodes via virtual scrolling and message batching.
 *
 * SSR-safe: gracefully degrades when EventSource is unavailable.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import './AgentFlow.css';

import type { AgentFlowProps, FlowEvent, EventType } from './types';
import { useSSE } from './useSSE';
import { EventRow, TimelineRow } from './EventRow';
import { exportToJSON, exportToCSV, copyToClipboard, EVENT_DOT_COLORS } from './utils';

export type { AgentFlowProps } from './types';
export { EventRow, TimelineRow } from './EventRow';
export { useSSE } from './useSSE';

/** All event types for filter checkboxes */
const ALL_EVENT_TYPES: EventType[] = ['start', 'thinking', 'tool_call', 'tool_result', 'message', 'error', 'end'];

/**
 * AgentFlow component
 *
 * @example
 * ```tsx
 * <AgentFlow
 *   url="http://localhost:8080/agent/stream"
 *   theme="dark"
 *   viewMode="timeline"
 *   autoReconnect
 *   className="my-custom-flow"
 * />
 * ```
 */
export function AgentFlow({
  url,
  theme = 'dark',
  autoConnect = true,
  onError,
  onStatusChange,
  maxEvents = 100_000,
  renderMessage,
  renderResult,
  viewMode = 'list',
  defaultCollapsed = true,
  autoReconnect = true,
  maxReconnectAttempts = 10,
  className,
  style,
}: AgentFlowProps) {
  const {
    filteredEvents,
    status,
    stats,
    selectedAgent,
    setSelectedAgent,
    connect,
    disconnect,
    clearEvents,
    isSupported,
  } = useSSE({ url, autoConnect, maxEvents, onError, onStatusChange, autoReconnect, maxReconnectAttempts });

  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [expandedArgsIds, setExpandedArgsIds] = useState<Set<number>>(new Set());
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FlowEvent | null>(null);
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [timeFilterOpen, setTimeFilterOpen] = useState(false);
  const [enabledTypes, setEnabledTypes] = useState<Set<EventType>>(new Set(ALL_EVENT_TYPES));
  const [showStats, setShowStats] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Search filter
  const searchFilteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return filteredEvents;
    const q = searchQuery.toLowerCase();
    return filteredEvents.filter(e =>
      e.message?.toLowerCase().includes(q) ||
      e.tool?.toLowerCase().includes(q) ||
      e.result?.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q)
    );
  }, [filteredEvents, searchQuery]);

  // Time range filter (applied after search)
  const timeFilteredEvents = useMemo(() => {
    if (!timeFrom && !timeTo) return searchFilteredEvents;
    const fromMs = timeFrom ? new Date(timeFrom).getTime() : 0;
    const toMs = timeTo ? new Date(timeTo).getTime() : Infinity;
    return searchFilteredEvents.filter(e => {
      if (!e.timestamp) return true;
      return e.timestamp >= fromMs && e.timestamp <= toMs;
    });
  }, [searchFilteredEvents, timeFrom, timeTo]);

  // Event type filter (applied after time range)
  const typeFilteredEvents = useMemo(() => {
    if (enabledTypes.size === ALL_EVENT_TYPES.length) return timeFilteredEvents;
    return timeFilteredEvents.filter(e => enabledTypes.has(e.type));
  }, [timeFilteredEvents, enabledTypes]);

  // Event type counts for stats panel
  const eventTypeCounts = useMemo(() => {
    const counts: Record<EventType, number> = {
      start: 0, thinking: 0, tool_call: 0, tool_result: 0, message: 0, error: 0, end: 0,
    };
    for (const e of filteredEvents) {
      counts[e.type]++;
    }
    return counts;
  }, [filteredEvents]);

  // Toggle event type filter
  const toggleEventType = useCallback((type: EventType) => {
    setEnabledTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // Keyboard shortcut for search; also handle Escape for modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (selectedEvent) {
          setSelectedEvent(null);
        } else if (searchOpen) {
          setSearchOpen(false);
          setSearchQuery('');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen, selectedEvent]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [exportOpen]);

  const toggleCollapse = useCallback((id: number) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleArgs = useCallback((id: number) => {
    setExpandedArgsIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    clearEvents();
    setCollapsedIds(new Set());
    setExpandedArgsIds(new Set());
  }, [clearEvents]);

  // Auto-collapse new events in timeline mode
  useEffect(() => {
    if (viewMode === 'timeline' && defaultCollapsed && typeFilteredEvents.length > 0) {
      const latest = typeFilteredEvents[typeFilteredEvents.length - 1];
      if (!collapsedIds.has(latest.id)) {
        setCollapsedIds(prev => new Set(prev).add(latest.id));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilteredEvents.length]);

  // Virtual scrolling with dynamic height measurement
  const virtualizer = useVirtualizer({
    count: typeFilteredEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const event = typeFilteredEvents[index];
      if (!event) return 80;
      // Dynamic estimate based on event type
      if (event.type === 'tool_call' && event.argsJson) {
        const lineCount = (event.argsJson.match(/\n/g)?.length ?? 0) + 1;
        return Math.min(80 + lineCount * 18, 400);
      }
      if (event.type === 'tool_result' && event.result) {
        const lineCount = (event.result.match(/\n/g)?.length ?? 0) + 1;
        return Math.min(80 + lineCount * 18, 400);
      }
      if (event.message) {
        const lineCount = (event.message.match(/\n/g)?.length ?? 0) + 1;
        return Math.min(60 + lineCount * 18, 300);
      }
      return 80;
    },
    overscan: 5,
    getItemKey: (index) => typeFilteredEvents[index]?.id ?? index,
  });

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(typeFilteredEvents.length - 1, { align: 'end' });
  }, [virtualizer, typeFilteredEvents.length]);

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

  // Determine if any filters are active
  const hasActiveFilters = searchQuery || timeFrom || timeTo || enabledTypes.size !== ALL_EVENT_TYPES.length;

  // SSR fallback
  if (!isSupported) {
    return (
      <div className={`agent-flow agent-flow--${theme} agent-flow--unsupported${className ? ` ${className}` : ''}`} style={style}>
        <div className="agent-flow__header">
          <div className="agent-flow__header-left">
            <span className="agent-flow__status">
              <span className="agent-flow__status-dot agent-flow__status-dot--error" />
              unsupported
            </span>
          </div>
        </div>
        <div className="agent-flow__events-wrapper">
          <div className="agent-flow__empty">
            EventSource is not supported in this environment.
            <br />
            Please use a browser that supports Server-Sent Events.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`agent-flow agent-flow--${theme}${viewMode === 'timeline' ? ' agent-flow--timeline' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {/* Header */}
      <div className="agent-flow__header">
        <div className="agent-flow__header-left">
          <span className="agent-flow__status">
            <span className={`agent-flow__status-dot agent-flow__status-dot--${status}`} />
            {status}
          </span>
          <span className="agent-flow__event-count">
            {hasActiveFilters ? `${typeFilteredEvents.length}/${filteredEvents.length}` : filteredEvents.length} events
          </span>
          {stats.totalCost > 0 && (
            <span className="agent-flow__cost">${stats.totalCost.toFixed(4)}</span>
          )}
          {stats.totalTokens > 0 && (
            <span className="agent-flow__tokens">{stats.totalTokens.toLocaleString()} tokens</span>
          )}
        </div>
        <div className="agent-flow__header-right">
          {/* Stats toggle */}
          <button
            className={`agent-flow__header-btn${showStats ? ' agent-flow__header-btn--active' : ''}`}
            onClick={() => setShowStats(prev => !prev)}
            title="Toggle event statistics"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>

          {/* Clear events */}
          <button
            className="agent-flow__header-btn"
            onClick={handleClear}
            title="Clear all events"
            type="button"
            disabled={filteredEvents.length === 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>

          {/* Export dropdown */}
          <div className="agent-flow__export" ref={exportRef}>
            <button
              className={`agent-flow__export-toggle${exportOpen ? ' agent-flow__export-toggle--active' : ''}`}
              onClick={() => setExportOpen(prev => !prev)}
              title="Export events"
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            {exportOpen && (
              <div className="agent-flow__export-dropdown">
                <button
                  className="agent-flow__export-option"
                  onClick={() => { exportToJSON(typeFilteredEvents); setExportOpen(false); }}
                  type="button"
                >
                  Export as JSON
                </button>
                <button
                  className="agent-flow__export-option"
                  onClick={() => { exportToCSV(typeFilteredEvents); setExportOpen(false); }}
                  type="button"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>

          {/* Search toggle */}
          <button
            className={`agent-flow__search-toggle${searchOpen ? ' agent-flow__search-toggle--active' : ''}`}
            onClick={() => {
              setSearchOpen(prev => !prev);
              if (searchOpen) setSearchQuery('');
            }}
            title="Search events (Ctrl+K)"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>

          {/* Time filter toggle */}
          <button
            className={`agent-flow__search-toggle${timeFilterOpen || timeFrom || timeTo ? ' agent-flow__search-toggle--active' : ''}`}
            onClick={() => setTimeFilterOpen(prev => !prev)}
            title="Filter by time range"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

          {stats.agents.length > 0 && (
            <select
              className="agent-flow__agent-filter"
              value={selectedAgent || ''}
              onChange={(e) => setSelectedAgent(e.target.value || null)}
            >
              <option value="">All Agents</option>
              {stats.agents.map((agent: string) => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          )}

          {status === 'connected' && (
            <button className="agent-flow__connect-btn" onClick={disconnect} type="button">
              Disconnect
            </button>
          )}
          {status === 'disconnected' && (
            <button className="agent-flow__connect-btn" onClick={connect} type="button">
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="agent-flow__search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            className="agent-flow__search-input"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span className="agent-flow__search-count">
              {typeFilteredEvents.length} matches
            </span>
          )}
          <button
            className="agent-flow__search-close"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {/* Time range filter bar */}
      {(timeFilterOpen || timeFrom || timeTo) && (
        <div className="agent-flow__time-filter">
          <span className="agent-flow__time-filter-label">Time range:</span>
          <input
            type="datetime-local"
            className="agent-flow__time-input"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
            placeholder="From"
          />
          <span className="agent-flow__time-filter-sep">to</span>
          <input
            type="datetime-local"
            className="agent-flow__time-input"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
            placeholder="To"
          />
          <button
            className="agent-flow__time-filter-clear"
            onClick={() => { setTimeFrom(''); setTimeTo(''); }}
            title="Clear time filter"
            type="button"
          >
            Clear
          </button>
        </div>
      )}

      {/* Event type filter checkboxes */}
      <div className="agent-flow__type-filter">
        {ALL_EVENT_TYPES.map(type => (
          <label key={type} className="agent-flow__type-checkbox">
            <input
              type="checkbox"
              checked={enabledTypes.has(type)}
              onChange={() => toggleEventType(type)}
            />
            <span
              className="agent-flow__type-label"
              style={{ color: EVENT_DOT_COLORS[type] }}
            >
              {type}
            </span>
          </label>
        ))}
      </div>

      {/* Statistics panel */}
      {showStats && (
        <div className="agent-flow__stats">
          <div className="agent-flow__stats-row">
            <span className="agent-flow__stats-item">
              <span className="agent-flow__stats-label">Total</span>
              <span className="agent-flow__stats-value">{filteredEvents.length}</span>
            </span>
            {ALL_EVENT_TYPES.map(type => (
              eventTypeCounts[type] > 0 && (
                <span key={type} className="agent-flow__stats-badge" style={{ background: EVENT_DOT_COLORS[type] }}>
                  {type} {eventTypeCounts[type]}
                </span>
              )
            ))}
            {stats.totalCost > 0 && (
              <span className="agent-flow__stats-item">
                <span className="agent-flow__stats-label">Cost</span>
                <span className="agent-flow__stats-value">${stats.totalCost.toFixed(4)}</span>
              </span>
            )}
            {stats.totalTokens > 0 && (
              <span className="agent-flow__stats-item">
                <span className="agent-flow__stats-label">Tokens</span>
                <span className="agent-flow__stats-value">{stats.totalTokens.toLocaleString()}</span>
              </span>
            )}
            {stats.agents.length > 0 && (
              <span className="agent-flow__stats-item">
                <span className="agent-flow__stats-label">Agents</span>
                <span className="agent-flow__stats-value">{stats.agents.length}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Events (virtualized) */}
      <div className="agent-flow__events-wrapper">
        <div ref={parentRef} className="agent-flow__events">
          {typeFilteredEvents.length === 0 ? (
            <div className="agent-flow__empty">
              {hasActiveFilters ? 'No matching events' : 'No events yet. Waiting for agent...'}
            </div>
          ) : (
            <div
              className="agent-flow__events-viewport"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const event = typeFilteredEvents[virtualRow.index];
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
                        onEventClick={setSelectedEvent}
                      />
                    ) : (
                      <EventRow
                        event={event}
                        showArgs={expandedArgsIds.has(event.id)}
                        onToggleArgs={() => toggleArgs(event.id)}
                        renderMessage={renderMessage}
                        renderResult={renderResult}
                        onEventClick={setSelectedEvent}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {showScrollBottom && typeFilteredEvents.length > 0 && (
          <button className="agent-flow__scroll-bottom" onClick={scrollToBottom} title="Scroll to bottom" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="agent-flow__modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="agent-flow__modal" onClick={(e) => e.stopPropagation()}>
            <div className="agent-flow__modal-header">
              <span className="agent-flow__modal-title">Event Detail</span>
              <div className="agent-flow__modal-actions">
                <button
                  className="agent-flow__modal-copy"
                  onClick={() => copyToClipboard(JSON.stringify(selectedEvent, null, 2))}
                  title="Copy JSON"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
                <button
                  className="agent-flow__modal-close"
                  onClick={() => setSelectedEvent(null)}
                  title="Close"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <pre className="agent-flow__modal-content">
              {JSON.stringify(selectedEvent, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentFlow;
