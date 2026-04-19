import type { Meta, StoryObj } from '@storybook/react';
import { TraceNode } from '../components/TraceNode';
import type { TreeNode } from '../types/tree';

const meta: Meta<typeof TraceNode> = {
  title: 'Components/TraceNode',
  component: TraceNode,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-4 bg-ts-background min-h-[400px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TraceNode>;

const createNode = (
  nodeType: string,
  chunk: string,
  children: TreeNode[] = [],
  status: string = 'completed'
): TreeNode => ({
  nodeId: `node-${Math.random().toString(36).slice(2, 7)}`,
  data: {
    nodeId: `node-${Math.random().toString(36).slice(2, 7)}`,
    nodeType,
    chunk,
    status,
    createdAt: Date.now() - 5000,
    updatedAt: Date.now(),
  } as any,
  children,
  depth: 0,
  isExpanded: true,
});

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-2">
      <TraceNode node={createNode('user_input', '用户输入内容')} depth={0} />
      <TraceNode node={createNode('assistant_thought', 'AI 思考过程...')} depth={0} />
      <TraceNode node={createNode('tool_call', 'get_weather(city="Beijing")')} depth={0} />
      <TraceNode node={createNode('code_execution', 'print("Hello World")')} depth={0} />
      <TraceNode node={createNode('execution_result', '执行成功: 200 OK')} depth={0} />
      <TraceNode node={createNode('final_output', '北京今天天气晴，气温22°C')} depth={0} />
      <TraceNode node={createNode('error', 'Error: Connection timeout')} depth={0} />
    </div>
  ),
};

export const WithChildren: Story = {
  render: () => {
    const childNode = createNode('tool_call', 'get_weather()', [], 'completed');
    const parentNode = createNode('assistant_thought', '需要调用天气工具', [childNode], 'completed');
    
    return <TraceNode node={parentNode} depth={0} />;
  },
};

export const Streaming: Story = {
  render: () => (
    <TraceNode
      node={createNode('assistant_thought', '正在思考...', [], 'streaming')}
      depth={0}
    />
  ),
};

export const Error: Story = {
  render: () => (
    <TraceNode
      node={createNode('error', 'Connection refused: ECONNREFUSED', [], 'error')}
      depth={0}
    />
  ),
};

export const WithMetrics: Story = {
  render: () => {
    const node = createNode('assistant_thought', '根据用户意图，需要查询天气信息');
    
    return (
      <TraceNode
        node={node}
        depth={0}
        showTokens={true}
        showCost={true}
        minTime={Date.now() - 10000}
        maxTime={Date.now()}
        showTimeline={true}
      />
    );
  },
};
