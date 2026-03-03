import type { KhojContext } from '../types/KhojContext.js';

/**
 * Serializes the KhojContext object to a formatted JSON string.
 */
export function serializeJson(ctx: KhojContext): string {
    return JSON.stringify(ctx, null, 2);
}
