/**
 * TraceScope Component Exports
 * Main entry point for all React components
 */

// Main view
export { TraceScopeView, default } from './TraceScopeView';
export type { TraceScopeViewProps } from './TraceScopeView';

// Tree components
export { TraceTree } from './TraceTree';
export { TraceNode } from './TraceNode';
export type { TraceNodeProps } from './TraceNode';

// Status components
export { StatusIndicator } from './StatusIndicator';
export { ConnectionStatus } from './ConnectionStatus';

// Utility components
export { Toolbar } from './Toolbar';

// Error handling
export { ErrorBoundary } from './ErrorBoundary';

// Virtual tree (for 5000+ nodes)
export { VirtualTree, VirtualTreeWithSearch } from './VirtualTree';

// Chat components (for conversation mode)
export { VirtualChat, StreamingChat } from './VirtualChat';
export type { VirtualChatConfig, StreamingChatConfig } from './VirtualChat';

// Primitives
export {
  TimelineMarker,
  JsonBlock,
  PatchBlock,
  type TimelineMarkerProps,
  type MarkerType,
  type JsonBlockProps,
  type PatchBlockProps,
} from './primitives';
