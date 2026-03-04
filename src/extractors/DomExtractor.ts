import type { Page } from 'playwright';
import type { DomNode, ComputedLayout, ComputedTypography } from '../types/KhojiContext.js';

// Tags to skip entirely — they add noise, not signal
const NOISE_TAGS = new Set([
    'script', 'style', 'noscript', 'svg', 'path', 'defs',
    'symbol', 'use', 'clippath', 'head', 'meta', 'link',
    'br', 'hr', 'wbr', 'template', 'iframe',
]);

// Tags that commonly bear text content worth capturing typography for
const TEXT_BEARING_TAGS = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a',
    'button', 'label', 'li', 'td', 'th', 'blockquote', 'figcaption',
    'strong', 'em', 'b', 'i', 'small', 'mark',
]);

// Default CSS values we skip to keep output compact
const DISPLAY_DEFAULTS: Record<string, string> = {
    div: 'block', p: 'block', section: 'block', article: 'block',
    main: 'block', header: 'block', footer: 'block', aside: 'block',
    nav: 'block', ul: 'block', ol: 'block', li: 'list-item',
    h1: 'block', h2: 'block', h3: 'block', h4: 'block', h5: 'block', h6: 'block',
    span: 'inline', a: 'inline', strong: 'inline', em: 'inline',
    img: 'inline', button: 'inline-block', input: 'inline-block',
    form: 'block', fieldset: 'block', address: 'block',
};

const MAX_DEPTH = 10;
const MAX_TEXT_LENGTH = 200;

/**
 * Extracts a layout-aware semantic DOM tree from the page body.
 * For each node, captures:
 * - tag, id, classes, role, text
 * - ComputedLayout (flex/grid, positioning, transforms, z-index)
 * - ComputedTypography (font-size, letter-spacing, line-height, font-weight)
 * - Images embedded directly on their parent DOM node
 * - Background images from CSS
 *
 * Smart defaults filtering: skips position: static, display: block on divs, etc.
 */
