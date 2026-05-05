/**
 * Agent SSE Flow - Agent SSE Stream Visualizer
 *
 * A lightweight React component for visualizing Agent execution traces.
 * Free, unlimited, local.
 *
 * @package agent-sse-flow
 * @version 2.3.0
 */

// Main component
export { AgentFlow } from './AgentFlow';

// Hooks
export { useSSE } from './useSSE';

// Sub-components
export { EventRow, TimelineRow } from './EventRow';

// Types
export type {
  AgentFlowProps,
  FlowEvent,
  Theme,
  ViewMode,
  EventType,
  EventStatus,
  SSEStats,
  UseSSEReturn,
} from './types';
