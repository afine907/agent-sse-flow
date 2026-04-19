/**
 * Trace Node Component
 * 升级版：集成新的设计系统
 */

import React, { useMemo } from 'react';
import type { TreeNode } from '../types/tree';
import { NodeHeader } from './NodeHeader';
import { NodeContent } from './NodeContent';
import { useNodeExpanded } from '../adapters/react/hooks';
import { useTreeKeyboard } from '../hooks';
import type { NodeTypeName } from '../types/node';
import cn from 'classnames';

export interface TraceNodeProps {
  node: TreeNode;
  depth: number;
  className?: string;
  /**
   * Show timeline in header
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
  /**
   * Trace time range
   */
  minTime?: number;
  maxTime?: number;
}

/**
 * Default indentation per level (24px)
 */
const INDENT_SIZE = 24;

// Map node types to CSS classes
const NODE_TYPE_CLASSES: Record<NodeTypeName, string> = {
  user_input: 'ts-node-user',
  assistant_thought: 'ts-node-thought',
  tool_call: 'ts-node-tool',
  code_execution: 'ts-node-code',
  execution_result: 'ts-node-result',
  final_output: 'ts-node-output',
  error: 'ts-node-error',
};

/**
 * TraceNode Component
 * Recursively renders a node and its children
 */
export function TraceNode({
  node,
  depth,
  className = '',
  showTimeline = false,
  showTokens = false,
  showCost = false,
  minTime,
  maxTime,
}: TraceNodeProps): JSX.Element {
  const { isExpanded, toggle } = useNodeExpanded(node.nodeId);

  // Calculate indentation
  const indentStyle = useMemo(
    () => ({
      paddingLeft: `${depth * INDENT_SIZE}px`,
    }),
    [depth]
  );

  // Get node type for styling
  const nodeType = (node.data.nodeType || 'final_output') as NodeTypeName;
  const nodeClass = NODE_TYPE_CLASSES[nodeType] || NODE_TYPE_CLASSES.final_output;

  // Determine if node has children
  const hasChildren = node.children && node.children.length > 0;

  // Keyboard navigation
  const handleKeyDown = useTreeKeyboard({
    hasChildren,
    onToggle: toggle,
  });

  // Get status
  const status = node.data.status;

  return (
    <div
      className={cn(
        'ts-node group relative',
        nodeClass,
        'rounded-lg border border-ts-border-subtle',
        'bg-ts-background hover:border-ts-border',
        'transition-all duration-200',
        status === 'streaming' && 'ts-node-streaming',
        className
      )}
      style={indentStyle}
      data-node-id={node.nodeId}
      data-depth={depth}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Node Header */}
      <div className="p-2">
        <NodeHeader
          node={node.data}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onToggleExpand={toggle}
          showTimeline={showTimeline}
          showTokens={showTokens}
          showCost={showCost}
          minTime={minTime}
          maxTime={maxTime}
        />
      </div>

      {/* Node Content */}
      <div className="px-2 pb-2">
        <NodeContent
          content={node.data.chunk}
          status={status}
          nodeType={nodeType}
        />
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-ts-border-subtle" />
          
          {/* Child nodes */}
          <div className="space-y-1">
            {node.children.map((child, idx) => (
              <TraceNode
                key={child.nodeId}
                node={child}
                depth={depth + 1}
                showTimeline={showTimeline}
                showTokens={showTokens}
                showCost={showCost}
                minTime={minTime}
                maxTime={maxTime}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TraceNode;
