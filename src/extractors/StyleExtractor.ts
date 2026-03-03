import type { Page } from 'playwright';
import type { DesignTokens } from '../types/KhojiContext.js';

/**
 * Extracts design tokens from the page's stylesheets:
 * - CSS custom properties (--color-*, --space-*, etc.)
 * - Font families in use
 * - Media query breakpoints
 */
export async function extractStyles(page: Page): Promise<DesignTokens> {
    return page.evaluate((): DesignTokens => {
        const colors: Record<string, string> = {};
        const spacing: Record<string, string> = {};
        const typography: Record<string, string> = {};
        const fontSet = new Set<string>();
        const breakpointSet = new Set<string>();

        const COLOR_KEYWORDS = ['color', 'bg', 'background', 'fill', 'stroke', 'text', 'border', 'shadow', 'accent', 'primary', 'secondary'];
        const SPACING_KEYWORDS = ['space', 'gap', 'margin', 'padding', 'indent', 'inset', 'offset', 'size', 'width', 'height'];
        const TYPO_KEYWORDS = ['font', 'text', 'line-height', 'letter', 'weight', 'size'];

        function categorise(name: string, value: string): void {
            const lower = name.toLowerCase();
            if (COLOR_KEYWORDS.some((k) => lower.includes(k))) {
                colors[name] = value;
            } else if (SPACING_KEYWORDS.some((k) => lower.includes(k))) {
                spacing[name] = value;
            } else if (TYPO_KEYWORDS.some((k) => lower.includes(k))) {
                typography[name] = value;
            }
        }

        // Walk all CSSStyleSheets
        for (const sheet of Array.from(document.styleSheets)) {
            let rules: CSSRuleList;
            try {
                rules = sheet.cssRules;
            } catch {
                // Cross-origin stylesheet — skip
                continue;
            }

            for (const rule of Array.from(rules)) {
                // CSS custom properties on :root or html
                if (rule instanceof CSSStyleRule) {
                    const sel = rule.selectorText ?? '';
                    if (sel === ':root' || sel === 'html') {
                        for (const prop of Array.from(rule.style)) {
                            if (prop.startsWith('--')) {
                                const val = rule.style.getPropertyValue(prop).trim();
                                categorise(prop, val);
                            }
                        }
                    }
                }

                // @media breakpoints
                if (rule instanceof CSSMediaRule) {
                    const condition = rule.conditionText ?? rule.media.mediaText;
                    const match = condition.match(/\d+px/);
                    if (match) breakpointSet.add(match[0]);
                }
            }
        }

        // Font families from computed styles
        const targets = ['body', 'h1', 'h2', 'p', 'button', 'a'];
        for (const selector of targets) {
            const el = document.querySelector(selector);
            if (!el) continue;
            const computed = window.getComputedStyle(el);
            const family = computed.fontFamily;
            if (family) {
                family.split(',').forEach((f) => {
                    const clean = f.trim().replace(/['"]/g, '');
                    if (clean && clean !== 'inherit' && clean !== 'initial') {
                        fontSet.add(clean);
                    }
                });
            }
        }

        return {
            colors,
            spacing,
            typography,
            fonts: Array.from(fontSet).slice(0, 12),
            breakpoints: Array.from(breakpointSet).sort((a, b) => parseInt(a) - parseInt(b)),
        };
    });
}
