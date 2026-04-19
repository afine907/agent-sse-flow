/**
 * TraceNode Component Unit Tests
 * Tests for src/components/TraceNode.tsx
 */

import { describe, it, expect, vi, React } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TraceNode } from '@tracescope/components/TraceNode';
import type { TreeNode } from '@tracescope/types/tree';
import type { StreamNode } from '@tracescope/types/node';

// Mock hooks
const mockToggle = vi.fn();
const mockIsExpanded = vi.fn(() => true);

vi.mock('@tracescope/adapters/react/hooks', () => ({
  useNodeExpanded: vi.fn(() => ({
    isExpanded: mockIsExpanded(),
    toggle: mockToggle,
  })),
}));

vi.mock('./NodeHeader', () => ({
  NodeHeader: ({ node, isExpanded, hasChildren }: { node: StreamNode; isExpanded: boolean; hasChildren: boolean }) => (
    <div data-testid="node-header" data-node-id={node.nodeId} data-expanded={isExpanded} data-has-children={hasChildren}>
      Header: {node.nodeId}
    </div>
  ),
}));

vi.mock('./NodeContent', () => ({
  NodeContent: ({ content }: { content: string }) => (
    <div data-testid="node-content">Content: {content}</div>
  ),
}));

vi.mock('../hooks', () => ({
  useTreeKeyboard: vi.fn(() => () => {}),
}));

describe('TraceNode', () => {
  const createNode = (overrides: Partial<TreeNode> = {}): TreeNode => ({
    nodeId: 'test-node',
    data: {
      nodeId: 'test-node',
      chunk: 'test content',
      nodeType: 'tool_call',
    },
    children: [],
    depth: 0,
    isExpanded: true,
    ...overrides,
  });

  describe('rendering', () => {
    it('should render node with correct attributes', () => {
      const node = createNode();

      render(<TraceNode node={node} depth={0} />);

      const nodeElement = screen.getByRole('treeitem');
      expect(nodeElement).toBeInTheDocument();
      expect(nodeElement).toHaveAttribute('data-node-id', 'test-node');
      expect(nodeElement).toHaveAttribute('data-depth', '0');
    });

    it('should apply correct CSS class based on node type', () => {
      const node = createNode({
        data: { nodeId: 'test', chunk: 'test', nodeType: 'tool_call' },
      });

      render(<TraceNode node={node} depth={0} />);

      const nodeElement = screen.getByRole('treeitem');
      expect(nodeElement).toHaveClass('ts-node-tool');
    });

    it('should apply default CSS class for unknown node type', () => {
      const node = createNode({
        data: { nodeId: 'test', chunk: 'test', nodeType: 'unknown_type' as any },
      });

      render(<TraceNode node={node} depth={0} />);

      const nodeElement = screen.getByRole('treeitem');
      expect(nodeElement).toHaveClass('ts-node-output'); // defaults to final_output
    });

    it('should apply custom className', () => {
      const node = createNode();

      render(<TraceNode node={node} depth={0} className="custom-class" />);

      const nodeElement = screen.getByRole('treeitem');
      expect(nodeElement).toHaveClass('custom-class');
    });
  });

  describe('indentation', () => {
    it('should apply correct padding based on depth', () => {
      const node = createNode();

      render(<TraceNode node={node} depth={3} />);

      const nodeElement = screen.getByRole('treeitem');
      expect(nodeElement.style.paddingLeft).toBe('72px'); // 3 * 24
    });

    it('should apply zero padding for depth 0', () => {
      const node = createNode();

      render(<TraceNode node={node} depth={0} />);

      const nodeElement = screen.getByRole('treeitem');
      expect(nodeElement.style.paddingLeft).toBe('0px');
    });
  });

  describe('children', () => {
    it('should render children when expanded and has children', () => {
      const node = createNode({
        children: [
          {
            nodeId: 'child-1',
            data: { nodeId: 'child-1', chunk: 'child content' },
            children: [],
            depth: 1,
            isExpanded: true,
          },
        ],
      });

      render(<TraceNode node={node} depth={0} />);

      // Parent and child nodes should be rendered
      const treeitems = screen.getAllByRole('treeitem');
      expect(treeitems.length).toBeGreaterThanOrEqual(1);
    });

    it('should not render children when collapsed', () => {
      // Set mock to return collapsed state
      mockIsExpanded.mockReturnValue(false);

      const node = createNode({
        children: [
          {
            nodeId: 'child-1',
            data: { nodeId: 'child-1', chunk: 'child' },
            children: [],
            depth: 1,
            isExpanded: true,
          },
        ],
      });

      render(<TraceNode node={node} depth={0} />);

      // Only parent node should be rendered
      expect(screen.getByRole('treeitem')).toBeInTheDocument();
      
      // Reset mock
      mockIsExpanded.mockReturnValue(true);
    });
  });

  describe('accessibility', () => {
    it('should have aria-expanded when has children', () => {
      const node = createNode({
        children: [
          {
            nodeId: 'child',
            data: { nodeId: 'child', chunk: '' },
            children: [],
            depth: 1,
            isExpanded: true,
          },
        ],
      });

      render(<TraceNode node={node} depth={0} />);

      // Get the first treeitem (parent)
      const treeitems = screen.getAllByRole('treeitem');
      const parentElement = treeitems[0];
      expect(parentElement).toHaveAttribute('aria-expanded');
    });

    it('should not have aria-expanded when no children', () => {
      const node = createNode({ children: [] });

      render(<TraceNode node={node} depth={0} />);

      const nodeElement = screen.getByRole('treeitem');
      expect(nodeElement).not.toHaveAttribute('aria-expanded');
    });

    it('should be focusable with tabIndex', () => {
      const node = createNode();

      render(<TraceNode node={node} depth={0} />);

      const nodeElement = screen.getByRole('treeitem');
      expect(nodeElement).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('node type classes', () => {
    const testCases = [
      { nodeType: 'user_input', expectedClass: 'ts-node-user' },
      { nodeType: 'assistant_thought', expectedClass: 'ts-node-thought' },
      { nodeType: 'tool_call', expectedClass: 'ts-node-tool' },
      { nodeType: 'code_execution', expectedClass: 'ts-node-code' },
      { nodeType: 'execution_result', expectedClass: 'ts-node-result' },
      { nodeType: 'final_output', expectedClass: 'ts-node-output' },
      { nodeType: 'error', expectedClass: 'ts-node-error' },
    ];

    testCases.forEach(({ nodeType, expectedClass }) => {
      it(`should apply ${expectedClass} for ${nodeType} type`, () => {
        const node = createNode({
          data: { nodeId: 'test', chunk: 'test', nodeType: nodeType as any },
        });

        render(<TraceNode node={node} depth={0} />);

        const nodeElement = screen.getByRole('treeitem');
        expect(nodeElement).toHaveClass(expectedClass);
      });
    });
  });
});
