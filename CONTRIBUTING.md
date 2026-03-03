# Contributing to Khoj

Thank you for your interest in contributing to Khoj! We want this tool to be the gold standard for extracting token-efficient website context for LLMs.

## Project Structure

For a deep dive into how Khoj works under the hood, read the [ARCHITECTURE.md](ARCHITECTURE.md) guide.

- `src/cli/` - The commander CLI entry point
- `src/browser/` - Playwright browser and page loading
- `src/extractors/` - Individual modules that extract specific data (DOM, Styles, Assets, etc.)
- `src/pipeline/` - Orchestration (parallel execution) and post-processing (cleaning)
- `src/serializer/` - JSON and Markdown formatting
- `src/output/` - Domain-specific directory creation and file writing
- `src/types/` - The master `KhojContext` TS interface. **This is the source of truth.**
- `tests/unit/` - Fast Vitest unit tests against a static fixture
- `tests/integration/` - End-to-end extraction against the fixture page

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development CLI: `npm run dev -- https://example.com`

## Running Tests

We strictly maintain test coverage. Please ensure all tests pass before submitting a PR.

- Run all tests: `npm test`
- Run unit tests in watch mode: `npm run test:watch`
- Run integration tests only: `npm run test:integration`
- Check coverage: `npm run test:coverage` (target is >80%)

## Adding a New Extractor

1. **Update Types First:** If your extractor adds new data to the output, update `src/types/KhojContext.ts` first. This drives the entire project.
2. **Create the Extractor:** Add a file in `src/extractors/`. It should export a function that takes a Playwright `Page` and returns a piece of the context.
3. **Write Tests:** Add a unit test in `tests/unit/` and ensure your extractor handles edge cases (missing nodes, timeouts).
4. **Wire It Up:** Add your extractor to `Promise.all()` inside `src/pipeline/runner.ts`. Update the final `KhojContext` object assembly.
5. **Update Serializers:** If the data is useful to agents, update `src/serializer/MarkdownSerializer.ts` to include it in the `.md` output.

## Code Style

- We use strictly typed TypeScript (no `any`).
- Use `logger.ts` for all terminal output — never `console.log` directly.
- Emoji prefixes are required for standard logger steps.

## Pull Requests

1. Fork the repo and create your feature branch: `git checkout -b feature/my-cool-extractor`
2. Commit your changes (we prefer conventional commits: `feat:`, `fix:`, `docs:`).
3. Ensure CI passes on your fork.
4. Open a Pull Request!
