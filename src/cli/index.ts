import 'dotenv/config';
import { Command } from 'commander';
import { logger } from '../utils/logger.js';

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
    .action(async (url: string, options: {
        output: string;
        format: 'json' | 'markdown' | 'both';
        timeout: string;
        sendToGemini?: boolean;
        prompt?: string;
        fast?: boolean;
    }) => {
        logger.banner();

        // Validator — must be a valid URL
        try {
            new URL(url);
        } catch {
            logger.error('Invalid URL provided. Example: khoj https://stripe.com');
            process.exit(1);
        }

        const format = options.format;
        if (!['json', 'markdown', 'both'].includes(format)) {
            logger.error('--format must be one of: json, markdown, both');
            process.exit(1);
        }

        const timeout = parseInt(options.timeout, 10);
        if (isNaN(timeout) || timeout < 1000) {
            logger.error('--timeout must be a number >= 1000 (ms)');
            process.exit(1);
        }

        logger.step('🔎', `Analysing: ${url}`);
        logger.divider();

        try {
            // Will be wired in Phase 4 after all extractors are built
            const { runExtraction } = await import('../pipeline/runner.js');
            await runExtraction({ url, outputDir: options.output, format, timeout, fast: options.fast ?? false, sendToGemini: options.sendToGemini, prompt: options.prompt });
        } catch (err) {
            logger.error('Extraction failed unexpectedly', err);
            process.exit(1);
        }
    });

program.parseAsync(process.argv);
