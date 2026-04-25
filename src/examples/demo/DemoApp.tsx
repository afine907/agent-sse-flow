/**
 * TraceScope Demo Application
 * Premium Architecture Design
 */

import { useState, useCallback, useMemo } from 'react';
import {
  User,
  Zap,
  Wrench,
  Code,
  Terminal,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// Components
import { VirtualTreeWithSearch, ConnectionStatus, VirtualChat } from '../../components';
import { TimelineMarker, JsonBlock, PatchBlock } from '../../components/primitives';

// Types
import type { ProtocolEvent, ProtocolMessageData } from '../../protocol/types';
import type { TreeNode } from '../../types/tree';

// Styles
import '../../styles/demo.css';

// ============================================
// Mock Data
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
// Component Showcase
// ============================================

function ComponentShowcase() {
  return (
    <div className="space-y-8">
      {/* Timeline Markers */}
      <section>
        <h3 className="text-[10px] uppercase tracking-[5px] font-bold text-[#c5a059] mb-4">Timeline Markers</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <TimelineMarker type="dot" />
            <span className="text-white/60 text-sm">Dot</span>
          </div>
          <div className="flex items-center gap-3">
            <TimelineMarker type="pulse" />
            <span className="text-white/60 text-sm">Pulse</span>
          </div>
          <div className="flex items-center gap-3">
            <TimelineMarker type="success" />
            <span className="text-white/60 text-sm">Success</span>
          </div>
          <div className="flex items-center gap-3">
            <TimelineMarker type="error" />
            <span className="text-white/60 text-sm">Error</span>
          </div>
          <div className="flex items-center gap-3">
            <TimelineMarker icon={<User className="w-4 h-4" />} />
            <span className="text-white/60 text-sm">With Icon</span>
          </div>
        </div>
      </section>

      {/* JSON Block */}
      <section>
        <h3 className="text-[10px] uppercase tracking-[5px] font-bold text-[#c5a059] mb-4">JSON Block</h3>
        <JsonBlock
          content={`{
  "status": "success",
  "matches": [
    {"line": 42, "content": "async function validateToken(t) {"},
    {"line": 89, "content": "const isValid = await validateToken(req.header);"}
  ],
  "path": "/volumes/app/src/middleware/auth-middleware.ts"
}`}
        />
      </section>

      {/* Patch Block */}
      <section>
        <h3 className="text-[10px] uppercase tracking-[5px] font-bold text-[#c5a059] mb-4">Patch Block</h3>
        <PatchBlock
          before={['if (await validateToken(token)) return next();']}
          after={[
            'const cached = cache.get(token);',
            'if (cached) return next();',
            'const valid = await validateToken(token);',
            'cache.set(token, valid);',
            'return next();',
          ]}
        />
      </section>
    </div>
  );
}

// ============================================
// Main App
// ============================================

export default function DemoApp() {
  const [activeTab, setActiveTab] = useState<'components' | 'tree' | 'chat'>('tree');
  const [treeData, setTreeData] = useState<ProtocolEvent[]>(langchainDemoData);
  const [chatMessages, setChatMessages] = useState<ProtocolMessageData[]>(chatDemoMessages);

  // Convert events to tree structure
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
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[10px] uppercase tracking-[5px] font-bold text-[#c5a059] mb-1">TraceScope</h1>
            <p className="text-sm text-white/40">Premium Architecture Design</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/40 font-mono">
            <span>节点: {stats.totalNodes}</span>
            <span>Token: {stats.totalTokens}</span>
            <ConnectionStatus state="connected" />
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-white/10 px-6">
        <div className="flex gap-1">
          {[
            { id: 'components', label: 'Components' },
            { id: 'tree', label: 'Tree View' },
            { id: 'chat', label: 'Chat Mode' },
          ].map(({ id, label }) => (
            <button
              key={id}
              className={`px-4 py-3 text-[10px] uppercase tracking-[3px] font-bold transition-colors ${
                activeTab === id
                  ? 'text-[#c5a059] border-b-2 border-[#c5a059]'
                  : 'text-white/40 hover:text-white/60'
              }`}
              onClick={() => setActiveTab(id as any)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'components' && (
          <div className="max-w-4xl mx-auto">
            <ComponentShowcase />
          </div>
        )}

        {activeTab === 'tree' && (
          <div className="max-w-4xl mx-auto">
            <VirtualTreeWithSearch tree={tree} height={600} showSearch={true} showTypeFilter={true} />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <VirtualChat
              messages={chatMessages}
              config={{
                showThinking: true,
                showTokenUsage: true,
                showTimestamp: true,
                onSendMessage: handleSendMessage,
              }}
              height={600}
            />
          </div>
        )}
      </main>
    </div>
  );
}
