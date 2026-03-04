import type { KhojiContext, ContentBlock, Interaction, CSSAnimation, CSSTransition, JSAnimation, ScrollAnimation, GifAnimation, SectionLayout } from '../types/KhojiContext.js';

/**
 * Serializes a KhojiContext into a markdown document optimised for LLM readability.
 * Sections are ordered from most to least relevant for AI agents.
 */
export function serializeMarkdown(ctx: KhojiContext): string {
    const lines: string[] = [];

    lines.push(`# Khoj Context — ${ctx.meta.title || ctx.url}`);
    lines.push(`> Extracted: ${ctx.extractedAt} | Schema: ${ctx.schemaVersion} | \~${ctx.tokenEstimate.toLocaleString()} tokens\n`);

    // ── Meta ──────────────────────────────────────────────────────────────────
    lines.push('## Meta');
    lines.push(`- **URL**: ${ctx.url}`);
    if (ctx.finalUrl !== ctx.url) lines.push(`- **Final URL** (after redirect): ${ctx.finalUrl}`);
    lines.push(`- **Title**: ${ctx.meta.title}`);
    lines.push(`- **Description**: ${ctx.meta.description}`);
    if (ctx.meta.ogImage) lines.push(`- **OG Image**: ${ctx.meta.ogImage}`);
    if (ctx.meta.canonical) lines.push(`- **Canonical**: ${ctx.meta.canonical}`);
    if (ctx.meta.themeColor) lines.push(`- **Theme Color**: ${ctx.meta.themeColor}`);
    lines.push('');

    // ── Design Tokens ─────────────────────────────────────────────────────────
    lines.push('## Design Tokens');

    if (Object.keys(ctx.designTokens.colors).length > 0) {
        lines.push('\n### Colors');
        for (const [k, v] of Object.entries(ctx.designTokens.colors)) {
            lines.push(`- \`${k}\`: ${v}`);
        }
    }
    if (Object.keys(ctx.designTokens.spacing).length > 0) {
        lines.push('\n### Spacing');
        for (const [k, v] of Object.entries(ctx.designTokens.spacing)) {
            lines.push(`- \`${k}\`: ${v}`);
        }
    }
    if (ctx.designTokens.fonts.length > 0) {
        lines.push(`\n### Fonts\n${ctx.designTokens.fonts.map((f) => `- ${f}`).join('\n')}`);
    }
    if (ctx.designTokens.breakpoints.length > 0) {
        lines.push(`\n### Breakpoints\n${ctx.designTokens.breakpoints.map((b) => `- ${b}`).join('\n')}`);
    }

    if (ctx.designTokens.globalTypography) {
        const gt = ctx.designTokens.globalTypography;
        lines.push('\n### Global Typography');
        lines.push(`- Body: ${gt.bodyFontSize} / ${gt.bodyLineHeight} / weight ${gt.bodyFontWeight} / spacing ${gt.bodyLetterSpacing}`);
        lines.push(`- Headings: weight ${gt.headingFontWeight} / ${gt.headingLineHeight} / spacing ${gt.headingLetterSpacing}`);
    }
    lines.push('');

    // ── Layout Blueprints ─────────────────────────────────────────────────────
    if (ctx.layouts && ctx.layouts.length > 0) {
        lines.push('## Layout Blueprints');
        lines.push('> Section-level spatial structure for pixel-accurate reconstruction\n');
        ctx.layouts.forEach((s: SectionLayout) => {
            const header = `### ${s.selector} (${s.display}${s.minHeight ? `, min-height: ${s.minHeight}` : ''})`;
            lines.push(header);
            if (s.backgroundColor) lines.push(`- Background: ${s.backgroundColor}`);
            if (s.columns) lines.push(`- Columns: ${s.columns}`);
            lines.push(`- Children: ${s.childCount}`);
            s.children.forEach((c, i) => {
                const parts = [
                    `${c.widthPercent}% width`,
                    c.hasText ? 'has text' : '',
                    c.hasImage ? 'has image' : '',
                    c.objectFit ? `object-fit: ${c.objectFit}` : '',
                    c.backgroundColor ? `bg: ${c.backgroundColor}` : '',
                ].filter(Boolean).join(', ');
                lines.push(`  ${i + 1}. \`${c.selector}\` (${c.tag}) — ${parts}`);
            });
            lines.push('');
        });
    }

    // ── Content ───────────────────────────────────────────────────────────────
    lines.push('## Content');
    const headings = ctx.content.filter((c): c is ContentBlock & { type: 'heading' } => c.type === 'heading');
    const buttons = ctx.content.filter((c) => c.type === 'button');
    const paragraphs = ctx.content.filter((c) => c.type === 'paragraph').slice(0, 10);

    if (headings.length > 0) {
        lines.push('\n### Headings');
        headings.forEach((h) => lines.push(`${'#'.repeat(h.level ?? 1)} ${h.text}`));
    }
    if (buttons.length > 0) {
        lines.push('\n### CTAs / Buttons');
        buttons.forEach((b) => lines.push(`- ${b.text}`));
    }
    if (paragraphs.length > 0) {
        lines.push('\n### Text Blocks (sample)');
        paragraphs.forEach((p) => lines.push(`> ${p.text}`));
    }
    lines.push('');

    // ── Assets ────────────────────────────────────────────────────────────────
    lines.push('## Assets');
    lines.push(`- **Images**: ${ctx.assets.images.length}`);
    lines.push(`- **GIFs**: ${ctx.assets.gifs.length}`);
    lines.push(`- **Fonts**: ${ctx.assets.fonts.length}`);
    lines.push(`- **Icons**: ${ctx.assets.icons.length}`);

    if (ctx.assets.images.length > 0) {
        lines.push('\n### Images');
        lines.push('| URL | Alt | Size | Lazy |');
        lines.push('|-----|-----|------|------|');
        ctx.assets.images.slice(0, 20).forEach((img) => {
            const size = img.width && img.height ? `${img.width}×${img.height}` : '–';
            lines.push(`| ${img.url.slice(0, 60)} | ${img.alt || '–'} | ${size} | ${img.isLazy ? 'yes' : 'no'} |`);
        });
    }

    if (ctx.assets.gifs.length > 0) {
        lines.push('\n### GIFs');
        lines.push('| URL | Alt | Selector |');
        lines.push('|-----|-----|----------|');
        ctx.assets.gifs.forEach((g) => {
            lines.push(`| ${g.url.slice(0, 60)} | ${g.alt || '–'} | \`${g.selector}\` |`);
        });
    }
    lines.push('');

    // ── Animations ────────────────────────────────────────────────────────────
    lines.push('## Animations');
    lines.push(`> ${ctx.animations.summary}`);

    if (ctx.animations.cssAnimations.length > 0) {
        lines.push('\n### CSS Animations');
        ctx.animations.cssAnimations.slice(0, 15).forEach((a: CSSAnimation) => {
            lines.push(`- **${a.name}** on \`${a.selector.slice(0, 60)}\`: ${a.description} *(${a.duration}, ${a.trigger})*`);
        });
    }

    if (ctx.animations.cssTransitions.length > 0) {
        lines.push('\n### CSS Transitions');
        ctx.animations.cssTransitions.slice(0, 10).forEach((t: CSSTransition) => {
            lines.push(`- \`${t.selector.slice(0, 60)}\`: ${t.description}`);
        });
    }

    if (ctx.animations.jsAnimations.length > 0) {
        lines.push('\n### JS Animations');
        ctx.animations.jsAnimations.forEach((j: JSAnimation) => {
            lines.push(`- **${j.library}**: ${j.description} *(${j.trigger})*`);
        });
    }

    if (ctx.animations.scrollAnimations.length > 0) {
        lines.push('\n### Scroll Animations');
        ctx.animations.scrollAnimations.slice(0, 10).forEach((s: ScrollAnimation) => {
            lines.push(`- \`${s.selector}\` — ${s.animationType} (${s.library})`);
        });
    }

    if (ctx.animations.gifAnimations.length > 0) {
        lines.push('\n### GIF Animations');
        ctx.animations.gifAnimations.forEach((g: GifAnimation) => {
            lines.push(`- **${g.purpose}**: ${g.alt || g.url.split('/').pop()} (\`${g.selector}\`)`);
        });
    }
    lines.push('');

    // ── Interactions ──────────────────────────────────────────────────────────
    if (ctx.interactions.length > 0) {
        lines.push('## Interactions');
        ctx.interactions.forEach((i: Interaction) => {
            lines.push(`\n### ${i.label} (${i.type})`);
            lines.push(`- Selector: \`${i.selector}\``);
            if (i.fields && i.fields.length > 0) {
                lines.push('- Fields:');
                i.fields.forEach((f) => lines.push(`  - ${f.name} (${f.inputType})${f.required ? ' *required*' : ''}${f.placeholder ? ` — "${f.placeholder}"` : ''}`));
            }
        });
        lines.push('');
    }

    // ── Components ────────────────────────────────────────────────────────────
    if (ctx.components.length > 0) {
        lines.push('## Detected Components');
        ctx.components.forEach((c) => {
            lines.push(`- **${c.name}** (\`${c.pattern}\`): ${c.count} instances`);
        });
        lines.push('');
    }

    return lines.join('\n');
}
