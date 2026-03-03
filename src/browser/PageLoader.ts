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

    async load(url: string): Promise<LoadResult> {
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

            // Auto-scroll the page to trigger lazy-loaded images and intersection observers (scroll animations)
            logger.step('⏬', 'Scrolling page to trigger animations & lazy-loading...');
            await page.evaluate(async () => {
                await new Promise<void>((resolve) => {
                    let totalHeight = 0;
                    const distance = 150;
                    const maxScrolls = 100; // Safeguard against infinite scroll pages
                    let scrolls = 0;

                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        scrolls++;

                        if (totalHeight >= scrollHeight || scrolls >= maxScrolls) {
                            clearInterval(timer);
                            // Scroll instantly back to top so screenshot looks normal
                            window.scrollTo(0, 0);
                            resolve();
                        }
                    }, 100); // 100ms per 150px provides a smooth enough scroll for triggers
                });
            });

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
