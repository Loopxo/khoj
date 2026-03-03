import type { ContentBlock, DomNode, ImageAsset } from '../types/KhojContext.js';

/**
 * Post-processing pipeline:
 * - Removes duplicate content blocks
 * - Deduplicates asset URLs
 * - Prunes empty DOM nodes
 */
export function cleanContent(blocks: ContentBlock[]): ContentBlock[] {
    const seen = new Set<string>();
    return blocks.filter((b) => {
        const key = `${b.type}:${b.text.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function cleanImages(images: ImageAsset[]): ImageAsset[] {
    const seen = new Set<string>();
    return images.filter((img) => {
        if (seen.has(img.url)) return false;
        seen.add(img.url);
        return true;
    });
}

export function cleanStringList(list: string[]): string[] {
    return [...new Set(list.filter((s) => s.trim().length > 0))];
}

export function pruneEmptyDomNodes(nodes: DomNode[]): DomNode[] {
    return nodes
        .map((node) => {
            const children = node.children ? pruneEmptyDomNodes(node.children) : undefined;
            return { ...node, children: children?.length ? children : undefined };
        })
        .filter(
            (node) =>
                node.text ||
                node.id ||
                node.classes.length > 0 ||
                node.role ||
                (node.children && node.children.length > 0),
        );
}
