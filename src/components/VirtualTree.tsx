/**
 * VirtualTree Component
 * High-performance tree visualization with virtual scrolling
 * Supports 5000+ nodes with smooth rendering
 */

import { useMemo, useRef, useCallback, useState, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TreeNode } from '../types/tree';
import { TraceNode } from './TraceNode';

/* ============================================================================
 * Types
 * ============================================================================ */

export interface VTreeProps {
  tree: TreeNode | null;
  height?: number | string;
  width?: number | string;
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
  isLast: boolean;
  renderNode?: (node: TreeNode, depth: number) => React.ReactNode;
}

const TreeNodeRow = memo(({
  node,
  depth,
  isLast,
  renderNode,
}: TreeNodeRowProps) => {
  if (renderNode) {
    return <>{renderNode(node, depth)}</>;
  }

  return (
    <TraceNode
      node={node}
      depth={depth}
      isLast={isLast}
    />
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
    estimateSize: () => 80,
    overscan: 10,
  });

  const totalHeight = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className="ts-tree-container bg-[#0a0a0a]"
      style={{ height, width, overflow: 'auto' }}
      role="tree"
      aria-label="Trace tree view"
    >
      <div
        className="relative w-full p-8"
        style={{ height: `${totalHeight}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const { node, depth } = flattenedNodes[virtualRow.index];
          const isLast = virtualRow.index === flattenedNodes.length - 1;
          return (
            <div
              key={node.nodeId}
              className="ts-tree-row"
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
                isLast={isLast}
                renderNode={renderNode}
              />
            </div>
          );
        })}
      </div>
      <div className="ts-tree-count text-white/40 text-xs font-mono p-4">
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
    <div className="flex flex-col gap-3">
      {(showSearch || showTypeFilter) && (
        <div className="ts-toolbar flex gap-3 p-4 bg-[#0a0a0a] border-b border-white/10">
          {showSearch && (
            <input
              type="text"
              className="ts-search-input bg-[#111111] border border-white/10 px-3 py-2 text-white/80 text-sm font-mono focus:outline-none focus:border-[#c5a059]/50"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search nodes"
            />
          )}
          {showTypeFilter && (
            <select
              className="ts-select bg-[#111111] border border-white/10 px-3 py-2 text-white/80 text-sm font-mono focus:outline-none focus:border-[#c5a059]/50"
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
            <button
              className="ts-clear-btn text-[10px] uppercase tracking-[3px] text-[#c5a059] hover:text-white transition-colors px-4"
              onClick={clearFilters}
              aria-label="Clear filters"
            >
              Clear
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
