import type { Page } from 'playwright';
import type {
    AnimationMap,
    CSSAnimation,
    CSSTransition,
    JSAnimation,
    ScrollAnimation,
    GifAnimation,
    GifAnimationPurpose,
    ImageAsset,
} from '../types/KhojiContext.js';

type GifPurpose = 'loading-spinner' | 'product-demo' | 'decorative' | 'tutorial' | 'unknown';

/**
 * AnimationExtractor — 3-pass animation intelligence:
 *
 * Pass 1: CSS @keyframes + transitions (from document.styleSheets)
 * Pass 2: JS animation library detection (GSAP, Framer Motion, AOS, Lottie, etc.)
 * Pass 3: GIF purpose inference from context
 */
export async function extractAnimations(
    page: Page,
    gifs: ImageAsset[],
): Promise<AnimationMap> {
    const [cssResult, jsResult] = await Promise.all([
        extractCSSAnimations(page),
        extractJSAnimations(page),
    ]);

    const gifAnimations = inferGifPurpose(gifs);

    const summary = buildSummary(
        cssResult.animations,
        cssResult.transitions,
        jsResult.jsAnimations,
        jsResult.scrollAnimations,
        gifAnimations,
    );

    return {
        cssAnimations: cssResult.animations,
        cssTransitions: cssResult.transitions,
        jsAnimations: jsResult.jsAnimations,
        scrollAnimations: jsResult.scrollAnimations,
        gifAnimations,
        summary,
    };
}

// ─── Pass 1: CSS ──────────────────────────────────────────────────────────────

async function extractCSSAnimations(
    page: Page,
): Promise<{ animations: CSSAnimation[]; transitions: CSSTransition[] }> {
    return page.evaluate((): { animations: CSSAnimation[]; transitions: CSSTransition[] } => {
        const keyframeMap = new Map<string, string>();   // name → description of steps
        const animationRules: CSSAnimation[] = [];
        const transitionRules: CSSTransition[] = [];

        // Collect all @keyframes first
        for (const sheet of Array.from(document.styleSheets)) {
            let rules: CSSRuleList;
            try { rules = sheet.cssRules; } catch { continue; }

            for (const rule of Array.from(rules)) {
                if (rule instanceof CSSKeyframesRule) {
                    const steps = Array.from(rule.cssRules)
                        .map((r) => `${(r as CSSKeyframeRule).keyText}: ${(r as CSSKeyframeRule).style.cssText.slice(0, 80)}`)
                        .join('; ');
                    keyframeMap.set(rule.name, steps);
                }
            }
        }

        // Now map animation-name on elements back to keyframes
        const processedSelectors = new Set<string>();

        for (const sheet of Array.from(document.styleSheets)) {
            let rules: CSSRuleList;
            try { rules = sheet.cssRules; } catch { continue; }

            for (const rule of Array.from(rules)) {
                if (!(rule instanceof CSSStyleRule)) continue;
                const style = rule.style;

                // CSS animations
                const animName = style.getPropertyValue('animation-name') ||
                    style.getPropertyValue('animation')?.split(' ')[0] || '';

                if (animName && animName !== 'none' && !processedSelectors.has(`anim:${rule.selectorText}`)) {
                    processedSelectors.add(`anim:${rule.selectorText}`);
                    const keyframeDesc = keyframeMap.get(animName) ?? '';
                    const trigger = rule.selectorText.includes(':hover') ? 'hover'
                        : rule.selectorText.includes(':focus') ? 'focus'
                            : 'page-load';

                    animationRules.push({
                        name: animName,
                        selector: rule.selectorText.slice(0, 120),
                        duration: style.getPropertyValue('animation-duration') || '1s',
                        timingFunction: style.getPropertyValue('animation-timing-function') || 'ease',
                        iterationCount: style.getPropertyValue('animation-iteration-count') || '1',
                        delay: style.getPropertyValue('animation-delay') || '0s',
                        trigger,
                        description: keyframeDesc
                            ? `"${animName}" — ${keyframeDesc.slice(0, 150)}`
                            : `Animation "${animName}" applied`,
                    });
                }

                // CSS transitions
                const transitionProp = style.getPropertyValue('transition');
                if (transitionProp && transitionProp !== 'none' && !processedSelectors.has(`trans:${rule.selectorText}`)) {
                    processedSelectors.add(`trans:${rule.selectorText}`);
                    const trigger = rule.selectorText.includes(':hover') ? 'hover'
                        : rule.selectorText.includes(':focus') ? 'focus'
                            : rule.selectorText.includes(':active') ? 'active'
                                : 'unknown';

                    const props = transitionProp.split(',').map((t) => t.trim().split(' ')[0]);

                    transitionRules.push({
                        selector: rule.selectorText.slice(0, 120),
                        properties: props,
                        duration: transitionProp.match(/[\d.]+s/)?.[0] ?? '0.3s',
                        timingFunction: transitionProp.match(/ease[a-z-]*|linear|cubic-bezier\([^)]+\)/)?.[0] ?? 'ease',
                        trigger: trigger as CSSTransition['trigger'],
                        description: `Transition on ${props.join(', ')} — ${trigger}`,
                    });
                }
            }
        }

        return {
            animations: animationRules.slice(0, 50),
            transitions: transitionRules.slice(0, 50),
        };
    });
}

