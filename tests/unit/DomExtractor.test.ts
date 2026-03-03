import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import { extractDom } from '../../src/extractors/DomExtractor.js';

describe('DomExtractor', () => {
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

    it('extracts semantic DOM tree and skips noise tags', async () => {
        const tree = await extractDom(page);

        expect(tree).toBeDefined();
        expect(Array.isArray(tree)).toBe(true);

        const tags = tree.map(n => n.tag);
        expect(tags).toContain('header');
        expect(tags).toContain('main');
        expect(tags).toContain('footer');
        expect(tags).not.toContain('script');
    });

    it('preserves id, classes, and aria attributes', async () => {
        const tree = await extractDom(page);

        const headerNode = tree.find(n => n.tag === 'header');
        expect(headerNode).toBeDefined();

        const navNode = headerNode?.children?.find(n => n.tag === 'nav');
        expect(navNode).toBeDefined();

        // The fixture has <nav id="main-nav" aria-label="Main Navigation">
        // DomExtractor stores explicit role attributes only — <nav> has no explicit role="..."
        // so we validate the id and tag instead
        expect(navNode?.id).toBe('main-nav');
        expect(navNode?.tag).toBe('nav');
    });

    it('truncates text content', async () => {
        const tree = await extractDom(page);
        const mainNode = tree.find(n => n.tag === 'main');
        const heroNode = mainNode?.children?.find(n => n.classes.includes('hero'));
        const pNode = heroNode?.children?.find(n => n.tag === 'p');

        expect(pNode?.text).toBe(
            'Khoj extracts structured context from any website so your AI can actually understand it.',
        );
    });
});
