import type { Page } from 'playwright';
import type { AssetMap, ImageAsset } from '../types/KhojiContext.js';

/**
 * Collects all assets from the page:
 * - Images and GIFs with metadata (alt, dimensions, lazy-load flag, CSS selector)
 * - External scripts
 * - Favicon and icon links
 * - Font URLs from @font-face rules
 */
export async function extractAssets(page: Page, baseUrl: string): Promise<AssetMap> {
    const result = await page.evaluate(
        ({ base }: { base: string }): Omit<AssetMap, 'gifs'> & { rawImages: ImageAsset[] } => {
            function toAbsolute(url: string): string {
                if (!url || url.startsWith('data:')) return url;
                try {
                    return new URL(url, base).href;
                } catch {
                    return url;
                }
            }

            function getCssSelector(el: Element): string {
                if (el.id) return `#${el.id}`;
                const parts: string[] = [];
                let current: Element | null = el;
                while (current && current !== document.body && parts.length < 4) {
                    let selector = current.tagName.toLowerCase();
                    if (current.className) {
                        const firstClass = current.className.toString().trim().split(/\s+/)[0];
                        if (firstClass) selector += `.${firstClass}`;
                    }
                    parts.unshift(selector);
                    current = current.parentElement;
                }
                return parts.join(' > ');
            }

            function isGif(url: string): boolean {
                return url.toLowerCase().includes('.gif') || url.toLowerCase().endsWith('.gif');
            }

            // ── Images ────────────────────────────────────────────────────────────
            const rawImages: ImageAsset[] = [];
            document.querySelectorAll('img').forEach((img) => {
                const src = img.getAttribute('src') ?? img.getAttribute('data-src') ?? '';
                if (!src || src.startsWith('data:')) return;

                const absoluteSrc = toAbsolute(src);
                rawImages.push({
                    url: absoluteSrc,
                    alt: img.getAttribute('alt') ?? '',
                    type: isGif(absoluteSrc) ? 'gif' : 'image',
                    width: img.naturalWidth || parseInt(img.getAttribute('width') ?? '0') || null,
                    height: img.naturalHeight || parseInt(img.getAttribute('height') ?? '0') || null,
                    isLazy: img.getAttribute('loading') === 'lazy' || !!img.getAttribute('data-src'),
                    selector: getCssSelector(img),
                });
            });

            // ── Scripts ───────────────────────────────────────────────────────────
            const scripts: string[] = [];
            document.querySelectorAll('script[src]').forEach((s) => {
                const src = (s as HTMLScriptElement).src;
                if (src && !src.startsWith(window.location.origin)) {
                    scripts.push(toAbsolute(src));
                }
            });

            // ── Icons / Favicons ──────────────────────────────────────────────────
            const icons: string[] = [];
            document.querySelectorAll('link[rel~="icon"], link[rel~="apple-touch-icon"], link[rel~="shortcut"]').forEach((l) => {
                const href = (l as HTMLLinkElement).href;
                if (href) icons.push(toAbsolute(href));
            });

            // ── Fonts ─────────────────────────────────────────────────────────────
            const fonts: string[] = [];
            for (const sheet of Array.from(document.styleSheets)) {
                try {
                    for (const rule of Array.from(sheet.cssRules)) {
                        if (rule instanceof CSSFontFaceRule) {
                            const src = rule.style.getPropertyValue('src');
                            const matches = src.match(/url\(['"]?([^'")\s]+)['"]?\)/g) ?? [];
                            matches.forEach((m) => {
                                const urlMatch = m.match(/url\(['"]?([^'")\s]+)['"]?\)/);
                                if (urlMatch?.[1]) fonts.push(toAbsolute(urlMatch[1]));
                            });
                        }
                    }
                } catch {
                    continue;
                }
            }

            return { rawImages, images: [], scripts: [...new Set(scripts)], icons: [...new Set(icons)], fonts: [...new Set(fonts)] };
        },
        { base: baseUrl },
    );

    // Retrieve GIFs intercepted from network responses
    const networkGifs = await page.evaluate((): string[] => {
        return (window as Window & { __khoj_gifs__?: string[] }).__khoj_gifs__ ?? [];
    });

    const allImages = result.rawImages;

    // Merge network-discovered GIFs that weren't in <img> tags
    const knownUrls = new Set(allImages.map((i) => i.url));
    for (const gifUrl of networkGifs) {
        if (!knownUrls.has(gifUrl)) {
            allImages.push({
                url: gifUrl,
                alt: '',
                type: 'gif',
                width: null,
                height: null,
                isLazy: false,
                selector: '',
            });
        }
    }

    const images = allImages.filter((i) => i.type === 'image');
    const gifs = allImages.filter((i) => i.type === 'gif');

    return {
        images,
        gifs,
        fonts: result.fonts,
        icons: result.icons,
        scripts: result.scripts,
    };
}
