import type { KhojiContext } from '../types/KhojiContext.js';

/**
 * Serializes the KhojiContext object to a formatted JSON string.
 */
export function serializeJson(ctx: KhojiContext): string {
    return JSON.stringify(ctx, null, 2);
}
