/**
 * TraceScope - Agent Flow Execution Trace Visualization System
 * 
 * SSE-based streaming trace visualization for AI Agents
 * Similar to Claude Code's trace visualization
 * 
 * @package tracescope
 * @version 1.0.0
 */

// Core modules
export * from './core';

// Protocol - 标准化数据交换协议 (新)
export * from './protocol';

// Components
export * from './components';

// Examples - 开箱即用的框架示例数据
export * from './examples/frameworks';

// React adapter (optional - only if React is available)
try {
  require.resolve('react');
  require.resolve('react-dom');
  module.exports = {
    ...module.exports,
    ...require('./adapters/react'),
  };
} catch (e) {
  // React not available, skip React exports
}