export function normalize(text: string): string {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}
