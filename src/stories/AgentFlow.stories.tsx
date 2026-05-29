import type { Meta, StoryObj } from '@storybook/react';
import { AgentFlow } from '../AgentFlow';

// ─── Story Meta ──────────────────────────────────────────────────────────────

const meta: Meta<typeof AgentFlow> = {
  title: 'Components/AgentFlow',
  component: AgentFlow,
  parameters: {
    docs: {
      description: {
        component:
          'A lightweight React component for visualizing AI agent execution traces from SSE streams. Supports list, timeline, and waterfall views with virtual scrolling for 100K+ events.',
      },
    },
  },
  argTypes: {
    theme: {
      control: 'select',
      options: ['dark', 'light'],
      description: 'Color theme for the component',
    },
    viewMode: {
      control: 'select',
      options: ['list', 'timeline', 'waterfall'],
      description: 'Display mode for events',
    },
    autoConnect: {
      control: 'boolean',
      description: 'Auto-connect to SSE endpoint on mount',
    },
    locale: {
      control: 'select',
      options: ['en', 'zh'],
      description: 'UI language',
    },
  },
};

export default meta;

type Story = StoryObj<typeof AgentFlow>;

/**
 * All stories use autoConnect={false} so the component renders in a
 * disconnected state. To see live events, run `pnpm mock-server` and
 * set autoConnect to true in the Storybook controls panel.
 */

// ─── Default Story ───────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    url: 'http://localhost:8080/agent/stream',
    theme: 'dark',
    viewMode: 'list',
    autoConnect: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default dark theme in list view. Disconnected state shown since there is no SSE server.',
      },
    },
  },
};

// ─── Dark Theme ──────────────────────────────────────────────────────────────

export const DarkTheme: Story = {
  args: {
    url: 'http://localhost:8080/agent/stream',
    theme: 'dark',
    viewMode: 'list',
    autoConnect: false,
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Dark theme variant with dark background. Best for low-light environments and developer tools.',
      },
    },
  },
};

// ─── Light Theme ─────────────────────────────────────────────────────────────

export const LightTheme: Story = {
  args: {
    url: 'http://localhost:8080/agent/stream',
    theme: 'light',
    viewMode: 'list',
    autoConnect: false,
  },
  parameters: {
    backgrounds: { default: 'light' },
    docs: {
      description: {
        story: 'Light theme variant with light background. Suitable for bright environments and documentation sites.',
      },
    },
  },
};

// ─── Timeline View ───────────────────────────────────────────────────────────

export const TimelineView: Story = {
  args: {
    url: 'http://localhost:8080/agent/stream',
    theme: 'dark',
    viewMode: 'timeline',
    autoConnect: false,
    defaultCollapsed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline view with collapsible event rows. Events are collapsed by default and can be expanded to show full details.',
      },
    },
  },
};

// ─── Waterfall View ──────────────────────────────────────────────────────────

export const WaterfallView: Story = {
  args: {
    url: 'http://localhost:8080/agent/stream',
    theme: 'dark',
    viewMode: 'waterfall',
    autoConnect: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Waterfall view showing event durations as horizontal bars on a time axis. Useful for identifying bottlenecks in tool execution.',
      },
    },
  },
};

// ─── Compact Mode ────────────────────────────────────────────────────────────

export const CompactMode: Story = {
  args: {
    url: 'http://localhost:8080/agent/stream',
    theme: 'dark',
    viewMode: 'list',
    autoConnect: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact mode reduces padding and font size for denser event display. Toggle via the compact button in the toolbar.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

// ─── With Custom Theme ───────────────────────────────────────────────────────

export const WithCustomTheme: Story = {
  args: {
    url: 'http://localhost:8080/agent/stream',
    theme: 'dark',
    viewMode: 'list',
    autoConnect: false,
    customTheme: {
      '--af-accent': '#f472b6',
      '--af-bg': '#1e1b2e',
      '--af-surface': '#2d2640',
      '--af-text': '#e8e0f0',
      '--af-border': '#3d3555',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Custom CSS variable overrides for theming. Pass a customTheme object with CSS custom property names to override the default color scheme.',
      },
    },
  },
};
