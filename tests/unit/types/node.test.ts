/**
 * Node Types Unit Tests
 * Tests for src/types/node.ts
 */

import { describe, it, expect } from 'vitest';
import type {
  StreamNode,
  NodeMap,
  NodeType,
  NodeStatus,
  NodeCreateEvent,
  NodeAppendEvent,
  NodeEvent,
} from '@tracescope/types/node';

describe('StreamNode type', () => {
  it('should create a valid StreamNode with required fields', () => {
    const node: StreamNode = {
      nodeId: 'node-1',
      chunk: 'Hello',
    };

    expect(node.nodeId).toBe('node-1');
    expect(node.chunk).toBe('Hello');
  });

  it('should support all NodeType values', () => {
    const nodeTypes: NodeType[] = [
      'user_input',
      'assistant_thought',
      'tool_call',
      'code_execution',
      'execution_result',
      'final_output',
    ];

    nodeTypes.forEach((nodeType) => {
      const node: StreamNode = {
        nodeId: `node-${nodeType}`,
        nodeType,
        chunk: 'test',
      };
      expect(node.nodeType).toBe(nodeType);
    });
  });

  it('should support all NodeStatus values', () => {
    const statuses: NodeStatus[] = ['streaming', 'complete', 'error'];

    statuses.forEach((status) => {
      const node: StreamNode = {
        nodeId: `node-${status}`,
        status,
        chunk: 'test',
      };
      expect(node.status).toBe(status);
    });
  });

  it('should support optional parent relationship', () => {
    const nodeWithParent: StreamNode = {
      nodeId: 'child-1',
      parentId: 'parent-1',
      chunk: 'child content',
    };

    expect(nodeWithParent.parentId).toBe('parent-1');

    const rootnode: StreamNode = {
      nodeId: 'root-1',
      parentId: null,
      chunk: 'root content',
    };

    expect(rootnode.parentId).toBeNull();
  });

  it('should support timestamps', () => {
    const now = Date.now();
    const node: StreamNode = {
      nodeId: 'node-1',
      chunk: 'test',
      createdAt: now,
      updatedAt: now + 1000,
    };

    expect(node.createdAt).toBe(now);
    expect(node.updatedAt).toBe(now + 1000);
  });

  it('should support agent isolation', () => {
    const node: StreamNode = {
      nodeId: 'node-1',
      agentId: 'agent-123',
      chunk: 'test',
    };

    expect(node.agentId).toBe('agent-123');
  });

  it('should support custom extension fields', () => {
    const node: StreamNode = {
      nodeId: 'node-1',
      chunk: 'test',
      'x-custom-field': 'custom-value',
      'x-metadata': { foo: 'bar' },
    };

    expect(node['x-custom-field']).toBe('custom-value');
    expect((node['x-metadata'] as Record<string, string>).foo).toBe('bar');
  });

  it('should create a complete StreamNode with all fields', () => {
    const node: StreamNode = {
      nodeId: 'complete-node',
      parentId: 'parent-1',
      nodeType: 'tool_call',
      chunk: 'Executing tool...',
      status: 'streaming',
      agentId: 'agent-1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      'x-extra': 'extra-data',
    };

    expect(node.nodeId).toBe('complete-node');
    expect(node.parentId).toBe('parent-1');
    expect(node.nodeType).toBe('tool_call');
    expect(node.chunk).toBe('Executing tool...');
    expect(node.status).toBe('streaming');
    expect(node.agentId).toBe('agent-1');
    expect(node['x-extra']).toBe('extra-data');
  });
});

describe('NodeMap type', () => {
  it('should create a valid NodeMap', () => {
    const nodeMap: NodeMap = {
      'node-1': { nodeId: 'node-1', chunk: 'First' },
      'node-2': { nodeId: 'node-2', chunk: 'Second' },
    };

    expect(nodeMap['node-1'].nodeId).toBe('node-1');
    expect(nodeMap['node-2'].nodeId).toBe('node-2');
    expect(Object.keys(nodeMap)).toHaveLength(2);
  });

  it('should allow O(1) lookup by nodeId', () => {
    const nodeMap: NodeMap = {
      'target-node': { nodeId: 'target-node', chunk: 'Target content' },
    };

    const found = nodeMap['target-node'];
    expect(found).toBeDefined();
    expect(found?.chunk).toBe('Target content');
  });

  it('should return undefined for missing nodes', () => {
    const nodeMap: NodeMap = {};

    expect(nodeMap['non-existent']).toBeUndefined();
  });
});

describe('NodeCreateEvent type', () => {
  it('should create a valid NodeCreateEvent', () => {
    const event: NodeCreateEvent = {
      type: 'node_create',
      node: {
        nodeId: 'new-node',
        nodeType: 'user_input',
        chunk: 'Initial content',
      },
    };

    expect(event.type).toBe('node_create');
    expect(event.node.nodeId).toBe('new-node');
    expect(event.node.nodeType).toBe('user_input');
  });
});

describe('NodeAppendEvent type', () => {
  it('should create a valid NodeAppendEvent', () => {
    const event: NodeAppendEvent = {
      type: 'node_append',
      nodeId: 'existing-node',
      chunk: 'Additional content',
    };

    expect(event.type).toBe('node_append');
    expect(event.nodeId).toBe('existing-node');
    expect(event.chunk).toBe('Additional content');
  });

  it('should include optional status in append event', () => {
    const event: NodeAppendEvent = {
      type: 'node_append',
      nodeId: 'node-1',
      chunk: 'Final chunk',
      status: 'complete',
    };

    expect(event.status).toBe('complete');
  });
});

describe('NodeEvent union type', () => {
  it('should accept NodeCreateEvent', () => {
    const event: NodeEvent = {
      type: 'node_create',
      node: { nodeId: 'node-1', chunk: 'content' },
    };

    expect(event.type).toBe('node_create');
  });

  it('should accept NodeAppendEvent', () => {
    const event: NodeEvent = {
      type: 'node_append',
      nodeId: 'node-1',
      chunk: 'append content',
    };

    expect(event.type).toBe('node_append');
  });

  it('should allow discriminating by type', () => {
    const events: NodeEvent[] = [
      { type: 'node_create', node: { nodeId: 'node-1', chunk: 'init' } },
      { type: 'node_append', nodeId: 'node-1', chunk: 'append' },
    ];

    events.forEach((event) => {
      if (event.type === 'node_create') {
        expect(event.node.nodeId).toBe('node-1');
      } else {
        expect(event.nodeId).toBe('node-1');
      }
    });
  });
});
