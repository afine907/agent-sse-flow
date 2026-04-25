/**
 * react-tracescope - React Adapter
 * High-performance trace visualization for AI agents
 *
 * @package @tracescope/react
 * @version 1.0.0
 */

// Context
export {
  TraceScopeContext,
  TraceScopeDataContext,
  TraceScopeActionsContext,
  useTraceScopeContext,
  useTraceScopeData,
  useTraceScopeActions,
} from './context';

// Provider
export { TraceScopeProvider } from './provider';

// Hooks
export {
  useTraceScope,
  useTraceNode,
  useTraceTree,
  useConnectionState,
  useNodes,
  useError,
  useConnection,
  useNodeExpanded,
  useStreamingStatus,
  useFilteredNodes,
} from './hooks';

// Components
export { TraceTree } from '../../components/TraceTree';
export { TraceNode } from '../../components/TraceNode';
export type { TraceNodeProps } from '../../components/TraceNode';
export { Toolbar } from '../../components/Toolbar';
export { StatusIndicator } from '../../components/StatusIndicator';
export { VirtualTree, VirtualTreeWithSearch } from '../../components/VirtualTree';

// Types
export type {
  TraceScopeContextValue,
  TraceScopeDataValue,
  TraceScopeActionsValue,
} from './context';
export type { TraceScopeProviderProps } from './provider';
export type { TraceScopeConfig, TraceScopeState, ConnectionState } from '../../types/config';
export type { VTreeProps, VTreeSearchProps } from '../../components/VirtualTree';
