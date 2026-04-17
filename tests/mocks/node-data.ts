/**
 * Mock Node Data
 * Test fixtures for StreamNode tests
 */

import type { StreamNode, NodeMap } from '@tracescope/types/node';

/**
 * Create a mock StreamNode
 */
export function createMockNode(
  id: string,
  options: Partial<StreamNode> = {}
): StreamNode {
  const now = Date.now();
  return {
    nodeId: id,
    parentId: options.parentId ?? null,
    nodeType: options.nodeType,
    chunk: options.chunk ?? `Content for ${id}`,
    status: options.status ?? 'streaming',
    agentId: options.agentId,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
    ...options,
  };
}

/**
 * Create a mock NodeMap with multiple nodes
 */
export function createMockNodeMap(count: number): NodeMap {
  const map: NodeMap = {};
  for (let i = 0; i < count; i++) {
    map[`node-${i}`] = createMockNode(`node-${i}`, {
      createdAt: Date.now() + i * 1000,
    });
  }
  return map;
}

/**
 * Sample root node (no parent)
 */
export const rootNode = createMockNode('root', {
  parentId: null,
  chunk: 'Root content',
  status: 'complete',
});

/**
 * Sample child node
 */
export const childNode = createMockNode('child-1', {
  parentId: 'root',
  chunk: 'Child content',
  status: 'streaming',
});

/**
 * Sample node with agent ID
 */
export const nodeWithAgent = createMockNode('agent-node', {
  agentId: 'agent-1',
  chunk: 'Agent content',
});

/**
 * Sample node with different types
 */
export const llmNode = createMockNode('llm-node', {
  nodeType: 'assistant_thought',
  chunk: 'LLM response',
});

export const toolNode = createMockNode('tool-node', {
  nodeType: 'tool_call',
  chunk: 'Tool execution',
});

export const codeNode = createMockNode('code-node', {
  nodeType: 'code_execution',
  chunk: 'Code result',
});

/**
 * Sample error node
 */
export const errorNode = createMockNode('error-node', {
  status: 'error',
  chunk: 'Error occurred',
});

/**
 * Complete node
 */
export const completeNode = createMockNode('complete-node', {
  status: 'complete',
  chunk: 'Final content',
});
