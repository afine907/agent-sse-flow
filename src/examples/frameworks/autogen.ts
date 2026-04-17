/**
 * AutoGen Trace Example
 * 
 * 展示如何使用 AutoGen 适配器
 * 
 * AutoGen 的 trace 数据通常包含事件流:
 * - agent_message: Agent 间消息传递
 * - function_call: 工具调用
 * - llm_response: LLM 响应
 * - code_execution: 代码执行
 * - agent_start / agent_end: Agent 生命周期
 */

import type { ProtocolEvent } from '../../protocol/types';

/**
 * AutoGen 事件类型
 */
export type AutoGenEventType = 
  | 'agent_message'
  | 'function_call'
  | 'tool_call'
  | 'llm_response'
  | 'code_execution'
  | 'agent_start'
  | 'agent_end'
  | 'agent_thought'
  | 'agent_error';

/**
 * AutoGen 原始事件格式
 */
export interface AutoGenEvent {
  event: AutoGenEventType;
  sender?: string;
  receiver?: string;
  content?: string;
  timestamp: number;
  agent?: string;
  function?: string;
  arguments?: Record<string, unknown>;
  result?: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  response?: string;
  is_streaming?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
  children?: AutoGenEvent[];
}

/**
 * AutoGen 示例数据 - 多 Agent 协作
 */
export const autogenMultiAgentTrace: AutoGenEvent[] = [
  // 用户发起请求
  {
    event: 'agent_message',
    sender: 'user',
    receiver: 'coordinator',
    content: '帮我研究一下最新的 AI Agent 发展趋势，写一份报告',
    timestamp: Date.now() - 60000,
  },

  // Coordinator 开始规划
  {
    event: 'agent_start',
    sender: 'coordinator',
    timestamp: Date.now() - 55000,
    metadata: { role: 'coordinator' },
  },
  {
    event: 'agent_thought',
    sender: 'coordinator',
    content: '这个任务需要分几步完成：\n1. 搜索最新的 AI Agent 研究\n2. 分析技术趋势\n3. 整理成报告',
    timestamp: Date.now() - 54000,
  },

  // 调用搜索工具
  {
    event: 'function_call',
    sender: 'coordinator',
    receiver: 'researcher',
    function: 'web_search',
    arguments: { query: 'AI Agent trends 2024 research' },
    timestamp: Date.now() - 50000,
  },

  // Researcher 开始工作
  {
    event: 'agent_start',
    sender: 'researcher',
    timestamp: Date.now() - 48000,
    metadata: { role: 'researcher' },
  },
  {
    event: 'llm_response',
    sender: 'researcher',
    content: '让我先搜索相关的学术论文和行业报告...',
    timestamp: Date.now() - 47000,
    is_streaming: true,
  },

  // 调用搜索工具获取结果
  {
    event: 'function_call',
    sender: 'researcher',
    receiver: 'search_tool',
    function: 'web_search',
    arguments: { query: 'LLM Agent architecture multi-agent' },
    timestamp: Date.now() - 45000,
  },
  {
    event: 'agent_message',
    sender: 'search_tool',
    receiver: 'researcher',
    content: JSON.stringify([
      { title: 'AutoGen: Next Generation AI Agents', source: 'Microsoft' },
      { title: 'LangChain Agents Deep Dive', source: 'LangChain' },
      { title: 'Multi-Agent Orchestration Patterns', source: 'ArXiv' },
    ]),
    timestamp: Date.now() - 40000,
  },

  // LLM 分析搜索结果
  {
    event: 'llm_response',
    sender: 'researcher',
    content: '根据搜索结果，我发现了几个关键趋势：\n\n1. **多 Agent 协作** - 多个专业 Agent 协同工作\n2. **自主规划** - Agent 能够分解复杂任务\n3. **工具增强** - 与外部系统深度集成',
    timestamp: Date.now() - 30000,
    model: 'gpt-4',
    prompt_tokens: 500,
    completion_tokens: 200,
    is_streaming: false,
  },

  // Researcher 完成，发送结果给 Writer
  {
    event: 'agent_message',
    sender: 'researcher',
    receiver: 'writer',
    content: '研究完成，主要发现：\n1. 多 Agent 协作架构\n2. 自主规划与执行\n3. 工具生态系统',
    timestamp: Date.now() - 25000,
  },
  {
    event: 'agent_end',
    sender: 'researcher',
    timestamp: Date.now() - 24000,
  },

  // Writer 开始写报告
  {
    event: 'agent_start',
    sender: 'writer',
    timestamp: Date.now() - 23000,
    metadata: { role: 'writer' },
  },
  {
    event: 'llm_response',
    sender: 'writer',
    content: '我将把研究结果整理成一份专业报告...',
    timestamp: Date.now() - 22000,
    model: 'gpt-4',
    prompt_tokens: 300,
    completion_tokens: 50,
  },

  // Writer 调用文档生成工具
  {
    event: 'function_call',
    sender: 'writer',
    function: 'generate_docx',
    arguments: { 
      title: 'AI Agent 发展趋势研究报告',
      sections: ['背景', '技术趋势', '应用场景', '未来展望'],
    },
    timestamp: Date.now() - 15000,
  },
  {
    event: 'agent_message',
    sender: 'doc_tool',
    receiver: 'writer',
    content: '文档已生成: AI_Agent_Report_2024.docx',
    timestamp: Date.now() - 10000,
  },

  // Writer 完成任务
  {
    event: 'llm_response',
    sender: 'writer',
    content: '报告已完成！包含以下章节：\n- 执行摘要\n- AI Agent 技术趋势\n- 主要玩家分析\n- 2024 年预测\n\n文件已保存',
    timestamp: Date.now() - 5000,
    model: 'gpt-4',
    prompt_tokens: 400,
    completion_tokens: 150,
  },
  {
    event: 'agent_end',
    sender: 'writer',
    timestamp: Date.now() - 4000,
  },

  // Coordinator 完成任务
  {
    event: 'agent_message',
    sender: 'coordinator',
    receiver: 'user',
    content: '任务完成！研究报告已生成，共分析了 3 个主要趋势，预测了 5 个未来发展方向。',
    timestamp: Date.now() - 2000,
  },
  {
    event: 'agent_end',
    sender: 'coordinator',
    timestamp: Date.now(),
  },
];

