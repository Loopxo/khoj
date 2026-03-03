import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import { extractAssets } from '../../src/extractors/AssetExtractor.js';

describe('AssetExtractor', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let baseUrl: string;

    beforeAll(async () => {
        browser = await chromium.launch({ headless: true });
        context = await browser.newContext();
        page = await context.newPage();
        const fixturePath = path.resolve(__dirname, '../../fixtures/sample.html');
        baseUrl = `file://${fixturePath}`;

        // Simulate network interceptor behavior for GIFs as done in PageLoader
        await page.evaluate(() => {
            (window as any).__khoj_gifs__ = [];
        });

        await page.goto(baseUrl);
    });

    afterAll(async () => {
        await browser.close();
    });

    it('extracts images with dimensions and lazy flags', async () => {
        const assets = await extractAssets(page, baseUrl);

        expect(assets.images.length).toBeGreaterThan(0);
        const chartImg = assets.images.find(i => i.url.includes('token-chart.png'));

        expect(chartImg).toBeDefined();
        expect(chartImg?.width).toBe(400);
        expect(chartImg?.height).toBe(300);
        expect(chartImg?.isLazy).toBe(false);

        const designTokensImg = assets.images.find(i => i.url.includes('design-tokens.png'));
        expect(designTokensImg).toBeDefined();
        expect(designTokensImg?.isLazy).toBe(true);
    });

    it('separates GIFs into their own array', async () => {
        const assets = await extractAssets(page, baseUrl);

        expect(assets.gifs.length).toBeGreaterThan(0);
        const demoGif = assets.gifs.find(g => g.url.includes('animation-demo.gif'));
        expect(demoGif).toBeDefined();
        expect(demoGif?.type).toBe('gif');
    });

    it('extracts icons', async () => {
        const assets = await extractAssets(page, baseUrl);
        expect(assets.icons.some(i => i.includes('favicon.ico'))).toBe(true);
    });
});
