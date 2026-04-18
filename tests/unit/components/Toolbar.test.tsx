/**
 * Toolbar Component Unit Tests
 * Tests for src/components/Toolbar.tsx
 */

import { describe, it, expect, vi, React } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '@tracescope/components/Toolbar';

// Mock hooks
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockReconnect = vi.fn();
const mockReset = vi.fn();

vi.mock('@tracescope/adapters/react/hooks', () => ({
  useConnection: () => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    reconnect: mockReconnect,
    reset: mockReset,
  }),
  useFilteredNodes: () => ({
    filteredCount: 5,
    totalCount: 10,
  }),
}));

describe('Toolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render toolbar container', () => {
      render(<Toolbar />);

      expect(screen.getByRole('button', { name: 'Reconnect to server' })).toBeInTheDocument();
    });

    it('should render search input when showFilters is true', () => {
      render(<Toolbar showFilters={true} />);

      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
    });

    it('should hide filters when showFilters is false', () => {
      render(<Toolbar showFilters={false} />);

      expect(screen.queryByPlaceholderText('Search nodes...')).not.toBeInTheDocument();
    });

    it('should render type filter select', () => {
      render(<Toolbar />);

      expect(screen.getByLabelText('Filter by node type')).toBeInTheDocument();
    });

    it('should render status filter select', () => {
      render(<Toolbar />);

      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Toolbar className="custom-toolbar" />);

      expect(container.firstChild).toHaveClass('custom-toolbar');
    });
  });

  describe('connection buttons', () => {
    it('should render reconnect button', () => {
      render(<Toolbar />);

      expect(screen.getByRole('button', { name: 'Reconnect to server' })).toBeInTheDocument();
    });

    it('should render disconnect button', () => {
      render(<Toolbar />);

      expect(screen.getByRole('button', { name: 'Disconnect from server' })).toBeInTheDocument();
    });

    it('should render reset button', () => {
      render(<Toolbar />);

      expect(screen.getByRole('button', { name: 'Clear all data and reset' })).toBeInTheDocument();
    });

    it('should call reconnect when reconnect button is clicked', () => {
      render(<Toolbar />);

      fireEvent.click(screen.getByRole('button', { name: 'Reconnect to server' }));
      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });

    it('should call disconnect when disconnect button is clicked', () => {
      render(<Toolbar />);

      fireEvent.click(screen.getByRole('button', { name: 'Disconnect from server' }));
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should call reset when reset button is clicked', () => {
      render(<Toolbar />);

      fireEvent.click(screen.getByRole('button', { name: 'Clear all data and reset' }));
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('search functionality', () => {
    it('should update search value on input', () => {
      render(<Toolbar />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      expect(searchInput).toHaveValue('test query');
    });
  });

  describe('filter functionality', () => {
    it('should update type filter on select', () => {
      render(<Toolbar />);

      const typeSelect = screen.getByLabelText('Filter by node type');
      fireEvent.change(typeSelect, { target: { value: 'tool_call' } });

      expect(typeSelect).toHaveValue('tool_call');
    });

    it('should update status filter on select', () => {
      render(<Toolbar />);

      const statusSelect = screen.getByLabelText('Filter by status');
      fireEvent.change(statusSelect, { target: { value: 'streaming' } });

      expect(statusSelect).toHaveValue('streaming');
    });
  });

  describe('node type options', () => {
    it('should have All Types option', () => {
      render(<Toolbar />);

      const typeSelect = screen.getByLabelText('Filter by node type');
      expect(typeSelect).toHaveDisplayValue('All Types');
    });

    it('should have User Input option', () => {
      render(<Toolbar />);

      expect(screen.getByRole('option', { name: 'User Input' })).toBeInTheDocument();
    });

    it('should have Tool Call option', () => {
      render(<Toolbar />);

      expect(screen.getByRole('option', { name: 'Tool Call' })).toBeInTheDocument();
    });

    it('should have Code option', () => {
      render(<Toolbar />);

      expect(screen.getByRole('option', { name: 'Code' })).toBeInTheDocument();
    });

    it('should have Error option', () => {
      render(<Toolbar />);

      const typeSelect = screen.getByLabelText('Filter by node type');
      const options = typeSelect.querySelectorAll('option');
      const errorOptions = Array.from(options).filter(opt => opt.textContent === 'Error');
      expect(errorOptions.length).toBeGreaterThan(0);
    });
  });

  describe('status options', () => {
    it('should have All Status option', () => {
      render(<Toolbar />);

      const statusSelect = screen.getByLabelText('Filter by status');
      expect(statusSelect).toHaveDisplayValue('All Status');
    });

    it('should have Streaming option', () => {
      render(<Toolbar />);

      expect(screen.getByRole('option', { name: 'Streaming' })).toBeInTheDocument();
    });

    it('should have Complete option', () => {
      render(<Toolbar />);

      expect(screen.getByRole('option', { name: 'Complete' })).toBeInTheDocument();
    });

    it('should have Error option for status', () => {
      render(<Toolbar />);

      const statusSelect = screen.getByLabelText('Filter by status');
      const options = statusSelect.querySelectorAll('option');
      const errorOptions = Array.from(options).filter(opt => opt.textContent === 'Error');
      expect(errorOptions.length).toBeGreaterThan(0);
    });
  });
});
