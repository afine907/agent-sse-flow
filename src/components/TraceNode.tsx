/**
 * Trace Node Component
 * Premium Architecture Design - Timeline Layout
 */

import { useMemo, type ReactNode } from 'react';
import type { TreeNode } from '../types/tree';
import { TimelineMarker, type MarkerType } from './primitives/TimelineMarker';
import { useNodeExpanded } from '../adapters/react/hooks';
import { useTreeKeyboard } from '../hooks';
import type { NodeTypeName } from '../types/node';
import {
  User,
  Zap,
  Wrench,
  Code,
  Terminal,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import cn from 'classnames';

export interface TraceNodeProps {
  node: TreeNode;
  depth: number;
  isLast?: boolean;
  className?: string;
  children?: ReactNode;
}

// Node type configuration
const NODE_TYPE_CONFIG: Record<NodeTypeName, { label: string; icon: typeof User }> = {
  user_input: { label: 'USER INPUT', icon: User },
  assistant_thought: { label: 'THOUGHT', icon: Zap },
  tool_call: { label: 'TOOL CALL', icon: Wrench },
  code_execution: { label: 'CODE', icon: Code },
  execution_result: { label: 'RESULT', icon: Terminal },
  final_output: { label: 'OUTPUT', icon: CheckCircle },
  error: { label: 'ERROR', icon: AlertCircle },
};

// Status to marker type mapping
const STATUS_TO_MARKER: Record<string, MarkerType> = {
  streaming: 'pulse',
  complete: 'success',
  completed: 'success',
  error: 'error',
};

/**
 * TraceNode Component
 * Timeline-style recursive node rendering
 */
export function TraceNode({
  node,
  depth,
  isLast = false,
  className,
  children,
}: TraceNodeProps): JSX.Element {
  const { isExpanded, toggle } = useNodeExpanded(node.nodeId);

  // Get node type
  const nodeType = (node.data.nodeType || 'final_output') as NodeTypeName;
  const config = NODE_TYPE_CONFIG[nodeType] || NODE_TYPE_CONFIG.final_output;

  // Get marker type based on status
  const status = node.data.status || 'streaming';
  const markerType = STATUS_TO_MARKER[status] || 'pulse';

  // Check for children
  const hasChildren = node.children && node.children.length > 0;

  // Keyboard navigation
  const handleKeyDown = useTreeKeyboard({
    hasChildren,
    onToggle: toggle,
  });

  // Format timestamp
  const timestamp = node.data.createdAt != null
    ? new Date(node.data.createdAt).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + '.' + String(node.data.createdAt % 1000).padStart(3, '0')
    : undefined;

  // Indentation for depth > 0
  const indentStyle = useMemo(
    () => ({
      marginLeft: depth > 0 ? `${depth * 24}px` : undefined,
    }),
    [depth]
  );

  return (
    <div
      className={cn('relative group', !isLast && 'pb-14', className)}
      style={indentStyle}
      data-node-id={node.nodeId}
      data-depth={depth}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[23px] top-6 bottom-0 w-px bg-white/10" />
      )}

      {/* Marker */}
      <div className="absolute left-[14px] top-1 w-5 h-5 flex items-center justify-center bg-[#0a0a0a] z-10">
        <TimelineMarker
          type={status === 'error' ? 'error' : hasChildren ? 'dot' : markerType}
          icon={<config.icon className="w-4 h-4" />}
        />
      </div>

      {/* Content */}
      <div className="pl-14 space-y-3">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-4">
          <span
            className={cn(
              'text-[10px] uppercase tracking-[5px] font-bold',
              status === 'error' ? 'text-[#fca5a5]' : 'text-[#c5a059]'
            )}
          >
            {config.label}
          </span>
          {timestamp && (
            <span className="font-mono text-[11px] text-white/40 tracking-widest uppercase">
              {timestamp}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="text-white/50 text-base font-light leading-relaxed">
          {children || (
            <p className="text-white/60 text-base leading-relaxed max-w-xl">
              {node.data.chunk || 'Processing...'}
            </p>
          )}
        </div>

        {/* Expand button for children */}
        {hasChildren && (
          <button
            onClick={toggle}
            className="text-[10px] uppercase tracking-[3px] text-white/30 hover:text-white/60 transition-colors mt-2"
          >
            {isExpanded ? '▼ Hide Details' : '▶ Show Details'}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-4">
          {node.children.map((child, idx) => (
            <TraceNode
              key={child.nodeId}
              node={child}
              depth={depth + 1}
              isLast={idx === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TraceNode;
