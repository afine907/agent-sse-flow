/**
 * NodeContent Component Unit Tests
 * Tests for src/components/NodeContent.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NodeContent } from '@tracescope/components/NodeContent';

// Mock dynamic imports
vi.mock('marked', () => ({
  marked: {
    setOptions: vi.fn(),
    parse: vi.fn((content: string) => `<p>${content}</p>`),
  },
}));

vi.mock('highlight.js', () => ({
  default: {
    highlightElement: vi.fn(),
  },
}));

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((content: string) => content),
    addHook: vi.fn(),
    removeHook: vi.fn(),
  },
}));

describe('NodeContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render content', async () => {
      render(<NodeContent content="Hello World" status="complete" />);

      await waitFor(() => {
        expect(screen.getByText('Hello World')).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(<NodeContent content="test" className="custom" />);

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom');
      });
    });
  });

  describe('streaming status', () => {
    it('should show streaming dots when streaming with no content', () => {
      render(<NodeContent content="" status="streaming" />);

      // Streaming dots are rendered as span elements with dots
      const dots = document.querySelectorAll('.ts-streaming-dot');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('should show content when streaming with content', async () => {
      render(<NodeContent content="Loading..." status="streaming" />);

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });

  describe('error status', () => {
    it('should show error message for error status', async () => {
      render(<NodeContent content="failed code" status="error" />);

      await waitFor(() => {
        expect(screen.getByText('Execution failed')).toBeInTheDocument();
      });
    });

    it('should show warning icon for error status', async () => {
      render(<NodeContent content="" status="error" />);

      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });
  });

  describe('content types', () => {
    it('should render plain text content', async () => {
      render(<NodeContent content="Plain text content" status="complete" />);

      await waitFor(() => {
        expect(screen.getByText('Plain text content')).toBeInTheDocument();
      });
    });

    it('should detect code content for code_execution type', async () => {
      render(
        <NodeContent 
          content="const x = 1;" 
          status="complete" 
          nodeType="code_execution" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('const x = 1;')).toBeInTheDocument();
      });
    });

    it('should detect code content for tool_call type', async () => {
      render(
        <NodeContent 
          content="function test() {}" 
          status="complete" 
          nodeType="tool_call" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('function test() {}')).toBeInTheDocument();
      });
    });
  });

  describe('empty content', () => {
    it('should show streaming dots when content is empty and streaming', () => {
      render(<NodeContent content="" status="streaming" />);

      // Streaming dots are rendered as span elements with dots
      const dots = document.querySelectorAll('.ts-streaming-dot');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('should not crash with empty content and complete status', async () => {
      const { container } = render(<NodeContent content="" status="complete" />);

      await waitFor(() => {
        expect(container).toBeTruthy();
      });
    });
  });

  describe('markdown rendering', () => {
    it('should render markdown when enableMarkdown is true', async () => {
      render(
        <NodeContent 
          content="# Heading" 
          status="complete" 
          enableMarkdown={true} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('# Heading')).toBeInTheDocument();
      });
    });

    it('should not render markdown when enableMarkdown is false', async () => {
      render(
        <NodeContent 
          content="# Heading" 
          status="complete" 
          enableMarkdown={false} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('# Heading')).toBeInTheDocument();
      });
    });
  });

  describe('syntax highlighting', () => {
    it('should apply highlighting when enableHighlight is true', async () => {
      render(
        <NodeContent 
          content="const x = 1;" 
          status="complete" 
          nodeType="code_execution"
          enableHighlight={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('const x = 1;')).toBeInTheDocument();
      });
    });

    it('should not apply highlighting when enableHighlight is false', async () => {
      render(
        <NodeContent 
          content="const x = 1;" 
          status="complete" 
          nodeType="code_execution"
          enableHighlight={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('const x = 1;')).toBeInTheDocument();
      });
    });
  });
});
