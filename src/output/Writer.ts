import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../utils/logger.js';

/**
 * Writes content to a file, creating directories as needed.
 */
export async function writeOutput(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    const sizeKb = (Buffer.byteLength(content, 'utf-8') / 1024).toFixed(1);
    logger.success(`Written: ${filePath} (${sizeKb} KB)`);
}