/**
 * 将 AutoGen 事件转换为 ProtocolEvent 数组
 */
export function transformAutoGenEvents(events: AutoGenEvent[]): ProtocolEvent[] {
  const protocolEvents: ProtocolEvent[] = [];
  const nodeMap = new Map<string, ProtocolEvent>();

  events.forEach((event, index) => {
    const nodeId = event.sender || `node-${index}`;
    const nodeType = inferAutoGenNodeType(event);

    // 创建节点
    let protocolEvent: ProtocolEvent;

    if (event.event === 'agent_start') {
      protocolEvent = {
        id: `autogen-${index}-start`,
        type: 'node',
        action: 'start',
        timestamp: event.timestamp,
        data: {
          nodeId,
          nodeType: 'custom',
          name: event.sender || 'Unknown',
          status: 'running',
          startTime: event.timestamp,
        },
        metadata: event.metadata,
      };
    } else if (event.event === 'agent_end') {
      protocolEvent = {
        id: `autogen-${index}-end`,
        type: 'node',
        action: 'complete',
        timestamp: event.timestamp,
        data: {
          nodeId,
          nodeType: 'custom',
          name: event.sender || 'Unknown',
          status: 'completed',
          endTime: event.timestamp,
        },
      };
    } else if (event.event === 'function_call' || event.event === 'tool_call') {
      protocolEvent = {
        id: `autogen-${index}-tool`,
        type: 'node',
        action: 'start',
        timestamp: event.timestamp,
        data: {
          nodeId: `${event.sender}-tool`,
          parentId: nodeId,
          nodeType: 'tool',
          name: event.function || 'Unknown Tool',
          status: 'running',
          toolName: event.function,
          toolParams: event.arguments,
        },
      };
    } else if (event.event === 'llm_response') {
      protocolEvent = {
        id: `autogen-${index}-llm`,
        type: 'node',
        action: event.is_streaming ? 'update' : 'complete',
        timestamp: event.timestamp,
        data: {
          nodeId: `${event.sender}-llm`,
          parentId: nodeId,
          nodeType: 'llm',
          name: `${event.sender} LLM`,
          status: event.is_streaming ? 'running' : 'completed',
          output: event.content,
          model: event.model,
          tokenUsage: event.prompt_tokens && event.completion_tokens ? {
            input: event.prompt_tokens,
            output: event.completion_tokens,
            total: event.prompt_tokens + event.completion_tokens,
          } : undefined,
        },
      };
    } else if (event.event === 'agent_thought') {
      protocolEvent = {
        id: `autogen-${index}-thought`,
        type: 'node',
        action: 'start',
        timestamp: event.timestamp,
        data: {
          nodeId: `${event.sender}-thought`,
          parentId: nodeId,
          nodeType: 'custom',
          name: '思考过程',
          status: 'completed',
          output: event.content,
        },
      };
    } else {
      // 普通消息
      protocolEvent = {
        id: `autogen-${index}-msg`,
        type: 'message',
        action: 'start',
        timestamp: event.timestamp,
        message: {
          messageId: `msg-${index}`,
          role: event.sender === 'user' ? 'user' : 'assistant',
          content: event.content || '',
          contentType: 'text',
          nodeId,
          createdAt: event.timestamp,
        },
      };
    }

    protocolEvents.push(protocolEvent);
  });

  return protocolEvents;
}

