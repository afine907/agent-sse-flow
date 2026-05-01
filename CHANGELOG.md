# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-05-01

### Added
- **Multi-agent hierarchy** - `agentName` and `agentColor` fields for multi-agent systems
- **Cost tracking** - `cost`, `tokens`, `duration` fields for monitoring API usage
- **Agent filter** - Dropdown to filter events by agent
- **Demo website** - Live demo at https://afine907.github.io/agent-sse-flow/
- **Integration examples** - Python FastAPI, Node.js Express, Next.js, OpenAI Assistant, LangGraph
- **GitHub templates** - Issue and PR templates

### Fixed
- Memory leak prevention with mount state tracking
- EventSource cleanup on unmount
- Clipboard fallback for non-HTTPS environments
- Keyboard accessibility for timeline rows

### Changed
- Improved UI with timestamp display
- Added copy button for tool args and results
- Collapsible tool arguments
- Enhanced error handling

## [Unreleased]

## [2.0.0] - 2026-05-01

### Added
- Timeline view mode with collapsible events
- Virtual scrolling for 10,000+ events
- Dark/Light theme support
- Connection status indicator
- Error handling with callbacks
- TypeScript support
- Performance tests with Playwright

### Changed
- Renamed from `react-tracescope` to `agent-sse-flow`
- Improved markdown rendering with `react-markdown`
- Better SSE batching with requestAnimationFrame

## [1.0.0] - 2026-04-01

### Added
- Initial release
- Basic SSE streaming visualization
- Event types: start, thinking, tool_call, tool_result, message, error, end
- Virtual scrolling
- NPM package
