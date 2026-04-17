/**
 * VirtualTree Component
 * High-performance tree visualization with virtual scrolling
 * Supports 5000+ nodes with smooth rendering
 */

import React, { useMemo, useRef, useCallback, useState, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TreeNode } from '../types/tree';
import { NodeHeader } from './NodeHeader';
import { NodeContent } from './NodeContent';
import './VirtualTree.css';

/* ============================================================================
 * Types
 * ============================================================================ */

export interface VTreeProps {
  tree: TreeNode | null;
  height?: number | string;
  width?: number | string;
  indentSize?: number;
  enableExpand?: boolean;
  initialExpanded?: string[];
  renderNode?: (node: TreeNode, depth: number) => React.ReactNode;
  onNodeClick?: (node: TreeNode) => void;
  filter?: (node: TreeNode) => boolean;
}

export interface VTreeSearchProps extends VTreeProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  showTypeFilter?: boolean;
}

/* ============================================================================
 * Memoized Tree Node Row Component
 * ============================================================================ */

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  hasKids: boolean;
  indentSize: number;
  toggleNode: (nodeId: string) => void;
  renderNode?: (node: TreeNode, depth: number) => React.ReactNode;
  enableExpand: boolean;
}

const TreeNodeRow = memo(({
  node,
  depth,
  isExpanded,
  hasKids,
  indentSize,
  toggleNode,
  renderNode,
}: TreeNodeRowProps) => {
  if (renderNode) {
    return <>{renderNode(node, depth)}</>;
  }

  const nodeType = node.data.nodeType || 'final_output';

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hasKids) toggleNode(node.nodeId);
    }
  }, [hasKids, toggleNode, node.nodeId]);

  return (
    <div
      className={`virtual-tree-node trace-node-${nodeType}`}
      style={{ paddingLeft: `${depth * indentSize}px` }}
      data-node-id={node.nodeId}
      data-depth={depth}
      role="treeitem"
      aria-expanded={hasKids ? isExpanded : undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <NodeHeader
        node={node.data}
        isExpanded={isExpanded}
        hasChildren={hasKids}
        onToggleExpand={() => toggleNode(node.nodeId)}
      />
      <NodeContent
        content={node.data.chunk}
        status={node.data.status}
        nodeType={nodeType}
      />
    </div>
  );
});

TreeNodeRow.displayName = 'TreeNodeRow';

/* ============================================================================
 * Helper Functions
 * ============================================================================ */

function flattenTree(
  node: TreeNode | null,
  expandedNodes: Set<string>,
  depth: number = 0,
  filter?: (node: TreeNode) => boolean
): Array<{ node: TreeNode; depth: number }> {
  if (!node) return [];
  
  const result: Array<{ node: TreeNode; depth: number }> = [];
  
  if (filter && !filter(node)) {
    return result;
  }
  
  result.push({ node, depth });
  
  const isExpanded = expandedNodes.has(node.nodeId);
  const hasChildren = node.children && node.children.length > 0;
  
  if (isExpanded && hasChildren) {
    for (const child of node.children) {
      result.push(...flattenTree(child, expandedNodes, depth + 1, filter));
    }
  }
  
  return result;
}

/* ============================================================================
 * Main Component
 * ============================================================================ */

function VirtualTreeComponent({
  tree,
  height = 600,
  width = '100%',
  indentSize = 24,
  enableExpand = true,
  initialExpanded = [],
  renderNode,
  onNodeClick,
  filter,
}: VTreeProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(initialExpanded)
  );

  const toggleNode = useCallback((nodeId: string) => {
    if (!enableExpand) return;
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, [enableExpand]);

  const flattenedNodes = useMemo(() =>
    flattenTree(tree, expandedNodes, 0, filter),
  [tree, expandedNodes, filter]);

  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  const totalHeight = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className="virtual-tree-container"
      style={{ height, width, overflow: 'auto' }}
      role="tree"
      aria-label="Trace tree view"
    >
      <div
        className="virtual-tree-inner"
        style={{ height: `${totalHeight}px`, position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const { node, depth } = flattenedNodes[virtualRow.index];
          return (
            <div
              key={node.nodeId}
              className="virtual-tree-row"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TreeNodeRow
                node={node}
                depth={depth}
                isExpanded={expandedNodes.has(node.nodeId)}
                hasKids={!!node.children?.length}
                indentSize={indentSize}
                toggleNode={toggleNode}
                renderNode={renderNode}
                enableExpand={enableExpand}
              />
            </div>
          );
        })}
      </div>
      <div className="virtual-tree-count">
        {flattenedNodes.length} nodes
        {filter && ' (filtered)'}
      </div>
    </div>
  );
}

/* ============================================================================
 * Search Extension
 * ============================================================================ */

const NODE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'user_input', label: 'User Input' },
  { value: 'assistant_thought', label: 'Thought' },
  { value: 'tool_call', label: 'Tool Call' },
  { value: 'code_execution', label: 'Code' },
  { value: 'execution_result', label: 'Result' },
  { value: 'final_output', label: 'Output' },
];

function VirtualTreeWithSearchComponent({
  showSearch = true,
  searchPlaceholder = 'Search nodes...',
  showTypeFilter = true,
  ...props
}: VTreeSearchProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  
  const filter = useMemo(() => {
    return (node: TreeNode): boolean => {
      if (filterType && node.data.nodeType !== filterType) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesContent = node.data.chunk?.toLowerCase().includes(query);
        const matchesType = node.data.nodeType?.toLowerCase().includes(query);
        const matchesId = node.nodeId.toLowerCase().includes(query);
        if (!matchesContent && !matchesType && !matchesId) return false;
      }
      return true;
    };
  }, [searchQuery, filterType]);
  
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType('');
  }, []);
  
  return (
    <div className="virtual-tree-with-search">
      {(showSearch || showTypeFilter) && (
        <div className="virtual-tree-toolbar">
          {showSearch && (
            <div className="toolbar-search">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search nodes"
              />
            </div>
          )}
          {showTypeFilter && (
            <select
              className="toolbar-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filter by node type"
            >
              {NODE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
          {(searchQuery || filterType) ? (
            <button className="toolbar-clear-btn" onClick={clearFilters} aria-label="Clear filters">
              ✕ Clear
            </button>
          ) : null}
        </div>
      )}
      <VirtualTreeComponent {...props} filter={filter} />
    </div>
  );
}

/* ============================================================================
 * Exports
 * ============================================================================ */

export const VirtualTree = Object.assign(VirtualTreeComponent, {
  WithSearch: VirtualTreeWithSearchComponent,
});

export const VirtualTreeWithSearch = VirtualTreeWithSearchComponent;