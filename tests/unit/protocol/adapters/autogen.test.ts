/**
 * AutoGen Adapter Unit Tests
 * Tests for src/protocol/adapters/autogen.ts
 */

import { describe, it, expect } from 'vitest';
import { autogenAdapter } from '@tracescope/protocol/adapters/autogen';

describe('autogenAdapter', () => {
  describe('basic properties', () => {
    it('should have correct name', () => {
      expect(autogenAdapter.name).toBe('autogen');
    });

    it('should have version', () => {
      expect(autogenAdapter.version).toBe('0.2.0');
    });
  });

  describe('transform', () => {
    it('should return empty array for null input', () => {
      const result = autogenAdapter.transform(null as unknown as object);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const result = autogenAdapter.transform(undefined as unknown as object);
      expect(result).toEqual([]);
    });

    it('should transform single event', () => {
      const autogenEvent = {
        event: 'agent_message',
        sender: 'agent1',
        content: 'Hello!',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);

      expect(result.length).toBeGreaterThan(0);
      // Should have session start event
      expect(result[0].type).toBe('status');
    });

    it('should transform array of events', () => {
      const autogenEvents = [
        { event: 'agent_start', agent: 'agent1', timestamp: Date.now() },
        { event: 'agent_message', sender: 'agent1', content: 'Hello!', timestamp: Date.now() },
      ];

      const result = autogenAdapter.transform(autogenEvents);

      expect(result.length).toBeGreaterThan(2);
    });

    it('should transform events wrapper format', () => {
      const autogenTrace = {
        events: [
          { event: 'agent_start', agent: 'agent1', timestamp: Date.now() },
        ],
      };

      const result = autogenAdapter.transform(autogenTrace);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should infer LLM node type from llm event', () => {
      const autogenEvent = {
        event: 'llm_response',
        sender: 'llm_agent',
        response: 'AI response',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('llm');
    });

    it('should infer tool node type from function event', () => {
      const autogenEvent = {
        event: 'function_call',
        sender: 'agent1',
        function: 'search',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('tool');
    });

    it('should infer function node type from code execution', () => {
      const autogenEvent = {
        event: 'code_execution',
        sender: 'agent1',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('function');
    });

    it('should infer user node type for user messages', () => {
      const autogenEvent = {
        event: 'message',
        sender: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('user');
    });

    it('should infer assistant node type for agent messages', () => {
      const autogenEvent = {
        event: 'message',
        sender: 'assistant',
        content: 'Hi there!',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('assistant');
    });

    it('should set start action for start events', () => {
      const autogenEvent = {
        event: 'agent_start',
        agent: 'agent1',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.action).toBe('start');
    });

    it('should set complete action for end events', () => {
      const autogenEvent = {
        event: 'agent_end',
        agent: 'agent1',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.action).toBe('complete');
    });

    it('should set error action for error events', () => {
      const autogenEvent = {
        event: 'agent_message',
        sender: 'agent1',
        error: 'Something went wrong',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.action).toBe('error');
      expect(nodeEvent?.data?.error).toBe('Something went wrong');
    });

    it('should set update action for streaming events', () => {
      const autogenEvent = {
        event: 'llm_response',
        sender: 'agent1',
        is_streaming: true,
        response: 'partial',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.action).toBe('update');
    });

    it('should include content in output', () => {
      const autogenEvent = {
        event: 'agent_message',
        sender: 'agent1',
        content: 'Hello World',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.output).toBe('Hello World');
    });

    it('should include response in output', () => {
      const autogenEvent = {
        event: 'llm_response',
        sender: 'agent1',
        response: 'AI response',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.output).toBe('AI response');
    });

    it('should include token usage', () => {
      const autogenEvent = {
        event: 'llm_response',
        sender: 'agent1',
        model: 'gpt-4',
        prompt_tokens: 100,
        completion_tokens: 50,
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.model).toBe('gpt-4');
      expect(nodeEvent?.data?.tokenUsage).toEqual({
        input: 100,
        output: 50,
        total: 150,
      });
    });

    it('should include tool parameters', () => {
      const autogenEvent = {
        event: 'function_call',
        sender: 'agent1',
        function: 'search',
        arguments: { query: 'test' },
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.toolName).toBe('search');
      expect(nodeEvent?.data?.toolParams).toEqual({ query: 'test' });
    });

    it('should create message event for content', () => {
      const autogenEvent = {
        event: 'agent_message',
        sender: 'agent1',
        content: 'Hello!',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node' && e.message);

      expect(nodeEvent?.message?.content).toBe('Hello!');
      expect(nodeEvent?.message?.role).toBe('assistant');
    });

    it('should set user role for user messages', () => {
      const autogenEvent = {
        event: 'message',
        sender: 'user',
        content: 'User message',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node' && e.message);

      expect(nodeEvent?.message?.role).toBe('user');
    });

    it('should handle children events', () => {
      const autogenEvent = {
        event: 'agent_start',
        agent: 'parent',
        timestamp: Date.now(),
        children: [
          { event: 'agent_message', sender: 'child1', content: 'child msg', timestamp: Date.now() },
          { event: 'function_call', sender: 'child2', function: 'tool', timestamp: Date.now() },
        ],
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvents = result.filter((e) => e.type === 'node');

      expect(nodeEvents.length).toBeGreaterThanOrEqual(3);
    });

    it('should add session start event', () => {
      const autogenEvent = {
        event: 'agent_message',
        sender: 'agent1',
        content: 'Hello!',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);

      expect(result[0].type).toBe('status');
      expect(result[0].action).toBe('start');
      expect(result[0].status?.sessionId).toBe('autogen-session');
    });

    it('should add session end event when last event completes', () => {
      const autogenEvent = {
        event: 'agent_end',
        agent: 'agent1',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const lastEvent = result[result.length - 1];

      expect(lastEvent.type).toBe('status');
      expect(lastEvent.action).toBe('complete');
    });

    it('should handle receiver relationships', () => {
      const autogenEvent = {
        event: 'agent_message',
        sender: 'agent1',
        receiver: 'agent2',
        content: 'Message',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.transform(autogenEvent);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.parentId).toBeDefined();
    });
  });

  describe('extractEvents', () => {
    it('should parse valid JSON string', () => {
      const autogenEvent = {
        event: 'agent_message',
        sender: 'agent1',
        content: 'Hello!',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.extractEvents(JSON.stringify(autogenEvent));

      expect(result.length).toBeGreaterThan(0);
    });

    it('should parse SSE format string', () => {
      const autogenEvent = {
        event: 'agent_message',
        sender: 'agent1',
        content: 'Hello!',
        timestamp: Date.now(),
      };

      const sseString = `data: ${JSON.stringify(autogenEvent)}`;
      const result = autogenAdapter.extractEvents(sseString);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid JSON string', () => {
      const result = autogenAdapter.extractEvents('not valid json');
      expect(result).toEqual([]);
    });

    it('should handle object input', () => {
      const autogenEvent = {
        event: 'agent_message',
        sender: 'agent1',
        content: 'Hello!',
        timestamp: Date.now(),
      };

      const result = autogenAdapter.extractEvents(autogenEvent);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle data wrapper', () => {
      const autogenTrace = {
        data: {
          event: 'agent_message',
          sender: 'agent1',
          content: 'Hello!',
          timestamp: Date.now(),
        },
      };

      const result = autogenAdapter.extractEvents(autogenTrace);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle events array wrapper', () => {
      const autogenTrace = {
        events: [
          { event: 'agent_message', sender: 'agent1', content: 'Hello!', timestamp: Date.now() },
        ],
      };

      const result = autogenAdapter.extractEvents(autogenTrace);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle array input', () => {
      const autogenEvents = [
        { event: 'agent_message', sender: 'agent1', content: 'Hello!', timestamp: Date.now() },
      ];

      const result = autogenAdapter.extractEvents(autogenEvents);

      expect(result.length).toBeGreaterThan(0);
    });
  });
});
