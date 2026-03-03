#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import { confirm, checkbox } from '@inquirer/prompts';
import { logger } from '../utils/logger.js';
import { runExtraction } from '../pipeline/runner.js';
import type { ExtractionOptions } from '../types/KhojContext.js';
import type { CloneSkill } from '../prompting/PromptGenerator.js';

const program = new Command();

program
    .name('khoj')
    .description('Extract token-efficient website context for AI agents')
    .version('1.0.0')
    .argument('<url>', 'Target URL to extract context from')
    .option('-o, --output <dir>', 'Output directory', './output')
    .option('-f, --format <type>', 'Output format: json | markdown | both', 'both')
    .option('-t, --timeout <ms>', 'Page load timeout in milliseconds', '30000')
    .option('--send-to-gemini', 'Send output to Gemini API after extraction')
    .option('--prompt <text>', 'Custom instruction to send to Gemini along with context')
    .option('--fast', 'Fast mode: skip image loading (reduces extraction time)')
    .option('--clone', 'Clone mode: Extract full-page screenshot, raw HTML, and CSS')
    .option('--click <selector>', 'CSS selector of an element to click before extraction (useful for "Enter Site" preloaders)')
    .action(async (url: string, options: {
        output: string;
        format: 'json' | 'markdown' | 'both';
        timeout: string;
        sendToGemini?: boolean;
        prompt?: string;
        fast?: boolean;
        clone?: boolean;
        click?: string;
    }) => {
        logger.banner();

        // Validator — must be a valid URL
        try {
            new URL(url);
        } catch {
            logger.error(`Invalid URL provided: ${url}`);
            logger.error(`Please ensure the URL includes http:// or https:// (e.g., https://${url})`);
            process.exit(1);
        }

        logger.step('🚀', `Starting Khoj extraction for ${chalk.cyan(url)}`);

        let cloneSkills: CloneSkill[] | undefined = undefined;

        if (options.clone) {
            const wantsPrompt = await confirm({
                message: 'Do you want to generate a custom AI instruction prompt for this clone?',
                default: true
            });

            if (wantsPrompt) {
                const selections = await checkbox({
                    message: 'Select the guidelines the AI should follow when rebuilding this site (Press <space> to select):',
                    choices: [
                        { name: '★ All of the above', value: 'all' },
                        { name: 'Frontend Design (Avoid cliché AI traits)', value: 'frontend-design' },
                        { name: 'SEO Best Practices', value: 'seo-audit' },
                        { name: 'Web Design Guidelines (a11y, contrast)', value: 'web-design-guidelines' },
                        { name: 'Award-Winning Site (3D, GSAP, etc.)', value: 'award-winning-website' }
                    ]
                });

                if (selections.includes('all')) {
                    cloneSkills = ['frontend-design', 'seo-audit', 'web-design-guidelines', 'award-winning-website'];
                } else {
                    // Safe cast since the only non-CloneSkill option is 'all'
                    cloneSkills = selections as CloneSkill[];
                }
            }
        }

        const extractOpts: ExtractionOptions = {
            url,
            outputDir: options.output,
            format: options.format, // Type assertion handled by options type
            timeout: parseInt(options.timeout, 10),
            fast: options.fast ?? false, // Ensure fast is boolean
            clone: options.clone,
            cloneSkills: cloneSkills,
            sendToGemini: options.sendToGemini,
            prompt: options.prompt,
            clickSelector: options.click,
        };

        // Validate format option
        if (!['json', 'markdown', 'both'].includes(extractOpts.format)) {
            logger.error('--format must be one of: json, markdown, both');
            process.exit(1);
        }

        // Validate timeout option
        if (isNaN(extractOpts.timeout) || extractOpts.timeout < 1000) {
            logger.error('--timeout must be a number >= 1000 (ms)');
            process.exit(1);
        }

        logger.step('🔎', `Analysing: ${url}`);
        logger.divider();

        try {
            // Will be wired in Phase 4 after all extractors are built
            await runExtraction(extractOpts);
        } catch (err) {
            logger.error('Extraction failed', err);
            process.exit(1);
        }
    });

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(0);
}

program.parseAsync(process.argv);
