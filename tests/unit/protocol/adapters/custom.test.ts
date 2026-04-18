/**
 * Custom Adapter Unit Tests
 * Tests for src/protocol/adapters/custom.ts
 */

import { describe, it, expect } from 'vitest';
import { customAdapter } from '@tracescope/protocol/adapters/custom';
import type { ProtocolEvent } from '@tracescope/protocol/types';

describe('customAdapter', () => {
  describe('basic properties', () => {
    it('should have correct name', () => {
      expect(customAdapter.name).toBe('custom');
    });

    it('should have version', () => {
      expect(customAdapter.version).toBe('1.0.0');
    });
  });

  describe('transform', () => {
    it('should return empty array for null input', () => {
      const result = customAdapter.transform(null as unknown as ProtocolEvent[]);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const result = customAdapter.transform(undefined as unknown as ProtocolEvent[]);
      expect(result).toEqual([]);
    });

    it('should return empty array for primitive input', () => {
      expect(customAdapter.transform('string' as unknown as ProtocolEvent[])).toEqual([]);
      expect(customAdapter.transform(123 as unknown as ProtocolEvent[])).toEqual([]);
    });

    it('should wrap single event in array', () => {
      const event: ProtocolEvent = {
        id: 'event-1',
        type: 'node',
        action: 'start',
        timestamp: Date.now(),
      };

      const result = customAdapter.transform(event);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(event);
    });

    it('should pass through array of events', () => {
      const events: ProtocolEvent[] = [
        { id: 'event-1', type: 'node', action: 'start', timestamp: Date.now() },
        { id: 'event-2', type: 'node', action: 'complete', timestamp: Date.now() },
      ];

      const result = customAdapter.transform(events);

      expect(result).toHaveLength(2);
      expect(result).toEqual(events);
    });

    it('should handle empty array', () => {
      const result = customAdapter.transform([]);
      expect(result).toEqual([]);
    });

    it('should handle event with data', () => {
      const event: ProtocolEvent = {
        id: 'event-1',
        type: 'node',
        action: 'start',
        timestamp: Date.now(),
        data: {
          nodeId: 'node-1',
          nodeType: 'llm',
          name: 'LLM Node',
          status: 'running',
        },
      };

      const result = customAdapter.transform(event);

      expect(result[0].data?.nodeId).toBe('node-1');
    });

    it('should handle event with status', () => {
      const event: ProtocolEvent = {
        id: 'event-1',
        type: 'status',
        action: 'start',
        timestamp: Date.now(),
        status: {
          sessionId: 'session-1',
          status: 'running',
          completedNodes: 0,
          totalNodes: 10,
        },
      };

      const result = customAdapter.transform(event);

      expect(result[0].status?.sessionId).toBe('session-1');
    });

    it('should handle event with message', () => {
      const event: ProtocolEvent = {
        id: 'event-1',
        type: 'message',
        action: 'update',
        timestamp: Date.now(),
        message: {
          messageId: 'msg-1',
          role: 'assistant',
          content: 'Hello!',
          contentType: 'text',
          createdAt: Date.now(),
        },
      };

      const result = customAdapter.transform(event);

      expect(result[0].message?.content).toBe('Hello!');
    });
  });

  describe('extractEvents', () => {
    it('should parse valid JSON string', () => {
      const event = {
        id: 'event-1',
        type: 'node',
        action: 'start',
        timestamp: Date.now(),
      };

      const result = customAdapter.extractEvents(JSON.stringify(event));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('event-1');
    });

    it('should parse JSON array string', () => {
      const events = [
        { id: 'event-1', type: 'node', action: 'start', timestamp: Date.now() },
        { id: 'event-2', type: 'node', action: 'complete', timestamp: Date.now() },
      ];

      const result = customAdapter.extractEvents(JSON.stringify(events));

      expect(result).toHaveLength(2);
    });

    it('should return empty array for invalid JSON string', () => {
      const result = customAdapter.extractEvents('not valid json');
      expect(result).toEqual([]);
    });

    it('should handle object input', () => {
      const event: ProtocolEvent = {
        id: 'event-1',
        type: 'node',
        action: 'start',
        timestamp: Date.now(),
      };

      const result = customAdapter.extractEvents(event);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('event-1');
    });

    it('should handle array object input', () => {
      const events: ProtocolEvent[] = [
        { id: 'event-1', type: 'node', action: 'start', timestamp: Date.now() },
        { id: 'event-2', type: 'node', action: 'complete', timestamp: Date.now() },
      ];

      const result = customAdapter.extractEvents(events);

      expect(result).toHaveLength(2);
    });

    it('should handle null object input', () => {
      const result = customAdapter.extractEvents(null as unknown as object);
      expect(result).toEqual([]);
    });
  });
});
