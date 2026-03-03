import type { Page } from 'playwright';
import type { DetectedComponent } from '../types/KhojContext.js';

/**
 * Detects repeated DOM structural patterns that likely represent UI components.
 * Examples: card grids, list items, nav links, table rows.
 */
export async function detectComponents(page: Page): Promise<DetectedComponent[]> {
    return page.evaluate((): DetectedComponent[] => {
        const MIN_REPETITIONS = 3;
        const components: DetectedComponent[] = [];

        // Candidate selectors — common repeating component patterns
        const candidates = [
            { name: 'Card', pattern: '.card, [class*="card"]' },
            { name: 'ListItem', pattern: 'ul > li, ol > li' },
            { name: 'GridItem', pattern: '[class*="grid"] > *, [class*="col-"]' },
            { name: 'NavLink', pattern: 'nav a, header a' },
            { name: 'TableRow', pattern: 'tbody tr' },
            { name: 'Article', pattern: 'article, [class*="post"], [class*="article"]' },
            { name: 'Testimonial', pattern: '[class*="testimonial"], [class*="review"]' },
            { name: 'Feature', pattern: '[class*="feature"], [class*="benefit"]' },
            { name: 'Pricing', pattern: '[class*="pricing"], [class*="plan"], [class*="tier"]' },
            { name: 'MenuItem', pattern: '[role="menuitem"], [class*="menu-item"]' },
            { name: 'Tag', pattern: '[class*="tag"], [class*="badge"], [class*="chip"]' },
        ];

        for (const { name, pattern } of candidates) {
            let els: NodeListOf<Element>;
            try {
                els = document.querySelectorAll(pattern);
            } catch {
                continue;
            }

            if (els.length < MIN_REPETITIONS) continue;

            components.push({
                name,
                pattern,
                count: els.length,
                sampleHTML: (els[0] as HTMLElement).outerHTML.slice(0, 400),
            });
        }

        return components;
    });
}
