/**
 * Caps `text` at `max` characters. The marker says how much was cut, so a
 * reader of the capture file never mistakes a truncated body for the whole one.
 */
export function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}…[truncated ${text.length - max} chars]`;
}
