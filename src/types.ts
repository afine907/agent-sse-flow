import type React from 'react';

export type EventStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type ViewMode = 'list' | 'timeline';

export type Theme = 'light' | 'dark';

export type EventType = 'start' | 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'end';

export interface AgentFlowProps {
  /** SSE endpoint URL */
  url: string;
  /** Theme: 'light' | 'dark' */
  theme?: Theme;
  /** Auto connect on mount */
  autoConnect?: boolean;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Connection status callback */
  onStatusChange?: (status: EventStatus) => void;
  /** Max events to keep in memory (default: 100000) */
  maxEvents?: number;
  /** Custom renderer for event messages (overrides default markdown) */
  renderMessage?: (message: string) => React.ReactNode;
  /** Custom renderer for tool results (overrides default markdown) */
  renderResult?: (result: string) => React.ReactNode;
  /** View mode: 'list' (card style) or 'timeline' (collapsible timeline) */
  viewMode?: ViewMode;
  /** Whether new events are collapsed by default in timeline mode */
  defaultCollapsed?: boolean;
  /** Reconnect automatically on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Custom CSS class name */
  className?: string;
  /** Custom style object */
  style?: React.CSSProperties;
  /** Keyboard search shortcut key (default: 'k' with Ctrl/Cmd) */
  searchKey?: string;
}

export interface FlowEvent {
  /** Unique event ID */
  id: number;
  /** Event type */
  type: EventType;
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
  /** Agent name (for multi-agent systems) */
  agentName?: string;
  /** Agent color (hex format, e.g. #3b82f6) */
  agentColor?: string;
  /** Cost in USD (optional) */
  cost?: number;
  /** Token count (optional) */
  tokens?: number;
  /** Duration in milliseconds (optional) */
  duration?: number;
}

export interface SSEStats {
  totalCost: number;
  totalTokens: number;
  agents: string[];
}

export interface UseSSEReturn {
  events: FlowEvent[];
  filteredEvents: FlowEvent[];
  status: EventStatus;
  stats: SSEStats;
  selectedAgent: string | null;
  setSelectedAgent: (agent: string | null) => void;
  connect: () => () => void;
  disconnect: () => void;
  isSupported: boolean;
}
