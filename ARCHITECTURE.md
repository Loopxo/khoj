# Architecture of Khoji

Khoji is built with a modular, parallelized architecture designed for speed and extensibility. Because it runs within a headless browser (Playwright), it can analyze modern single-page applications (SPAs) exactly as they render for human users.

## Core Flow

1. **CLI / Setup (`src/cli/index.ts`)**
   The entry point parses user options via Commander, validates inputs, and hands the configuration to the internal runner.

2. **Browser Layer (`src/browser/`)**
   - `BrowserManager`: Handles launching and tearing down the Playwright Chromium instance. Parses the `--fast` flag to block images/fonts network requests if requested.
   - `PageLoader`: Navigates to the target URL and waits for the network to idle, ensuring the DOM is fully hydrated.

3. **Extraction Pipeline (`src/pipeline/runner.ts`)**
   Once the page is loaded, the runner executes a suite of specialized "Extractors" in parallel via `Promise.all()`. This is the core engine of Khoji.

4. **Extractors (`src/extractors/`)**
   Each extractor is an isolated function responsible for reading the DOM and returning a specific subset of data defined in the `KhojiContext` schema:
   - `MetaExtractor`: Title, description, canonical, JSON-LD.
   - `DomExtractor`: A cleaned, depth-capped snapshot of the HTML tree.
   - `StyleExtractor`: Computed CSS custom properties (colors, typography).
   - `AssetExtractor`: Images, GIFs, icons, and loaded fonts.
   - `ContentExtractor`: Headings, paragraphs, button labels.
   - `InteractionExtractor`: Forms, input fields, and navigation links.
   - `AnimationExtractor`: Inspects CSS keyframes, transitions, and JS library footprints (GSAP, Framer).

5. **Post-Processing (`src/pipeline/Cleaner.ts`)**
   Raw extracted data is cleaned to save tokens (e.g., stripping duplicate image URLs, removing empty structural nodes, truncating overly long text blocks).

6. **Serialization (`src/serializer/`)**
   The final in-memory `KhojiContext` object is serialized into two formats:
   - `JsonSerializer`: Directly outputs the object to JSON.
   - `MarkdownSerializer`: Converts the object into a structured Markdown document, optimized for LLM reading.

7. **Output & Clone Mode (`src/output/`)**
   All artifacts are saved into a domain-specific subdirectory (e.g., `output/stripe.com/`).
   - If **Clone Mode** is enabled (`--clone`), the runner additionally grabs:
     - A full-page PNG screenshot via Playwright.
     - The raw HTML payload.
     - All inline styles and dynamically fetched external CSS files (bypassing browser CORS via a Node backend fetch).

8. **AI Adapter (`src/ai/GeminiAdapter.ts`)**
   If `--send-to-gemini` is passed, the final JSON context is piped directly to the Google Gemini API along with an optional user prompt.
