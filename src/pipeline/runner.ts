import path from 'node:path';
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
import type { ExtractionOptions, KhojContext } from '../types/KhojContext.js';

export async function runExtraction(opts: ExtractionOptions): Promise<void> {
    const browserManager = new BrowserManager();
    const mode = opts.fast ? 'fast' : 'full';

    try {
        const context = await browserManager.launch(mode);
        const loader = new PageLoader(context, opts.timeout);

        logger.step('🚀', `Loading page (${mode} mode)...`);
        const { page, finalUrl, loadTime } = await loader.load(opts.url);

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

        const ctx: KhojContext = {
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
        const outputDir = path.resolve(opts.outputDir);

        if (opts.format === 'json' || opts.format === 'both') {
            const json = serializeJson(ctx);
            await writeOutput(path.join(outputDir, `khoj-context-${timestamp}.json`), json);
        }

        if (opts.format === 'markdown' || opts.format === 'both') {
            const md = serializeMarkdown(ctx);
            await writeOutput(path.join(outputDir, `khoj-context-${timestamp}.md`), md);
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