export async function extractDom(page: Page): Promise<DomNode[]> {
    return page.evaluate(
        ({ noiseTags, textBearingTags, displayDefaults, maxDepth, maxTextLen }: {
            noiseTags: string[];
            textBearingTags: string[];
            displayDefaults: Record<string, string>;
            maxDepth: number;
            maxTextLen: number;
        }): DomNode[] => {
            const noiseSet = new Set(noiseTags);
            const textSet = new Set(textBearingTags);
            const defaultDisplayMap = displayDefaults;

            function getCssSelector(el: Element): string {
                if (el.id) return `#${el.id}`;
                const parts: string[] = [];
                let current: Element | null = el;
                while (current && current !== document.body && parts.length < 3) {
                    let sel = current.tagName.toLowerCase();
                    if (current.className && typeof current.className === 'string') {
                        const cls = current.className.trim().split(/\s+/)[0];
                        if (cls) sel += `.${cls}`;
                    }
                    parts.unshift(sel);
                    current = current.parentElement;
                }
                return parts.join(' > ');
            }

            function extractLayout(el: Element, tag: string): ComputedLayout | undefined {
                const cs = window.getComputedStyle(el);
                const layout: ComputedLayout = {};
                let hasData = false;

                // Display — skip if it matches the default for this tag
                const display = cs.display;
                if (display && display !== (defaultDisplayMap[tag] ?? 'block') && display !== 'inline') {
                    layout.display = display;
                    hasData = true;
                }

                // Position — skip static
                const pos = cs.position;
                if (pos && pos !== 'static') {
                    layout.position = pos;
                    hasData = true;

                    // Position offsets (only if non-auto and positioned)
                    for (const dir of ['top', 'right', 'bottom', 'left'] as const) {
                        const val = cs.getPropertyValue(dir);
                        if (val && val !== 'auto' && val !== '0px') {
                            layout[dir] = val;
                            hasData = true;
                        }
                    }
                }

                // z-index
                const zIndex = cs.zIndex;
                if (zIndex && zIndex !== 'auto' && zIndex !== '0') {
                    layout.zIndex = zIndex;
                    hasData = true;
                }

                // Transform
                const transform = cs.transform;
                if (transform && transform !== 'none') {
                    layout.transform = transform;
                    hasData = true;
                }

                // Flex properties (only if display is flex/inline-flex)
                if (display === 'flex' || display === 'inline-flex') {
                    const dir = cs.flexDirection;
                    if (dir && dir !== 'row') { layout.flexDirection = dir; hasData = true; }

                    const jc = cs.justifyContent;
                    if (jc && jc !== 'normal' && jc !== 'flex-start') { layout.justifyContent = jc; hasData = true; }

                    const ai = cs.alignItems;
                    if (ai && ai !== 'normal' && ai !== 'stretch') { layout.alignItems = ai; hasData = true; }
                }

                // Grid properties (only if display is grid/inline-grid)
                if (display === 'grid' || display === 'inline-grid') {
                    const gtc = cs.gridTemplateColumns;
                    if (gtc && gtc !== 'none') { layout.gridTemplateColumns = gtc; hasData = true; }

                    const gtr = cs.gridTemplateRows;
                    if (gtr && gtr !== 'none') { layout.gridTemplateRows = gtr; hasData = true; }
                }

                // Gap (works for both flex and grid)
                if (display === 'flex' || display === 'grid' || display === 'inline-flex' || display === 'inline-grid') {
                    const gap = cs.gap;
                    if (gap && gap !== 'normal' && gap !== '0px') { layout.gap = gap; hasData = true; }
                }

                // Width/Height — only non-auto explicitly set values
                const w = cs.width;
                const h = cs.height;
                if (w && !w.startsWith('auto')) {
                    const rect = el.getBoundingClientRect();
                    // Only capture if it's percentage-like or viewport-relative
                    if (w.includes('%') || w.includes('vw') || w.includes('vh')) {
                        layout.width = w; hasData = true;
                    }
                }

                const mh = cs.minHeight;
                if (mh && mh !== '0px' && mh !== 'auto') { layout.minHeight = mh; hasData = true; }

                // Overflow
                const overflow = cs.overflow;
                if (overflow && overflow !== 'visible') { layout.overflow = overflow; hasData = true; }

                // Object-fit (images/videos)
                if (tag === 'img' || tag === 'video') {
                    const of = cs.objectFit;
                    if (of && of !== 'fill') { layout.objectFit = of; hasData = true; }
                }

                return hasData ? layout : undefined;
            }

            function extractTypography(el: Element, tag: string, hasText: boolean): ComputedTypography | undefined {
                // Only capture typography on text-bearing elements or elements with direct text
                if (!textSet.has(tag) && !hasText) return undefined;

                const cs = window.getComputedStyle(el);
                const typo: ComputedTypography = {};
                let hasData = false;

                // Font size — always capture for text elements (crucial for vw/vh scaling)
                const fs = cs.fontSize;
                if (fs && fs !== '16px') { typo.fontSize = fs; hasData = true; }

                // Font weight — skip default 400/normal
                const fw = cs.fontWeight;
                if (fw && fw !== '400' && fw !== 'normal') { typo.fontWeight = fw; hasData = true; }

                // Line height — skip default normal
                const lh = cs.lineHeight;
                if (lh && lh !== 'normal') { typo.lineHeight = lh; hasData = true; }

                // Letter spacing — skip default normal
                const ls = cs.letterSpacing;
                if (ls && ls !== 'normal' && ls !== '0px') { typo.letterSpacing = ls; hasData = true; }

                // Text transform
                const tt = cs.textTransform;
                if (tt && tt !== 'none') { typo.textTransform = tt; hasData = true; }

                // Text align — skip default left/start
                const ta = cs.textAlign;
                if (ta && ta !== 'start' && ta !== 'left') { typo.textAlign = ta; hasData = true; }

                // Color — capture for text nodes
                const color = cs.color;
                if (color && hasText) { typo.color = color; hasData = true; }

                return hasData ? typo : undefined;
            }

            function walk(el: Element, depth: number): DomNode | null {
                if (depth > maxDepth) return null;

                const tag = el.tagName.toLowerCase();
                if (noiseSet.has(tag)) return null;

                const children: DomNode[] = [];
                for (const child of Array.from(el.children)) {
                    const node = walk(child, depth + 1);
                    if (node) children.push(node);
                }

                // Get direct text (not from children)
                let text: string | undefined;
                const directText = Array.from(el.childNodes)
                    .filter((n) => n.nodeType === Node.TEXT_NODE)
                    .map((n) => n.textContent?.trim() ?? '')
                    .join(' ')
                    .trim();

                if (directText.length > 0) {
                    text = directText.slice(0, maxTextLen);
                }

                const node: DomNode = {
                    tag,
                    classes: Array.from(el.classList),
                    children: children.length > 0 ? children : undefined,
                };

                const id = el.getAttribute('id');
                if (id) node.id = id;

                const role = el.getAttribute('role');
                if (role) node.role = role;

                if (text) node.text = text;

                // ── Layout data (the "Where") ──────────────────────────────
                const layout = extractLayout(el, tag);
                if (layout) node.layout = layout;

                // ── Typography data (the "How") ────────────────────────────
                const typo = extractTypography(el, tag, !!text);
                if (typo) node.typography = typo;

                // ── Background image ───────────────────────────────────────
                const cs = window.getComputedStyle(el);
                const bgImage = cs.backgroundImage;
                if (bgImage && bgImage !== 'none') {
                    const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
                    if (urlMatch?.[1]) {
                        node.backgroundImage = urlMatch[1];
                    }
                }

                // ── Image asset on node (the "What + Where" fusion) ────────
                if (tag === 'img') {
                    const src = el.getAttribute('src') || el.getAttribute('data-src');
                    if (src && !src.startsWith('data:')) {
                        try {
                            node.imageUrl = new URL(src, document.baseURI).href;
                        } catch {
                            node.imageUrl = src;
                        }
                        node.imageAlt = el.getAttribute('alt') ?? '';
                    }
                }

                // Prune leaf nodes with no info
                if (!text && !node.id && node.classes.length === 0 && !node.role
                    && !children.length && !node.layout && !node.typography
                    && !node.backgroundImage && !node.imageUrl) {
                    return null;
                }

                return node;
            }

            const body = document.body;
            if (!body) return [];

            return Array.from(body.children)
                .map((child) => walk(child, 1))
                .filter((n): n is DomNode => n !== null);
        },
        {
            noiseTags: Array.from(NOISE_TAGS),
            textBearingTags: Array.from(TEXT_BEARING_TAGS),
            displayDefaults: DISPLAY_DEFAULTS,
            maxDepth: MAX_DEPTH,
            maxTextLen: MAX_TEXT_LENGTH,
        },
    );
}
