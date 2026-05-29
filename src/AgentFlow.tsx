/**
 * AgentFlow - Agent SSE Stream Visualizer
 *
 * A React component for visualizing Agent execution traces.
 * Optimized for 100,000+ nodes via virtual scrolling and message batching.
 *
 * SSR-safe: gracefully degrades when EventSource is unavailable.
 */

import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import './AgentFlow.css';

import type { AgentFlowProps, FlowEvent, EventType } from './types';
import { useVisibleRows } from './useVisibleRows';

/** A virtual list item: either a group header or an event */
interface GroupHeaderItem {
  kind: 'header';
  agentName: string;
  agentColor: string | undefined;
  count: number;
  key: string;
}

interface EventItem {
  kind: 'event';
  event: FlowEvent;
  key: number;
}

type VirtualListItem = GroupHeaderItem | EventItem;
import { useSSE } from './useSSE';
import { EventRow, TimelineRow } from './EventRow';
import { exportToJSON, exportToCSV, copyToClipboard, EVENT_DOT_COLORS } from './utils';

// Note: AgentFlowProps, EventRow, TimelineRow, useSSE are exported from index.ts
// This avoids duplicate re-exports that could interfere with tree-shaking

/** All event types for filter checkboxes */
const ALL_EVENT_TYPES: EventType[] = ['start', 'thinking', 'tool_call', 'tool_result', 'message', 'error', 'end'];

/**
 * Memoized EventRow wrapper that binds event-id-specific callbacks.
 * Without this, inline arrow functions in the parent would create new
 * references every render, defeating EventRow's React.memo.
 */
