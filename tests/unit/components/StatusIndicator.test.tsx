/**
 * StatusIndicator Component Unit Tests
 * Tests for src/components/StatusIndicator.tsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '@tracescope/components/StatusIndicator';

describe('StatusIndicator', () => {
  it('should render streaming status', () => {
    render(<StatusIndicator status="streaming" />);

    expect(screen.getByText('Streaming')).toBeInTheDocument();
  });

  it('should render error status', () => {
    render(<StatusIndicator status="error" />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should return null for complete status', () => {
    const { container } = render(<StatusIndicator status="complete" />);

    expect(container.firstChild).toBeNull();
  });

  it('should return null when status is undefined', () => {
    const { container } = render(<StatusIndicator />);

    expect(container.firstChild).toBeNull();
  });

  it('should apply custom className for streaming', () => {
    const { container } = render(<StatusIndicator status="streaming" className="custom" />);

    expect(container.firstChild).toHaveClass('custom');
  });

  it('should apply custom className for error', () => {
    const { container } = render(<StatusIndicator status="error" className="custom" />);

    expect(container.firstChild).toHaveClass('custom');
  });

  it('should have streaming class for streaming status', () => {
    const { container } = render(<StatusIndicator status="streaming" />);

    expect(container.firstChild).toHaveClass('ts-status-streaming');
  });

  it('should have error class for error status', () => {
    const { container } = render(<StatusIndicator status="error" />);

    expect(container.firstChild).toHaveClass('ts-status-error');
  });
});