// ─── Pass 2: JS Libraries ─────────────────────────────────────────────────────

async function extractJSAnimations(
    page: Page,
): Promise<{ jsAnimations: JSAnimation[]; scrollAnimations: ScrollAnimation[] }> {
    return page.evaluate((): { jsAnimations: JSAnimation[]; scrollAnimations: ScrollAnimation[] } => {
        const win = window as unknown as Record<string, unknown>;
        const jsAnimations: JSAnimation[] = [];
        const scrollAnimations: ScrollAnimation[] = [];

        // GSAP
        if (win['gsap']) {
            jsAnimations.push({
                library: 'gsap',
                selector: 'document',
                description: 'GSAP detected — timeline-based animation library in use',
                trigger: 'page-load',
            });
        }

        // Framer Motion
        if (win['Motion'] || win['__framer_motion__'] || document.querySelector('[data-framer-motion]')) {
            jsAnimations.push({
                library: 'framer-motion',
                selector: '[data-framer-motion]',
                description: 'Framer Motion detected — declarative React animation library',
                trigger: 'page-load',
            });
        }

        // Anime.js
        if (win['anime']) {
            jsAnimations.push({
                library: 'animejs',
                selector: 'document',
                description: 'Anime.js detected — lightweight JavaScript animation library',
                trigger: 'page-load',
            });
        }

        // Lottie
        if (win['lottie'] || win['Lottie'] || document.querySelector('lottie-player, [data-lottie]')) {
            jsAnimations.push({
                library: 'lottie',
                selector: 'lottie-player, [data-lottie]',
                description: 'Lottie detected — JSON-based vector animations in use',
                trigger: 'page-load',
            });
        }

        // Web Animations API
        if (typeof Element.prototype.animate === 'function') {
            // Only flag if scripts are actually using it (heuristic: check for animate() on visible elements)
            const hasWaapi = document.querySelectorAll('[data-animate], .animate').length > 0;
            if (hasWaapi) {
                jsAnimations.push({
                    library: 'web-animations-api',
                    selector: '[data-animate], .animate',
                    description: 'Web Animations API in use',
                    trigger: 'page-load',
                });
            }
        }

        // AOS (scroll animations)
        if (win['AOS'] || document.querySelector('[data-aos]')) {
            const aosEls = Array.from(document.querySelectorAll('[data-aos]')).slice(0, 20);
            aosEls.forEach((el) => {
                scrollAnimations.push({
                    selector: el.tagName.toLowerCase() + (el.className ? `.${el.className.toString().split(' ')[0]}` : ''),
                    library: 'aos',
                    animationType: el.getAttribute('data-aos') ?? 'fade',
                    description: `AOS scroll animation: ${el.getAttribute('data-aos') ?? 'fade'} — triggers when element enters viewport`,
                });
            });
        }

        // GSAP ScrollTrigger heuristic
        if (win['ScrollTrigger'] || (win['gsap'] && document.querySelector('[data-scroll]'))) {
            document.querySelectorAll('[data-scroll], [data-scroll-trigger]').forEach((el) => {
                scrollAnimations.push({
                    selector: el.tagName.toLowerCase(),
                    library: 'gsap-scrolltrigger',
                    animationType: el.getAttribute('data-scroll') ?? 'scroll-driven',
                    description: 'GSAP ScrollTrigger — animation tied to scroll position',
                });
            });
        }

        return { jsAnimations, scrollAnimations };
    });
}

