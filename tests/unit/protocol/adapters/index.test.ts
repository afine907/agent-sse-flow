/**
 * Protocol Adapters Registry Unit Tests
 * Tests for src/protocol/adapters.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerAdapter,
  getAdapter,
  getAdapterNames,
  createAdapter,
  customAdapter,
  langchainAdapter,
  difyAdapter,
  autogenAdapter,
} from '@tracescope/protocol/adapters';
import type { ProtocolAdapter } from '@tracescope/protocol/types';

describe('Adapter Registry', () => {
  describe('built-in adapters', () => {
    it('should have custom adapter', () => {
      expect(customAdapter.name).toBe('custom');
    });

    it('should have langchain adapter', () => {
      expect(langchainAdapter.name).toBe('langchain');
    });

    it('should have dify adapter', () => {
      expect(difyAdapter.name).toBe('dify');
    });

    it('should have autogen adapter', () => {
      expect(autogenAdapter.name).toBe('autogen');
    });
  });

  describe('getAdapterNames', () => {
    it('should return all built-in adapter names', () => {
      const names = getAdapterNames();

      expect(names).toContain('custom');
      expect(names).toContain('langchain');
      expect(names).toContain('dify');
      expect(names).toContain('autogen');
    });

    it('should return array of strings', () => {
      const names = getAdapterNames();

      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('getAdapter', () => {
    it('should return custom adapter by name', () => {
      const adapter = getAdapter('custom');
      expect(adapter?.name).toBe('custom');
    });

    it('should return langchain adapter by name', () => {
      const adapter = getAdapter('langchain');
      expect(adapter?.name).toBe('langchain');
    });

    it('should return dify adapter by name', () => {
      const adapter = getAdapter('dify');
      expect(adapter?.name).toBe('dify');
    });

    it('should return autogen adapter by name', () => {
      const adapter = getAdapter('autogen');
      expect(adapter?.name).toBe('autogen');
    });

    it('should return undefined for unknown adapter', () => {
      const adapter = getAdapter('unknown-adapter');
      expect(adapter).toBeUndefined();
    });
  });

  describe('registerAdapter', () => {
    it('should register a new adapter', () => {
      const newAdapter: ProtocolAdapter = {
        name: 'test-adapter',
        version: '1.0.0',
        transform: () => [],
        extractEvents: () => [],
      };

      registerAdapter(newAdapter);

      expect(getAdapter('test-adapter')).toEqual(newAdapter);
    });

    it('should overwrite existing adapter with same name', () => {
      const adapter1: ProtocolAdapter = {
        name: 'overwrite-test',
        version: '1.0.0',
        transform: () => [],
        extractEvents: () => [],
      };

      const adapter2: ProtocolAdapter = {
        name: 'overwrite-test',
        version: '2.0.0',
        transform: () => [],
        extractEvents: () => [],
      };

      registerAdapter(adapter1);
      registerAdapter(adapter2);

      const retrieved = getAdapter('overwrite-test');
      expect(retrieved?.version).toBe('2.0.0');
    });
  });

  describe('createAdapter', () => {
    it('should return existing adapter by name', () => {
      const adapter = createAdapter('custom');
      expect(adapter.name).toBe('custom');
    });

    it('should return langchain adapter by name', () => {
      const adapter = createAdapter('langchain');
      expect(adapter.name).toBe('langchain');
    });

    it('should return custom adapter for unknown name', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const adapter = createAdapter('non-existent');
      expect(adapter.name).toBe('custom');
      
      consoleWarn.mockRestore();
    });

    it('should register and return custom adapter object', () => {
      const customAdapterObj: ProtocolAdapter = {
        name: 'dynamic-adapter',
        version: '1.0.0',
        transform: () => [],
        extractEvents: () => [],
      };

      const adapter = createAdapter(customAdapterObj);

      expect(adapter.name).toBe('dynamic-adapter');
      expect(getAdapter('dynamic-adapter')).toEqual(customAdapterObj);
    });

    it('should handle null adapter object gracefully', () => {
      // Null is not a valid ProtocolAdapter, function should handle gracefully
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // createAdapter treats null as unknown string, returns custom adapter
      const adapter = createAdapter(null as unknown as string);
      expect(adapter.name).toBe('custom');
      
      consoleWarn.mockRestore();
    });

    it('should handle string adapter name', () => {
      const adapter = createAdapter('dify');
      expect(adapter.name).toBe('dify');
    });
  });

  describe('adapter integration', () => {
    it('should be able to transform events through registry', () => {
      const adapter = getAdapter('custom');
      const event = {
        id: 'test-event',
        type: 'node' as const,
        action: 'start' as const,
        timestamp: Date.now(),
      };

      const result = adapter?.transform(event);
      expect(result).toHaveLength(1);
      expect(result?.[0].id).toBe('test-event');
    });

    it('should be able to extract events through registry', () => {
      const adapter = getAdapter('langchain');
      const langchainEvent = {
        id: ['llm:', 'ChatOpenAI'],
        name: 'ChatOpenAI',
        start_time: 1234567890,
      };

      const result = adapter?.extractEvents(JSON.stringify(langchainEvent));
      expect(result?.length).toBeGreaterThan(0);
    });
  });
});
