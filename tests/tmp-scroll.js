import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://dich-fashion.webflow.io/', { waitUntil: 'networkidle' });
    console.log('Page loaded');
    try {
        await page.waitForSelector('.preloader-enter', { timeout: 10000 });
        await page.click('.preloader-enter');
        await page.waitForTimeout(3000);
        console.log('Clicked preloader');
    } catch (e) {
        console.log('No preloader found');
    }

    console.log('Scrolling...');

    // Simulate real mouse wheel events
    let previousScrollY = -1;
    let unchangedCount = 0;

    // Give focus to the page body to ensure wheel events are captured
    await page.mouse.move(500, 500);

    for (let i = 0; i < 50; i++) {
        await page.mouse.wheel(0, 400); // Scroll down 400px per tick
        await page.waitForTimeout(150); // Wait for smooth scroll momentum (Lenis/Locomotive) AND animations

        const scrollData = await page.evaluate(() => {
            return {
                scrollY: window.scrollY,
                scrollHeight: document.body.scrollHeight,
                innerHeight: window.innerHeight
            };
        });

        if (scrollData.scrollY === previousScrollY) {
            unchangedCount++;
            if (unchangedCount > 5) {
                console.log('Reached bottom natively (or virtual scroll hijacked it)');
                // We'll keep going a bit just in case it's a slow virtual scroll, but break if it's too much.
                break;
            }
        } else {
            unchangedCount = 0;
        }
        previousScrollY = scrollData.scrollY;

        // Break if we natively hit the bottom
        if (scrollData.scrollY + scrollData.innerHeight >= scrollData.scrollHeight - 10) {
            console.log('Reached native bottom');
            break;
        }
    }

    console.log('Scrolling back up to top...');
    await page.mouse.wheel(0, -99999);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    await page.screenshot({ path: '/tmp/test-dich.png', fullPage: true });
    console.log('Done screenshot');

    // Test extraction html sizes
    const content = await page.content();
    console.log('HTML size:', content.length);

    await browser.close();
})();
