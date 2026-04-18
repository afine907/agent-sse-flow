/**
 * Config Types Unit Tests
 * Tests for src/types/config.ts
 */

import { describe, it, expect } from 'vitest';
import type {
  ConnectionState,
  SSEManagerConfig,
  StateManagerOptions,
  TraceScopeConfig,
  TraceScopeState,
  NodeStyleConfig,
  ThemeConfig,
  RenderOptions,
  RenderEventType,
  RenderEvent,
  RenderQueueItem,
} from '@tracescope/types/config';
import type { StreamNode } from '@tracescope/types/node';

describe('ConnectionState type', () => {
  it('should accept all valid connection states', () => {
    const states: ConnectionState[] = [
      'connecting',
      'connected',
      'disconnected',
      'error',
    ];

    states.forEach((state) => {
      expect(['connecting', 'connected', 'disconnected', 'error']).toContain(state);
    });
  });
});

describe('SSEManagerConfig type', () => {
  it('should create a valid config with required fields', () => {
    const config: SSEManagerConfig = {
      url: 'https://api.example.com/stream',
    };

    expect(config.url).toBe('https://api.example.com/stream');
  });

  it('should support optional headers', () => {
    const config: SSEManagerConfig = {
      url: 'https://api.example.com/stream',
      headers: {
        Authorization: 'Bearer token123',
        'Content-Type': 'application/json',
      },
    };

    expect(config.headers?.Authorization).toBe('Bearer token123');
  });

  it('should support reconnect configuration', () => {
    const config: SSEManagerConfig = {
      url: 'https://api.example.com/stream',
      reconnectInterval: 1000,
      maxReconnectInterval: 30000,
    };

    expect(config.reconnectInterval).toBe(1000);
    expect(config.maxReconnectInterval).toBe(30000);
  });

  it('should support callbacks', () => {
    const onMessage = vi.fn();
    const onError = vi.fn();
    const onStateChange = vi.fn();

    const config: SSEManagerConfig = {
      url: 'https://api.example.com/stream',
      onMessage,
      onError,
      onStateChange,
    };

    expect(config.onMessage).toBe(onMessage);
    expect(config.onError).toBe(onError);
    expect(config.onStateChange).toBe(onStateChange);
  });

  it('should support query parameters', () => {
    const config: SSEManagerConfig = {
      url: 'https://api.example.com/stream',
      queryParams: {
        agentId: 'agent-123',
        sessionId: 'session-456',
      },
    };

    expect(config.queryParams?.agentId).toBe('agent-123');
    expect(config.queryParams?.sessionId).toBe('session-456');
  });
});

describe('StateManagerOptions type', () => {
  it('should create a valid options object', () => {
    const options: StateManagerOptions = {
      maxNodes: 1000,
    };

    expect(options.maxNodes).toBe(1000);
  });

  it('should support onNodeUpdate callback', () => {
    const onNodeUpdate = vi.fn();
    const options: StateManagerOptions = {
      onNodeUpdate,
    };

    expect(options.onNodeUpdate).toBe(onNodeUpdate);
  });

  it('should be an empty object', () => {
    const options: StateManagerOptions = {};

    expect(options).toEqual({});
  });
});

describe('TraceScopeConfig type', () => {
  it('should create a valid config with required fields', () => {
    const config: TraceScopeConfig = {
      url: 'https://api.example.com/stream',
    };

    expect(config.url).toBe('https://api.example.com/stream');
  });

  it('should support optional headers', () => {
    const config: TraceScopeConfig = {
      url: 'https://api.example.com/stream',
      headers: {
        Authorization: 'Bearer token',
      },
    };

    expect(config.headers?.Authorization).toBe('Bearer token');
  });

  it('should support agent ID filtering', () => {
    const config: TraceScopeConfig = {
      url: 'https://api.example.com/stream',
      agentId: 'agent-123',
    };

    expect(config.agentId).toBe('agent-123');
  });

  it('should support theme configuration', () => {
    const config: TraceScopeConfig = {
      url: 'https://api.example.com/stream',
      theme: {
        darkMode: true,
        animationDuration: 200,
      },
    };

    expect(config.theme?.darkMode).toBe(true);
    expect(config.theme?.animationDuration).toBe(200);
  });

  it('should support error handler', () => {
    const onError = vi.fn();
    const config: TraceScopeConfig = {
      url: 'https://api.example.com/stream',
      onError,
    };

    expect(config.onError).toBe(onError);
  });

  it('should support autoConnect option', () => {
    const config: TraceScopeConfig = {
      url: 'https://api.example.com/stream',
      autoConnect: false,
    };

    expect(config.autoConnect).toBe(false);
  });

  it('should support render options', () => {
    const config: TraceScopeConfig = {
      url: 'https://api.example.com/stream',
      renderOptions: {
        debounceMs: 100,
        incremental: false,
      },
    };

    expect(config.renderOptions?.debounceMs).toBe(100);
    expect(config.renderOptions?.incremental).toBe(false);
  });
});

