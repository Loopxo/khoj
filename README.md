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
- **Clone Mode**: Extracts a full-page PNG screenshot, the raw HTML, and a concatenated CSS file for pixel-perfect AI reproduction.
- **Gemini Native**: Built-in `--send-to-gemini` flag to pipe context straight to an LLM.

## Installation & Usage

Khoj can be run instantly, or installed either globally or locally to suit your workflow.

### 1. Run Instantly (No Install)
If you don't want to install anything, you can run Khoj directly using `npx`:
```bash
npx khoj https://example.com --send-to-gemini --prompt "Identify all primary call-to-action buttons."
```

### Bypassing "Click to Enter" Preloaders
Many high-end award-winning sites hide their entire layout behind an initial "Click to Enter" or "Start Experience" overlay screen. If you extract the site normally, you will only capture the loader screen.

To bypass this natively, inspect the website to find the CSS Selector of the start button (e.g., `#enter-button` or `.preloader-enter`), and pass it to Khoj using the `--click` flag:

```bash
npx khoj https://dich-fashion.webflow.io/ --clone --click ".preloader-enter"
```
Khoj will automatically navigate to the site, wait for the overlay button, click it, wait for the intro animations to clear, and *then* run the full clone extraction of the underlying page!

### 2. Install Globally
If you plan to use Khoj frequently from your terminal:
```bash
npm install -g khoj
```
Once installed globally, you can drop the `npx` prefix and just type:
```bash
khoj https://example.com
```

> **Tip:** If you just type `khoj` or `npx khoj` in your terminal without any URL, it will print out the full help menu and list all available options.

### What happens next?
Whichever way you run it, Khoj will create an `output/` folder in your **current working directory**. Inside that folder, you will find a subdirectory named after the website (e.g., `output/example.com/`). 

You can then manually drag and drop these generated files (`khoj-context.json` or `khoj-context.md`) into ChatGPT, Claude, Cursor, or any other AI coding agent as highly-efficient context!

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
  --clone              Clone mode: Extract full-page screenshot, raw HTML, and CSS
  --send-to-gemini     Send output to Gemini API after extraction
  --prompt <text>      Custom instruction to send to Gemini along with context
  -V, --version        output the version number
  -h, --help           display help for command
```

## Output Structure

All extracted data is automatically placed in a subdirectory named after the target domain (e.g., `./output/stripe.com/`).

### Programmatic API

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

### Clone Mode Artifacts
When using the `--clone` flag, three additional raw files are saved directly into the domain folder:
- **`khoj-clone-YYYY-MM-DD.png`**: A full-page visual screenshot captured by Playwright.
- **`khoj-clone-YYYY-MM-DD.html`**: The fully hydrated, raw HTML source code.
- **`khoj-clone-YYYY-MM-DD.css`**: All styling rules needed for pixel-perfect cloning (combines inline `<style>` and external `<link rel="stylesheet">` tags).

## Requirements
- Node.js >= 18
- Playwright (installed automatically)

## License
MIT