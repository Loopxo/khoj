import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import type { KhojiContext } from '../types/KhojiContext.js';

const DEFAULT_MODEL = 'gemini-1.5-flash';

/**
 * Sends the extracted KhojiContext to Google Gemini with an optional user prompt.
 * Streams the model response to stdout.
 */
export async function sendToGemini(ctx: KhojiContext, prompt?: string): Promise<void> {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
        logger.error('GEMINI_API_KEY is not set. Add it to your .env file.');
        return;
    }

    const model = process.env['GEMINI_MODEL'] ?? DEFAULT_MODEL;
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    const systemContext = JSON.stringify(ctx, null, 2);
    const userPrompt = prompt ?? 'Summarise this website and suggest how to replicate it with modern web technologies.';

    const fullPrompt = `You are a professional web developer assistant. Below is a structured JSON snapshot of a website, extracted by the Khoj tool. Use this to answer the user's request.

<site-context>
${systemContext}
</site-context>

User request: ${userPrompt}`;

    logger.step('🤖', `Sending to Gemini (${model})...`);

    try {
        const result = await geminiModel.generateContentStream(fullPrompt);
        process.stdout.write('\n');
        for await (const chunk of result.stream) {
            process.stdout.write(chunk.text());
        }
        process.stdout.write('\n\n');
        logger.success('Gemini response complete');
    } catch (err) {
        logger.error('Gemini API request failed', err);
    }
}
