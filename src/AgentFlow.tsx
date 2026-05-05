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

import type { AgentFlowProps } from './types';
import { useSSE } from './useSSE';
import { EventRow, TimelineRow } from './EventRow';

export type { AgentFlowProps } from './types';
export { EventRow, TimelineRow } from './EventRow';
export { useSSE } from './useSSE';

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
    isSupported,
  } = useSSE({ url, autoConnect, maxEvents, onError, onStatusChange, autoReconnect, maxReconnectAttempts });

  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [expandedArgsIds, setExpandedArgsIds] = useState<Set<number>>(new Set());
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Keyboard shortcut for search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

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

  // Auto-collapse new events in timeline mode
  useEffect(() => {
    if (viewMode === 'timeline' && defaultCollapsed && searchFilteredEvents.length > 0) {
      const latest = searchFilteredEvents[searchFilteredEvents.length - 1];
      if (!collapsedIds.has(latest.id)) {
        setCollapsedIds(prev => new Set(prev).add(latest.id));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilteredEvents.length]);

  // Virtual scrolling with dynamic height measurement
  const virtualizer = useVirtualizer({
    count: searchFilteredEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const event = searchFilteredEvents[index];
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
    getItemKey: (index) => searchFilteredEvents[index]?.id ?? index,
  });

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(searchFilteredEvents.length - 1, { align: 'end' });
  }, [virtualizer, searchFilteredEvents.length]);

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
            {searchQuery ? `${searchFilteredEvents.length}/${filteredEvents.length}` : filteredEvents.length} events
          </span>
          {stats.totalCost > 0 && (
            <span className="agent-flow__cost">${stats.totalCost.toFixed(4)}</span>
          )}
          {stats.totalTokens > 0 && (
            <span className="agent-flow__tokens">{stats.totalTokens.toLocaleString()} tokens</span>
          )}
        </div>
        <div className="agent-flow__header-right">
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
              {searchFilteredEvents.length} matches
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

      {/* Events (virtualized) */}
      <div className="agent-flow__events-wrapper">
        <div ref={parentRef} className="agent-flow__events">
          {searchFilteredEvents.length === 0 ? (
            <div className="agent-flow__empty">
              {searchQuery ? 'No matching events' : 'No events yet. Waiting for agent...'}
            </div>
          ) : (
            <div
              className="agent-flow__events-viewport"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const event = searchFilteredEvents[virtualRow.index];
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
        </div>
        {showScrollBottom && searchFilteredEvents.length > 0 && (
          <button className="agent-flow__scroll-bottom" onClick={scrollToBottom} title="Scroll to bottom" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default AgentFlow;
