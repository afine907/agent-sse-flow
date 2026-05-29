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

import type { AgentFlowProps, FlowEvent, EventType, ViewMode } from './types';
import { useVisibleRows } from './useVisibleRows';
import { createT } from './i18n';
import { playErrorSound, playConnectedSound, playDisconnectedSound, playSearchCompleteSound } from './sounds';

/** A virtual list item: either a group header or an event */
interface GroupHeaderItem {
  kind: 'header';
  agentName: string;
  agentColor: string | undefined;
  agentAvatar: string | undefined;
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
import { EventRow, TimelineRow, AgentAvatar, WaterfallBar } from './EventRow';
import { DAGView } from './DAGView';
import { SwimlaneView } from './SwimlaneView';
import { exportToJSON, exportToCSV, copyToClipboard, generateCurlCommand, EVENT_DOT_COLORS, formatTime } from './utils';
import { analyzePerformance } from './perf-analyze';

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
  viewMode: ViewMode;
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
  customTheme,
  locale = 'en',
  enableSounds = false,
}: AgentFlowProps) {
  const t = useMemo(() => createT(locale), [locale]);
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
  const [compact, setCompact] = useState(false);
  const [agentOrder, setAgentOrder] = useState<string[]>([]);
  const [dragOverAgent, setDragOverAgent] = useState<string | null>(null);
  const dragAgentRef = useRef<string | null>(null);
  const [showTokenChart, setShowTokenChart] = useState(false);
  const [showCostDashboard, setShowCostDashboard] = useState(false);
  const [showPerf, setShowPerf] = useState(false);
  // Merge customTheme CSS variable overrides with the user-supplied style prop
  const mergedStyle = useMemo(
    () => (customTheme ? { ...style, ...customTheme } : style),
    [style, customTheme],
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [agentFilterOpen, setAgentFilterOpen] = useState(false);
  const agentFilterRef = useRef<HTMLDivElement>(null);
  const [componentHeight, setComponentHeight] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; event: FlowEvent } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

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

  // Map of agent name -> { avatar, color } for the filter dropdown
  const agentInfoMap = useMemo(() => {
    const map = new Map<string, { avatar?: string; color?: string }>();
    for (const e of filteredEvents) {
      if (e.agentName && !map.has(e.agentName)) {
        map.set(e.agentName, { avatar: e.agentAvatar, color: e.agentColor });
      }
    }
    return map;
  }, [filteredEvents]);

  // Performance bottleneck analysis (memoized, re-runs when events change)
  const perfResult = useMemo(
    () => (showPerf ? analyzePerformance(filteredEvents) : null),
    [filteredEvents, showPerf],
  );

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

  // Sync agentOrder when new agents appear
  const orderedAgents = useMemo(() => {
    const known = stats.agents;
    if (agentOrder.length === 0) return known;
    // Merge: keep existing order, append new agents at the end
    const seen = new Set(agentOrder);
    const merged = [...agentOrder.filter(a => known.includes(a))];
    for (const a of known) {
      if (!seen.has(a)) merged.push(a);
    }
    return merged;
  }, [stats.agents, agentOrder]);

  // Drag handlers for agent reordering
  const handleDragStart = useCallback((agent: string, e: React.DragEvent) => {
    dragAgentRef.current = agent;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', agent);
    const el = e.currentTarget as HTMLElement;
    el.classList.add('agent-flow__agent-dragging');
  }, []);

  const handleDragOver = useCallback((agent: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverAgent(agent);
  }, []);

  const handleDrop = useCallback((targetAgent: string, e: React.DragEvent) => {
    e.preventDefault();
    const sourceAgent = dragAgentRef.current;
    if (!sourceAgent || sourceAgent === targetAgent) {
      setDragOverAgent(null);
      return;
    }
    setAgentOrder(prev => {
      const current = prev.length > 0 ? [...prev] : [...orderedAgents];
      const fromIdx = current.indexOf(sourceAgent);
      const toIdx = current.indexOf(targetAgent);
      if (fromIdx === -1 || toIdx === -1) return prev.length > 0 ? prev : [];
      current.splice(fromIdx, 1);
      current.splice(toIdx, 0, sourceAgent);
      return current;
    });
    setDragOverAgent(null);
    dragAgentRef.current = null;
  }, [orderedAgents]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('agent-flow__agent-dragging');
    setDragOverAgent(null);
    dragAgentRef.current = null;
  }, []);

  // Build virtual list items (grouped or flat)
  const virtualListItems = useMemo((): VirtualListItem[] => {
    if (!groupByAgent || viewMode === 'timeline' || viewMode === 'waterfall' || viewMode === 'dag' || viewMode === 'swimlane') {
      return bookmarkFilteredEvents.map(e => ({ kind: 'event' as const, event: e, key: e.id }));
    }

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

    // Apply user-defined agent order if set
    if (orderedAgents.length > 0 && agentOrder.length > 0) {
      const reordered: string[] = [];
      for (const a of orderedAgents) {
        if (groups.has(a)) reordered.push(a);
      }
      // Append any agents not in orderedAgents (e.g. new ones that appeared)
      for (const name of groupOrder) {
        if (!reordered.includes(name)) reordered.push(name);
      }
      groupOrder.length = 0;
      groupOrder.push(...reordered);
    }

    // If only one group (or none), don't bother grouping
    if (groupOrder.length <= 1) {
      return bookmarkFilteredEvents.map(e => ({ kind: 'event' as const, event: e, key: e.id }));
    }

    const items: VirtualListItem[] = [];
    for (const name of groupOrder) {
      const events = groups.get(name)!;
      const agentColor = events[0]?.agentColor;
      const agentAvatar = events[0]?.agentAvatar;
      items.push({ kind: 'header', agentName: name, agentColor, agentAvatar, count: events.length, key: `group-${name}` });
      if (!collapsedAgentGroups.has(name)) {
        for (const e of events) {
          items.push({ kind: 'event', event: e, key: e.id });
        }
      }
    }
    return items;
  }, [bookmarkFilteredEvents, groupByAgent, viewMode, collapsedAgentGroups, orderedAgents, agentOrder]);

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

  // Close agent filter dropdown on outside click
  useEffect(() => {
    if (!agentFilterOpen) return;
    const onClick = (e: MouseEvent) => {
      if (agentFilterRef.current && !agentFilterRef.current.contains(e.target as Node)) {
        setAgentFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [agentFilterOpen]);

  // Resizable component height via bottom drag handle
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startY = e.clientY;
    const startHeight = rootRef.current?.offsetHeight ?? 400;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = ev.clientY - startY;
      const newHeight = Math.max(200, startHeight + delta);
      setComponentHeight(newHeight);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // Touch swipe handling for mobile
  const touchState = useRef<{ startX: number; startY: number }>({
    startX: 0, startY: 0,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchState.current = { startX: touch.clientX, startY: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchState.current.startX;
    const dy = touch.clientY - touchState.current.startY;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      // Swipe gesture detected
    }
    touchState.current = { startX: 0, startY: 0 };
  }, []);

  // Context menu handler for event rows
  const handleContextMenu = useCallback((e: React.MouseEvent, event: FlowEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, event });
  }, []);

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!contextMenu) return;
    const onClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const onScroll = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

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
    setAgentOrder([]);
  }, [clearEvents]);

  // Cleanup highlight timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // Sound feedback: play on error events
  useEffect(() => {
    if (!enableSounds) return;
    const lastEvent = filteredEvents[filteredEvents.length - 1];
    if (lastEvent?.type === 'error') {
      playErrorSound();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents.length, enableSounds]);

  // Sound feedback: play on connection status change
  useEffect(() => {
    if (!enableSounds) return;
    if (status === 'connected') {
      playConnectedSound();
    } else if (status === 'disconnected' || status === 'error') {
      playDisconnectedSound();
    }
  }, [status, enableSounds]);

  // Sound feedback: play when search completes with results
  useEffect(() => {
    if (!enableSounds || !searchQuery.trim()) return;
    // Small delay to avoid playing on every keystroke
    const timer = setTimeout(() => {
      playSearchCompleteSound();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, enableSounds]);

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

  // Waterfall view: compute time range for positioning bars
  const waterfallTimeRange = useMemo(() => {
    const eventsWithTime = bookmarkFilteredEvents.filter(e => e.timestamp);
    if (eventsWithTime.length === 0) return { startTime: 0, totalDuration: 0 };
    const startTime = eventsWithTime[0].timestamp!;
    const lastEvent = eventsWithTime[eventsWithTime.length - 1];
    const endTime = lastEvent.timestamp! + (lastEvent.duration ?? 0);
    const totalDuration = Math.max(endTime - startTime, 1);
    return { startTime, totalDuration };
  }, [bookmarkFilteredEvents]);

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
      <div className={`agent-flow agent-flow--${theme} agent-flow--unsupported${className ? ` ${className}` : ''}`} style={mergedStyle}>
        <div className="agent-flow__header">
          <div className="agent-flow__header-left">
            <span className="agent-flow__status">
              <span className="agent-flow__status-dot agent-flow__status-dot--error" />
              {t('status.unsupported')}
            </span>
          </div>
        </div>
        <div className="agent-flow__events-wrapper">
          <div className="agent-flow__empty">
            {t('empty.unsupported')}
          </div>
        </div>
      </div>
    );
  }

  const rootStyle = useMemo(
    () => ({
      ...mergedStyle,
      ...(componentHeight !== null ? { height: componentHeight } : {}),
    }),
    [mergedStyle, componentHeight],
  );

  return (
    <div
      ref={rootRef}
      className={`agent-flow agent-flow--${theme}${viewMode === 'timeline' ? ' agent-flow--timeline' : ''}${compact ? ' agent-flow--compact' : ''}${className ? ` ${className}` : ''}`}
      style={rootStyle}
    >
      {/* Header */}
      <div className="agent-flow__header">
        <div className="agent-flow__header-left">
          <div className="agent-flow__status-wrapper" ref={statusRef}>
            <button
              className={`agent-flow__status agent-flow__status--clickable${showStatusDetails ? ' agent-flow__status--active' : ''}`}
              onClick={() => setShowStatusDetails(prev => !prev)}
              title={t('header.connectionDetails')}
              type="button"
              aria-label={`Connection status: ${status}`}
              aria-expanded={showStatusDetails}
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
          <span className="agent-flow__event-count" aria-live="polite" aria-label={t('header.eventCount')}>
            {hasActiveFilters ? `${bookmarkFilteredEvents.length}/${filteredEvents.length}` : filteredEvents.length} {t('header.events')}
          </span>
          {bookmarkedIds.size > 0 && (
            <span className="agent-flow__bookmark-count">
              {bookmarkedIds.size} {t('header.bookmarked')}
            </span>
          )}
          {stats.totalCost > 0 && (
            <span className="agent-flow__cost">${stats.totalCost.toFixed(4)}</span>
          )}
          {stats.totalTokens > 0 && (
            <span className="agent-flow__tokens">{stats.totalTokens.toLocaleString()} tokens</span>
          )}
        </div>
        <div className="agent-flow__header-right" role="toolbar" aria-label="Event controls">
          {/* Bookmark filter toggle */}
          {bookmarkedIds.size > 0 && (
            <button
              className={`agent-flow__header-btn${showBookmarkedOnly ? ' agent-flow__header-btn--active' : ''}`}
              onClick={() => setShowBookmarkedOnly(prev => !prev)}
              title={showBookmarkedOnly ? 'Show all events' : 'Show bookmarked only'}
              type="button"
              aria-label={showBookmarkedOnly ? 'Show all events' : 'Show bookmarked only'}
              aria-pressed={showBookmarkedOnly}
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
            title={t('header.toggleStats')}
            type="button"
            aria-label={t('header.toggleStats')}
            aria-pressed={showStats}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>

          {/* Token chart toggle */}
          {(stats.totalTokens > 0 || stats.totalCost > 0) && (
            <button
              className={`agent-flow__header-btn${showTokenChart ? ' agent-flow__header-btn--active' : ''}`}
              onClick={() => setShowTokenChart(prev => !prev)}
              title="Toggle token usage chart"
              type="button"
              aria-label="Toggle token usage chart"
              aria-pressed={showTokenChart}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </button>
          )}

          {/* Cost dashboard toggle */}
          {stats.totalCost > 0 && (
            <button
              className={`agent-flow__header-btn${showCostDashboard ? ' agent-flow__header-btn--active' : ''}`}
              onClick={() => setShowCostDashboard(prev => !prev)}
              title="Toggle cost dashboard"
              type="button"
              aria-label="Toggle cost dashboard"
              aria-pressed={showCostDashboard}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </button>
          )}

          {/* Performance analysis toggle */}
          {filteredEvents.length > 0 && (
            <button
              className={`agent-flow__header-btn${showPerf ? ' agent-flow__header-btn--active' : ''}`}
              onClick={() => setShowPerf(prev => !prev)}
              title="Toggle performance analysis"
              type="button"
              aria-label="Toggle performance analysis"
              aria-pressed={showPerf}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </button>
          )}

          {/* Compact view toggle */}
          <button
            className={`agent-flow__header-btn${compact ? ' agent-flow__header-btn--active' : ''}`}
            onClick={() => setCompact(prev => !prev)}
            title={compact ? t('header.normalView') : t('header.compactView')}
            type="button"
            aria-label={compact ? t('header.normalView') : t('header.compactView')}
            aria-pressed={compact}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="21" y1="18" x2="3" y2="18" />
            </svg>
          </button>

          {/* Clear events */}
          <button
            className="agent-flow__header-btn"
            onClick={handleClear}
            title={t('header.clearAll')}
            type="button"
            disabled={filteredEvents.length === 0}
            aria-label={t('header.clearAll')}
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
              title={t('header.export')}
              type="button"
              aria-label={t('header.export')}
              aria-expanded={exportOpen}
              aria-haspopup="menu"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            {exportOpen && (
              <div className="agent-flow__export-dropdown" role="menu">
                <button
                  className="agent-flow__export-option"
                  onClick={() => { exportToJSON(typeFilteredEvents); setExportOpen(false); }}
                  type="button"
                  role="menuitem"
                  aria-label={t('export.asJSON')}
                >
                  {t('export.asJSON')}
                </button>
                <button
                  className="agent-flow__export-option"
                  onClick={() => { exportToCSV(typeFilteredEvents); setExportOpen(false); }}
                  type="button"
                  role="menuitem"
                  aria-label={t('export.asCSV')}
                >
                  {t('export.asCSV')}
                </button>
              </div>
            )}
          </div>

          {/* Help toggle */}
          <button
            className={`agent-flow__header-btn${showHelp ? ' agent-flow__header-btn--active' : ''}`}
            onClick={() => setShowHelp(prev => !prev)}
            title={t('header.keyboardShortcuts') + ' (?)'}
            type="button"
            aria-label={t('header.keyboardShortcuts')}
            aria-pressed={showHelp}
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
              aria-label={`Jump to next error (${errorIndices.length} errors)`}
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
            title={t('header.searchEvents') + ' (Ctrl+K)'}
            type="button"
            aria-label={t('header.searchEvents')}
            aria-pressed={searchOpen}
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
            title={t('header.filterByTime')}
            type="button"
            aria-label={t('header.filterByTime')}
            aria-pressed={timeFilterOpen || !!timeFrom || !!timeTo}
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
            title={relativeTime ? t('header.relativeTime') : t('header.absoluteTime')}
            type="button"
            aria-label={relativeTime ? t('header.relativeTime') : t('header.absoluteTime')}
            aria-pressed={relativeTime}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
              <line x1="4" y1="4" x2="20" y2="20" />
            </svg>
          </button>

          {stats.agents.length > 0 && (
            <div className="agent-flow__agent-filter" ref={agentFilterRef}>
              <button
                className={`agent-flow__agent-filter-toggle${agentFilterOpen ? ' agent-flow__agent-filter-toggle--active' : ''}`}
                onClick={() => setAgentFilterOpen(prev => !prev)}
                type="button"
                aria-label={selectedAgent ? `${t('action.filterByAgent')}: ${selectedAgent}` : t('header.allAgents')}
                aria-expanded={agentFilterOpen}
                aria-haspopup="listbox"
              >
                {selectedAgent ? (
                  <span className="agent-flow__agent-filter-selected">
                    <AgentAvatar
                      avatar={agentInfoMap.get(selectedAgent)?.avatar}
                      name={selectedAgent}
                      color={agentInfoMap.get(selectedAgent)?.color}
                      size={14}
                    />
                    {selectedAgent}
                  </span>
                ) : (
                  'All Agents'
                )}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {agentFilterOpen && (
                <div className="agent-flow__agent-filter-dropdown" role="listbox" aria-label="Select agent filter">
                  <button
                    className={`agent-flow__agent-filter-option${!selectedAgent ? ' agent-flow__agent-filter-option--active' : ''}`}
                    onClick={() => { setSelectedAgent(null); setAgentFilterOpen(false); }}
                    type="button"
                  >
                    All Agents
                  </button>
                  {orderedAgents.map((agent: string) => {
                    const info = agentInfoMap.get(agent);
                    return (
                      <div
                        key={agent}
                        className={`agent-flow__agent-filter-option${selectedAgent === agent ? ' agent-flow__agent-filter-option--active' : ''}${dragOverAgent === agent ? ' agent-flow__agent-filter-option--drag-over' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(agent, e)}
                        onDragOver={(e) => handleDragOver(agent, e)}
                        onDrop={(e) => handleDrop(agent, e)}
                        onDragEnd={handleDragEnd}
                        onClick={() => { setSelectedAgent(agent); setAgentFilterOpen(false); }}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="agent-flow__drag-handle" title="Drag to reorder">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="8" cy="4" r="2" />
                            <circle cx="16" cy="4" r="2" />
                            <circle cx="8" cy="12" r="2" />
                            <circle cx="16" cy="12" r="2" />
                            <circle cx="8" cy="20" r="2" />
                            <circle cx="16" cy="20" r="2" />
                          </svg>
                        </span>
                        <AgentAvatar
                          avatar={info?.avatar}
                          name={agent}
                          color={info?.color}
                          size={16}
                        />
                        {agent}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Group by agent toggle (only shown when multiple agents exist and in list view) */}
          {stats.agents.length > 1 && (viewMode === 'list' || viewMode === 'waterfall') && (
            <button
              className={`agent-flow__header-btn${groupByAgent ? ' agent-flow__header-btn--active' : ''}`}
              onClick={() => setGroupByAgent(prev => !prev)}
              title={groupByAgent ? t('header.flatList') : t('header.groupByAgent')}
              type="button"
              aria-label={groupByAgent ? t('header.flatList') : t('header.groupByAgent')}
              aria-pressed={groupByAgent}
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
            <button className="agent-flow__connect-btn" onClick={disconnect} type="button" aria-label={t('header.disconnect')}>
              {t('header.disconnect')}
            </button>
          )}
          {status === 'disconnected' && (
            <button className="agent-flow__connect-btn" onClick={connect} type="button" aria-label={t('header.connect')}>
              {t('header.connect')}
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="agent-flow__search-bar" role="search" aria-label="Search events">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            className="agent-flow__search-input"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('header.searchEvents')}
          />
          {searchQuery && (
            <span className="agent-flow__search-count" aria-live="polite">
              {typeFilteredEvents.length} {t('search.matches')}
            </span>
          )}
          <button
            className="agent-flow__search-close"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
            type="button"
            aria-label={t('search.closeSearch')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Time range filter bar */}
      {(timeFilterOpen || timeFrom || timeTo) && (
        <div className="agent-flow__time-filter" role="group" aria-label="Time range filter">
          <span className="agent-flow__time-filter-label">{t('timeFilter.label')}</span>
          <input
            type="datetime-local"
            className="agent-flow__time-input"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
            placeholder={t('timeFilter.from')}
            aria-label={t('timeFilter.from')}
          />
          <span className="agent-flow__time-filter-sep">{t('generic.to')}</span>
          <input
            type="datetime-local"
            className="agent-flow__time-input"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
            placeholder={t('timeFilter.to')}
            aria-label={t('timeFilter.to')}
          />
          <button
            className="agent-flow__time-filter-clear"
            onClick={() => { setTimeFrom(''); setTimeTo(''); }}
            title={t('timeFilter.clear')}
            type="button"
            aria-label={t('timeFilter.clear')}
          >
            {t('timeFilter.clear')}
          </button>
        </div>
      )}

      {/* Event type filter checkboxes */}
      <div className="agent-flow__type-filter" role="group" aria-label="Event type filters">
        {ALL_EVENT_TYPES.map(type => (
          <label key={type} className="agent-flow__type-checkbox">
            <input
              type="checkbox"
              checked={enabledTypes.has(type)}
              onChange={() => toggleEventType(type)}
              aria-label={`Filter ${type} events`}
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
              <span className="agent-flow__stats-label">{t('stats.total')}</span>
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
                <span className="agent-flow__stats-label">{t('stats.cost')}</span>
                <span className="agent-flow__stats-value">${stats.totalCost.toFixed(4)}</span>
              </span>
            )}
            {stats.totalTokens > 0 && (
              <span className="agent-flow__stats-item">
                <span className="agent-flow__stats-label">{t('stats.tokens')}</span>
                <span className="agent-flow__stats-value">{stats.totalTokens.toLocaleString()}</span>
              </span>
            )}
            {stats.agents.length > 0 && (
              <span className="agent-flow__stats-item">
                <span className="agent-flow__stats-label">{t('stats.agents')}</span>
                <span className="agent-flow__stats-value">{stats.agents.length}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Performance analysis panel */}
      {showPerf && perfResult && (
        <div className="agent-flow__perf-panel" role="region" aria-label="Performance analysis">
          <div className="agent-flow__perf-header">
            <span className="agent-flow__perf-title">Performance Bottlenecks</span>
            <span className="agent-flow__perf-count">{perfResult.findings.length} finding(s)</span>
          </div>
          {perfResult.findings.length === 0 ? (
            <div className="agent-flow__perf-empty">No performance bottlenecks detected.</div>
          ) : (
            <div className="agent-flow__perf-findings">
              {perfResult.findings.map((finding, i) => (
                <div key={i} className={`agent-flow__perf-finding agent-flow__perf-finding--${finding.severity}`}>
                  <span className="agent-flow__perf-severity">{finding.severity}</span>
                  <span className="agent-flow__perf-category">{finding.category.replace(/_/g, ' ')}</span>
                  <span className="agent-flow__perf-desc">{finding.description}</span>
                  {finding.suggestion && (
                    <span className="agent-flow__perf-suggestion">{finding.suggestion}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events (virtualized) */}
      <div className="agent-flow__events-wrapper">
        <div ref={parentRef} className={`agent-flow__events${viewMode === 'waterfall' ? ' agent-flow__events--waterfall' : ''}${viewMode === 'dag' ? ' agent-flow__events--dag' : ''}${viewMode === 'swimlane' ? ' agent-flow__events--swimlane' : ''}`} role="log" aria-label="Event stream" aria-live="polite">
          {viewMode === 'dag' ? (
            <DAGView events={bookmarkFilteredEvents} theme={theme} />
          ) : viewMode === 'swimlane' ? (
            <SwimlaneView events={bookmarkFilteredEvents} theme={theme} />
          ) : viewMode === 'waterfall' ? (
            bookmarkFilteredEvents.length === 0 ? (
              <div className="agent-flow__empty">
                {hasActiveFilters ? t('empty.noMatching') : t('empty.noEvents')}
              </div>
            ) : (
              <div className="agent-flow__waterfall">
                {/* Time axis */}
                <div className="agent-flow__waterfall-axis">
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const ms = Math.round(waterfallTimeRange.startTime + waterfallTimeRange.totalDuration * pct);
                    return (
                      <span
                        key={pct}
                        className="agent-flow__waterfall-tick"
                        style={{ left: `${pct * 100}%` }}
                      >
                        {formatTime(ms)}
                      </span>
                    );
                  })}
                </div>
                {/* Waterfall bars */}
                <div className="agent-flow__waterfall-bars">
                  {bookmarkFilteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className="agent-flow__waterfall-row"
                      onContextMenu={(e) => handleContextMenu(e, event)}
                    >
                      <span className="agent-flow__waterfall-row-label" title={event.tool || event.type}>
                        {event.tool || event.type}
                      </span>
                      <div className="agent-flow__waterfall-row-track">
                        <WaterfallBar
                          event={event}
                          startTime={waterfallTimeRange.startTime}
                          totalDuration={waterfallTimeRange.totalDuration}
                          onClick={setSelectedEvent}
                          highlighted={highlightedEventId === event.id}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : virtualListItems.length === 0 ? (
            <div className="agent-flow__empty">
              {hasActiveFilters ? t('empty.noMatching') : t('empty.noEvents')}
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
                        aria-expanded={!collapsedAgentGroups.has(item.agentName)}
                        aria-label={`${item.agentName} agent group (${item.count} events)`}
                      >
                        <AgentAvatar
                          avatar={item.agentAvatar}
                          name={item.agentName}
                          color={item.agentColor}
                          size={20}
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
                    onContextMenu={(e) => handleContextMenu(e, event)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
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
        {virtualListItems.length > 0 && viewMode !== 'waterfall' && viewMode !== 'dag' && viewMode !== 'swimlane' && (
          <div className="agent-flow__scroll-controls">
            <button
              className={`agent-flow__auto-scroll-btn${autoScroll ? ' agent-flow__auto-scroll-btn--active' : ''}`}
              onClick={() => setAutoScroll(prev => !prev)}
              title={autoScroll ? t('scroll.autoScrollOn') : t('scroll.autoScrollOff')}
              type="button"
              aria-label={autoScroll ? t('scroll.autoScrollOff') : t('scroll.autoScrollOn')}
              aria-pressed={autoScroll}
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
              <button className="agent-flow__scroll-bottom" onClick={scrollToBottom} title={t('scroll.scrollToBottom')} type="button" aria-label={t('scroll.scrollToBottom')}>
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
        <div className="agent-flow__modal-overlay" onClick={() => setSelectedEvent(null)} role="dialog" aria-modal="true" aria-label="Event detail">
          <div className="agent-flow__modal" onClick={(e) => e.stopPropagation()}>
            <div className="agent-flow__modal-header">
              <span className="agent-flow__modal-title">{t('modal.eventDetail')}</span>
              <div className="agent-flow__modal-actions">
                <button
                  className="agent-flow__modal-copy"
                  onClick={() => copyToClipboard(JSON.stringify(selectedEvent, null, 2))}
                  title={t('modal.copyJSON')}
                  type="button"
                  aria-label={t('action.copyJSON')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
                <button
                  className="agent-flow__modal-close"
                  onClick={() => setSelectedEvent(null)}
                  title={t('modal.close')}
                  type="button"
                  aria-label={t('modal.close')}
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
        <div className="agent-flow__modal-overlay" onClick={() => setShowHelp(false)} role="dialog" aria-modal="true" aria-label={t('help.title')}>
          <div className="agent-flow__help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="agent-flow__modal-header">
              <span className="agent-flow__modal-title">{t('help.title')}</span>
              <button
                className="agent-flow__modal-close"
                onClick={() => setShowHelp(false)}
                title={t('modal.close')}
                type="button"
                aria-label={t('modal.close')}
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
                <span className="agent-flow__help-desc">{t('help.searchEvents')}</span>
              </div>
              <div className="agent-flow__help-row">
                <span className="agent-flow__help-keys">
                  <kbd>?</kbd>
                </span>
                <span className="agent-flow__help-desc">{t('help.toggleHelp')}</span>
              </div>
              <div className="agent-flow__help-row">
                <span className="agent-flow__help-keys">
                  <kbd>Esc</kbd>
                </span>
                <span className="agent-flow__help-desc">{t('help.closePanels')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className={`agent-flow__context-menu agent-flow__context-menu--${theme}`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          <button
            className="agent-flow__context-menu-item"
            onClick={() => {
              copyToClipboard(JSON.stringify(contextMenu.event, null, 2));
              setContextMenu(null);
            }}
            role="menuitem"
            type="button"
          >
            {t('action.copyJSON')}
          </button>
          {contextMenu.event.type === 'tool_call' && (
            <button
              className="agent-flow__context-menu-item"
              onClick={() => {
                copyToClipboard(generateCurlCommand(contextMenu.event));
                setContextMenu(null);
              }}
              role="menuitem"
              type="button"
            >
              {t('action.copyCurl')}
            </button>
          )}
          <button
            className="agent-flow__context-menu-item"
            onClick={() => {
              toggleBookmark(contextMenu.event.id);
              setContextMenu(null);
            }}
            role="menuitem"
            type="button"
          >
            {bookmarkedIds.has(contextMenu.event.id) ? t('action.unbookmark') : t('action.bookmark')}
          </button>
          {contextMenu.event.agentName && (
            <button
              className="agent-flow__context-menu-item"
              onClick={() => {
                setSelectedAgent(contextMenu.event.agentName || null);
                setContextMenu(null);
              }}
              role="menuitem"
              type="button"
            >
              {t('action.filterByAgent')}: {contextMenu.event.agentName}
            </button>
          )}
          <button
            className="agent-flow__context-menu-item"
            onClick={() => {
              setEnabledTypes(new Set([contextMenu.event.type]));
              setContextMenu(null);
            }}
            role="menuitem"
            type="button"
          >
            {t('action.filterByType')}: {contextMenu.event.type}
          </button>
          <div className="agent-flow__context-menu-separator" />
          <button
            className="agent-flow__context-menu-item"
            onClick={() => {
              setSelectedEvent(contextMenu.event);
              setContextMenu(null);
            }}
            role="menuitem"
            type="button"
          >
            {t('action.showDetails')}
          </button>
        </div>
      )}

      {/* Resize handle */}
      <div
        className="agent-flow__resize-handle"
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="horizontal"
        title="Drag to resize"
      />
    </div>
  );
}

export default AgentFlow;
