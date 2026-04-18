/**
 * VirtualTree Component Unit Tests
 * Tests for src/components/VirtualTree.tsx
 */

import { describe, it, expect, vi, React } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualTree, VirtualTreeWithSearch } from '@tracescope/components/VirtualTree';
import type { TreeNode } from '@tracescope/types/tree';

// Mock @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(() => ({
    getVirtualItems: vi.fn(() => []),
    getTotalSize: vi.fn(() => 0),
  })),
}));

// Mock child components
vi.mock('./NodeHeader', () => ({
  NodeHeader: ({ node }: { node: any }) => (
    <div data-testid={`node-header-${node.nodeId}`}>Header: {node.nodeId}</div>
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

describe('VirtualTree', () => {
  const createTree = (): TreeNode => ({
    nodeId: 'root',
    data: { nodeId: 'root', chunk: 'root content', nodeType: 'user_input' },
    children: [
      {
        nodeId: 'child-1',
        data: { nodeId: 'child-1', chunk: 'child 1', nodeType: 'tool_call' },
        children: [],
        depth: 1,
        isExpanded: true,
      },
    ],
    depth: 0,
    isExpanded: true,
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<VirtualTree tree={null} />);
      expect(container).toBeTruthy();
    });

    it('should render with a tree', () => {
      const tree = createTree();
      render(<VirtualTree tree={tree} />);

      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should render with custom height', () => {
      const tree = createTree();
      render(<VirtualTree tree={tree} height={400} />);

      const container = screen.getByRole('tree');
      expect(container).toHaveStyle({ height: '400px' });
    });

    it('should render with custom width', () => {
      const tree = createTree();
      render(<VirtualTree tree={tree} width={500} />);

      const container = screen.getByRole('tree');
      expect(container).toHaveStyle({ width: '500px' });
    });

    it('should render with default dimensions', () => {
      const tree = createTree();
      render(<VirtualTree tree={tree} />);

      const container = screen.getByRole('tree');
      // Default height is 600 and width is '100%'
      expect(container.style.height).toBeTruthy();
      expect(container.style.width).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have tree role', () => {
      const tree = createTree();
      render(<VirtualTree tree={tree} />);

      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should have aria-label', () => {
      const tree = createTree();
      render(<VirtualTree tree={tree} />);

      expect(screen.getByRole('tree')).toHaveAttribute('aria-label', 'Trace tree view');
    });
  });

  describe('props', () => {
    it('should accept custom indent size', () => {
      const tree = createTree();
      render(<VirtualTree tree={tree} indentSize={40} />);
      // Component should render without errors
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should accept enableExpand prop', () => {
      const tree = createTree();
      render(<VirtualTree tree={tree} enableExpand={false} />);
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should accept initialExpanded prop', () => {
      const tree = createTree();
      render(<VirtualTree tree={tree} initialExpanded={['root']} />);
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should accept custom renderNode function', () => {
      const tree = createTree();
      const customRender = vi.fn((node: TreeNode) => (
        <div data-testid={`custom-${node.nodeId}`}>Custom: {node.nodeId}</div>
      ));

      render(<VirtualTree tree={tree} renderNode={customRender} />);
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should accept filter prop', () => {
      const tree = createTree();
      const filter = vi.fn(() => true);

      render(<VirtualTree tree={tree} filter={filter} />);
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });
  });
});

describe('VirtualTreeWithSearch', () => {
  const createTree = (): TreeNode => ({
    nodeId: 'root',
    data: { nodeId: 'root', chunk: 'content' },
    children: [],
    depth: 0,
    isExpanded: true,
  });

  describe('rendering', () => {
    it('should render with search input', () => {
      const tree = createTree();
      render(<VirtualTreeWithSearch tree={tree} showSearch={true} />);

      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
    });

    it('should render without search input', () => {
      const tree = createTree();
      render(<VirtualTreeWithSearch tree={tree} showSearch={false} />);

      expect(screen.queryByPlaceholderText('Search nodes...')).not.toBeInTheDocument();
    });

    it('should render with type filter', () => {
      const tree = createTree();
      render(<VirtualTreeWithSearch tree={tree} showTypeFilter={true} />);

      expect(screen.getByLabelText('Filter by node type')).toBeInTheDocument();
    });

    it('should render without type filter', () => {
      const tree = createTree();
      render(<VirtualTreeWithSearch tree={tree} showTypeFilter={false} />);

      expect(screen.queryByLabelText('Filter by node type')).not.toBeInTheDocument();
    });

    it('should render with custom search placeholder', () => {
      const tree = createTree();
      render(<VirtualTreeWithSearch tree={tree} searchPlaceholder="Find nodes..." />);

      expect(screen.getByPlaceholderText('Find nodes...')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should update search query on input', () => {
      const tree = createTree();
      render(<VirtualTreeWithSearch tree={tree} />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(searchInput).toHaveValue('test');
    });

    it('should show clear button when filters are active', () => {
      const tree = createTree();
      render(<VirtualTreeWithSearch tree={tree} />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    });

    it('should clear filters when clear button is clicked', () => {
      const tree = createTree();
      render(<VirtualTreeWithSearch tree={tree} />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

      expect(searchInput).toHaveValue('');
    });
  });

  describe('type filter', () => {
    it('should have all type options', () => {
      const tree = createTree();
      render(<VirtualTreeWithSearch tree={tree} />);

      const select = screen.getByLabelText('Filter by node type');
      expect(select).toBeInTheDocument();
    });

    it('should update filter on select change', () => {
      const tree = createTree();
      render(<VirtualTreeWithSearch tree={tree} />);

      const select = screen.getByLabelText('Filter by node type');
      fireEvent.change(select, { target: { value: 'tool_call' } });

      expect(select).toHaveValue('tool_call');
    });
  });
});
