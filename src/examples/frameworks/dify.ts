/**
 * Dify Trace Example
 * 
 * 展示如何使用 Dify 适配器
 * 
 * Dify 工作流的 trace 数据通常包含:
 * - node_finished / node_started: 节点开始/结束
 * - workflow_started / workflow_finished: 工作流开始/结束
 * - tinker_node: LLM 节点
 * - tool_node: 工具节点
 * - knowledge-retrieval: 知识库检索
 */

import type { ProtocolEvent } from '../../protocol/types';

/**
 * Dify 事件类型
 */
export type DifyEventType = 
  | 'workflow_started'
  | 'workflow_finished'
  | 'node_started'
  | 'node_finished'
  | 'tinker_node'
  | 'tool_node'
  | 'knowledge-retrieval'
  | 'http_node'
  | 'conditional_node'
  | 'error';

/**
 * Dify 原始事件格式
 */
export interface DifyEvent {
  event: DifyEventType;
  node_id?: string;
  node_type?: string;
  node_name?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  execution_metadata?: {
    total_tokens?: number;
    model_name?: string;
    latency?: number;
    tool_calls?: Array<{
      name: string;
      arguments: string;
    }>;
  };
  timestamp: number;
  error?: string;
}

/**
 * Dify 工作流示例 - 智能客服
 */
export const difyCustomerServiceWorkflow: DifyEvent[] = [
  // 工作流开始
  {
    event: 'workflow_started',
    node_id: 'workflow',
    node_type: 'workflow',
    node_name: '智能客服工作流',
    inputs: { user_query: '我想咨询一下产品价格' },
    timestamp: Date.now() - 30000,
  },

  // 意图识别节点
  {
    event: 'node_started',
    node_id: 'node-1',
    node_type: 'conditional',
    node_name: '意图识别',
    inputs: { user_query: '我想咨询一下产品价格' },
    timestamp: Date.now() - 28000,
  },
  {
    event: 'node_finished',
    node_id: 'node-1',
    node_type: 'conditional',
    node_name: '意图识别',
    outputs: { intent: 'price_inquiry', confidence: 0.95 },
    execution_metadata: { latency: 0.1 },
    timestamp: Date.now() - 25000,
  },

  // 价格咨询分支 - LLM 回答
  {
    event: 'node_started',
    node_id: 'node-2',
    node_type: 'tinker_node',
    node_name: '价格回答',
    inputs: { intent: 'price_inquiry', context: '企业版产品' },
    timestamp: Date.now() - 24000,
  },
  {
    event: 'tinker_node',
    node_id: 'node-2',
    node_type: 'tinker_node',
    node_name: '价格回答',
    inputs: { intent: 'price_inquiry' },
    outputs: { 
      text: '我们企业版产品的价格是 ¥999/年，包含以下功能：\n- 无限量使用\n- 专属客服\n- 数据分析\n- API 调用' 
    },
    execution_metadata: { 
      total_tokens: 300, 
      model_name: 'gpt-4',
      latency: 1.2,
    },
    timestamp: Date.now() - 15000,
  },

  // 如果用户想要人工服务
  // 这里演示一个知识库检索节点
  {
    event: 'node_started',
    node_id: 'node-3',
    node_type: 'knowledge-retrieval',
    node_name: '产品文档检索',
    inputs: { query: '价格 套餐 企业版' },
    timestamp: Date.now() - 14000,
  },
  {
    event: 'node_finished',
    node_id: 'node-3',
    node_type: 'knowledge-retrieval',
    node_name: '产品文档检索',
    outputs: { 
      documents: [
        { title: '产品价格表', content: '企业版: ¥999/年', similarity: 0.95 },
        { title: '套餐对比', content: '专业版: ¥299/年', similarity: 0.85 },
      ]
    },
    execution_metadata: { latency: 0.5 },
    timestamp: Date.now() - 10000,
  },

  // HTTP 调用节点 - 查询库存
  {
    event: 'node_started',
    node_id: 'node-4',
    node_type: 'http_node',
    node_name: '查询库存',
    inputs: { product_id: 'ent-001' },
    timestamp: Date.now() - 9000,
  },
  {
    event: 'node_finished',
    node_id: 'node-4',
    node_type: 'http_node',
    node_name: '查询库存',
    outputs: { 
      in_stock: true, 
      quantity: 100,
      warehouse: '上海仓'
    },
    execution_metadata: { latency: 0.3 },
    timestamp: Date.now() - 6000,
  },

  // 最终回答
  {
    event: 'node_started',
    node_id: 'node-5',
    node_type: 'tinker_node',
    node_name: '最终回答',
    inputs: { price: '¥999/年', stock: '有货' },
    timestamp: Date.now() - 5000,
  },
  {
    event: 'node_finished',
    node_id: 'node-5',
    node_type: 'tinker_node',
    node_name: '最终回答',
    outputs: { 
      text: '感谢您的咨询！\n\n关于企业版产品：\n💰 价格：¥999/年\n📦 库存：100件（有货）\n📍 发货仓库：上海仓\n\n需要我帮你下单吗？' 
    },
    execution_metadata: { 
      total_tokens: 150, 
      model_name: 'gpt-4',
      latency: 0.8,
    },
    timestamp: Date.now() - 2000,
  },

  // 工作流完成
  {
    event: 'workflow_finished',
    node_id: 'workflow',
    node_type: 'workflow',
    node_name: '智能客服工作流',
    outputs: { 
      response: '已回答用户价格咨询',
      nodes_executed: 5,
    },
    execution_metadata: { 
      total_tokens: 450, 
      latency: 3.5,
    },
    timestamp: Date.now(),
  },
];

