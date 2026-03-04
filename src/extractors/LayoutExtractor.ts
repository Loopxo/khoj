import type { Page } from 'playwright';
import type { SectionLayout, SectionChild } from '../types/KhojiContext.js';

/**
 * LayoutExtractor — analyses top-level page sections and produces
 * a concise layout blueprint describing the spatial arrangement.
 *
 * This is the "recipe" that tells an AI agent:
 * "50/50 flex split, left = pink background with text, right = cover image"
 *
 * Only analyses direct children of <main>, <body>, or semantic section elements.
 */
export async function extractLayouts(page: Page): Promise<SectionLayout[]> {
    return page.evaluate((): SectionLayout[] => {
        const layouts: SectionLayout[] = [];

        function getCssSelector(el: Element): string {
            if (el.id) return `#${el.id}`;
            let sel = el.tagName.toLowerCase();
            if (el.className && typeof el.className === 'string') {
                const cls = el.className.trim().split(/\s+/)[0];
                if (cls) sel += `.${cls}`;
            }
            return sel;
        }

        function hasTextContent(el: Element): boolean {
            const text = el.textContent?.trim() ?? '';
            return text.length > 0;
        }

        function hasImageChild(el: Element): boolean {
            return el.querySelector('img') !== null ||
                window.getComputedStyle(el).backgroundImage !== 'none';
        }

        function analyseSection(section: Element): SectionLayout | null {
            const cs = window.getComputedStyle(section);
            const display = cs.display;

            // Only analyse flex/grid sections — block layouts aren't spatial recipes
            if (!display.includes('flex') && !display.includes('grid')) {
                return null;
            }

            const tag = section.tagName.toLowerCase();
            const selector = getCssSelector(section);
            const directChildren = Array.from(section.children);

            if (directChildren.length === 0) return null;

            // Calculate parent width for child percentage computation
            const parentRect = section.getBoundingClientRect();
            if (parentRect.width === 0) return null;

            const children: SectionChild[] = directChildren.map((child) => {
                const childCs = window.getComputedStyle(child);
                const childRect = child.getBoundingClientRect();
                const widthPercent = Math.round((childRect.width / parentRect.width) * 100);

                const childLayout: SectionChild = {
                    tag: child.tagName.toLowerCase(),
                    selector: getCssSelector(child),
                    widthPercent,
                    hasImage: hasImageChild(child),
                    hasText: hasTextContent(child),
                };

                const of = childCs.objectFit;
                if (of && of !== 'fill') childLayout.objectFit = of;

                const bg = childCs.backgroundColor;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                    childLayout.backgroundColor = bg;
                }

                return childLayout;
            });

            const layout: SectionLayout = {
                selector,
                tag,
                display,
                childCount: directChildren.length,
                children,
            };

            // Grid template columns
            if (display.includes('grid')) {
                const gtc = cs.gridTemplateColumns;
                if (gtc && gtc !== 'none') layout.columns = gtc;
            }

            // For flex, describe child width ratios as a string
            if (display.includes('flex')) {
                const ratios = children.map(c => `${c.widthPercent}%`).join(' / ');
                layout.columns = ratios;
            }

            // Min-height
            const mh = cs.minHeight;
            if (mh && mh !== '0px' && mh !== 'auto') layout.minHeight = mh;

            // Background color
            const bg = cs.backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                layout.backgroundColor = bg;
            }

            return layout;
        }

        // Find top-level layout containers
        const mainEl = document.querySelector('main') || document.body;
        const topSections: Element[] = [];

        // First pass: direct children of main/body that are semantic sections
        for (const child of Array.from(mainEl.children)) {
            const tag = child.tagName.toLowerCase();
            if (['section', 'div', 'article', 'aside', 'header', 'footer', 'nav'].includes(tag)) {
                topSections.push(child);
            }
        }

        // If main has few children, look one level deeper
        if (topSections.length < 2) {
            for (const child of Array.from(mainEl.children)) {
                for (const grandchild of Array.from(child.children)) {
                    const tag = grandchild.tagName.toLowerCase();
                    if (['section', 'div', 'article'].includes(tag)) {
                        topSections.push(grandchild);
                    }
                }
            }
        }

        // Analyse each section
        for (const section of topSections) {
            const result = analyseSection(section);
            if (result) layouts.push(result);

            // Also check direct children of sections (nested flex/grid)
            for (const child of Array.from(section.children)) {
                const nested = analyseSection(child);
                if (nested) layouts.push(nested);
            }
        }

        return layouts.slice(0, 30); // Cap at 30 sections
    });
}
