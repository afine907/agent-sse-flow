/**
 * Message Types Unit Tests
 * Tests for src/types/message.ts
 */

import { describe, it, expect } from 'vitest';
import type {
  MessageType,
  SSEStreamMessage,
  SSEErrorMessage,
  RawSSEMessage,
  ValidationResult,
} from '@tracescope/types/message';
import type { StreamNode } from '@tracescope/types/node';

describe('MessageType type', () => {
  it('should accept all valid message types', () => {
    const types: MessageType[] = ['node_create', 'node_append'];

    types.forEach((type) => {
      expect(['node_create', 'node_append']).toContain(type);
    });
  });
});

describe('SSEStreamMessage type', () => {
  const createStreamNode = (id: string): StreamNode => ({
    nodeId: id,
    chunk: 'test content',
  });

  it('should create a valid SSEStreamMessage with required fields', () => {
    const message: SSEStreamMessage = {
      msgId: 'msg-123-uuid',
      type: 'node_create',
      data: createStreamNode('node-1'),
      seq: 1,
      timestamp: Date.now(),
    };

    expect(message.msgId).toBe('msg-123-uuid');
    expect(message.type).toBe('node_create');
    expect(message.data.nodeId).toBe('node-1');
    expect(message.seq).toBe(1);
    expect(message.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should support node_append message type', () => {
    const message: SSEStreamMessage = {
      msgId: 'msg-456',
      type: 'node_append',
      data: createStreamNode('node-1'),
      seq: 2,
      timestamp: Date.now(),
    };

    expect(message.type).toBe('node_append');
  });

  it('should support optional protocolVersion', () => {
    const message: SSEStreamMessage = {
      msgId: 'msg-1',
      type: 'node_create',
      data: createStreamNode('node-1'),
      seq: 1,
      timestamp: Date.now(),
      protocolVersion: '1.0.0',
    };

    expect(message.protocolVersion).toBe('1.0.0');
  });

  it('should have 13-digit timestamp', () => {
    const timestamp = Date.now();
    const message: SSEStreamMessage = {
      msgId: 'msg-1',
      type: 'node_create',
      data: createStreamNode('node-1'),
      seq: 1,
      timestamp,
    };

    const timestampStr = String(message.timestamp);
    expect(timestampStr.length).toBe(13);
  });

  it('should support auto-incrementing sequence', () => {
    const messages: SSEStreamMessage[] = [1, 2, 3].map((seq) => ({
      msgId: `msg-${seq}`,
      type: 'node_append' as const,
      data: createStreamNode('node-1'),
      seq,
      timestamp: Date.now(),
    }));

    expect(messages[0].seq).toBe(1);
    expect(messages[1].seq).toBe(2);
    expect(messages[2].seq).toBe(3);
  });

  it('should support full StreamNode data', () => {
    const fullNode: StreamNode = {
      nodeId: 'full-node',
      parentId: 'parent-1',
      nodeType: 'tool_call',
      chunk: 'Executing tool...',
      status: 'streaming',
      agentId: 'agent-1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const message: SSEStreamMessage = {
      msgId: 'msg-full',
      type: 'node_create',
      data: fullNode,
      seq: 1,
      timestamp: Date.now(),
    };

    expect(message.data.nodeType).toBe('tool_call');
    expect(message.data.status).toBe('streaming');
    expect(message.data.agentId).toBe('agent-1');
  });
});

describe('SSEErrorMessage type', () => {
  it('should create a valid error message', () => {
    const error: SSEErrorMessage = {
      code: 'E001',
      message: 'Connection timeout',
      timestamp: Date.now(),
    };

    expect(error.code).toBe('E001');
    expect(error.message).toBe('Connection timeout');
    expect(error.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should support various error codes', () => {
    const errorCodes = [
      'E001', // Connection error
      'E002', // Parse error
      'E003', // Validation error
      'E500', // Server error
    ];

    errorCodes.forEach((code) => {
      const error: SSEErrorMessage = {
        code,
        message: `Error ${code}`,
        timestamp: Date.now(),
      };

      expect(error.code).toBe(code);
    });
  });

  it('should have human-readable message', () => {
    const error: SSEErrorMessage = {
      code: 'E001',
      message: 'Failed to parse SSE message: invalid JSON',
      timestamp: Date.now(),
    };

    expect(error.message).toContain('Failed to parse');
    expect(error.message.length).toBeGreaterThan(10);
  });
});

describe('RawSSEMessage type', () => {
  it('should create a raw message with only raw data', () => {
    const rawMessage: RawSSEMessage = {
      raw: 'data: {"type":"node_create"}',
    };

    expect(rawMessage.raw).toBe('data: {"type":"node_create"}');
    expect(rawMessage.parsed).toBeUndefined();
    expect(rawMessage.parseError).toBeUndefined();
  });

  it('should support parsed message', () => {
    const parsed: SSEStreamMessage = {
      msgId: 'msg-1',
      type: 'node_create',
      data: { nodeId: 'node-1', chunk: 'test' },
      seq: 1,
      timestamp: Date.now(),
    };

    const rawMessage: RawSSEMessage = {
      raw: '{"msgId":"msg-1",...}',
      parsed,
    };

    expect(rawMessage.parsed).toEqual(parsed);
  });

  it('should support parse error', () => {
    const parseError = new Error('Unexpected token');

    const rawMessage: RawSSEMessage = {
      raw: '{invalid json}',
      parseError,
    };

    expect(rawMessage.parseError).toBe(parseError);
    expect(rawMessage.parseError?.message).toBe('Unexpected token');
  });

  it('should handle SSE format data', () => {
    const rawMessage: RawSSEMessage = {
      raw: 'data: {"msgId":"123","type":"node_create","data":{"nodeId":"n1","chunk":"test"},"seq":1,"timestamp":1234567890123}',
    };

    expect(rawMessage.raw).toContain('data:');
    expect(rawMessage.raw).toContain('node_create');
  });
});

describe('ValidationResult type', () => {
  it('should create a valid result', () => {
    const result: ValidationResult = {
      valid: true,
    };

    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('should create an invalid result', () => {
    const result: ValidationResult = {
      valid: false,
      error: {
        field: 'msgId',
        reason: 'Required field is missing',
      },
    };

    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('msgId');
    expect(result.error?.reason).toBe('Required field is missing');
  });

  it('should include parsed message for valid result', () => {
    const parsed: SSEStreamMessage = {
      msgId: 'msg-1',
      type: 'node_create',
      data: { nodeId: 'node-1', chunk: 'test' },
      seq: 1,
      timestamp: Date.now(),
    };

    const result: ValidationResult = {
      valid: true,
      message: parsed,
    };

    expect(result.valid).toBe(true);
    expect(result.message).toEqual(parsed);
  });

  it('should support various validation errors', () => {
    const errors = [
      { field: 'msgId', reason: 'Must be a valid UUID' },
      { field: 'type', reason: 'Must be one of: node_create, node_append' },
      { field: 'seq', reason: 'Must be a positive integer' },
      { field: 'timestamp', reason: 'Must be a 13-digit timestamp' },
    ];

    errors.forEach(({ field, reason }) => {
      const result: ValidationResult = {
        valid: false,
        error: { field, reason },
      };

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe(field);
      expect(result.error?.reason).toBe(reason);
    });
  });
});
