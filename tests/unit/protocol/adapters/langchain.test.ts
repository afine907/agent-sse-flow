/**
 * LangChain Adapter Unit Tests
 * Tests for src/protocol/adapters/langchain.ts
 */

import { describe, it, expect } from 'vitest';
import { langchainAdapter } from '@tracescope/protocol/adapters/langchain';

describe('langchainAdapter', () => {
  describe('basic properties', () => {
    it('should have correct name', () => {
      expect(langchainAdapter.name).toBe('langchain');
    });

    it('should have version', () => {
      expect(langchainAdapter.version).toBe('0.1.0');
    });
  });

  describe('transform', () => {
    it('should return empty array for null input', () => {
      const result = langchainAdapter.transform(null as unknown as object);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const result = langchainAdapter.transform(undefined as unknown as object);
      expect(result).toEqual([]);
    });

    it('should transform single node', () => {
      const langchainNode = {
        id: ['chain:', 'RunnableSequence'],
        name: 'RunnableSequence',
        start_time: 1234567890,
        end_time: 1234567891,
      };

      const result = langchainAdapter.transform(langchainNode);

      expect(result.length).toBeGreaterThan(0);
      // Should have start and complete events
      expect(result.some((e) => e.action === 'start')).toBe(true);
      expect(result.some((e) => e.action === 'complete')).toBe(true);
    });

    it('should transform array of nodes', () => {
      const langchainNodes = [
        { id: ['chain:1'], name: 'Chain 1', start_time: 1234567890 },
        { id: ['chain:2'], name: 'Chain 2', start_time: 1234567891 },
      ];

      const result = langchainAdapter.transform(langchainNodes);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect LLM node type from id', () => {
      const langchainNode = {
        id: ['llm:', 'ChatOpenAI'],
        name: 'ChatOpenAI',
        start_time: 1234567890,
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('llm');
    });

    it('should detect LLM node type from chatmodel in id', () => {
      const langchainNode = {
        id: ['chain:', 'ChatModel'],
        name: 'ChatModel',
        start_time: 1234567890,
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('llm');
    });

    it('should detect tool node type from id', () => {
      const langchainNode = {
        id: ['tool:', 'SearchTool'],
        name: 'SearchTool',
        start_time: 1234567890,
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('tool');
    });

    it('should detect retrieval node type from id', () => {
      const langchainNode = {
        id: ['retrieval:', 'VectorStore'],
        name: 'VectorStoreRetriever',
        start_time: 1234567890,
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('retrieval');
    });

    it('should detect function node type from id', () => {
      const langchainNode = {
        id: ['function:', 'CustomFunction'],
        name: 'CustomFunction',
        start_time: 1234567890,
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('function');
    });

    it('should default to custom for unknown types', () => {
      const langchainNode = {
        id: ['unknown:', 'UnknownNode'],
        name: 'UnknownNode',
        start_time: 1234567890,
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.nodeType).toBe('custom');
    });

    it('should include input in start event', () => {
      const langchainNode = {
        id: ['chain:', 'Chain'],
        name: 'Chain',
        start_time: 1234567890,
        input: { query: 'Hello' },
      };

      const result = langchainAdapter.transform(langchainNode);
      const startEvent = result.find((e) => e.action === 'start');

      expect(startEvent?.data?.input).toEqual({ query: 'Hello' });
    });

    it('should include output in complete event', () => {
      const langchainNode = {
        id: ['chain:', 'Chain'],
        name: 'Chain',
        start_time: 1234567890,
        end_time: 1234567891,
        output: { result: 'World' },
      };

      const result = langchainAdapter.transform(langchainNode);
      const completeEvent = result.find((e) => e.action === 'complete');

      expect(completeEvent?.data?.output).toEqual({ result: 'World' });
    });

    it('should convert timestamps from seconds to milliseconds', () => {
      const langchainNode = {
        id: ['chain:', 'Chain'],
        name: 'Chain',
        start_time: 1234567890,
        end_time: 1234567891,
      };

      const result = langchainAdapter.transform(langchainNode);

      const startEvent = result.find((e) => e.action === 'start');
      const completeEvent = result.find((e) => e.action === 'complete');

      expect(startEvent?.timestamp).toBe(1234567890 * 1000);
      expect(completeEvent?.timestamp).toBe(1234567891 * 1000);
    });

    it('should include token usage from llm_output', () => {
      const langchainNode = {
        id: ['llm:', 'ChatOpenAI'],
        name: 'ChatOpenAI',
        start_time: 1234567890,
        end_time: 1234567891,
        llm_output: {
          token_usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        },
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvent = result.find((e) => e.action === 'start');

      expect(nodeEvent?.data?.tokenUsage).toEqual({
        input: 100,
        output: 50,
        total: 150,
      });
    });

    it('should include model name from llm_output', () => {
      const langchainNode = {
        id: ['llm:', 'ChatOpenAI'],
        name: 'ChatOpenAI',
        start_time: 1234567890,
        llm_output: {
          model_name: 'gpt-4',
        },
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvent = result.find((e) => e.action === 'start');

      expect(nodeEvent?.data?.model).toBe('gpt-4');
    });

    it('should handle children nodes', () => {
      const langchainNode = {
        id: ['chain:', 'ParentChain'],
        name: 'ParentChain',
        start_time: 1234567890,
        end_time: 1234567891,
        children: [
          { id: ['llm:', 'ChildLLM'], name: 'ChildLLM', start_time: 1234567890 },
          { id: ['tool:', 'ChildTool'], name: 'ChildTool', start_time: 1234567890 },
        ],
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvents = result.filter((e) => e.type === 'node');

      expect(nodeEvents.length).toBeGreaterThanOrEqual(4); // 2 events per node
    });

    it('should set parentId for children', () => {
      const langchainNode = {
        id: ['chain:', 'Parent'],
        name: 'Parent',
        start_time: 1234567890,
        children: [
          { id: ['llm:', 'Child'], name: 'Child', start_time: 1234567890 },
        ],
      };

      const result = langchainAdapter.transform(langchainNode);
      
      // Find child events (should have parentId set to parent's id)
      const childEvents = result.filter((e) => 
        e.data?.nodeId?.includes('Child') && e.data?.parentId
      );

      expect(childEvents.length).toBeGreaterThan(0);
    });

    it('should not create complete event without end_time', () => {
      const langchainNode = {
        id: ['chain:', 'Chain'],
        name: 'Chain',
        start_time: 1234567890,
        // no end_time
      };

      const result = langchainAdapter.transform(langchainNode);

      expect(result.some((e) => e.action === 'start')).toBe(true);
      expect(result.some((e) => e.action === 'complete')).toBe(false);
    });

    it('should use node name from name field', () => {
      const langchainNode = {
        id: ['chain:', 'Chain'],
        name: 'My Custom Chain',
        start_time: 1234567890,
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.name).toBe('My Custom Chain');
    });

    it('should use id[1] as fallback name', () => {
      const langchainNode = {
        id: ['chain:', 'ChainName'],
        start_time: 1234567890,
      };

      const result = langchainAdapter.transform(langchainNode);
      const nodeEvent = result.find((e) => e.type === 'node');

      expect(nodeEvent?.data?.name).toBe('ChainName');
    });
  });

  describe('extractEvents', () => {
    it('should parse valid JSON string', () => {
      const langchainNode = {
        id: ['chain:', 'Chain'],
        name: 'Chain',
        start_time: 1234567890,
      };

      const result = langchainAdapter.extractEvents(JSON.stringify(langchainNode));

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid JSON string', () => {
      const result = langchainAdapter.extractEvents('not valid json');
      expect(result).toEqual([]);
    });

    it('should handle object input', () => {
      const langchainNode = {
        id: ['chain:', 'Chain'],
        name: 'Chain',
        start_time: 1234567890,
      };

      const result = langchainAdapter.extractEvents(langchainNode);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle array object input', () => {
      const langchainNodes = [
        { id: ['chain:1'], name: 'Chain 1', start_time: 1234567890 },
        { id: ['chain:2'], name: 'Chain 2', start_time: 1234567891 },
      ];

      const result = langchainAdapter.extractEvents(langchainNodes);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });
});