function inferAutoGenNodeType(event: AutoGenEvent): 'llm' | 'tool' | 'function' | 'user' | 'assistant' | 'custom' {
  const eventType = event.event.toLowerCase();

  if (eventType.includes('llm') || eventType.includes('chat')) {
    return 'llm';
  }
  if (eventType.includes('function') || eventType.includes('tool')) {
    return 'tool';
  }
  if (eventType.includes('code') || eventType.includes('execution')) {
    return 'function';
  }
  if (event.sender === 'user') {
    return 'user';
  }
  if (event.sender && event.sender !== 'user') {
    return 'assistant';
  }

  return 'custom';
}

/**
 * 转换后的 ProtocolEvent 数组
 */
export const autogenMultiAgentEvents: ProtocolEvent[] = transformAutoGenEvents(autogenMultiAgentTrace);

/**
 * 简单的两 Agent 对话示例
 */
export const autogenSimpleChat: AutoGenEvent[] = [
  {
    event: 'agent_message',
    sender: 'user',
    receiver: 'assistant',
    content: '你好，请介绍一下你自己',
    timestamp: Date.now() - 10000,
  },
  {
    event: 'llm_response',
    sender: 'assistant',
    content: '你好！我是 AutoGen 助手，很高兴为你服务！',
    timestamp: Date.now() - 5000,
    model: 'gpt-4',
    prompt_tokens: 20,
    completion_tokens: 30,
  },
];

/**
 * 代码执行示例
 */
export const autogenCodeExecution: AutoGenEvent[] = [
  {
    event: 'agent_message',
    sender: 'user',
    content: '帮我写一个计算斐波那契数列的函数',
    timestamp: Date.now() - 15000,
  },
  {
    event: 'agent_thought',
    sender: 'assistant',
    content: '用户想要一个斐波那契函数，这是一个经典的递归问题，我会用 Python 实现',
    timestamp: Date.now() - 14000,
  },
  {
    event: 'code_execution',
    sender: 'assistant',
    function: 'python_exec',
    arguments: { code: 'def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n\nprint([fib(i) for i in range(10)])' },
    timestamp: Date.now() - 10000,
  },
  {
    event: 'agent_message',
    sender: 'python_exec',
    content: '[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]',
    timestamp: Date.now() - 5000,
  },
  {
    event: 'llm_response',
    sender: 'assistant',
    content: '斐波那契数列前 10 项已计算完成：\n\n```\n[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\n```\n\n这是一个递归实现，复杂度是 O(2^n)。如果需要优化，可以用动态规划将其降低到 O(n)。',
    timestamp: Date.now(),
    model: 'gpt-4',
    prompt_tokens: 100,
    completion_tokens: 80,
  },
];

/**
 * 示例: 如何在 React 中使用 AutoGen 适配器
 */
export const autogenUsageExample = `
import { TraceScopeProvider, TraceTree } from 'react-tracescope';
import { autogenAdapter } from 'react-tracescope/protocol/adapters';
import { autogenMultiAgentTrace } from './examples/autogen';

// 方式1: 使用适配器名称 (需要 SSE 流)
function App() {
  return (
    <TraceScopeProvider
      config={{
        url: 'https://your-autogen-server.com/trace',
        adapter: 'autogen',
        autoConnect: true,
      }}
    >
      <TraceTree />
    </TraceScopeProvider>
  );
}

// 方式2: 手动转换事件
function App2() {
  const events = autogenMultiAgentTrace.map(e => 
    autogenAdapter.transform(e)
  ).flat();
  
  return (
    <TraceScopeProvider
      config={{ adapter: 'custom', autoConnect: false }}
      initialEvents={events}
    >
      <TraceTree />
    </TraceScopeProvider>
  );
}
`;