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
export { DAGView } from './DAGView';
export { SwimlaneView } from './SwimlaneView';
export { TokenChart } from './TokenChart';
export { CostDashboard } from './CostDashboard';

// i18n
export type { Locale, TranslationKey } from './i18n';
export { createT } from './i18n';

// Sound feedback
export { playErrorSound, playConnectedSound, playDisconnectedSound, playSearchCompleteSound } from './sounds';

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

// Transport adapters
export { useWebSocket } from './adapters/websocket';
export type { UseWebSocketOptions, UseWebSocketReturn, ConnectionStatus } from './adapters/websocket';
export { usePolling } from './adapters/polling';
export type { UsePollingOptions, UsePollingReturn } from './adapters/polling';

// Validation
export { validateFlowEvent, formatValidationErrors } from './validate';
export type { ValidationError, ValidationResult } from './validate';

// Snapshot store
export { saveSnapshot, loadAllSnapshots, loadSnapshot, deleteSnapshot, clearAllSnapshots } from './snapshot-store';
export type { EventSnapshot } from './snapshot-store';

// Event diff
export { diffEvents } from './event-diff';
export type { DiffLine, DiffLineType } from './event-diff';

// AI Analysis
export { prepareEventsForAnalysis, buildAnalysisPrompt } from './ai-analysis';
export type { AnalysisResult, AnalysisFinding, AnalysisOptions, AnalyzeCallback } from './ai-analysis';

// Event clustering
export { clusterEvents, getClusterColor } from './event-cluster';
export type { EventCluster } from './event-cluster';
