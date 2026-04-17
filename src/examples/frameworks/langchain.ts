/**
 * LangChain Trace Example
 * 
 * 展示如何使用 LangChain 适配器
 * 
 * LangChain 的 trace 数据通常包含:
 * - id: 节点 ID 数组，如 ["chain:", "RunnableSequence", "chain"]
 * - name: 节点名称
 * - input/output: 输入输出
 * - start_time/end_time: 时间戳(秒)
 * - children: 子节点
 * - llm_output: LLM 特有输出(token usage, model name)
 */

import type { ProtocolEvent } from '../../protocol/types';
import type { TreeNode } from '../../types/tree';

/**
 * 标准 LangChain trace 格式
 */
export interface LangChainTrace {
  id: string[];
  name: string;
  input?: unknown;
  output?: unknown;
  start_time: number;
  end_time?: number;
  children?: LangChainTrace[];
  llm_output?: {
    token_usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    model_name?: string;
  };
  run_id?: string;
}

/**
 * LangChain 示例数据 - 完整的 Agent 流程
 */
export const langchainAgentTrace: LangChainTrace = {
  id: ['agent:', 'agent_executor'],
  name: 'AgentExecutor',
  input: '帮我查一下北京今天的天气，然后给出一个穿衣建议',
  start_time: Math.floor((Date.now() - 30000) / 1000),
  end_time: Math.floor(Date.now() / 1000),
  children: [
    {
      id: ['chain:', 'RunnableSequence', 'tools'],
      name: 'RunnableSequence',
      input: '帮我查一下北京今天的天气，然后给出一个穿衣建议',
      output: '需要调用天气查询工具',
      start_time: Math.floor((Date.now() - 28000) / 1000),
      end_time: Math.floor((Date.now() - 25000) / 1000),
      children: [
        {
          id: ['llm:', 'ChatOpenAI'],
          name: 'ChatOpenAI',
          input: '用户想要查询天气',
          output: '我需要调用天气工具来获取北京今天的天气信息。',
          start_time: Math.floor((Date.now() - 27000) / 1000),
          end_time: Math.floor((Date.now() - 24000) / 1000),
          llm_output: {
            token_usage: {
              prompt_tokens: 150,
              completion_tokens: 45,
              total_tokens: 195,
            },
            model_name: 'gpt-4o',
          },
        },
        {
          id: ['tool:', 'get_weather'],
          name: 'get_weather',
          input: { city: '北京' },
          output: { temperature: 22, weather: '晴', humidity: 45, wind: '东北风3级' },
          start_time: Math.floor((Date.now() - 23000) / 1000),
          end_time: Math.floor((Date.now() - 20000) / 1000),
        },
        {
          id: ['llm:', 'ChatOpenAI'],
          name: 'ChatOpenAI',
          input: '天气信息: {temperature: 22, weather: 晴}',
          output: '根据查询结果，北京今天天气晴，气温22°C。建议穿着轻便春装，可以搭配薄外套。',
          start_time: Math.floor((Date.now() - 19000) / 1000),
          end_time: Math.floor((Date.now() - 10000) / 1000),
          llm_output: {
            token_usage: {
              prompt_tokens: 200,
              completion_tokens: 80,
              total_tokens: 280,
            },
            model_name: 'gpt-4o',
          },
        },
      ],
    },
  ],
};

/**
 * 将 LangChain trace 转换为 ProtocolEvent 数组
 * 这个转换逻辑也可以直接在适配器中完成
 */
