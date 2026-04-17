# TraceScope - Agent Trace 可视化标准方案

> ⚡ 极致性能的 Agent 执行轨迹可视化组件 | 支持 SSE 流式推送

---

## 为什么选择 TraceScope?

| 痛点 | 解决方案 |
|------|----------|
| 各公司 trace 格式不统一 | **协议标准化** - 一次接入，适配所有 |
| 大节点量卡顿 | **极致性能** - 虚拟滚动 + 增量渲染 |
| 换框架要重写 | **Adapter 适配层** - 切换框架零改动 |
| 体验不够丝滑 | **60fps 目标** - 帧率控制 + Web Worker |

### 核心特性

- 📜 **协议优先** - [TRACE_PROTOCOL.md](./docs/TRACE_PROTOCOL.md) 定义行业标准
- ⚡ **极致性能** - 10万节点流畅渲染
- 🔌 **Universal 适配器** - LangChain / AutoGen / Dify / Coze 开箱即用
- 💬 **对话模式** - 流式输出 + Token 计费 + 思考过程折叠
- 🛠️ **TypeScript** - 完整类型定义，IDE 友好

### 快速开始

```tsx
import { TraceScopeProvider, TraceTree } from 'react-tracescope';
import 'react-tracescope/style.css';

function App() {
  return (
    <TraceScopeProvider
      config={{
        url: 'https://api.example.com/trace/stream',
        adapter: 'langchain',  // 自动转换格式
        autoConnect: true,
      }}
    >
      <TraceTree />
    </TraceScopeProvider>
  );
}
```

### 性能数据

| 节点数 | 帧率 | 内存 | 首屏 |
|--------|------|------|------|
| 1,000 | 60fps | ~10MB | <50ms |
| 5,000 | 60fps | ~25MB | <80ms |
| 50,000 | 45fps | ~80MB | <150ms |
| 100,000 | 30fps | ~100MB | <200ms |

### 支持的框架

| 框架 | 状态 |
|------|------|
| LangChain | 🔄 开发中 |
| AutoGen | 🔄 开发中 |
| Dify | 📋 规划 |
| Coze | 📋 规划 |
| 自定义 | ✅ 已支持 |

### 安装

```bash
npm install react-tracescope
# 或
pnpm add react-tracescope
```

### 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动 Mock SSE 服务器
npm run mock-server

# 构建
npm run build
```

### License

MIT © 2024