/**
 * TraceScope Basic Example
 * Demo application showcasing the trace visualization with virtual scrolling
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { TraceScopeProvider, useTraceTree } from '../../adapters/react';
import { VirtualTreeWithSearch, ErrorBoundary } from '../../components';
import '../../styles/main.css';
import '../../styles/theme.css';

/**
 * Example configuration - 5000 nodes for stress testing
 */
const SSE_URL = 'http://localhost:3001/stream?count=5000';

/**
 * Inner component that uses the tree data
 */
function TraceViewer() {
  const tree = useTraceTree();
  
  if (!tree) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>📡</div>
        <div>等待接收追踪数据...</div>
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#999' }}>
          连接到 {SSE_URL}
        </div>
      </div>
    );
  }
  
  return (
    <VirtualTreeWithSearch
      tree={tree}
      height={600}
      showSearch={true}
      showTypeFilter={true}
    />
  );
}

/**
 * Demo App Component
 */
export function DemoApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px' }}>TraceScope Demo</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Agent Flow Execution Trace Visualization - 压力测试 (5000+ 节点)
      </p>
      
      <ErrorBoundary>
        <TraceScopeProvider 
          config={{ 
            url: SSE_URL,
            autoConnect: true,
          }}
        >
          <TraceViewer />
        </TraceScopeProvider>
      </ErrorBoundary>
      
      <div style={{ marginTop: '20px', padding: '12px', background: '#f5f5f5', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
        <strong>测试说明：</strong> 默认生成 5000 个节点来测试虚拟滚动的性能。<br/>
        可通过修改 SSE_URL 中的 count 参数调整节点数量（如 ?count=1000）
      </div>
    </div>
  );
}

/**
 * Mount the demo app
 */
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DemoApp />);
} else {
  console.error('Root element not found');
}