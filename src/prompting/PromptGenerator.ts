export type CloneSkill =
    | 'frontend-design'
    | 'seo-audit'
    | 'web-design-guidelines'
    | 'award-winning-website';

export class PromptGenerator {
    static generate(skills: CloneSkill[]): string {
        let prompt = `# Pixel-Perfect Website Clone Task\n\n`;

        prompt += `You are an expert AI developer tasked with cloning a website. Within this folder, you have access to the raw HTML, unified CSS, a full-page screenshot, and a structural JSON context map of the target site. Your objective is to rebuild this website pixel-perfectly.\n\n`;

        if (skills.length > 0) {
            prompt += `## Project Guidelines & Skills\n`;
            prompt += `While cloning, you must adhere strictly to the following guidelines selected for this project:\n\n`;

            if (skills.includes('frontend-design')) {
                prompt += `### ✦ Frontend Design Excellence\n`;
                prompt += `Ensure the UI design completely avoids generic AI aesthetics. Prioritize distinctive typography (do not default to standard system fonts), maintain cohesive and intentional spacing, and commit to a bold creative direction for the interface. Every detail should feel meticulously human-crafted.\n\n`;
            }

            if (skills.includes('seo-audit')) {
                prompt += `### ✦ SEO Best Practices\n`;
                prompt += `Implement strong on-page technical SEO. Use correct HTML5 semantic tags, maintain a strict and logical heading hierarchy (with exactly one H1), ensure all images have descriptive \`alt\` attributes, and structure the DOM for maximum accessibility and immediate indexability.\n\n`;
            }

            if (skills.includes('web-design-guidelines')) {
                prompt += `### ✦ Strict Web Design Guidelines\n`;
                prompt += `Follow rigorous modern web interface guidelines. Ensure high color contrast ratios, provide reliable and visible focus states for all interactive elements, ensure flawlessly responsive viewport handling across mobile and desktop, and adhere to robust accessibility standards.\n\n`;
            }

            if (skills.includes('award-winning-website')) {
                prompt += `### ✦ Award-Winning Experience\n`;
                prompt += `Elevate this site into a premium, award-winning experience. Where appropriate, integrate scroll-triggered UI reveals, modern 3D or parallax geometric effects, and smooth high-end micro-interactions using robust animation patterns (e.g., GSAP, Framer Motion, or advanced CSS transitions).\n\n`;
            }
        }

        prompt += `## Deliverables\n`;
        prompt += `Please provide the functional code necessary to recreate this interface, ensuring the aforementioned guidelines define the final aesthetic and structural quality of the work.`;

        return prompt;
    }
}
