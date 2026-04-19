import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../components/primitives/Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Primitives/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    nodeType: {
      control: 'select',
      options: [
        'user_input',
        'assistant_thought',
        'tool_call',
        'code_execution',
        'execution_result',
        'final_output',
        'error',
      ],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: {
    nodeType: 'assistant_thought',
    size: 'md',
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Avatar nodeType="user_input" size="lg" />
      <Avatar nodeType="assistant_thought" size="lg" />
      <Avatar nodeType="tool_call" size="lg" />
      <Avatar nodeType="code_execution" size="lg" />
      <Avatar nodeType="execution_result" size="lg" />
      <Avatar nodeType="final_output" size="lg" />
      <Avatar nodeType="error" size="lg" />
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar nodeType="assistant_thought" size="xs" />
      <Avatar nodeType="assistant_thought" size="sm" />
      <Avatar nodeType="assistant_thought" size="md" />
      <Avatar nodeType="assistant_thought" size="lg" />
      <Avatar nodeType="assistant_thought" size="xl" />
    </div>
  ),
};
