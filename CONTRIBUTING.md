# Contributing to agent-sse-flow

Thank you for your interest in contributing to agent-sse-flow! This document outlines the guidelines for contributing to this project.

## Code of Conduct

Please be respectful and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported
2. Create a detailed issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

### Suggesting Features

1. Check existing issues and PRs
2. Create an issue with:
   - Clear feature description
   - Use cases
   - Proposed implementation (optional)

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with **English comments**
4. Run tests: `npm run build` and `node test-e2e.js`
5. Commit with clear messages: `git commit -m 'feat: add new feature'`
6. Push to your fork: `git push origin feature/my-feature`
7. Create a Pull Request

## Development Setup

```bash
# Clone the repo
git clone https://github.com/your-username/agent-sse-flow.git
cd agent-sse-flow

# Install dependencies (pnpm required)
pnpm install

# Start development
pnpm dev              # Frontend dev server (port 5173)
pnpm mock-server      # Mock SSE server for testing

# Build and test
pnpm build            # Type-check + build library
pnpm type-check       # TypeScript validation
pnpm test             # Run unit tests (vitest)
pnpm perf-test        # Run performance tests (Playwright)
```

## Coding Standards

- **Language**: English comments throughout all code
- **TypeScript**: Strict mode, no `any` types
- **Naming**: 
  - Files: kebab-case (`node-operations.ts`)
  - Classes: PascalCase (`StateManager`)
  - Functions: camelCase (`buildTree`)
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/)

## Project Structure

```
agent-sse-flow/
├── src/
│   ├── index.ts          # Library entry - exports AgentFlow, AgentFlowProps, FlowEvent
│   ├── AgentFlow.tsx     # Main component (~200 lines) - virtual scrolling + layout
│   ├── EventRow.tsx      # EventRow and TimelineRow components
│   ├── useSSE.ts         # SSE connection, rAF batching, incremental stats hook
│   ├── types.ts          # TypeScript interfaces (AgentFlowProps, FlowEvent)
│   ├── utils.ts          # formatTime, copyToClipboard, icon/color constants
│   ├── AgentFlow.css     # Styles - dark/light themes, BEM naming
│   └── main.tsx          # Dev-only demo page with mock events
├── tests/                # Unit and performance tests
│   ├── AgentFlow.test.tsx
│   ├── EventRow.test.tsx
│   └── perf.spec.ts
├── examples/             # Integration examples (FastAPI, Express, Next.js, etc.)
├── dist/                 # Build output (ESM, CJS, types, CSS)
└── README.md            # Project documentation
```

## Commit Message Format

```
<type>(<scope>): <description>

Types:
  - feat: New feature
  - fix: Bug fix
  - docs: Documentation
  - style: Code style
  - refactor: Code refactoring
  - test: Tests
  - chore: Maintenance
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

<p align="center">Thank you for contributing! 🎉</p>