/**
 * 将 Dify 事件转换为 ProtocolEvent 数组
 */
export function transformDifyEvents(events: DifyEvent[]): ProtocolEvent[] {
  const protocolEvents: ProtocolEvent[] = [];

  events.forEach((event, index) => {
    const nodeId = event.node_id || `node-${index}`;
    const nodeType = inferDifyNodeType(event);
    const nodeName = event.node_name || nodeType;

    // 处理不同事件类型
    if (event.event === 'workflow_started') {
      protocolEvents.push({
        id: `dify-workflow-start`,
        type: 'status',
        action: 'start',
        timestamp: event.timestamp,
        status: {
          sessionId: `dify-${Date.now()}`,
          status: 'running',
          completedNodes: 0,
          totalNodes: events.filter(e => e.node_id).length,
        },
      });
    } else if (event.event === 'workflow_finished') {
      protocolEvents.push({
        id: `dify-workflow-end`,
        type: 'status',
        action: 'complete',
        timestamp: event.timestamp,
        status: {
          sessionId: `dify-${Date.now()}`,
          status: 'completed',
          completedNodes: events.filter(e => e.event === 'node_finished').length,
          totalNodes: events.filter(e => e.node_id).length,
        },
      });
    } else if (event.event === 'node_started') {
      protocolEvents.push({
        id: `dify-${nodeId}-start`,
        type: 'node',
        action: 'start',
        timestamp: event.timestamp,
        data: {
          nodeId,
          nodeType,
          name: nodeName,
          status: 'running',
          input: event.inputs,
          startTime: event.timestamp,
        },
      });
    } else if (event.event === 'node_finished' || event.event === 'tinker_node') {
      const completeEvent: ProtocolEvent = {
        id: `dify-${nodeId}-complete`,
        type: 'node',
        action: 'complete',
        timestamp: event.timestamp,
        data: {
          nodeId,
          nodeType,
          name: nodeName,
          status: 'completed',
          output: event.outputs,
          endTime: event.timestamp,
        },
      };

      // 添加 LLM 元数据
      if (event.execution_metadata) {
        if (completeEvent.data) {
          completeEvent.data.model = event.execution_metadata.model_name;
          if (event.execution_metadata.total_tokens) {
            completeEvent.data.tokenUsage = {
              input: Math.floor(event.execution_metadata.total_tokens * 0.4),
              output: Math.floor(event.execution_metadata.total_tokens * 0.6),
              total: event.execution_metadata.total_tokens,
            };
          }
        }
      }

      protocolEvents.push(completeEvent);
    } else if (event.event === 'error') {
      protocolEvents.push({
        id: `dify-${nodeId}-error`,
        type: 'node',
        action: 'error',
        timestamp: event.timestamp,
        data: {
          nodeId,
          nodeType,
          name: nodeName,
          status: 'failed',
          error: event.error,
          endTime: event.timestamp,
        },
      });
    }
  });

  return protocolEvents;
}

