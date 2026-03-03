import type { Page } from 'playwright';
import type { PageMeta } from '../types/KhojiContext.js';

/**
 * Extracts page metadata: title, description, Open Graph tags, canonical URL,
 * theme-color, and embedded JSON-LD structured data.
 */
export async function extractMeta(page: Page): Promise<PageMeta> {
    return page.evaluate((): PageMeta => {
        function getMeta(name: string): string {
            const el =
                document.querySelector(`meta[name="${name}"]`) ??
                document.querySelector(`meta[property="${name}"]`);
            return (el as HTMLMetaElement | null)?.content ?? '';
        }

        // Collect JSON-LD scripts
        const jsonLd: unknown[] = [];
        document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
            try {
                jsonLd.push(JSON.parse(el.textContent ?? ''));
            } catch {
                // Malformed JSON-LD — skip silently
            }
        });

        const canonical =
            (document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href ?? null;

        return {
            title: document.title?.trim() ?? '',
            description: getMeta('description') || getMeta('og:description') || '',
            ogImage: getMeta('og:image') || null,
            canonical: canonical || null,
            themeColor: getMeta('theme-color') || null,
            jsonLd,
        };
    });
}
