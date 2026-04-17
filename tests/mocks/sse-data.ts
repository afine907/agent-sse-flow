/**
 * Mock SSE Message Data
 * Test fixtures for SSE parser tests
 */

import type { SSEStreamMessage } from '@tracescope/types/message';

/**
 * Valid node_create message
 */
export const validNodeCreateMessage: SSEStreamMessage = {
  msgId: 'msg-001',
  type: 'node_create',
  data: {
    nodeId: 'node-1',
    parentId: null,
    chunk: 'Initial content',
    nodeType: 'user_input',
    status: 'streaming',
  },
  seq: 0,
  timestamp: Date.now(),
};

/**
 * Valid node_append message
 */
export const validNodeAppendMessage: SSEStreamMessage = {
  msgId: 'msg-002',
  type: 'node_append',
  data: {
    nodeId: 'node-1',
    chunk: ' appended content',
    status: 'streaming',
  },
  seq: 1,
  timestamp: Date.now(),
};

/**
 * Completion event message
 */
export const completionEventMessage: SSEStreamMessage = {
  msgId: 'msg-003',
  type: 'node_append',
  data: {
    nodeId: 'node-1',
    chunk: '',
    status: 'complete',
  },
  seq: 2,
  timestamp: Date.now(),
};

/**
 * Error event message
 */
export const errorEventMessage: SSEStreamMessage = {
  msgId: 'msg-004',
  type: 'node_append',
  data: {
    nodeId: 'node-1',
    chunk: '',
    status: 'error',
  },
  seq: 3,
  timestamp: Date.now(),
};

/**
 * Message with all optional fields
 */
export const fullMessage: SSEStreamMessage = {
  msgId: 'msg-005',
  type: 'node_create',
  data: {
    nodeId: 'node-2',
    parentId: 'node-1',
    chunk: 'Full content',
    nodeType: 'tool_call',
    status: 'streaming',
    agentId: 'agent-1',
  },
  seq: 4,
  timestamp: Date.now(),
};

/**
 * Invalid JSON string
 */
export const invalidJsonString = 'not valid json';

/**
 * Message missing required fields
 */
export const messageMissingFields = {
  msgId: 'msg-006',
  // missing type, data, seq
  timestamp: Date.now(),
};

/**
 * Message with invalid type
 */
export const messageInvalidType = {
  msgId: 'msg-007',
  type: 'invalid_type',
  data: { nodeId: 'node-1', chunk: '' },
  seq: 0,
  timestamp: Date.now(),
};

/**
 * Message with negative seq
 */
export const messageNegativeSeq = {
  msgId: 'msg-008',
  type: 'node_create',
  data: { nodeId: 'node-1', chunk: '' },
  seq: -1,
  timestamp: Date.now(),
};

/**
 * Message with empty msgId
 */
export const messageEmptyMsgId = {
  msgId: '',
  type: 'node_create',
  data: { nodeId: 'node-1', chunk: '' },
  seq: 0,
  timestamp: Date.now(),
};

/**
 * Message with invalid nodeType
 */
export const messageInvalidNodeType = {
  msgId: 'msg-009',
  type: 'node_create',
  data: {
    nodeId: 'node-1',
    chunk: '',
    nodeType: 'invalid_node_type',
  },
  seq: 0,
  timestamp: Date.now(),
};

/**
 * Message with invalid status
 */
export const messageInvalidStatus = {
  msgId: 'msg-010',
  type: 'node_create',
  data: {
    nodeId: 'node-1',
    chunk: '',
    status: 'invalid_status',
  },
  seq: 0,
  timestamp: Date.now(),
};
