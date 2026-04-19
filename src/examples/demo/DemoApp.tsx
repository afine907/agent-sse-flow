/**
 * TraceScope Demo Application
 * 展示新的 AgentPrism 风格设计
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  User,
  Zap,
  Wrench,
  Code,
  Terminal,
  CheckCircle,
  AlertCircle,
  Coins,
  DollarSign,
  MoreHorizontal,
} from 'lucide-react';

// 导入组件
import { VirtualTreeWithSearch, ConnectionStatus, VirtualChat } from '../../components';
import { Badge } from '../../components/primitives/Badge';
import { Status } from '../../components/primitives/Status';
import { Avatar } from '../../components/primitives/Avatar';
import { Timeline } from '../../components/primitives/Timeline';
import { TokensBadge } from '../../components/primitives/TokensBadge';
import { PriceBadge } from '../../components/primitives/PriceBadge';

// 导入类型
import type { ProtocolEvent, ProtocolMessageData } from '../../protocol/types';
import type { TreeNode } from '../../types/tree';

// 导入适配器
import { getAdapter } from '../../protocol/adapters';

// 样式
import '../../styles/demo.css';

// ============================================
// Mock 数据集
// ============================================

const langchainDemoData: ProtocolEvent[] = [
  {
    id: 'session-start',
    type: 'status',
    action: 'start',
    timestamp: Date.now() - 10000,
    status: {
      sessionId: 'demo-session',
      status: 'running',
      completedNodes: 0,
      totalNodes: 5,
    },
  },
  {
    id: 'node-1',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 9000,
    data: {
      nodeId: 'node-1',
      nodeType: 'user',
      name: '用户输入',
      status: 'running',
      input: '帮我查一下北京的天气',
    },
  },
  {
    id: 'node-2',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 8000,
    data: {
      nodeId: 'node-2',
      parentId: 'node-1',
      nodeType: 'llm',
      name: 'LLM 意图识别',
      status: 'running',
      input: '帮我查一下北京的天气',
      model: 'gpt-4',
    },
  },
  {
    id: 'node-2-complete',
    type: 'node',
    action: 'complete',
    timestamp: Date.now() - 5000,
    data: {
      nodeId: 'node-2',
      parentId: 'node-1',
      nodeType: 'llm',
      name: 'LLM 意图识别',
      status: 'completed',
      output: '用户想要查询天气，需要调用天气工具',
      model: 'gpt-4',
      tokenUsage: { input: 50, output: 30, total: 80 },
      endTime: Date.now() - 5000,
    },
  },
  {
    id: 'node-3',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 4000,
    data: {
      nodeId: 'node-3',
      parentId: 'node-2',
      nodeType: 'tool',
      name: '天气查询工具',
      status: 'running',
      toolName: 'get_weather',
      toolParams: { city: '北京' },
    },
  },
  {
    id: 'node-3-complete',
    type: 'node',
    action: 'complete',
    timestamp: Date.now() - 3000,
    data: {
      nodeId: 'node-3',
      parentId: 'node-2',
      nodeType: 'tool',
      name: '天气查询工具',
      status: 'completed',
      output: { temperature: 22, weather: '晴', humidity: 45 },
      endTime: Date.now() - 3000,
    },
  },
  {
    id: 'node-4',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 2000,
    data: {
      nodeId: 'node-4',
      parentId: 'node-3',
      nodeType: 'llm',
      name: 'LLM 总结回复',
      status: 'running',
      model: 'gpt-4',
    },
  },
  {
    id: 'node-4-complete',
    type: 'node',
    action: 'complete',
    timestamp: Date.now(),
    data: {
      nodeId: 'node-4',
      parentId: 'node-3',
      nodeType: 'llm',
      name: 'LLM 总结回复',
      status: 'completed',
      output: '根据查询结果，北京今天天气晴，气温22°C，适合外出。',
      model: 'gpt-4',
      tokenUsage: { input: 100, output: 50, total: 150 },
      endTime: Date.now(),
    },
  },
];

const chatDemoMessages: ProtocolMessageData[] = [
  {
    messageId: 'msg-1',
    role: 'user',
    content: '你好，我想了解一下什么是 Agent',
    contentType: 'text',
    createdAt: Date.now() - 60000,
  },
  {
    messageId: 'msg-2',
    role: 'assistant',
    content:
      '<thinking>\n用户想了解什么是 Agent。\n</thinking>\n\nAgent（智能体）是一种能够自主感知环境、规划行动、执行任务的 AI 系统。',
    contentType: 'markdown',
    createdAt: Date.now() - 55000,
    tokensReceived: 250,
  },
];

// ============================================
// 组件展示面板
// ============================================

function ComponentShowcase() {
  const nodeTypes = [
    { type: 'user_input' as const, label: 'User Input', icon: User },
    { type: 'assistant_thought' as const, label: 'Thought', icon: Zap },
    { type: 'tool_call' as const, label: 'Tool Call', icon: Wrench },
    { type: 'code_execution' as const, label: 'Code', icon: Code },
    { type: 'execution_result' as const, label: 'Result', icon: Terminal },
    { type: 'final_output' as const, label: 'Output', icon: CheckCircle },
    { type: 'error' as const, label: 'Error', icon: AlertCircle },
  ];

  const statuses = ['streaming', 'completed', 'error', 'pending'] as const;

  return (
    <div className="space-y-8">
      {/* 节点类型展示 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Node Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {nodeTypes.map(({ type, label, icon: Icon }) => (
            <div
              key={type}
              className="flex items-center gap-3 p-3 rounded-lg border border-ts-border-subtle bg-ts-background"
            >
              <Avatar nodeType={type} size="md" />
              <div>
                <Badge
                  iconStart={<Icon className="size-3" />}
                  label={label}
                  size="xs"
                  className={`ts-badge-${type === 'user_input' ? 'user' : type === 'assistant_thought' ? 'thought' : type === 'tool_call' ? 'tool' : type === 'code_execution' ? 'code' : type === 'execution_result' ? 'result' : type === 'final_output' ? 'output' : 'error'}`}
                  unstyled
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 状态展示 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Status Indicators</h3>
        <div className="flex flex-wrap gap-4">
          {statuses.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <Status status={status} variant="dot" />
              <Status status={status} variant="badge" />
              <Status status={status} variant="badge" showLabel />
            </div>
          ))}
        </div>
      </section>

      {/* Badge 尺寸展示 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Badge Sizes</h3>
        <div className="flex items-center gap-4">
          <Badge iconStart={<Zap className="size-3" />} label="XS" size="xs" />
          <Badge iconStart={<Zap className="size-3" />} label="SM" size="sm" />
          <Badge iconStart={<Zap className="size-3" />} label="MD" size="md" />
          <Badge iconStart={<Zap className="size-3" />} label="LG" size="lg" />
        </div>
      </section>

      {/* Token 和成本展示 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Tokens & Cost</h3>
        <div className="flex flex-wrap gap-4">
          <TokensBadge tokens={150} />
          <TokensBadge tokens={1500} />
          <TokensBadge tokens={15000} />
          <TokensBadge tokens={150000} />
          <PriceBadge cost={0.001} />
          <PriceBadge cost={0.025} />
          <PriceBadge cost={1.50} />
        </div>
      </section>

      {/* Timeline 展示 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Timeline</h3>
        <div className="space-y-3 p-4 rounded-lg border border-ts-border-subtle bg-ts-background">
          {nodeTypes.slice(0, 5).map(({ type }, idx) => {
            const now = Date.now();
            const startTime = now - 10000 + idx * 1500;
            const endTime = startTime + 1000 + idx * 500;
            return (
              <div key={type} className="flex items-center gap-3">
                <span className="w-24 text-sm text-ts-muted-foreground">{type}</span>
                <Timeline
                  startTime={startTime}
                  endTime={endTime}
                  minTime={now - 10000}
                  maxTime={now}
                  nodeType={type}
                  width={200}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ============================================
// 主组件: Demo App
// ============================================

export default function DemoApp() {
  const [activeTab, setActiveTab] = useState<'components' | 'tree' | 'chat'>('components');
  const [selectedAdapter, setSelectedAdapter] = useState<string>('langchain');
  const [treeData, setTreeData] = useState<ProtocolEvent[]>(langchainDemoData);
  const [chatMessages, setChatMessages] = useState<ProtocolMessageData[]>(chatDemoMessages);

  // 转换事件数据为树结构
  const convertToTreeData = useCallback((events: ProtocolEvent[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    events.forEach((event) => {
      if (event.type === 'node' && event.data) {
        const node: TreeNode = {
          nodeId: event.data.nodeId,
          data: {
            nodeId: event.data.nodeId,
            parentId: event.data.parentId,
            nodeType: event.data.nodeType as any,
            chunk: event.data.name || '',
            status: event.data.status as any,
            input: event.data.input,
            output: event.data.output,
            startTime: event.data.startTime,
            endTime: event.data.endTime,
            tokenUsage: event.data.tokenUsage,
            model: event.data.model,
            toolName: event.data.toolName,
            toolParams: event.data.toolParams,
            createdAt: event.timestamp,
            updatedAt: event.timestamp,
          } as any,
          children: [],
          depth: 0,
          isExpanded: true,
        };
        nodeMap.set(node.nodeId, node);
      }
    });

    events.forEach((event) => {
      if (event.type === 'node' && event.data) {
        const node = nodeMap.get(event.data.nodeId);
        if (node) {
          if (event.data.parentId && nodeMap.has(event.data.parentId)) {
            const parent = nodeMap.get(event.data.parentId)!;
            parent.children.push(node);
          } else {
            roots.push(node);
          }
        }
      }
    });

    const setDepth = (nodes: TreeNode[], depth: number) => {
      nodes.forEach((node) => {
        node.depth = depth;
        setDepth(node.children, depth + 1);
      });
    };
    setDepth(roots, 0);

    return roots;
  }, []);

  const tree = useMemo(() => {
    const result = convertToTreeData(treeData);
    return result.length > 0 ? result[0] : null;
  }, [treeData, convertToTreeData]);

  const handleAdapterChange = useCallback((adapter: string) => {
    setSelectedAdapter(adapter);
    setTreeData(langchainDemoData);
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    const newUserMsg: ProtocolMessageData = {
      messageId: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      contentType: 'text',
      createdAt: Date.now(),
    };
    setChatMessages((prev) => [...prev, newUserMsg]);

    setTimeout(() => {
      const aiResponse: ProtocolMessageData = {
        messageId: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: `这是一个模拟的回复："${content}"\n\nTraceScope 支持流式输出。`,
        contentType: 'markdown',
        createdAt: Date.now(),
        tokensReceived: Math.floor(Math.random() * 100) + 20,
      };
      setChatMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  }, []);

  const stats = useMemo(() => {
    const totalTokens = treeData
      .filter((e) => e.data?.tokenUsage?.total)
      .reduce((sum, e) => sum + (e.data?.tokenUsage?.total || 0), 0);
    const completedNodes = treeData.filter((e) => e.action === 'complete').length;
    const totalNodes = treeData.filter((e) => e.type === 'node').length;
    return { totalTokens, completedNodes, totalNodes };
  }, [treeData]);

  return (
    <div className="demo-app min-h-screen bg-ts-background">
      {/* Header */}
      <header className="demo-header border-b border-ts-border bg-ts-muted/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ts-foreground">🤖 TraceScope</h1>
            <p className="text-sm text-ts-muted-foreground">Agent Trace 可视化 - AgentPrism 设计风格</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-ts-muted-foreground">
            <span>节点: {stats.totalNodes}</span>
            <span>Token: {stats.totalTokens}</span>
            <ConnectionStatus state="connected" />
          </div>
        </div>
      </header>

      {/* Tab 导航 */}
      <nav className="border-b border-ts-border bg-ts-background px-6">
        <div className="flex gap-1">
          {[
            { id: 'components', label: '🎨 Components', active: activeTab === 'components' },
            { id: 'tree', label: '🌳 Tree View', active: activeTab === 'tree' },
            { id: 'chat', label: '💬 Chat Mode', active: activeTab === 'chat' },
          ].map(({ id, label, active }) => (
            <button
              key={id}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? 'border-ts-primary text-ts-foreground'
                  : 'border-transparent text-ts-muted-foreground hover:text-ts-foreground'
              }`}
              onClick={() => setActiveTab(id as any)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="p-6">
        {/* Components Showcase */}
        {activeTab === 'components' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-ts-foreground">组件库</h2>
              <p className="text-sm text-ts-muted-foreground">
                基于 AgentPrism 设计语言的基础组件
              </p>
            </div>
            <ComponentShowcase />
          </div>
        )}

        {/* Tree View */}
        {activeTab === 'tree' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-ts-foreground">Tree View</h2>
                <p className="text-sm text-ts-muted-foreground">适配器: {selectedAdapter}</p>
              </div>
              <select
                value={selectedAdapter}
                onChange={(e) => handleAdapterChange(e.target.value)}
                className="px-3 py-2 border border-ts-border rounded-md text-sm bg-ts-background"
              >
                <option value="custom">Custom</option>
                <option value="langchain">LangChain</option>
                <option value="autogen">AutoGen</option>
                <option value="dify">Dify</option>
              </select>
            </div>
            <div className="border border-ts-border rounded-lg overflow-hidden">
              <VirtualTreeWithSearch tree={tree} height={500} showSearch={true} showTypeFilter={true} />
            </div>
          </div>
        )}

        {/* Chat View */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-ts-foreground">Chat Mode</h2>
              <p className="text-sm text-ts-muted-foreground">对话式 Agent 交互</p>
            </div>
            <div className="border border-ts-border rounded-lg overflow-hidden">
              <VirtualChat
                messages={chatMessages}
                config={{
                  showThinking: true,
                  showTokenUsage: true,
                  showTimestamp: true,
                  onSendMessage: handleSendMessage,
                }}
                height={500}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-ts-border bg-ts-muted/30 px-6 py-3 text-center text-xs text-ts-muted-foreground">
        TraceScope v1.0.0 • AgentPrism Design System •{' '}
        <a
          href="https://github.com/afine907/react-tracescope"
          className="text-ts-primary hover:underline"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
