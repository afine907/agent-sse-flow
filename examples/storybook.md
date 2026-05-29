# Storybook Usage Guide

Storybook provides an interactive development environment for building and testing AgentFlow components in isolation.

## Prerequisites

Storybook dependencies are already included in `devDependencies`. Install them with:

```bash
pnpm install
```

## Running Storybook Locally

Start the Storybook dev server on port 6006:

```bash
pnpm dev-storybook
```

Open http://localhost:6006 in your browser to view the component stories.

## Available Stories

| Story | Description |
|-------|-------------|
| **Default** | Dark theme in list view, disconnected state |
| **DarkTheme** | Dark theme variant with dark background |
| **LightTheme** | Light theme variant with light background |
| **TimelineView** | Timeline view with collapsible event rows |
| **WaterfallView** | Waterfall view with duration bars on a time axis |
| **CompactMode** | Compact layout with reduced padding |
| **WithCustomTheme** | Custom CSS variable overrides for branding |

## Using Stories for Development

### Interactive Controls

Each story exposes controls in the Storybook sidebar. You can change props like `theme`, `viewMode`, and `locale` without editing code.

### Testing with Live SSE Data

Stories render the component in a disconnected state by default (`autoConnect={false}`). To see live events:

1. Start the mock SSE server in a separate terminal:
   ```bash
   pnpm mock-server
   ```
2. In the Storybook controls panel, set `autoConnect` to `true`.
3. The component will connect to `http://localhost:8080/agent/stream` and display streamed events.

### Visual Regression Testing

Storybook stories can be used as a basis for visual regression tests with tools like Chromatic or Playwright:

```bash
# Build Storybook as static files
pnpm build-storybook
```

The static output is written to `storybook-static/` and can be deployed or used with snapshot testing tools.

## Adding New Stories

Create a new story file in `src/stories/` following the naming convention `*.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { AgentFlow } from '../AgentFlow';

const meta: Meta<typeof AgentFlow> = {
  title: 'Components/AgentFlow',
  component: AgentFlow,
};

export default meta;
type Story = StoryObj<typeof AgentFlow>;

export const MyCustomStory: Story = {
  args: {
    url: 'http://localhost:8080/agent/stream',
    theme: 'dark',
    autoConnect: false,
  },
};
```

Storybook auto-discovers any `*.stories.@(ts|tsx)` files under `src/`.

## Building for Production

Generate a static Storybook build for deployment or CI:

```bash
pnpm build-storybook
```

Output goes to `storybook-static/`. This can be served by any static file host or used in CI pipelines for visual review.

## Configuration

Storybook configuration lives in `.storybook/`:

- `main.ts` -- Story discovery, addons, and Vite framework settings
- `preview.ts` -- Global decorators, parameters, and CSS imports
