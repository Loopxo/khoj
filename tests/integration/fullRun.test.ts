import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { runExtraction } from '../../src/pipeline/runner.js';
// We'll run an extraction directly on the fixture without a local static server
// Playwright handles file:// perfectly well.

describe('End-to-End Extraction Pipeline', () => {
    const outputDir = path.resolve(__dirname, '../../output');
    let fixturePath: string;

    beforeAll(async () => {
        fixturePath = `file://${path.resolve(__dirname, '../../fixtures/sample.html')}`;

        // Clear output folder to ensure a fresh test
        try {
            await fs.rm(outputDir, { recursive: true, force: true });
        } catch {
            // Ignore if doesn't exist
        }
    });

    afterAll(async () => {
        // Optional: cleanup
        try {
            await fs.rm(outputDir, { recursive: true, force: true });
        } catch {
            // Ignore
        }
    });

    it('runs the full extraction pipeline and generates valid khoj-context files', async () => {
        // Run the extraction (writes to outputDir)
        await runExtraction({
            url: fixturePath,
            outputDir,
            format: 'both',
            timeout: 30000,
            fast: false
        });

        // Output directory should exist
        const files = await fs.readdir(outputDir);
        expect(files.length).toBeGreaterThan(0);

        const jsonFile = files.find(f => f.endsWith('.json'));
        const mdFile = files.find(f => f.endsWith('.md'));

        expect(jsonFile).toBeDefined();
        expect(mdFile).toBeDefined();

        // Validate JSON output
        if (jsonFile) {
            const content = await fs.readFile(path.join(outputDir, jsonFile), 'utf-8');
            const data = JSON.parse(content);

            expect(data.schemaVersion).toBe('1.0');
            expect(data.url).toBe(fixturePath);
            expect(data.meta.title).toBe('Khoj Fixture Page');
            expect(data.meta.description).toBe('Sample page for Khoj fixture testing');

            expect(data.designTokens.colors['--color-primary']).toBe('#6c63ff');

            expect(data.content.length).toBeGreaterThan(0);
            expect(data.content.find((c: any) => c.text === 'Build Better AI Agents' && c.type === 'heading')).toBeDefined();

            expect(data.interactions.length).toBeGreaterThan(0);
            const contactForm = data.interactions.find((i: any) => i.type === 'form');
            expect(contactForm).toBeDefined();
            expect(contactForm?.fields?.length).toBe(3); // name, email, message

            expect(data.animations.cssAnimations.length).toBeGreaterThan(0);
            expect(data.components.length).toBeGreaterThan(0);

            // Check token estimate is calculated
            expect(data.tokenEstimate).toBeGreaterThan(0);
        }

        // Validate Markdown output
        if (mdFile) {
            const mdContent = await fs.readFile(path.join(outputDir, mdFile), 'utf-8');
            expect(mdContent).toContain('# Khoj Context — Khoj Fixture Page');
            expect(mdContent).toContain('## Meta');
            expect(mdContent).toContain('## Content');
            expect(mdContent).toContain('## Animations');
        }
    });
});
