# TraceScope 性能优化修复计划

## 目标
基于 Vercel React Best Practices 审查结果，修复所有发现的性能问题。

---

## 问题分组与Agent调度

### Agent 1: Bundle 优化专家
**目标文件**: `src/components/VirtualChat.tsx`, `src/components/NodeContent.tsx`

**任务**:
- [ ] `bundle-dynamic-imports`: 将 `marked` 和 `highlight.js` 改为动态导入
- [ ] 添加加载状态处理
- [ ] 确保功能不变

**预期改动**:
```tsx
// 动态导入 marked 和 hljs
const marked = await import('marked');
const hljs = await import('highlight.js');
```

---

### Agent 2: Re-render 优化专家
**目标文件**: `src/components/VirtualChat.tsx`, `src/adapters/react/hooks.ts`

**任务**:
- [ ] `rerender-memo-with-default-value`: 将 `config = {}` 默认值提升到模块级别
- [ ] `rerender-dependencies`: 修复 `useFilteredNodes` 的对象依赖问题
- [ ] 确保所有 `memo` 组件的 props 稳定

**预期改动**:
```tsx
// 提升默认值到模块级别
const DEFAULT_CHAT_CONFIG: VirtualChatConfig = { ... };

// 拆分 filter 参数为原始值
export function useFilteredNodes(agentId?: string, nodeType?: string, ...) { ... }
```

---

### Agent 3: Context 架构专家
**目标文件**: `src/adapters/react/provider.tsx`, `src/adapters/react/context.ts`, `src/adapters/react/hooks.ts`

**任务**:
- [ ] `server-serialization`: 拆分 Context 为 DataContext 和 ActionsContext
- [ ] 减少不必要的消费者重渲染
- [ ] 更新所有相关 hooks

**预期改动**:
```tsx
// 拆分 Context
const TraceScopeDataContext = createContext({ nodes, tree, error, connectionState });
const TraceScopeActionsContext = createContext({ connect, disconnect, ... });
```

---

### Agent 4: 代码质量优化专家
**目标文件**: `src/components/VirtualTree.tsx`, `src/core/state/immutable.ts`, `src/components/TraceScopeView.tsx`

**任务**:
- [ ] `rendering-conditional-render`: 修复条件渲染语法
- [ ] `js-cache-function-results`: 优化 `deepCloneNode` 使用 `structuredClone`
- [ ] `rendering-hoist-jsx`: 提取静态 JSX
- [ ] `rerender-no-inline-components`: 优化 `renderTreeNode`

**预期改动**:
- 提取 `TreeNodeRow` 组件
- 使用 `structuredClone` 替代 `JSON.parse/stringify`
- 提取静态 JSX 到模块级别

---

## 执行策略

### 阶段 1: 并行执行 (无依赖)
- Agent 1 (Bundle优化) 和 Agent 4 (代码质量) 可并行执行
- 它们修改的文件不重叠

### 阶段 2: 顺序执行 (有依赖)
- Agent 3 (Context架构) 必须先完成
- 然后 Agent 2 (Re-render优化) 执行，因为它依赖 hooks

### 阶段 3: 验证
- 运行 `npm run type-check`
- 运行 `npm run lint`
- 手动测试核心功能

---

## 风险评估

| Agent | 风险等级 | 原因 |
|-------|----------|------|
| Agent 1 | 中 | 动态导入可能影响 SSR |
| Agent 2 | 低 | 仅重构参数和默认值 |
| Agent 3 | 高 | 拆分 Context 是破坏性变更 |
| Agent 4 | 低 | 纯优化，不改变行为 |

---

## 回滚计划

每个 Agent 完成后：
1. 验证功能正常
2. 提交到独立分支
3. 如有问题可单独回滚
