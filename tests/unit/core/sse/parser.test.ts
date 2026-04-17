/**
 * SSE Parser Unit Tests
 * Tests for src/core/sse/parser.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseSSEMessage,
  validateMessage,
  extractNodeData,
  isCompletionEvent,
  isErrorEvent,
} from '@tracescope/core/sse/parser';
import type { SSEStreamMessage } from '@tracescope/types/message';
import { mockConsole } from '../../setup';

// Import mock data
import {
  validNodeCreateMessage,
  validNodeAppendMessage,
  completionEventMessage,
  errorEventMessage,
  invalidJsonString,
  messageMissingFields,
  messageInvalidType,
  messageNegativeSeq,
  messageEmptyMsgId,
  messageInvalidNodeType,
  messageInvalidStatus,
} from '../../mocks/sse-data';

describe('parseSSEMessage', () => {
  beforeEach(() => {
    mockConsole.warn.mockClear();
    mockConsole.error.mockClear();
  });

  describe('valid inputs', () => {
    it('should parse valid node_create JSON string', () => {
      const rawData = JSON.stringify(validNodeCreateMessage);
      const result = parseSSEMessage(rawData);

      expect(result).not.toBeNull();
      expect(result?.msgId).toBe('msg-001');
      expect(result?.type).toBe('node_create');
      expect(result?.data.nodeId).toBe('node-1');
    });

    it('should parse valid node_append JSON string', () => {
      const rawData = JSON.stringify(validNodeAppendMessage);
      const result = parseSSEMessage(rawData);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('node_append');
    });
  });

  describe('invalid inputs', () => {
    it('should return null for invalid JSON', () => {
      const result = parseSSEMessage(invalidJsonString);

      expect(result).toBeNull();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should return null for missing required fields', () => {
      const rawData = JSON.stringify(messageMissingFields);
      const result = parseSSEMessage(rawData);

      expect(result).toBeNull();
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should return null for missing msgId', () => {
      const rawData = JSON.stringify({
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 0,
        timestamp: Date.now(),
      });
      const result = parseSSEMessage(rawData);

      expect(result).toBeNull();
    });

    it('should return null for missing type', () => {
      const rawData = JSON.stringify({
        msgId: 'msg-001',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 0,
        timestamp: Date.now(),
      });
      const result = parseSSEMessage(rawData);

      expect(result).toBeNull();
    });

    it('should return null for missing data', () => {
      const rawData = JSON.stringify({
        msgId: 'msg-001',
        type: 'node_create',
        seq: 0,
        timestamp: Date.now(),
      });
      const result = parseSSEMessage(rawData);

      expect(result).toBeNull();
    });

    it('should return null for missing seq', () => {
      const rawData = JSON.stringify({
        msgId: 'msg-001',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        timestamp: Date.now(),
      });
      const result = parseSSEMessage(rawData);

      expect(result).toBeNull();
    });

    it('should return null for invalid message type', () => {
      const rawData = JSON.stringify(messageInvalidType);
      const result = parseSSEMessage(rawData);

      expect(result).toBeNull();
      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });
});

describe('validateMessage', () => {
  describe('valid messages', () => {
    it('should validate complete node_create message', () => {
      const result = validateMessage(validNodeCreateMessage);

      expect(result.valid).toBe(true);
    });

    it('should validate node_append message', () => {
      const result = validateMessage(validNodeAppendMessage);

      expect(result.valid).toBe(true);
    });

    it('should validate message with optional fields', () => {
      const result = validateMessage({
        msgId: 'msg-001',
        type: 'node_create',
        data: {
          nodeId: 'node-1',
          parentId: 'parent-1',
          chunk: 'content',
          nodeType: 'tool_call',
          status: 'streaming',
          agentId: 'agent-1',
        },
        seq: 0,
        timestamp: Date.now(),
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject null', () => {
      const result = validateMessage(null);

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('root');
    });

    it('should reject undefined', () => {
      const result = validateMessage(undefined);

      expect(result.valid).toBe(false);
    });

    it('should reject non-object (string)', () => {
      const result = validateMessage('string');

      expect(result.valid).toBe(false);
    });

    it('should reject non-object (number)', () => {
      const result = validateMessage(123);

      expect(result.valid).toBe(false);
    });

    it('should reject empty msgId', () => {
      const result = validateMessage(messageEmptyMsgId);

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('msgId');
    });

    it('should reject negative seq', () => {
      const result = validateMessage(messageNegativeSeq);

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('seq');
    });

    it('should reject invalid nodeType', () => {
      const result = validateMessage(messageInvalidNodeType);

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('data.nodeType');
    });

    it('should reject invalid status', () => {
      const result = validateMessage(messageInvalidStatus);

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('data.status');
    });

    it('should reject missing nodeId in data', () => {
      const result = validateMessage({
        msgId: 'msg-001',
        type: 'node_create',
        data: { chunk: 'content' },
        seq: 0,
        timestamp: Date.now(),
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('data.nodeId');
    });

    it('should reject non-string chunk', () => {
      const result = validateMessage({
        msgId: 'msg-001',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 123 },
        seq: 0,
        timestamp: Date.now(),
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('data.chunk');
    });

    it('should reject zero timestamp', () => {
      const result = validateMessage({
        msgId: 'msg-001',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 0,
        timestamp: 0,
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('timestamp');
    });

    it('should reject negative timestamp', () => {
      const result = validateMessage({
        msgId: 'msg-001',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 0,
        timestamp: -1,
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('timestamp');
    });
  });
});

describe('extractNodeData', () => {
  it('should extract data from message', () => {
    const nodeData = extractNodeData(validNodeCreateMessage);

    expect(nodeData.nodeId).toBe('node-1');
    expect(nodeData.chunk).toBe('Initial content');
  });

  it('should preserve all data fields', () => {
    const nodeData = extractNodeData(validNodeAppendMessage);

    expect(nodeData.nodeId).toBe('node-1');
    expect(nodeData.chunk).toBe(' appended content');
    expect(nodeData.status).toBe('streaming');
  });
});

describe('isCompletionEvent', () => {
  it('should return true for completion event', () => {
    const result = isCompletionEvent(completionEventMessage);

    expect(result).toBe(true);
  });

  it('should return false for non-completion event (has chunk)', () => {
    const result = isCompletionEvent(validNodeAppendMessage);

    expect(result).toBe(false);
  });

  it('should return false for non-completion event (wrong status)', () => {
    const result = isCompletionEvent(validNodeCreateMessage);

    expect(result).toBe(false);
  });

  it('should return false for error event', () => {
    const result = isCompletionEvent(errorEventMessage);

    expect(result).toBe(false);
  });

  it('should return false for node_create type', () => {
    const result = isCompletionEvent(validNodeCreateMessage);

    expect(result).toBe(false);
  });
});

describe('isErrorEvent', () => {
  it('should return true for error event', () => {
    const result = isErrorEvent(errorEventMessage);

    expect(result).toBe(true);
  });

  it('should return false for streaming status', () => {
    const result = isErrorEvent(validNodeAppendMessage);

    expect(result).toBe(false);
  });

  it('should return false for complete status', () => {
    const result = isErrorEvent(completionEventMessage);

    expect(result).toBe(false);
  });
});
