# agent-sse-flow

轻量级 React 组件，可视化 AI Agent 执行轨迹的 SSE 流。

## 开发者命令

```bash
pnpm dev          # 开发服务器 (port 5173)
pnpm build        # 构建库 (ES + CJS → dist/)
pnpm type-check   # TypeScript 验证
pnpm lint         # ESLint 检查
pnpm test         # 单元测试 (vitest, 19 tests)
pnpm perf-test    # 性能测试 (Playwright, 100K events)
pnpm mock-server  # 启动 Mock SSE 服务器
```

**注意**: 必须用 `pnpm`，不是 `npm`。项目用 `.npmrc` 强制。

## 项目结构

```
src/
├── index.ts          # 导出: AgentFlow, AgentFlowProps, FlowEvent
├── AgentFlow.tsx     # 主组件 (~200 行)，虚拟滚动 + 布局
├── EventRow.tsx      # EventRow, TimelineRow 组件
├── useSSE.ts         # SSE 连接，rAF 批处理，增量统计
├── types.ts          # TypeScript 接口
├── utils.ts          # formatTime, copyToClipboard, icons
├── AgentFlow.css     # BEM 样式 (.agent-flow--dark, .agent-flow--light)
└── main.tsx          # Dev 演示页
```

## 关键 API

```tsx
// Props
<AgentFlow
  url="http://localhost:8080/agent/stream"  // 必填
  theme="dark"                               // 默认 dark
  autoConnect={true}                         // 默认 true
  maxEvents={100000}                        // 默认 100K
  onError={fn}
  onStatusChange={fn}
/>

// FlowEvent 字段
{
  type: 'start'|'thinking'|'tool_call'|'tool_result'|'message'|'error'|'end',
  message?: string,
  tool?: string,
  args?: object,
  result?: string,
  timestamp: number,
  agentName?: string,      // 多 Agent 系统
  agentColor?: string,     // Agent 颜色
  cost?: number,           // API 成本
  tokens?: number,         // token 数量
  duration?: number        // 耗时(ms)
}
```

## 测试

- 单元测试: `pnpm test` (vitest, 位于 `tests/`)
- 性能测试: `pnpm perf-test` (Playwright, 100K 节点压测)
- CI 验证: type-check → build → test

## 规范

- 提交格式: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- 注释语言: 英文
- CSS: BEM 命名 + 主题变体

## 相关文档

- [README.md](./README.md) - 完整使用文档
- [CLAUDE.md](./CLAUDE.md) - Claude Code 专用配置
- [CHANGELOG.md](./CHANGELOG.md) - 版本历史