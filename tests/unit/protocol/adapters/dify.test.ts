/**
 * Dify Adapter Unit Tests
 * Tests for src/protocol/adapters/dify.ts
 */

import { describe, it, expect } from 'vitest';
import { difyAdapter } from '@tracescope/protocol/adapters/dify';

describe('difyAdapter', () => {
  describe('basic properties', () => {
    it('should have correct name', () => {
      expect(difyAdapter.name).toBe('dify');
    });

    it('should have version', () => {
      expect(difyAdapter.version).toBe('1.0.0');
    });
  });

  describe('transform', () => {
    it('should return empty array for null input', () => {
      const result = difyAdapter.transform(null as unknown as object);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const result = difyAdapter.transform(undefined as unknown as object);
      expect(result).toEqual([]);
    });

    it('should transform single node', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        node_name: 'AI Response',
        status: 'succeeded',
      };

      const result = difyAdapter.transform(difyNode);

      expect(result.length).toBeGreaterThan(0);
      // Should have session start event
      expect(result[0].type).toBe('status');
      expect(result[0].action).toBe('start');
    });

    it('should transform array of nodes', () => {
      const difyNodes = [
        { node_id: 'node-1', node_type: 'llm', status: 'succeeded' },
        { node_id: 'node-2', node_type: 'tool', status: 'running' },
      ];

      const result = difyAdapter.transform(difyNodes);

      expect(result.length).toBeGreaterThan(2);
    });

    it('should transform data wrapper format', () => {
      const difyTrace = {
        data: [
          { node_id: 'node-1', node_type: 'llm', status: 'succeeded' },
        ],
      };

      const result = difyAdapter.transform(difyTrace);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should map LLM node type correctly', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'succeeded',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('llm');
    });

    it('should map tool node type correctly', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'tool',
        status: 'succeeded',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('tool');
    });

    it('should map condition node type correctly', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'conditional',
        status: 'succeeded',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('condition');
    });

    it('should map loop node type correctly', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'loop',
        status: 'succeeded',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('loop');
    });

    it('should map code node type correctly', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'code',
        status: 'succeeded',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('function');
    });

    it('should map succeeded status to completed', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'succeeded',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.status).toBe('completed');
    });

    it('should map failed status correctly', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'failed',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.status).toBe('failed');
    });

    it('should map running status correctly', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'running',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.status).toBe('running');
    });

    it('should map pending status correctly', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'pending',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.status).toBe('pending');
    });

    it('should map skipped status to cancelled', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'skipped',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.status).toBe('cancelled');
    });

    it('should handle node with inputs and outputs', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'succeeded',
        inputs: { prompt: 'Hello' },
        outputs: { response: 'World' },
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.input).toEqual({ prompt: 'Hello' });
      expect(nodeEvent?.data?.output).toEqual({ response: 'World' });
    });

    it('should parse execution timestamps', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'succeeded',
        execution_start_time: '2024-01-01T00:00:00Z',
        execution_end_time: '2024-01-01T00:00:01Z',
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.startTime).toBe(new Date('2024-01-01T00:00:00Z').getTime());
      expect(nodeEvent?.data?.endTime).toBe(new Date('2024-01-01T00:00:01Z').getTime());
    });

    it('should handle children nodes', () => {
      const difyNode = {
        node_id: 'parent',
        node_type: 'chain',
        status: 'succeeded',
        children: [
          { node_id: 'child-1', node_type: 'llm', status: 'succeeded' },
          { node_id: 'child-2', node_type: 'tool', status: 'succeeded' },
        ],
      };

      const result = difyAdapter.transform(difyNode);
      const nodeEvents = result.filter((e) => e.type === 'node');

      expect(nodeEvents.length).toBeGreaterThanOrEqual(3);
    });

    it('should set parentId for children', () => {
      const difyNode = {
        node_id: 'parent',
        node_type: 'chain',
        status: 'succeeded',
        children: [
          { node_id: 'child-1', node_type: 'llm', status: 'succeeded' },
        ],
      };

      const result = difyAdapter.transform(difyNode);
      const childEvent = result.find((e) => e.data?.nodeId === 'child-1');

      expect(childEvent?.data?.parentId).toBe('parent');
    });

    it('should add session start event', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'succeeded',
      };

      const result = difyAdapter.transform(difyNode);

      expect(result[0].type).toBe('status');
      expect(result[0].action).toBe('start');
      expect(result[0].status?.sessionId).toBe('dify-session');
    });

    it('should add session end event when last node completes', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'succeeded',
      };

      const result = difyAdapter.transform(difyNode);
      const lastEvent = result[result.length - 1];

      expect(lastEvent.type).toBe('status');
      expect(lastEvent.action).toBe('complete');
      expect(lastEvent.status?.status).toBe('completed');
    });

    it('should count nodes correctly in session status', () => {
      const difyNodes = [
        { node_id: 'node-1', node_type: 'llm', status: 'succeeded' },
        { node_id: 'node-2', node_type: 'tool', status: 'succeeded' },
      ];

      const result = difyAdapter.transform(difyNodes);
      const sessionStart = result[0];

      expect(sessionStart.status?.totalNodes).toBeGreaterThanOrEqual(2);
    });
  });

  describe('extractEvents', () => {
    it('should parse valid JSON string', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'succeeded',
      };

      const result = difyAdapter.extractEvents(JSON.stringify(difyNode));

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid JSON string', () => {
      const result = difyAdapter.extractEvents('not valid json');
      expect(result).toEqual([]);
    });

    it('should handle object input', () => {
      const difyNode = {
        node_id: 'node-1',
        node_type: 'llm',
        status: 'succeeded',
      };

      const result = difyAdapter.extractEvents(difyNode);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('node type mapping', () => {
    const typeMappings = [
      { input: 'llm', expected: 'llm' },
      { input: 'model', expected: 'llm' },
      { input: 'chat-model', expected: 'llm' },
      { input: 'tool', expected: 'tool' },
      { input: 'tools', expected: 'tool' },
      { input: 'conditional', expected: 'condition' },
      { input: 'if-else', expected: 'condition' },
      { input: 'loop', expected: 'loop' },
      { input: 'iteration', expected: 'loop' },
      { input: 'http', expected: 'tool' },
      { input: 'code', expected: 'function' },
      { input: 'unknown-type', expected: 'custom' },
    ];

    typeMappings.forEach(({ input, expected }) => {
      it(`should map "${input}" to "${expected}"`, () => {
        const difyNode = {
          node_id: 'node-1',
          node_type: input,
          status: 'succeeded',
        };

        const result = difyAdapter.transform(difyNode);
        const nodeEvent = result.find((e) => e.type === 'node');

        expect(nodeEvent?.data?.nodeType).toBe(expected);
      });
    });
  });
});
