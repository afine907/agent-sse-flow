/**
 * ConnectionStatus Component Unit Tests
 * Tests for src/components/ConnectionStatus.tsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '@tracescope/components/ConnectionStatus';

describe('ConnectionStatus', () => {
  describe('connection states', () => {
    it('should render connecting state', () => {
      render(<ConnectionStatus state="connecting" />);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.getByText('🔄')).toBeInTheDocument();
    });

    it('should render connected state', () => {
      render(<ConnectionStatus state="connected" />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('should render disconnected state', () => {
      render(<ConnectionStatus state="disconnected" />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('⏸️')).toBeInTheDocument();
    });

    it('should render error state', () => {
      render(<ConnectionStatus state="error" />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('❌')).toBeInTheDocument();
    });
  });

  describe('node count', () => {
    it('should not show node count when zero', () => {
      render(<ConnectionStatus state="connected" nodeCount={0} />);

      expect(screen.queryByText(/nodes/)).not.toBeInTheDocument();
    });

    it('should show node count when greater than zero', () => {
      render(<ConnectionStatus state="connected" nodeCount={5} />);

      expect(screen.getByText('5 nodes')).toBeInTheDocument();
    });

    it('should show correct node count', () => {
      render(<ConnectionStatus state="connected" nodeCount={100} />);

      expect(screen.getByText('100 nodes')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply correct class for connecting state', () => {
      const { container } = render(<ConnectionStatus state="connecting" />);

      expect(container.firstChild).toHaveClass('state-connecting');
    });

    it('should apply correct class for connected state', () => {
      const { container } = render(<ConnectionStatus state="connected" />);

      expect(container.firstChild).toHaveClass('state-connected');
    });

    it('should apply correct class for disconnected state', () => {
      const { container } = render(<ConnectionStatus state="disconnected" />);

      expect(container.firstChild).toHaveClass('state-disconnected');
    });

    it('should apply correct class for error state', () => {
      const { container } = render(<ConnectionStatus state="error" />);

      expect(container.firstChild).toHaveClass('state-error');
    });

    it('should apply custom className', () => {
      const { container } = render(<ConnectionStatus state="connected" className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('structure', () => {
    it('should have connection icon', () => {
      render(<ConnectionStatus state="connected" />);

      expect(screen.getByText('✅')).toHaveClass('connection-icon');
    });

    it('should have connection label', () => {
      render(<ConnectionStatus state="connected" />);

      expect(screen.getByText('Connected')).toHaveClass('connection-label');
    });
  });
});
