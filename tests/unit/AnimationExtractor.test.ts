import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import { extractAnimations } from '../../src/extractors/AnimationExtractor.js';
import type { ImageAsset } from '../../src/types/KhojContext.js';

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
        selector: '.card img'
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
        expect(cssAnim?.description).toContain('from');
        expect(cssAnim?.description).toContain('to');
    });

    it('detects CSS hover transitions', async () => {
        const animMap = await extractAnimations(page, mockGifs);

        const hoverTrans = animMap.cssTransitions.find(t => t.trigger === 'hover' && t.selector.includes('.card'));
        expect(hoverTrans).toBeDefined();
        expect(hoverTrans?.properties).toContain('transform');
    });

    it('detects AOS scroll animations', async () => {
        const animMap = await extractAnimations(page, mockGifs);

        const aosAnim = animMap.scrollAnimations.find(s => s.library === 'aos');
        expect(aosAnim).toBeDefined();
        expect(aosAnim?.animationType).toBe('fade-up');
        expect(aosAnim?.selector).toContain('div.card');
    });

    it('infers GIF purposes', async () => {
        const animMap = await extractAnimations(page, mockGifs);

        const gifAnim = animMap.gifAnimations.find(g => g.url.includes('animation-demo.gif'));
        expect(gifAnim).toBeDefined();
        expect(gifAnim?.purpose).toBe('product-demo'); // because 'demo' is in name/alt
    });

    it('generates a summary', async () => {
        const animMap = await extractAnimations(page, mockGifs);
        expect(animMap.summary).toContain('CSS animations: fadeInUp');
    });
});
