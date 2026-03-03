import { describe, it, expect } from 'vitest';
import { estimateTokens, formatTokenSavings } from '../../src/utils/tokenEstimator.js';

describe('Token Estimator', () => {
    it('estimates ~4 chars per token', () => {
        // 12 chars = 3 tokens
        expect(estimateTokens('Hello world!')).toBe(3);

        // 100 chars = 25 tokens
        const longString = 'a'.repeat(100);
        expect(estimateTokens(longString)).toBe(25);
    });

    it('formats savings correctly', () => {
        // 400 chars -> 100 tokens
        // 40 chars -> 10 tokens
        // Savings = 90%
        const format = formatTokenSavings(400, 40);
        expect(format).toBe('Raw HTML ~100 tokens → Khoj ~10 tokens (90% reduction)');
    });
});
