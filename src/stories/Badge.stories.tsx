import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../components/primitives/Badge';
import { Zap, Wrench, Code } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    label: 'Badge',
  },
};

export const WithIcon: Story = {
  args: {
    label: 'LLM',
    iconStart: <Zap className="size-3" />,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Badge label="XS" size="xs" />
      <Badge label="SM" size="sm" />
      <Badge label="MD" size="md" />
      <Badge label="LG" size="lg" />
    </div>
  ),
};

export const NodeTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge
        iconStart={<Zap className="size-3" />}
        label="THOUGHT"
        size="xs"
        className="bg-ts-badge-thought text-ts-badge-thought-foreground"
        unstyled
      />
      <Badge
        iconStart={<Wrench className="size-3" />}
        label="TOOL"
        size="xs"
        className="bg-ts-badge-tool text-ts-badge-tool-foreground"
        unstyled
      />
      <Badge
        iconStart={<Code className="size-3" />}
        label="CODE"
        size="xs"
        className="bg-ts-badge-code text-ts-badge-code-foreground"
        unstyled
      />
    </div>
  ),
};
