import type { Page } from 'playwright';
import type { DomNode } from '../types/KhojiContext.js';

// Tags to skip entirely — they add noise, not signal
const NOISE_TAGS = new Set([
    'script', 'style', 'noscript', 'svg', 'path', 'defs',
    'symbol', 'use', 'clippath', 'head', 'meta', 'link',
    'br', 'hr', 'wbr', 'template', 'iframe',
]);

const MAX_DEPTH = 10;
const MAX_TEXT_LENGTH = 200;

/**
 * Extracts a semantic DOM tree from the page body.
 * - Skips noise tags (script, style, svg, etc.)
 * - Caps depth at 10 levels
 * - Trims text content to 200 characters
 * - Captures: tag, id, classes, role, text
 */
export async function extractDom(page: Page): Promise<DomNode[]> {
    return page.evaluate(
        ({ noiseTags, maxDepth, maxTextLen }: { noiseTags: string[]; maxDepth: number; maxTextLen: number }): DomNode[] => {
            const noiseSet = new Set(noiseTags);

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

                // Prune leaf nodes with no info
                if (!text && !node.id && node.classes.length === 0 && !node.role && !children.length) {
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
        { noiseTags: Array.from(NOISE_TAGS), maxDepth: MAX_DEPTH, maxTextLen: MAX_TEXT_LENGTH },
    );
}