// ─── Pass 3: GIF Purpose Inference ───────────────────────────────────────────

function inferGifPurpose(gifs: ImageAsset[]): GifAnimation[] {
    return gifs.map((gif) => {
        const combined = `${gif.alt} ${gif.selector} ${gif.url}`.toLowerCase();

        let purpose: GifPurpose = 'unknown';

        if (/load|spin|wait|progress|preload|buffer/.test(combined)) {
            purpose = 'loading-spinner';
        } else if (/demo|preview|product|feature|how|tutorial|guide|walkthrough|example/.test(combined)) {
            purpose = gif.alt.toLowerCase().includes('tutorial') || gif.selector.includes('tutorial')
                ? 'tutorial'
                : 'product-demo';
        } else if (/bg|background|decoration|hero|banner|pattern|abstract/.test(combined)) {
            purpose = 'decorative';
        } else if (gif.alt.length === 0 && gif.selector.includes('bg')) {
            purpose = 'decorative';
        }

        return {
            url: gif.url,
            selector: gif.selector,
            alt: gif.alt,
            purpose,
        };
    });
}

// ─── Summary Builder ──────────────────────────────────────────────────────────

function buildSummary(
    cssAnimations: CSSAnimation[],
    cssTransitions: CSSTransition[],
    jsAnimations: JSAnimation[],
    scrollAnimations: ScrollAnimation[],
    gifAnimations: GifAnimation[],
): string {
    const parts: string[] = [];

    if (cssAnimations.length > 0) {
        const names = [...new Set(cssAnimations.map((a) => a.name))].slice(0, 3).join(', ');
        parts.push(`CSS animations: ${names} (${cssAnimations.length} total)`);
    }

    if (cssTransitions.length > 0) {
        const hoverCount = cssTransitions.filter((t) => t.trigger === 'hover').length;
        parts.push(`${cssTransitions.length} CSS transitions${hoverCount > 0 ? ` (${hoverCount} on hover)` : ''}`);
    }

    if (jsAnimations.length > 0) {
        const libs = [...new Set(jsAnimations.map((j) => j.library))].join(', ');
        parts.push(`JS: ${libs}`);
    }

    if (scrollAnimations.length > 0) {
        const lib = scrollAnimations[0]?.library ?? 'scroll';
        parts.push(`${scrollAnimations.length} scroll animations (${lib})`);
    }

    if (gifAnimations.length > 0) {
        const spinners = gifAnimations.filter((g) => g.purpose === 'loading-spinner').length;
        const demos = gifAnimations.filter((g) => g.purpose === 'product-demo').length;
        const detail = [spinners > 0 && `${spinners} spinner`, demos > 0 && `${demos} demo`]
            .filter(Boolean)
            .join(', ');
        parts.push(`${gifAnimations.length} GIF${gifAnimations.length > 1 ? 's' : ''}${detail ? ` (${detail})` : ''}`);
    }

    return parts.length > 0 ? parts.join('. ') + '.' : 'No animations detected.';
}

// Re-export types used by KhojiContext to satisfy TypeScript — avoids unused import warnings
export type { GifAnimationPurpose };