const MemoizedEventRow = memo(function MemoizedEventRow({
  event,
  collapsedIds,
  expandedArgsIds,
  bookmarkedIds,
  highlightedEventId,
  relativeTime,
  renderMessage,
  renderResult,
  viewMode,
  onToggleCollapse,
  onToggleArgs,
  onToggleBookmark,
  onEventClick,
}: {
  event: FlowEvent;
  collapsedIds: Set<number>;
  expandedArgsIds: Set<number>;
  bookmarkedIds: Set<number>;
  highlightedEventId: number | null;
  relativeTime: boolean;
  renderMessage?: (message: string) => React.ReactNode;
  renderResult?: (result: string) => React.ReactNode;
  viewMode: 'list' | 'timeline';
  onToggleCollapse: (id: number) => void;
  onToggleArgs: (id: number) => void;
  onToggleBookmark: (id: number) => void;
  onEventClick: (event: FlowEvent) => void;
}) {
  const handleToggle = useCallback(() => onToggleCollapse(event.id), [onToggleCollapse, event.id]);
  const handleToggleArgs = useCallback(() => onToggleArgs(event.id), [onToggleArgs, event.id]);
  const handleToggleBookmark = useCallback(() => onToggleBookmark(event.id), [onToggleBookmark, event.id]);

  if (viewMode === 'timeline') {
    return (
      <TimelineRow
        event={event}
        collapsed={collapsedIds.has(event.id)}
        onToggle={handleToggle}
        showArgs={expandedArgsIds.has(event.id)}
        onToggleArgs={handleToggleArgs}
        renderMessage={renderMessage}
        renderResult={renderResult}
        onEventClick={onEventClick}
        highlighted={highlightedEventId === event.id}
        relativeTime={relativeTime}
        bookmarked={bookmarkedIds.has(event.id)}
        onToggleBookmark={handleToggleBookmark}
      />
    );
  }

  return (
    <EventRow
      event={event}
      showArgs={expandedArgsIds.has(event.id)}
      onToggleArgs={handleToggleArgs}
      renderMessage={renderMessage}
      renderResult={renderResult}
      onEventClick={onEventClick}
      highlighted={highlightedEventId === event.id}
      relativeTime={relativeTime}
      bookmarked={bookmarkedIds.has(event.id)}
      onToggleBookmark={handleToggleBookmark}
    />
  );
});

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
    connectionDetails,
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
  const [showHelp, setShowHelp] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [relativeTime, setRelativeTime] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<number | null>(null);
  const [currentErrorNavIndex, setCurrentErrorNavIndex] = useState(0);
  const [showStatusDetails, setShowStatusDetails] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [groupByAgent, setGroupByAgent] = useState(false);
  const [collapsedAgentGroups, setCollapsedAgentGroups] = useState<Set<string>>(new Set());
  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Toggle bookmark for a specific event
  const toggleBookmark = useCallback((id: number) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Bookmark filter (applied after type filter)
  const bookmarkFilteredEvents = useMemo(() => {
    if (!showBookmarkedOnly) return typeFilteredEvents;
    return typeFilteredEvents.filter(e => bookmarkedIds.has(e.id));
  }, [typeFilteredEvents, showBookmarkedOnly, bookmarkedIds]);

  // Toggle agent group collapse
  const toggleAgentGroup = useCallback((agentName: string) => {
    setCollapsedAgentGroups(prev => {
      const next = new Set(prev);
      if (next.has(agentName)) next.delete(agentName);
      else next.add(agentName);
      return next;
    });
  }, []);

  // Build virtual list items (grouped or flat)
  const virtualListItems = useMemo((): VirtualListItem[] => {
    if (!groupByAgent || viewMode === 'timeline') return bookmarkFilteredEvents.map(e => ({ kind: 'event' as const, event: e, key: e.id }));

    // Group events by agent name, preserving order
    const groups = new Map<string, FlowEvent[]>();
    const groupOrder: string[] = [];
    for (const e of bookmarkFilteredEvents) {
      const name = e.agentName || 'Unknown Agent';
      if (!groups.has(name)) {
        groups.set(name, []);
        groupOrder.push(name);
      }
      groups.get(name)!.push(e);
    }

    // If only one group (or none), don't bother grouping
    if (groupOrder.length <= 1) {
      return bookmarkFilteredEvents.map(e => ({ kind: 'event' as const, event: e, key: e.id }));
    }

    const items: VirtualListItem[] = [];
    for (const name of groupOrder) {
      const events = groups.get(name)!;
      const agentColor = events[0]?.agentColor;
      items.push({ kind: 'header', agentName: name, agentColor, count: events.length, key: `group-${name}` });
      if (!collapsedAgentGroups.has(name)) {
        for (const e of events) {
          items.push({ kind: 'event', event: e, key: e.id });
        }
      }
    }
    return items;
  }, [bookmarkFilteredEvents, groupByAgent, viewMode, collapsedAgentGroups]);

  // Keyboard shortcut for search, help, and Escape handling
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === '?' && !searchOpen) {
        e.preventDefault();
        setShowHelp(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (showHelp) {
          setShowHelp(false);
        } else if (selectedEvent) {
          setSelectedEvent(null);
        } else if (searchOpen) {
          setSearchOpen(false);
          setSearchQuery('');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen, selectedEvent, showHelp]);

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

  // Close status details dropdown on outside click
  useEffect(() => {
    if (!showStatusDetails) return;
    const onClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setShowStatusDetails(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showStatusDetails]);

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
    setCurrentErrorNavIndex(0);
    setHighlightedEventId(null);
    setBookmarkedIds(new Set());
    setShowBookmarkedOnly(false);
    setGroupByAgent(false);
    setCollapsedAgentGroups(new Set());
  }, [clearEvents]);

  // Cleanup highlight timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // Auto-collapse new events in timeline mode
  useEffect(() => {
    if (viewMode === 'timeline' && defaultCollapsed && bookmarkFilteredEvents.length > 0) {
      const latest = bookmarkFilteredEvents[bookmarkFilteredEvents.length - 1];
      if (!collapsedIds.has(latest.id)) {
        setCollapsedIds(prev => new Set(prev).add(latest.id));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkFilteredEvents.length]);

  // Track scroll position to disable auto-scroll when user scrolls up
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBottom(!isNearBottom);
      if (!isNearBottom && autoScroll) {
        setAutoScroll(false);
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScroll]);

  // Virtual scrolling with dynamic height measurement
  const virtualizer = useVirtualizer({
    count: virtualListItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = virtualListItems[index];
      if (!item) return 80;
      // Group headers are shorter
      if (item.kind === 'header') return 36;
      const event = item.event;
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
    getItemKey: (index) => {
      const item = virtualListItems[index];
      if (!item) return index;
      return item.key;
    },
  });

  // IntersectionObserver: track which rows have entered the viewport.
  // Rows that haven't been scrolled into view yet render a lightweight
  // placeholder instead of the full EventRow / TimelineRow. This reduces
  // the cost of rendering expensive content (e.g. ReactMarkdown) for
  // rows at the edges of the overscan buffer.
  const { measureRef, isVisible } = useVisibleRows(parentRef);

  // Combined ref callback: measures the element for the virtualizer AND
  // registers it with the IntersectionObserver.
  const rowRef = useCallback(
    (element: HTMLDivElement | null) => {
      virtualizer.measureElement(element);
      measureRef(element);
    },
    [virtualizer, measureRef],
  );

  // Auto-scroll to bottom when new events arrive (if enabled)
  useEffect(() => {
    if (autoScroll && virtualListItems.length > 0) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(virtualListItems.length - 1, { align: 'end' });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualListItems.length, autoScroll]);

  // Scroll to bottom (also re-enables auto-scroll)
  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
    virtualizer.scrollToIndex(virtualListItems.length - 1, { align: 'end' });
  }, [virtualizer, virtualListItems.length]);

  // Track error event indices for jump navigation (indices into virtualListItems)
  const errorIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < virtualListItems.length; i++) {
      const item = virtualListItems[i];
      if (item.kind === 'event' && item.event.type === 'error') {
        indices.push(i);
      }
    }
    return indices;
  }, [virtualListItems]);

  // Jump to next error event
  const jumpToNextError = useCallback(() => {
    if (errorIndices.length === 0) return;
    const nextIdx = currentErrorNavIndex % errorIndices.length;
    const itemIndex = errorIndices[nextIdx];
    virtualizer.scrollToIndex(itemIndex, { align: 'center' });
    const item = virtualListItems[itemIndex];
    if (item && item.kind === 'event') {
      setHighlightedEventId(item.event.id);
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = setTimeout(() => setHighlightedEventId(null), 2000);
    }
    setCurrentErrorNavIndex(prev => prev + 1);
  }, [errorIndices, currentErrorNavIndex, virtualizer, virtualListItems]);


  // Determine if any filters are active (memoized)
  const hasActiveFilters = useMemo(
    () => searchQuery || timeFrom || timeTo || enabledTypes.size !== ALL_EVENT_TYPES.length || showBookmarkedOnly,
    [searchQuery, timeFrom, timeTo, enabledTypes, showBookmarkedOnly],
  );

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
          <div className="agent-flow__status-wrapper" ref={statusRef}>
            <button
              className={`agent-flow__status agent-flow__status--clickable${showStatusDetails ? ' agent-flow__status--active' : ''}`}
              onClick={() => setShowStatusDetails(prev => !prev)}
              title="Connection details"
              type="button"
            >
              <span className={`agent-flow__status-dot agent-flow__status-dot--${status}`} />
              {status}
            </button>
            {showStatusDetails && (
              <div className="agent-flow__status-dropdown">
                <div className="agent-flow__status-detail-row">
                  <span className="agent-flow__status-detail-label">URL</span>
                  <span className="agent-flow__status-detail-value agent-flow__status-detail-value--mono">{connectionDetails.url}</span>
                </div>
                <div className="agent-flow__status-detail-row">
                  <span className="agent-flow__status-detail-label">Status</span>
                  <span className="agent-flow__status-detail-value">
                    <span className={`agent-flow__status-dot agent-flow__status-dot--${status}`} style={{ display: 'inline-block', width: 6, height: 6, marginRight: 4 }} />
                    {status}
                  </span>
                </div>
                {connectionDetails.connectedAt && (
                  <div className="agent-flow__status-detail-row">
                    <span className="agent-flow__status-detail-label">Connected</span>
                    <span className="agent-flow__status-detail-value">{new Date(connectionDetails.connectedAt).toLocaleTimeString()}</span>
                  </div>
                )}
                {connectionDetails.reconnectAttempts > 0 && (
                  <div className="agent-flow__status-detail-row">
                    <span className="agent-flow__status-detail-label">Reconnects</span>
                    <span className="agent-flow__status-detail-value">{connectionDetails.reconnectAttempts}</span>
                  </div>
                )}
                {connectionDetails.lastErrorMessage && (
                  <div className="agent-flow__status-detail-row">
                    <span className="agent-flow__status-detail-label">Last Error</span>
                    <span className="agent-flow__status-detail-value agent-flow__status-detail-value--error">{connectionDetails.lastErrorMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <span className="agent-flow__event-count">
            {hasActiveFilters ? `${bookmarkFilteredEvents.length}/${filteredEvents.length}` : filteredEvents.length} events
          </span>
          {bookmarkedIds.size > 0 && (
            <span className="agent-flow__bookmark-count">
              {bookmarkedIds.size} bookmarked
            </span>
          )}
          {stats.totalCost > 0 && (
            <span className="agent-flow__cost">${stats.totalCost.toFixed(4)}</span>
          )}
          {stats.totalTokens > 0 && (
            <span className="agent-flow__tokens">{stats.totalTokens.toLocaleString()} tokens</span>
          )}
        </div>
        <div className="agent-flow__header-right">
          {/* Bookmark filter toggle */}
          {bookmarkedIds.size > 0 && (
            <button
              className={`agent-flow__header-btn${showBookmarkedOnly ? ' agent-flow__header-btn--active' : ''}`}
              onClick={() => setShowBookmarkedOnly(prev => !prev)}
              title={showBookmarkedOnly ? 'Show all events' : 'Show bookmarked only'}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={showBookmarkedOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )}

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

          {/* Help toggle */}
          <button
            className={`agent-flow__header-btn${showHelp ? ' agent-flow__header-btn--active' : ''}`}
            onClick={() => setShowHelp(prev => !prev)}
            title="Keyboard shortcuts (?)"
            type="button"
          >
            ?
          </button>

          {/* Jump to Next Error */}
          {errorIndices.length > 0 && (
            <button
              className="agent-flow__jump-error-btn"
              onClick={jumpToNextError}
              title={`Jump to next error (${errorIndices.length} errors, ${currentErrorNavIndex % errorIndices.length + 1}/${errorIndices.length})`}
              type="button"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errorIndices.length}
            </button>
          )}

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

          {/* Relative time toggle */}
          <button
            className={`agent-flow__header-btn${relativeTime ? ' agent-flow__header-btn--active' : ''}`}
            onClick={() => setRelativeTime(prev => !prev)}
            title={relativeTime ? 'Showing relative time' : 'Showing absolute time'}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
              <line x1="4" y1="4" x2="20" y2="20" />
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

          {/* Group by agent toggle (only shown when multiple agents exist and in list view) */}
          {stats.agents.length > 1 && viewMode === 'list' && (
            <button
              className={`agent-flow__header-btn${groupByAgent ? ' agent-flow__header-btn--active' : ''}`}
              onClick={() => setGroupByAgent(prev => !prev)}
              title={groupByAgent ? 'Show flat list' : 'Group by agent'}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
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
          {virtualListItems.length === 0 ? (
            <div className="agent-flow__empty">
              {hasActiveFilters ? 'No matching events' : 'No events yet. Waiting for agent...'}
            </div>
          ) : (
            <div
              className="agent-flow__events-viewport"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const item = virtualListItems[virtualRow.index];
                if (!item) return null;

                // Render group header
                if (item.kind === 'header') {
                  return (
                    <div
                      key={item.key}
                      className="agent-flow__event-row"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      data-index={virtualRow.index}
                      ref={rowRef}
                    >
                      <button
                        className="agent-flow__group-header"
                        onClick={() => toggleAgentGroup(item.agentName)}
                        type="button"
                      >
                        <span
                          className="agent-flow__group-dot"
                          style={{ background: item.agentColor || 'var(--af-accent)' }}
                        />
                        <span className="agent-flow__group-name">{item.agentName}</span>
                        <span className="agent-flow__group-count">{item.count}</span>
                        <span className={`agent-flow__group-chevron${collapsedAgentGroups.has(item.agentName) ? '' : ' agent-flow__group-chevron--open'}`}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  );
                }

                // Render event — full content only when the row has been
                // scrolled into the viewport; otherwise render a lightweight
                // placeholder to avoid expensive markdown / layout work.
                const event = item.event;
                const visible = isVisible(virtualRow.index);
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
                    ref={rowRef}
                  >
                    {visible ? (
                      <MemoizedEventRow
                        event={event}
                        collapsedIds={collapsedIds}
                        expandedArgsIds={expandedArgsIds}
                        bookmarkedIds={bookmarkedIds}
                        highlightedEventId={highlightedEventId}
                        relativeTime={relativeTime}
                        renderMessage={renderMessage}
                        renderResult={renderResult}
                        viewMode={viewMode}
                        onToggleCollapse={toggleCollapse}
                        onToggleArgs={toggleArgs}
                        onToggleBookmark={toggleBookmark}
                        onEventClick={setSelectedEvent}
                      />
                    ) : (
                      <div className="agent-flow__row-placeholder" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {virtualListItems.length > 0 && (
          <div className="agent-flow__scroll-controls">
            <button
              className={`agent-flow__auto-scroll-btn${autoScroll ? ' agent-flow__auto-scroll-btn--active' : ''}`}
              onClick={() => setAutoScroll(prev => !prev)}
              title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {autoScroll ? (
                  <>
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </>
                ) : (
                  <>
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </>
                )}
              </svg>
            </button>
            {showScrollBottom && (
              <button className="agent-flow__scroll-bottom" onClick={scrollToBottom} title="Scroll to bottom" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
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

      {/* Keyboard Shortcuts Help Overlay */}
      {showHelp && (
        <div className="agent-flow__modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="agent-flow__help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="agent-flow__modal-header">
              <span className="agent-flow__modal-title">Keyboard Shortcuts</span>
              <button
                className="agent-flow__modal-close"
                onClick={() => setShowHelp(false)}
                title="Close"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="agent-flow__help-content">
              <div className="agent-flow__help-row">
                <span className="agent-flow__help-keys">
                  <kbd>Ctrl</kbd><span>+</span><kbd>K</kbd>
                </span>
                <span className="agent-flow__help-desc">Search events</span>
              </div>
              <div className="agent-flow__help-row">
                <span className="agent-flow__help-keys">
                  <kbd>?</kbd>
                </span>
                <span className="agent-flow__help-desc">Toggle this help panel</span>
              </div>
              <div className="agent-flow__help-row">
                <span className="agent-flow__help-keys">
                  <kbd>Esc</kbd>
                </span>
                <span className="agent-flow__help-desc">Close panels</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentFlow;
