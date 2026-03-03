import fs from 'node:fs/promises';
import path from 'node:path';
import { PromptGenerator } from '../prompting/PromptGenerator.js';
import { BrowserManager } from '../browser/BrowserManager.js';
import { PageLoader } from '../browser/PageLoader.js';
import { extractMeta } from '../extractors/MetaExtractor.js';
import { extractDom } from '../extractors/DomExtractor.js';
import { extractStyles } from '../extractors/StyleExtractor.js';
import { extractAssets } from '../extractors/AssetExtractor.js';
import { extractContent } from '../extractors/ContentExtractor.js';
import { extractInteractions } from '../extractors/InteractionExtractor.js';
import { extractAnimations } from '../extractors/AnimationExtractor.js';
import { detectComponents } from './ComponentDetector.js';
import { cleanContent, cleanImages, cleanStringList, pruneEmptyDomNodes } from './Cleaner.js';
import { serializeJson } from '../serializer/JsonSerializer.js';
import { serializeMarkdown } from '../serializer/MarkdownSerializer.js';
import { writeOutput } from '../output/Writer.js';
import { estimateTokens } from '../utils/tokenEstimator.js';
import { logger } from '../utils/logger.js';
import type { ExtractionOptions, KhojiContext } from '../types/KhojiContext.js';

