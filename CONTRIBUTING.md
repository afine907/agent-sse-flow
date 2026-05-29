# Contributing to agent-sse-flow

Thank you for your interest in contributing to agent-sse-flow! This document outlines the guidelines for contributing to this project.

## Code of Conduct

Please be respectful and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.

## Development Setup

### Prerequisites

- Node.js >= 18
- pnpm (enforced via `.npmrc`)

### Getting Started

```bash
# Clone the repo
git clone https://github.com/afine907/agent-sse-flow.git
cd agent-sse-flow

# Install dependencies
pnpm install

# Start the development environment
pnpm dev              # Frontend dev server (port 5173)
pnpm mock-server      # Mock SSE server for testing
```

### Build and Test

```bash
pnpm build            # Type-check + build library (ES + CJS to dist/)
pnpm type-check       # TypeScript validation without emit
pnpm lint             # ESLint for src/
pnpm test             # Run unit tests (vitest)
pnpm perf-test        # Run performance tests (Playwright)
pnpm benchmark        # Run benchmarks
```

## Coding Conventions

### Language and Style

- **English comments** throughout all code
- **TypeScript strict mode** -- no `any` types
- **BEM-style CSS** with theme variants (`.agent-flow--dark`, `.agent-flow--light`)

### Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `node-operations.ts` |
| Components | PascalCase | `AgentFlow`, `EventRow` |
| Functions/variables | camelCase | `buildTree`, `formatTime` |
| Constants | UPPER_SNAKE_CASE | `EVENT_DOT_COLORS` |
| CSS classes | BEM | `.agent-flow__event--clickable` |

### Architecture Principles

- Zero runtime dependencies (React peer dependency only)
- Virtual scrolling for 100K+ events via `@tanstack/react-virtual`
- rAF-based message batching to avoid UI jank
- Incremental stats tracking (no O(n) rescans on each render)
- SSR-safe: graceful degradation when `EventSource` is unavailable

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, no logic change) |
| `refactor` | Code refactoring (no feature or fix) |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `ci` | CI/CD changes |
| `chore` | Maintenance tasks |

### Examples

```
feat: add waterfall view mode
fix: prevent scroll jump on new events
docs: add API reference for AgentFlowProps
perf: optimize virtualizer estimateSize for large messages
chore: add Renovate dependency update config
```

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** following the coding conventions above.

3. **Ensure all checks pass**:
   ```bash
   pnpm type-check       # No TypeScript errors
   pnpm lint             # No ESLint warnings
   pnpm test             # All unit tests pass
   pnpm build            # Library builds successfully
   ```

4. **Commit** with a clear conventional commit message.

5. **Push** to your fork and open a Pull Request against `main`.

6. **PR description** should include:
   - What the change does and why
   - Screenshots or recordings for UI changes
   - Breaking changes (if any)

### PR Review Checklist

- [ ] TypeScript type-check passes (`pnpm type-check`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Unit tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Bundle size is within budget (checked automatically)
- [ ] English comments throughout
- [ ] No runtime dependencies added

## Testing Requirements

### Unit Tests

- Located in `tests/` directory
- Run with `pnpm test` (vitest)
- New components and hooks should have corresponding test files
- Aim for meaningful coverage of logic, not just rendering

### Performance Tests

- Located in `tests/perf.spec.ts`
- Run with `pnpm perf-test` (Playwright)
- Must handle 100K+ events without UI freeze
- Test virtual scrolling with large datasets

### Manual Testing

- Test both `dark` and `light` themes
- Test all view modes: `list`, `timeline`, `waterfall`, `dag`, `swimlane`
- Verify responsive behavior at different viewport sizes
- Test with and without `autoConnect`

## How to Add New Event Types

1. **Define the type** in `src/types.ts`:
   ```typescript
   export type EventType = 'start' | 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'end' | 'my_new_type';
   ```

2. **Add a color** in `src/utils.ts`:
   ```typescript
   export const EVENT_DOT_COLORS: Record<FlowEvent['type'], string> = {
     // ... existing types
     my_new_type: '#ff6b6b',
   };
   ```

3. **Add an icon path** in `src/EventRow.tsx`:
   ```typescript
   const ICON_PATHS: Record<EventType, string> = {
     // ... existing types
     my_new_type: 'M12 2L2 7l10 5 10-5-10-5z',
   };
   ```

4. **Add summary logic** in `src/utils.ts` (`getSummary` function).

5. **Add filter support** -- the type automatically appears in the filter checkboxes via `ALL_EVENT_TYPES` in `AgentFlow.tsx`.

6. **Add CSS** for the new type in `src/AgentFlow.css` if needed.

7. **Update tests** in `tests/AgentFlow.test.tsx`.

## How to Add New View Modes

1. **Define the mode** in `src/types.ts`:
   ```typescript
   export type ViewMode = 'list' | 'timeline' | 'waterfall' | 'dag' | 'swimlane' | 'my_view';
   ```

2. **Create the view component** in `src/MyView.tsx`:
   ```typescript
   export function MyView({ events, theme }: { events: FlowEvent[]; theme: Theme }) {
     // Implementation
   }
   ```

3. **Integrate in AgentFlow.tsx**:
   - Import the new view component
   - Add a conditional render branch in the events section
   - Add a view mode toggle button in the header

4. **Add CSS** in `src/AgentFlow.css` with BEM naming.

5. **Handle virtualization** if the view renders a list of events (use `@tanstack/react-virtual`).

6. **Update tests** and add performance benchmarks.

## Project Structure

```
agent-sse-flow/
├── src/
│   ├── index.ts          # Library entry - exports AgentFlow, AgentFlowProps, FlowEvent
│   ├── AgentFlow.tsx     # Main component - virtual scrolling + layout
│   ├── EventRow.tsx      # EventRow, TimelineRow, WaterfallBar components
│   ├── useSSE.ts         # SSE connection, rAF batching, incremental stats hook
│   ├── types.ts          # TypeScript interfaces
│   ├── utils.ts          # formatTime, copyToClipboard, icon/color constants
│   ├── AgentFlow.css     # Styles - dark/light themes, BEM naming
│   └── main.tsx          # Dev-only demo page
├── tests/                # Unit and performance tests
├── docs/                 # Documentation
├── dist/                 # Build output (ESM, CJS, types, CSS)
└── README.md
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
