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
export { EventRow, TimelineRow, AgentAvatar, WaterfallBar, SyntaxHighlight } from './EventRow';

// i18n
export type { Locale, TranslationKey } from './i18n';
export { createT } from './i18n';

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
  ConnectionDetails,
} from './types';
