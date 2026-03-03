// ─── KhojiContext ────────────────────────────────────────────────────────────
// Master TypeScript interface for the khoji-context.json output.
// This is the source of truth — all extractors must conform to these types.
// ─────────────────────────────────────────────────────────────────────────────

export interface KhojiContext {
    schemaVersion: '1.0';
    url: string;
    finalUrl: string;             // after redirects
    extractedAt: string;          // ISO 8601
    loadTimeMs: number;
    tokenEstimate: number;
    meta: PageMeta;
    structure: DomNode[];
    designTokens: DesignTokens;
    components: DetectedComponent[];
    assets: AssetMap;
    content: ContentBlock[];
    interactions: Interaction[];
    animations: AnimationMap;
}

// ─── Meta ─────────────────────────────────────────────────────────────────────
export interface PageMeta {
    title: string;
    description: string;
    ogImage: string | null;
    canonical: string | null;
    themeColor: string | null;
    jsonLd: unknown[];
}

// ─── DOM ──────────────────────────────────────────────────────────────────────
export interface DomNode {
    tag: string;
    id?: string;
    classes: string[];
    role?: string;
    text?: string;               // trimmed, max 200 chars
    children?: DomNode[];
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
export interface DesignTokens {
    colors: Record<string, string>;      // CSS custom property → value
    spacing: Record<string, string>;
    typography: Record<string, string>;
    fonts: string[];
    breakpoints: string[];
}

// ─── Components ───────────────────────────────────────────────────────────────
export interface DetectedComponent {
    name: string;
    pattern: string;             // CSS selector pattern e.g. ".card"
    count: number;
    sampleHTML: string;
}

// ─── Assets ───────────────────────────────────────────────────────────────────
export interface AssetMap {
    images: ImageAsset[];
    gifs: ImageAsset[];          // GIF subset, isolated for quick AI reference
    fonts: string[];
    icons: string[];
    scripts: string[];
}

export interface ImageAsset {
    url: string;
    alt: string;
    type: 'image' | 'gif';
    width: number | null;
    height: number | null;
    isLazy: boolean;             // true if loading="lazy" or uses data-src
    selector: string;            // CSS path for locating this element
}

// ─── Content ──────────────────────────────────────────────────────────────────
export type ContentType = 'heading' | 'paragraph' | 'button' | 'link' | 'label';

export interface ContentBlock {
    type: ContentType;
    text: string;
    level?: number;              // headings only (1–6)
    href?: string;               // links only
}

// ─── Interactions ─────────────────────────────────────────────────────────────
export type InteractionType = 'form' | 'nav' | 'button';

export interface Interaction {
    type: InteractionType;
    selector: string;
    label: string;
    fields?: FormField[];        // forms only
}

export interface FormField {
    inputType: string;
    name: string;
    placeholder: string;
    required: boolean;
}

// ─── Animations ───────────────────────────────────────────────────────────────
export interface AnimationMap {
    cssAnimations: CSSAnimation[];
    cssTransitions: CSSTransition[];
    jsAnimations: JSAnimation[];
    scrollAnimations: ScrollAnimation[];
    gifAnimations: GifAnimation[];
    summary: string;             // AI-readable one-liner
}

export interface CSSAnimation {
    name: string;                // @keyframes name
    selector: string;
    duration: string;
    timingFunction: string;
    iterationCount: string;
    delay: string;
    trigger: 'page-load' | 'hover' | 'focus' | 'unknown';
    description: string;
}

export interface CSSTransition {
    selector: string;
    properties: string[];
    duration: string;
    timingFunction: string;
    trigger: 'hover' | 'focus' | 'active' | 'unknown';
    description: string;
}

export type JSAnimationLibrary =
    | 'gsap'
    | 'framer-motion'
    | 'animejs'
    | 'web-animations-api'
    | 'lottie'
    | 'auto'
    | 'unknown';

export interface JSAnimation {
    library: JSAnimationLibrary;
    selector: string;
    description: string;
    trigger: 'page-load' | 'scroll' | 'click' | 'hover' | 'unknown';
}

export type ScrollAnimationLibrary =
    | 'aos'
    | 'intersection-observer'
    | 'gsap-scrolltrigger'
    | 'unknown';

export interface ScrollAnimation {
    selector: string;
    library: ScrollAnimationLibrary;
    animationType: string;       // e.g. "fade-up", "slide-left"
    description: string;
}

export type GifAnimationPurpose =
    | 'loading-spinner'
    | 'product-demo'
    | 'decorative'
    | 'tutorial'
    | 'unknown';

export interface GifAnimation {
    url: string;
    selector: string;
    alt: string;
    purpose: GifAnimationPurpose;
}

// ─── Extraction Options ───────────────────────────────────────────────────────
export interface ExtractionOptions {
    url: string;
    outputDir: string;
    format: 'json' | 'markdown' | 'both';
    timeout: number;
    fast: boolean;
    clone?: boolean;
    cloneSkills?: string[];
    sendToGemini?: boolean;
    prompt?: string;
    clickSelector?: string;
}