describe('TraceScopeState type', () => {
  it('should create a valid state object', () => {
    const state: TraceScopeState = {
      nodes: {},
      tree: null,
      connectionState: 'disconnected',
      error: null,
    };

    expect(state.nodes).toEqual({});
    expect(state.tree).toBeNull();
    expect(state.connectionState).toBe('disconnected');
    expect(state.error).toBeNull();
  });

  it('should support nodes with data', () => {
    const node: StreamNode = { nodeId: 'node-1', chunk: 'content' };
    const state: TraceScopeState = {
      nodes: { 'node-1': node },
      tree: null,
      connectionState: 'connected',
      error: null,
    };

    expect(state.nodes['node-1']).toEqual(node);
  });

  it('should support connection states', () => {
    const states: ConnectionState[] = [
      'connecting',
      'connected',
      'disconnected',
      'error',
    ];

    states.forEach((connectionState) => {
      const state: TraceScopeState = {
        nodes: {},
        tree: null,
        connectionState,
        error: null,
      };

      expect(state.connectionState).toBe(connectionState);
    });
  });

  it('should support error state', () => {
    const error = new Error('Connection failed');
    const state: TraceScopeState = {
      nodes: {},
      tree: null,
      connectionState: 'error',
      error,
    };

    expect(state.error).toBe(error);
    expect(state.error?.message).toBe('Connection failed');
  });
});

describe('NodeStyleConfig type', () => {
  it('should create a valid style config', () => {
    const style: NodeStyleConfig = {
      backgroundColor: '#ffffff',
      borderColor: '#e0e0e0',
      labelColor: '#333333',
      indentSize: 32,
      className: 'custom-node',
    };

    expect(style.backgroundColor).toBe('#ffffff');
    expect(style.borderColor).toBe('#e0e0e0');
    expect(style.labelColor).toBe('#333333');
    expect(style.indentSize).toBe(32);
    expect(style.className).toBe('custom-node');
  });

  it('should be an empty object', () => {
    const style: NodeStyleConfig = {};

    expect(style).toEqual({});
  });
});

describe('ThemeConfig type', () => {
  it('should create a valid theme config', () => {
    const theme: ThemeConfig = {
      darkMode: true,
      animationDuration: 200,
    };

    expect(theme.darkMode).toBe(true);
    expect(theme.animationDuration).toBe(200);
  });

  it('should support node styles', () => {
    const theme: ThemeConfig = {
      nodeStyles: {
        llm: {
          backgroundColor: '#e3f2fd',
        },
        tool: {
          backgroundColor: '#fff3e0',
        },
      },
    };

    expect(theme.nodeStyles?.llm?.backgroundColor).toBe('#e3f2fd');
    expect(theme.nodeStyles?.tool?.backgroundColor).toBe('#fff3e0');
  });

  it('should support font sizes', () => {
    const theme: ThemeConfig = {
      fontSizes: {
        label: 14,
        content: 12,
      },
    };

    expect(theme.fontSizes?.label).toBe(14);
    expect(theme.fontSizes?.content).toBe(12);
  });
});

describe('RenderOptions type', () => {
  it('should create a valid render options', () => {
    const options: RenderOptions = {
      debounceMs: 50,
      maxNodesBeforeDegrade: 1000,
      incremental: true,
    };

    expect(options.debounceMs).toBe(50);
    expect(options.maxNodesBeforeDegrade).toBe(1000);
    expect(options.incremental).toBe(true);
  });

  it('should be an empty object', () => {
    const options: RenderOptions = {};

    expect(options).toEqual({});
  });
});

describe('RenderEventType type', () => {
  it('should accept all valid event types', () => {
    const types: RenderEventType[] = ['created', 'updated', 'deleted'];

    types.forEach((type) => {
      expect(['created', 'updated', 'deleted']).toContain(type);
    });
  });
});

describe('RenderEvent type', () => {
  it('should create a valid render event', () => {
    const event: RenderEvent = {
      type: 'created',
      nodeId: 'node-1',
      node: { nodeId: 'node-1', chunk: 'content' },
    };

    expect(event.type).toBe('created');
    expect(event.nodeId).toBe('node-1');
    expect(event.node?.chunk).toBe('content');
  });

  it('should support all event types', () => {
    const types: RenderEventType[] = ['created', 'updated', 'deleted'];

    types.forEach((type) => {
      const event: RenderEvent = {
        type,
        nodeId: 'node-1',
      };

      expect(event.type).toBe(type);
    });
  });
});

describe('RenderQueueItem type', () => {
  it('should create a valid queue item', () => {
    const item: RenderQueueItem = {
      nodeId: 'node-1',
      action: 'create',
      timestamp: Date.now(),
    };

    expect(item.nodeId).toBe('node-1');
    expect(item.action).toBe('create');
    expect(item.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should support all actions', () => {
    const actions: Array<RenderQueueItem['action']> = ['create', 'update', 'delete'];

    actions.forEach((action) => {
      const item: RenderQueueItem = {
        nodeId: 'node-1',
        action,
        timestamp: Date.now(),
      };

      expect(item.action).toBe(action);
    });
  });
});
