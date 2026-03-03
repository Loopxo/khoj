# Khoj (खोज)

[![npm version](https://img.shields.io/npm/v/khoj.svg)](https://npmjs.org/package/khoj)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Khoj** is a focused, open-source CLI tool and Node.js package that visits any public URL and extracts only the meaningful layers of the website — outputting a compact `khoj-context.json` specifically designed for AI agents (like Gemini, Claude, and GPT-4).

Raw HTML is noisy and wastes LLM tokens. Khoj solves the **token bloat problem** by stripping the noise and feeding your agent exactly what it needs to understand the page.

## Features

- **Token Efficient**: Reduces raw HTML token size by up to 90%.
- **Design Tokens**: Automatically extracts CSS custom properties (colors, spacing, fonts).
- **Animation Aware**: Detects CSS animations, GSAP timelines, Framer Motion, AOS, and infers the purpose of GIFs.
- **Semantic DOM**: Provides a clean, depth-capped, text-truncated structural tree.
- **Component Detection**: Automatically flags repeating patterns (e.g., Cards, ListItems).
- **Interactive Map**: Extracts forms, fields, and navigation menus.
- **Gemini Native**: Built-in `--send-to-gemini` flag to pipe context straight to an LLM.

## Quick Start

Run Khoj instantly without installing:

```bash
npx khoj https://stripe.com
```

### Options

```bash
Usage: khoj <url> [options]

Extract token-efficient website context for AI agents

Arguments:
  url                  Target URL to extract context from

Options:
  -o, --output <dir>   Output directory (default: "./output")
  -f, --format <type>  Output format: json | markdown | both (default: "both")
  -t, --timeout <ms>   Page load timeout in milliseconds (default: "30000")
  --fast               Fast mode: skip image loading (reduces extraction time)
  --send-to-gemini     Send output to Gemini API after extraction
  --prompt <text>      Custom instruction to send to Gemini along with context
  -V, --version        output the version number
  -h, --help           display help for command
```

## Programmatic API

You can use Khoj within your own Node.js or TypeScript projects:

```bash
npm install khoj playwright
```

```typescript
import { runExtraction } from 'khoj';

await runExtraction({
  url: 'https://example.com',
  outputDir: './context',
  format: 'json',
  timeout: 30000,
  fast: false
});
```

## Output Structure

Khoj produces a structured JSON output (and an optional Markdown summary). See the [JSON Schema definition](./khoj-context.schema.json).

Key sections in `khoj-context.json`:
- `meta`: Page title, OpenGraph image, theme-color, JSON-LD
- `structure`: Cleaned semantic tree
- `designTokens`: Colors, fonts, typography, spacing, breakpoints
- `components`: Detected repeating UI patterns
- `assets`: Images, isolated GIFs, fonts, icons, external scripts
- `content`: Extracted headings, buttons, and text blocks
- `interactions`: Actionable forms and nav menus
- `animations`: CSS keyframes, transitions, JS libraries (GSAP, Framer), and GIF intents.

## Requirements
- Node.js >= 18
- Playwright (installed automatically)

## License
MIT