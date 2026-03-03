import type { Page } from 'playwright';
import type { Interaction, FormField } from '../types/KhojContext.js';

/**
 * Maps interactive regions of the page:
 * - Forms with all their input fields
 * - Navigation elements
 * - Interactive button-like elements
 */
export async function extractInteractions(page: Page): Promise<Interaction[]> {
    return page.evaluate((): Interaction[] => {
        const interactions: Interaction[] = [];

        function getCssSelector(el: Element): string {
            if (el.id) return `#${el.id}`;
            const tag = el.tagName.toLowerCase();
            const cls = el.className?.toString().trim().split(/\s+/)[0];
            return cls ? `${tag}.${cls}` : tag;
        }

        // ── Forms ───────────────────────────────────────────────────────────────
        document.querySelectorAll('form').forEach((form) => {
            const fields: FormField[] = [];
            form.querySelectorAll('input, select, textarea').forEach((field) => {
                const el = field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                fields.push({
                    inputType: el.tagName === 'SELECT' ? 'select' : el.tagName === 'TEXTAREA' ? 'textarea' : (el as HTMLInputElement).type || 'text',
                    name: el.name || el.id || '',
                    placeholder: (el as HTMLInputElement).placeholder || '',
                    required: (el as HTMLInputElement).required ?? false,
                });
            });

            const label =
                form.getAttribute('aria-label') ??
                form.querySelector('legend, h1, h2, h3, h4')?.textContent?.trim() ??
                form.id ??
                'Form';

            interactions.push({
                type: 'form',
                selector: getCssSelector(form),
                label,
                fields,
            });
        });

        // ── Navigation ──────────────────────────────────────────────────────────
        document.querySelectorAll('nav, [role="navigation"]').forEach((nav) => {
            const label =
                nav.getAttribute('aria-label') ??
                nav.getAttribute('id') ??
                'Navigation';

            interactions.push({
                type: 'nav',
                selector: getCssSelector(nav),
                label,
            });
        });

        // ── Interactive Buttons ─────────────────────────────────────────────────
        const buttonEls = document.querySelectorAll(
            '[role="button"]:not(button), [data-action], [data-click], [onclick]',
        );
        buttonEls.forEach((el) => {
            const label = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? 'Button';
            interactions.push({
                type: 'button',
                selector: getCssSelector(el),
                label,
            });
        });

        return interactions;
    });
}
