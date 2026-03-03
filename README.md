<p align="center">
  <img src="logo/khoji-logo.png" alt="Khoji Logo" width="200"/>
</p>

# Khoji (खोज)

[![npm version](https://img.shields.io/npm/v/khoji.svg)](https://npmjs.org/package/khoji)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Khoji** is a focused, open-source CLI tool and Node.js package that visits any public URL and extracts only the meaningful layers of the website — outputting a compact `khoji-context.json` specifically designed for AI agents (like Gemini, Claude, and GPT-4).

Raw HTML is noisy and wastes LLM tokens. Khoji solves the **token bloat problem** by stripping the noise and feeding your agent exactly what it needs to understand the page.

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

Khoji can be run instantly, or installed either globally or locally to suit your workflow.

### 1. Run Instantly (No Install)
If you don't want to install anything, you can run Khoji directly using `npx`:
```bash
npx khojii https://example.com --send-to-gemini --prompt "Identify all primary call-to-action buttons."
```

### 3. Install as a Dev Dependency
If you are building an AI project and want Khoji locally:
```bash
npm install -D khojii
npx khojii https://example.com
```

### Bypassing "Click to Enter" Preloaders
Many high-end award-winning sites hide their entire layout behind an initial "Click to Enter" or "Start Experience" overlay screen. If you extract the site normally, you will only capture the loader screen.

To bypass this natively, inspect the website to find the CSS Selector of the start button (e.g., `#enter-button` or `.preloader-enter`), and pass it to Khoji using the `--click` flag:

```bash
npx khojii https://dich-fashion.webflow.io/ --clone --click ".preloader-enter"
```
Khoji will automatically navigate to the site, wait for the overlay button, click it, wait for the intro animations to clear, and *then* run the full clone extraction of the underlying page!

### 2. Install Globally
If you plan to use Khoji frequently from your terminal:
```bash
npm install -g khojii
```
Once installed globally, you can drop the `npx` prefix and just type:
```bash
khoji https://example.com
```

> **Tip:** If you just type `khoji` or `npx khoji` in your terminal without any URL, it will print out the full help menu and list all available options.

### What happens next?
Whichever way you run it, Khoji will create an `output/` folder in your **current working directory**. Inside that folder, you will find a subdirectory named after the website (e.g., `output/example.com/`). 

You can then manually drag and drop these generated files (`khoji-context.json` or `khoji-context.md`) into ChatGPT, Claude, Cursor, or any other AI coding agent as highly-efficient context!

### Options

```bash
Usage: khoji <url> [options]

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

You can use Khoji within your own Node.js or TypeScript projects:

```bash
npm install khoji playwright
```

```typescript
import { runExtraction } from 'khoji';

await runExtraction({
  url: 'https://example.com',
  outputDir: './context',
  format: 'json',
  timeout: 30000,
  fast: false
});
```

## Output Structure

Khoji produces a structured JSON output (and an optional Markdown summary). See the [JSON Schema definition](./khoji-context.schema.json).

Key sections in `khoji-context.json`:
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
- **`khoji-clone-YYYY-MM-DD.png`**: A full-page visual screenshot captured by Playwright.
- **`khoji-clone-YYYY-MM-DD.html`**: The fully hydrated, raw HTML source code.
- **`khoji-clone-YYYY-MM-DD.css`**: All styling rules needed for pixel-perfect cloning (combines inline `<style>` and external `<link rel="stylesheet">` tags).

## Requirements
- Node.js >= 18
- Playwright (installed automatically)

## License
MIT