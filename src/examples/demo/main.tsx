/**
 * TraceScope Demo Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import DemoApp from './DemoApp';

// 样式
import '../../styles/main.css';
import '../../styles/demo.css';
import '../../styles/theme.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>
);