function inferDifyNodeType(event: DifyEvent): 'llm' | 'tool' | 'retrieval' | 'function' | 'custom' {
  const nodeType = event.node_type?.toLowerCase() || '';

  if (nodeType.includes('tinker') || nodeType.includes('llm')) {
    return 'llm';
  }
  if (nodeType.includes('tool')) {
    return 'tool';
  }
  if (nodeType.includes('knowledge') || nodeType.includes('retrieval')) {
    return 'retrieval';
  }
  if (nodeType.includes('http')) {
    return 'function';
  }

  return 'custom';
}

/**
 * 转换后的 ProtocolEvent 数组
 */
export const difyCustomerServiceEvents: ProtocolEvent[] = transformDifyEvents(difyCustomerServiceWorkflow);

/**
 * 简单的 LLM 对话工作流
 */
export const difySimpleChat: DifyEvent[] = [
  {
    event: 'workflow_started',
    inputs: { message: '你好' },
    timestamp: Date.now() - 5000,
  },
  {
    event: 'tinker_node',
    node_id: 'llm-1',
    node_type: 'tinker_node',
    node_name: 'AI 回复',
    inputs: { message: '你好' },
    outputs: { text: '你好！有什么可以帮助你的吗？' },
    execution_metadata: { total_tokens: 50, model_name: 'gpt-3.5-turbo', latency: 0.5 },
    timestamp: Date.now() - 3000,
  },
  {
    event: 'workflow_finished',
    outputs: { response: '对话完成' },
    timestamp: Date.now(),
  },
];

/**
 * 多分支条件工作流
 */
export const difyConditionalWorkflow: DifyEvent[] = [
  {
    event: 'workflow_started',
    inputs: { user_input: '帮我查天气' },
    timestamp: Date.now() - 10000,
  },
  {
    event: 'node_started',
    node_id: 'condition-1',
    node_type: 'conditional',
    node_name: '判断意图',
    inputs: { user_input: '帮我查天气' },
    timestamp: Date.now() - 9000,
  },
  {
    event: 'node_finished',
    node_id: 'condition-1',
    node_type: 'conditional',
    node_name: '判断意图',
    outputs: { branch: 'weather_tool' },
    timestamp: Date.now() - 8000,
  },
  // 天气分支
  {
    event: 'node_started',
    node_id: 'weather',
    node_type: 'tool',
    node_name: '天气查询工具',
    inputs: { city: '北京' },
    timestamp: Date.now() - 7000,
  },
  {
    event: 'node_finished',
    node_id: 'weather',
    node_type: 'tool',
    node_name: '天气查询工具',
    outputs: { result: '晴, 22°C' },
    timestamp: Date.now() - 5000,
  },
  {
    event: 'workflow_finished',
    outputs: { result: '已查询天气' },
    timestamp: Date.now() - 2000,
  },
];

/**
 * 示例: 如何在 React 中使用 Dify 适配器
 */
export const difyUsageExample = `
import { TraceScopeProvider, TraceTree } from 'react-tracescope';
import { difyAdapter } from 'react-tracescope/protocol/adapters';
import { difyCustomerServiceWorkflow } from './examples/dify';

// Dify 通常通过 SSE 流式推送事件
// 配置 adapter 为 'dify' 即可自动转换
function App() {
  return (
    <TraceScopeProvider
      config={{
        url: 'https://api.dify.ai/v1/trace?api_key=xxx',
        adapter: 'dify',
        autoConnect: true,
      }}
    >
      <TraceTree />
    </TraceScopeProvider>
  );
}

// 手动转换示例
function App2() {
  const events = difyAdapter.transform(difyCustomerServiceWorkflow);
  
  return (
    <TraceScopeProvider
      config={{ adapter: 'custom', autoConnect: false }}
      initialEvents={events}
    >
      <TraceTree />
    </TraceScopeProvider>
  );
}

// Dify 工作流 SSE 事件示例:
// {"event": "node_finished", "node_id": "node-1", "node_type": "tinker_node", ...}
// {"event": "workflow_finished", ...}
`;