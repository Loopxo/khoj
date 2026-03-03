import { chromium, type Browser, type BrowserContext } from 'playwright';
import { logger } from '../utils/logger.js';

export type LoadMode = 'full' | 'fast';

export interface BrowserSession {
    browser: Browser;
    context: BrowserContext;
}

/**
 * Manages the Playwright browser lifecycle for a single extraction run.
 * Each run gets an isolated browser context — no shared cookies, storage, or state.
 */
export class BrowserManager {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;

    async launch(mode: LoadMode = 'fast'): Promise<BrowserContext> {
        logger.step('🌐', 'Launching browser...');

        this.browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
            ],
        });

        this.context = await this.browser.newContext({
            userAgent:
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            locale: 'en-US',
            timezoneId: 'America/New_York',
            viewport: { width: 1440, height: 900 },
            javaScriptEnabled: true,
            ignoreHTTPSErrors: true,
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
        });

        // Block heavy resources in fast mode to speed up load
        if (mode === 'fast') {
            await this.context.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                // Allow documents and scripts (needed for JS-rendered content)
                // Block media, fonts, and stylesheets for speed
                if (['media', 'font', 'websocket', 'eventsource'].includes(resourceType)) {
                    return route.abort();
                }
                return route.continue();
            });
        }

        logger.success('Browser ready');
        return this.context;
    }

    async close(): Promise<void> {
        if (this.context) {
            await this.context.close().catch(() => undefined);
            this.context = null;
        }
        if (this.browser) {
            await this.browser.close().catch(() => undefined);
            this.browser = null;
        }
        logger.dim('Browser closed');
    }
}
