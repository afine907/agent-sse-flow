/**
 * Toolbar Component
 * Action buttons for trace controls and search/filter
 */

import React, { useState, useCallback } from 'react';
import { useConnection, useFilteredNodes } from '../adapters/react/hooks';
import './Toolbar.css';

export interface ToolbarProps {
  /**
   * Custom class name
   */
  className?: string;
  
  /**
   * Show search/filter controls
   */
  showFilters?: boolean;
}

/**
 * Node type options for filtering
 */
const NODE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'user_input', label: 'User Input' },
  { value: 'assistant_thought', label: 'Thought' },
  { value: 'tool_call', label: 'Tool Call' },
  { value: 'code_execution', label: 'Code' },
  { value: 'execution_result', label: 'Result' },
  { value: 'final_output', label: 'Output' },
  { value: 'error', label: 'Error' },
];

/**
 * Toolbar Component
 * Provides action buttons for connection control and search/filter
 */
export function Toolbar({ className = '', showFilters = true }: ToolbarProps): JSX.Element {
  const { connect, disconnect, reconnect, reset } = useConnection();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Get filtered nodes count
  const { filteredCount, totalCount } = useFilteredNodes({
    query: searchQuery,
    nodeType: filterType || undefined,
    status: filterStatus || undefined,
  });
  
  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);
  
  // Handle type filter change
  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value);
  }, []);
  
  // Handle status filter change
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
  }, []);
  
  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType('');
    setFilterStatus('');
  }, []);
  
  return (
    <div className={`toolbar ${className}`}>
      {/* Search input */}
      {showFilters && (
        <div className="toolbar-search">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search nodes"
          />
        </div>
      )}

      {/* Type filter */}
      {showFilters && (
        <select
          className="toolbar-select"
          value={filterType}
          onChange={handleTypeChange}
          aria-label="Filter by node type"
        >
          {NODE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {/* Status filter */}
      {showFilters && (
        <select
          className="toolbar-select"
          value={filterStatus}
          onChange={handleStatusChange}
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          <option value="streaming">Streaming</option>
          <option value="complete">Complete</option>
          <option value="error">Error</option>
        </select>
      )}
      
      {/* Filter count */}
      {showFilters && (searchQuery || filterType || filterStatus) && (
        <span className="toolbar-filter-count">
          {filteredCount} / {totalCount} nodes
        </span>
      )}
      
      {/* Clear filters button */}
      {showFilters && (searchQuery || filterType || filterStatus) && (
        <button
          className="toolbar-btn toolbar-btn-small"
          onClick={handleClearFilters}
          aria-label="Clear all filters"
        >
          ✕
        </button>
      )}
      
      {/* Connection control buttons */}
      <div className="toolbar-divider" />
      
      <button
        className="toolbar-btn"
        onClick={reconnect}
        aria-label="Reconnect to server"
      >
        <span className="btn-icon" aria-hidden="true">🔄</span>
      </button>

      <button
        className="toolbar-btn"
        onClick={disconnect}
        aria-label="Disconnect from server"
      >
        <span className="btn-icon" aria-hidden="true">⏹️</span>
      </button>

      <button
        className="toolbar-btn toolbar-btn-danger"
        onClick={reset}
        aria-label="Clear all data and reset"
      >
        <span className="btn-icon" aria-hidden="true">🗑️</span>
      </button>
    </div>
  );
}

export default Toolbar;