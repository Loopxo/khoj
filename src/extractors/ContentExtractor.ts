import type { Page } from 'playwright';
import type { ContentBlock } from '../types/KhojContext.js';

const MAX_PARAGRAPH_LENGTH = 300;

/**
 * Extracts structured content blocks:
 * - Headings h1–h6 with level
 * - Paragraphs (truncated to 300 chars)
 * - Button labels
 * - Anchor links with href
 * - Form labels
 * Deduplicates by text.
 */
export async function extractContent(page: Page): Promise<ContentBlock[]> {
    return page.evaluate(
        ({ maxParaLen }: { maxParaLen: number }): ContentBlock[] => {
            const blocks: ContentBlock[] = [];
            const seen = new Set<string>();

            function add(block: ContentBlock): void {
                const key = `${block.type}:${block.text}`;
                if (!seen.has(key) && block.text.length > 0) {
                    seen.add(key);
                    blocks.push(block);
                }
            }

            // Headings
            for (let level = 1; level <= 6; level++) {
                document.querySelectorAll(`h${level}`).forEach((el) => {
                    const text = el.textContent?.trim() ?? '';
                    if (text) add({ type: 'heading', text, level });
                });
            }

            // Paragraphs
            document.querySelectorAll('p').forEach((el) => {
                const text = (el.textContent?.trim() ?? '').slice(0, maxParaLen);
                if (text.split(' ').length >= 3) {
                    add({ type: 'paragraph', text });
                }
            });

            // Buttons
            document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]').forEach((el) => {
                const text = el.textContent?.trim() ?? (el as HTMLInputElement).value ?? '';
                if (text) add({ type: 'button', text });
            });

            // Links
            document.querySelectorAll('a[href]').forEach((el) => {
                const text = el.textContent?.trim() ?? '';
                const href = (el as HTMLAnchorElement).href;
                if (text && href && !href.startsWith('javascript:')) {
                    add({ type: 'link', text, href });
                }
            });

            // Labels
            document.querySelectorAll('label').forEach((el) => {
                const text = el.textContent?.trim() ?? '';
                if (text) add({ type: 'label', text });
            });

            return blocks;
        },
        { maxParaLen: MAX_PARAGRAPH_LENGTH },
    );
}
