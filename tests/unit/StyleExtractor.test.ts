import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import { extractStyles } from '../../src/extractors/StyleExtractor.js';

describe('StyleExtractor', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;

    beforeAll(async () => {
        browser = await chromium.launch({ headless: true });
        context = await browser.newContext();
        page = await context.newPage();
        const fixturePath = path.resolve(__dirname, '../../fixtures/sample.html');
        await page.goto(`file://${fixturePath}`);
    });

    afterAll(async () => {
        await browser.close();
    });

    it('extracts design tokens (colors and spacing)', async () => {
        const design = await extractStyles(page);

        expect(design.colors['--color-primary']).toBe('#6c63ff');
        expect(design.colors['--color-secondary']).toBe('#f50057');
        expect(design.colors['--color-background']).toBe('#0a0a0a');

        expect(design.spacing['--space-sm']).toBe('8px');
        expect(design.spacing['--space-md']).toBe('16px');
        expect(design.spacing['--space-lg']).toBe('32px');
        expect(design.spacing['--font-size-base']).toBe('16px'); // Categorized as spacing/size
    });

    it('extracts computed font families', async () => {
        const design = await extractStyles(page);

        // The fixture has body: Inter, sans-serif; h1: Outfit, sans-serif
        expect(design.fonts).toContain('Inter');
        expect(design.fonts).toContain('sans-serif');
        expect(design.fonts).toContain('Outfit');
    });

    it('extracts breakpoints from media queries', async () => {
        const design = await extractStyles(page);

        expect(design.breakpoints).toContain('480px');
        expect(design.breakpoints).toContain('768px');
    });
});
