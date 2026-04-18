/**
 * Tree Types Unit Tests
 * Tests for src/types/tree.ts
 */

import { describe, it, expect } from 'vitest';
import type {
  TreeNode,
  TreeBuildOptions,
  TraversalCallback,
  NodePath,
  AdjacencyList,
  OrphanNodes,
  TraversalType,
} from '@tracescope/types/tree';
import type { StreamNode } from '@tracescope/types/node';

describe('TreeNode type', () => {
  const createStreamNode = (id: string, chunk = 'test'): StreamNode => ({
    nodeId: id,
    chunk,
  });

  it('should create a valid TreeNode', () => {
    const data = createStreamNode('node-1');
    const treeNode: TreeNode = {
      nodeId: 'node-1',
      data,
      children: [],
      depth: 0,
      isExpanded: true,
    };

    expect(treeNode.nodeId).toBe('node-1');
    expect(treeNode.data).toEqual(data);
    expect(treeNode.children).toEqual([]);
    expect(treeNode.depth).toBe(0);
    expect(treeNode.isExpanded).toBe(true);
  });

  it('should support nested children', () => {
    const rootData = createStreamNode('root');
    const childData = createStreamNode('child');
    const grandchildData = createStreamNode('grandchild');

    const grandchild: TreeNode = {
      nodeId: 'grandchild',
      data: grandchildData,
      children: [],
      depth: 2,
      isExpanded: true,
    };

    const child: TreeNode = {
      nodeId: 'child',
      data: childData,
      children: [grandchild],
      depth: 1,
      isExpanded: true,
    };

    const root: TreeNode = {
      nodeId: 'root',
      data: rootData,
      children: [child],
      depth: 0,
      isExpanded: true,
    };

    expect(root.children).toHaveLength(1);
    expect(root.children[0].children).toHaveLength(1);
    expect(root.children[0].children[0].nodeId).toBe('grandchild');
  });

  it('should support collapsed state', () => {
    const treeNode: TreeNode = {
      nodeId: 'node-1',
      data: createStreamNode('node-1'),
      children: [],
      depth: 0,
      isExpanded: false,
    };

    expect(treeNode.isExpanded).toBe(false);
  });

  it('should support multiple children at same level', () => {
    const root: TreeNode = {
      nodeId: 'root',
      data: createStreamNode('root'),
      children: [
        {
          nodeId: 'child-1',
          data: createStreamNode('child-1'),
          children: [],
          depth: 1,
          isExpanded: true,
        },
        {
          nodeId: 'child-2',
          data: createStreamNode('child-2'),
          children: [],
          depth: 1,
          isExpanded: true,
        },
      ],
      depth: 0,
      isExpanded: true,
    };

    expect(root.children).toHaveLength(2);
    expect(root.children[0].nodeId).toBe('child-1');
    expect(root.children[1].nodeId).toBe('child-2');
  });
});

describe('TreeBuildOptions type', () => {
  it('should support default options', () => {
    const options: TreeBuildOptions = {
      defaultExpanded: true,
    };

    expect(options.defaultExpanded).toBe(true);
  });

  it('should support sorting options', () => {
    const options: TreeBuildOptions = {
      sortBy: 'createdAt',
      sortDirection: 'asc',
    };

    expect(options.sortBy).toBe('createdAt');
    expect(options.sortDirection).toBe('asc');
  });

  it('should support descending sort', () => {
    const options: TreeBuildOptions = {
      sortDirection: 'desc',
    };

    expect(options.sortDirection).toBe('desc');
  });

  it('should be an empty object', () => {
    const options: TreeBuildOptions = {};

    expect(options).toEqual({});
  });
});

describe('TraversalCallback type', () => {
  it('should be a function that accepts TreeNode', () => {
    const callback: TraversalCallback = (node) => {
      console.log(node.nodeId);
    };

    expect(typeof callback).toBe('function');
  });

  it('should return void by default', () => {
    const callback: TraversalCallback = () => {};

    const result = callback({
      nodeId: 'test',
      data: { nodeId: 'test', chunk: 'test' },
      children: [],
      depth: 0,
      isExpanded: true,
    });

    expect(result).toBeUndefined();
  });

  it('should return boolean to stop traversal', () => {
    const callback: TraversalCallback = (node) => {
      return node.nodeId === 'stop-here';
    };

    const result1 = callback({
      nodeId: 'stop-here',
      data: { nodeId: 'stop-here', chunk: 'test' },
      children: [],
      depth: 0,
      isExpanded: true,
    });

    expect(result1).toBe(true);

    const result2 = callback({
      nodeId: 'continue',
      data: { nodeId: 'continue', chunk: 'test' },
      children: [],
      depth: 0,
      isExpanded: true,
    });

    expect(result2).toBe(false);
  });
});

describe('NodePath type', () => {
  it('should create a valid NodePath', () => {
    const path: NodePath = {
      nodeIds: ['root', 'child', 'grandchild'],
      depth: 2,
    };

    expect(path.nodeIds).toHaveLength(3);
    expect(path.depth).toBe(2);
  });

  it('should have depth equal to nodeIds length - 1', () => {
    const path: NodePath = {
      nodeIds: ['root'],
      depth: 0,
    };

    expect(path.depth).toBe(path.nodeIds.length - 1);
  });
});

describe('AdjacencyList type', () => {
  it('should create a valid AdjacencyList', () => {
    const list: AdjacencyList = {
      root: ['child-1', 'child-2'],
      'child-1': ['grandchild-1'],
    };

    expect(list['root']).toHaveLength(2);
    expect(list['root']).toContain('child-1');
    expect(list['root']).toContain('child-2');
    expect(list['child-1']).toHaveLength(1);
  });

  it('should allow empty children array', () => {
    const list: AdjacencyList = {
      'leaf-node': [],
    };

    expect(list['leaf-node']).toEqual([]);
  });

  it('should support multiple parents pointing to same child', () => {
    // Note: This would create a graph, not a tree
    const list: AdjacencyList = {
      'parent-1': ['shared-child'],
      'parent-2': ['shared-child'],
    };

    expect(list['parent-1']).toContain('shared-child');
    expect(list['parent-2']).toContain('shared-child');
  });
});

describe('OrphanNodes type', () => {
  it('should create a valid OrphanNodes collection', () => {
    const orphans: OrphanNodes = {
      'missing-parent-1': [
        { nodeId: 'orphan-1', chunk: 'orphan content' },
      ],
    };

    expect(orphans['missing-parent-1']).toHaveLength(1);
    expect(orphans['missing-parent-1']?.[0].nodeId).toBe('orphan-1');
  });

  it('should support multiple orphans for same parent', () => {
    const orphans: OrphanNodes = {
      'missing-parent': [
        { nodeId: 'orphan-1', chunk: 'first' },
        { nodeId: 'orphan-2', chunk: 'second' },
      ],
    };

    expect(orphans['missing-parent']).toHaveLength(2);
  });

  it('should support orphans for multiple missing parents', () => {
    const orphans: OrphanNodes = {
      'parent-a': [{ nodeId: 'orphan-a', chunk: 'a' }],
      'parent-b': [{ nodeId: 'orphan-b', chunk: 'b' }],
    };

    expect(Object.keys(orphans)).toHaveLength(2);
  });
});

describe('TraversalType type', () => {
  it('should accept DFS', () => {
    const type: TraversalType = 'DFS';
    expect(type).toBe('DFS');
  });

  it('should accept BFS', () => {
    const type: TraversalType = 'BFS';
    expect(type).toBe('BFS');
  });
});
