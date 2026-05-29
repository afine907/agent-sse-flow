import type { Preview } from '@storybook/react';
import '../src/AgentFlow.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#111827' },
        { name: 'light', value: '#f9fafb' },
      ],
    },
    layout: 'padded',
  },
};

export default preview;
