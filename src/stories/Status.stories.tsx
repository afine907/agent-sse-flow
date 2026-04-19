import type { Meta, StoryObj } from '@storybook/react';
import { Status } from '../components/primitives/Status';

const meta: Meta<typeof Status> = {
  title: 'Primitives/Status',
  component: Status,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['streaming', 'completed', 'error', 'pending'],
    },
    variant: {
      control: 'select',
      options: ['dot', 'badge'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Status>;

export const Default: Story = {
  args: {
    status: 'completed',
    variant: 'dot',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Dot Variant</h3>
      <div className="flex items-center gap-4">
        <Status status="streaming" variant="dot" />
        <Status status="completed" variant="dot" />
        <Status status="error" variant="dot" />
        <Status status="pending" variant="dot" />
      </div>

      <h3 className="text-lg font-semibold">Badge Variant</h3>
      <div className="flex items-center gap-4">
        <Status status="streaming" variant="badge" />
        <Status status="completed" variant="badge" />
        <Status status="error" variant="badge" />
        <Status status="pending" variant="badge" />
      </div>

      <h3 className="text-lg font-semibold">With Labels</h3>
      <div className="flex items-center gap-4">
        <Status status="streaming" variant="badge" showLabel />
        <Status status="completed" variant="badge" showLabel />
        <Status status="error" variant="badge" showLabel />
        <Status status="pending" variant="badge" showLabel />
      </div>
    </div>
  ),
};

export const Streaming: Story = {
  args: {
    status: 'streaming',
    variant: 'badge',
    showLabel: true,
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    variant: 'badge',
    showLabel: true,
  },
};
