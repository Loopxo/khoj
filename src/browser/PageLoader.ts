import type { BrowserContext, Page } from 'playwright';
import { logger } from '../utils/logger.js';

export interface LoadResult {
    page: Page;
    finalUrl: string;
    statusCode: number | null;
    loadTime: number;
}

/**
 * Loads a URL into a new Playwright page with:
 * - networkidle wait strategy (all network activity settles)
 * - configurable timeout
 * - redirect tracking
 * - graceful failure with partial result
 */
export class PageLoader {
    constructor(
        private readonly context: BrowserContext,
        private readonly timeoutMs: number = 30_000,
    ) { }

    async load(url: string, clickSelector?: string): Promise<LoadResult> {
        const page = await this.context.newPage();
        const start = Date.now();

        // Track GIF/image responses for the asset extractor
        page.on('response', (response) => {
            const contentType = response.headers()['content-type'] ?? '';
            const reqUrl = response.url();
            if (contentType.includes('image/gif') || reqUrl.endsWith('.gif')) {
                // Store on page for later retrieval by AssetExtractor
                page.evaluate((u) => {
                    (window as Window & { __khoj_gifs__?: string[] }).__khoj_gifs__ = [
                        ...((window as Window & { __khoj_gifs__?: string[] }).__khoj_gifs__ ?? []),
                        u,
                    ];
                }, reqUrl).catch(() => undefined);
            }
        });

        let statusCode: number | null = null;

        try {
            const response = await page.goto(url, {
                waitUntil: 'networkidle',
                timeout: this.timeoutMs,
            });

            statusCode = response?.status() ?? null;

            if (statusCode !== null && statusCode >= 400) {
                logger.warn(`Server responded with HTTP ${statusCode} for ${url}`);
            }

            // Handle Click-to-Enter Preloaders
            if (clickSelector) {
                logger.step('🖱️', `Found --click flag. Waiting for and clicking: ${clickSelector}`);
                try {
                    await page.waitForSelector(clickSelector, { timeout: 10000 });
                    await page.click(clickSelector);
                    // Wait 3 seconds for intro animations/overlays to fade out
                    await page.waitForTimeout(3000);
                } catch (e) {
                    logger.warn(`Failed to click selector "${clickSelector}". Proceeding anyway.`);
                }
            }

            // Auto-scroll the page to trigger lazy-loaded images and intersection observers (scroll animations)
            // We use native mouse.wheel events here instead of window.scrollBy because award-winning 
            // websites often use Virtual Scroll libraries (Locomotive, Lenis) that ONLY respond to real WheelEvents.
            logger.step('⏬', 'Scrolling page to trigger GSAP/Virtual-Scroll animations & lazy-loading...');

            // Move mouse to center of screen to ensure wheel events are captured by the main body
            const viewport = page.viewportSize();
            if (viewport) {
                await page.mouse.move(viewport.width / 2, viewport.height / 2);
            }

            let previousScrollY = -1;
            let unchangedCount = 0;
            const maxScrolls = 50;

            for (let i = 0; i < maxScrolls; i++) {
                await page.mouse.wheel(0, 400); // 400px per scroll tick
                // Wait 150ms for smooth scroll momentum (Lenis/Locomotive) AND animations to render
                await page.waitForTimeout(150);

                const scrollData = await page.evaluate(() => {
                    return {
                        scrollY: window.scrollY,
                        scrollHeight: document.body.scrollHeight,
                        innerHeight: window.innerHeight
                    };
                });

                if (scrollData.scrollY === previousScrollY) {
                    unchangedCount++;
                    // If height hasn't changed for 5 ticks, we hit bottom or scroll is fully hijacked
                    if (unchangedCount > 5) break;
                } else {
                    unchangedCount = 0;
                }
                previousScrollY = scrollData.scrollY;

                // Break if we natively hit the bottom bounds
                if (scrollData.scrollY + scrollData.innerHeight >= scrollData.scrollHeight - 10) {
                    break;
                }
            }

            // Scroll instantly back to top so screenshot looks normal
            await page.evaluate(() => window.scrollTo(0, 0));

            // Extra settle time for single-page apps running animations or deferred renders
            await page.waitForTimeout(1000);

            const loadTime = Date.now() - start;
            const finalUrl = page.url();

            logger.success(`Page loaded in ${(loadTime / 1000).toFixed(2)}s → ${finalUrl}`);

            return { page, finalUrl, statusCode, loadTime };
        } catch (err) {
            const loadTime = Date.now() - start;
            if (err instanceof Error && err.message.includes('timeout')) {
                logger.warn(`Page load timed out after ${this.timeoutMs / 1000}s — continuing with partial content`);
            } else {
                logger.error('Failed to load page', err);
                throw err;
            }
            return { page, finalUrl: page.url() || url, statusCode, loadTime };
        }
    }
}