export function transformLangChainTrace(trace: LangChainTrace): ProtocolEvent[] {
  const events: ProtocolEvent[] = [];
  let eventIndex = 0;

  function processNode(node: LangChainTrace, parentId?: string) {
    const nodeId = node.id.join(':');
    const nodeType = inferNodeType(node);

    // Start event
    events.push({
      id: `${nodeId}-start`,
      type: 'node',
      action: 'start',
      timestamp: node.start_time * 1000,
      data: {
        nodeId,
        parentId,
        nodeType,
        name: node.name,
        status: 'running',
        input: node.input,
        startTime: node.start_time * 1000,
      },
    });

    // Add LLM metadata
    if (node.llm_output) {
      const lastEvent = events[events.length - 1];
      if (lastEvent.data) {
        lastEvent.data.model = node.llm_output.model_name;
        if (node.llm_output.token_usage) {
          lastEvent.data.tokenUsage = {
            input: node.llm_output.token_usage.prompt_tokens,
            output: node.llm_output.token_usage.completion_tokens,
            total: node.llm_output.token_usage.total_tokens,
          };
        }
      }
    }

    // Process children
    if (node.children) {
      node.children.forEach(child => processNode(child, nodeId));
    }

    // Complete event
    if (node.end_time) {
      const completeEvent: ProtocolEvent = {
        id: `${nodeId}-complete`,
        type: 'node',
        action: 'complete',
        timestamp: node.end_time * 1000,
        data: {
          nodeId,
          parentId,
          nodeType,
          name: node.name,
          status: 'completed',
          output: node.output,
          endTime: node.end_time * 1000,
        },
      };

      if (node.llm_output?.token_usage) {
        completeEvent.data!.tokenUsage = {
          input: node.llm_output.token_usage.prompt_tokens,
          output: node.llm_output.token_usage.completion_tokens,
          total: node.llm_output.token_usage.total_tokens,
        };
      }

      events.push(completeEvent);
    }

    eventIndex++;
  }

  processNode(trace);

  // Add session start
  events.unshift({
    id: 'session-start',
    type: 'status',
    action: 'start',
    timestamp: trace.start_time * 1000,
    status: {
      sessionId: `session-${Date.now()}`,
      status: 'running',
      completedNodes: 0,
      totalNodes: events.filter(e => e.type === 'node').length,
    },
  });

  // Add session end
  if (trace.end_time) {
    events.push({
      id: 'session-end',
      type: 'status',
      action: 'complete',
      timestamp: trace.end_time * 1000,
      status: {
        sessionId: `session-${Date.now()}`,
        status: 'completed',
        completedNodes: events.filter(e => e.type === 'node' && e.action === 'complete').length,
        totalNodes: events.filter(e => e.type === 'node').length,
      },
    });
  }

  return events;
}

function inferNodeType(node: LangChainTrace): 'llm' | 'tool' | 'retrieval' | 'function' | 'custom' {
  const id = node.id.join(':').toLowerCase();
  const name = node.name.toLowerCase();

  if (id.includes('llm') || id.includes('chatmodel') || id.includes('chatopenai') || name.includes('chat')) {
    return 'llm';
  }
  if (id.includes('tool') || id.includes('bind')) {
    return 'tool';
  }
  if (id.includes('retrieval') || id.includes('vectorstore') || id.includes('retriever')) {
    return 'retrieval';
  }
  if (id.includes('function')) {
    return 'function';
  }

  return 'custom';
}

/**
 * 转换后的 ProtocolEvent 数组
 */
export const langchainAgentEvents: ProtocolEvent[] = transformLangChainTrace(langchainAgentTrace);

/**
 * 示例: 如何在 React 中使用 LangChain 适配器
 */
export const langchainUsageExample = `
import { TraceScopeProvider, TraceTree } from 'react-tracescope';
import { langchainAdapter } from 'react-tracescope/protocol/adapters';
import { langchainAgentTrace, transformLangChainTrace } from './examples/langchain';

// 方式1: 使用适配器名称
function App() {
  return (
    <TraceScopeProvider
      config={{
        adapter: 'langchain',
        autoConnect: true,
      }}
    >
      <TraceTree />
    </TraceScopeProvider>
  );
}

// 方式2: 手动转换数据
function App2() {
  const events = transformLangChainTrace(langchainAgentTrace);
  
  return (
    <TraceScopeProvider
      config={{
        adapter: 'custom',
        autoConnect: false,
      }}
      initialEvents={events}
    >
      <TraceTree />
    </TraceScopeProvider>
  );
}
`;

/**
 * 简单的 LangChain Chain 示例
 */
export const langchainSimpleChain: LangChainTrace = {
  id: ['chain:', 'LLMChain'],
  name: 'LLMChain',
  input: 'What is machine learning?',
  start_time: Math.floor((Date.now() - 5000) / 1000),
  end_time: Math.floor(Date.now() / 1000),
  children: [
    {
      id: ['prompt:', 'PromptTemplate'],
      name: 'PromptTemplate',
      input: 'Question: {question}',
      output: 'Question: What is machine learning?',
      start_time: Math.floor((Date.now() - 4500) / 1000),
      end_time: Math.floor((Date.now() - 4000) / 1000),
    },
    {
      id: ['llm:', 'ChatAnthropic'],
      name: 'ChatAnthropic',
      input: 'Question: What is machine learning?',
      output: 'Machine learning is a subset of artificial intelligence...',
      start_time: Math.floor((Date.now() - 4000) / 1000),
      end_time: Math.floor((Date.now() - 1000) / 1000),
      llm_output: {
        token_usage: {
          prompt_tokens: 50,
          completion_tokens: 150,
          total_tokens: 200,
        },
        model_name: 'claude-3-opus-20240229',
      },
    },
  ],
};