/**
 * Estimates the number of LLM tokens in a string.
 * Uses the standard approximation: ~4 characters per token.
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Returns a human-readable comparison between raw HTML size and khoj output size.
 */
export function formatTokenSavings(rawHtmlLength: number, khojOutputLength: number): string {
    const rawTokens = estimateTokens(rawHtmlLength.toString().padEnd(rawHtmlLength));
    const outTokens = estimateTokens(khojOutputLength.toString().padEnd(khojOutputLength));
    const reduction = Math.round(((rawTokens - outTokens) / rawTokens) * 100);
    return `Raw HTML ~${rawTokens.toLocaleString()} tokens → Khoj ~${outTokens.toLocaleString()} tokens (${reduction}% reduction)`;
}