export async function runExtraction(opts: ExtractionOptions): Promise<void> {
    const browserManager = new BrowserManager();
    const mode = opts.fast ? 'fast' : 'full';

    try {
        const context = await browserManager.launch(mode);
        const loader = new PageLoader(context, opts.timeout);

        logger.step('🚀', `Loading page (${mode} mode)...`);
        const { page, finalUrl, loadTime } = await loader.load(opts.url, opts.clickSelector);

        logger.step('⚙️', 'Running extraction pipeline (parallel)...');
        logger.divider();

        // Run all extractors in parallel for performance
        const [meta, structure, designTokens, assets, content, interactions, components] =
            await Promise.all([
                extractMeta(page).catch(() => ({ title: '', description: '', ogImage: null, canonical: null, themeColor: null, jsonLd: [] })),
                extractDom(page).catch(() => []),
                extractStyles(page).catch(() => ({ colors: {}, spacing: {}, typography: {}, fonts: [], breakpoints: [] })),
                extractAssets(page, finalUrl).catch(() => ({ images: [], gifs: [], fonts: [], icons: [], scripts: [] })),
                extractContent(page).catch(() => []),
                extractInteractions(page).catch(() => []),
                detectComponents(page).catch(() => []),
            ]);

        logger.step('🎬', 'Analysing animations...');
        const animations = await extractAnimations(page, assets.gifs).catch(() => ({
            cssAnimations: [],
            cssTransitions: [],
            jsAnimations: [],
            scrollAnimations: [],
            gifAnimations: [],
            summary: 'Animation extraction failed',
        }));

        // Post-processing
        const cleanedContent = cleanContent(content);
        const cleanedImages = cleanImages(assets.images);
        const cleanedGifs = cleanImages(assets.gifs);
        const cleanedStructure = pruneEmptyDomNodes(structure);

        const ctx: KhojiContext = {
            schemaVersion: '1.0',
            url: opts.url,
            finalUrl,
            extractedAt: new Date().toISOString(),
            loadTimeMs: loadTime,
            tokenEstimate: 0, // calculated below
            meta,
            structure: cleanedStructure,
            designTokens,
            components,
            assets: {
                images: cleanedImages,
                gifs: cleanedGifs,
                fonts: cleanStringList(assets.fonts),
                icons: cleanStringList(assets.icons),
                scripts: cleanStringList(assets.scripts),
            },
            content: cleanedContent,
            interactions,
            animations,
        };

        // Calculate token estimate on the final object
        const jsonString = JSON.stringify(ctx, null, 2);
        ctx.tokenEstimate = estimateTokens(jsonString);

        // Serialize
        logger.step('📦', 'Serializing output...');
        logger.divider();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        // Create a domain-specific subdirectory
        const hostname = new URL(opts.url).hostname.replace(/^www\./, '');
        const outputDir = path.resolve(opts.outputDir, hostname);
        await fs.mkdir(outputDir, { recursive: true });

        if (opts.format === 'json' || opts.format === 'both') {
            const json = serializeJson(ctx);
            await writeOutput(path.join(outputDir, `khoji-context-${timestamp}.json`), json);
        }

        if (opts.format === 'markdown' || opts.format === 'both') {
            const md = serializeMarkdown(ctx);
            await writeOutput(path.join(outputDir, `khoji-context-${timestamp}.md`), md);
        }

        // Clone Mode Extraction
        if (opts.clone) {
            logger.step('📸', 'Extracting clone assets (Screenshot, HTML, CSS)...');
            logger.divider();

            // 1. Full Page Screenshot
            const screenshotPath = path.join(outputDir, `khoji-clone-${timestamp}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });

            // 2. Raw HTML
            const rawHtml = await page.content();
            const htmlPath = path.join(outputDir, `khoji-clone-${timestamp}.html`);
            await writeOutput(htmlPath, rawHtml);

            // 3. Raw CSS (Inline + External)
            const cssPath = path.join(outputDir, `khoji-clone-${timestamp}.css`);

            // First get all inline styles and external URLs from the browser context
            const { inlineStyles, externalUrls } = await page.evaluate(() => {
                const styles = Array.from(document.querySelectorAll('style')).map(s => s.textContent || '');
                const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                    .map(l => l.getAttribute('href'))
                    .filter((href): href is string => href !== null)
                    .map(href => new URL(href, document.baseURI).href);

                return { inlineStyles: styles, externalUrls: links };
            });

            let rawCss = '';

            // Render inline styles
            for (const style of inlineStyles) {
                if (style.trim()) {
                    rawCss += `/* Inline Style */\n${style}\n\n`;
                }
            }

            // Fetch external styles from Node context to bypass browser CORS policies
            for (const url of externalUrls) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const cssText = await response.text();
                        rawCss += `/* External Style: ${url} */\n${cssText}\n\n`;
                    } else {
                        rawCss += `/* Failed to fetch external style (HTTP ${response.status}): ${url} */\n\n`;
                    }
                } catch (e) {
                    rawCss += `/* Failed to fetch external style (Network Error): ${url} */\n\n`;
                }
            }

            await writeOutput(cssPath, rawCss);

            // 4. Generate AI Prompt (if requested)
            if (opts.cloneSkills !== undefined) {
                // We assert the type here because PromptGenerator expects CloneSkill[] 
                // and the CLI ensures only valid values are passed.
                const promptContent = PromptGenerator.generate(opts.cloneSkills as any);
                const promptPath = path.join(outputDir, `prompt.md`);
                await writeOutput(promptPath, promptContent);
            }
        }

        // Final report
        logger.divider();
        logger.step('📊', 'Extraction complete');
        logger.stat('URL', ctx.url);
        logger.stat('Images', `${cleanedImages.length} images, ${cleanedGifs.length} GIFs`);
        logger.stat('Animations', `${ctx.animations.cssAnimations.length} CSS, ${ctx.animations.jsAnimations.length} JS`);
        logger.stat('Token estimate', `~${ctx.tokenEstimate.toLocaleString()} tokens`);
        logger.stat('Load time', `${(loadTime / 1000).toFixed(2)}s`);
        logger.divider();

        if (opts.clone) {
            logger.step('📸', 'Clone artifacts saved:');
            logger.stat('Screenshot', `khoji-clone-${timestamp}.png`);
            logger.stat('HTML Source', `khoji-clone-${timestamp}.html`);
            logger.stat('CSS Source', `khoji-clone-${timestamp}.css`);
            if (opts.cloneSkills !== undefined) {
                logger.stat('System Prompt', `prompt.md`);
            }
            logger.divider();
        }

        if (ctx.animations.summary) {
            logger.step('🎬', `Animations: ${ctx.animations.summary}`);
        }

        // Optional Gemini integration
        if (opts.sendToGemini) {
            const { sendToGemini } = await import('../ai/GeminiAdapter.js');
            await sendToGemini(ctx, opts.prompt);
        }

    } finally {
        await browserManager.close();
    }
}
