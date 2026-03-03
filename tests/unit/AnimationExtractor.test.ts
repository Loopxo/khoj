import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import { extractAnimations } from '../../src/extractors/AnimationExtractor.js';
import type { ImageAsset } from '../../src/types/KhojiContext.js';

describe('AnimationExtractor', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;

    const mockGifs: ImageAsset[] = [{
        url: 'https://example.com/animation-demo.gif',
        alt: 'Animation demo',
        type: 'gif',
        width: 200,
        height: 200,
        isLazy: false,
        selector: '.card img',
    }];

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

    it('detects CSS keyframe animations', async () => {
        const animMap = await extractAnimations(page, mockGifs);

        const cssAnim = animMap.cssAnimations.find(a => a.name === 'fadeInUp');
        expect(cssAnim).toBeDefined();
        expect(cssAnim?.selector).toContain('.hero');
        expect(cssAnim?.duration).toContain('0.8s');

        // Browsers compute 'from' -> '0%' and 'to' -> '100%' in CSSKeyframeRule.keyText
        expect(cssAnim?.description).toContain('0%');
        expect(cssAnim?.description).toContain('100%');
    });

    it('detects CSS transitions', async () => {
        const animMap = await extractAnimations(page, mockGifs);

        // The fixture has: .card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        // This is captured as a transition on .card selector (trigger: 'unknown' since no :hover on definition)
        const cardTrans = animMap.cssTransitions.find(t => t.selector.includes('.card'));
        expect(cardTrans).toBeDefined();
        expect(cardTrans?.properties).toContain('transform');
        expect(cardTrans?.duration).toBe('0.3s');
    });

    it('detects AOS scroll animations', async () => {
        const animMap = await extractAnimations(page, mockGifs);

        const aosAnim = animMap.scrollAnimations.find(s => s.library === 'aos');
        expect(aosAnim).toBeDefined();
        expect(aosAnim?.animationType).toBe('fade-up');
    });

    it('infers GIF purposes', async () => {
        const animMap = await extractAnimations(page, mockGifs);

        const gifAnim = animMap.gifAnimations.find(g => g.url.includes('animation-demo.gif'));
        expect(gifAnim).toBeDefined();
        expect(gifAnim?.purpose).toBe('product-demo');
    });

    it('generates a summary', async () => {
        const animMap = await extractAnimations(page, mockGifs);
        expect(animMap.summary).toContain('fadeInUp');
    });
});
