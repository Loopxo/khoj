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

            // Extra settle time for single-page apps running animations or deferred renders
            await page.waitForTimeout(800);

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
