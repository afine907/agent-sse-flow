/**
 * Node Header Component
 * 升级版：集成新的 Badge、Status、Avatar 组件
 */

import React, { useMemo } from 'react';
import type { StreamNode, NodeTypeName } from '../types/node';
import { Badge } from './primitives/Badge';
import { Status, type NodeStatus } from './primitives/Status';
import { Avatar } from './primitives/Avatar';
import { Timeline } from './primitives/Timeline';
import { TokensBadge } from './primitives/TokensBadge';
import { PriceBadge } from './primitives/PriceBadge';
import {
  User,
  Zap,
  Wrench,
  Code,
  Terminal,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import cn from 'classnames';

// Node type configuration
const NODE_TYPE_CONFIG: Record<
  NodeTypeName,
  { label: string; badgeClass: string; icon: typeof User }
> = {
  user_input: {
    label: 'USER',
    badgeClass: 'bg-ts-badge-user text-ts-badge-user-foreground',
    icon: User,
  },
  assistant_thought: {
    label: 'THOUGHT',
    badgeClass: 'bg-ts-badge-thought text-ts-badge-thought-foreground',
    icon: Zap,
  },
  tool_call: {
    label: 'TOOL',
    badgeClass: 'bg-ts-badge-tool text-ts-badge-tool-foreground',
    icon: Wrench,
  },
  code_execution: {
    label: 'CODE',
    badgeClass: 'bg-ts-badge-code text-ts-badge-code-foreground',
    icon: Code,
  },
  execution_result: {
    label: 'RESULT',
    badgeClass: 'bg-ts-badge-result text-ts-badge-result-foreground',
    icon: Terminal,
  },
  final_output: {
    label: 'OUTPUT',
    badgeClass: 'bg-ts-badge-output text-ts-badge-output-foreground',
    icon: CheckCircle,
  },
  error: {
    label: 'ERROR',
    badgeClass: 'bg-ts-badge-error text-ts-badge-error-foreground',
    icon: AlertCircle,
  },
};

// Map old status to new status
const STATUS_MAP: Record<string, NodeStatus> = {
  streaming: 'streaming',
  complete: 'completed',
  completed: 'completed',
  error: 'error',
};

export interface NodeHeaderProps {
  node: StreamNode;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggleExpand?: () => void;
  /**
   * Trace time range for timeline
   */
  minTime?: number;
  maxTime?: number;
  /**
   * Show timeline
   */
  showTimeline?: boolean;
  /**
   * Show tokens badge
   */
  showTokens?: boolean;
  /**
   * Show cost badge
   */
  showCost?: boolean;
  className?: string;
}

export function NodeHeader({
  node,
  isExpanded,
  hasChildren,
  onToggleExpand,
  minTime,
  maxTime,
  showTimeline = false,
  showTokens = false,
  showCost = false,
  className = '',
}: NodeHeaderProps): JSX.Element {
  // Get node type config
  const nodeType = (node.nodeType || 'final_output') as NodeTypeName;
  const typeConfig = NODE_TYPE_CONFIG[nodeType] || NODE_TYPE_CONFIG.final_output;

  // Map status
  const status: NodeStatus = STATUS_MAP[node.status || 'streaming'] || 'streaming';

  // Get tokens and cost from node data
  const tokens = (node as any).tokenUsage?.total || 0;
  const cost = (node as any).cost || 0;

  // Time range
  const startTime = node.createdAt || Date.now();
  const endTime = node.updatedAt;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Expand/Collapse button */}
      {hasChildren && (
        <button
          className={cn(
            'flex size-4 items-center justify-center rounded-sm',
            'text-ts-muted-foreground hover:text-ts-foreground',
            'transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
          onClick={onToggleExpand}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight className="size-3" />
        </button>
      )}

      {/* Avatar */}
      <Avatar nodeType={nodeType} size="sm" />

      {/* Node type badge */}
      <Badge
        iconStart={<typeConfig.icon className="size-3" />}
        label={typeConfig.label}
        size="xs"
        className={typeConfig.badgeClass}
        unstyled
      />

      {/* Node name/title */}
      {node.chunk && (
        <span className="truncate text-sm text-ts-foreground max-w-[200px]">
          {node.chunk.slice(0, 50)}
          {node.chunk.length > 50 && '...'}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Timeline */}
      {showTimeline && minTime !== undefined && maxTime !== undefined && (
        <Timeline
          startTime={startTime}
          endTime={endTime}
          minTime={minTime}
          maxTime={maxTime}
          nodeType={nodeType}
          width={60}
        />
      )}

      {/* Tokens badge */}
      {showTokens && tokens > 0 && (
        <TokensBadge tokens={tokens} size="xs" />
      )}

      {/* Cost badge */}
      {showCost && cost > 0 && (
        <PriceBadge cost={cost} size="xs" />
      )}

      {/* Status indicator */}
      <Status status={status} variant="badge" />
    </div>
  );
}

export default NodeHeader;
